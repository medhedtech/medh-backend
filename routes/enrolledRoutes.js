import express from "express";

import * as enrollerCourseController from "../controllers/enrolled-controller.js";
import { authenticateToken, authorize } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validation.js";
import { validateEnrollment } from "../middleware/validators/enrollmentValidator.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Create enrollment
router.post(
  "/create",
  authorize(["student", "admin", "super-admin"]),
  validateEnrollment,
  enrollerCourseController.createEnrolledCourse,
);

// Get all enrollments with pagination and filters
router.get(
  "/get",
  authorize(["admin", "instructor", "super-admin"]),
  enrollerCourseController.getAllEnrolledCourses,
);

// Get enrollment by ID
router.get(
  "/get/:id",
  validateObjectId("id"),
  enrollerCourseController.getEnrolledCourseById,
);

// Get enrollment counts by student ID
router.get(
  "/getCount/:student_id",
  validateObjectId("student_id"),
  enrollerCourseController.getEnrollmentCountsByStudentId,
);

// Update enrollment
router.post(
  "/update/:id",
  authorize(["admin", "instructor", "super-admin"]),
  validateObjectId("id"),
  validateEnrollment,
  enrollerCourseController.updateEnrolledCourse,
);

// Delete enrollment
router.delete(
  "/delete/:id",
  authorize(["admin", "super-admin"]),
  validateObjectId("id"),
  enrollerCourseController.deleteEnrolledCourse,
);

// Get enrollments by student ID
router.get(
  "/student/:student_id",
  validateObjectId("student_id"),
  enrollerCourseController.getEnrolledCourseByStudentId,
);

// Get completed courses by student ID with detailed formatting
router.get(
  "/student/:student_id/completed",
  validateObjectId("student_id"),
  enrollerCourseController.getCompletedCoursesByStudentId,
);

// Get all resources from all enrolled courses for a student (excluding video lessons)
router.get(
  "/student/:student_id/resources",
  validateObjectId("student_id"),
  enrollerCourseController.getAllResourcesByStudentId,
);

// Get enrolled students by course ID
router.get(
  "/course/:course_id",
  validateObjectId("course_id"),
  enrollerCourseController.getEnrolledStudentsByCourseId,
);

// Get upcoming meetings for student
router.get(
  "/get-upcoming-meetings/:student_id",
  validateObjectId("student_id"),
  enrollerCourseController.getUpcomingMeetingsForStudent,
);

// Mark course as completed
router.post(
  "/mark-completed",
  authorize(["admin", "instructor", "super-admin"]),
  enrollerCourseController.markCourseAsCompleted,
);

// Get all students with enrolled courses
router.get(
  "/get-enrolled-students",
  authorize(["admin", "instructor", "super-admin"]),
  enrollerCourseController.getAllStudentsWithEnrolledCourses,
);

// Mark video as watche
router.get(
  "/watch",
  validateObjectId("id"),
  enrollerCourseController.watchVideo,
);

// ----- Saved Courses Routes -----

// Save a course
router.post(
  "/save-course",
  authorize(["student", "admin", "super-admin"]),
  enrollerCourseController.saveCourse,
);

// Remove a saved course
router.delete(
  "/save-course/:course_id",
  authorize(["student", "admin", "super-admin"]),
  validateObjectId("course_id"),
  enrollerCourseController.removeSavedCourse,
);

// Get all saved courses for a student
router.get(
  "/saved-courses",
  authorize(["student", "admin", "super-admin"]),
  enrollerCourseController.getSavedCourses,
);

// Convert a saved course to an enrollment
router.post(
  "/convert-saved/:course_id",
  authorize(["student", "admin", "super-admin"]),
  validateObjectId("course_id"),
  enrollerCourseController.convertSavedCourseToEnrollment,
);

export default router;
