const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    full_name: { type: String },
    email: { type: String },
    phone_number: { type: String },
    password: { type: String },
    agree_terms: { type: Boolean },
    role: {
      type: [String],
      enum: [
        "admin",
        "student",
        "instructor",
        "coorporate",
        "coorporate-student",
      ],
      default: ["student"],
    },
    role_description: { type: String },
    assign_department: { type: [String] },
    permissions: {
      type: [String],
      enum: [
        "course_management",
        "student_management",
        "instructor_management",
        "corporate_management",
        "generate_certificate",
        "get_in_touch",
        "enquiry_form",
        "post_job",
        "feedback_and_complaints",
        "placement_requests",
        "blogs",
      ],
    },
    age: { type: String },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    facebook_link: {
      type: String,
    },
    instagram_link: {
      type: String,
    },
    linkedin_link: {
      type: String,
    },
    user_image: {
      type: String,
    },
    meta: {
      course_name: { type: String },
      age: { type: String },
      category: { type: String },
      gender: {
        type: String,
        enum: ["Male", "Female", "Others"],
        default: "Male",
      },
      upload_resume: {
        type: [String],
        default: [],
      },
    },
    admin_role: {
      type: String,
      enum: ["super-admin", "admin", "coorporate-admin"],
      default: "admin",
    },
    company_type: {
      type: String,
      enum: ["Institute", "University"],
    },
    country: { type: String },
    company_website: {
      type: String,
    },
    corporate_id: {
      type: String,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
