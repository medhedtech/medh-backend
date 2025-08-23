import express from "express";
import {
  enrollStudentInBatch,
  recordPayment,
  updateProgress,
  recordAssessmentScore,
  getStudentEnrollments,
  getBatchStudents,
  getEnrollmentDetails,
  updateEnrollmentStatus,
  getPaymentHistory,
  getEnrollmentStats,
  checkStudentEnrollmentInCourse,
} from "../controllers/student-batch-controller.js";
import { authenticateToken, authorize } from "../middleware/auth.js";
import { validateEnrollment } from "../middleware/validators/enrollmentValidator.js";

const router = express.Router();

/**
 * Student enrollment routes
 */
// Enroll a student in a batch
router.post(
  "/students/:studentId/enroll",
  // authenticateToken,
  // authorize(["admin", "instructor"]),
  enrollStudentInBatch,
);

// Get all enrollments for a student
router.get(
  "/students/:studentId/enrollments",
  authenticateToken,
  authorize(["student", "admin", "instructor"]),
  getStudentEnrollments,
);

/**
 * Batch student management routes
 */
// Get all students in a batch
router.get(
  "/batches/:batchId/students",
  authenticateToken,
  authorize(["admin", "instructor"]),
  getBatchStudents,
);

/**
 * Enrollment management routes
 */
// Get detailed enrollment information
router.get(
  "/enrollments/:enrollmentId",
  authenticateToken,
  getEnrollmentDetails,
);

// Update enrollment status
router.put(
  "/enrollments/:enrollmentId/status",
  authenticateToken,
  authorize(["admin"]),
  updateEnrollmentStatus,
);

/**
 * Payment routes
 */
// Record a payment for an enrollment
router.post(
  "/enrollments/:enrollmentId/payments",
  authenticateToken,
  authorize(["admin"]),
  recordPayment,
);

// Get payment history for an enrollment
router.get(
  "/enrollments/:enrollmentId/payments",
  authenticateToken,
  getPaymentHistory,
);

/**
 * Progress tracking routes
 */
// Update progress for a lesson
router.put(
  "/enrollments/:enrollmentId/progress/:lessonId",
  authenticateToken,
  updateProgress,
);

// Record assessment score
router.post(
  "/enrollments/:enrollmentId/assessments/:assessmentId/scores",
  authenticateToken,
  recordAssessmentScore,
);

/**
 * Admin dashboard statistics
 */
// Get enrollment statistics
router.get(
  "/enrollments/stats",
  authenticateToken,
  authorize(["admin"]),
  getEnrollmentStats,
);

// Check if a student is enrolled in a specific course
router.get(
  "/students/:studentId/enrollments/:courseId/check",
  authenticateToken,
  checkStudentEnrollmentInCourse,
);

export default router;
