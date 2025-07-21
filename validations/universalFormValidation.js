import Joi from "joi";
import { AppError } from "../utils/errorHandler.js"; // Corrected import path for AppError

// Common validation patterns
const patterns = {
  name: /^[a-zA-Z\s'-]+$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\d{10}$/,
  internationalPhone: /^\+[1-9]\d{1,14}$/,
  url: /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(?:\/[a-zA-Z0-9-]*)*$/,
  password:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};

// Base contact information validation
const contactInfoValidation = Joi.object({
  full_name: Joi.string()
    .pattern(patterns.name)
    .min(2)
    .max(100)
    .required()
    .messages({
      "string.pattern.base":
        "Name can only contain letters, spaces, hyphens, and apostrophes",
      "string.min": "Name must be at least 2 characters long",
      "string.max": "Name cannot exceed 100 characters",
      "any.required": "Full name is required",
    }),

  first_name: Joi.string().pattern(patterns.name).min(1).max(50).messages({
    "string.pattern.base":
      "First name can only contain letters, spaces, hyphens, and apostrophes",
  }),

  last_name: Joi.string().pattern(patterns.name).min(1).max(50).messages({
    "string.pattern.base":
      "Last name can only contain letters, spaces, hyphens, and apostrophes",
  }),

  email: Joi.string().pattern(patterns.email).lowercase().required().messages({
    "string.pattern.base": "Please enter a valid email address",
    "any.required": "Email address is required",
  }),

  phone_number: Joi.string().pattern(patterns.phone).messages({
    "string.pattern.base": "Phone number must be 10 digits",
  }),

  country: Joi.string().min(2).max(100),

  country_code: Joi.string()
    .pattern(/^\+\d{1,4}$/)
    .default("+91"),

  address: Joi.string().max(200),
  city: Joi.string().max(100),
  state: Joi.string().max(100),
  postal_code: Joi.string().max(20),
});

// Professional information validation
const professionalInfoValidation = Joi.object({
  designation: Joi.string().min(2).max(100).messages({
    "string.min": "Designation must be at least 2 characters long",
  }),

  company_name: Joi.string().min(2).max(200).messages({
    "string.min": "Company name must be at least 2 characters long",
  }),

  company_website: Joi.string().pattern(patterns.url).messages({
    "string.pattern.base": "Please enter a valid website URL",
  }),

  organization: Joi.string().max(200),
  industry: Joi.string().max(100),

  experience_level: Joi.string().valid(
    "entry",
    "junior",
    "mid",
    "senior",
    "lead",
    "executive",
  ),

  department: Joi.string().max(100),

  amount_per_session: Joi.number().positive().max(100000).messages({
    "number.positive": "Amount per session must be a positive number",
  }),

  category: Joi.string().max(100),
});

// Education information validation
const educationInfoValidation = Joi.object({
  highest_education: Joi.string().min(2).max(100),

  university: Joi.string().min(2).max(200),

  degree: Joi.string().min(2).max(100),

  field_of_study: Joi.string().min(2).max(100),

  graduation_year: Joi.string()
    .pattern(/^\d{4}$/)
    .messages({
      "string.pattern.base": "Graduation year must be a 4-digit year",
    }),

  gpa: Joi.string().max(20),

  school_institute_name: Joi.string().min(2).max(200),
});

// Personal details validation
const personalDetailsValidation = Joi.object({
  age: Joi.number().integer().min(1).max(120).messages({
    "number.min": "Age must be at least 1",
    "number.max": "Age cannot exceed 120",
  }),

  gender: Joi.string().valid("male", "female", "other", "prefer_not_to_say"),

  date_of_birth: Joi.date().max("now").messages({
    "date.max": "Date of birth cannot be in the future",
  }),

  nationality: Joi.string().max(100),

  languages_known: Joi.array().items(Joi.string().max(50)).max(20),

  marital_status: Joi.string().valid(
    "single",
    "married",
    "divorced",
    "widowed",
    "prefer_not_to_say",
  ),
});

// Work experience validation
const workExperienceValidation = Joi.object({
  title: Joi.string().min(2).max(100),
  company: Joi.string().min(2).max(200),
  location: Joi.string().max(100),
  start_date: Joi.string().max(50),
  end_date: Joi.string().max(50),
  current: Joi.boolean(),
  description: Joi.string().max(1000),
  technologies: Joi.array().items(Joi.string().max(50)).max(50),
  achievements: Joi.string().max(1000),
});

// Internship validation
const internshipValidation = Joi.object({
  title: Joi.string().min(2).max(100),
  company: Joi.string().min(2).max(200),
  location: Joi.string().max(100),
  start_date: Joi.string().max(50),
  end_date: Joi.string().max(50),
  current: Joi.boolean(),
  description: Joi.string().max(1000),
  technologies: Joi.array().items(Joi.string().max(50)).max(50),
  supervisor: Joi.string().max(100),
  stipend: Joi.string().max(50),
});

// Project validation
const projectValidation = Joi.object({
  title: Joi.string().min(2).max(100),
  description: Joi.string().max(1000),
  technologies: Joi.array().items(Joi.string().max(50)).max(50),
  github_url: Joi.string().pattern(patterns.url),
  demo_url: Joi.string().pattern(patterns.url),
  start_date: Joi.string().max(50),
  end_date: Joi.string().max(50),
  current: Joi.boolean(),
  role: Joi.string().max(100),
  highlights: Joi.string().max(1000),
  is_open_source: Joi.boolean(),
  team_size: Joi.number().integer().min(1).max(100),
});

// Achievement validation
const achievementValidation = Joi.object({
  title: Joi.string().min(2).max(200),
  description: Joi.string().max(1000),
  date: Joi.string().max(50),
  issuer: Joi.string().max(200),
  category: Joi.string().valid(
    "academic",
    "professional",
    "competition",
    "volunteer",
    "other",
  ),
  level: Joi.string().valid("local", "regional", "national", "international"),
});

// Certification validation
const certificationValidation = Joi.object({
  title: Joi.string().min(2).max(200),
  issuer: Joi.string().min(2).max(200),
  date: Joi.string().max(50),
  expiry: Joi.string().max(50),
  credential_id: Joi.string().max(100),
  url: Joi.string().pattern(patterns.url),
  score: Joi.string().max(50),
  status: Joi.string().valid("active", "expired", "pending"),
});

// Reference validation
const referenceValidation = Joi.object({
  name: Joi.string().pattern(patterns.name).min(2).max(100),
  designation: Joi.string().max(100),
  company: Joi.string().max(200),
  email: Joi.string().pattern(patterns.email).lowercase(),
  phone: Joi.string().pattern(patterns.phone),
  relationship: Joi.string().valid(
    "supervisor",
    "colleague",
    "mentor",
    "client",
    "professor",
    "other",
  ),
  years_known: Joi.number().integer().min(0).max(50),
});

// Training requirements validation
const trainingRequirementsValidation = Joi.object({
  course_category: Joi.string().max(100),
  course_type: Joi.string().max(100),
  training_topics: Joi.array().items(Joi.string().max(100)).max(50),
  preferred_format: Joi.string().valid(
    "online",
    "offline",
    "hybrid",
    "self-paced",
  ),
  number_of_participants: Joi.number().integer().min(1).max(10000),
  duration_preference: Joi.string().max(100),
  budget_range: Joi.string().max(100),
  preferred_start_date: Joi.date().min("now"),
  urgency_level: Joi.string().valid("low", "medium", "high", "urgent"),
});

// Files validation
const filesValidation = Joi.object({
  file_name: Joi.string().max(200),
  file_type: Joi.string().max(50),
  file_size: Joi.number().integer().min(0),
  file_url: Joi.string().uri(),
  uploaded_at: Joi.date().default(() => new Date()),
});

// Job preferences validation
const jobPreferencesValidation = Joi.object({
  preferred_location: Joi.array().items(Joi.string().max(100)).max(20),
  preferred_job_type: Joi.string().valid(
    "full-time",
    "part-time",
    "contract",
    "freelance",
    "internship",
  ),
  preferred_work_type: Joi.string().valid("remote", "on-site", "hybrid"),
  expected_salary: Joi.string().max(100),
  notice_period: Joi.string().max(100),
  willing_to_relocate: Joi.boolean(),
  availability_date: Joi.date().min("now"),
  job_title_interest: Joi.array().items(Joi.string().max(100)).max(20),
  industry_preference: Joi.array().items(Joi.string().max(100)).max(20),
});

// Course preferences validation
const coursePreferencesValidation = Joi.object({
  course_category: Joi.string().max(100),
  course_type: Joi.string().valid(
    "online",
    "offline",
    "hybrid",
    "self-paced",
    "live",
  ),
  learning_goals: Joi.string().max(1000),
  experience_level: Joi.string().valid("beginner", "intermediate", "advanced"),
  preferred_schedule: Joi.string().max(200),
  budget_range: Joi.string().max(100),
  preferred_start_date: Joi.date().min("now"),
});

// School information validation
const schoolInfoValidation = Joi.object({
  school_name: Joi.string().min(2).max(200).required().messages({
    "string.min": "School name must be at least 2 characters long",
    "string.max": "School name cannot exceed 200 characters",
    "any.required": "School name is required",
  }),

  school_type: Joi.string()
    .valid("CBSE", "ICSE", "IB", "State Board", "International", "Other")
    .required()
    .messages({
      "any.only":
        "School type must be one of: CBSE, ICSE, IB, State Board, International, Other",
      "any.required": "School type is required",
    }),

  city_state: Joi.string().min(2).max(100).required().messages({
    "string.min": "City/State must be at least 2 characters long",
    "string.max": "City/State cannot exceed 100 characters",
    "any.required": "City/State is required",
  }),

  student_count: Joi.string()
    .valid("1-50", "51-100", "101-300", "301-500", "501-1000", "1000+")
    .required()
    .messages({
      "any.only":
        "Student count must be one of: 1-50, 51-100, 101-300, 301-500, 501-1000, 1000+",
      "any.required": "Student count is required",
    }),

  website: Joi.string().pattern(patterns.url).allow("").messages({
    "string.pattern.base": "Please enter a valid website URL",
  }),
});

// Partnership information validation
const partnershipInfoValidation = Joi.object({
  services_of_interest: Joi.array()
    .items(
      Joi.string().valid(
        "Student learning solutions",
        "Teacher training",
        "LMS / Digital infrastructure",
        "Customized curriculum support",
        "Career guidance and assessments",
        "Parent engagement tools",
        "School management software",
        "Online course platform",
        "Assessment and evaluation tools",
        "Professional development programs",
      ),
    )
    .min(1)
    .max(10)
    .required()
    .messages({
      "array.min": "At least one service of interest must be selected",
      "array.max": "Cannot select more than 10 services",
      "any.required": "Services of interest are required",
    }),

  additional_notes: Joi.string().max(2000).allow("").messages({
    "string.max": "Additional notes cannot exceed 2000 characters",
  }),
});

// Teaching preferences validation for educators
const teachingPreferencesValidation = Joi.object({
  preferred_subjects: Joi.array()
    .items(Joi.string().max(100))
    .min(1)
    .max(20)
    .required()
    .messages({
      "array.min": "At least one preferred subject must be selected",
      "array.max": "Cannot select more than 20 preferred subjects",
      "any.required": "Preferred subjects are required",
    }),
  teaching_mode: Joi.array()
    .items(
      Joi.string().valid(
        "Online Live Sessions",
        "Recorded Content",
        "One-on-One Mentoring",
        "In-Person Workshops",
      ),
    )
    .min(1)
    .max(4)
    .required()
    .messages({
      "array.min": "At least one teaching mode must be selected",
      "array.max": "Cannot select more than 4 teaching modes",
      "any.required": "Teaching mode is required",
    }),
  availability: Joi.string()
    .valid("weekdays", "weekends", "flexible", "evenings", "mornings")
    .required()
    .messages({
      "any.only":
        "Availability must be one of: weekdays, weekends, flexible, evenings, mornings",
      "any.required": "Availability is required",
    }),
  portfolio_links: Joi.string().pattern(patterns.url).allow("").messages({
    "string.pattern.base": "Please enter a valid portfolio URL",
  }),
  demo_video_url: Joi.string().pattern(patterns.url).allow("").messages({
    "string.pattern.base": "Please enter a valid demo video URL",
  }),
  has_resume: Joi.boolean().required().messages({
    "any.required": "Resume status is required",
  }),
});

// Consent validation for educators
const educatorConsentValidation = Joi.object({
  terms_accepted: Joi.boolean().valid(true).required().messages({
    "any.only": "You must accept the terms and conditions",
    "any.required": "Terms acceptance is required",
  }),
  background_check_consent: Joi.boolean().valid(true).required().messages({
    "any.only": "You must consent to a background check",
    "any.required": "Background check consent is required",
  }),
});

// New schemas for Book-A-Free-Demo-Session
const parentDetailsValidation = Joi.object({
  name: Joi.string().pattern(patterns.name).min(2).max(100).required(),
  email: Joi.string().pattern(patterns.email).lowercase().required(),
  mobile_no: Joi.string().pattern(patterns.internationalPhone).required(),
  current_city: Joi.string().max(100).required(),
  preferred_timings_to_connect: Joi.string().max(200).optional().allow(""),
});

const studentUnder16DetailsValidation = Joi.object({
  name: Joi.string().pattern(patterns.name).min(2).max(100).required(),
  grade: Joi.string()
    .valid(
      "Grade 1-2",
      "Grade 3-4",
      "Grade 5-6",
      "Grade 7-8",
      "Grade 9-10",
      "Grade 11-12",
      "Home Study",
    )
    .required(),
  preferred_course: Joi.array().items(Joi.string()).min(1).required(),
  email: Joi.string().pattern(patterns.email).lowercase().optional().allow(""),
  school_name: Joi.string().max(200).optional().allow(""),
});

const student16AndAboveDetailsValidation = Joi.object({
  name: Joi.string().pattern(patterns.name).min(2).max(100).required(),
  email: Joi.string().pattern(patterns.email).lowercase().required(),
  mobile_no: Joi.string().pattern(patterns.internationalPhone).required(),
  current_city: Joi.string().max(100).required(),
  preferred_timings_to_connect: Joi.string().max(200).optional().allow(""),
  highest_qualification: Joi.string()
    .valid(
      "10th passed",
      "12th passed",
      "Undergraduate",
      "Graduate",
      "Post-Graduate",
    )
    .required(),
  currently_studying: Joi.boolean().required(),
  currently_working: Joi.boolean().required(),
  preferred_course: Joi.array().items(Joi.string()).min(1).required(),
  education_institute_name: Joi.string().max(200).optional().allow(""),
});

const demoSessionDetailsValidation = Joi.object({
  preferred_date: Joi.date().min("now").optional(),
  preferred_time_slot: Joi.string().max(100).optional().allow(""),
});

const termsAndPrivacyConsentValidation = Joi.object({
  terms_accepted: Joi.boolean().valid(true).required(),
  privacy_policy_accepted: Joi.boolean().valid(true).required(),
});

// Base form validation schema (common to all forms)
const baseFormValidation = Joi.object({
  form_type: Joi.string()
    .valid(
      "contact_us",
      "corporate_training_inquiry",
      "instructor_application",
      "educator_registration",
      "school_partnership_inquiry",
      "book_a_free_demo_session", // New form type
    )
    .required(),
  form_id: Joi.string().optional().allow(""),
  priority: Joi.string()
    .valid("low", "medium", "high", "urgent")
    .default("medium"),
  status: Joi.string()
    .valid(
      "submitted",
      "pending",
      "in_progress",
      "completed",
      "cancelled",
      "follow_up",
    )
    .default("submitted"),
  source: Joi.string()
    .valid(
      "website_form",
      "email",
      "phone",
      "referral",
      "social_media",
      "other",
      "campaign",
    )
    .default("website_form"),
  submission_metadata: Joi.object({
    user_agent: Joi.string().max(500),
    timestamp: Joi.date().default(() => new Date()),
    referrer: Joi.string().max(500).allow(""),
    form_version: Joi.string().max(20).default("1.0"),
    validation_passed: Joi.boolean().default(false),
  }).optional(),
  message: Joi.string().max(2000).allow(""),
  internal_notes: Joi.array().items(Joi.string()).optional(),
});

// Form-specific validation schemas
const formValidationSchemas = {
  contact_us: baseFormValidation.keys({
    contact_info: contactInfoValidation.required(),
    professional_info: professionalInfoValidation.optional(),
    education_info: educationInfoValidation.optional(),
    personal_details: personalDetailsValidation.optional(),
    work_experience: Joi.array().items(workExperienceValidation).optional(),
    internships: Joi.array().items(internshipValidation).optional(),
    projects: Joi.array().items(projectValidation).optional(),
    achievements: Joi.array().items(achievementValidation).optional(),
    certifications: Joi.array().items(certificationValidation).optional(),
    references: Joi.array().items(referenceValidation).optional(),
    training_requirements: trainingRequirementsValidation.optional(),
    files: filesValidation.optional(),
    job_preferences: jobPreferencesValidation.optional(),
    course_preferences: coursePreferencesValidation.optional(),
    school_info: schoolInfoValidation.optional(),
    partnership_info: partnershipInfoValidation.optional(),
    teaching_preferences: teachingPreferencesValidation.optional(),
    educator_consent: educatorConsentValidation.optional(),
  }),

  corporate_training_inquiry: baseFormValidation.keys({
    contact_info: contactInfoValidation.required(),
    professional_info: professionalInfoValidation.required(),
    education_info: educationInfoValidation.optional(),
    personal_details: personalDetailsValidation.optional(),
    work_experience: Joi.array().items(workExperienceValidation).optional(),
    internships: Joi.array().items(internshipValidation).optional(),
    projects: Joi.array().items(projectValidation).optional(),
    achievements: Joi.array().items(achievementValidation).optional(),
    certifications: Joi.array().items(certificationValidation).optional(),
    references: Joi.array().items(referenceValidation).optional(),
    training_requirements: trainingRequirementsValidation.required(),
    files: filesValidation.optional(),
    job_preferences: jobPreferencesValidation.optional(),
    course_preferences: coursePreferencesValidation.optional(),
    school_info: schoolInfoValidation.optional(),
    partnership_info: partnershipInfoValidation.optional(),
    teaching_preferences: teachingPreferencesValidation.optional(),
    educator_consent: educatorConsentValidation.optional(),
  }),

  instructor_application: baseFormValidation.keys({
    contact_info: contactInfoValidation.required(),
    professional_info: professionalInfoValidation.required(),
    education_info: educationInfoValidation.required(),
    personal_details: personalDetailsValidation.required(),
    work_experience: Joi.array().items(workExperienceValidation).required(),
    internships: Joi.array().items(internshipValidation).optional(),
    projects: Joi.array().items(projectValidation).required(),
    achievements: Joi.array().items(achievementValidation).required(),
    certifications: Joi.array().items(certificationValidation).required(),
    references: Joi.array().items(referenceValidation).required(),
    training_requirements: trainingRequirementsValidation.optional(),
    files: filesValidation.required(),
    job_preferences: jobPreferencesValidation.required(),
    course_preferences: coursePreferencesValidation.optional(),
    school_info: schoolInfoValidation.optional(),
    partnership_info: partnershipInfoValidation.optional(),
    teaching_preferences: teachingPreferencesValidation.required(),
    educator_consent: educatorConsentValidation.required(),
  }),

  educator_registration: baseFormValidation.keys({
    contact_info: contactInfoValidation.required(),
    professional_info: professionalInfoValidation.required(),
    education_info: educationInfoValidation.required(),
    personal_details: personalDetailsValidation.required(),
    work_experience: Joi.array().items(workExperienceValidation).required(),
    internships: Joi.array().items(internshipValidation).optional(),
    projects: Joi.array().items(projectValidation).required(),
    achievements: Joi.array().items(achievementValidation).required(),
    certifications: Joi.array().items(certificationValidation).required(),
    references: Joi.array().items(referenceValidation).required(),
    training_requirements: trainingRequirementsValidation.optional(),
    files: filesValidation.required(),
    job_preferences: jobPreferencesValidation.required(),
    course_preferences: coursePreferencesValidation.optional(),
    school_info: schoolInfoValidation.optional(),
    partnership_info: partnershipInfoValidation.optional(),
    teaching_preferences: teachingPreferencesValidation.required(),
    educator_consent: educatorConsentValidation.required(),
  }),

  school_partnership_inquiry: baseFormValidation.keys({
    contact_info: contactInfoValidation.required(),
    professional_info: professionalInfoValidation.required(),
    education_info: educationInfoValidation.optional(),
    personal_details: personalDetailsValidation.optional(),
    work_experience: Joi.array().items(workExperienceValidation).optional(),
    internships: Joi.array().items(internshipValidation).optional(),
    projects: Joi.array().items(projectValidation).optional(),
    achievements: Joi.array().items(achievementValidation).optional(),
    certifications: Joi.array().items(certificationValidation).optional(),
    references: Joi.array().items(referenceValidation).optional(),
    training_requirements: trainingRequirementsValidation.optional(),
    files: filesValidation.optional(),
    job_preferences: jobPreferencesValidation.optional(),
    course_preferences: coursePreferencesValidation.optional(),
    school_info: schoolInfoValidation.required(),
    partnership_info: partnershipInfoValidation.required(),
    teaching_preferences: teachingPreferencesValidation.optional(),
    educator_consent: educatorConsentValidation.optional(),
  }),

  book_a_free_demo_session: baseFormValidation.keys({
    is_student_under_16: Joi.boolean().required(),
    demo_session_details: demoSessionDetailsValidation.optional(),
    consent: termsAndPrivacyConsentValidation.required(),

    // Conditional schema based on is_student_under_16
    parent_details: Joi.when("is_student_under_16", {
      is: true,
      then: parentDetailsValidation.required(),
      otherwise: Joi.forbidden(),
    }),
    student_details: Joi.when("is_student_under_16", {
      is: true,
      then: studentUnder16DetailsValidation.required(),
      otherwise: student16AndAboveDetailsValidation.required(),
    }),
  }),
};

// Main validation function (handles overall form structure, if needed)
const validateUniversalForm = (formData) => {
  // This function might be used for a higher-level validation across all forms
  // or for specific internal validation logic.
  // For now, individual form schemas are handled by validateFormByType.
  // Add logic here if a universal validation is required.
  const schema = formValidationSchemas[formData.form_type];
  if (!schema) {
    throw new AppError(
      `Invalid form type for universal validation: ${formData.form_type}`,
      400,
    );
  }
  return schema.validate(formData, { abortEarly: false });
};

// Helper function to validate form by type (Express middleware)
const validateFormByType = (req, res, next) => {
  const { form_type } = req.body;
  const schema = formValidationSchemas[form_type];

  if (!schema) {
    return next(new AppError(`Invalid form type: ${form_type}`, 400));
  }

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    console.error(
      `Validation error for form type ${form_type}:`,
      error.details,
    );
    return next(new AppError(error.details[0].message, 400));
  }

  // Set validation_passed to true if no errors
  if (req.body.submission_metadata) {
    req.body.submission_metadata.validation_passed = true;
  }

  next();
};

// Middleware to validate form query parameters
const validateFormQuery = (req, res, next) => {
  const querySchema = Joi.object({
    formType: Joi.string()
      .valid(
        "contact_us",
        "corporate_training_inquiry",
        "instructor_application",
        "educator_registration",
        "school_partnership_inquiry",
        "book_a_free_demo_session", // New form type
      )
      .optional(),
    status: Joi.string()
      .valid(
        "submitted",
        "pending",
        "in_progress",
        "completed",
        "cancelled",
        "follow_up",
      )
      .optional(),
    priority: Joi.string().valid("low", "medium", "high", "urgent").optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    search: Joi.string().optional().allow(""),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortField: Joi.string()
      .valid("createdAt", "updatedAt", "priority", "status")
      .default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  });

  const { error } = querySchema.validate(req.query);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  next();
};

// Middleware to validate internal notes
const validateInternalNote = (req, res, next) => {
  const noteSchema = Joi.object({
    note: Joi.string().min(5).max(1000).required(),
  });

  const { error } = noteSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  next();
};

// Middleware to validate form ID
const validateFormId = (req, res, next) => {
  const idSchema = Joi.object({
    id: Joi.string().alphanum().length(24).required(), // Assuming MongoDB ObjectId
  });

  const { error } = idSchema.validate(req.params);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  next();
};

// Middleware for validating form updates
const validateFormUpdateMiddleware = (req, res, next) => {
  const updateSchema = Joi.object({
    form_type: Joi.string()
      .valid(
        "contact_us",
        "corporate_training_inquiry",
        "instructor_application",
        "educator_registration",
        "school_partnership_inquiry",
        "book_a_free_demo_session", // New form type
      )
      .optional(),
    priority: Joi.string().valid("low", "medium", "high", "urgent").optional(),
    status: Joi.string()
      .valid(
        "submitted",
        "pending",
        "in_progress",
        "completed",
        "cancelled",
        "follow_up",
      )
      .optional(),
    message: Joi.string().max(2000).allow("").optional(),
    internal_notes: Joi.array().items(Joi.string()).optional(),
    submission_metadata: Joi.object({
      user_agent: Joi.string().max(500).optional(),
      timestamp: Joi.date().optional(),
      referrer: Joi.string().max(500).allow("").optional(),
      form_version: Joi.string().max(20).optional(),
      validation_passed: Joi.boolean().optional(),
    }).optional(),
    // Allow partial updates for sub-schemas based on form_type
    // These will be validated more thoroughly by the service layer
    contact_info: contactInfoValidation.optional(),
    professional_info: professionalInfoValidation.optional(),
    education_info: educationInfoValidation.optional(),
    personal_details: personalDetailsValidation.optional(),
    work_experience: Joi.array().items(workExperienceValidation).optional(),
    internships: Joi.array().items(internshipValidation).optional(),
    projects: Joi.array().items(projectValidation).optional(),
    achievements: Joi.array().items(achievementValidation).optional(),
    certifications: Joi.array().items(certificationValidation).optional(),
    references: Joi.array().items(referenceValidation).optional(),
    training_requirements: trainingRequirementsValidation.optional(),
    files: filesValidation.optional(),
    job_preferences: jobPreferencesValidation.optional(),
    course_preferences: coursePreferencesValidation.optional(),
    school_info: schoolInfoValidation.optional(),
    partnership_info: partnershipInfoValidation.optional(),
    teaching_preferences: teachingPreferencesValidation.optional(),
    educator_consent: educatorConsentValidation.optional(),
    is_student_under_16: Joi.boolean().optional(),
    parent_details: parentDetailsValidation.optional(),
    student_details: Joi.alternatives()
      .try(studentUnder16DetailsValidation, student16AndAboveDetailsValidation)
      .optional(),
    demo_session_details: demoSessionDetailsValidation.optional(),
    consent: termsAndPrivacyConsentValidation.optional(),
  }).min(1); // At least one field is required for update

  const { error } = updateSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  next();
};

// Export all validation schemas and middleware functions
export {
  patterns,
  contactInfoValidation,
  professionalInfoValidation,
  educationInfoValidation,
  personalDetailsValidation,
  workExperienceValidation,
  internshipValidation,
  projectValidation,
  achievementValidation,
  certificationValidation,
  referenceValidation,
  trainingRequirementsValidation,
  filesValidation,
  jobPreferencesValidation,
  coursePreferencesValidation,
  schoolInfoValidation,
  partnershipInfoValidation,
  teachingPreferencesValidation,
  educatorConsentValidation,
  parentDetailsValidation,
  studentUnder16DetailsValidation,
  student16AndAboveDetailsValidation,
  demoSessionDetailsValidation,
  termsAndPrivacyConsentValidation,
  baseFormValidation,
  formValidationSchemas,
  validateUniversalForm,
  validateFormByType,
  validateFormQuery,
  validateInternalNote,
  validateFormId,
  validateFormUpdateMiddleware,
};
