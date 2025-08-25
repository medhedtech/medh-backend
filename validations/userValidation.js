import joi from "joi";

const phoneNumberSchema = joi.object({
  country: joi.string().required().uppercase().min(2).max(3).messages({
    "string.empty": "Country code is required",
    "string.min": "Country code must be 2-3 characters",
    "string.max": "Country code must be 2-3 characters",
    "any.required": "Country code is required",
  }),
  number: joi
    .string()
    .required()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .messages({
      "string.empty": "Phone number is required",
      "string.pattern.base":
        "Phone number must be in E.164 format (e.g. +12345678901)",
      "any.required": "Phone number is required",
    }),
  type: joi
    .string()
    .valid(
      "MOBILE",
      "FIXED_LINE",
      "FIXED_LINE_OR_MOBILE",
      "TOLL_FREE",
      "PREMIUM_RATE",
      "SHARED_COST",
      "VOIP",
      "PERSONAL_NUMBER",
      "PAGER",
      "UAN",
      "VOICEMAIL",
      "UNKNOWN",
    )
    .default("UNKNOWN")
    .optional(),
  isVerified: joi.boolean().default(false).optional(),
});

const userValidation = joi.object({
  full_name: joi
    .string()
    .required()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s]*$/)
    .messages({
      "string.empty": "Full name is required",
      "string.min": "Full name must be at least 2 characters",
      "string.max": "Full name cannot exceed 100 characters",
      "string.pattern.base": "Full name can only contain letters and spaces",
    }),
  email: joi.string().email().trim().lowercase().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please enter a valid email address",
  }),
  password: joi.string().min(8).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 8 characters",
  }),
  phone_numbers: joi
    .array()
    .items(phoneNumberSchema)
    .min(1)
    .unique((a, b) => a.number === b.number)
    .required()
    .messages({
      "array.min": "At least one phone number is required",
      "array.unique": "Duplicate phone numbers are not allowed",
    }),
  agree_terms: joi.boolean().valid(true).required().messages({
    "any.only": "You must accept the terms to proceed",
  }),
  role: joi
    .array()
    .items(
      joi
        .string()
        .valid(
          "admin",
          "student",
          "instructor",
          "corporate",
          "corporate-student",
          "parent",
        ),
    )
    .default(["student"]),
  role_description: joi.string().allow(""),
  assign_department: joi.array().items(joi.string()).default([]),
  permissions: joi
    .array()
    .items(
      joi
        .string()
        .valid(
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
        ),
    )
    .default([]),
  age: joi
    .string()
    .pattern(/^\d{1,3}$/)
    .optional()
    .messages({
      "string.pattern.base": "Age must be a valid number between 1-999",
    }),
  age_group: joi
    .string()
    .valid("Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+")
    .optional(),
  is_active: joi.boolean().default(true),
  facebook_link: joi.string().uri().optional().allow("").messages({
    "string.uri": "Facebook link must be a valid URL",
  }),
  instagram_link: joi.string().uri().optional().allow("").messages({
    "string.uri": "Instagram link must be a valid URL",
  }),
  linkedin_link: joi.string().uri().optional().allow("").messages({
    "string.uri": "LinkedIn link must be a valid URL",
  }),
  user_image: joi.string().uri().optional().allow("").messages({
    "string.uri": "User image must be a valid URL",
  }),
  meta: joi
    .object({
      course_name: joi.string().optional(),
      date_of_birth: joi.date().iso().optional().messages({
        "date.base": "Date of birth must be a valid date",
        "date.format": "Date of birth must be in ISO 8601 date format",
      }),
      education_level: joi.string().optional(),
      language: joi.string().optional(),
      age: joi
        .string()
        .pattern(/^\d{1,3}$/)
        .optional()
        .messages({
          "string.pattern.base": "Age must be a valid number between 1-999",
        }),
      age_group: joi
        .string()
        .valid("Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+")
        .optional(),
      category: joi.string().optional(),
      gender: joi
        .string()
        .valid("male", "female", "non-binary", "prefer-not-to-say", "other")
        .optional(),
      upload_resume: joi
        .array()
        .items(joi.string().uri())
        .default([])
        .messages({
          "string.uri": "Resume URL must be a valid URL",
        }),
    })
    .default(() => ({
      upload_resume: [],
    })),
  admin_role: joi
    .string()
    .valid("super-admin", "admin", "coorporate-admin")
    .default("admin"),
  company_type: joi.string().valid("Institute", "University").optional(),
  company_website: joi.string().uri().optional().allow("").messages({
    "string.uri": "Company website must be a valid URL",
  }),
  corporate_id: joi.string().optional(),
});

// Demo User Validation Schema (without password requirement)
const demoUserValidation = joi.object({
  full_name: joi
    .string()
    .required()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s]*$/)
    .messages({
      "string.empty": "Full name is required",
      "string.min": "Full name must be at least 2 characters",
      "string.max": "Full name cannot exceed 100 characters",
      "string.pattern.base": "Full name can only contain letters and spaces",
    }),
  email: joi.string().email().trim().lowercase().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please enter a valid email address",
  }),
  username: joi
    .string()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .optional()
    .messages({
      "string.min": "Username must be at least 3 characters",
      "string.max": "Username cannot exceed 30 characters",
      "string.pattern.base":
        "Username can only contain letters, numbers, and underscores",
    }),
  phone_numbers: joi
    .array()
    .items(phoneNumberSchema)
    .min(1)
    .unique((a, b) => a.number === b.number)
    .optional()
    .messages({
      "array.min": "At least one phone number is required",
      "array.unique": "Duplicate phone numbers are not allowed",
    }),
  referral_source: joi.string().optional().default("demo"),
  gender: joi
    .string()
    .valid("male", "female", "non-binary", "prefer-not-to-say", "other")
    .optional(),
  
  // Enhanced demo session fields
  course_category: joi
    .string()
    .required()
    .valid(
      "web_development",
      "data_science", 
      "mobile_development",
      "cloud_computing",
      "cybersecurity",
      "ai_machine_learning",
      "devops",
      "ui_ux_design",
      "digital_marketing",
      "project_management",
      "other"
    )
    .messages({
      "string.empty": "Course category is required",
      "any.only": "Please select a valid course category",
    }),
    
  grade_level: joi
    .string()
    .required()
    .valid("beginner", "intermediate", "advanced", "expert")
    .messages({
      "string.empty": "Grade level is required",
      "any.only": "Please select a valid grade level",
    }),
    
  preferred_timing: joi
    .string()
    .required()
    .valid("morning", "afternoon", "evening", "flexible")
    .messages({
      "string.empty": "Preferred timing is required",
      "any.only": "Please select a valid timing preference",
    }),
    
  preferred_timezone: joi
    .string()
    .optional()
    .default("UTC")
    .messages({
      "string.base": "Timezone must be a string",
    }),
    
  preferred_days: joi
    .array()
    .items(
      joi.string().valid(
        "monday", "tuesday", "wednesday", "thursday", 
        "friday", "saturday", "sunday"
      )
    )
    .optional()
    .default([])
    .messages({
      "array.base": "Preferred days must be an array",
      "any.only": "Please select valid days of the week",
    }),
    
  session_duration: joi
    .number()
    .integer()
    .min(30)
    .max(180)
    .optional()
    .default(60)
    .messages({
      "number.base": "Session duration must be a number",
      "number.min": "Session duration must be at least 30 minutes",
      "number.max": "Session duration cannot exceed 180 minutes",
    }),
});

// Demo Password Setup Validation
const demoPasswordValidation = joi.object({
  password: joi
    .string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 8 characters",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    }),
  confirm_password: joi
    .string()
    .valid(joi.ref("password"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "string.empty": "Password confirmation is required",
    }),
});

// Demo Login Validation (email only)
const demoLoginValidation = joi.object({
  email: joi.string().email().trim().lowercase().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please enter a valid email address",
  }),
});

export default userValidation;
export { demoUserValidation, demoPasswordValidation, demoLoginValidation };
