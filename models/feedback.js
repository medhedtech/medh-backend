import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    feedback_text: { type: String, required: true },
    feedback_title: { type: String, required: true },
    feedback_for: {
      type: String,
      enum: ["course", "instructor"],
      default: "course",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);
