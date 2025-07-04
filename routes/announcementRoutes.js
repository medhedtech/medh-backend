import express from "express";
import { body, param, query } from "express-validator";
import { authenticateToken, authorize } from "../middleware/auth.js";
import {
  getRecentAnnouncements,
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  markAnnouncementAsRead,
  getAnnouncementAnalytics,
  getAnnouncementTypes,
  getUnreadAnnouncementCount,
  getAvailableStudents,
  bulkUpdateAnnouncementStatus,
  processScheduledAnnouncements,
} from "../controllers/announcement-controller.js";

const router = express.Router();

// ============================================================================
// PUBLIC ROUTES - No authentication required
// ============================================================================

/**
 * @route   GET /api/v1/announcements/recent
 * @desc    Get recent announcements (public access)
 * @access  Public
 * @example GET /api/v1/announcements/recent?limit=5&type=course&targetAudience=students
 */
router.get(
  "/recent",
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("type")
      .optional()
      .isIn(["course", "system", "maintenance", "feature", "event", "general"])
      .withMessage("Invalid announcement type"),
    query("targetAudience")
      .optional()
      .isIn(["all", "students", "instructors", "admins", "corporate"])
      .withMessage("Invalid target audience"),
    query("includeExpired")
      .optional()
      .isBoolean()
      .withMessage("includeExpired must be a boolean"),
  ],
  getRecentAnnouncements
);

/**
 * @route   GET /api/v1/announcements/types
 * @desc    Get announcement types with counts
 * @access  Public
 */
router.get("/types", getAnnouncementTypes);

/**
 * @route   GET /api/v1/announcements/unread-count
 * @desc    Get unread announcement count for authenticated user
 * @access  Private (Authenticated users)
 */
router.get("/unread-count", authenticateToken, getUnreadAnnouncementCount);

/**
 * @route   GET /api/v1/announcements/students
 * @desc    Get available students for targeting
 * @access  Private (Admin/Super-Admin)
 */
router.get(
  "/students",
  [
    authenticateToken,
    authorize(["admin", "super-admin"]),
    query("search")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Search term must be between 1 and 100 characters"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
  ],
  getAvailableStudents
);

/**
 * @route   GET /api/v1/announcements/:id
 * @desc    Get single announcement by ID
 * @access  Public (but marks as read if authenticated)
 */
router.get(
  "/:id",
  [
    param("id")
      .isMongoId()
      .withMessage("Invalid announcement ID"),
  ],
  getAnnouncementById
);

// ============================================================================
// AUTHENTICATED USER ROUTES - Requires authentication
// ============================================================================

/**
 * @route   POST /api/v1/announcements/:id/read
 * @desc    Mark announcement as read
 * @access  Private (Authenticated users)
 */
router.post(
  "/:id/read",
  [
    authenticateToken,
    param("id")
      .isMongoId()
      .withMessage("Invalid announcement ID"),
  ],
  markAnnouncementAsRead
);

// ============================================================================
// ADMIN ROUTES - Requires admin authentication
// ============================================================================

/**
 * @route   GET /api/v1/announcements
 * @desc    Get all announcements with admin features (filtering, search, etc.)
 * @access  Private (Admin/Super-Admin)
 */
router.get(
  "/",
  [
    authenticateToken,
    authorize(["admin", "super-admin"]),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("status")
      .optional()
      .isIn(["draft", "published", "archived", "scheduled"])
      .withMessage("Invalid status"),
    query("type")
      .optional()
      .isIn(["course", "system", "maintenance", "feature", "event", "general"])
      .withMessage("Invalid announcement type"),
    query("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Invalid priority"),
    query("targetAudience")
      .optional()
      .isIn(["all", "students", "instructors", "admins", "corporate"])
      .withMessage("Invalid target audience"),
    query("sortBy")
      .optional()
      .isIn(["createdAt", "publishDate", "title", "type", "priority", "viewCount"])
      .withMessage("Invalid sort field"),
    query("sortOrder")
      .optional()
      .isIn(["asc", "desc"])
      .withMessage("Sort order must be asc or desc"),
  ],
  getAllAnnouncements
);

/**
 * @route   POST /api/v1/announcements
 * @desc    Create new announcement
 * @access  Private (Admin/Super-Admin)
 */
router.post(
  "/",
  [
    authenticateToken,
    authorize(["admin", "super-admin"]),
    body("title")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Title is required and must be less than 200 characters"),
    body("content")
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage("Content is required and must be less than 2000 characters"),
    body("type")
      .isIn(["course", "system", "maintenance", "feature", "event", "general"])
      .withMessage("Invalid announcement type"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Invalid priority"),
    body("status")
      .optional()
      .isIn(["draft", "published", "archived", "scheduled"])
      .withMessage("Invalid status"),
    body("targetAudience")
      .optional()
      .isArray()
      .withMessage("Target audience must be an array"),
    body("targetAudience.*")
      .optional()
      .isIn(["all", "students", "instructors", "admins", "corporate"])
      .withMessage("Invalid target audience value"),
    body("specificStudents")
      .optional()
      .isArray()
      .withMessage("Specific students must be an array"),
    body("specificStudents.*")
      .optional()
      .isMongoId()
      .withMessage("Invalid student ID"),
    body("categories")
      .optional()
      .isArray()
      .withMessage("Categories must be an array"),
    body("categories.*")
      .optional()
      .isMongoId()
      .withMessage("Invalid category ID"),
    body("courseId")
      .optional()
      .isMongoId()
      .withMessage("Invalid course ID"),
    body("scheduledPublishDate")
      .optional()
      .isISO8601()
      .withMessage("Invalid scheduled publish date"),
    body("expiryDate")
      .optional()
      .isISO8601()
      .withMessage("Invalid expiry date"),
    body("isSticky")
      .optional()
      .isBoolean()
      .withMessage("isSticky must be a boolean"),
    body("tags")
      .optional()
      .isArray()
      .withMessage("Tags must be an array"),
    body("tags.*")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Each tag must be a string with max 50 characters"),
    body("actionButton.text")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Action button text must be less than 50 characters"),
    body("actionButton.url")
      .optional()
      .isURL()
      .withMessage("Action button URL must be a valid URL"),
    body("actionButton.type")
      .optional()
      .isIn(["link", "internal", "download"])
      .withMessage("Invalid action button type"),
  ],
  createAnnouncement
);

/**
 * @route   PUT /api/v1/announcements/:id
 * @desc    Update announcement
 * @access  Private (Admin/Super-Admin or announcement author)
 */
router.put(
  "/:id",
  [
    authenticateToken,
    authorize(["admin", "super-admin"]),
    param("id")
      .isMongoId()
      .withMessage("Invalid announcement ID"),
    body("title")
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Title must be less than 200 characters"),
    body("content")
      .optional()
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage("Content must be less than 2000 characters"),
    body("type")
      .optional()
      .isIn(["course", "system", "maintenance", "feature", "event", "general"])
      .withMessage("Invalid announcement type"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Invalid priority"),
    body("status")
      .optional()
      .isIn(["draft", "published", "archived", "scheduled"])
      .withMessage("Invalid status"),
    body("targetAudience")
      .optional()
      .isArray()
      .withMessage("Target audience must be an array"),
    body("targetAudience.*")
      .optional()
      .isIn(["all", "students", "instructors", "admins", "corporate"])
      .withMessage("Invalid target audience value"),
    body("specificStudents")
      .optional()
      .isArray()
      .withMessage("Specific students must be an array"),
    body("specificStudents.*")
      .optional()
      .isMongoId()
      .withMessage("Invalid student ID"),
    body("categories")
      .optional()
      .isArray()
      .withMessage("Categories must be an array"),
    body("categories.*")
      .optional()
      .isMongoId()
      .withMessage("Invalid category ID"),
    body("courseId")
      .optional()
      .isMongoId()
      .withMessage("Invalid course ID"),
    body("scheduledPublishDate")
      .optional()
      .isISO8601()
      .withMessage("Invalid scheduled publish date"),
    body("expiryDate")
      .optional()
      .isISO8601()
      .withMessage("Invalid expiry date"),
    body("isSticky")
      .optional()
      .isBoolean()
      .withMessage("isSticky must be a boolean"),
    body("tags")
      .optional()
      .isArray()
      .withMessage("Tags must be an array"),
    body("tags.*")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Each tag must be a string with max 50 characters"),
  ],
  updateAnnouncement
);

/**
 * @route   DELETE /api/v1/announcements/:id
 * @desc    Delete announcement
 * @access  Private (Admin/Super-Admin or announcement author)
 */
router.delete(
  "/:id",
  [
    authenticateToken,
    authorize(["admin", "super-admin"]),
    param("id")
      .isMongoId()
      .withMessage("Invalid announcement ID"),
  ],
  deleteAnnouncement
);

/**
 * @route   GET /api/v1/announcements/analytics
 * @desc    Get announcement analytics
 * @access  Private (Admin/Super-Admin)
 */
router.get(
  "/analytics",
  [
    authenticateToken,
    authorize(["admin", "super-admin"]),
    query("days")
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage("Days must be between 1 and 365"),
  ],
  getAnnouncementAnalytics
);

/**
 * @route   PUT /api/v1/announcements/bulk-status
 * @desc    Bulk update announcement status
 * @access  Private (Admin/Super-Admin)
 */
router.put(
  "/bulk-status",
  [
    authenticateToken,
    authorize(["admin", "super-admin"]),
    body("announcementIds")
      .isArray({ min: 1 })
      .withMessage("Announcement IDs must be a non-empty array"),
    body("announcementIds.*")
      .isMongoId()
      .withMessage("Invalid announcement ID"),
    body("status")
      .isIn(["draft", "published", "archived", "scheduled"])
      .withMessage("Invalid status"),
  ],
  bulkUpdateAnnouncementStatus
);

/**
 * @route   POST /api/v1/announcements/process-scheduled
 * @desc    Process scheduled announcements (for cron jobs)
 * @access  Private (System/Admin)
 */
router.post(
  "/process-scheduled",
  [
    authenticateToken,
    authorize(["admin", "super-admin"]),
  ],
  processScheduledAnnouncements
);

// ============================================================================
// ROUTE DOCUMENTATION
// ============================================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     Announcement:
 *       type: object
 *       required:
 *         - title
 *         - content
 *         - type
 *         - author
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 200
 *           description: Announcement title
 *         content:
 *           type: string
 *           maxLength: 2000
 *           description: Announcement content
 *         type:
 *           type: string
 *           enum: [course, system, maintenance, feature, event, general]
 *           description: Type of announcement
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           default: medium
 *           description: Priority level
 *         status:
 *           type: string
 *           enum: [draft, published, archived, scheduled]
 *           default: draft
 *           description: Publication status
 *         targetAudience:
 *           type: array
 *           items:
 *             type: string
 *             enum: [all, students, instructors, admins, corporate]
 *           default: [all]
 *           description: Target audience
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *             format: objectId
 *           description: Associated categories
 *         courseId:
 *           type: string
 *           format: objectId
 *           description: Associated course (required for course type)
 *         author:
 *           type: string
 *           format: objectId
 *           description: Author of the announcement
 *         publishDate:
 *           type: string
 *           format: date-time
 *           description: Publication date
 *         scheduledPublishDate:
 *           type: string
 *           format: date-time
 *           description: Scheduled publication date
 *         expiryDate:
 *           type: string
 *           format: date-time
 *           description: Expiry date
 *         isSticky:
 *           type: boolean
 *           default: false
 *           description: Whether announcement is sticky (appears at top)
 *         viewCount:
 *           type: integer
 *           default: 0
 *           description: Number of views
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Tags for categorization
 *         actionButton:
 *           type: object
 *           properties:
 *             text:
 *               type: string
 *               maxLength: 50
 *             url:
 *               type: string
 *               format: uri
 *             type:
 *               type: string
 *               enum: [link, internal, download]
 *           description: Optional action button
 *         metadata:
 *           type: object
 *           properties:
 *             featured:
 *               type: boolean
 *               default: false
 *             allowComments:
 *               type: boolean
 *               default: false
 *             sendNotification:
 *               type: boolean
 *               default: true
 *           description: Additional metadata
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         date:
 *           type: string
 *           description: Human-readable relative date (e.g., "2 days ago")
 *           readOnly: true
 *         isRead:
 *           type: boolean
 *           description: Whether the current user has read this announcement
 *           readOnly: true
 *         readCount:
 *           type: integer
 *           description: Total number of users who have read this announcement
 *           readOnly: true
 */

export default router; 