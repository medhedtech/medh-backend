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
import { authMiddleware, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// General course routes
router.post("/", authMiddleware, isAdmin, createCourse);
router.get("/:type", getCoursesByType);
router.get("/:type/:id", getCourseById);
router.put("/:type/:id", authMiddleware, isAdmin, updateCourse);
router.delete("/:type/:id", authMiddleware, isAdmin, deleteCourse);

// Blended course specific routes
router.post("/blended/:id/doubt-session", authMiddleware, isAdmin, scheduleDoubtSession);
router.put("/blended/:id/doubt-schedule", authMiddleware, isAdmin, updateDoubtSchedule);

// Live course specific routes
router.put("/live/:id/schedule", authMiddleware, isAdmin, updateLiveSchedule);
router.post("/live/:id/week/:weekId/recording", authMiddleware, isAdmin, addRecordedSession);

// Free course specific routes
router.put("/free/:id/access", authMiddleware, isAdmin, updateAccessSettings);

export default router; 