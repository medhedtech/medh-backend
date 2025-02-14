const express = require("express");
const enrollerCourseController = require("../controllers/enrolled-controller");

const router = express.Router();

router.post("/create", enrollerCourseController.createEnrolledCourse);
router.get("/get", enrollerCourseController.getAllEnrolledCourses);
router.get("/get/:id", enrollerCourseController.getEnrolledCourseById);
router.get(
  "/getCount/:student_id",
  enrollerCourseController.getEnrollmentCountsByStudentId
);
router.post("/update/:id", enrollerCourseController.updateEnrolledCourse);
router.delete("/delete/:id", enrollerCourseController.deleteEnrolledCourse);
router.get(
  "/student/:student_id",
  enrollerCourseController.getEnrolledCourseByStudentId
);
router.get(
  "/course/:course_id",
  enrollerCourseController.getEnrolledStudentsByCourseId
);
router.get(
  "/get-upcoming-meetings/:student_id",
  enrollerCourseController.getUpcomingMeetingsForStudent
);
router.post("/mark-completed", enrollerCourseController.markCourseAsCompleted);
router.get("/get-enrolled-students", enrollerCourseController.getAllStudentsWithEnrolledCourses);

router.get("/watch", enrollerCourseController.watchVideo);
module.exports = router;
