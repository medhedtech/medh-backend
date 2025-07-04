import mongoose from "mongoose";

const instructorFeedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    feedback_text: { type: String, required: true },
    feedback_title: { type: String, required: true },
    feedback_for: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
  },
  { timestamps: true },
);

export default mongoose.model("InstructorFeedback", instructorFeedbackSchema);
