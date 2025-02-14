const express = require("express");
const onlineMeetingController = require("../controllers/online-meeting");

const router = express.Router();

router.post("/create", onlineMeetingController.createOnlineMeeting);
router.get("/get", onlineMeetingController.getAllOnlineMeetings);
router.get("/get/:id", onlineMeetingController.getOnlineMeetingById);
router.post("/update/:id", onlineMeetingController.updateOnlineMeeting);
router.delete("/delete/:id", onlineMeetingController.deleteOnlineMeeting);
router.get(
  "/student/:student_id",
  onlineMeetingController.getOnlineMeetingByStudentId
);
router.get(
  "/upcoming-classes/:instructor_id",
  onlineMeetingController.getUpcomingClassesByInstructorId
);
router.get(
  "/ongoing-classes/:instructor_id",
  onlineMeetingController.getOngoingClassesByInstructorId
);
router.get(
  "/all-employee-meetings",
  onlineMeetingController.getAllMeetingsForCorporateStudents
  );

module.exports = router;
