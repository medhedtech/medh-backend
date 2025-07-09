import express from "express";

import * as onlineMeetingController from "../controllers/online-meeting.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/create", onlineMeetingController.createOnlineMeeting);
router.get("/get", onlineMeetingController.getAllOnlineMeetings);
router.get("/get/:id", onlineMeetingController.getOnlineMeetingById);
router.post("/update/:id", onlineMeetingController.updateOnlineMeeting);
router.delete("/delete/:id", onlineMeetingController.deleteOnlineMeeting);
router.get(
  "/student/:student_id",
  authenticateToken,
  onlineMeetingController.getOnlineMeetingByStudentId,
);
router.get(
  "/upcoming-classes/:instructor_id",
  onlineMeetingController.getUpcomingClassesByInstructorId,
);
router.get(
  "/ongoing-classes/:instructor_id",
  onlineMeetingController.getOngoingClassesByInstructorId,
);
router.get(
  "/all-employee-meetings",
  onlineMeetingController.getAllMeetingsForCorporateStudents,
);

export default router;
