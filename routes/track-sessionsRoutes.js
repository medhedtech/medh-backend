const express = require("express");
const TrackInstructorController = require("../controllers/track-instructor-controller");

const router = express.Router();

router.get(
  "/get/:instructorId",
  TrackInstructorController.getInstructorCoursesAndClasses
);

module.exports = router;
