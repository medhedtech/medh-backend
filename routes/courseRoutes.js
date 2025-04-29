import express from "express";

const router = express.Router();
import {
  createCourse,
  getAllCourses,
  getCourseById,
  getCoorporateCourseById,
  updateCourse,
  deleteCourse,
  getCourseTitles,
  getAllCoursesWithLimits,
  toggleCourseStatus,
  updateRecordedVideos,
  getRecordedVideosForUser,
  getAllRelatedCourses,
  getNewCoursesWithLimits,
  downloadBrochure,
  getCourseSections,
  getCourseLessons,
  getLessonDetails,
  getCourseProgress,
  markLessonComplete,
  getCourseAssignments,
  submitAssignment,
  getCourseQuizzes,
  submitQuiz,
  getQuizResults,
  getLessonResources,
  downloadResource,
  addLessonNote,
  addLessonBookmark,
  handleUpload,
  handleMultipleUpload,
  getLessonNotes,
  updateNote,
  deleteNote,
  getLessonBookmarks,
  updateBookmark,
  deleteBookmark,
  getCoursePrices,
  updateCoursePrices,
  bulkUpdateCoursePrices,
  getAllCoursesWithPrices,
  getCoursesWithFields,
} from "../controllers/course-controller.js";
import { authenticateToken } from "../middleware/auth.js";
import {
  upload,
  uploadMultiple,
  handleUploadError,
} from "../middleware/upload.js";

// Public Routes
router.get("/get", getAllCourses);
router.get("/search", getAllCoursesWithLimits);
router.get("/new", getNewCoursesWithLimits);
router.get("/prices", getAllCoursesWithPrices);
router.get("/fields", getCoursesWithFields);
router.get("/:id", getCourseById);
router.get("/coorporate/:id", getCoorporateCourseById);
router.get("/titles", getCourseTitles);
router.get("/related", getAllRelatedCourses);

// Student Routes (Protected)
router.use(authenticateToken);
router.get("/:courseId/sections", getCourseSections);
router.get("/:courseId/lessons", getCourseLessons);
router.get("/:courseId/lessons/:lessonId", getLessonDetails);
router.get("/:courseId/progress", getCourseProgress);
router.post("/:courseId/lessons/:lessonId/complete", markLessonComplete);
router.get("/:courseId/assignments", getCourseAssignments);
router.post("/:courseId/assignments/:assignmentId/submit", submitAssignment);
router.get("/:courseId/quizzes", getCourseQuizzes);
router.post("/:courseId/quizzes/:quizId/submit", submitQuiz);
router.get("/:courseId/quizzes/:quizId/results", getQuizResults);
router.get("/:courseId/lessons/:lessonId/resources", getLessonResources);
router.get(
  "/:courseId/lessons/:lessonId/resources/:resourceId/download",
  downloadResource,
);
router.get("/:courseId/lessons/:lessonId/notes", getLessonNotes);
router.post("/:courseId/lessons/:lessonId/notes", addLessonNote);
router.put("/:courseId/lessons/:lessonId/notes/:noteId", updateNote);
router.delete("/:courseId/lessons/:lessonId/notes/:noteId", deleteNote);
router.get("/:courseId/lessons/:lessonId/bookmarks", getLessonBookmarks);
router.post("/:courseId/lessons/:lessonId/bookmarks", addLessonBookmark);
router.put(
  "/:courseId/lessons/:lessonId/bookmarks/:bookmarkId",
  updateBookmark,
);
router.delete(
  "/:courseId/lessons/:lessonId/bookmarks/:bookmarkId",
  deleteBookmark,
);
router.post("/broucher/download/:courseId", downloadBrochure);

// Admin Routes (Protected)
router.post(
  "/create",
  upload.single("course_image"),
  handleUploadError,
  createCourse,
);
router.put(
  "/:id",
  upload.single("course_image"),
  handleUploadError,
  updateCourse,
);
router.delete("/:id", deleteCourse);
router.patch("/:id/toggle-status", toggleCourseStatus);
router.post("/:id/recorded-videos", updateRecordedVideos);
router.get("/recorded-videos/:studentId", getRecordedVideosForUser);
router.get("/:id/prices", getCoursePrices);
router.put("/:id/prices", updateCoursePrices);
router.post("/prices/bulk-update", bulkUpdateCoursePrices);

// File Upload Routes (Protected)
router.post("/upload", upload.single("file"), handleUploadError, handleUpload);
router.post(
  "/upload-multiple",
  uploadMultiple.array("files", 10),
  handleUploadError,
  handleMultipleUpload,
);

export default router;
