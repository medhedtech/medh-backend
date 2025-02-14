const express = require("express");
const router = express.Router();
const courseController = require("../controllers/course-controller");

router.post("/create", courseController.createCourse);
router.get("/get", courseController.getAllCourses);
router.get("/getLimitedCourses", courseController.getAllCoursesWithLimits);
router.get("/getNewLimitedCourses", courseController.getNewCoursesWithLimits);
router.get("/get/:id", courseController.getCourseById);
router.get("/get-coorporate/:id", courseController.getCoorporateCourseById),
  router.get(
    "/recorded-videos/:studentId",
    courseController.getRecordedVideosForUser
  );
router.post("/toggle-status/:id", courseController.toggleCourseStatus);
router.get("/course-names", courseController.getCourseTitles);
router.post("/update/:id", courseController.updateCourse);
router.delete("/delete/:id", courseController.deleteCourse);
router.post("/soft-delete/:id", courseController.deleteCourse);
router.post("/recorded-videos/:id", courseController.updateRecordedVideos);
router.post("/related-courses", courseController.getAllRelatedCourses);

module.exports = router;
