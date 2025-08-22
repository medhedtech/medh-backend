import express from "express";
import { getProfileCompletion } from "../controllers/profileCompletionController.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

/**
 * @route   GET /api/v1/profile/completion
 * @desc    Get detailed profile completion analysis with recommendations
 * @access  Private
 */
router.get(
  "/",
  authenticateToken,
  authorize([
    "admin",
    "instructor", 
    "super-admin",
    "student",
    "corporate",
    "corporate-student",
    "parent",
  ]),
  getProfileCompletion,
);

export default router;
