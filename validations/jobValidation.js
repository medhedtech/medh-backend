import { body, param, query, validationResult } from "express-validator";

// Common patterns for validation
const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  url: /^https?:\/\/.+/,
  mongoId: /^[0-9a-fA-F]{24}$/,
  currency: /^[A-Z]{3}$/,
  time: /^([01]\d|2[0-3]):([0-5]\d)$/
};

// Validate job application creation
export const validateJobApplication = [
  // Basic application fields
  body("full_name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage("Full name can only contain letters, spaces, hyphens, apostrophes, and periods"),

  body("email")
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .isLength({ max: 255 })
    .withMessage("Email cannot exceed 255 characters"),

  body("country")
    .trim()
    .notEmpty()
    .withMessage("Country is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Country must be between 2 and 100 characters"),

  body("phone_number")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(patterns.phone)
    .withMessage("Please provide a valid phone number"),

  body("resume_image")
    .optional()
    .isString()
    .withMessage("Resume image must be a string")
    .isLength({ max: 500 })
    .withMessage("Resume image URL cannot exceed 500 characters"),

  body("message")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Message cannot exceed 2000 characters"),

  body("accept")
    .optional()
    .isBoolean()
    .withMessage("Accept must be a boolean value"),

  // Job details (required for job posting creation)
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Job title is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Job title must be between 3 and 200 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Job description is required")
    .isLength({ min: 50, max: 5000 })
    .withMessage("Job description must be between 50 and 5000 characters"),

  body("designation")
    .trim()
    .notEmpty()
    .withMessage("Designation is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Designation must be between 2 and 100 characters"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array()
      });
    }
    next();
  }
];

// Validate comprehensive job posting creation
export const validateJobPosting = [
  // Basic job details
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Job title is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Job title must be between 3 and 200 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Job description is required")
    .isLength({ min: 50, max: 5000 })
    .withMessage("Job description must be between 50 and 5000 characters"),

  body("designation")
    .trim()
    .notEmpty()
    .withMessage("Designation is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Designation must be between 2 and 100 characters"),

  // Key responsibilities
  body("key_responsibilities")
    .optional()
    .isArray()
    .withMessage("Key responsibilities must be an array"),

  body("key_responsibilities.*")
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage("Each responsibility must be between 5 and 500 characters"),

  // Qualifications
  body("qualifications.education")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Education requirement cannot exceed 200 characters"),

  body("qualifications.experience.minimum_years")
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage("Minimum years of experience must be between 0 and 50"),

  body("qualifications.experience.type")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Experience type cannot exceed 200 characters"),

  body("qualifications.skills")
    .optional()
    .isArray()
    .withMessage("Skills must be an array"),

  body("qualifications.skills.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Each skill must be between 1 and 100 characters"),

  body("qualifications.additional_requirements")
    .optional()
    .isArray()
    .withMessage("Additional requirements must be an array"),

  body("qualifications.additional_requirements.*")
    .optional()
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage("Each additional requirement must be between 5 and 300 characters"),

  // Work mode
  body("work_mode")
    .notEmpty()
    .withMessage("Work mode is required")
    .isIn(["Remote", "Office", "Hybrid", "Work from Office & Remote"])
    .withMessage("Invalid work mode"),

  // Markets
  body("markets")
    .optional()
    .isArray()
    .withMessage("Markets must be an array"),

  body("markets.*")
    .optional()
    .isIn(["INDIA", "US", "UK", "AUSTRALIA", "GLOBAL"])
    .withMessage("Invalid market. Must be one of: INDIA, US, UK, AUSTRALIA, GLOBAL"),

  // Selection process
  body("selection_process")
    .optional()
    .isArray()
    .withMessage("Selection process must be an array"),

  body("selection_process.*.step")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Selection process step is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Selection process step must be between 3 and 100 characters"),

  body("selection_process.*.order")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Selection process order must be a positive integer"),

  body("selection_process.*.description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Selection process description cannot exceed 500 characters"),

  // Office location
  body("office_location.address")
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Office address cannot exceed 300 characters"),

  body("office_location.city")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Office city cannot exceed 100 characters"),

  body("office_location.state")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Office state cannot exceed 100 characters"),

  body("office_location.country")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Office country cannot exceed 100 characters"),

  // Work from home requirements
  body("wfh_requirements")
    .optional()
    .isArray()
    .withMessage("WFH requirements must be an array"),

  body("wfh_requirements.*.requirement")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("WFH requirement is required")
    .isLength({ min: 5, max: 200 })
    .withMessage("WFH requirement must be between 5 and 200 characters"),

  body("wfh_requirements.*.specification")
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage("WFH requirement specification cannot exceed 300 characters"),

  body("wfh_requirements.*.mandatory")
    .optional()
    .isBoolean()
    .withMessage("WFH requirement mandatory field must be boolean"),

  // Job status
  body("job_status")
    .optional()
    .isIn(["Draft", "Active", "Paused", "Closed", "Archived"])
    .withMessage("Invalid job status"),

  // Employment type
  body("employment_type")
    .optional()
    .isIn(["Full-time", "Part-time", "Contract", "Internship", "Freelance"])
    .withMessage("Invalid employment type"),

  // Salary range
  body("salary_range.min")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum salary must be a positive number"),

  body("salary_range.max")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum salary must be a positive number")
    .custom((value, { req }) => {
      if (req.body.salary_range?.min && value <= req.body.salary_range.min) {
        throw new Error("Maximum salary must be greater than minimum salary");
      }
      return true;
    }),

  body("salary_range.currency")
    .optional()
    .matches(patterns.currency)
    .withMessage("Currency must be a valid 3-letter currency code"),

  body("salary_range.period")
    .optional()
    .isIn(["hourly", "monthly", "yearly"])
    .withMessage("Salary period must be hourly, monthly, or yearly"),

  // Application deadline
  body("application_deadline")
    .optional()
    .isISO8601()
    .withMessage("Application deadline must be a valid date")
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error("Application deadline must be in the future");
      }
      return true;
    }),

  // Department
  body("department")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Department cannot exceed 100 characters"),

  // Company mission
  body("company_mission")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Company mission cannot exceed 1000 characters"),

  // Training support
  body("training_support")
    .optional()
    .isArray()
    .withMessage("Training support must be an array"),

  body("training_support.*")
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Each training support item must be between 5 and 200 characters"),

  // Benefits
  body("benefits")
    .optional()
    .isArray()
    .withMessage("Benefits must be an array"),

  body("benefits.*")
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Each benefit must be between 3 and 200 characters"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array()
      });
    }
    next();
  }
];

// Validate job update
export const validateJobUpdate = [
  // All fields are optional for updates
  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Job title must be between 3 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage("Job description must be between 50 and 5000 characters"),

  body("designation")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Designation must be between 2 and 100 characters"),

  body("work_mode")
    .optional()
    .isIn(["Remote", "Office", "Hybrid", "Work from Office & Remote"])
    .withMessage("Invalid work mode"),

  body("markets.*")
    .optional()
    .isIn(["INDIA", "US", "UK", "AUSTRALIA", "GLOBAL"])
    .withMessage("Invalid market"),

  body("job_status")
    .optional()
    .isIn(["Draft", "Active", "Paused", "Closed", "Archived"])
    .withMessage("Invalid job status"),

  body("application_status")
    .optional()
    .isIn(["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Rejected", "Selected", "Withdrawn"])
    .withMessage("Invalid application status"),

  body("employment_type")
    .optional()
    .isIn(["Full-time", "Part-time", "Contract", "Internship", "Freelance"])
    .withMessage("Invalid employment type"),

  body("application_deadline")
    .optional()
    .isISO8601()
    .withMessage("Application deadline must be a valid date"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array()
      });
    }
    next();
  }
];

// Validate MongoDB ObjectId parameter
export const validateJobId = [
  param("id")
    .matches(patterns.mongoId)
    .withMessage("Invalid job ID format"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
        errors: errors.array()
      });
    }
    next();
  }
];

// Validate query parameters for job search/filtering
export const validateJobQuery = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("status")
    .optional()
    .isIn(["Draft", "Active", "Paused", "Closed", "Archived"])
    .withMessage("Invalid job status filter"),

  query("work_mode")
    .optional()
    .isIn(["Remote", "Office", "Hybrid", "Work from Office & Remote"])
    .withMessage("Invalid work mode filter"),

  query("employment_type")
    .optional()
    .isIn(["Full-time", "Part-time", "Contract", "Internship", "Freelance"])
    .withMessage("Invalid employment type filter"),

  query("market")
    .optional()
    .isIn(["INDIA", "US", "UK", "AUSTRALIA", "GLOBAL"])
    .withMessage("Invalid market filter"),

  query("department")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Department filter cannot exceed 100 characters"),

  query("search")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Search query must be between 2 and 100 characters"),

  query("sort")
    .optional()
    .isIn(["title", "posted_date", "application_deadline", "salary_min", "salary_max"])
    .withMessage("Invalid sort field"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: errors.array()
      });
    }
    next();
  }
];

// Validate bulk operations
export const validateBulkJobUpdate = [
  body("job_ids")
    .isArray({ min: 1 })
    .withMessage("Job IDs array is required and cannot be empty"),

  body("job_ids.*")
    .matches(patterns.mongoId)
    .withMessage("Each job ID must be a valid MongoDB ObjectId"),

  body("updates")
    .isObject()
    .withMessage("Updates object is required"),

  body("updates.job_status")
    .optional()
    .isIn(["Draft", "Active", "Paused", "Closed", "Archived"])
    .withMessage("Invalid job status for bulk update"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array()
      });
    }
    next();
  }
];

// Validate application status update
export const validateApplicationStatusUpdate = [
  body("application_status")
    .notEmpty()
    .withMessage("Application status is required")
    .isIn(["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Rejected", "Selected", "Withdrawn"])
    .withMessage("Invalid application status"),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters"),

  body("interview_date")
    .optional()
    .isISO8601()
    .withMessage("Interview date must be a valid date")
    .custom((value, { req }) => {
      if (req.body.application_status === "Interview Scheduled" && !value) {
        throw new Error("Interview date is required when status is 'Interview Scheduled'");
      }
      if (value && new Date(value) <= new Date()) {
        throw new Error("Interview date must be in the future");
      }
      return true;
    }),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array()
      });
    }
    next();
  }
];

export default {
  validateJobApplication,
  validateJobPosting,
  validateJobUpdate,
  validateJobId,
  validateJobQuery,
  validateBulkJobUpdate,
  validateApplicationStatusUpdate
}; 