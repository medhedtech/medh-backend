import express from "express";
import { authenticateToken as isAuthenticated } from "../middleware/auth.js";
import { getPendingAssignmentsAndQuizzes } from "../controllers/studentProgressController.js";

const router = express.Router();

/**
 * @route   GET /api/v1/student/pending-items
 * @desc    Get all pending assignments and quizzes for the authenticated student
 * @access  Private
 */
router.get("/pending-items", isAuthenticated, getPendingAssignmentsAndQuizzes);

export default router; 