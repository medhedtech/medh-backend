import express from "express";
import {
  createOrUpdateInstructorAssignment,
  getAllInstructorAssignments,
  getInstructorAssignmentById,
  updateInstructorAssignment,
  deleteInstructorAssignment,
  getAssignedCoursesByInstructorId,
} from "../controllers/assignInstructorController.js";

const router = express.Router();

// router.post("/assign-instructor", createInstructorAssignment);
router.post("/create", createOrUpdateInstructorAssignment);
router.get("/assigned", getAllInstructorAssignments);
router.get("/get-courses/:id", getAssignedCoursesByInstructorId)
router.get("/get/:id", getInstructorAssignmentById);
router.post("/update/:id", updateInstructorAssignment);
router.delete("/delete/:id", deleteInstructorAssignment);

export default router;
