const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    deadline: {
      type: Date,
    },
    instructor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignment_resources: {
      type: [String],
      default: [],
    },
    submissions: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        submissionFiles: [String],
        submittedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
