import express from "express";

import * as recordedSessionController from "../controllers/recorded-session-controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Routes for Students to access recorded sessions
router.get(
  "/students/:student_id/get",
  authenticateToken,
  recordedSessionController.getRecordedSessionsByStudent,
);
router.get(
  "/students/:student_id/get/:session_id",
  authenticateToken,
  recordedSessionController.getRecordedSessionById,
);

// Route to get recorded session with signed URL
router.get(
  "/:id/signed",
  authenticateToken,
  recordedSessionController.getRecordedSessionWithSignedUrl,
);

// Routes for Instructor/Admin to manage recorded sessions
router.post("/create", recordedSessionController.createRecordedSession);

// Route to create recorded session with automatic CloudFront URL signing
router.post(
  "/create-with-signing",
  authenticateToken,
  recordedSessionController.createRecordedSessionWithSigning,
);

// Route to upload recorded session via base64
router.post(
  "/upload",
  authenticateToken,
  recordedSessionController.uploadRecordedSession,
);

router.post(
  "/update/:session_id",
  authenticateToken,
  recordedSessionController.updateRecordedSession,
);
router.delete(
  "/delete/:session_id",
  authenticateToken,
  recordedSessionController.deleteRecordedSession,
);

export default router;
