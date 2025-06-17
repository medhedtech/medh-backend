import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    student_name: {
      type: String,
      required: true,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    course_name: {
      type: String,
      required: true,
    },
    completion_date: {
      type: Date,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    certificateUrl: {
      type: String,
    },
  },
  { timestamps: true },
);

// Prevent model overwrite error and use different model name to avoid conflict
const LegacyCertificate = mongoose.models.LegacyCertificate || mongoose.model("LegacyCertificate", certificateSchema);

export default LegacyCertificate;
