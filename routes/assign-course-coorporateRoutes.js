import express from "express";
import * as CoorporateAssignCourses from "../controllers/coorporate-assign-courses.js";

const router = express.Router();

router.post("/create", CoorporateAssignCourses.createCoorporateAssignCourse);
router.get("/getAll", CoorporateAssignCourses.getAllCoorporateAssignCourses);
router.get(
  "/getByEmployeeId/:id",
  CoorporateAssignCourses.getCoursesByCorporateStudentId
);
router.get("/get/:id", CoorporateAssignCourses.getCoorporateAssignCourseById);
router.get(
  "/getCount/:coorporate_id",
  CoorporateAssignCourses.getCoorporateAssignCourseByCoorporateId
);
router.get(
  "/courses/corporate-student-count/:course_id",
  CoorporateAssignCourses.getCorporateStudentCountByCourseId
);
router.get(
  "/enrolled-courses/corporate-student-count/:coorporate_id",
  CoorporateAssignCourses.getEnrollmentCountsByCoorporateStudentId
);
router.get(
  "/course/:course_id",
  CoorporateAssignCourses.getEnrolledCoorporatesByCourseId
);
router.delete(
  "/delete/:id",
  CoorporateAssignCourses.deleteCoorporateAssignCourse
);
router.get(
  "/watchVideo-coorporate",
  CoorporateAssignCourses.watchCoorporateVideo
);

export default router;
