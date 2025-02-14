const mongoose = require("mongoose");

const recordedSessionSchema = new mongoose.Schema(
  {
    instructor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      required: true,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    session_title: {
      type: String,
      required: true,
    },
    session_date: {
      type: Date,
      required: true,
    },
    session_link: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const RecordedSession = mongoose.model(
  "RecordedSession",
  recordedSessionSchema
);

module.exports = RecordedSession;
