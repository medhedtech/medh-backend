import mongoose from "mongoose";
import { Course, Batch } from "../models/course-model.js";
import Enrollment from "../models/enrollment-model.js";
import User from "../models/user-modal.js";

/**
 * Get comprehensive batch analytics for dashboard
 * @route GET /api/v1/batches/analytics/dashboard
 * @access Admin, Super-Admin
 */
export const getBatchAnalyticsDashboard = async (req, res) => {
  try {
    const { period = '30' } = req.query; // Default to last 30 days
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get previous period for comparison
    const prevStartDate = new Date();
    prevStartDate.setDate(prevStartDate.getDate() - (daysAgo * 2));
    const prevEndDate = new Date();
    prevEndDate.setDate(prevEndDate.getDate() - daysAgo);

    // Parallel data fetching for performance
    const [
      totalBatches,
      allBatches,
      prevTotalBatches,
      activeStudents,
      prevActiveStudents,
      batchStatusDistribution,
      assignmentTypes,
      instructorWorkload,
      capacityStats,
      individualAssignments,
      prevIndividualAssignments,
      unassignedStudents,
      prevUnassignedStudents,
      activeBatches,
      prevActiveBatches
    ] = await Promise.all([
      // Total batches (all time)
      Batch.countDocuments({}),
      
      // All batches for detailed analysis
      Batch.find({}).select('status capacity enrolled_students created_at'),
      
      // Total batches in previous period
      Batch.countDocuments({
        created_at: { $gte: prevStartDate, $lt: prevEndDate }
      }),
      
      // Active students count
      Enrollment.countDocuments({
        status: 'active'
      }),
      
      // Previous period active students
      Enrollment.countDocuments({
        status: 'active',
        enrollment_date: { $gte: prevStartDate, $lt: prevEndDate }
      }),
      
      // Batch status distribution
      Batch.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Assignment types distribution - check instructor types
      User.aggregate([
        {
          $match: { 
            role: 'instructor',
            instructor_type: { $exists: true }
          }
        },
        {
          $group: {
            _id: "$instructor_type",
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Instructor workload
      getInstructorWorkload(),
      
      // Capacity utilization stats
      getCapacityStats(),
      
      // Individual assignments count
      Enrollment.countDocuments({
        enrollment_type: 'individual',
        status: 'active'
      }),
      
      // Previous period individual assignments
      Enrollment.countDocuments({
        enrollment_type: 'individual',
        status: 'active',
        enrollment_date: { $gte: prevStartDate, $lt: prevEndDate }
      }),
      
      // Unassigned students
      Enrollment.countDocuments({
        assigned_instructor: { $exists: false },
        status: 'active'
      }),
      
      // Previous period unassigned students
      Enrollment.countDocuments({
        assigned_instructor: { $exists: false },
        status: 'active',
        enrollment_date: { $gte: prevStartDate, $lt: prevEndDate }
      }),
      
      // Active batches count
      Batch.countDocuments({ is_active: true }),
      
      // Previous period active batches
      Batch.countDocuments({
        is_active: true,
        created_at: { $gte: prevStartDate, $lt: prevEndDate }
      })
    ]);

    // Calculate percentage changes with real data
    const totalBatchesChange = calculatePercentageChange(
      allBatches.filter(b => new Date(b.created_at) >= startDate).length, 
      prevTotalBatches
    );
    const activeStudentsChange = calculatePercentageChange(activeStudents, prevActiveStudents);
    const individualAssignmentsChange = calculatePercentageChange(individualAssignments, prevIndividualAssignments);
    const unassignedStudentsChange = calculatePercentageChange(unassignedStudents, prevUnassignedStudents);
    const activeBatchesChange = calculatePercentageChange(activeBatches, prevActiveBatches);

    // Get capacity utilization change from real data
    const prevCapacityStats = await getCapacityStatsForPeriod(prevStartDate, prevEndDate);
    const capacityUtilizationChange = calculatePercentageChange(
      capacityStats.utilization, 
      prevCapacityStats.utilization
    );

    // Format response
    const analytics = {
      overview: {
        total_batches: {
          value: totalBatches,
          change: totalBatchesChange,
          period: `Last ${period} days`
        },
        active_students: {
          value: activeStudents,
          change: activeStudentsChange,
          description: "Currently enrolled"
        },
        capacity_utilization: {
          value: capacityStats.utilization,
          change: capacityUtilizationChange,
          description: "Average across all batches"
        },
        active_batches: {
          value: activeBatches,
          change: activeBatchesChange,
          description: "Currently running"
        },
        individual_assignments: {
          value: individualAssignments,
          change: individualAssignmentsChange,
          description: "Student-instructor pairs"
        },
        unassigned_students: {
          value: unassignedStudents,
          change: unassignedStudentsChange,
          description: "Need instructor assignment"
        }
      },
      batch_status_distribution: formatStatusDistribution(batchStatusDistribution),
      assignment_types: formatAssignmentTypes(assignmentTypes),
      instructor_workload: instructorWorkload,
      instructor_analysis: calculateInstructorAnalysis(instructorWorkload),
      period: `Last ${period} days`
    };

    res.status(200).json({
      success: true,
      message: "Batch analytics retrieved successfully",
      data: analytics
    });

  } catch (error) {
    console.error("Error fetching batch analytics:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching analytics",
      error: error.message
    });
  }
};

/**
 * Get batch status distribution
 * @route GET /api/v1/batches/analytics/status-distribution
 * @access Admin, Super-Admin
 */
export const getBatchStatusDistribution = async (req, res) => {
  try {
    const distribution = await Batch.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          _id: 0
        }
      }
    ]);

    const total = distribution.reduce((sum, item) => sum + item.count, 0);
    const formattedDistribution = distribution.map(item => ({
      ...item,
      percentage: Math.round((item.count / total) * 100)
    }));

    res.status(200).json({
      success: true,
      message: "Batch status distribution retrieved successfully",
      data: {
        distribution: formattedDistribution,
        total_batches: total
      }
    });

  } catch (error) {
    console.error("Error fetching status distribution:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching status distribution",
      error: error.message
    });
  }
};

/**
 * Get instructor workload analytics
 * @route GET /api/v1/batches/analytics/instructor-workload
 * @access Admin, Super-Admin
 */
export const getInstructorWorkloadAnalytics = async (req, res) => {
  try {
    const workload = await getInstructorWorkload();

    res.status(200).json({
      success: true,
      message: "Instructor workload analytics retrieved successfully",
      data: workload
    });

  } catch (error) {
    console.error("Error fetching instructor workload:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching instructor workload",
      error: error.message
    });
  }
};

/**
 * Get capacity utilization analytics
 * @route GET /api/v1/batches/analytics/capacity
 * @access Admin, Super-Admin
 */
export const getCapacityAnalytics = async (req, res) => {
  try {
    const capacityData = await Batch.aggregate([
      {
        $project: {
          batch_name: 1,
          capacity: 1,
          enrolled_students: 1,
          utilization: {
            $multiply: [
              { $divide: ["$enrolled_students", "$capacity"] },
              100
            ]
          },
          status: 1
        }
      },
      {
        $group: {
          _id: null,
          total_capacity: { $sum: "$capacity" },
          total_enrolled: { $sum: "$enrolled_students" },
          average_utilization: { $avg: "$utilization" },
          batches: { $push: "$$ROOT" }
        }
      }
    ]);

    const result = capacityData[0] || {
      total_capacity: 0,
      total_enrolled: 0,
      average_utilization: 0,
      batches: []
    };

    res.status(200).json({
      success: true,
      message: "Capacity analytics retrieved successfully",
      data: {
        overall_utilization: Math.round(result.average_utilization * 10) / 10,
        total_capacity: result.total_capacity,
        total_enrolled: result.total_enrolled,
        capacity_percentage: Math.round((result.total_enrolled / result.total_capacity) * 100),
        batch_details: result.batches.map(batch => ({
          batch_id: batch._id,
          batch_name: batch.batch_name,
          capacity: batch.capacity,
          enrolled: batch.enrolled_students,
          utilization: Math.round(batch.utilization * 10) / 10,
          status: batch.status
        }))
      }
    });

  } catch (error) {
    console.error("Error fetching capacity analytics:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching capacity analytics",
      error: error.message
    });
  }
};

/**
 * Get detailed instructor analysis
 * @route GET /api/v1/batches/analytics/instructor-analysis
 * @access Admin, Super-Admin
 */
export const getInstructorAnalysis = async (req, res) => {
  try {
    const instructorWorkload = await getInstructorWorkload();
    const analysis = calculateInstructorAnalysis(instructorWorkload);
    
    // Add more detailed insights
    const insights = {
      ...analysis,
      workload_distribution: instructorWorkload.map(instructor => ({
        id: instructor._id,
        name: instructor.name,
        email: instructor.email,
        active_batches: instructor.active_batches,
        total_students: instructor.total_students,
        total_batches: instructor.total_batches,
        utilization: instructor.utilization,
        load_status: instructor.utilization >= 80 ? 'Overloaded' : 
                    instructor.utilization >= 50 ? 'Optimal' : 'Underutilized'
      })),
      recommendations: generateInstructorRecommendations(instructorWorkload)
    };

    res.status(200).json({
      success: true,
      message: "Instructor analysis retrieved successfully",
      data: insights
    });

  } catch (error) {
    console.error("Error fetching instructor analysis:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching instructor analysis",
      error: error.message
    });
  }
};

// Helper Functions

async function getInstructorWorkload() {
  return await User.aggregate([
    {
      $match: { role: 'instructor' }
    },
    {
      $lookup: {
        from: 'batches',
        localField: '_id',
        foreignField: 'assigned_instructor',
        as: 'assigned_batches'
      }
    },
    {
      $addFields: {
        active_batches: {
          $size: {
            $filter: {
              input: "$assigned_batches",
              cond: { $eq: ["$$this.status", "Active"] }
            }
          }
        },
        total_batches: { $size: "$assigned_batches" },
        instructor_capacity: {
          $reduce: {
            input: "$assigned_batches",
            initialValue: 0,
            in: { $add: ["$$value", "$$this.capacity"] }
          }
        }
      }
    },
    {
      $lookup: {
        from: 'enrollments',
        let: { 
          batchIds: {
            $map: {
              input: "$assigned_batches",
              as: "batch",
              in: "$$batch._id"
            }
          }
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$batch", "$$batchIds"] },
                  { $eq: ["$status", "active"] }
                ]
              }
            }
          }
        ],
        as: 'batch_students'
      }
    },
    {
      $lookup: {
        from: 'enrollments',
        localField: '_id',
        foreignField: 'assigned_instructor',
        pipeline: [
          {
            $match: {
              status: 'active'
            }
          }
        ],
        as: 'individual_students'
      }
    },
    {
      $project: {
        name: { $ifNull: ["$full_name", "$name"] },
        email: 1,
        active_batches: 1,
        total_batches: 1,
        instructor_capacity: 1,
        batch_students_count: { $size: "$batch_students" },
        individual_students_count: { $size: "$individual_students" },
        total_students: {
          $add: [
            { $size: "$batch_students" },
            { $size: "$individual_students" }
          ]
        }
      }
    },
    {
      $addFields: {
        utilization: {
          $cond: {
            if: { $eq: ["$instructor_capacity", 0] },
            then: 0,
            else: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [
                        "$total_students", 
                        "$instructor_capacity"
                      ]
                    }, 
                    100
                  ]
                },
                1
              ]
            }
          }
        },
        workload_percentage: {
          $round: [
            {
              $multiply: [
                {
                  $divide: [
                    "$total_students", 
                    30 // Ideal load of 30 students per instructor
                  ]
                }, 
                100
              ]
            },
            1
          ]
        }
      }
    },
    {
      $sort: { total_students: -1 }
    }
  ]);
}

async function getCapacityStats() {
  const stats = await Batch.aggregate([
    {
      $group: {
        _id: null,
        total_capacity: { $sum: "$capacity" },
        total_enrolled: { $sum: "$enrolled_students" },
        avg_utilization: {
          $avg: {
            $multiply: [
              { $divide: ["$enrolled_students", "$capacity"] },
              100
            ]
          }
        }
      }
    }
  ]);

  const result = stats[0] || { avg_utilization: 0 };
  return {
    utilization: Math.round(result.avg_utilization * 10) / 10
  };
}

function calculatePercentageChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

function formatStatusDistribution(distribution) {
  const statusOrder = ['Active', 'Upcoming', 'Completed', 'Cancelled'];
  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  
  return statusOrder.map(status => {
    const item = distribution.find(d => d._id === status);
    const count = item ? item.count : 0;
    return {
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    };
  });
}

function formatAssignmentTypes(assignmentTypes) {
  const typeOrder = ['Mentor', 'Tutor', 'Advisor', 'Supervisor'];
  const total = assignmentTypes.reduce((sum, item) => sum + item.count, 0);
  
  return typeOrder.map(type => {
    const item = assignmentTypes.find(a => a._id === type);
    const count = item ? item.count : 0;
    return {
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    };
  });
}

async function getCapacityStatsForPeriod(startDate, endDate) {
  const stats = await Batch.aggregate([
    {
      $match: {
        created_at: {
          $gte: startDate,
          $lt: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        total_capacity: { $sum: "$capacity" },
        total_enrolled: { $sum: "$enrolled_students" },
        avg_utilization: {
          $avg: {
            $multiply: [
              { $divide: ["$enrolled_students", "$capacity"] },
              100
            ]
          }
        }
      }
    }
  ]);

  const result = stats[0] || { avg_utilization: 0 };
  return {
    utilization: Math.round(result.avg_utilization * 10) / 10
  };
}

function calculateInstructorAnalysis(instructorWorkload) {
  const totalInstructors = instructorWorkload.length;
  const optimalLoadThreshold = 50; // 50% utilization considered optimal
  const overloadThreshold = 80; // 80% utilization considered overloaded
  
  let optimalLoad = 0;
  let underutilized = 0;
  let overloaded = 0;
  
  instructorWorkload.forEach(instructor => {
    if (instructor.utilization >= overloadThreshold) {
      overloaded++;
    } else if (instructor.utilization >= optimalLoadThreshold) {
      optimalLoad++;
    } else {
      underutilized++;
    }
  });
  
  return {
    total_instructors: totalInstructors,
    optimal_load: optimalLoad,
    underutilized: underutilized,
    overloaded: overloaded
  };
}

function generateInstructorRecommendations(instructorWorkload) {
  const recommendations = [];
  
  instructorWorkload.forEach(instructor => {
    if (instructor.utilization >= 80) {
      recommendations.push({
        type: 'redistribute_load',
        instructor: instructor.name,
        message: `${instructor.name} is overloaded with ${instructor.total_students} students. Consider redistributing some students or batches.`,
        priority: 'high'
      });
    } else if (instructor.utilization < 30 && instructor.total_students > 0) {
      recommendations.push({
        type: 'increase_capacity',
        instructor: instructor.name,
        message: `${instructor.name} has low utilization (${instructor.utilization}%). Consider assigning more students or batches.`,
        priority: 'medium'
      });
    } else if (instructor.total_students === 0 && instructor.total_batches === 0) {
      recommendations.push({
        type: 'assign_work',
        instructor: instructor.name,
        message: `${instructor.name} has no active assignments. Consider assigning them to upcoming batches.`,
        priority: 'high'
      });
    }
  });
  
  // General recommendations
  const totalInstructors = instructorWorkload.length;
  const overloadedCount = instructorWorkload.filter(i => i.utilization >= 80).length;
  const underutilizedCount = instructorWorkload.filter(i => i.utilization < 30).length;
  
  if (overloadedCount > totalInstructors * 0.3) {
    recommendations.push({
      type: 'hire_more',
      message: `${overloadedCount} out of ${totalInstructors} instructors are overloaded. Consider hiring additional instructors.`,
      priority: 'high'
    });
  }
  
  if (underutilizedCount > totalInstructors * 0.5) {
    recommendations.push({
      type: 'optimize_distribution',
      message: `${underutilizedCount} instructors are underutilized. Optimize batch and student distribution.`,
      priority: 'medium'
    });
  }
  
  return recommendations;
} 