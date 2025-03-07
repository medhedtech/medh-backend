const express = require("express");
const router = express.Router();
const courseController = require("../controllers/course-controller");
const { authenticateUser, authorizeRoles } = require("../middleware/auth-middleware");
const { validateCourseInput, validateCourseId, validateObjectId } = require("../middleware/validation-middleware");
const rateLimit = require("express-rate-limit");

// Rate limiter for public course routes - 200 requests per 15 minutes
const publicRoutesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later"
  }
});

// Rate limiter for admin course management - 100 requests per 15 minutes
const adminRoutesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many admin requests from this IP, please try again later"
  }
});

// =========================================
// PUBLIC ROUTES - Course Browsing & Search
// =========================================

/**
 * @route   GET /api/courses/get
 * @desc    Get all courses without pagination
 * @access  Public
 */
router.get("/get", publicRoutesLimiter, courseController.getAllCourses);

/**
 * @route   GET /api/courses/search
 * @desc    Get all courses with filtering, pagination and search
 * @access  Public
 */
router.get("/search", publicRoutesLimiter, courseController.getAllCoursesWithLimits);

/**
 * @route   GET /api/courses/new
 * @desc    Get new courses with filtering and pagination
 * @access  Public
 */
router.get("/new", publicRoutesLimiter, courseController.getNewCoursesWithLimits);

/**
 * @route   GET /api/courses/course-names
 * @desc    Get course names for autocomplete
 * @access  Public
 */
router.get("/course-names", publicRoutesLimiter, courseController.getCourseTitles);

/**
 * @route   POST /api/courses/related-courses
 * @desc    Get courses related to specified courses
 * @access  Public
 */
router.post("/related-courses", publicRoutesLimiter, courseController.getAllRelatedCourses);

// =========================================
// PUBLIC ROUTES - Individual Course Access
// =========================================

/**
 * @route   GET /api/courses/get/:id
 * @desc    Get course by ID
 * @access  Public
 */
router.get("/get/:id", publicRoutesLimiter, validateObjectId('id'), courseController.getCourseById);

/**
 * @route   GET /api/courses/get-coorporate/:id
 * @desc    Get corporate course by ID
 * @access  Public
 */
router.get("/get-coorporate/:id", publicRoutesLimiter, validateObjectId('id'), courseController.getCoorporateCourseById);

// =========================================
// PROTECTED ROUTES - Enrolled Students
// =========================================

/**
 * @route   GET /api/courses/recorded-videos/:studentId
 * @desc    Get recorded videos for a student
 * @access  Private (Student)
 */
router.get(
  "/recorded-videos/:studentId", 
  authenticateUser, 
  validateObjectId('studentId'),
  courseController.getRecordedVideosForUser
);

// =========================================
// ADMIN ROUTES - Course Management
// =========================================

/**
 * @route   POST /api/courses/create
 * @desc    Create a new course
 * @access  Private (Admin)
 */
router.post(
  "/create", 
  authenticateUser, 
  authorizeRoles('admin', 'super-admin'), 
  adminRoutesLimiter,
  validateCourseInput,
  courseController.createCourse
);

/**
 * @route   POST /api/courses/update/:id
 * @desc    Update an existing course
 * @access  Private (Admin)
 */
router.post(
  "/update/:id", 
  authenticateUser, 
  authorizeRoles('admin', 'super-admin'), 
  adminRoutesLimiter,
  validateObjectId('id'),
  validateCourseInput,
  courseController.updateCourse
);

/**
 * @route   POST /api/courses/toggle-status/:id
 * @desc    Toggle course published/upcoming status
 * @access  Private (Admin)
 */
router.post(
  "/toggle-status/:id", 
  authenticateUser, 
  authorizeRoles('admin', 'super-admin'), 
  adminRoutesLimiter,
  validateObjectId('id'),
  courseController.toggleCourseStatus
);

/**
 * @route   POST /api/courses/recorded-videos/:id
 * @desc    Update recorded videos for a course
 * @access  Private (Admin)
 */
router.post(
  "/recorded-videos/:id", 
  authenticateUser, 
  authorizeRoles('admin', 'instructor'), 
  adminRoutesLimiter,
  validateObjectId('id'),
  courseController.updateRecordedVideos
);

/**
 * @route   DELETE /api/courses/delete/:id
 * @desc    Hard delete a course
 * @access  Private (Super Admin)
 */
router.delete(
  "/delete/:id", 
  authenticateUser, 
  authorizeRoles('super-admin'), 
  adminRoutesLimiter,
  validateObjectId('id'),
  courseController.deleteCourse
);

/**
 * @route   POST /api/courses/soft-delete/:id
 * @desc    Soft delete a course (maintains backward compatibility)
 * @access  Private (Admin)
 */
router.post(
  "/soft-delete/:id", 
  authenticateUser, 
  authorizeRoles('admin', 'super-admin'), 
  adminRoutesLimiter,
  validateObjectId('id'),
  courseController.deleteCourse
);

module.exports = router;
