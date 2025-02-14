const express = require("express");
const {
  getAllAssignments,
  createAssignment,
  submitAssignment,
  getCourseByAssignmentId,
  getSubmittedAssignments,
  getSubmissionStatus,
  getSubmittedAssignmentsCountByInstructor,
  getAssignmentsForEnrolledCourses,
  getAssignmentsForCoorporateEnrolledCourses,

} = require("../controllers/assigmentController");

const router = express.Router();

router.get("/", getAllAssignments);
router.get("/:assignmentId", getCourseByAssignmentId);
router.get("/submitted/get", getSubmittedAssignments);
router.get("/submition/status/:assignmentId", getSubmissionStatus);
router.get(
  "/submitted-assignments-count/:instructor_id",
  getSubmittedAssignmentsCountByInstructor
);
router.get(
  "/enrolled-assignments/:studentId",
  getAssignmentsForEnrolledCourses
);
router.get(
  "/enrolled-assignments-coorporate/:coorporateId",
  getAssignmentsForCoorporateEnrolledCourses,
)
router.post("/create", createAssignment);
router.post("/submit", submitAssignment);

module.exports = router;
