import User from "../models/user-modal.js";
import Enrollment from "../models/enrollment-model.js";
import { Course, Batch } from "../models/course-model.js";
import Order from "../models/Order.js";
import EnhancedProgress from "../models/enhanced-progress.model.js";
import DemoFeedback from "../models/demo-feedback.model.js";
import Category from "../models/category-model.js";
import Announcement from "../models/announcement-model.js";
import Blog from "../models/blog-model.js";
import Complaint from "../models/complaint.js";
import Feedback from "../models/feedback.js";
import QuizResponse from "../models/quizResponse.js";
import Assignment from "../models/assignment.js";
import Attendace from "../models/attendance.model.js";
import OnlineMeeting from "../models/online-meeting.js";
import mongoose from "mongoose";

/**
 * Get comprehensive dashboard statistics for admin
 * @route GET /api/v1/admin/dashboard-stats
 * @access Admin only
 */
export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();

    // Helper function to get date ranges
    const getDateRanges = () => {
      const current = {
        month: new Date(now.getFullYear(), now.getMonth(), 1),
        quarter: new Date(
          now.getFullYear(),
          Math.floor(now.getMonth() / 3) * 3,
          1,
        ),
        halfYear: new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1),
        year: new Date(now.getFullYear(), 0, 1),
      };

      const previous = {
        month: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        quarter: new Date(
          now.getFullYear(),
          Math.floor(now.getMonth() / 3) * 3 - 3,
          1,
        ),
        halfYear: new Date(now.getFullYear(), now.getMonth() < 6 ? -6 : 0, 1),
        year: new Date(now.getFullYear() - 1, 0, 1),
      };

      return { current, previous };
    };

    const { current, previous } = getDateRanges();

    // Helper function to calculate percentage change
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // --- Total Students ---
    const totalStudents = await User.countDocuments({
      role: { $in: ["student", "coorporate-student"] },
    });

    // Students by period
    const studentsThisMonth = await User.countDocuments({
      role: { $in: ["student", "coorporate-student"] },
      createdAt: { $gte: current.month, $lte: now },
    });

    const studentsPrevMonth = await User.countDocuments({
      role: { $in: ["student", "coorporate-student"] },
      createdAt: { $gte: previous.month, $lt: current.month },
    });

    const studentsThisQuarter = await User.countDocuments({
      role: { $in: ["student", "coorporate-student"] },
      createdAt: { $gte: current.quarter, $lte: now },
    });

    const studentsPrevQuarter = await User.countDocuments({
      role: { $in: ["student", "coorporate-student"] },
      createdAt: { $gte: previous.quarter, $lt: current.quarter },
    });

    const studentsThisHalfYear = await User.countDocuments({
      role: { $in: ["student", "coorporate-student"] },
      createdAt: { $gte: current.halfYear, $lte: now },
    });

    const studentsPrevHalfYear = await User.countDocuments({
      role: { $in: ["student", "coorporate-student"] },
      createdAt: { $gte: previous.halfYear, $lt: current.halfYear },
    });

    const studentsThisYear = await User.countDocuments({
      role: { $in: ["student", "coorporate-student"] },
      createdAt: { $gte: current.year, $lte: now },
    });

    const studentsPrevYear = await User.countDocuments({
      role: { $in: ["student", "coorporate-student"] },
      createdAt: { $gte: previous.year, $lt: current.year },
    });

    // --- Total Instructors ---
    const totalInstructors = await User.countDocuments({
      role: { $in: ["instructor"] },
    });

    // Instructors by period
    const instructorsThisMonth = await User.countDocuments({
      role: { $in: ["instructor"] },
      createdAt: { $gte: current.month, $lte: now },
    });

    const instructorsPrevMonth = await User.countDocuments({
      role: { $in: ["instructor"] },
      createdAt: { $gte: previous.month, $lt: current.month },
    });

    const instructorsThisQuarter = await User.countDocuments({
      role: { $in: ["instructor"] },
      createdAt: { $gte: current.quarter, $lte: now },
    });

    const instructorsPrevQuarter = await User.countDocuments({
      role: { $in: ["instructor"] },
      createdAt: { $gte: previous.quarter, $lt: current.quarter },
    });

    const instructorsThisHalfYear = await User.countDocuments({
      role: { $in: ["instructor"] },
      createdAt: { $gte: current.halfYear, $lte: now },
    });

    const instructorsPrevHalfYear = await User.countDocuments({
      role: { $in: ["instructor"] },
      createdAt: { $gte: previous.halfYear, $lt: current.halfYear },
    });

    const instructorsThisYear = await User.countDocuments({
      role: { $in: ["instructor"] },
      createdAt: { $gte: current.year, $lte: now },
    });

    const instructorsPrevYear = await User.countDocuments({
      role: { $in: ["instructor"] },
      createdAt: { $gte: previous.year, $lt: current.year },
    });

    // --- Active Enrollments ---
    const totalActiveEnrollments = await Enrollment.countDocuments({
      status: "active",
    });

    // Active enrollments by period
    const activeEnrollmentsThisMonth = await Enrollment.countDocuments({
      status: "active",
      enrollment_date: { $gte: current.month, $lte: now },
    });

    const activeEnrollmentsPrevMonth = await Enrollment.countDocuments({
      status: "active",
      enrollment_date: { $gte: previous.month, $lt: current.month },
    });

    const activeEnrollmentsThisQuarter = await Enrollment.countDocuments({
      status: "active",
      enrollment_date: { $gte: current.quarter, $lte: now },
    });

    const activeEnrollmentsPrevQuarter = await Enrollment.countDocuments({
      status: "active",
      enrollment_date: { $gte: previous.quarter, $lt: current.quarter },
    });

    const activeEnrollmentsThisHalfYear = await Enrollment.countDocuments({
      status: "active",
      enrollment_date: { $gte: current.halfYear, $lte: now },
    });

    const activeEnrollmentsPrevHalfYear = await Enrollment.countDocuments({
      status: "active",
      enrollment_date: { $gte: previous.halfYear, $lt: current.halfYear },
    });

    const activeEnrollmentsThisYear = await Enrollment.countDocuments({
      status: "active",
      enrollment_date: { $gte: current.year, $lte: now },
    });

    const activeEnrollmentsPrevYear = await Enrollment.countDocuments({
      status: "active",
      enrollment_date: { $gte: previous.year, $lt: current.year },
    });

    // --- Active Courses ---
    const totalActiveCourses = await Course.countDocuments({
      status: { $in: ["Published", "published", "active"] },
    });

    // Active courses by period
    const activeCoursesThisMonth = await Course.countDocuments({
      status: { $in: ["Published", "published", "active"] },
      createdAt: { $gte: current.month, $lte: now },
    });

    const activeCoursesPrevMonth = await Course.countDocuments({
      status: { $in: ["Published", "published", "active"] },
      createdAt: { $gte: previous.month, $lt: current.month },
    });

    const activeCoursesThisQuarter = await Course.countDocuments({
      status: { $in: ["Published", "published", "active"] },
      createdAt: { $gte: current.quarter, $lte: now },
    });

    const activeCoursesPrevQuarter = await Course.countDocuments({
      status: { $in: ["Published", "published", "active"] },
      createdAt: { $gte: previous.quarter, $lt: current.quarter },
    });

    const activeCoursesThisHalfYear = await Course.countDocuments({
      status: { $in: ["Published", "published", "active"] },
      createdAt: { $gte: current.halfYear, $lte: now },
    });

    const activeCoursesPrevHalfYear = await Course.countDocuments({
      status: { $in: ["Published", "published", "active"] },
      createdAt: { $gte: previous.halfYear, $lt: current.halfYear },
    });

    const activeCoursesThisYear = await Course.countDocuments({
      status: { $in: ["Published", "published", "active"] },
      createdAt: { $gte: current.year, $lte: now },
    });

    const activeCoursesPrevYear = await Course.countDocuments({
      status: { $in: ["Published", "published", "active"] },
      createdAt: { $gte: previous.year, $lt: current.year },
    });

    // --- Monthly Revenue from Orders ---
    const totalRevenueThisMonth = await Order.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: current.month, $lte: now },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).then((r) => r[0]?.total || 0);

    const totalRevenuePrevMonth = await Order.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: previous.month, $lt: current.month },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).then((r) => r[0]?.total || 0);

    const totalRevenueThisQuarter = await Order.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: current.quarter, $lte: now },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).then((r) => r[0]?.total || 0);

    const totalRevenuePrevQuarter = await Order.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: previous.quarter, $lt: current.quarter },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).then((r) => r[0]?.total || 0);

    const totalRevenueThisHalfYear = await Order.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: current.halfYear, $lte: now },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).then((r) => r[0]?.total || 0);

    const totalRevenuePrevHalfYear = await Order.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: previous.halfYear, $lt: current.halfYear },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).then((r) => r[0]?.total || 0);

    const totalRevenueThisYear = await Order.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: current.year, $lte: now },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).then((r) => r[0]?.total || 0);

    const totalRevenuePrevYear = await Order.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: previous.year, $lt: current.year },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).then((r) => r[0]?.total || 0);

    // Total revenue from all paid orders
    const totalRevenue = await Order.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).then((r) => r[0]?.total || 0);

    // Also add revenue from enrollment payments
    const enrollmentRevenue = await Enrollment.aggregate([
      { $unwind: "$payments" },
      { $match: { "payments.payment_status": "completed" } },
      { $group: { _id: null, total: { $sum: "$payments.amount" } } },
    ]).then((r) => r[0]?.total || 0);

    // --- Upcoming Classes from Batch schedules ---
    const upcomingClasses = await Batch.aggregate([
      { $match: { status: { $in: ["Active", "Upcoming"] } } },
      { $unwind: "$schedule" },
      {
        $match: {
          $or: [
            // New date-based sessions
            {
              "schedule.date": { $exists: true },
              "schedule.date": { $gte: now },
            },
            // Legacy day-based sessions (approximate)
            {
              "schedule.day": { $exists: true },
              "schedule.date": { $exists: false },
            },
          ],
        },
      },
      { $count: "total" },
    ]).then((r) => r[0]?.total || 0);

    // --- Completion Rate from EnhancedProgress ---
    const completionStats = await EnhancedProgress.aggregate([
      {
        $match: {
          contentType: "course",
        },
      },
      {
        $group: {
          _id: null,
          totalCourses: { $sum: 1 },
          completedCourses: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
          averageProgress: { $avg: "$progressPercentage" },
        },
      },
    ]);

    const completionRate =
      completionStats[0]?.totalCourses > 0
        ? Math.round(
            (completionStats[0].completedCourses /
              completionStats[0].totalCourses) *
              100,
          )
        : 0;

    // --- Student Satisfaction from DemoFeedback ---
    const satisfactionStats = await DemoFeedback.aggregate([
      {
        $match: {
          overallRating: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$overallRating" },
          totalFeedbacks: { $sum: 1 },
          recommendationRate: {
            $avg: {
              $cond: ["$wouldRecommend", 1, 0],
            },
          },
        },
      },
    ]);

    const studentSatisfaction = satisfactionStats[0]?.averageRating
      ? Math.round((satisfactionStats[0].averageRating / 5) * 100)
      : 0;

    // --- Instructor Rating from DemoFeedback ---
    const instructorRatingStats = await DemoFeedback.aggregate([
      {
        $match: {
          instructorPerformance: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          averageRating: {
            $avg: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$instructorPerformance", "excellent"] },
                    then: 5,
                  },
                  {
                    case: { $eq: ["$instructorPerformance", "good"] },
                    then: 4,
                  },
                  {
                    case: { $eq: ["$instructorPerformance", "average"] },
                    then: 3,
                  },
                  {
                    case: { $eq: ["$instructorPerformance", "poor"] },
                    then: 2,
                  },
                ],
                default: 3,
              },
            },
          },
          totalRatings: { $sum: 1 },
        },
      },
    ]);

    const instructorRating = instructorRatingStats[0]?.averageRating
      ? Math.round((instructorRatingStats[0].averageRating / 5) * 100)
      : 0;

    // --- Support Tickets (placeholder - not implemented yet) ---
    const supportTickets = 0;

    // Prepare response
    const response = {
      success: true,
      data: {
        totalStudents: {
          total: totalStudents,
          changes: {
            monthly: {
              current: studentsThisMonth,
              previous: studentsPrevMonth,
              change: calculateChange(studentsThisMonth, studentsPrevMonth),
            },
            quarterly: {
              current: studentsThisQuarter,
              previous: studentsPrevQuarter,
              change: calculateChange(studentsThisQuarter, studentsPrevQuarter),
            },
            halfYearly: {
              current: studentsThisHalfYear,
              previous: studentsPrevHalfYear,
              change: calculateChange(
                studentsThisHalfYear,
                studentsPrevHalfYear,
              ),
            },
            yearly: {
              current: studentsThisYear,
              previous: studentsPrevYear,
              change: calculateChange(studentsThisYear, studentsPrevYear),
            },
          },
        },
        totalInstructors: {
          total: totalInstructors,
          changes: {
            monthly: {
              current: instructorsThisMonth,
              previous: instructorsPrevMonth,
              change: calculateChange(
                instructorsThisMonth,
                instructorsPrevMonth,
              ),
            },
            quarterly: {
              current: instructorsThisQuarter,
              previous: instructorsPrevQuarter,
              change: calculateChange(
                instructorsThisQuarter,
                instructorsPrevQuarter,
              ),
            },
            halfYearly: {
              current: instructorsThisHalfYear,
              previous: instructorsPrevHalfYear,
              change: calculateChange(
                instructorsThisHalfYear,
                instructorsPrevHalfYear,
              ),
            },
            yearly: {
              current: instructorsThisYear,
              previous: instructorsPrevYear,
              change: calculateChange(instructorsThisYear, instructorsPrevYear),
            },
          },
        },
        activeEnrollments: {
          total: totalActiveEnrollments,
          changes: {
            monthly: {
              current: activeEnrollmentsThisMonth,
              previous: activeEnrollmentsPrevMonth,
              change: calculateChange(
                activeEnrollmentsThisMonth,
                activeEnrollmentsPrevMonth,
              ),
            },
            quarterly: {
              current: activeEnrollmentsThisQuarter,
              previous: activeEnrollmentsPrevQuarter,
              change: calculateChange(
                activeEnrollmentsThisQuarter,
                activeEnrollmentsPrevQuarter,
              ),
            },
            halfYearly: {
              current: activeEnrollmentsThisHalfYear,
              previous: activeEnrollmentsPrevHalfYear,
              change: calculateChange(
                activeEnrollmentsThisHalfYear,
                activeEnrollmentsPrevHalfYear,
              ),
            },
            yearly: {
              current: activeEnrollmentsThisYear,
              previous: activeEnrollmentsPrevYear,
              change: calculateChange(
                activeEnrollmentsThisYear,
                activeEnrollmentsPrevYear,
              ),
            },
          },
        },
        activeCourses: {
          total: totalActiveCourses,
          changes: {
            monthly: {
              current: activeCoursesThisMonth,
              previous: activeCoursesPrevMonth,
              change: calculateChange(
                activeCoursesThisMonth,
                activeCoursesPrevMonth,
              ),
            },
            quarterly: {
              current: activeCoursesThisQuarter,
              previous: activeCoursesPrevQuarter,
              change: calculateChange(
                activeCoursesThisQuarter,
                activeCoursesPrevQuarter,
              ),
            },
            halfYearly: {
              current: activeCoursesThisHalfYear,
              previous: activeCoursesPrevHalfYear,
              change: calculateChange(
                activeCoursesThisHalfYear,
                activeCoursesPrevHalfYear,
              ),
            },
            yearly: {
              current: activeCoursesThisYear,
              previous: activeCoursesPrevYear,
              change: calculateChange(
                activeCoursesThisYear,
                activeCoursesPrevYear,
              ),
            },
          },
        },
        monthlyRevenue: {
          total: totalRevenue + enrollmentRevenue,
          changes: {
            monthly: {
              current: totalRevenueThisMonth,
              previous: totalRevenuePrevMonth,
              change: calculateChange(
                totalRevenueThisMonth,
                totalRevenuePrevMonth,
              ),
            },
            quarterly: {
              current: totalRevenueThisQuarter,
              previous: totalRevenuePrevQuarter,
              change: calculateChange(
                totalRevenueThisQuarter,
                totalRevenuePrevQuarter,
              ),
            },
            halfYearly: {
              current: totalRevenueThisHalfYear,
              previous: totalRevenuePrevHalfYear,
              change: calculateChange(
                totalRevenueThisHalfYear,
                totalRevenuePrevHalfYear,
              ),
            },
            yearly: {
              current: totalRevenueThisYear,
              previous: totalRevenuePrevYear,
              change: calculateChange(
                totalRevenueThisYear,
                totalRevenuePrevYear,
              ),
            },
          },
        },
        upcomingClasses: {
          total: upcomingClasses,
        },
        completionRate: {
          total: completionRate,
        },
        studentSatisfaction: {
          total: studentSatisfaction,
        },
        instructorRating: {
          total: instructorRating,
        },
        supportTickets: {
          total: supportTickets,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching dashboard statistics",
      error: error.message,
    });
  }
};

/**
 * Get comprehensive user management data
 * @route GET /api/v1/admin/users
 * @access Admin only
 */
export const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      role = "",
      status = "",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build search query
    const searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { email: { $regex: search, $options: "i" } },
        { "personalInfo.firstName": { $regex: search, $options: "i" } },
        { "personalInfo.lastName": { $regex: search, $options: "i" } },
        { "personalInfo.phone": { $regex: search, $options: "i" } }
      ];
    }
    if (role) searchQuery.role = role;
    if (status) searchQuery.status = status;

    // Build sort query
    const sortQuery = {};
    sortQuery[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute queries
    const [users, totalUsers] = await Promise.all([
      User.find(searchQuery)
        .select("-password -refreshTokens -mfa.backupCodes")
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      User.countDocuments(searchQuery)
    ]);

    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] } },
          suspended: { $sum: { $cond: [{ $eq: ["$status", "suspended"] }, 1, 0] } }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          limit: parseInt(limit)
        },
        stats: userStats
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
      error: error.message
    });
  }
};

/**
 * Get user by ID
 * @route GET /api/v1/admin/users/:id
 * @access Admin only
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    const user = await User.findById(id)
      .select("-password -refreshTokens -mfa.backupCodes")
      .populate("enrollments")
      .populate("assignedCourses");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get user activity stats
    const [enrollmentCount, completedCourses, totalProgress] = await Promise.all([
      Enrollment.countDocuments({ student_id: id }),
      EnhancedProgress.countDocuments({ userId: id, status: "completed" }),
      EnhancedProgress.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(id) } },
        { $group: { _id: null, avgProgress: { $avg: "$progressPercentage" } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          enrollmentCount,
          completedCourses,
          averageProgress: totalProgress[0]?.avgProgress || 0
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user",
      error: error.message
    });
  }
};

/**
 * Update user status
 * @route PUT /api/v1/admin/users/:id/status
 * @access Admin only
 */
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    if (!status || !["active", "inactive", "suspended"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be active, inactive, or suspended"
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true, select: "-password -refreshTokens -mfa.backupCodes" }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: user
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating user status",
      error: error.message
    });
  }
};

/**
 * Delete user (soft delete)
 * @route DELETE /api/v1/admin/users/:id
 * @access Admin only
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { 
        status: "deleted",
        deletedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true, select: "-password -refreshTokens -mfa.backupCodes" }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: user
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting user",
      error: error.message
    });
  }
};

/**
 * Get comprehensive course management data
 * @route GET /api/v1/admin/courses
 * @access Admin only
 */
export const getCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category = "",
      status = "",
      courseType = "",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build search query
    const searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { instructor: { $regex: search, $options: "i" } }
      ];
    }
    if (category) searchQuery.category = category;
    if (status) searchQuery.status = status;
    if (courseType) searchQuery.courseType = courseType;

    // Build sort query
    const sortQuery = {};
    sortQuery[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute queries
    const [courses, totalCourses] = await Promise.all([
      Course.find(searchQuery)
        .populate("category", "name")
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Course.countDocuments(searchQuery)
    ]);

    // Get course statistics
    const courseStats = await Course.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$price" },
          avgPrice: { $avg: "$price" }
        }
      }
    ]);

    // Get enrollment statistics for these courses
    const enrollmentStats = await Enrollment.aggregate([
      {
        $group: {
          _id: "$course_id",
          enrollmentCount: { $sum: 1 },
          activeEnrollments: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        courses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCourses / limit),
          totalCourses,
          limit: parseInt(limit)
        },
        stats: {
          courseStats,
          enrollmentStats
        }
      }
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching courses",
      error: error.message
    });
  }
};

/**
 * Get comprehensive batch management data
 * @route GET /api/v1/admin/batches
 * @access Admin only
 */
export const getBatches = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      instructorId = "",
      courseId = "",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build search query
    const searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    if (status) searchQuery.status = status;
    if (instructorId) searchQuery.instructor = instructorId;
    if (courseId) searchQuery.course = courseId;

    // Build sort query
    const sortQuery = {};
    sortQuery[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute queries
    const [batches, totalBatches] = await Promise.all([
      Batch.find(searchQuery)
        .populate("course", "title")
        .populate("instructor", "personalInfo.firstName personalInfo.lastName email")
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Batch.countDocuments(searchQuery)
    ]);

    // Get batch statistics
    const batchStats = await Batch.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalCapacity: { $sum: "$capacity" },
          avgCapacity: { $avg: "$capacity" }
        }
      }
    ]);

    // Get enrollment statistics for batches
    const enrollmentStats = await Enrollment.aggregate([
      {
        $group: {
          _id: "$batch_id",
          enrollmentCount: { $sum: 1 },
          activeEnrollments: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        batches,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalBatches / limit),
          totalBatches,
          limit: parseInt(limit)
        },
        stats: {
          batchStats,
          enrollmentStats
        }
      }
    });
  } catch (error) {
    console.error("Error fetching batches:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching batches",
      error: error.message
    });
  }
};

/**
 * Get comprehensive enrollment management data
 * @route GET /api/v1/admin/enrollments
 * @access Admin only
 */
export const getEnrollments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      courseId = "",
      batchId = "",
      sortBy = "enrollment_date",
      sortOrder = "desc"
    } = req.query;

    // Build search query
    const searchQuery = {};
    if (status) searchQuery.status = status;
    if (courseId) searchQuery.course_id = courseId;
    if (batchId) searchQuery.batch_id = batchId;

    // Build sort query
    const sortQuery = {};
    sortQuery[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute queries with population
    const [enrollments, totalEnrollments] = await Promise.all([
      Enrollment.find(searchQuery)
        .populate("student_id", "personalInfo.firstName personalInfo.lastName email")
        .populate("course_id", "title")
        .populate("batch_id", "name")
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Enrollment.countDocuments(searchQuery)
    ]);

    // Get enrollment statistics
    const enrollmentStats = await Enrollment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRevenue: { $sum: { $reduce: { input: "$payments.amount", initialValue: 0, in: { $add: ["$$value", "$$this"] } } } }
        }
      }
    ]);

    // Get monthly enrollment trends
    const monthlyTrends = await Enrollment.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$enrollment_date" },
            month: { $month: "$enrollment_date" }
          },
          count: { $sum: 1 },
          revenue: { $sum: { $reduce: { input: "$payments.amount", initialValue: 0, in: { $add: ["$$value", "$$this"] } } } }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        enrollments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalEnrollments / limit),
          totalEnrollments,
          limit: parseInt(limit)
        },
        stats: {
          enrollmentStats,
          monthlyTrends
        }
      }
    });
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching enrollments",
      error: error.message
    });
  }
};

/**
 * Get comprehensive payment management data
 * @route GET /api/v1/admin/payments
 * @access Admin only
 */
export const getPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      paymentMethod = "",
      dateFrom = "",
      dateTo = "",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build search query
    const searchQuery = {};
    if (status) searchQuery.status = status;
    if (paymentMethod) searchQuery.paymentMethod = paymentMethod;
    if (dateFrom || dateTo) {
      searchQuery.createdAt = {};
      if (dateFrom) searchQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) searchQuery.createdAt.$lte = new Date(dateTo);
    }

    // Build sort query
    const sortQuery = {};
    sortQuery[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute queries
    const [payments, totalPayments] = await Promise.all([
      Order.find(searchQuery)
        .populate("student_id", "personalInfo.firstName personalInfo.lastName email")
        .populate("course_id", "title")
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Order.countDocuments(searchQuery)
    ]);

    // Get payment statistics
    const paymentStats = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" }
        }
      }
    ]);

    // Get payment method statistics
    const paymentMethodStats = await Order.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    // Get daily revenue trends for last 30 days
    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPayments / limit),
          totalPayments,
          limit: parseInt(limit)
        },
        stats: {
          paymentStats,
          paymentMethodStats,
          dailyRevenue
        }
      }
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching payments",
      error: error.message
    });
  }
};

/**
 * Get comprehensive announcement management data
 * @route GET /api/v1/admin/announcements
 * @access Admin only
 */
export const getAnnouncements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      priority = "",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build search query
    const searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    if (status) searchQuery.status = status;
    if (priority) searchQuery.priority = priority;

    // Build sort query
    const sortQuery = {};
    sortQuery[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute queries
    const [announcements, totalAnnouncements] = await Promise.all([
      Announcement.find(searchQuery)
        .populate("createdBy", "personalInfo.firstName personalInfo.lastName email")
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Announcement.countDocuments(searchQuery)
    ]);

    // Get announcement statistics
    const announcementStats = await Announcement.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        announcements,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalAnnouncements / limit),
          totalAnnouncements,
          limit: parseInt(limit)
        },
        stats: announcementStats
      }
    });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching announcements",
      error: error.message
    });
  }
};

/**
 * Get comprehensive blog management data
 * @route GET /api/v1/admin/blogs
 * @access Admin only
 */
export const getBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      category = "",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build search query
    const searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { metaDescription: { $regex: search, $options: "i" } }
      ];
    }
    if (status) searchQuery.status = status;
    if (category) searchQuery.category = category;

    // Build sort query
    const sortQuery = {};
    sortQuery[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute queries
    const [blogs, totalBlogs] = await Promise.all([
      Blog.find(searchQuery)
        .populate("author", "personalInfo.firstName personalInfo.lastName email")
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Blog.countDocuments(searchQuery)
    ]);

    // Get blog statistics
    const blogStats = await Blog.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalViews: { $sum: "$views" },
          avgViews: { $avg: "$views" }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        blogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalBlogs / limit),
          totalBlogs,
          limit: parseInt(limit)
        },
        stats: blogStats
      }
    });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching blogs",
      error: error.message
    });
  }
};

/**
 * Get comprehensive support management data (complaints, feedback, etc.)
 * @route GET /api/v1/admin/support
 * @access Admin only
 */
export const getSupportTickets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      priority = "",
      type = "",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build search query
    const searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { subject: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    if (status) searchQuery.status = status;
    if (priority) searchQuery.priority = priority;

    // Build sort query
    const sortQuery = {};
    sortQuery[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get complaints and feedback data
    const [complaints, feedback, totalComplaints, totalFeedback] = await Promise.all([
      Complaint.find(searchQuery)
        .populate("user", "personalInfo.firstName personalInfo.lastName email")
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Feedback.find(searchQuery)
        .populate("student", "personalInfo.firstName personalInfo.lastName email")
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Complaint.countDocuments(searchQuery),
      Feedback.countDocuments(searchQuery)
    ]);

    // Get support statistics
    const [complaintStats, feedbackStats] = await Promise.all([
      Complaint.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]),
      Feedback.aggregate([
        {
          $group: {
            _id: "$rating",
            count: { $sum: 1 },
            avgRating: { $avg: "$rating" }
          }
        }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        tickets: {
          complaints,
          feedback
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil((totalComplaints + totalFeedback) / limit),
          totalTickets: totalComplaints + totalFeedback,
          totalComplaints,
          totalFeedback,
          limit: parseInt(limit)
        },
        stats: {
          complaintStats,
          feedbackStats
        }
      }
    });
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching support tickets",
      error: error.message
    });
  }
};

/**
 * Get comprehensive assessment and progress management data
 * @route GET /api/v1/admin/assessments
 * @access Admin only
 */
export const getAssessments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      courseId = "",
      type = "",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build search query
    const searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    if (courseId) searchQuery.course = courseId;
    if (type) searchQuery.type = type;

    // Build sort query
    const sortQuery = {};
    sortQuery[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get quiz responses and assignments
    const [quizResponses, assignments, totalQuizzes, totalAssignments] = await Promise.all([
      QuizResponse.find()
        .populate("student", "personalInfo.firstName personalInfo.lastName email")
        .populate("quiz", "title course")
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Assignment.find(searchQuery)
        .populate("course", "title")
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      QuizResponse.countDocuments(),
      Assignment.countDocuments(searchQuery)
    ]);

    // Get progress statistics
    const [progressStats, completionStats] = await Promise.all([
      EnhancedProgress.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            avgProgress: { $avg: "$progressPercentage" }
          }
        }
      ]),
      QuizResponse.aggregate([
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            avgScore: { $avg: "$score" },
            passedAttempts: { $sum: { $cond: [{ $gte: ["$score", 60] }, 1, 0] } }
          }
        }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        assessments: {
          quizResponses,
          assignments
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil((totalQuizzes + totalAssignments) / limit),
          totalAssessments: totalQuizzes + totalAssignments,
          totalQuizzes,
          totalAssignments,
          limit: parseInt(limit)
        },
        stats: {
          progressStats,
          completionStats: completionStats[0] || {}
        }
      }
    });
  } catch (error) {
    console.error("Error fetching assessments:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching assessments",
      error: error.message
    });
  }
};

/**
 * Get comprehensive system administration data
 * @route GET /api/v1/admin/system
 * @access Admin only
 */
export const getSystemStats = async (req, res) => {
  try {
    // Get database statistics
    const [
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalOrders,
      activeConnections
    ] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Enrollment.countDocuments(),
      Order.countDocuments(),
      mongoose.connection.db.stats()
    ]);

    // Get recent activity
    const recentActivity = await Promise.all([
      User.find({}, null, { sort: { createdAt: -1 }, limit: 5 })
        .select("personalInfo.firstName personalInfo.lastName email role createdAt"),
      Course.find({}, null, { sort: { createdAt: -1 }, limit: 5 })
        .select("title status createdAt"),
      Enrollment.find({}, null, { sort: { enrollment_date: -1 }, limit: 5 })
        .populate("student_id", "personalInfo.firstName personalInfo.lastName")
        .populate("course_id", "title")
    ]);

    // System health metrics
    const systemHealth = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        connected: mongoose.connection.readyState === 1,
        collections: activeConnections.collections || 0,
        dataSize: activeConnections.dataSize || 0,
        indexSize: activeConnections.indexSize || 0
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          courses: totalCourses,
          enrollments: totalEnrollments,
          orders: totalOrders
        },
        recentActivity: {
          newUsers: recentActivity[0],
          newCourses: recentActivity[1],
          newEnrollments: recentActivity[2]
        },
        systemHealth
      }
    });
  } catch (error) {
    console.error("Error fetching system stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching system statistics",
      error: error.message
    });
  }
};

/**
 * Get comprehensive corporate training management data
 * @route GET /api/v1/admin/corporate-training
 * @access Admin only
 */
export const getCorporateTraining = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build search query
    const searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { "company.name": { $regex: search, $options: "i" } },
        { "company.email": { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } }
      ];
    }
    if (status) searchQuery.status = status;

    // Build sort query
    const sortQuery = {};
    sortQuery[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get corporate users and their training data
    const [corporateUsers, totalCorporateUsers] = await Promise.all([
      User.find({ role: { $in: ["corporate", "corporate-admin"] } })
        .select("personalInfo.firstName personalInfo.lastName email company role status createdAt")
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      User.countDocuments({ role: { $in: ["corporate", "corporate-admin"] } })
    ]);

    // Get corporate training statistics
    const corporateStats = await User.aggregate([
      { $match: { role: { $in: ["corporate", "corporate-admin"] } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get corporate enrollment statistics
    const corporateEnrollmentStats = await Enrollment.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "student_id",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },
      { $match: { "student.role": { $in: ["corporate-student", "corporate"] } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRevenue: { $sum: { $reduce: { input: "$payments.amount", initialValue: 0, in: { $add: ["$$value", "$$this"] } } } }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        corporateUsers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCorporateUsers / limit),
          totalCorporateUsers,
          limit: parseInt(limit)
        },
        stats: {
          corporateStats,
          corporateEnrollmentStats
        }
      }
    });
  } catch (error) {
    console.error("Error fetching corporate training data:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching corporate training data",
      error: error.message
    });
  }
};
