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
