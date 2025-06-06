import express from "express";
import {
  createCourse,
  getCoursesByType,
  getAllLiveCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getAllCoursesUnified,
  searchAllCourses,
  collaborativeCourseFetch,
  scheduleDoubtSession,
  updateDoubtSchedule,
  updateLiveSchedule,
  addRecordedSession,
  updateAccessSettings,
  // Curriculum management methods
  getCurriculum,
  getCurriculumWeek,
  addWeekToCurriculum,
  updateWeekInCurriculum,
  deleteWeekFromCurriculum,
  addLessonToWeek,
  addVideoLessonToWeek,
  addSectionToWeek,
  addLiveClassToWeek,
  getCurriculumStats,
  reorderCurriculumWeeks,
} from "../controllers/course-types-controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// Unified course routes (includes both new and legacy courses)
router.get("/all", getAllCoursesUnified); // GET /api/v1/tcourse/all
router.get("/search", searchAllCourses); // GET /api/v1/tcourse/search
router.get("/collab", collaborativeCourseFetch); // GET /api/v1/tcourse/collab

// Live courses without pagination
router.get("/live", getAllLiveCourses); // GET /api/v1/tcourse/live

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

// Curriculum management routes (work with all course types)
router.get("/:type/:id/curriculum", getCurriculum);
router.get("/:type/:id/curriculum/weeks/:weekId", getCurriculumWeek);
router.get("/:type/:id/curriculum/stats", getCurriculumStats);
router.post("/:type/:id/curriculum/weeks", verifyToken, isAdmin, addWeekToCurriculum);
router.put("/:type/:id/curriculum/weeks/:weekId", verifyToken, isAdmin, updateWeekInCurriculum);
router.delete("/:type/:id/curriculum/weeks/:weekId", verifyToken, isAdmin, deleteWeekFromCurriculum);
router.post("/:type/:id/curriculum/weeks/:weekId/lessons", verifyToken, isAdmin, addLessonToWeek);
router.post("/:type/:id/curriculum/weeks/:weekId/video-lessons", verifyToken, isAdmin, addVideoLessonToWeek);
router.post("/:type/:id/curriculum/weeks/:weekId/sections", verifyToken, isAdmin, addSectionToWeek);
router.post("/:type/:id/curriculum/weeks/:weekId/live-classes", verifyToken, isAdmin, addLiveClassToWeek);
router.put("/:type/:id/curriculum/reorder", verifyToken, isAdmin, reorderCurriculumWeeks);

export default router; 