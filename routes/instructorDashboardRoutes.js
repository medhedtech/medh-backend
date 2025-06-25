import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { param, query } from "express-validator";
import {
  getInstructorDashboard,
  getInstructorOverview,
  getInstructorActiveBatches,
  getInstructorStudents,
  getInstructorPendingDemos,
  getInstructorUpcomingClasses,
  getInstructorRecentSubmissions,
  getInstructorMonthlyStats
} from "../controllers/instructorDashboardController.js";

const router = express.Router();

// Validation middleware
const validateInstructorId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid instructor ID format')
];

const validatePaginationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const validateStatusQuery = [
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'completed', 'pending', 'graded', 'submitted'])
    .withMessage('Invalid status value')
];

const validateDaysQuery = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Days must be between 1 and 30')
];

// ==========================================
// INSTRUCTOR DASHBOARD ROUTES
// ==========================================

/**
 * @route   GET /api/v1/instructors/dashboard
 * @desc    Get comprehensive instructor dashboard data
 * @access  Private (Instructor only)
 */
router.get(
  "/dashboard",
  authenticateToken,
  getInstructorDashboard
);

/**
 * @route   GET /api/v1/instructors/profile
 * @desc    Get current instructor's profile overview
 * @access  Private (Instructor only)
 */
router.get(
  "/profile",
  authenticateToken,
  (req, res, next) => {
    // Set the instructor ID to the current user's ID
    req.params.id = req.user.id;
    next();
  },
  getInstructorOverview
);

/**
 * @route   GET /api/v1/instructors/:id/overview
 * @desc    Get instructor profile overview with statistics
 * @access  Private (Instructor - own data or Admin)
 */
router.get(
  "/:id/overview",
  authenticateToken,
  validateInstructorId,
  getInstructorOverview
);

/**
 * @route   GET /api/v1/instructors/batches/active
 * @desc    Get instructor's active batches
 * @access  Private (Instructor only)
 */
router.get(
  "/batches/active",
  authenticateToken,
  getInstructorActiveBatches
);

/**
 * @route   GET /api/v1/instructors/students
 * @desc    Get instructor's students with filtering and pagination
 * @access  Private (Instructor only)
 */
router.get(
  "/students",
  authenticateToken,
  [
    ...validatePaginationQuery,
    ...validateStatusQuery,
    query('batch_id')
      .optional()
      .isMongoId()
      .withMessage('Invalid batch ID format')
  ],
  getInstructorStudents
);

/**
 * @route   GET /api/v1/instructors/demos/pending
 * @desc    Get instructor's pending demo bookings
 * @access  Private (Instructor only)
 */
router.get(
  "/demos/pending",
  authenticateToken,
  getInstructorPendingDemos
);

/**
 * @route   GET /api/v1/instructors/classes/upcoming
 * @desc    Get instructor's upcoming classes
 * @access  Private (Instructor only)
 */
router.get(
  "/classes/upcoming",
  authenticateToken,
  validateDaysQuery,
  getInstructorUpcomingClasses
);

/**
 * @route   GET /api/v1/instructors/submissions/recent
 * @desc    Get instructor's recent assignment submissions
 * @access  Private (Instructor only)
 */
router.get(
  "/submissions/recent",
  authenticateToken,
  [
    ...validateStatusQuery,
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  getInstructorRecentSubmissions
);

/**
 * @route   GET /api/v1/instructors/stats/monthly
 * @desc    Get instructor's monthly statistics
 * @access  Private (Instructor only)
 */
router.get(
  "/stats/monthly",
  authenticateToken,
  getInstructorMonthlyStats
);

// ==========================================
// ERROR HANDLING MIDDLEWARE
// ==========================================

// Global error handler for instructor dashboard routes
router.use((error, req, res, next) => {
  console.error("Instructor Dashboard Routes Error:", error);
  
  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }
  
  // Handle cast errors (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format"
    });
  }
  
  // Handle authentication errors
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }
  
  // Generic server error
  res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

export default router; 