const mongoose = require("mongoose");

const enrollFormSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true },
    email: { type: String, required: true },
    country: { type: String },
    phone_number: { type: String },
    course_category: {
      type: String,
    },
    course_type: {
      type: String,
    },
    company_name: {
      type: String,
    },
    designation: {
      type: String,
    },
    company_website: {
      type: String,
    },
    message: { type: String },
    accept: { type: Boolean },
  },
  { timestamps: true }
);

const EnrollForm = mongoose.model("Enrollment", enrollFormSchema);
module.exports = EnrollForm;
