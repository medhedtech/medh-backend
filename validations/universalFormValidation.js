import Joi from "joi";

// Common validation patterns
const patterns = {
  name: /^[a-zA-Z\s'-]+$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\d{10}$/,
  internationalPhone: /^\+[1-9]\d{1,14}$/,
  url: /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[a-zA-Z0-9-]*)*$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};

// Base contact information validation
const contactInfoValidation = Joi.object({
  full_name: Joi.string()
    .pattern(patterns.name)
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Full name is required'
    }),
  
  first_name: Joi.string()
    .pattern(patterns.name)
    .min(1)
    .max(50)
    .messages({
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes'
    }),
  
  last_name: Joi.string()
    .pattern(patterns.name)
    .min(1)
    .max(50)
    .messages({
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes'
    }),
  
  email: Joi.string()
    .pattern(patterns.email)
    .lowercase()
    .required()
    .messages({
      'string.pattern.base': 'Please enter a valid email address',
      'any.required': 'Email address is required'
    }),
  
  phone_number: Joi.string()
    .pattern(patterns.phone)
    .messages({
      'string.pattern.base': 'Phone number must be 10 digits'
    }),
  
  country: Joi.string()
    .min(2)
    .max(100),
  
  country_code: Joi.string()
    .pattern(/^\+\d{1,4}$/)
    .default('+91'),
  
  address: Joi.string().max(200),
  city: Joi.string().max(100),
  state: Joi.string().max(100),
  postal_code: Joi.string().max(20)
});

// Professional information validation
const professionalInfoValidation = Joi.object({
  designation: Joi.string()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Designation must be at least 2 characters long'
    }),
  
  company_name: Joi.string()
    .min(2)
    .max(200)
    .messages({
      'string.min': 'Company name must be at least 2 characters long'
    }),
  
  company_website: Joi.string()
    .pattern(patterns.url)
    .messages({
      'string.pattern.base': 'Please enter a valid website URL'
    }),
  
  organization: Joi.string().max(200),
  industry: Joi.string().max(100),
  
  experience_level: Joi.string()
    .valid('entry', 'junior', 'mid', 'senior', 'lead', 'executive'),
  
  department: Joi.string().max(100),
  
  amount_per_session: Joi.number()
    .positive()
    .max(100000)
    .messages({
      'number.positive': 'Amount per session must be a positive number'
    }),
  
  category: Joi.string().max(100)
});

// Education information validation
const educationInfoValidation = Joi.object({
  highest_education: Joi.string()
    .min(2)
    .max(100),
  
  university: Joi.string()
    .min(2)
    .max(200),
  
  degree: Joi.string()
    .min(2)
    .max(100),
  
  field_of_study: Joi.string()
    .min(2)
    .max(100),
  
  graduation_year: Joi.string()
    .pattern(/^\d{4}$/)
    .messages({
      'string.pattern.base': 'Graduation year must be a 4-digit year'
    }),
  
  gpa: Joi.string()
    .max(20),
  
  school_institute_name: Joi.string()
    .min(2)
    .max(200)
});

// Personal details validation
const personalDetailsValidation = Joi.object({
  age: Joi.number()
    .integer()
    .min(1)
    .max(120)
    .messages({
      'number.min': 'Age must be at least 1',
      'number.max': 'Age cannot exceed 120'
    }),
  
  gender: Joi.string()
    .valid('male', 'female', 'other', 'prefer_not_to_say'),
  
  date_of_birth: Joi.date()
    .max('now')
    .messages({
      'date.max': 'Date of birth cannot be in the future'
    }),
  
  nationality: Joi.string().max(100),
  
  languages_known: Joi.array()
    .items(Joi.string().max(50))
    .max(20),
  
  marital_status: Joi.string()
    .valid('single', 'married', 'divorced', 'widowed', 'prefer_not_to_say')
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
  achievements: Joi.string().max(1000)
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
  stipend: Joi.string().max(50)
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
  team_size: Joi.number().integer().min(1).max(100)
});

// Achievement validation
const achievementValidation = Joi.object({
  title: Joi.string().min(2).max(200),
  description: Joi.string().max(1000),
  date: Joi.string().max(50),
  issuer: Joi.string().max(200),
  category: Joi.string().valid('academic', 'professional', 'competition', 'volunteer', 'other'),
  level: Joi.string().valid('local', 'regional', 'national', 'international')
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
  status: Joi.string().valid('active', 'expired', 'pending')
});

// Reference validation
const referenceValidation = Joi.object({
  name: Joi.string().pattern(patterns.name).min(2).max(100),
  designation: Joi.string().max(100),
  company: Joi.string().max(200),
  email: Joi.string().pattern(patterns.email).lowercase(),
  phone: Joi.string().pattern(patterns.phone),
  relationship: Joi.string().valid('supervisor', 'colleague', 'mentor', 'client', 'professor', 'other'),
  years_known: Joi.number().integer().min(0).max(50)
});

// Training requirements validation
const trainingRequirementsValidation = Joi.object({
  course_category: Joi.string().max(100),
  course_type: Joi.string().max(100),
  training_topics: Joi.array().items(Joi.string().max(100)).max(50),
  preferred_format: Joi.string().valid('online', 'offline', 'hybrid', 'self-paced'),
  number_of_participants: Joi.number().integer().min(1).max(10000),
  duration_preference: Joi.string().max(100),
  budget_range: Joi.string().max(100),
  preferred_start_date: Joi.date().min('now'),
  urgency_level: Joi.string().valid('low', 'medium', 'high', 'urgent')
});

// Files validation
const filesValidation = Joi.object({
  resume_url: Joi.string().pattern(patterns.url),
  resume_file: Joi.string().max(500),
  portfolio_url: Joi.string().pattern(patterns.url),
  linkedin_profile: Joi.string().pattern(patterns.url),
  github_profile: Joi.string().pattern(patterns.url),
  website: Joi.string().pattern(patterns.url),
  user_image: Joi.string().max(500),
  additional_documents: Joi.array().items(
    Joi.object({
      name: Joi.string().max(200),
      url: Joi.string().pattern(patterns.url),
      type: Joi.string().max(50),
      size: Joi.number().positive().max(50000000), // 50MB max
      uploaded_at: Joi.date()
    })
  ).max(10)
});

// Job preferences validation
const jobPreferencesValidation = Joi.object({
  preferred_location: Joi.array().items(Joi.string().max(100)).max(20),
  preferred_job_type: Joi.string().valid('full-time', 'part-time', 'contract', 'freelance', 'internship'),
  preferred_work_type: Joi.string().valid('remote', 'on-site', 'hybrid'),
  expected_salary: Joi.string().max(100),
  notice_period: Joi.string().max(100),
  willing_to_relocate: Joi.boolean(),
  availability_date: Joi.date().min('now'),
  job_title_interest: Joi.array().items(Joi.string().max(100)).max(20),
  industry_preference: Joi.array().items(Joi.string().max(100)).max(20)
});

// Course preferences validation
const coursePreferencesValidation = Joi.object({
  course_category: Joi.string().max(100),
  course_type: Joi.string().valid('online', 'offline', 'hybrid', 'self-paced', 'live'),
  learning_goals: Joi.string().max(1000),
  experience_level: Joi.string().valid('beginner', 'intermediate', 'advanced'),
  preferred_schedule: Joi.string().max(200),
  budget_range: Joi.string().max(100),
  preferred_start_date: Joi.date().min('now')
});

// Base form validation (common to all forms)
const baseFormValidation = Joi.object({
  form_type: Joi.string()
    .valid(
      'contact_form', 'blog_contact_form', 'corporate_training_inquiry',
      'general_registration', 'school_registration',
      'add_student_form', 'add_instructor_form',
      'course_enrollment', 'job_application', 'placement_form',
      'feedback_form', 'consultation_request', 'partnership_inquiry',
      'demo_request', 'support_ticket'
    )
    .required(),
  
  contact_info: contactInfoValidation.required(),
  
  message: Joi.string()
    .min(10)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Message must be at least 10 characters long',
      'string.max': 'Message cannot exceed 2000 characters',
      'any.required': 'Message is required'
    }),
  
  subject: Joi.string()
    .min(3)
    .max(200)
    .messages({
      'string.min': 'Subject must be at least 3 characters long',
      'string.max': 'Subject cannot exceed 200 characters'
    }),
  
  terms_accepted: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the terms and conditions',
      'any.required': 'Terms acceptance is required'
    }),
  
  privacy_policy_accepted: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the privacy policy',
      'any.required': 'Privacy policy acceptance is required'
    }),
  
  marketing_consent: Joi.boolean().default(false),
  agree_terms: Joi.boolean().valid(true),
  accept: Joi.boolean().valid(true),
  
  // Optional nested schemas
  professional_info: professionalInfoValidation,
  education_info: educationInfoValidation,
  personal_details: personalDetailsValidation,
  work_experience: Joi.array().items(workExperienceValidation).max(20),
  internships: Joi.array().items(internshipValidation).max(10),
  projects: Joi.array().items(projectValidation).max(20),
  achievements: Joi.array().items(achievementValidation).max(50),
  certifications: Joi.array().items(certificationValidation).max(50),
  references: Joi.array().items(referenceValidation).max(10),
  training_requirements: trainingRequirementsValidation,
  files: filesValidation,
  job_preferences: jobPreferencesValidation,
  course_preferences: coursePreferencesValidation,
  
  skills: Joi.array().items(Joi.string().max(100)).max(100),
  languages_known: Joi.array().items(Joi.string().max(50)).max(20),
  
  // Form-specific fields
  company: Joi.string().max(200),
  password: Joi.string().pattern(patterns.password),
  use_manual_password: Joi.boolean(),
  role: Joi.string().valid('student', 'instructor', 'admin'),
  course_name: Joi.string().max(200),
  additional_info: Joi.string().max(2000),
  
  custom_fields: Joi.object().pattern(Joi.string(), Joi.any()),
  
  // Multi-step tracking
  current_step: Joi.number().integer().min(1),
  total_steps: Joi.number().integer().min(1),
  completed_steps: Joi.array().items(Joi.number().integer()),
  
  // Source tracking
  source: Joi.string().valid('website', 'mobile_app', 'admin_panel', 'api', 'import'),
  referrer: Joi.string().max(500),
  utm_source: Joi.string().max(100),
  utm_medium: Joi.string().max(100),
  utm_campaign: Joi.string().max(100)
});

// Form-specific validation schemas
const formValidationSchemas = {
  // Contact & Inquiry Forms
  contact_form: baseFormValidation.keys({
    contact_info: contactInfoValidation.keys({
      full_name: Joi.required(),
      email: Joi.required(),
      phone_number: Joi.string().pattern(patterns.phone)
    }).required(),
    subject: Joi.string().min(3).max(100).required(),
    company: Joi.string().max(100)
  }),

  blog_contact_form: baseFormValidation.keys({
    contact_info: contactInfoValidation.keys({
      full_name: Joi.required(),
      email: Joi.required()
    }).required(),
    message: Joi.string().min(10).max(1000).required()
  }),

  corporate_training_inquiry: baseFormValidation.keys({
    contact_info: contactInfoValidation.keys({
      full_name: Joi.required(),
      email: Joi.required(),
      phone_number: Joi.string().pattern(patterns.phone).required(),
      country: Joi.string().max(100)
    }).required(),
    professional_info: professionalInfoValidation.keys({
      designation: Joi.string().min(2).max(100).required(),
      company_name: Joi.string().min(2).max(200).required(),
      company_website: Joi.string().pattern(patterns.url).required()
    }).required()
  }),

  // Registration Forms
  general_registration: baseFormValidation.keys({
    contact_info: contactInfoValidation.keys({
      full_name: Joi.required(),
      email: Joi.required(),
      phone_number: Joi.string().pattern(patterns.phone).required(),
      country: Joi.string().required()
    }).required(),
    files: filesValidation.keys({
      resume_file: Joi.string().max(500) // Optional for general registration
    })
  }),

  school_registration: baseFormValidation.keys({
    contact_info: contactInfoValidation.keys({
      full_name: Joi.required(),
      email: Joi.required(),
      phone_number: Joi.string().pattern(patterns.phone).required(),
      country: Joi.string().required()
    }).required(),
    education_info: educationInfoValidation.keys({
      school_institute_name: Joi.string().min(2).max(200).required()
    }).required(),
    professional_info: professionalInfoValidation.keys({
      designation: Joi.string().min(2).max(100).required(),
      company_website: Joi.string().pattern(patterns.url).required()
    }).required()
  }),

  // Admin Forms
  add_student_form: baseFormValidation.keys({
    contact_info: contactInfoValidation.keys({
      full_name: Joi.required(),
      email: Joi.required(),
      phone_number: Joi.string().pattern(patterns.phone).required(),
      country_code: Joi.string().pattern(/^\+\d{1,4}$/).required()
    }).required(),
    personal_details: personalDetailsValidation.keys({
      age: Joi.number().integer().min(1).max(120).required(),
      gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').required()
    }).required(),
    password: Joi.when('use_manual_password', {
      is: true,
      then: Joi.string().pattern(patterns.password).required(),
      otherwise: Joi.string().optional()
    }),
    use_manual_password: Joi.boolean(),
    files: filesValidation.keys({
      user_image: Joi.string().max(500)
    })
  }),

  add_instructor_form: baseFormValidation.keys({
    contact_info: contactInfoValidation.keys({
      full_name: Joi.required(),
      email: Joi.required(),
      phone_number: Joi.string().pattern(patterns.phone).required()
    }).required(),
    personal_details: personalDetailsValidation.keys({
      age: Joi.number().integer().min(18).max(120).required(),
      gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').required()
    }).required(),
    professional_info: professionalInfoValidation.keys({
      amount_per_session: Joi.number().positive().max(100000).required(),
      category: Joi.string().max(100).required()
    }).required(),
    course_name: Joi.string().max(200),
    password: Joi.string().pattern(patterns.password).required()
  }),

  // Enrollment Forms
  course_enrollment: baseFormValidation.keys({
    contact_info: contactInfoValidation.keys({
      full_name: Joi.required(),
      email: Joi.required(),
      phone_number: Joi.string().pattern(patterns.phone).required(),
      country: Joi.string().required()
    }).required(),
    course_preferences: coursePreferencesValidation.keys({
      course_category: Joi.string().max(100).required(),
      course_type: Joi.string().valid('online', 'offline', 'hybrid', 'self-paced', 'live').required()
    }).required()
  }),

  // Career Application Forms
  job_application: baseFormValidation.keys({
    contact_info: contactInfoValidation.keys({
      full_name: Joi.required(),
      email: Joi.required(),
      phone_number: Joi.string().pattern(patterns.phone).required(),
      country: Joi.string().required()
    }).required(),
    message: Joi.string().min(10).max(2000) // Optional for job applications
  }),

  placement_form: baseFormValidation.keys({
    contact_info: contactInfoValidation.keys({
      first_name: Joi.string().pattern(patterns.name).min(1).max(50).required(),
      last_name: Joi.string().pattern(patterns.name).min(1).max(50).required(),
      email: Joi.required(),
      phone_number: Joi.string().pattern(patterns.phone).required()
    }).required(),
    education_info: educationInfoValidation.keys({
      highest_education: Joi.string().min(2).max(100).required(),
      university: Joi.string().min(2).max(200).required(),
      degree: Joi.string().min(2).max(100).required(),
      field_of_study: Joi.string().min(2).max(100).required(),
      graduation_year: Joi.string().pattern(/^\d{4}$/).required(),
      gpa: Joi.string().max(20).required()
    }).required(),
    files: filesValidation.keys({
      resume_url: Joi.string().pattern(patterns.url).required()
    }).required(),
    job_preferences: jobPreferencesValidation.keys({
      preferred_work_type: Joi.string().valid('remote', 'on-site', 'hybrid').required(),
      willing_to_relocate: Joi.boolean().required()
    }).required(),
    work_experience: Joi.array().items(workExperienceValidation),
    internships: Joi.array().items(internshipValidation),
    projects: Joi.array().items(projectValidation),
    skills: Joi.array().items(Joi.string().max(100)),
    languages_known: Joi.array().items(Joi.string().max(50)).required(),
    achievements: Joi.array().items(achievementValidation),
    certifications: Joi.array().items(certificationValidation),
    references: Joi.array().items(referenceValidation),
    additional_info: Joi.string().max(2000)
  })
};

// Main validation function
export const validateUniversalForm = (formData) => {
  const { form_type } = formData;
  
  if (!form_type) {
    return {
      error: {
        details: [{ message: 'Form type is required', path: ['form_type'] }]
      }
    };
  }
  
  const schema = formValidationSchemas[form_type];
  if (!schema) {
    return {
      error: {
        details: [{ message: `Unsupported form type: ${form_type}`, path: ['form_type'] }]
      }
    };
  }
  
  return schema.validate(formData, { 
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false
  });
};

// Step-wise validation for multi-step forms
export const validateFormStep = (formData, step) => {
  const { form_type } = formData;
  
  // Define step validation schemas for placement form
  if (form_type === 'placement_form') {
    const stepSchemas = {
      1: Joi.object({
        contact_info: contactInfoValidation.keys({
          first_name: Joi.required(),
          last_name: Joi.required(),
          email: Joi.required(),
          phone_number: Joi.string().pattern(patterns.phone).required()
        }).required(),
        files: filesValidation.keys({
          resume_url: Joi.string().pattern(patterns.url).required(),
          linkedin_profile: Joi.string().pattern(patterns.url),
          github_profile: Joi.string().pattern(patterns.url),
          portfolio_url: Joi.string().pattern(patterns.url),
          website: Joi.string().pattern(patterns.url)
        })
      }),
      2: Joi.object({
        education_info: educationInfoValidation.keys({
          highest_education: Joi.required(),
          university: Joi.required(),
          degree: Joi.required(),
          field_of_study: Joi.required(),
          graduation_year: Joi.string().pattern(/^\d{4}$/).required(),
          gpa: Joi.required()
        }).required()
      }),
      3: Joi.object({
        work_experience: Joi.array().items(workExperienceValidation),
        internships: Joi.array().items(internshipValidation),
        projects: Joi.array().items(projectValidation)
      }),
      4: Joi.object({
        skills: Joi.array().items(Joi.string().max(100)),
        languages_known: Joi.array().items(Joi.string().max(50)).required(),
        achievements: Joi.array().items(achievementValidation),
        certifications: Joi.array().items(certificationValidation)
      }),
      5: Joi.object({
        job_preferences: jobPreferencesValidation.keys({
          preferred_work_type: Joi.required(),
          willing_to_relocate: Joi.boolean().required()
        }).required()
      }),
      6: Joi.object({
        message: Joi.string().min(10).max(2000).required(),
        references: Joi.array().items(referenceValidation),
        additional_info: Joi.string().max(2000),
        terms_accepted: Joi.boolean().valid(true).required(),
        privacy_policy_accepted: Joi.boolean().valid(true).required()
      })
    };
    
    const stepSchema = stepSchemas[step];
    if (stepSchema) {
      return stepSchema.validate(formData, { 
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: false
      });
    }
  }
  
  // For other forms, validate the entire form
  return validateUniversalForm(formData);
};

// Query parameter validation for API endpoints
export const validateQueryParams = Joi.object({
  form_type: Joi.string().valid(
    'contact_form', 'blog_contact_form', 'corporate_training_inquiry',
    'general_registration', 'school_registration',
    'add_student_form', 'add_instructor_form',
    'course_enrollment', 'job_application', 'placement_form',
    'feedback_form', 'consultation_request', 'partnership_inquiry',
    'demo_request', 'support_ticket'
  ),
  status: Joi.string().valid(
    'submitted', 'received', 'under_review', 'in_progress',
    'shortlisted', 'interviewed', 'approved', 'rejected',
    'completed', 'cancelled', 'on_hold'
  ),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  assigned_to: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().valid('submitted_at', '-submitted_at', 'updated_at', '-updated_at', 'status', 'priority'),
  search: Joi.string().max(200),
  date_from: Joi.date(),
  date_to: Joi.date(),
  is_complete: Joi.boolean(),
  completion_percentage_min: Joi.number().min(0).max(100),
  completion_percentage_max: Joi.number().min(0).max(100)
});

// Update form validation
export const validateFormUpdate = Joi.object({
  status: Joi.string().valid(
    'submitted', 'received', 'under_review', 'in_progress',
    'shortlisted', 'interviewed', 'approved', 'rejected',
    'completed', 'cancelled', 'on_hold'
  ),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  assigned_to: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  internal_notes: Joi.array().items(
    Joi.object({
      note: Joi.string().min(1).max(1000).required(),
      added_by: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
    })
  ),
  follow_up_required: Joi.boolean(),
  follow_up_date: Joi.date().min('now')
});

// Express middleware functions
export const validateFormByType = (req, res, next) => {
  const { error } = validateUniversalForm(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  next();
};

export const validateFormQuery = (req, res, next) => {
  const { error } = validateQueryParams.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  next();
};

export const validateInternalNote = (req, res, next) => {
  const noteSchema = Joi.object({
    note: Joi.string().min(1).max(1000).required(),
    is_important: Joi.boolean().default(false)
  });
  
  const { error } = noteSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid note data',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  next();
};

export const validateFormId = (req, res, next) => {
  const idSchema = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required();
  const { error } = idSchema.validate(req.params.id);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid form ID format'
    });
  }
  
  next();
};

export const validateFormUpdateMiddleware = (req, res, next) => {
  const { error } = validateFormUpdate.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid form update data',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  next();
};

export default {
  validateUniversalForm,
  validateFormStep,
  validateQueryParams,
  validateFormUpdate,
  validateFormByType,
  validateFormQuery,
  validateInternalNote,
  validateFormId,
  validateFormUpdateMiddleware,
  formValidationSchemas,
  patterns
}; 