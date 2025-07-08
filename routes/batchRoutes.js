import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  syncZoomRecordingsForBatch,
  getZoomRecordingSyncStatus,
  retryFailedZoomRecordings,
} from "../controllers/batchController.js";
const router = express.Router();
// Zoom Recording Sync Routes
router.post(
  "/:batchId/sync-zoom-recordings",
  authenticateToken,
  syncZoomRecordingsForBatch,
);
router.get(
  "/:batchId/zoom-sync-status",
  authenticateToken,
  getZoomRecordingSyncStatus,
);
router.post(
  "/:batchId/retry-zoom-recordings",
  authenticateToken,
  retryFailedZoomRecordings,
);

export default router;
