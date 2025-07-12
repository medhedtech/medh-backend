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
} from "../controllers/profileController.js";
import {
  validateUserId,
  validateProfileUpdate,
  validatePreferencesUpdate,
  validateDeleteProfile,
  validateComprehensiveProfileUpdate,
  validateComprehensiveProfileUpdateConditional,
} from "../validations/profileValidation.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

// Convenience routes (must be defined before parameterized routes)

/**
 * @route   GET /api/v1/profile/me/comprehensive
 * @desc    Get current user's comprehensive profile with all data (enrollment, analytics, etc.)
 * @access  Private
 */
router.get(
  "/me/comprehensive",
  authenticateToken,
  authorize([
    "admin",
    "instructor",
    "super-admin",
    "student",
    "corporate",
    "corporate-student",
    "parent",
  ]),
  getComprehensiveProfile,
);

/**
 * @route   PUT /api/v1/profile/me/comprehensive
 * @desc    Update current user's comprehensive profile (all fields except email)
 * @access  Private
 */
router.put(
  "/me/comprehensive",
  authenticateToken,
  authorize([
    "admin",
    "instructor",
    "super-admin",
    "student",
    "corporate",
    "corporate-student",
    "parent",
  ]),
  validateComprehensiveProfileUpdateConditional,
  updateComprehensiveProfile,
);

/**
 * @route   PATCH /api/v1/profile/me/comprehensive
 * @desc    Partially update current user's comprehensive profile (preserves existing data for empty fields)
 * @access  Private
 */
router.patch(
  "/me/comprehensive",
  authenticateToken,
  authorize([
    "admin",
    "instructor",
    "super-admin",
    "student",
    "corporate",
    "corporate-student",
    "parent",
  ]),
  validateComprehensiveProfileUpdateConditional,
  updateComprehensiveProfile,
);

/**
 * @route   GET /api/v1/profile/me
 * @desc    Get current user's profile (convenience route)
 * @access  Private
 */
router.get(
  "/me",
  authenticateToken,
  authorize([
    "admin",
    "instructor",
    "super-admin",
    "student",
    "corporate",
    "corporate-student",
    "parent",
  ]),
  (req, res, next) => {
    req.params.userId = req.user.id;
    next();
  },
  getProfile,
);

/**
 * @route   PUT /api/v1/profile/me
 * @desc    Update current user's profile (convenience route)
 * @access  Private
 */
router.put(
  "/me",
  authenticateToken,
  authorize([
    "admin",
    "instructor",
    "super-admin",
    "student",
    "corporate",
    "corporate-student",
    "parent",
  ]),
  validateProfileUpdate,
  (req, res, next) => {
    req.params.userId = req.user.id;
    next();
  },
  updateProfile,
);

/**
 * @route   GET /api/v1/profile/me/stats
 * @desc    Get current user's statistics (convenience route)
 * @access  Private
 */
router.get(
  "/me/stats",
  authenticateToken,
  authorize([
    "admin",
    "instructor",
    "super-admin",
    "student",
    "corporate",
    "corporate-student",
    "parent",
  ]),
  (req, res, next) => {
    req.params.userId = req.user.id;
    next();
  },
  getProfileStats,
);

/**
 * @route   PUT /api/v1/profile/me/preferences
 * @desc    Update current user's preferences (convenience route)
 * @access  Private
 */
router.put(
  "/me/preferences",
  authenticateToken,
  authorize([
    "admin",
    "instructor",
    "super-admin",
    "student",
    "corporate",
    "corporate-student",
    "parent",
  ]),
  validatePreferencesUpdate,
  (req, res, next) => {
    req.params.userId = req.user.id;
    next();
  },
  updatePreferences,
);

/**
 * @route   DELETE /api/v1/profile/me
 * @desc    Delete current user's profile (convenience route)
 * @access  Private
 */
router.delete(
  "/me",
  authenticateToken,
  authorize([
    "admin",
    "instructor",
    "super-admin",
    "student",
    "corporate",
    "corporate-student",
    "parent",
  ]),
  validateDeleteProfile,
  (req, res, next) => {
    req.params.userId = req.user.id;
    next();
  },
  deleteProfile,
);

/**
 * @route   GET /api/v1/profile/:userId
 * @desc    Get complete user profile
 * @access  Private (User can view own profile, admins can view any profile)
 */
router.get(
  "/:userId",
  authenticateToken,
  authorize([
    "admin",
    "instructor",
    "super-admin",
    "student",
    "corporate",
    "corporate-student",
    "parent",
  ]),
  validateUserId,
  getProfile,
);

/**
 * @route   PUT /api/v1/profile/:userId
 * @desc    Update user profile
 * @access  Private (User can update own profile, admins can update any profile)
 */
router.put(
  "/:userId",
  authenticateToken,
  authorize([
    "admin",
    "instructor",
    "super-admin",
    "student",
    "corporate",
    "corporate-student",
    "parent",
  ]),
  validateUserId,
  validateProfileUpdate,
  updateProfile,
);

/**
 * @route   DELETE /api/v1/profile/:userId
 * @desc    Delete user profile (soft delete by default, permanent delete for super-admin)
 * @access  Private (User can delete own profile, admins can delete any profile)
 */
router.delete(
  "/:userId",
  authenticateToken,
  authorize([
    "admin",
    "instructor",
    "super-admin",
    "student",
    "corporate",
    "corporate-student",
    "parent",
  ]),
  validateUserId,
  validateDeleteProfile,
  deleteProfile,
);

/**
 * @route   POST /api/v1/profile/:userId/restore
 * @desc    Restore soft-deleted profile
 * @access  Private (Admin only)
 */
router.post(
  "/:userId/restore",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  validateUserId,
  restoreProfile,
);

/**
 * @route   GET /api/v1/profile/:userId/stats
 * @desc    Get profile statistics and analytics
 * @access  Private (User can view own stats, admins can view any stats)
 */
router.get(
  "/:userId/stats",
  authenticateToken,
  authorize([
    "admin",
    "instructor",
    "super-admin",
    "student",
    "corporate",
    "corporate-student",
    "parent",
  ]),
  validateUserId,
  getProfileStats,
);

/**
 * @route   PUT /api/v1/profile/:userId/preferences
 * @desc    Update user preferences
 * @access  Private (User can update own preferences)
 */
router.put(
  "/:userId/preferences",
  authenticateToken,
  authorize([
    "admin",
    "instructor",
    "super-admin",
    "student",
    "corporate",
    "corporate-student",
    "parent",
  ]),
  validateUserId,
  validatePreferencesUpdate,
  updatePreferences,
);

export default router;
