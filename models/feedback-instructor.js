const mongoose = require("mongoose");

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
  { timestamps: true }
);

module.exports = mongoose.model(
  "InstructorFeedback",
  instructorFeedbackSchema
);
