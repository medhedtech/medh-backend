const express = require("express");
const router = express.Router();
const courseController = require("../controllers/course-controller");
const { authenticateUser } = require("../middleware/auth");
const { validateCourseInput } = require("../middleware/validation-middleware");
const { upload, handleUploadError } = require("../middleware/file-upload");

// Public Routes
router.get("/get", courseController.getAllCourses);
router.get("/search", courseController.getAllCoursesWithLimits);
router.get("/new", courseController.getNewCoursesWithLimits);
router.get("/:id", courseController.getCourseById);
router.get("/corporate/:id", courseController.getCoorporateCourseById);

// Student Routes (Protected)
router.use(authenticateUser);
router.get("/:courseId/sections", courseController.getCourseSections);
router.get("/:courseId/lessons", courseController.getCourseLessons);
router.get("/:courseId/lessons/:lessonId", courseController.getLessonDetails);
router.post("/:courseId/lessons/:lessonId/complete", courseController.markLessonComplete);
router.post("/:courseId/lessons/:lessonId/notes", courseController.addLessonNote);
router.post("/:courseId/lessons/:lessonId/bookmarks", courseController.addLessonBookmark);
router.get("/:courseId/progress", courseController.getCourseProgress);
router.get("/:courseId/assignments", courseController.getCourseAssignments);
router.post("/:courseId/assignments/:assignmentId/submit", courseController.submitAssignment);
router.get("/:courseId/quizzes", courseController.getCourseQuizzes);
router.post("/:courseId/quizzes/:quizId/submit", courseController.submitQuiz);
router.get("/:courseId/quizzes/:quizId/results", courseController.getQuizResults);
router.get("/:courseId/lessons/:lessonId/resources", courseController.getLessonResources);
router.get("/:courseId/lessons/:lessonId/resources/:resourceId/download", courseController.downloadResource);
router.get("/recorded-videos/:studentId", courseController.getRecordedVideosForUser);

// Admin Routes (Protected)
router.use(authenticateUser);
router.post("/create", validateCourseInput, courseController.createCourse);
router.put("/:id", validateCourseInput, courseController.updateCourse);
router.delete("/:id", courseController.deleteCourse);
router.get("/titles", courseController.getCourseTitles);
router.patch("/:id/toggle-status", courseController.toggleCourseStatus);
router.post("/:id/recorded-videos", courseController.updateRecordedVideos);
router.get("/related-courses", courseController.getAllRelatedCourses);

// File Upload Routes (Protected)
router.post("/upload", authenticateUser, upload.single('file'), handleUploadError, courseController.handleUpload);
router.post("/upload-multiple", authenticateUser, upload.array('files', 10), handleUploadError, courseController.handleMultipleUpload);

module.exports = router;
