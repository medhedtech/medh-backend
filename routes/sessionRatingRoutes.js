import express from "express";
import { body } from "express-validator";
import {
  submitSessionRating,
  getSessionAverageRating,
} from "../controllers/sessionRatingController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Route to submit a rating for a session
router.post(
  "/:sessionId/rate",
  authenticateToken,
  [
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be an integer between 1 and 5"),
    body("comment")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Comment cannot exceed 500 characters"),
  ],
  submitSessionRating,
);

// Route to get the average rating for a session
router.get("/:sessionId/ratings/average", getSessionAverageRating);

export default router;
