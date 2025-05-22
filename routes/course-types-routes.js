import express from "express";
import {
  createCourse,
  getCoursesByType,
  getCourseById,
  updateCourse,
  deleteCourse,
  scheduleDoubtSession,
  updateDoubtSchedule,
  updateLiveSchedule,
  addRecordedSession,
  updateAccessSettings,
} from "../controllers/course-types-controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// General course routes
router.post("/", verifyToken, isAdmin, createCourse);
router.get("/:type", getCoursesByType);
router.get("/:type/:id", getCourseById);
router.put("/:type/:id", verifyToken, isAdmin, updateCourse);
router.delete("/:type/:id", verifyToken, isAdmin, deleteCourse);

// Blended course specific routes
router.post("/blended/:id/doubt-session", verifyToken, isAdmin, scheduleDoubtSession);
router.put("/blended/:id/doubt-schedule", verifyToken, isAdmin, updateDoubtSchedule);

// Live course specific routes
router.put("/live/:id/schedule", verifyToken, isAdmin, updateLiveSchedule);
router.post("/live/:id/week/:weekId/recording", verifyToken, isAdmin, addRecordedSession);

// Free course specific routes
router.put("/free/:id/access", verifyToken, isAdmin, updateAccessSettings);

export default router; 