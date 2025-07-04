import express from "express";

import {
  getAllAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  submitAssignment,
  gradeSubmission,
  getCourseByAssignmentId,
  getSubmittedAssignments,
  getSubmissionStatus,
  getSubmittedAssignmentsCountByInstructor,
  getAssignmentsForEnrolledCourses,
  getAssignmentsForCoorporateEnrolledCourses,
  // getAssignmentStatistics - function might not be available in controller
  // deleteSubmissionFile - function not available in controller
} from "../controllers/assigmentController.js";

const router = express.Router();

// Assignment routes
router.get("/", getAllAssignments);
router.get("/:assignmentId", getAssignmentById);
router.post("/", createAssignment);
router.put("/:assignmentId", updateAssignment);

// Course related routes
router.get("/:assignmentId/course", getCourseByAssignmentId);

// Submission routes
router.post("/submit", submitAssignment);
router.post("/grade", gradeSubmission);
// router.post("/submission/delete-file", deleteSubmissionFile); // Commented out due to missing function
router.get("/submissions", getSubmittedAssignments);
router.get("/submission/:assignmentId", getSubmissionStatus);

// Analytics routes
// router.get("/stats/:assignmentId", getAssignmentStatistics); // Commented out due to missing function
router.get(
  "/instructor-stats/:instructor_id",
  getSubmittedAssignmentsCountByInstructor,
);

// Student enrollment routes
router.get("/student/:studentId", getAssignmentsForEnrolledCourses);
router.get(
  "/corporate/:coorporateId",
  getAssignmentsForCoorporateEnrolledCourses,
);

// Legacy routes (for backward compatibility)
router.post("/create", createAssignment); // Deprecated: use POST /
router.get("/submitted/get", getSubmittedAssignments); // Deprecated: use GET /submissions
router.get("/submition/status/:assignmentId", getSubmissionStatus); // Deprecated: use GET /submission/:assignmentId

export default router;
