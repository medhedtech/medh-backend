import mongoose from "mongoose";

const sessionRatingSchema = new mongoose.Schema(
  {
    session_id: {
      type: String, // Storing as String, matching the 'id' field in recorded videos
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true },
);

// Ensure unique rating per user per session
sessionRatingSchema.index({ session_id: 1, user_id: 1 }, { unique: true });

const SessionRating = mongoose.model("SessionRating", sessionRatingSchema);

export default SessionRating;
