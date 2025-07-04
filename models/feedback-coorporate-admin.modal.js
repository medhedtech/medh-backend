import mongoose from "mongoose";

const feedbackCoorporateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    feedback_text: { type: String, required: true },
    feedback_title: { type: String, required: true },
    feedback_for: {
      type: String,
      enum: ["course", "instructor"],
      default: "course",
    },
    role: {
      type: [String],
      enum: ["student", "instructor", "coorporate-student"],
      default: ["coorporate-student"],
    },
  },
  { timestamps: true },
);

const FeedbackCoorporate = mongoose.model(
  "FeedbackCoorporate",
  feedbackCoorporateSchema,
);
export default FeedbackCoorporate;
