const mongoose = require("mongoose");

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
  { timestamps: true }
);

const Certificate = mongoose.model("Certificate", certificateSchema);

module.exports = Certificate;
