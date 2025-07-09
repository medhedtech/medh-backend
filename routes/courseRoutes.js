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
  getCoursesByCategory,
  getCoursesByCategoryName,
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
  getHomeCourses,
  toggleShowInHome,
  schedulePublish,
  getScheduledPublish,
  cancelScheduledPublish,
  getAllScheduledPublishes,
  executeScheduledPublishes,
  uploadCourseImage,
  uploadCourseImageFile,
  addVideoLessonToCourse,
  updateVideoLesson,
  deleteVideoLesson,
  getLessonSignedVideoUrl,
  getCourseBrochures,
  updateCourseBrochures,
  uploadCourseBrochure,
} from "../controllers/course-controller.js";
import { authenticateToken } from "../middleware/auth.js";
import {
  upload,
  uploadMultiple,
  handleUploadError,
} from "../middleware/upload.js";
import { validateSchedulePublish } from "../validations/courseValidation.js";

// Public Routes
router.get("/get", getAllCourses);
router.get("/search", getAllCoursesWithLimits);
router.get("/category", getCoursesByCategory);
router.get("/new", getNewCoursesWithLimits);
router.get("/prices", getAllCoursesWithPrices);
router.get("/fields", getCoursesWithFields);
router.get("/home", getHomeCourses);
router.get("/scheduled-publishes", getAllScheduledPublishes);
router.get("/titles", getCourseTitles);
router.get("/related", getAllRelatedCourses);

// Category name route - specific path to avoid conflicts
router.get("/by-category/:categoryName", getCoursesByCategoryName);

// Generic ID route - must be last among GET routes
router.get("/:id", getCourseById);
router.get("/:id/brochures", getCourseBrochures);
router.put("/:id/brochures", authenticateToken, updateCourseBrochures);
router.post(
  "/:id/brochures/upload",
  authenticateToken,
  upload.single("file"),
  uploadCourseBrochure,
);
router.get("/coorporate/:id", getCoorporateCourseById);

// Admin Routes (Protected) - Place these BEFORE student routes to avoid conflicts
router.post(
  "/create",
  authenticateToken,
  upload.single("course_image"),
  handleUploadError,
  createCourse,
);
router.put(
  "/:id",
  authenticateToken,
  upload.single("course_image"),
  handleUploadError,
  updateCourse,
);
router.delete("/:id", authenticateToken, deleteCourse);
router.post("/delete/:id", authenticateToken, deleteCourse); // Alternative POST endpoint for deletion
router.patch("/:id/toggle-status", authenticateToken, toggleCourseStatus);
router.post("/:id/recorded-videos", authenticateToken, updateRecordedVideos);
router.get(
  "/recorded-videos/:studentId",
  authenticateToken,
  getRecordedVideosForUser,
);
router.get("/:id/prices", authenticateToken, getCoursePrices);
router.put("/:id/prices", authenticateToken, updateCoursePrices);
router.post("/prices/bulk-update", authenticateToken, bulkUpdateCoursePrices);
router.patch("/:id/toggle-home", authenticateToken, toggleShowInHome);

// Schedule Publishing Routes (Admin Protected)
router.post(
  "/:id/schedule-publish",
  authenticateToken,
  validateSchedulePublish,
  schedulePublish,
);
router.get("/:id/schedule-publish", authenticateToken, getScheduledPublish);
router.delete(
  "/:id/schedule-publish",
  authenticateToken,
  cancelScheduledPublish,
);
router.post(
  "/execute-scheduled-publishes",
  authenticateToken,
  executeScheduledPublishes,
);

// File Upload Routes (Protected)
router.post(
  "/upload",
  authenticateToken,
  upload.single("file"),
  handleUploadError,
  handleUpload,
);
router.post(
  "/upload-multiple",
  authenticateToken,
  uploadMultiple.array("files", 10),
  handleUploadError,
  handleMultipleUpload,
);

// Course Image Upload Routes (Protected) - Course-specific uploads
router.post("/:id/upload-image", authenticateToken, uploadCourseImage);
router.post(
  "/:id/upload-image-file",
  authenticateToken,
  upload.single("image"),
  handleUploadError,
  uploadCourseImageFile,
);

// Legacy Course Image Upload Routes (Protected) - Keep for backward compatibility
router.post("/upload-image", authenticateToken, uploadCourseImage);
router.post(
  "/upload-image-file",
  authenticateToken,
  upload.single("image"),
  handleUploadError,
  uploadCourseImageFile,
);

// Video Lesson Management Routes (Admin Protected)
router.post(
  "/:courseId/video-lessons",
  authenticateToken,
  addVideoLessonToCourse,
);
router.put(
  "/:courseId/video-lessons/:lessonId",
  authenticateToken,
  updateVideoLesson,
);
router.delete(
  "/:courseId/video-lessons/:lessonId",
  authenticateToken,
  deleteVideoLesson,
);

// Student Routes (Protected)
router.get("/:courseId/sections", authenticateToken, getCourseSections);
router.get("/:courseId/lessons", authenticateToken, getCourseLessons);
router.get("/:courseId/lessons/:lessonId", authenticateToken, getLessonDetails);
router.get("/:courseId/progress", authenticateToken, getCourseProgress);
router.post(
  "/:courseId/lessons/:lessonId/complete",
  authenticateToken,
  markLessonComplete,
);
router.get("/:courseId/assignments", authenticateToken, getCourseAssignments);
router.post(
  "/:courseId/assignments/:assignmentId/submit",
  authenticateToken,
  submitAssignment,
);
router.get("/:courseId/quizzes", authenticateToken, getCourseQuizzes);
router.post("/:courseId/quizzes/:quizId/submit", authenticateToken, submitQuiz);
router.get(
  "/:courseId/quizzes/:quizId/results",
  authenticateToken,
  getQuizResults,
);
router.get(
  "/:courseId/lessons/:lessonId/resources",
  authenticateToken,
  getLessonResources,
);
router.get(
  "/:courseId/lessons/:lessonId/resources/:resourceId/download",
  authenticateToken,
  downloadResource,
);
router.get(
  "/:courseId/lessons/:lessonId/notes",
  authenticateToken,
  getLessonNotes,
);
router.post(
  "/:courseId/lessons/:lessonId/notes",
  authenticateToken,
  addLessonNote,
);
router.put(
  "/:courseId/lessons/:lessonId/notes/:noteId",
  authenticateToken,
  updateNote,
);
router.delete(
  "/:courseId/lessons/:lessonId/notes/:noteId",
  authenticateToken,
  deleteNote,
);
router.get(
  "/:courseId/lessons/:lessonId/bookmarks",
  authenticateToken,
  getLessonBookmarks,
);
router.post(
  "/:courseId/lessons/:lessonId/bookmarks",
  authenticateToken,
  addLessonBookmark,
);
router.put(
  "/:courseId/lessons/:lessonId/bookmarks/:bookmarkId",
  authenticateToken,
  updateBookmark,
);
router.delete(
  "/:courseId/lessons/:lessonId/bookmarks/:bookmarkId",
  authenticateToken,
  deleteBookmark,
);
router.post(
  "/broucher/download/:courseId",
  authenticateToken,
  downloadBrochure,
);
router.get(
  "/:courseId/lessons/:lessonId/video-signed-url",
  authenticateToken,
  getLessonSignedVideoUrl,
);

export default router;
