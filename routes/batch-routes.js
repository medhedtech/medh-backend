import express from "express";
import {
  createBatch,
  assignInstructorToBatch,
  getBatchesForCourse,
  getBatchDetails,
  updateBatch,
  deleteBatch,
} from "../controllers/batch-controller.js";

import {
  validateCourseId,
  validateBatchId,
  validateInstructorId,
  validateBatchCreate,
  validateBatchUpdate,
} from "../middleware/validators/batch-validator.js";
import { authenticateToken as isAuthenticated, authorize } from "../middleware/auth.js";

const router = express.Router();

// Course related batch routes
router.post(
  "/courses/:courseId/batches",
  isAuthenticated,
  authorize(["admin"]),
  validateCourseId,
  validateBatchCreate,
  createBatch
);

router.get(
  "/courses/:courseId/batches",
  isAuthenticated,
  validateCourseId,
  getBatchesForCourse
);

// Batch specific routes
router.get(
  "/batches/:batchId",
  isAuthenticated,
  validateBatchId,
  getBatchDetails
);

router.put(
  "/batches/:batchId",
  isAuthenticated,
  authorize(["admin"]),
  validateBatchId,
  validateBatchUpdate,
  updateBatch
);

router.delete(
  "/batches/:batchId",
  isAuthenticated,
  authorize(["admin"]),
  validateBatchId,
  deleteBatch
);

// Instructor assignment route
router.put(
  "/batches/:batchId/assign-instructor/:instructorId",
  isAuthenticated,
  authorize(["admin"]),
  validateBatchId,
  validateInstructorId,
  assignInstructorToBatch
);

export default router; 