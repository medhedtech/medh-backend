const express = require("express");
const router = express.Router();
const courseController = require("../controllers/course-controller");

// Course listing and search routes
router.get("/get", courseController.getAllCourses);
router.get("/getLimitedCourses", courseController.getAllCoursesWithLimits);
router.get("/getNewLimitedCourses", courseController.getNewCoursesWithLimits);
router.get("/course-names", courseController.getCourseTitles);
router.post("/related-courses", courseController.getAllRelatedCourses);

// Individual course routes
router.get("/get/:id", courseController.getCourseById);
router.get("/get-coorporate/:id", courseController.getCoorporateCourseById);
router.get("/recorded-videos/:studentId", courseController.getRecordedVideosForUser);

// Course management routes
router.post("/create", courseController.createCourse);
router.post("/update/:id", courseController.updateCourse);
router.post("/toggle-status/:id", courseController.toggleCourseStatus);
router.post("/recorded-videos/:id", courseController.updateRecordedVideos);
router.delete("/delete/:id", courseController.deleteCourse);
router.post("/soft-delete/:id", courseController.deleteCourse);

module.exports = router;
