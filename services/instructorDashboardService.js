import User from "../models/user-modal.js";
import { Batch } from "../models/course-model.js";
import DemoBooking from "../models/demo-booking.model.js";
import Assignment from "../models/assignment.js";
import EnhancedProgress from "../models/enhanced-progress.model.js";
import Enrollment from "../models/enrollment-model.js";
import mongoose from "mongoose";

class InstructorDashboardService {
  /**
   * Get comprehensive dashboard data for instructor
   * @param {string} instructorId - The instructor's user ID
   * @returns {Object} Dashboard data
   */
  async getDashboardData(instructorId) {
    try {
      const instructorObjectId = new mongoose.Types.ObjectId(instructorId);
      
      // Execute all queries in parallel for better performance
      const [
        activeBatches,
        totalStudents,
        pendingDemos,
        recentSubmissions,
        upcomingClasses,
        monthlyStats
      ] = await Promise.all([
        this.getActiveBatches(instructorObjectId),
        this.getTotalStudents(instructorObjectId),
        this.getPendingDemos(instructorObjectId),
        this.getRecentSubmissions(instructorObjectId),
        this.getUpcomingClasses(instructorObjectId),
        this.getMonthlyStats(instructorObjectId)
      ]);

      return {
        success: true,
        data: {
          overview: {
            activeBatches: activeBatches.length,
            totalStudents: totalStudents.length,
            pendingDemos: pendingDemos.length,
            completedAssignments: recentSubmissions.completed,
            pendingAssignments: recentSubmissions.pending
          },
          upcomingClasses: upcomingClasses.slice(0, 5),
          recentSubmissions: recentSubmissions.submissions.slice(0, 10),
          monthlyStats,
          quickActions: [
            { action: 'create_assignment', label: 'Create Assignment', count: 0 },
            { action: 'mark_attendance', label: 'Mark Attendance', count: upcomingClasses.length },
            { action: 'review_demos', label: 'Review Demos', count: pendingDemos.length },
            { action: 'grade_submissions', label: 'Grade Submissions', count: recentSubmissions.pending }
          ]
        }
      };
    } catch (error) {
      console.error('Error in getDashboardData:', error);
      throw new Error(`Failed to fetch dashboard data: ${error.message}`);
    }
  }

  /**
   * Get active batches for instructor
   * @param {ObjectId} instructorId 
   * @returns {Array} Active batches
   */
  async getActiveBatches(instructorId) {
    try {
      // Use imported Batch model
      
      return await Batch.find({
        instructor_id: instructorId,
        status: { $in: ['active', 'ongoing'] },
        end_date: { $gte: new Date() }
      })
      .populate('course_id', 'course_title course_thumbnail')
      .select('batch_name start_date end_date current_students max_students schedule')
      .lean();
    } catch (error) {
      console.error('Error fetching active batches:', error);
      return [];
    }
  }

  /**
   * Get total students across all instructor's batches
   * @param {ObjectId} instructorId 
   * @returns {Array} Students
   */
  async getTotalStudents(instructorId) {
    try {
      const batches = await Batch.find({
        instructor_id: instructorId,
        status: { $in: ['active', 'ongoing', 'completed'] }
      }).select('_id').lean();

      const batchIds = batches.map(batch => batch._id);

      return await Enrollment.find({
        batch_id: { $in: batchIds },
        enrollment_status: { $in: ['active', 'completed'] }
      })
      .populate('student_id', 'full_name email profile_picture')
      .select('student_id batch_id enrollment_date progress')
      .lean();
    } catch (error) {
      console.error('Error fetching total students:', error);
      return [];
    }
  }

  /**
   * Get pending demo bookings for instructor
   * @param {ObjectId} instructorId 
   * @returns {Array} Pending demos
   */
  async getPendingDemos(instructorId) {
    try {
      return await DemoBooking.find({
        instructor_id: instructorId,
        demo_status: { $in: ['scheduled', 'confirmed'] },
        demo_date: { $gte: new Date() }
      })
      .populate('student_id', 'full_name email phone_number')
      .populate('course_id', 'course_title')
      .select('demo_date demo_time demo_status course_id student_id demo_link')
      .sort({ demo_date: 1 })
      .lean();
    } catch (error) {
      console.error('Error fetching pending demos:', error);
      return [];
    }
  }

  /**
   * Get recent assignment submissions
   * @param {ObjectId} instructorId 
   * @returns {Object} Submissions data
   */
  async getRecentSubmissions(instructorId) {
    try {
      const assignments = await Assignment.find({
        instructor_id: instructorId,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      })
      .populate('submissions.studentId', 'full_name email')
      .populate('courseId', 'course_title')
      .select('title submissions courseId due_date createdAt')
      .lean();

      let allSubmissions = [];
      let completedCount = 0;
      let pendingCount = 0;

      assignments.forEach(assignment => {
        assignment.submissions.forEach(submission => {
          allSubmissions.push({
            assignmentTitle: assignment.title,
            courseName: assignment.courseId?.course_title,
            studentName: submission.studentId?.full_name,
            studentEmail: submission.studentId?.email,
            submittedAt: submission.submittedAt,
            status: submission.graded ? 'graded' : 'submitted',
            grade: submission.score
          });

          if (submission.graded) {
            completedCount++;
          } else {
            pendingCount++;
          }
        });
      });

      return {
        submissions: allSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)),
        completed: completedCount,
        pending: pendingCount
      };
    } catch (error) {
      console.error('Error fetching recent submissions:', error);
      return { submissions: [], completed: 0, pending: 0 };
    }
  }

  /**
   * Get upcoming classes for next 7 days
   * @param {ObjectId} instructorId 
   * @returns {Array} Upcoming classes
   */
  async getUpcomingClasses(instructorId) {
    try {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const batches = await Batch.find({
        instructor_id: instructorId,
        status: { $in: ['active', 'ongoing'] },
        start_date: { $lte: nextWeek },
        end_date: { $gte: new Date() }
      })
      .populate('course_id', 'course_title')
      .select('batch_name schedule course_id current_students')
      .lean();

      let upcomingClasses = [];
      const today = new Date();
      
      batches.forEach(batch => {
        if (batch.schedule && batch.schedule.days) {
          batch.schedule.days.forEach(day => {
            const classDate = this.getNextClassDate(day, batch.schedule.time);
            if (classDate && classDate <= nextWeek && classDate >= today) {
              upcomingClasses.push({
                batchName: batch.batch_name,
                courseTitle: batch.course_id?.course_title,
                date: classDate,
                time: batch.schedule.time,
                studentCount: batch.current_students,
                type: 'live_class'
              });
            }
          });
        }
      });

      return upcomingClasses.sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
      console.error('Error fetching upcoming classes:', error);
      return [];
    }
  }

  /**
   * Get monthly statistics
   * @param {ObjectId} instructorId 
   * @returns {Object} Monthly stats
   */
  async getMonthlyStats(instructorId) {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const [demosThisMonth, assignmentsThisMonth, newStudentsThisMonth] = await Promise.all([
        DemoBooking.countDocuments({
          instructor_id: instructorId,
          demo_date: { $gte: currentMonth, $lt: nextMonth },
          demo_status: 'completed'
        }),
        Assignment.countDocuments({
          instructor_id: instructorId,
          createdAt: { $gte: currentMonth, $lt: nextMonth }
        }),
        this.getNewStudentsThisMonth(instructorId, currentMonth, nextMonth)
      ]);

      return {
        demosCompleted: demosThisMonth,
        assignmentsCreated: assignmentsThisMonth,
        newStudents: newStudentsThisMonth,
        month: currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
      };
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
      return {
        demosCompleted: 0,
        assignmentsCreated: 0,
        newStudents: 0,
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
      };
    }
  }

  /**
   * Get new students enrolled this month
   * @param {ObjectId} instructorId 
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @returns {number} New students count
   */
  async getNewStudentsThisMonth(instructorId, startDate, endDate) {
    try {
      const batches = await Batch.find({
        instructor_id: instructorId,
        status: { $in: ['active', 'ongoing'] }
      }).select('_id').lean();

      const batchIds = batches.map(batch => batch._id);

      return await Enrollment.countDocuments({
        batch_id: { $in: batchIds },
        enrollment_date: { $gte: startDate, $lt: endDate },
        enrollment_status: 'active'
      });
    } catch (error) {
      console.error('Error fetching new students count:', error);
      return 0;
    }
  }

  /**
   * Helper function to get next class date for a given day
   * @param {string} dayName 
   * @param {string} time 
   * @returns {Date|null} Next class date
   */
  getNextClassDate(dayName, time) {
    try {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayIndex = days.indexOf(dayName);
      
      if (dayIndex === -1) return null;

      const today = new Date();
      const todayDayIndex = today.getDay();
      
      let daysUntilClass = dayIndex - todayDayIndex;
      if (daysUntilClass <= 0) {
        daysUntilClass += 7;
      }

      const classDate = new Date(today);
      classDate.setDate(today.getDate() + daysUntilClass);
      
      return classDate;
    } catch (error) {
      console.error('Error calculating next class date:', error);
      return null;
    }
  }

  /**
   * Get instructor overview/profile data
   * @param {string} instructorId 
   * @returns {Object} Instructor overview
   */
  async getInstructorOverview(instructorId) {
    try {
      const instructorObjectId = new mongoose.Types.ObjectId(instructorId);
      
      const instructor = await User.findById(instructorObjectId)
        .select('full_name email phone_number profile_picture domain meta status created_at')
        .lean();

      if (!instructor) {
        throw new Error('Instructor not found');
      }

      const [totalBatches, totalStudents, totalDemos, avgRating] = await Promise.all([
        this.getTotalBatchesCount(instructorObjectId),
        this.getTotalStudentsCount(instructorObjectId),
        this.getTotalDemosCount(instructorObjectId),
        this.getAverageRating(instructorObjectId)
      ]);

      return {
        success: true,
        data: {
          profile: instructor,
          statistics: {
            totalBatches,
            totalStudents,
            totalDemos,
            averageRating: avgRating,
            experience: this.calculateExperience(instructor.created_at)
          }
        }
      };
    } catch (error) {
      console.error('Error in getInstructorOverview:', error);
      throw new Error(`Failed to fetch instructor overview: ${error.message}`);
    }
  }

  async getTotalBatchesCount(instructorId) {
    try {
      return await Batch.countDocuments({ instructor_id: instructorId });
    } catch (error) {
      return 0;
    }
  }

  async getTotalStudentsCount(instructorId) {
    try {
      const students = await this.getTotalStudents(instructorId);
      return students.length;
    } catch (error) {
      return 0;
    }
  }

  async getTotalDemosCount(instructorId) {
    try {
      return await DemoBooking.countDocuments({ 
        instructor_id: instructorId,
        demo_status: 'completed'
      });
    } catch (error) {
      return 0;
    }
  }

  async getAverageRating(instructorId) {
    try {
      const { default: DemoFeedback } = await import("../models/demo-feedback.model.js");
      
      const ratings = await DemoFeedback.aggregate([
        { $match: { instructor_id: instructorId } },
        { $group: { _id: null, avgRating: { $avg: "$overall_rating" } } }
      ]);

      return ratings.length > 0 ? Math.round(ratings[0].avgRating * 10) / 10 : 0;
    } catch (error) {
      return 0;
    }
  }

  calculateExperience(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
    return `${Math.floor(diffDays / 365)} years`;
  }
}

export default new InstructorDashboardService(); 