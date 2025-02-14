const mongoose = require("mongoose");

const coorporateAssignCourseSchema = new mongoose.Schema(
  {
    coorporate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    expiry_date: {
      type: Date,
    },
  },
  { timestamps: true }
);

const CoorporateAssignCourse = mongoose.model(
  "CoorporateAssignCourse",
  coorporateAssignCourseSchema
);

module.exports = CoorporateAssignCourse;
