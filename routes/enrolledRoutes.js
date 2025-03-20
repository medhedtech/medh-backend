const express = require("express");
const enrollerCourseController = require("../controllers/enrolled-controller");
const { validateObjectId } = require("../middleware/validation");
const { authenticate, authorize } = require("../middleware/auth");
const { validateEnrollment } = require("../middleware/validators/enrollmentValidator");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Create enrollment
router.post(
  "/create",
  authorize(["admin", "instructor"]),
  validateEnrollment,
  enrollerCourseController.createEnrolledCourse
);

// Get all enrollments with pagination and filters
router.get(
  "/get",
  authorize(["admin", "instructor"]),
  enrollerCourseController.getAllEnrolledCourses
);

// Get enrollment by ID
router.get(
  "/get/:id",
  validateObjectId("id"),
  enrollerCourseController.getEnrolledCourseById
);

// Get enrollment counts by student ID
router.get(
  "/getCount/:student_id",
  validateObjectId("student_id"),
  enrollerCourseController.getEnrollmentCountsByStudentId
);

// Update enrollment
router.post(
  "/update/:id",
  authorize(["admin", "instructor"]),
  validateObjectId("id"),
  validateEnrollment,
  enrollerCourseController.updateEnrolledCourse
);

// Delete enrollment
router.delete(
  "/delete/:id",
  authorize(["admin"]),
  validateObjectId("id"),
  enrollerCourseController.deleteEnrolledCourse
);

// Get enrollments by student ID
router.get(
  "/student/:student_id",
  validateObjectId("student_id"),
  enrollerCourseController.getEnrolledCourseByStudentId
);

// Get enrolled students by course ID
router.get(
  "/course/:course_id",
  validateObjectId("course_id"),
  enrollerCourseController.getEnrolledStudentsByCourseId
);

// Get upcoming meetings for student
router.get(
  "/get-upcoming-meetings/:student_id",
  validateObjectId("student_id"),
  enrollerCourseController.getUpcomingMeetingsForStudent
);

// Mark course as completed
router.post(
  "/mark-completed",
  authorize(["admin", "instructor"]),
  enrollerCourseController.markCourseAsCompleted
);

// Get all students with enrolled courses
router.get(
  "/get-enrolled-students",
  authorize(["admin", "instructor"]),
  enrollerCourseController.getAllStudentsWithEnrolledCourses
);

// Mark video as watched
router.get(
  "/watch",
  validateObjectId("id"),
  enrollerCourseController.watchVideo
);

module.exports = router;
