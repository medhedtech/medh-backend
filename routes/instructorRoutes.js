import express from "express";

const router = express.Router();
import * as instructorController from "../controllers/instructor-controller.js";

router.post("/create", instructorController.createInstructor);
router.get("/get", instructorController.getAllInstructors);
router.get("/get/:id", instructorController.getInstructorById);
router.post("/update/:id", instructorController.updateInstructor);
router.post("/toggle-status/:id", instructorController.toggleInstructorStatus);
router.delete("/delete/:id", instructorController.deleteInstructor);

export default router;
