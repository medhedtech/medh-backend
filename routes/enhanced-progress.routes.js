import express from "express";
import {
  createProgress,
  getUserProgress,
  updateProgress,
  deleteProgress,
  getProgressById,
  getProgressAnalytics,
  getBulkProgress,
  exportProgressData,
  getProgressSummary,
  getProgressHistory,
  resetProgress,
  syncProgress,
  getProgressLeaderboard,
  getProgressInsights,
  bulkUpdateProgress,
  archiveProgress,
  restoreProgress,
  getProgressStats,
  validateProgressData,
  getProgressRecommendations,
} from "../controllers/enhanced-progress.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import { body, query, param } from "express-validator";

const router = express.Router();

// Validation schemas
const createProgressValidation = [
  body("userId").isMongoId().withMessage("Valid user ID is required"),
  body("courseId").isMongoId().withMessage("Valid course ID is required"),
  body("contentType").isIn([
    "lesson",
    "quiz",
    "assignment",
    "project",
    "exam",
    "module",
    "course",
  ]),
  body("contentId").isMongoId().withMessage("Valid content ID is required"),
  body("progressPercentage").isFloat({ min: 0, max: 100 }),
];

const updateProgressValidation = [
  param("progressId").isMongoId().withMessage("Valid progress ID is required"),
  body("progressPercentage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Progress percentage must be between 0 and 100"),
  body("status")
    .optional()
    .isIn(["not_started", "in_progress", "completed", "paused", "failed"])
    .withMessage("Invalid status"),
  body("timeSpent")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Time spent must be a positive integer"),
  body("score")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Score must be between 0 and 100"),
  body("notes")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
];

const bulkUpdateValidation = [
  body("updates").isArray({ min: 1 }).withMessage("Updates array is required"),
  body("updates.*.progressId")
    .isMongoId()
    .withMessage("Valid progress ID is required for each update"),
  body("updates.*.progressPercentage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Progress percentage must be between 0 and 100"),
  body("updates.*.status")
    .optional()
    .isIn(["not_started", "in_progress", "completed", "paused", "failed"])
    .withMessage("Invalid status"),
  body("updates.*.timeSpent")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Time spent must be a positive integer"),
  body("updates.*.score")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Score must be between 0 and 100"),
];

const queryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("sortBy")
    .optional()
    .isIn([
      "createdAt",
      "updatedAt",
      "progressPercentage",
      "timeSpent",
      "score",
    ])
    .withMessage("Invalid sort field"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),
  query("status")
    .optional()
    .isIn(["not_started", "in_progress", "completed", "paused", "failed"])
    .withMessage("Invalid status filter"),
  query("contentType")
    .optional()
    .isIn([
      "lesson",
      "quiz",
      "assignment",
      "project",
      "exam",
      "module",
      "course",
    ])
    .withMessage("Invalid content type"),
  query("minProgress")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Minimum progress must be between 0 and 100"),
  query("maxProgress")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Maximum progress must be between 0 and 100"),
];

// ========================================
// PUBLIC/STUDENT ROUTES
// ========================================

/**
 * @route   POST /api/enhanced-progress
 * @desc    Create a new progress entry
 * @access  Private (Authenticated users)
 */
router.post(
  "/",
  authenticate,
  createProgressValidation,
  validateRequest,
  createProgress,
);

/**
 * @route   GET /api/enhanced-progress/user/:userId
 * @desc    Get all progress entries for a specific user
 * @access  Private (Own progress or Admin/Instructor)
 */
router.get(
  "/user/:userId",
  authenticate,
  param("userId").isMongoId().withMessage("Valid user ID is required"),
  queryValidation,
  validateRequest,
  getUserProgress,
);

/**
 * @route   GET /api/enhanced-progress/my-progress
 * @desc    Get current user's progress (convenience endpoint)
 * @access  Private
 */
router.get(
  "/my-progress",
  authenticate,
  queryValidation,
  validateRequest,
  (req, res, next) => {
    req.params.userId = req.user.id;
    next();
  },
  getUserProgress,
);

/**
 * @route   GET /api/enhanced-progress/:progressId
 * @desc    Get a specific progress entry by ID
 * @access  Private (Own progress or Admin/Instructor)
 */
router.get(
  "/:progressId",
  authenticate,
  param("progressId").isMongoId().withMessage("Valid progress ID is required"),
  validateRequest,
  getProgressById,
);

/**
 * @route   PUT /api/enhanced-progress/:progressId
 * @desc    Update a specific progress entry
 * @access  Private (Own progress or Admin/Instructor)
 */
router.put(
  "/:progressId",
  authenticate,
  updateProgressValidation,
  validateRequest,
  updateProgress,
);

/**
 * @route   DELETE /api/enhanced-progress/:progressId
 * @desc    Delete a specific progress entry (soft delete)
 * @access  Private (Own progress or Admin/Instructor)
 */
router.delete(
  "/:progressId",
  authenticate,
  param("progressId").isMongoId().withMessage("Valid progress ID is required"),
  validateRequest,
  deleteProgress,
);

/**
 * @route   GET /api/enhanced-progress/summary/:userId
 * @desc    Get progress summary for a user
 * @access  Private (Own progress or Admin/Instructor)
 */
router.get(
  "/summary/:userId",
  authenticate,
  param("userId").isMongoId().withMessage("Valid user ID is required"),
  query("courseId")
    .optional()
    .isMongoId()
    .withMessage("Valid course ID required"),
  query("timeframe")
    .optional()
    .isIn(["week", "month", "quarter", "year", "all"])
    .withMessage("Invalid timeframe"),
  validateRequest,
  getProgressSummary,
);

/**
 * @route   GET /api/enhanced-progress/history/:userId
 * @desc    Get progress history for a user
 * @access  Private (Own progress or Admin/Instructor)
 */
router.get(
  "/history/:userId",
  authenticate,
  param("userId").isMongoId().withMessage("Valid user ID is required"),
  query("courseId")
    .optional()
    .isMongoId()
    .withMessage("Valid course ID required"),
  query("contentId")
    .optional()
    .isMongoId()
    .withMessage("Valid content ID required"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Valid start date required"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Valid end date required"),
  queryValidation,
  validateRequest,
  getProgressHistory,
);

/**
 * @route   POST /api/enhanced-progress/reset/:userId
 * @desc    Reset progress for a user (specific course or all)
 * @access  Private (Own progress or Admin only)
 */
router.post(
  "/reset/:userId",
  authenticate,
  param("userId").isMongoId().withMessage("Valid user ID is required"),
  body("courseId")
    .optional()
    .isMongoId()
    .withMessage("Valid course ID required"),
  body("contentType")
    .optional()
    .isIn([
      "lesson",
      "quiz",
      "assignment",
      "project",
      "exam",
      "module",
      "course",
    ])
    .withMessage("Invalid content type"),
  body("confirmReset").isBoolean().withMessage("Reset confirmation required"),
  validateRequest,
  resetProgress,
);

/**
 * @route   POST /api/enhanced-progress/sync
 * @desc    Sync progress data (for offline/online synchronization)
 * @access  Private
 */
router.post(
  "/sync",
  authenticate,
  body("progressData").isArray().withMessage("Progress data array is required"),
  body("lastSyncTimestamp")
    .optional()
    .isISO8601()
    .withMessage("Valid timestamp required"),
  validateRequest,
  syncProgress,
);

/**
 * @route   GET /api/enhanced-progress/recommendations/:userId
 * @desc    Get personalized learning recommendations based on progress
 * @access  Private (Own progress or Admin/Instructor)
 */
router.get(
  "/recommendations/:userId",
  authenticate,
  param("userId").isMongoId().withMessage("Valid user ID is required"),
  query("courseId")
    .optional()
    .isMongoId()
    .withMessage("Valid course ID required"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("Limit must be between 1 and 20"),
  validateRequest,
  getProgressRecommendations,
);

// ========================================
// ANALYTICS & REPORTING ROUTES
// ========================================

/**
 * @route   GET /api/enhanced-progress/analytics/user/:userId
 * @desc    Get detailed analytics for a user's progress
 * @access  Private (Own analytics or Admin/Instructor)
 */
router.get(
  "/analytics/user/:userId",
  authenticate,
  param("userId").isMongoId().withMessage("Valid user ID is required"),
  query("courseId")
    .optional()
    .isMongoId()
    .withMessage("Valid course ID required"),
  query("timeframe")
    .optional()
    .isIn(["week", "month", "quarter", "year", "all"])
    .withMessage("Invalid timeframe"),
  query("includeComparison")
    .optional()
    .isBoolean()
    .withMessage("Include comparison must be boolean"),
  validateRequest,
  getProgressAnalytics,
);

/**
 * @route   GET /api/enhanced-progress/insights/:userId
 * @desc    Get AI-powered insights and patterns from user's progress
 * @access  Private (Own insights or Admin/Instructor)
 */
router.get(
  "/insights/:userId",
  authenticate,
  param("userId").isMongoId().withMessage("Valid user ID is required"),
  query("courseId")
    .optional()
    .isMongoId()
    .withMessage("Valid course ID required"),
  query("analysisType")
    .optional()
    .isIn([
      "learning_patterns",
      "performance_trends",
      "engagement_analysis",
      "all",
    ])
    .withMessage("Invalid analysis type"),
  validateRequest,
  getProgressInsights,
);

/**
 * @route   GET /api/enhanced-progress/leaderboard
 * @desc    Get progress leaderboard (course or global)
 * @access  Private
 */
router.get(
  "/leaderboard",
  authenticate,
  query("courseId")
    .optional()
    .isMongoId()
    .withMessage("Valid course ID required"),
  query("timeframe")
    .optional()
    .isIn(["week", "month", "quarter", "year", "all"])
    .withMessage("Invalid timeframe"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("includeAnonymous")
    .optional()
    .isBoolean()
    .withMessage("Include anonymous must be boolean"),
  validateRequest,
  getProgressLeaderboard,
);

/**
 * @route   POST /api/enhanced-progress/export/:userId
 * @desc    Export user's progress data
 * @access  Private (Own data or Admin/Instructor)
 */
router.post(
  "/export/:userId",
  authenticate,
  param("userId").isMongoId().withMessage("Valid user ID is required"),
  body("format")
    .isIn(["json", "csv", "xlsx", "pdf"])
    .withMessage("Invalid export format"),
  body("courseId")
    .optional()
    .isMongoId()
    .withMessage("Valid course ID required"),
  body("includeMetadata")
    .optional()
    .isBoolean()
    .withMessage("Include metadata must be boolean"),
  body("dateRange")
    .optional()
    .isObject()
    .withMessage("Date range must be an object"),
  validateRequest,
  exportProgressData,
);

// ========================================
// BULK OPERATIONS ROUTES
// ========================================

/**
 * @route   POST /api/enhanced-progress/bulk/get
 * @desc    Get multiple progress entries by IDs
 * @access  Private (Admin/Instructor only)
 */
router.post(
  "/bulk/get",
  authenticate,
  authorize(["admin", "instructor"]),
  body("progressIds")
    .isArray({ min: 1 })
    .withMessage("Progress IDs array is required"),
  body("progressIds.*").isMongoId().withMessage("Valid progress IDs required"),
  body("includeMetadata")
    .optional()
    .isBoolean()
    .withMessage("Include metadata must be boolean"),
  validateRequest,
  getBulkProgress,
);

/**
 * @route   POST /api/enhanced-progress/bulk/update
 * @desc    Update multiple progress entries
 * @access  Private (Admin/Instructor only)
 */
router.post(
  "/bulk/update",
  authenticate,
  authorize(["admin", "instructor"]),
  bulkUpdateValidation,
  validateRequest,
  bulkUpdateProgress,
);

/**
 * @route   POST /api/enhanced-progress/bulk/archive
 * @desc    Archive multiple progress entries
 * @access  Private (Admin only)
 */
router.post(
  "/bulk/archive",
  authenticate,
  authorize(["admin"]),
  body("progressIds")
    .isArray({ min: 1 })
    .withMessage("Progress IDs array is required"),
  body("progressIds.*").isMongoId().withMessage("Valid progress IDs required"),
  body("reason")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters"),
  validateRequest,
  archiveProgress,
);

/**
 * @route   POST /api/enhanced-progress/bulk/restore
 * @desc    Restore multiple archived progress entries
 * @access  Private (Admin only)
 */
router.post(
  "/bulk/restore",
  authenticate,
  authorize(["admin"]),
  body("progressIds")
    .isArray({ min: 1 })
    .withMessage("Progress IDs array is required"),
  body("progressIds.*").isMongoId().withMessage("Valid progress IDs required"),
  validateRequest,
  restoreProgress,
);

// ========================================
// ADMIN ROUTES
// ========================================

/**
 * @route   GET /api/enhanced-progress/admin/stats
 * @desc    Get comprehensive progress statistics (Admin dashboard)
 * @access  Private (Admin/Instructor only)
 */
router.get(
  "/admin/stats",
  authenticate,
  authorize(["admin", "instructor"]),
  query("courseId")
    .optional()
    .isMongoId()
    .withMessage("Valid course ID required"),
  query("timeframe")
    .optional()
    .isIn(["week", "month", "quarter", "year", "all"])
    .withMessage("Invalid timeframe"),
  query("groupBy")
    .optional()
    .isIn(["day", "week", "month", "course", "user"])
    .withMessage("Invalid groupBy parameter"),
  validateRequest,
  getProgressStats,
);

/**
 * @route   POST /api/enhanced-progress/admin/validate
 * @desc    Validate and fix progress data inconsistencies
 * @access  Private (Admin only)
 */
router.post(
  "/admin/validate",
  authenticate,
  authorize(["admin"]),
  body("courseId")
    .optional()
    .isMongoId()
    .withMessage("Valid course ID required"),
  body("userId").optional().isMongoId().withMessage("Valid user ID required"),
  body("autoFix")
    .optional()
    .isBoolean()
    .withMessage("Auto fix must be boolean"),
  body("reportOnly")
    .optional()
    .isBoolean()
    .withMessage("Report only must be boolean"),
  validateRequest,
  validateProgressData,
);

// ========================================
// HEALTH CHECK ROUTE
// ========================================

/**
 * @route   GET /api/enhanced-progress/health
 * @desc    Health check for progress tracking service
 * @access  Public
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Enhanced Progress Tracking Service is operational",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    endpoints: {
      total: 22,
      public: 1,
      authenticated: 21,
      admin_only: 4,
      bulk_operations: 4,
      analytics: 3,
    },
  });
});

export default router;
