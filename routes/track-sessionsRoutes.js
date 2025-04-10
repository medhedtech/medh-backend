import express from "express";
import * as TrackInstructorController from "../controllers/track-instructor-controller.js";

const router = express.Router();

router.get(
  "/get/:instructorId",
  TrackInstructorController.getInstructorCoursesAndClasses
);

export default router;
