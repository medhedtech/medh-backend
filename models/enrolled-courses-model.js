const mongoose = require("mongoose");

const enrolledCourseSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    is_completed: {
      type: Boolean,
      default: false,
    },
    completed_on: { type: Date, default: null },
    expiry_date: {
      type: Date,
    },
    memership_id: {
      type: String,
    },
    is_certifiled: {
      type: Boolean,
      default: false,
    },
    is_self_paced: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const EnrolledCourse = mongoose.model("EnrolledCourse", enrolledCourseSchema);

module.exports = EnrolledCourse;
