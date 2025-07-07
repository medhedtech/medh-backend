import User from "../models/user-modal.js";
import Enrollment from "../models/enrollment-model.js";
import { Course, Batch } from "../models/course-model.js";
import Order from "../models/Order.js";
import EnhancedProgress from "../models/enhanced-progress.model.js";
import DemoFeedback from "../models/demo-feedback.model.js";

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
      $or: [
        { role: { $in: ["student"] } },
        { admin_role: { $in: ["student"] } },
      ],
    });

    // Students by period
    const studentsThisMonth = await User.countDocuments({
      $or: [
        { role: { $in: ["student"] } },
        { admin_role: { $in: ["student"] } },
      ],
      created_at: { $gte: current.month, $lte: now },
    });

    const studentsPrevMonth = await User.countDocuments({
      $or: [
        { role: { $in: ["student"] } },
        { admin_role: { $in: ["student"] } },
      ],
      created_at: { $gte: previous.month, $lt: current.month },
    });

    const studentsThisQuarter = await User.countDocuments({
      $or: [
        { role: { $in: ["student"] } },
        { admin_role: { $in: ["student"] } },
      ],
      created_at: { $gte: current.quarter, $lte: now },
    });

    const studentsPrevQuarter = await User.countDocuments({
      $or: [
        { role: { $in: ["student"] } },
        { admin_role: { $in: ["student"] } },
      ],
      created_at: { $gte: previous.quarter, $lt: current.quarter },
    });

    const studentsThisHalfYear = await User.countDocuments({
      $or: [
        { role: { $in: ["student"] } },
        { admin_role: { $in: ["student"] } },
      ],
      created_at: { $gte: current.halfYear, $lte: now },
    });

    const studentsPrevHalfYear = await User.countDocuments({
      $or: [
        { role: { $in: ["student"] } },
        { admin_role: { $in: ["student"] } },
      ],
      created_at: { $gte: previous.halfYear, $lt: current.halfYear },
    });

    const studentsThisYear = await User.countDocuments({
      $or: [
        { role: { $in: ["student"] } },
        { admin_role: { $in: ["student"] } },
      ],
      created_at: { $gte: current.year, $lte: now },
    });

    const studentsPrevYear = await User.countDocuments({
      $or: [
        { role: { $in: ["student"] } },
        { admin_role: { $in: ["student"] } },
      ],
      created_at: { $gte: previous.year, $lt: current.year },
    });

    // --- Active Enrollments ---
    const totalActiveEnrollments = await Enrollment.countDocuments({
      status: "active",
    });

    // Active enrollments by period
    const activeEnrollmentsThisMonth = await Enrollment.countDocuments({
      status: "active",
      createdAt: { $gte: current.month, $lte: now },
    });

    const activeEnrollmentsPrevMonth = await Enrollment.countDocuments({
      status: "active",
      createdAt: { $gte: previous.month, $lt: current.month },
    });

    const activeEnrollmentsThisQuarter = await Enrollment.countDocuments({
      status: "active",
      createdAt: { $gte: current.quarter, $lte: now },
    });

    const activeEnrollmentsPrevQuarter = await Enrollment.countDocuments({
      status: "active",
      createdAt: { $gte: previous.quarter, $lt: current.quarter },
    });

    const activeEnrollmentsThisHalfYear = await Enrollment.countDocuments({
      status: "active",
      createdAt: { $gte: current.halfYear, $lte: now },
    });

    const activeEnrollmentsPrevHalfYear = await Enrollment.countDocuments({
      status: "active",
      createdAt: { $gte: previous.halfYear, $lt: current.halfYear },
    });

    const activeEnrollmentsThisYear = await Enrollment.countDocuments({
      status: "active",
      createdAt: { $gte: current.year, $lte: now },
    });

    const activeEnrollmentsPrevYear = await Enrollment.countDocuments({
      status: "active",
      createdAt: { $gte: previous.year, $lt: current.year },
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
