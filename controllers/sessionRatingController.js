import SessionRating from "../models/session-rating.model.js";
import OnlineMeeting from "../models/online-meeting.js"; // Assuming sessions are linked to OnlineMeeting or similar
import { validationResult } from "express-validator";
import mongoose from "mongoose";

/**
 * Submit a rating for a specific session.
 * @route POST /api/v1/sessions/:sessionId/rate
 * @access Authenticated User
 */
export const submitSessionRating = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { sessionId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id; // Assuming user ID is available from authentication middleware

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID format" });
    }

    // Optional: Verify if the session exists and the user is allowed to rate it
    // For recorded sessions, the sessionId might be the unique S3 video ID, not a MongoDB ObjectId.
    // If it's a scheduled session from OnlineMeeting, it would be an ObjectId.
    // We'll assume for now that sessionId is a string matching the video 'id' field.

    // Check if the user has already rated this session
    const existingRating = await SessionRating.findOne({
      session_id: sessionId,
      user_id: userId,
    });
    if (existingRating) {
      return res
        .status(409)
        .json({
          success: false,
          message: "You have already rated this session.",
        });
    }

    const newRating = new SessionRating({
      session_id: sessionId,
      user_id: userId,
      rating,
      comment,
    });

    await newRating.save();

    res
      .status(201)
      .json({
        success: true,
        message: "Session rated successfully!",
        data: newRating,
      });
  } catch (error) {
    console.error("Error submitting session rating:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Server error while submitting rating",
        error: error.message,
      });
  }
};

/**
 * Get average rating for a session
 * @route GET /api/v1/sessions/:sessionId/ratings/average
 * @access Public
 */
export const getSessionAverageRating = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await SessionRating.aggregate([
      { $match: { session_id: sessionId } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 },
        },
      },
    ]);

    const averageRating =
      result.length > 0 ? parseFloat(result[0].averageRating.toFixed(1)) : 0;
    const totalRatings = result.length > 0 ? result[0].totalRatings : 0;

    res
      .status(200)
      .json({ success: true, data: { averageRating, totalRatings } });
  } catch (error) {
    console.error("Error fetching session average rating:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Server error while fetching average rating",
        error: error.message,
      });
  }
};
