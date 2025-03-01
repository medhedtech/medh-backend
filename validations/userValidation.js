const joi = require("joi");

const userValidation = joi.object({
  full_name: joi.string().required(),
  email: joi.string().email().trim(true).required(),
  password: joi.string().min(8).trim(true).required(),
  phone_number: joi.string().required(),
  agree_terms: joi.boolean().valid(true).required(),
  role: joi.array().items(
    joi.string().valid(
      "admin",
      "student",
      "instructor",
      "coorporate",
      "coorporate-student"
    )
  ).default(["student"]),
  role_description: joi.string().allow(""),
  assign_department: joi.array().items(joi.string()).default([]),
  permissions: joi.array().items(
    joi.string().valid(
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
      "blogs"
    )
  ).default([]),
  age: joi.string().optional(),
  status: joi.string().valid("Active", "Inactive").default("Active"),
  facebook_link: joi.string().optional(),
  instagram_link: joi.string().optional(),
  linkedin_link: joi.string().optional(),
  user_image: joi.string().optional(),
  meta: joi.object({
    course_name: joi.string().optional(),
    age: joi.string().optional(),
    category: joi.string().optional(),
    gender: joi.string().valid("Male", "Female", "Others").default("Male"),
    upload_resume: joi.array().items(joi.string()).default([])
  }).optional(),
  admin_role: joi.string().valid("super-admin", "admin", "coorporate-admin").default("admin"),
  company_type: joi.string().valid("Institute", "University").optional(),
  country: joi.string().optional(),
  company_website: joi.string().optional(),
  corporate_id: joi.string().optional()
});

module.exports = userValidation;
