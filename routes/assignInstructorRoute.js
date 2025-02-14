const express = require("express");
const router = express.Router();
const {
  createOrUpdateInstructorAssignment,
  getAllInstructorAssignments,
  getInstructorAssignmentById,
  updateInstructorAssignment,
  deleteInstructorAssignment,
  getAssignedCoursesByInstructorId,
} = require("../controllers/assignInstructorController");

// router.post("/assign-instructor", createInstructorAssignment);
router.post("/create", createOrUpdateInstructorAssignment);
router.get("/assigned", getAllInstructorAssignments);
router.get("/get-courses/:id", getAssignedCoursesByInstructorId)
router.get("/get/:id", getInstructorAssignmentById);
router.post("/update/:id", updateInstructorAssignment);
router.delete("/delete/:id", deleteInstructorAssignment);

module.exports = router;
