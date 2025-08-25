import express from "express";
import {
  getProfile,
  updateProfile,
  deleteProfile,
  restoreProfile,
  getProfileStats,
  updatePreferences,
  getComprehensiveProfile,
  updateComprehensiveProfile,
  getEnhancedProgressAnalytics,
  syncEnrollmentProgress,
} from "../controllers/profileController.js";
import {
  getProfileCompletion,
} from "../controllers/profileCompletionController.js";
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
import {
  authenticateToken as authenticate,
  authorize,
} from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import { getRateLimiter } from "../middleware/rateLimit.js";
import { body, query, param } from "express-validator";

const router = express.Router();

// Rate limiting for profile and progress endpoints
const profileRateLimit = getRateLimiter("API");
const progressRateLimit = getRateLimiter("API");

// Validation schemas
const userIdValidation = [
  param("userId").isMongoId().withMessage("Valid user ID is required"),
];

const progressAnalyticsValidation = [
  param("userId").isMongoId().withMessage("Valid user ID is required"),
  query("courseId")
    .optional()
    .isMongoId()
    .withMessage("Valid course ID required"),
  query("timeframe")
    .optional()
    .isIn(["week", "month", "quarter", "year", "all"])
    .withMessage("Invalid timeframe"),
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
];

// STANDARD PROFILE ROUTES (Enhanced)

/**
 * @route   GET /api/v1/profile/:userId
 * @desc    Get complete user profile
 * @access  Private (User can view own profile, admins can view any profile)
 */
router.get(
  "/:userId",
  profileRateLimit,
  authenticate,
  userIdValidation,
  validateRequest,
  getProfile,
);

/**
 * @route   PUT /api/v1/profile/:userId
 * @desc    Update user profile
 * @access  Private (User can update own profile, admins can update any profile)
 */
router.put(
  "/:userId",
  profileRateLimit,
  authenticate,
  userIdValidation,
  validateRequest,
  updateProfile,
);

/**
 * @route   DELETE /api/v1/profile/:userId
 * @desc    Delete user profile (soft delete)
 * @access  Private (User can delete own profile, admins can delete any profile)
 */
router.delete(
  "/:userId",
  authenticate,
  userIdValidation,
  validateRequest,
  deleteProfile,
);

/**
 * @route   POST /api/v1/profile/:userId/restore
 * @desc    Restore soft-deleted profile
 * @access  Private (Admin only)
 */
router.post(
  "/:userId/restore",
  authenticate,
  authorize(["admin", "super-admin"]),
  userIdValidation,
  validateRequest,
  restoreProfile,
);

/**
 * @route   GET /api/v1/profile/:userId/stats
 * @desc    Get profile statistics and analytics
 * @access  Private (User can view own stats, admins can view any stats)
 */
router.get(
  "/:userId/stats",
  profileRateLimit,
  authenticate,
  userIdValidation,
  validateRequest,
  getProfileStats,
);

/**
 * @route   PUT /api/v1/profile/:userId/preferences
 * @desc    Update user preferences
 * @access  Private (User can update own preferences)
 */
router.put(
  "/:userId/preferences",
  authenticate,
  userIdValidation,
  validateRequest,
  updatePreferences,
);

// COMPREHENSIVE PROFILE ROUTES

/**
 * @route   GET /api/v1/profile/me/comprehensive
 * @desc    Get comprehensive user profile with all related data
 * @access  Private
 */
router.get(
  "/me/comprehensive",
  profileRateLimit,
  authenticate,
  getComprehensiveProfile,
);

/**
 * @route   PUT /api/v1/profile/me/comprehensive
 * @desc    Update comprehensive user profile (excluding email)
 * @access  Private
 */
router.put(
  "/me/comprehensive",
  profileRateLimit,
  authenticate,
  updateComprehensiveProfile,
);

/**
 * @route   PATCH /api/v1/profile/me/comprehensive
 * @desc    Partially update comprehensive user profile (preserves existing data for empty fields)
 * @access  Private
 */
router.patch(
  "/me/comprehensive",
  profileRateLimit,
  authenticate,
  updateComprehensiveProfile,
);

/**
 * @route   GET /api/v1/profile/me/completion
 * @desc    Get detailed profile completion analysis with recommendations
 * @access  Private
 */
router.get(
  "/me/completion",
  profileRateLimit,
  authenticate,
  getProfileCompletion,
);

// ENHANCED PROGRESS INTEGRATION ROUTES

/**
 * @route   GET /api/v1/profile/:userId/enhanced-progress
 * @desc    Get user's enhanced progress analytics
 * @access  Private (User can view own progress, admins can view any)
 */
router.get(
  "/:userId/enhanced-progress",
  progressRateLimit,
  authenticate,
  progressAnalyticsValidation,
  validateRequest,
  getEnhancedProgressAnalytics,
);

/**
 * @route   POST /api/v1/profile/:userId/sync-progress
 * @desc    Sync enrollment progress with enhanced progress tracking
 * @access  Private (User can sync own progress, admins can sync any)
 */
router.post(
  "/:userId/sync-progress",
  authenticate,
  userIdValidation,
  validateRequest,
  syncEnrollmentProgress,
);

/**
 * @route   GET /api/v1/profile/:userId/progress-summary
 * @desc    Get enhanced progress summary for a user
 * @access  Private (User can view own summary, admins can view any)
 */
router.get(
  "/:userId/progress-summary",
  progressRateLimit,
  authenticate,
  userIdValidation,
  query("courseId")
    .optional()
    .isMongoId()
    .withMessage("Valid course ID required"),
  query("timeframe")
    .optional()
    .isIn(["week", "month", "quarter", "year", "all"])
    .withMessage("Invalid timeframe"),
  validateRequest,
  (req, res, next) => {
    // Middleware to set userId for getProgressSummary
    req.params.userId = req.params.userId;
    next();
  },
  getProgressSummary,
);

/**
 * @route   GET /api/v1/profile/:userId/progress-history
 * @desc    Get enhanced progress history for a user
 * @access  Private (User can view own history, admins can view any)
 */
router.get(
  "/:userId/progress-history",
  progressRateLimit,
  authenticate,
  userIdValidation,
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
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  validateRequest,
  getProgressHistory,
);

/**
 * @route   GET /api/v1/profile/:userId/progress-insights
 * @desc    Get AI-powered insights from user's progress
 * @access  Private (User can view own insights, admins can view any)
 */
router.get(
  "/:userId/progress-insights",
  progressRateLimit,
  authenticate,
  userIdValidation,
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
 * @route   GET /api/v1/profile/:userId/progress-recommendations
 * @desc    Get personalized learning recommendations
 * @access  Private (User can view own recommendations, admins can view any)
 */
router.get(
  "/:userId/progress-recommendations",
  progressRateLimit,
  authenticate,
  userIdValidation,
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

/**
 * @route   POST /api/v1/profile/:userId/export-progress
 * @desc    Export user's progress data
 * @access  Private (User can export own data, admins can export any)
 */
router.post(
  "/:userId/export-progress",
  authenticate,
  userIdValidation,
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

/**
 * @route   POST /api/v1/profile/:userId/reset-progress
 * @desc    Reset progress for a user (specific course or all)
 * @access  Private (User can reset own progress, admins can reset any)
 */
router.post(
  "/:userId/reset-progress",
  authenticate,
  userIdValidation,
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

// PROGRESS TRACKING ENDPOINTS (Integrated with Profile)

/**
 * @route   POST /api/v1/profile/:userId/progress
 * @desc    Create new progress entry for user
 * @access  Private
 */
router.post(
  "/:userId/progress",
  progressRateLimit,
  authenticate,
  userIdValidation,
  body("courseId").isMongoId().withMessage("Valid course ID is required"),
  body("contentType")
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
  body("contentId").isMongoId().withMessage("Valid content ID is required"),
  body("progressPercentage")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Progress percentage must be between 0 and 100"),
  validateRequest,
  (req, res, next) => {
    // Ensure userId matches the authenticated user or user has admin privileges
    if (
      req.params.userId !== req.user.id &&
      !["admin", "super-admin", "instructor"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to create progress for this user",
      });
    }
    req.body.userId = req.params.userId;
    next();
  },
  createProgress,
);

/**
 * @route   GET /api/v1/profile/:userId/progress
 * @desc    Get all progress entries for user
 * @access  Private
 */
router.get(
  "/:userId/progress",
  progressRateLimit,
  authenticate,
  userIdValidation,
  query("courseId")
    .optional()
    .isMongoId()
    .withMessage("Valid course ID required"),
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
  query("status")
    .optional()
    .isIn(["not_started", "in_progress", "completed", "paused", "failed"])
    .withMessage("Invalid status"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  validateRequest,
  getUserProgress,
);

/**
 * @route   GET /api/v1/profile/leaderboard
 * @desc    Get progress leaderboard
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

// ADMIN PROFILE ROUTES

/**
 * @route   GET /api/v1/profile/admin/progress-stats
 * @desc    Get comprehensive progress statistics for admin dashboard
 * @access  Private (Admin/Instructor only)
 */
router.get(
  "/admin/progress-stats",
  authenticate,
  authorize(["admin", "super-admin", "instructor"]),
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
 * @route   POST /api/v1/profile/admin/validate-progress
 * @desc    Validate and fix progress data inconsistencies
 * @access  Private (Admin only)
 */
router.post(
  "/admin/validate-progress",
  authenticate,
  authorize(["admin", "super-admin"]),
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

/**
 * @route   POST /api/v1/profile/admin/bulk-sync
 * @desc    Bulk sync enrollment data with enhanced progress for all users
 * @access  Private (Admin only)
 */
router.post(
  "/admin/bulk-sync",
  authenticate,
  authorize(["admin", "super-admin"]),
  body("courseId")
    .optional()
    .isMongoId()
    .withMessage("Valid course ID required"),
  body("batchSize")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Batch size must be between 1 and 1000"),
  validateRequest,
  async (req, res) => {
    try {
      const { courseId, batchSize = 100 } = req.body;

      // Get all users with enrollments
      const Enrollment = (await import("../models/enrollment-model.js"))
        .default;
      const query = courseId ? { course: courseId } : {};

      const enrollments = await Enrollment.find(query).select("student course");
      const uniqueUsers = [
        ...new Set(enrollments.map((e) => e.student.toString())),
      ];

      let processedUsers = 0;
      let errors = [];

      // Process users in batches
      for (let i = 0; i < uniqueUsers.length; i += batchSize) {
        const batch = uniqueUsers.slice(i, i + batchSize);

        const syncPromises = batch.map(async (userId) => {
          try {
            // Call the sync function for each user
            const syncResult = await syncEnrollmentProgress(
              {
                params: { userId },
                user: req.user,
              },
              null,
            );
            processedUsers++;
            return { userId, success: true };
          } catch (error) {
            errors.push({ userId, error: error.message });
            return { userId, success: false, error: error.message };
          }
        });

        await Promise.allSettled(syncPromises);
      }

      res.status(200).json({
        success: true,
        message: `Bulk sync completed. Processed ${processedUsers} users.`,
        data: {
          total_users: uniqueUsers.length,
          processed_users: processedUsers,
          error_count: errors.length,
          errors: errors.slice(0, 10), // Return first 10 errors
          batch_size: batchSize,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error during bulk sync operation",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
);

// HEALTH CHECK ROUTE

/**
 * @route   GET /api/v1/profile/health
 * @desc    Health check for profile and enhanced progress integration
 * @access  Public
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Profile and Enhanced Progress Integration Service is operational",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    features: {
      profile_management: true,
      enhanced_progress_tracking: true,
      progress_analytics: true,
      enrollment_sync: true,
      bulk_operations: true,
      admin_tools: true,
    },
    endpoints: {
      profile_routes: 8,
      progress_routes: 12,
      admin_routes: 3,
      integration_routes: 6,
    },
  });
});

export default router;
