import express from "express";
import {
  createBatch,
  assignInstructorToBatch,
  getBatchesForCourse,
  getBatchesByCategory,
  getBatchDetails,
  updateBatch,
  deleteBatch,
  getAllBatches,
  getBatchStudents,
  addStudentToBatch,
  removeStudentFromBatch,
  transferStudentToBatch,
  updateStudentStatusInBatch,
  updateBatchStatus,
  addRecordedLessonToBatch,
  getRecordedLessonsForSession,
  getRecordedLessonsForStudent,
  addScheduledSessionToBatch,
  createZoomMeetingForSession,
  getBatchesForStudent,
} from "../controllers/batch-controller.js";

import {
  getBatchAnalyticsDashboard,
  getBatchStatusDistribution,
  getInstructorWorkloadAnalytics,
  getCapacityAnalytics,
  getInstructorAnalysis,
} from "../controllers/batch-analytics-controller.js";

import {
  validateCourseId,
  validateBatchId,
  validateInstructorId,
  validateBatchCreate,
  validateBatchUpdate,
  validateStudentId,
  validateAddStudentToBatch,
  validateTransferStudent,
  validateUpdateStudentStatus,
  validateBatchStatusUpdate,
  validateRecordedLesson,
  validateScheduleSessionId,
  validateScheduledSession,
  validateZoomMeeting,
} from "../middleware/validators/batch-validator.js";
import { authenticateToken as isAuthenticated, authorize } from "../middleware/auth.js";

const router = express.Router();

// Get all batches route
router.get(
  "/",
  isAuthenticated,
  authorize(["admin", "instructor", "super-admin"]),
  getAllBatches
);

// Course related batch routes
router.post(
  "/courses/:courseId/batches",
  isAuthenticated,
  authorize(["admin"]),
  validateCourseId,
  validateBatchCreate,
  createBatch
);

router.get(
  "/courses/:courseId/batches",
  isAuthenticated,
  validateCourseId,
  getBatchesForCourse
);

// Add route to get batches by course category
router.get(
  "/courses/category/:courseCategory/batches",
  isAuthenticated,
  authorize(["admin", "instructor", "super-admin"]),
  getBatchesByCategory
);

// Batch specific routes
router.get(
  "/:batchId",
  isAuthenticated,
  validateBatchId,
  getBatchDetails
);

router.put(
  "/:batchId",
  isAuthenticated,
  authorize(["admin"]),
  validateBatchId,
  validateBatchUpdate,
  updateBatch
);

router.delete(
  "/:batchId",
  isAuthenticated,
  authorize(["admin"]),
  validateBatchId,
  deleteBatch
);

// Instructor assignment route
router.put(
  "/:batchId/assign-instructor/:instructorId",
  isAuthenticated,
  authorize(["admin"]),
  validateBatchId,
  validateInstructorId,
  assignInstructorToBatch
);

// Update batch status route
router.put(
  "/:batchId/status",
  isAuthenticated,
  authorize(["admin", "super-admin"]),
  validateBatchId,
  validateBatchStatusUpdate,
  updateBatchStatus
);

// Add route to add a recorded lesson to a batch
router.post(
  "/:batchId/schedule/:sessionId/recorded-lessons",
  isAuthenticated,
  authorize(["admin", "instructor", "super-admin"]),
  validateBatchId,
  validateScheduleSessionId,
  validateRecordedLesson,
  addRecordedLessonToBatch
);

// Add route to fetch recorded lessons for a scheduled session
router.get(
  "/:batchId/schedule/:sessionId/recorded-lessons",
  isAuthenticated,
  validateBatchId,
  validateScheduleSessionId,
  getRecordedLessonsForSession
);

// Add route to schedule a new class session
router.post(
  "/:batchId/schedule",
  isAuthenticated,
  authorize(["admin", "instructor", "super-admin"]),
  validateBatchId,
  validateScheduledSession,
  addScheduledSessionToBatch
);

// Add route to create Zoom meeting for a scheduled session
router.post(
  "/:batchId/schedule/:sessionId/zoom-meeting",
  isAuthenticated,
  authorize(["admin", "instructor", "super-admin"]),
  validateBatchId,
  validateScheduleSessionId,
  validateZoomMeeting,
  createZoomMeetingForSession
);

/* ========================================= */
/* STUDENT MANAGEMENT ROUTES                 */
/* ========================================= */

// Get all students in a batch
router.get(
  "/:batchId/students",
  isAuthenticated,
  authorize(["admin", "instructor", "super-admin"]),
  validateBatchId,
  getBatchStudents
);

// Add a student to a batch
router.post(
  "/:batchId/students",
  isAuthenticated,
  authorize(["admin", "super-admin"]),
  validateBatchId,
  validateAddStudentToBatch,
  addStudentToBatch
);

// Remove a student from a batch
router.delete(
  "/:batchId/students/:studentId",
  isAuthenticated,
  authorize(["admin", "super-admin"]),
  validateBatchId,
  validateStudentId,
  removeStudentFromBatch
);

// Transfer a student to another batch
router.post(
  "/:batchId/students/:studentId/transfer",
  isAuthenticated,
  authorize(["admin", "super-admin"]),
  validateBatchId,
  validateStudentId,
  validateTransferStudent,
  transferStudentToBatch
);

// Update student status in a batch
router.put(
  "/:batchId/students/:studentId/status",
  isAuthenticated,
  authorize(["admin", "super-admin"]),
  validateBatchId,
  validateStudentId,
  validateUpdateStudentStatus,
  updateStudentStatusInBatch
);

/* ========================================= */
/* ANALYTICS AND DASHBOARD ROUTES           */
/* ========================================= */

// Get comprehensive dashboard analytics
router.get(
  "/analytics/dashboard",
  isAuthenticated,
  authorize(["admin", "super-admin"]),
  getBatchAnalyticsDashboard
);

// Get batch status distribution
router.get(
  "/analytics/status-distribution",
  isAuthenticated,
  authorize(["admin", "super-admin"]),
  getBatchStatusDistribution
);

// Get instructor workload analytics
router.get(
  "/analytics/instructor-workload", 
  isAuthenticated,
  authorize(["admin", "super-admin"]),
  getInstructorWorkloadAnalytics
);

// Get capacity utilization analytics
router.get(
  "/analytics/capacity",
  isAuthenticated,
  authorize(["admin", "super-admin"]),
  getCapacityAnalytics
);

// Get detailed instructor analysis
router.get(
  "/analytics/instructor-analysis",
  isAuthenticated,
  authorize(["admin", "super-admin"]),
  getInstructorAnalysis
);

// Add route to get batches for a student by their ID
router.get(
  "/students/:studentId",
  isAuthenticated,
  authorize(["admin", "instructor", "super-admin", "student"]),
  validateStudentId,
  getBatchesForStudent
);

// Add route to fetch all recorded lessons for a student
router.get(
  "/students/:studentId/recorded-lessons",
  isAuthenticated,
  authorize(["admin", "instructor", "super-admin", "student"]),
  validateStudentId,
  getRecordedLessonsForStudent
);

export default router; 