const express = require("express");
const recordedSessionController = require("../controllers/recorded-session-controller");

const router = express.Router();

// Routes for Students to access recorded sessions
router.get(
  "/students/:student_id/get",
  recordedSessionController.getRecordedSessionsByStudent
);
router.get(
  "/students/:student_id/get/:session_id",
  recordedSessionController.getRecordedSessionById
);

// Routes for Instructor/Admin to manage recorded sessions
router.post("/create", recordedSessionController.createRecordedSession);
router.post(
  "/update/:session_id",
  recordedSessionController.updateRecordedSession
);
router.delete(
  "/delete/:session_id",
  recordedSessionController.deleteRecordedSession
);

module.exports = router;
