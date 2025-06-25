import instructorDashboardService from "../services/instructorDashboardService.js";
import { validationResult } from "express-validator";

/**
 * Helper function to check if user has instructor access
 * @param {string|string[]} userRole - User's role(s)
 * @returns {boolean} - Whether user has instructor access
 */
const hasInstructorAccess = (userRole) => {
  const userRoles = Array.isArray(userRole) ? userRole : [userRole];
  return userRoles.includes('instructor') || userRoles.includes('admin') || userRoles.includes('super-admin');
};

/**
 * @desc    Get instructor dashboard data
 * @route   GET /api/v1/instructors/dashboard
 * @access  Private (Instructor only)
 */
export const getInstructorDashboard = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const instructorId = req.user.id;

    // Verify user is an instructor
    if (!hasInstructorAccess(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Instructor role required."
      });
    }

    const dashboardData = await instructorDashboardService.getDashboardData(instructorId);

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error("Error in getInstructorDashboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc    Get instructor overview/profile data
 * @route   GET /api/v1/instructors/:id/overview
 * @access  Private (Instructor only - own data or admin)
 */
export const getInstructorOverview = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const requestedInstructorId = req.params.id;
    const currentUserId = req.user.id;

    // Check if user is requesting their own data or is an admin
    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    if (requestedInstructorId !== currentUserId && !userRoles.includes('admin') && !userRoles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own overview."
      });
    }

    const overviewData = await instructorDashboardService.getInstructorOverview(requestedInstructorId);

    res.status(200).json(overviewData);
  } catch (error) {
    console.error("Error in getInstructorOverview:", error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: "Instructor not found"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch instructor overview",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc    Get instructor's active batches
 * @route   GET /api/v1/instructors/batches/active
 * @access  Private (Instructor only)
 */
export const getInstructorActiveBatches = async (req, res) => {
  try {
    const instructorId = req.user.id;

    // Verify user is an instructor
    if (!hasInstructorAccess(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Instructor role required."
      });
    }

    const activeBatches = await instructorDashboardService.getActiveBatches(instructorId);

    res.status(200).json({
      success: true,
      data: activeBatches,
      count: activeBatches.length
    });
  } catch (error) {
    console.error("Error in getInstructorActiveBatches:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active batches",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc    Get instructor's students
 * @route   GET /api/v1/instructors/students
 * @access  Private (Instructor only)
 */
export const getInstructorStudents = async (req, res) => {
  try {
    const instructorId = req.user.id;
    const { batch_id, status, page = 1, limit = 20 } = req.query;

    // Verify user is an instructor
    if (!hasInstructorAccess(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Instructor role required."
      });
    }

    let students = await instructorDashboardService.getTotalStudents(instructorId);

    // Apply filters
    if (batch_id) {
      students = students.filter(student => student.batch_id.toString() === batch_id);
    }

    if (status) {
      students = students.filter(student => student.enrollment_status === status);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedStudents = students.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: paginatedStudents,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(students.length / limit),
        total: students.length,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Error in getInstructorStudents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch students",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc    Get instructor's pending demos
 * @route   GET /api/v1/instructors/demos/pending
 * @access  Private (Instructor only)
 */
export const getInstructorPendingDemos = async (req, res) => {
  try {
    const instructorId = req.user.id;

    // Verify user is an instructor
    if (!hasInstructorAccess(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Instructor role required."
      });
    }

    const pendingDemos = await instructorDashboardService.getPendingDemos(instructorId);

    res.status(200).json({
      success: true,
      data: pendingDemos,
      count: pendingDemos.length
    });
  } catch (error) {
    console.error("Error in getInstructorPendingDemos:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending demos",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc    Get instructor's upcoming classes
 * @route   GET /api/v1/instructors/classes/upcoming
 * @access  Private (Instructor only)
 */
export const getInstructorUpcomingClasses = async (req, res) => {
  try {
    const instructorId = req.user.id;
    const { days = 7 } = req.query;

    // Verify user is an instructor
    if (!hasInstructorAccess(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Instructor role required."
      });
    }

    const upcomingClasses = await instructorDashboardService.getUpcomingClasses(instructorId);

    // Filter by days if specified
    if (days && days !== '7') {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(days));
      
      const filteredClasses = upcomingClasses.filter(cls => 
        new Date(cls.date) <= futureDate
      );

      return res.status(200).json({
        success: true,
        data: filteredClasses,
        count: filteredClasses.length,
        period: `Next ${days} days`
      });
    }

    res.status(200).json({
      success: true,
      data: upcomingClasses,
      count: upcomingClasses.length,
      period: "Next 7 days"
    });
  } catch (error) {
    console.error("Error in getInstructorUpcomingClasses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch upcoming classes",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc    Get instructor's recent submissions
 * @route   GET /api/v1/instructors/submissions/recent
 * @access  Private (Instructor only)
 */
export const getInstructorRecentSubmissions = async (req, res) => {
  try {
    const instructorId = req.user.id;
    const { status, limit = 10 } = req.query;

    // Verify user is an instructor
    if (!hasInstructorAccess(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Instructor role required."
      });
    }

    const submissionsData = await instructorDashboardService.getRecentSubmissions(instructorId);

    let filteredSubmissions = submissionsData.submissions;

    // Apply status filter
    if (status) {
      filteredSubmissions = filteredSubmissions.filter(submission => 
        submission.status === status
      );
    }

    // Apply limit
    filteredSubmissions = filteredSubmissions.slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: filteredSubmissions,
      summary: {
        total: submissionsData.submissions.length,
        completed: submissionsData.completed,
        pending: submissionsData.pending,
        filtered: filteredSubmissions.length
      }
    });
  } catch (error) {
    console.error("Error in getInstructorRecentSubmissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent submissions",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * @desc    Get instructor's monthly statistics
 * @route   GET /api/v1/instructors/stats/monthly
 * @access  Private (Instructor only)
 */
export const getInstructorMonthlyStats = async (req, res) => {
  try {
    const instructorId = req.user.id;

    // Verify user is an instructor
    if (!hasInstructorAccess(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Instructor role required."
      });
    }

    const monthlyStats = await instructorDashboardService.getMonthlyStats(instructorId);

    res.status(200).json({
      success: true,
      data: monthlyStats
    });
  } catch (error) {
    console.error("Error in getInstructorMonthlyStats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch monthly statistics",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}; 