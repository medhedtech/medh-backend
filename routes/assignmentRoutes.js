const express = require("express");
const {
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
  getAssignmentStatistics,
  deleteSubmissionFile
} = require("../controllers/assigmentController");

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
router.post("/submission/delete-file", deleteSubmissionFile);
router.get("/submissions", getSubmittedAssignments);
router.get("/submission/:assignmentId", getSubmissionStatus);

// Analytics routes
router.get("/stats/:assignmentId", getAssignmentStatistics);
router.get("/instructor-stats/:instructor_id", getSubmittedAssignmentsCountByInstructor);

// Student enrollment routes
router.get("/student/:studentId", getAssignmentsForEnrolledCourses);
router.get("/corporate/:coorporateId", getAssignmentsForCoorporateEnrolledCourses);

// Legacy routes (for backward compatibility)
router.post("/create", createAssignment); // Deprecated: use POST /
router.get("/submitted/get", getSubmittedAssignments); // Deprecated: use GET /submissions
router.get("/submition/status/:assignmentId", getSubmissionStatus); // Deprecated: use GET /submission/:assignmentId

module.exports = router;
