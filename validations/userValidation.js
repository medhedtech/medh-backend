const joi = require("joi");

const phoneNumberSchema = joi.object({
  country: joi.string()
    .required()
    .uppercase()
    .min(2)
    .max(3)
    .messages({
      'string.empty': 'Country code is required',
      'string.min': 'Country code must be 2-3 characters',
      'string.max': 'Country code must be 2-3 characters',
      'any.required': 'Country code is required'
    }),
  number: joi.string()
    .required()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Phone number must be in E.164 format (e.g. +12345678901)',
      'any.required': 'Phone number is required'
    }),
  type: joi.string()
    .valid('MOBILE', 'FIXED_LINE', 'FIXED_LINE_OR_MOBILE', 'TOLL_FREE', 'PREMIUM_RATE', 'SHARED_COST', 'VOIP', 'PERSONAL_NUMBER', 'PAGER', 'UAN', 'VOICEMAIL', 'UNKNOWN')
    .default('UNKNOWN')
    .optional(),
  isVerified: joi.boolean()
    .default(false)
    .optional()
});

const userValidation = joi.object({
  full_name: joi.string()
    .required()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s]*$/)
    .messages({
      'string.empty': 'Full name is required',
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name cannot exceed 100 characters',
      'string.pattern.base': 'Full name can only contain letters and spaces'
    }),
  email: joi.string()
    .email()
    .trim()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address'
    }),
  password: joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 100 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    }),
  phone_numbers: joi.array()
    .items(phoneNumberSchema)
    .min(1)
    .unique((a, b) => a.number === b.number)
    .required()
    .messages({
      'array.min': 'At least one phone number is required',
      'array.unique': 'Duplicate phone numbers are not allowed'
    }),
  agree_terms: joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the terms to proceed'
    }),
  role: joi.array()
    .items(
      joi.string().valid(
        "admin",
        "student",
        "instructor",
        "coorporate",
        "coorporate-student"
      )
    )
    .default(["student"]),
  role_description: joi.string().allow(""),
  assign_department: joi.array()
    .items(joi.string())
    .default([]),
  permissions: joi.array()
    .items(
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
    )
    .default([]),
  age: joi.string()
    .pattern(/^\d{1,3}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Age must be a valid number between 1-999'
    }),
  age_group: joi.string()
    .valid("Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+")
    .optional(),
  status: joi.string()
    .valid("Active", "Inactive")
    .default("Active"),
  facebook_link: joi.string()
    .uri()
    .optional()
    .allow("")
    .messages({
      'string.uri': 'Facebook link must be a valid URL'
    }),
  instagram_link: joi.string()
    .uri()
    .optional()
    .allow("")
    .messages({
      'string.uri': 'Instagram link must be a valid URL'
    }),
  linkedin_link: joi.string()
    .uri()
    .optional()
    .allow("")
    .messages({
      'string.uri': 'LinkedIn link must be a valid URL'
    }),
  user_image: joi.string()
    .uri()
    .optional()
    .allow("")
    .messages({
      'string.uri': 'User image must be a valid URL'
    }),
  meta: joi.object({
    course_name: joi.string().optional(),
    age: joi.string()
      .pattern(/^\d{1,3}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Age must be a valid number between 1-999'
      }),
    age_group: joi.string()
      .valid("Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+")
      .optional(),
    category: joi.string().optional(),
    gender: joi.string()
      .valid("Male", "Female", "Others")
      .default("Male"),
    upload_resume: joi.array()
      .items(joi.string().uri())
      .default([])
      .messages({
        'string.uri': 'Resume URL must be a valid URL'
      })
  }).default(() => ({
    gender: "Male",
    upload_resume: []
  })),
  admin_role: joi.string()
    .valid("super-admin", "admin", "coorporate-admin")
    .default("admin"),
  company_type: joi.string()
    .valid("Institute", "University")
    .optional(),
  company_website: joi.string()
    .uri()
    .optional()
    .allow("")
    .messages({
      'string.uri': 'Company website must be a valid URL'
    }),
  corporate_id: joi.string()
    .optional()
});

module.exports = userValidation;
