const mongoose = require("mongoose");

const placementSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    full_name: { type: String },
    phone_number: { type: String },
    city: { type: String },
    email: { type: String },
    completed_course: { type: String },
    course_completed_year: { type: String },
    area_of_interest: { type: String },
    message: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Placement", placementSchema);
