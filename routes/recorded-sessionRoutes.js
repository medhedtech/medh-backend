import express from "express";

import * as recordedSessionController from "../controllers/recorded-session-controller.js";

const router = express.Router();

// Routes for Students to access recorded sessions
router.get(
  "/students/:student_id/get",
  recordedSessionController.getRecordedSessionsByStudent,
);
router.get(
  "/students/:student_id/get/:session_id",
  recordedSessionController.getRecordedSessionById,
);

// Routes for Instructor/Admin to manage recorded sessions
router.post("/create", recordedSessionController.createRecordedSession);
router.post(
  "/update/:session_id",
  recordedSessionController.updateRecordedSession,
);
router.delete(
  "/delete/:session_id",
  recordedSessionController.deleteRecordedSession,
);

export default router;
