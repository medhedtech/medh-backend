import Enrollment from "../models/enrollment-model.js";
import { Batch } from "../models/course-model.js";
import DemoBooking from "../models/demo-booking.model.js";
import mongoose from "mongoose";

class InstructorRevenueService {
  /**
   * Get comprehensive revenue data for instructor
   * @param {string} instructorId - The instructor's user ID
   * @param {Object} options - Query options
   * @returns {Object} Revenue data
   */
  async getInstructorRevenue(instructorId, options = {}) {
    try {
      const { 
        start_date, 
        end_date, 
        period = 'month',
        include_projections = false 
      } = options;

      const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

      // Execute revenue calculations in parallel
      const [
        totalRevenue,
        monthlyRevenue,
        demoRevenue,
        batchRevenue,
        revenueBreakdown,
        pendingPayments,
        revenueProjections
      ] = await Promise.all([
        this.getTotalRevenue(instructorObjectId, start_date, end_date),
        this.getMonthlyRevenue(instructorObjectId),
        this.getDemoRevenue(instructorObjectId, start_date, end_date),
        this.getBatchRevenue(instructorObjectId, start_date, end_date),
        this.getRevenueBreakdown(instructorObjectId, period),
        this.getPendingPayments(instructorObjectId),
        include_projections ? this.getRevenueProjections(instructorObjectId) : null
      ]);

      return {
        success: true,
        data: {
          summary: {
            totalRevenue: totalRevenue.total || 0,
            monthlyRevenue: monthlyRevenue.total || 0,
            demoRevenue: demoRevenue.total || 0,
            batchRevenue: batchRevenue.total || 0,
            pendingAmount: pendingPayments.total || 0,
            averageRevenuePerStudent: this.calculateAverageRevenuePerStudent(totalRevenue, batchRevenue)
          },
          breakdown: revenueBreakdown,
          monthlyTrends: monthlyRevenue.trends || [],
          demoMetrics: demoRevenue.metrics || {},
          batchMetrics: batchRevenue.metrics || {},
          pendingPayments: pendingPayments.details || [],
          ...(include_projections && { projections: revenueProjections })
        }
      };
    } catch (error) {
      console.error('Error in getInstructorRevenue:', error);
      throw new Error(`Failed to fetch instructor revenue: ${error.message}`);
    }
  }

  /**
   * Get total revenue for instructor
   * @param {ObjectId} instructorId 
   * @param {string} startDate 
   * @param {string} endDate 
   * @returns {Object} Total revenue data
   */
  async getTotalRevenue(instructorId, startDate, endDate) {
    try {
      const matchStage = {
        instructor_id: instructorId
      };

      if (startDate && endDate) {
        matchStage.created_at = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'enrollments',
            localField: '_id',
            foreignField: 'batch_id',
            as: 'enrollments'
          }
        },
        { $unwind: { path: '$enrollments', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            'enrollments.enrollment_status': { $in: ['active', 'completed'] },
            'enrollments.payment_status': 'paid'
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$enrollments.amount_paid' },
            totalEnrollments: { $sum: 1 },
            uniqueBatches: { $addToSet: '$_id' }
          }
        },
        {
          $addFields: {
            batchCount: { $size: '$uniqueBatches' }
          }
        }
      ];

      const result = await Batch.aggregate(pipeline);
      
      return result.length > 0 ? {
        total: result[0].totalRevenue || 0,
        enrollments: result[0].totalEnrollments || 0,
        batches: result[0].batchCount || 0
      } : { total: 0, enrollments: 0, batches: 0 };
    } catch (error) {
      console.error('Error in getTotalRevenue:', error);
      return { total: 0, enrollments: 0, batches: 0 };
    }
  }

  /**
   * Get monthly revenue trends
   * @param {ObjectId} instructorId 
   * @returns {Object} Monthly revenue data
   */
  async getMonthlyRevenue(instructorId) {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const pipeline = [
        {
          $match: {
            instructor_id: instructorId,
            created_at: { $gte: sixMonthsAgo }
          }
        },
        {
          $lookup: {
            from: 'enrollments',
            localField: '_id',
            foreignField: 'batch_id',
            as: 'enrollments'
          }
        },
        { $unwind: { path: '$enrollments', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            'enrollments.enrollment_status': { $in: ['active', 'completed'] },
            'enrollments.payment_status': 'paid'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$enrollments.enrollment_date' },
              month: { $month: '$enrollments.enrollment_date' }
            },
            monthlyRevenue: { $sum: '$enrollments.amount_paid' },
            enrollmentCount: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        },
        {
          $project: {
            _id: 0,
            year: '$_id.year',
            month: '$_id.month',
            revenue: '$monthlyRevenue',
            enrollments: '$enrollmentCount',
            monthName: {
              $arrayElemAt: [
                ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                '$_id.month'
              ]
            }
          }
        }
      ];

      const trends = await Batch.aggregate(pipeline);
      
      // Calculate current month revenue
      const currentMonth = new Date();
      const currentMonthRevenue = trends.find(trend => 
        trend.year === currentMonth.getFullYear() && 
        trend.month === currentMonth.getMonth() + 1
      );

      return {
        total: currentMonthRevenue ? currentMonthRevenue.revenue : 0,
        trends: trends
      };
    } catch (error) {
      console.error('Error in getMonthlyRevenue:', error);
      return { total: 0, trends: [] };
    }
  }

  /**
   * Get demo revenue data
   * @param {ObjectId} instructorId 
   * @param {string} startDate 
   * @param {string} endDate 
   * @returns {Object} Demo revenue data
   */
  async getDemoRevenue(instructorId, startDate, endDate) {
    try {
      const matchStage = {
        instructor_id: instructorId,
        demo_status: 'completed'
      };

      if (startDate && endDate) {
        matchStage.demo_date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'enrollments',
            let: { studentId: '$student_id', courseId: '$course_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$student_id', '$$studentId'] },
                      { $eq: ['$course_id', '$$courseId'] },
                      { $in: ['$enrollment_status', ['active', 'completed']] },
                      { $eq: ['$payment_status', 'paid'] }
                    ]
                  }
                }
              }
            ],
            as: 'conversions'
          }
        },
        {
          $group: {
            _id: null,
            totalDemos: { $sum: 1 },
            convertedDemos: { $sum: { $cond: [{ $gt: [{ $size: '$conversions' }, 0] }, 1, 0] } },
            conversionRevenue: { 
              $sum: { 
                $cond: [
                  { $gt: [{ $size: '$conversions' }, 0] },
                  { $arrayElemAt: ['$conversions.amount_paid', 0] },
                  0
                ]
              }
            }
          }
        },
        {
          $addFields: {
            conversionRate: {
              $cond: [
                { $gt: ['$totalDemos', 0] },
                { $multiply: [{ $divide: ['$convertedDemos', '$totalDemos'] }, 100] },
                0
              ]
            },
            averageRevenuePerDemo: {
              $cond: [
                { $gt: ['$convertedDemos', 0] },
                { $divide: ['$conversionRevenue', '$convertedDemos'] },
                0
              ]
            }
          }
        }
      ];

      const result = await DemoBooking.aggregate(pipeline);
      
      return result.length > 0 ? {
        total: result[0].conversionRevenue || 0,
        metrics: {
          totalDemos: result[0].totalDemos || 0,
          convertedDemos: result[0].convertedDemos || 0,
          conversionRate: Math.round((result[0].conversionRate || 0) * 100) / 100,
          averageRevenuePerDemo: Math.round((result[0].averageRevenuePerDemo || 0) * 100) / 100
        }
      } : { total: 0, metrics: { totalDemos: 0, convertedDemos: 0, conversionRate: 0, averageRevenuePerDemo: 0 } };
    } catch (error) {
      console.error('Error in getDemoRevenue:', error);
      return { total: 0, metrics: { totalDemos: 0, convertedDemos: 0, conversionRate: 0, averageRevenuePerDemo: 0 } };
    }
  }

  /**
   * Get batch-wise revenue data
   * @param {ObjectId} instructorId 
   * @param {string} startDate 
   * @param {string} endDate 
   * @returns {Object} Batch revenue data
   */
  async getBatchRevenue(instructorId, startDate, endDate) {
    try {
      const matchStage = {
        instructor_id: instructorId
      };

      if (startDate && endDate) {
        matchStage.created_at = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'enrollments',
            localField: '_id',
            foreignField: 'batch_id',
            as: 'enrollments'
          }
        },
        {
          $addFields: {
            paidEnrollments: {
              $filter: {
                input: '$enrollments',
                cond: {
                  $and: [
                    { $in: ['$$this.enrollment_status', ['active', 'completed']] },
                    { $eq: ['$$this.payment_status', 'paid'] }
                  ]
                }
              }
            }
          }
        },
        {
          $addFields: {
            batchRevenue: { $sum: '$paidEnrollments.amount_paid' },
            enrollmentCount: { $size: '$paidEnrollments' }
          }
        },
        {
          $group: {
            _id: null,
            totalBatchRevenue: { $sum: '$batchRevenue' },
            averageRevenuePerBatch: { $avg: '$batchRevenue' },
            totalEnrollments: { $sum: '$enrollmentCount' },
            activeBatches: { $sum: { $cond: [{ $gt: ['$enrollmentCount', 0] }, 1, 0] } },
            batchDetails: {
              $push: {
                batchId: '$_id',
                batchName: '$batch_name',
                revenue: '$batchRevenue',
                enrollments: '$enrollmentCount',
                startDate: '$start_date',
                status: '$status'
              }
            }
          }
        }
      ];

      const result = await Batch.aggregate(pipeline);
      
      return result.length > 0 ? {
        total: result[0].totalBatchRevenue || 0,
        metrics: {
          averageRevenuePerBatch: Math.round((result[0].averageRevenuePerBatch || 0) * 100) / 100,
          totalEnrollments: result[0].totalEnrollments || 0,
          activeBatches: result[0].activeBatches || 0,
          batchDetails: result[0].batchDetails || []
        }
      } : { total: 0, metrics: { averageRevenuePerBatch: 0, totalEnrollments: 0, activeBatches: 0, batchDetails: [] } };
    } catch (error) {
      console.error('Error in getBatchRevenue:', error);
      return { total: 0, metrics: { averageRevenuePerBatch: 0, totalEnrollments: 0, activeBatches: 0, batchDetails: [] } };
    }
  }

  /**
   * Get revenue breakdown by period
   * @param {ObjectId} instructorId 
   * @param {string} period 
   * @returns {Array} Revenue breakdown
   */
  async getRevenueBreakdown(instructorId, period = 'month') {
    try {
      let dateFormat, startDate;
      
      switch (period) {
        case 'week':
          dateFormat = '%Y-W%U';
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 28); // Last 4 weeks
          break;
        case 'quarter':
          dateFormat = '%Y-Q%q';
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 12); // Last 4 quarters
          break;
        case 'year':
          dateFormat = '%Y';
          startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - 3); // Last 3 years
          break;
        default: // month
          dateFormat = '%Y-%m';
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
      }

      const pipeline = [
        {
          $match: {
            instructor_id: instructorId,
            created_at: { $gte: startDate }
          }
        },
        {
          $lookup: {
            from: 'enrollments',
            localField: '_id',
            foreignField: 'batch_id',
            as: 'enrollments'
          }
        },
        { $unwind: { path: '$enrollments', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            'enrollments.enrollment_status': { $in: ['active', 'completed'] },
            'enrollments.payment_status': 'paid'
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: dateFormat,
                date: '$enrollments.enrollment_date'
              }
            },
            revenue: { $sum: '$enrollments.amount_paid' },
            enrollments: { $sum: 1 },
            uniqueBatches: { $addToSet: '$_id' }
          }
        },
        {
          $addFields: {
            batchCount: { $size: '$uniqueBatches' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ];

      const breakdown = await Batch.aggregate(pipeline);
      
      return breakdown.map(item => ({
        period: item._id,
        revenue: item.revenue || 0,
        enrollments: item.enrollments || 0,
        batches: item.batchCount || 0
      }));
    } catch (error) {
      console.error('Error in getRevenueBreakdown:', error);
      return [];
    }
  }

  /**
   * Get pending payments
   * @param {ObjectId} instructorId 
   * @returns {Object} Pending payments data
   */
  async getPendingPayments(instructorId) {
    try {
      const pipeline = [
        {
          $match: {
            instructor_id: instructorId
          }
        },
        {
          $lookup: {
            from: 'enrollments',
            localField: '_id',
            foreignField: 'batch_id',
            as: 'enrollments'
          }
        },
        { $unwind: { path: '$enrollments', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            'enrollments.enrollment_status': 'active',
            'enrollments.payment_status': { $in: ['pending', 'partial'] }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'enrollments.student_id',
            foreignField: '_id',
            as: 'student'
          }
        },
        { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            totalPending: { $sum: { $subtract: ['$enrollments.total_amount', '$enrollments.amount_paid'] } },
            pendingCount: { $sum: 1 },
            details: {
              $push: {
                enrollmentId: '$enrollments._id',
                studentName: '$student.full_name',
                studentEmail: '$student.email',
                batchName: '$batch_name',
                totalAmount: '$enrollments.total_amount',
                amountPaid: '$enrollments.amount_paid',
                pendingAmount: { $subtract: ['$enrollments.total_amount', '$enrollments.amount_paid'] },
                enrollmentDate: '$enrollments.enrollment_date',
                paymentStatus: '$enrollments.payment_status'
              }
            }
          }
        }
      ];

      const result = await Batch.aggregate(pipeline);
      
      return result.length > 0 ? {
        total: result[0].totalPending || 0,
        count: result[0].pendingCount || 0,
        details: result[0].details || []
      } : { total: 0, count: 0, details: [] };
    } catch (error) {
      console.error('Error in getPendingPayments:', error);
      return { total: 0, count: 0, details: [] };
    }
  }

  /**
   * Get revenue projections
   * @param {ObjectId} instructorId 
   * @returns {Object} Revenue projections
   */
  async getRevenueProjections(instructorId) {
    try {
      // Get historical data for trend analysis
      const monthlyData = await this.getMonthlyRevenue(instructorId);
      const trends = monthlyData.trends || [];

      if (trends.length < 3) {
        return {
          nextMonth: 0,
          nextQuarter: 0,
          confidence: 'low',
          methodology: 'insufficient_data'
        };
      }

      // Simple linear trend projection
      const recentTrends = trends.slice(-3);
      const avgGrowth = recentTrends.reduce((sum, trend, index) => {
        if (index === 0) return sum;
        const growth = ((trend.revenue - recentTrends[index - 1].revenue) / recentTrends[index - 1].revenue) * 100;
        return sum + (isFinite(growth) ? growth : 0);
      }, 0) / (recentTrends.length - 1);

      const lastMonthRevenue = trends[trends.length - 1]?.revenue || 0;
      const projectedNextMonth = lastMonthRevenue * (1 + (avgGrowth / 100));
      const projectedNextQuarter = projectedNextMonth * 3;

      return {
        nextMonth: Math.round(projectedNextMonth * 100) / 100,
        nextQuarter: Math.round(projectedNextQuarter * 100) / 100,
        growthRate: Math.round(avgGrowth * 100) / 100,
        confidence: trends.length >= 6 ? 'high' : 'medium',
        methodology: 'linear_trend',
        basedOnMonths: trends.length
      };
    } catch (error) {
      console.error('Error in getRevenueProjections:', error);
      return {
        nextMonth: 0,
        nextQuarter: 0,
        confidence: 'low',
        methodology: 'error'
      };
    }
  }

  /**
   * Calculate average revenue per student
   * @param {Object} totalRevenue 
   * @param {Object} batchRevenue 
   * @returns {number} Average revenue per student
   */
  calculateAverageRevenuePerStudent(totalRevenue, batchRevenue) {
    const totalEnrollments = totalRevenue.enrollments || 0;
    const totalRevenueAmount = totalRevenue.total || 0;
    
    return totalEnrollments > 0 
      ? Math.round((totalRevenueAmount / totalEnrollments) * 100) / 100 
      : 0;
  }

  /**
   * Get instructor revenue comparison with platform average
   * @param {string} instructorId 
   * @returns {Object} Revenue comparison data
   */
  async getRevenueComparison(instructorId) {
    try {
      const instructorRevenue = await this.getInstructorRevenue(instructorId);
      
      // Get platform average (simplified calculation)
      const platformStats = await Batch.aggregate([
        {
          $lookup: {
            from: 'enrollments',
            localField: '_id',
            foreignField: 'batch_id',
            as: 'enrollments'
          }
        },
        { $unwind: { path: '$enrollments', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            'enrollments.enrollment_status': { $in: ['active', 'completed'] },
            'enrollments.payment_status': 'paid'
          }
        },
        {
          $group: {
            _id: '$instructor_id',
            instructorRevenue: { $sum: '$enrollments.amount_paid' }
          }
        },
        {
          $group: {
            _id: null,
            averageInstructorRevenue: { $avg: '$instructorRevenue' },
            totalInstructors: { $sum: 1 }
          }
        }
      ]);

      const platformAverage = platformStats.length > 0 ? platformStats[0].averageInstructorRevenue : 0;
      const instructorTotal = instructorRevenue.data.summary.totalRevenue;
      
      const percentile = platformAverage > 0 
        ? Math.round((instructorTotal / platformAverage) * 100)
        : 100;

      return {
        success: true,
        data: {
          instructorRevenue: instructorTotal,
          platformAverage: Math.round(platformAverage * 100) / 100,
          percentile,
          performance: percentile >= 100 ? 'above_average' : 'below_average',
          totalInstructors: platformStats.length > 0 ? platformStats[0].totalInstructors : 0
        }
      };
    } catch (error) {
      console.error('Error in getRevenueComparison:', error);
      throw new Error(`Failed to fetch revenue comparison: ${error.message}`);
    }
  }
}

export default new InstructorRevenueService(); 