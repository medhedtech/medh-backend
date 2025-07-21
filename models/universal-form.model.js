import mongoose from "mongoose";

// Common contact information schema
const contactInfoSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true, trim: true },
    first_name: { type: String, trim: true },
    last_name: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (email) {
          return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
        },
        message: "Please enter a valid email address",
      },
    },
    phone_number: {
      type: String,
      trim: true,
      validate: {
        validator: function (phone) {
          if (!phone) return true; // Allow empty for optional forms

          // Remove any non-digit characters for validation
          const cleanPhone = phone.replace(/\D/g, "");

          // Check if it already includes country code (starts with +)
          if (phone.startsWith("+")) {
            return /^\+[1-9]\d{1,14}$/.test(phone);
          }

          // For corporate training forms, ensure minimum 10 digits
          return cleanPhone.length >= 10;
        },
        message: "Please enter a valid phone number",
      },
    },
    country: {
      type: String,
      trim: true,
      validate: {
        validator: function (country) {
          // For corporate training forms, country is required
          if (this.parent().form_type === "corporate_training_inquiry") {
            return country && country.length > 0;
          }
          return true;
        },
        message: "Country is required for corporate training inquiries",
      },
    },
    country_code: { type: String, trim: true, default: "+91" },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postal_code: { type: String, trim: true },
  },
  { _id: false },
);

// Professional information schema
const professionalInfoSchema = new mongoose.Schema(
  {
    designation: {
      type: String,
      trim: true,
      validate: {
        validator: function (designation) {
          // For corporate training forms, designation is required
          if (this.parent().form_type === "corporate_training_inquiry") {
            return designation && designation.length > 0;
          }
          return true;
        },
        message: "Designation is required for corporate training inquiries",
      },
    },
    company_name: {
      type: String,
      trim: true,
      validate: {
        validator: function (company_name) {
          // For corporate training forms, company name is required
          if (this.parent().form_type === "corporate_training_inquiry") {
            return company_name && company_name.length > 0;
          }
          return true;
        },
        message: "Company name is required for corporate training inquiries",
      },
    },
    company_website: {
      type: String,
      trim: true,
      validate: {
        validator: function (website) {
          if (!website) {
            // For corporate training forms, website is required
            if (this.parent().form_type === "corporate_training_inquiry") {
              return false;
            }
            return true;
          }

          // Validate website URL format
          const websiteRegex =
            /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[a-zA-Z0-9-]*)*$/;
          return websiteRegex.test(website);
        },
        message: "Please enter a valid website URL",
      },
    },
    organization: { type: String, trim: true },
    industry: { type: String, trim: true },
    experience_level: {
      type: String,
      enum: ["entry", "junior", "mid", "senior", "lead", "executive"],
      trim: true,
    },
    department: { type: String, trim: true },
    amount_per_session: { type: Number, min: 0 }, // For instructor forms
    category: { type: String, trim: true }, // For instructor/course category
  },
  { _id: false },
);

// Education information schema
const educationInfoSchema = new mongoose.Schema(
  {
    highest_education: { type: String, trim: true },
    university: { type: String, trim: true },
    degree: { type: String, trim: true },
    field_of_study: { type: String, trim: true },
    graduation_year: { type: String, trim: true },
    gpa: { type: String, trim: true },
    school_institute_name: { type: String, trim: true }, // For school registration
  },
  { _id: false },
);

// Work experience schema
const workExperienceSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    company: { type: String, trim: true },
    location: { type: String, trim: true },
    start_date: { type: String, trim: true },
    end_date: { type: String, trim: true },
    current: { type: Boolean, default: false },
    description: { type: String, trim: true },
    technologies: [{ type: String, trim: true }],
    achievements: { type: String, trim: true },
  },
  { _id: false },
);

// Internship experience schema
const internshipSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    company: { type: String, trim: true },
    location: { type: String, trim: true },
    start_date: { type: String, trim: true },
    end_date: { type: String, trim: true },
    current: { type: Boolean, default: false },
    description: { type: String, trim: true },
    technologies: [{ type: String, trim: true }],
    supervisor: { type: String, trim: true },
    stipend: { type: String, trim: true },
  },
  { _id: false },
);

// Project schema
const projectSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    technologies: [{ type: String, trim: true }],
    github_url: { type: String, trim: true },
    demo_url: { type: String, trim: true },
    start_date: { type: String, trim: true },
    end_date: { type: String, trim: true },
    current: { type: Boolean, default: false },
    role: { type: String, trim: true },
    highlights: { type: String, trim: true },
    is_open_source: { type: Boolean, default: false },
    team_size: { type: Number, min: 1 },
  },
  { _id: false },
);

// Achievement schema
const achievementSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    date: { type: String, trim: true },
    issuer: { type: String, trim: true },
    category: {
      type: String,
      enum: ["academic", "professional", "competition", "volunteer", "other"],
      trim: true,
    },
    level: {
      type: String,
      enum: ["local", "regional", "national", "international"],
      trim: true,
    },
  },
  { _id: false },
);

// Certification schema
const certificationSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    issuer: { type: String, trim: true },
    date: { type: String, trim: true },
    expiry: { type: String, trim: true },
    credential_id: { type: String, trim: true },
    url: { type: String, trim: true },
    score: { type: String, trim: true },
    status: {
      type: String,
      enum: ["active", "expired", "pending"],
      default: "active",
    },
  },
  { _id: false },
);

// Reference schema
const referenceSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    designation: { type: String, trim: true },
    company: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    relationship: {
      type: String,
      enum: [
        "supervisor",
        "colleague",
        "mentor",
        "client",
        "professor",
        "other",
      ],
      trim: true,
    },
    years_known: { type: Number, min: 0 },
  },
  { _id: false },
);

// Training requirements schema
const trainingRequirementsSchema = new mongoose.Schema(
  {
    course_category: { type: String, trim: true },
    course_type: { type: String, trim: true },
    training_topics: [{ type: String, trim: true }],
    preferred_format: {
      type: String,
      enum: ["online", "offline", "hybrid", "self-paced"],
      trim: true,
    },
    number_of_participants: { type: Number, min: 1 },
    duration_preference: { type: String, trim: true },
    budget_range: { type: String, trim: true },
    preferred_start_date: { type: Date },
    urgency_level: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
  },
  { _id: false },
);

// Hire requirements schema for "Hire from Medh" forms
const hireRequirementsSchema = new mongoose.Schema(
  {
    requirement_type: {
      type: String,
      enum: [
        "Hire Medh-trained Candidates",
        "Corporate Upskilling/Training",
        "Both",
      ],
      trim: true,
      required: function () {
        return this.parent().form_type === "hire_from_medh_inquiry";
      },
    },
    training_domain: {
      type: String,
      trim: true,
      required: function () {
        return this.parent().form_type === "hire_from_medh_inquiry";
      },
    },
    start_date: { type: Date },
    budget_range: { type: String, trim: true },
    detailed_requirements: {
      type: String,
      trim: true,
      minlength: [
        20,
        "Please provide detailed requirements (minimum 20 characters)",
      ],
      required: function () {
        return this.parent().form_type === "hire_from_medh_inquiry";
      },
    },
    team_size: {
      type: String,
      enum: ["1–5", "6–20", "21–50", "50+"],
      trim: true,
      required: function () {
        return this.parent().form_type === "hire_from_medh_inquiry";
      },
    },
    document_upload: { type: String, trim: true }, // For uploaded JD or documents
  },
  { _id: false },
);

// Files and documents schema
const fileSchema = new mongoose.Schema(
  {
    resume_url: { type: String, trim: true },
    resume_file: { type: String, trim: true }, // For uploaded resume files
    portfolio_url: { type: String, trim: true },
    linkedin_profile: { type: String, trim: true },
    github_profile: { type: String, trim: true },
    website: { type: String, trim: true },
    user_image: { type: String, trim: true }, // Profile picture
    additional_documents: [
      {
        name: { type: String, trim: true },
        url: { type: String, trim: true },
        type: { type: String, trim: true },
        size: { type: Number },
        uploaded_at: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: false },
);

// Job preferences schema
const jobPreferencesSchema = new mongoose.Schema(
  {
    preferred_location: [{ type: String, trim: true }],
    preferred_job_type: {
      type: String,
      enum: ["full-time", "part-time", "contract", "freelance", "internship"],
      trim: true,
    },
    preferred_work_type: {
      type: String,
      enum: ["remote", "on-site", "hybrid"],
      trim: true,
    },
    expected_salary: { type: String, trim: true },
    notice_period: { type: String, trim: true },
    willing_to_relocate: { type: Boolean, default: false },
    availability_date: { type: Date },
    job_title_interest: [{ type: String, trim: true }],
    industry_preference: [{ type: String, trim: true }],
  },
  { _id: false },
);

// Course enrollment preferences schema
const coursePreferencesSchema = new mongoose.Schema(
  {
    course_category: { type: String, trim: true },
    course_type: {
      type: String,
      enum: ["online", "offline", "hybrid", "self-paced", "live"],
      trim: true,
    },
    learning_goals: { type: String, trim: true },
    experience_level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      trim: true,
    },
    preferred_schedule: { type: String, trim: true },
    budget_range: { type: String, trim: true },
    preferred_start_date: { type: Date },
  },
  { _id: false },
);

// School information schema for school partnership inquiries
const schoolInfoSchema = new mongoose.Schema(
  {
    school_name: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "School name must be at least 2 characters long"],
      maxlength: [200, "School name cannot exceed 200 characters"],
    },
    school_type: {
      type: String,
      required: true,
      enum: ["CBSE", "ICSE", "IB", "State Board", "International", "Other"],
      trim: true,
    },
    city_state: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "City/State must be at least 2 characters long"],
      maxlength: [100, "City/State cannot exceed 100 characters"],
    },
    student_count: {
      type: String,
      required: true,
      enum: ["1-50", "51-100", "101-300", "301-500", "501-1000", "1000+"],
      trim: true,
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function (website) {
          if (!website) return true; // Allow empty
          const websiteRegex =
            /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[a-zA-Z0-9-]*)*$/;
          return websiteRegex.test(website);
        },
        message: "Please enter a valid website URL",
      },
    },
  },
  { _id: false },
);

// Partnership information schema for school partnership inquiries
const partnershipInfoSchema = new mongoose.Schema(
  {
    services_of_interest: {
      type: [String],
      required: true,
      validate: {
        validator: function (services) {
          const validServices = [
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
            "Other",
          ];
          return (
            services.length > 0 &&
            services.every((service) => validServices.includes(service))
          );
        },
        message: "Please select at least one valid service of interest",
      },
    },
    additional_notes: {
      type: String,
      trim: true,
      maxlength: [2000, "Additional notes cannot exceed 2000 characters"],
    },
  },
  { _id: false },
);

// Personal details schema (for admin forms)
const personalDetailsSchema = new mongoose.Schema(
  {
    age: { type: Number, min: 1, max: 120 },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      trim: true,
    },
    date_of_birth: { type: Date },
    nationality: { type: String, trim: true },
    languages_known: [{ type: String, trim: true }],
    marital_status: {
      type: String,
      enum: ["single", "married", "divorced", "widowed", "prefer_not_to_say"],
      trim: true,
    },
  },
  { _id: false },
);

// Teaching preferences schema
const teachingPreferencesSchema = new mongoose.Schema(
  {
    subject_areas: [{ type: String, trim: true }],
    teaching_style: {
      type: String,
      enum: ["traditional", "interactive", "project-based", "other"],
      trim: true,
    },
    preferred_age_group: {
      type: String,
      enum: ["children", "teenagers", "adults", "all_ages"],
      trim: true,
    },
    preferred_time_slot: { type: String, trim: true },
    preferred_duration: { type: String, trim: true },
    preferred_location: { type: String, trim: true },
    travel_willingness: { type: Boolean, default: false },
    online_platform_preference: { type: String, trim: true },
  },
  { _id: false },
);

// Consent schema
const consentSchema = new mongoose.Schema(
  {
    terms_accepted: {
      type: Boolean,
      required: true,
      validate: {
        validator: function (v) {
          return v === true;
        },
        message: "Terms and conditions must be accepted",
      },
    },
    privacy_policy_accepted: {
      type: Boolean,
      required: true,
      validate: {
        validator: function (v) {
          return v === true;
        },
        message: "Privacy policy must be accepted",
      },
    },
    marketing_consent: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

// New schemas for Book-A-Free-Demo-Session
const parentDetailsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    mobile_no: { type: String, required: true, trim: true }, // Already validated for international format in Joi
    current_city: { type: String, required: true, trim: true },
    preferred_timings_to_connect: { type: String, trim: true },
  },
  { _id: false },
);

const studentUnder16DetailsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    grade: {
      type: String,
      required: true,
      enum: [
        "Grade 1-2",
        "Grade 3-4",
        "Grade 5-6",
        "Grade 7-8",
        "Grade 9-10",
        "Grade 11-12",
        "Home Study",
      ],
    },
    preferred_course: [{ type: String, required: true, trim: true }],
    email: { type: String, trim: true, lowercase: true },
    school_name: { type: String, trim: true },
  },
  { _id: false },
);

const student16AndAboveDetailsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    mobile_no: { type: String, required: true, trim: true }, // Already validated for international format in Joi
    current_city: { type: String, required: true, trim: true },
    preferred_timings_to_connect: { type: String, trim: true },
    highest_qualification: {
      type: String,
      required: true,
      enum: [
        "10th passed",
        "12th passed",
        "Undergraduate",
        "Graduate",
        "Post-Graduate",
      ],
    },
    currently_studying: { type: Boolean, required: true },
    currently_working: { type: Boolean, required: true },
    preferred_course: [{ type: String, required: true, trim: true }],
    education_institute_name: { type: String, trim: true },
  },
  { _id: false },
);

const demoSessionDetailsSchema = new mongoose.Schema(
  {
    preferred_date: { type: Date },
    preferred_time_slot: { type: String, trim: true },
  },
  { _id: false },
);

const termsAndPrivacyConsentSchema = new mongoose.Schema(
  {
    terms_accepted: { type: Boolean, required: true, default: false },
    privacy_policy_accepted: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

// Main universal form schema
const universalFormSchema = new mongoose.Schema(
  {
    // Form identification
    form_type: {
      type: String,
      required: true,
      enum: [
        // Contact & Inquiry Forms
        "contact_form",
        "blog_contact_form",
        "corporate_training_inquiry",
        "hire_from_medh_inquiry",
        "book_a_free_demo_session", // New form type

        // Registration Forms
        "general_registration",
        "school_registration",

        // Admin Forms
        "add_student_form",
        "add_instructor_form",

        // Enrollment Forms
        "course_enrollment",

        // Career Application Forms
        "job_application",
        "placement_form",

        // Additional Forms
        "feedback_form",
        "consultation_request",
        "partnership_inquiry",
        "school_partnership_inquiry",
        "demo_request",
        "support_ticket",
        "educator_registration",
      ],
    },
    form_id: {
      type: String,
      unique: true,
      default: function () {
        return `${this.form_type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      },
    },

    // User reference (optional - for logged-in users)
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Core information (always present)
    contact_info: {
      type: contactInfoSchema,
      required: true,
    },

    // Message and communication
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
      validate: {
        validator: function (message) {
          if (!message || message.trim().length === 0) {
            return false;
          }
          // For corporate training forms, require more detailed message
          if (this.form_type === "corporate_training_inquiry") {
            return message.trim().length >= 20;
          }
          // For educator registration, a message is not required.
          if (this.form_type === "educator_registration") {
            return true; // message is optional for educator registration
          }
          return true;
        },
        message:
          "Please provide detailed information about your training requirements (minimum 20 characters)",
      },
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    // Conditional schemas based on form type
    professional_info: professionalInfoSchema,
    education_info: educationInfoSchema,
    personal_details: personalDetailsSchema,
    work_experience: [workExperienceSchema],
    internships: [internshipSchema],
    projects: [projectSchema],
    achievements: [achievementSchema],
    certifications: [certificationSchema],
    references: [referenceSchema],
    training_requirements: trainingRequirementsSchema,
    hire_requirements: hireRequirementsSchema,
    files: fileSchema,
    job_preferences: jobPreferencesSchema,
    course_preferences: coursePreferencesSchema,
    school_info: schoolInfoSchema,
    partnership_info: partnershipInfoSchema,

    // Educator specific schemas
    teaching_preferences: teachingPreferencesSchema,
    consent: consentSchema,

    // New fields for Book-A-Free-Demo-Session
    is_student_under_16: { type: Boolean },
    parent_details: {
      type: parentDetailsSchema,
      required: function () {
        return this.is_student_under_16 === true;
      },
    },
    student_details: {
      type: new mongoose.Schema({}), // This will be dynamically set based on is_student_under_16
      required: function () {
        return typeof this.is_student_under_16 === "boolean";
      },
    },
    demo_session_details: demoSessionDetailsSchema,

    // Skills and languages
    skills: [{ type: String, trim: true }],
    languages_known: [{ type: String, trim: true }],

    // Form-specific fields
    // For corporate training
    company: { type: String, trim: true }, // For simple contact forms

    // For admin forms
    password: { type: String, trim: true }, // For manual password setting
    use_manual_password: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student",
    },

    // For enrollment forms
    course_name: { type: String, trim: true },

    // Additional information
    additional_info: { type: String, trim: true },

    // Additional flexible data
    custom_fields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map(),
    },

    // Consent and agreements
    terms_accepted: {
      type: Boolean,
      required: true,
      validate: {
        validator: function (v) {
          return v === true;
        },
        message: "Terms and conditions must be accepted",
      },
    },
    privacy_policy_accepted: {
      type: Boolean,
      required: true,
      validate: {
        validator: function (v) {
          return v === true;
        },
        message: "Privacy policy must be accepted",
      },
    },
    marketing_consent: {
      type: Boolean,
      default: false,
    },
    agree_terms: {
      // Alternative field name for some forms
      type: Boolean,
      default: function () {
        return this.terms_accepted;
      },
    },
    accept: {
      // Alternative field name for corporate training and other forms
      type: Boolean,
      validate: {
        validator: function (v) {
          // For corporate training forms, accept field is required and must be true
          if (this.form_type === "corporate_training_inquiry") {
            return v === true;
          }
          return true;
        },
        message: "You must accept the terms and privacy policy to proceed",
      },
      default: function () {
        return this.terms_accepted;
      },
    },

    // Status and workflow
    status: {
      type: String,
      enum: [
        "submitted",
        "received",
        "under_review",
        "in_progress",
        "shortlisted",
        "interviewed",
        "approved",
        "rejected",
        "completed",
        "cancelled",
        "on_hold",
      ],
      default: "submitted",
    },

    // Priority and categorization
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    // Assignment and handling
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    handled_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Internal notes and tracking
    internal_notes: [
      {
        note: { type: String, trim: true },
        added_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        added_at: { type: Date, default: Date.now },
      },
    ],

    // Communication history
    follow_up_required: { type: Boolean, default: false },
    follow_up_date: { type: Date },
    last_contacted: { type: Date },
    contact_attempts: { type: Number, default: 0 },

    // Source tracking
    source: {
      type: String,
      enum: [
        "website",
        "mobile_app",
        "admin_panel",
        "api",
        "import",
        "website_form",
        "email",
        "phone",
        "referral",
        "social_media",
        "other",
      ],
      default: "website",
    },
    referrer: { type: String, trim: true },
    utm_source: { type: String, trim: true },
    utm_medium: { type: String, trim: true },
    utm_campaign: { type: String, trim: true },

    // Submission metadata for tracking form submissions
    submission_metadata: {
      user_agent: { type: String, trim: true },
      timestamp: { type: Date, default: Date.now },
      referrer: { type: String, trim: true },
      form_version: { type: String, trim: true, default: "1.0" },
    },

    // IP and device tracking
    ip_address: { type: String, trim: true },
    user_agent: { type: String, trim: true },
    device_info: {
      type: { type: String, trim: true },
      os: { type: String, trim: true },
      browser: { type: String, trim: true },
    },

    // Multi-step form tracking
    current_step: { type: Number, default: 1 },
    total_steps: { type: Number, default: 1 },
    completed_steps: [{ type: Number }],
    step_data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map(),
    },

    // Form validation and completion
    is_complete: { type: Boolean, default: false },
    completion_percentage: { type: Number, default: 0, min: 0, max: 100 },
    validation_errors: [
      {
        field: { type: String },
        message: { type: String },
        step: { type: Number },
      },
    ],

    // Timestamps and audit
    submitted_at: { type: Date, default: Date.now },
    processed_at: { type: Date },
    completed_at: { type: Date },
    last_updated_at: { type: Date, default: Date.now },

    // Soft delete
    is_deleted: { type: Boolean, default: false },
    deleted_at: { type: Date },
    deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Post-validation hook to dynamically set student_details schema
universalFormSchema.pre("validate", function (next) {
  if (this.form_type === "book_a_free_demo_session") {
    if (this.is_student_under_16 === true) {
      this.student_details = studentUnder16DetailsSchema;
    } else if (this.is_student_under_16 === false) {
      this.student_details = student16AndAboveDetailsSchema;
    }
  }
  next();
});

// Indexes for performance
universalFormSchema.index({ form_type: 1, status: 1 });
universalFormSchema.index({ "contact_info.email": 1 });
universalFormSchema.index({ submitted_at: -1 });
universalFormSchema.index({ assigned_to: 1, status: 1 });
// Note: form_id index is already created via unique: true in schema
universalFormSchema.index({ user_id: 1, form_type: 1 });
universalFormSchema.index({ is_complete: 1, form_type: 1 });

// Virtual for processing time
universalFormSchema.virtual("processing_time").get(function () {
  if (this.processed_at && this.submitted_at) {
    return Math.floor(
      (this.processed_at - this.submitted_at) / (1000 * 60 * 60),
    ); // in hours
  }
  return null;
});

// Virtual for form age
universalFormSchema.virtual("form_age_days").get(function () {
  return Math.floor((Date.now() - this.submitted_at) / (1000 * 60 * 60 * 24));
});

// Virtual for full name (computed from first_name and last_name if available)
universalFormSchema.virtual("computed_full_name").get(function () {
  if (this.contact_info.first_name && this.contact_info.last_name) {
    return `${this.contact_info.first_name} ${this.contact_info.last_name}`;
  }
  return this.contact_info.full_name;
});

// Pre-save middleware
universalFormSchema.pre("save", function (next) {
  // Auto-generate form_id if not present
  if (!this.form_id) {
    this.form_id = `${this.form_type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Update last_updated_at
  this.last_updated_at = new Date();

  // Set processed_at when status changes from submitted
  if (
    this.isModified("status") &&
    this.status !== "submitted" &&
    !this.processed_at
  ) {
    this.processed_at = new Date();
  }

  // Set completed_at when status is completed/approved/rejected
  if (
    this.isModified("status") &&
    ["completed", "approved", "rejected"].includes(this.status) &&
    !this.completed_at
  ) {
    this.completed_at = new Date();
  }

  // Calculate completion percentage based on form type
  if (this.isModified() && !this.isModified("completion_percentage")) {
    this.completion_percentage = this.calculateCompletionPercentage();
  }

  // Set is_complete based on completion percentage
  this.is_complete = this.completion_percentage >= 90;

  // Sync alternative consent fields
  if (this.isModified("terms_accepted")) {
    this.agree_terms = this.terms_accepted;
    // Only sync accept if it's not already explicitly set (for corporate training forms)
    if (!this.isModified("accept")) {
      this.accept = this.terms_accepted;
    }
  }

  // Sync terms_accepted from accept field (for corporate training forms)
  if (
    this.isModified("accept") &&
    this.form_type === "corporate_training_inquiry"
  ) {
    this.terms_accepted = this.accept;
    this.privacy_policy_accepted = this.accept;
    this.agree_terms = this.accept;
  }

  // For corporate training forms, ensure professional_info is populated
  if (
    this.form_type === "corporate_training_inquiry" &&
    !this.professional_info
  ) {
    this.professional_info = {};
  }

  next();
});

// Instance method to calculate completion percentage
universalFormSchema.methods.calculateCompletionPercentage = function () {
  let totalFields = 0;
  let completedFields = 0;

  // Core fields (always required)
  const coreFields = [
    "contact_info.full_name",
    "contact_info.email",
    "message",
  ];
  coreFields.forEach((field) => {
    totalFields++;
    if (this.get(field)) completedFields++;
  });

  // Form-type specific required fields
  const requiredFieldsByType = {
    corporate_training_inquiry: [
      "contact_info.phone_number",
      "contact_info.country",
      "professional_info.designation",
      "professional_info.company_name",
      "professional_info.company_website",
      "accept",
    ],
    hire_from_medh_inquiry: [
      "contact_info.phone_number",
      "contact_info.country",
      "professional_info.company_name",
      "professional_info.department",
      "hire_requirements.requirement_type",
      "hire_requirements.training_domain",
      "hire_requirements.detailed_requirements",
      "hire_requirements.team_size",
      "accept",
    ],
    placement_form: [
      "contact_info.first_name",
      "contact_info.last_name",
      "files.resume_url",
      "education_info.highest_education",
      "education_info.university",
    ],
    job_application: ["contact_info.phone_number", "contact_info.country"],
    course_enrollment: [
      "contact_info.phone_number",
      "course_preferences.course_category",
    ],
    add_student_form: [
      "personal_details.age",
      "personal_details.gender",
      "contact_info.phone_number",
    ],
    add_instructor_form: [
      "personal_details.age",
      "personal_details.gender",
      "professional_info.amount_per_session",
    ],
    book_a_free_demo_session: [
      "is_student_under_16",
      "parent_details.name",
      "parent_details.email",
      "parent_details.mobile_no",
      "parent_details.current_city",
      "parent_details.preferred_timings_to_connect",
      "student_details.name",
      "student_details.email",
      "student_details.mobile_no",
      "student_details.current_city",
      "student_details.preferred_timings_to_connect",
      "demo_session_details.preferred_date",
      "demo_session_details.preferred_time_slot",
      "consent.terms_accepted",
      "consent.privacy_policy_accepted",
    ],
  };

  const specificFields = requiredFieldsByType[this.form_type] || [];
  specificFields.forEach((field) => {
    totalFields++;
    if (this.get(field)) completedFields++;
  });

  return totalFields > 0
    ? Math.round((completedFields / totalFields) * 100)
    : 0;
};

// Static methods for common queries
universalFormSchema.statics.findByFormType = function (formType, options = {}) {
  const query = { form_type: formType, is_deleted: false };
  return this.find(query, null, options);
};

universalFormSchema.statics.findPending = function (formType = null) {
  const query = {
    status: { $in: ["submitted", "under_review", "in_progress"] },
    is_deleted: false,
  };
  if (formType) query.form_type = formType;
  return this.find(query).sort({ submitted_at: -1 });
};

universalFormSchema.statics.findIncomplete = function (formType = null) {
  const query = {
    is_complete: false,
    is_deleted: false,
  };
  if (formType) query.form_type = formType;
  return this.find(query).sort({ last_updated_at: -1 });
};

universalFormSchema.statics.getFormStats = function (formType = null) {
  const matchStage = { is_deleted: false };
  if (formType) matchStage.form_type = formType;

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgProcessingTime: {
          $avg: {
            $cond: [
              { $and: ["$processed_at", "$submitted_at"] },
              {
                $divide: [
                  { $subtract: ["$processed_at", "$submitted_at"] },
                  1000 * 60 * 60,
                ],
              },
              null,
            ],
          },
        },
        avgCompletionPercentage: { $avg: "$completion_percentage" },
      },
    },
  ]);
};

universalFormSchema.statics.getFormTypeStats = function () {
  return this.aggregate([
    { $match: { is_deleted: false } },
    {
      $group: {
        _id: "$form_type",
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$is_complete", true] }, 1, 0] },
        },
        pending: {
          $sum: {
            $cond: [
              {
                $in: ["$status", ["submitted", "under_review", "in_progress"]],
              },
              1,
              0,
            ],
          },
        },
        avgCompletionPercentage: { $avg: "$completion_percentage" },
      },
    },
    {
      $project: {
        form_type: "$_id",
        total: 1,
        completed: 1,
        pending: 1,
        completion_rate: {
          $cond: [
            { $gt: ["$total", 0] },
            { $multiply: [{ $divide: ["$completed", "$total"] }, 100] },
            0,
          ],
        },
        avgCompletionPercentage: { $round: ["$avgCompletionPercentage", 2] },
      },
    },
  ]);
};

// Instance methods
universalFormSchema.methods.addInternalNote = function (note, userId) {
  this.internal_notes.push({
    note: note,
    added_by: userId,
    added_at: new Date(),
  });
  return this.save();
};

universalFormSchema.methods.assignTo = function (userId) {
  this.assigned_to = userId;
  if (this.status === "submitted") {
    this.status = "under_review";
  }
  return this.save();
};

universalFormSchema.methods.updateStatus = function (newStatus, userId = null) {
  this.status = newStatus;
  if (userId) {
    this.handled_by = userId;
  }
  return this.save();
};

// Method to create corporate training inquiry from API data
universalFormSchema.statics.createCorporateTraining = async function (data) {
  // Ensure the form type is set correctly
  data.form_type = "corporate_training_inquiry";

  // Normalize contact information
  if (!data.contact_info && (data.full_name || data.email)) {
    data.contact_info = {
      full_name: data.full_name,
      email: data.email,
      phone_number: data.phone_number,
      country: data.country,
    };
  }

  // Normalize professional information
  if (!data.professional_info && (data.company_name || data.designation)) {
    data.professional_info = {
      company_name: data.company_name,
      designation: data.designation,
      company_website: data.company_website,
    };
  }

  // Normalize message and training requirements
  if (
    data.training_requirements &&
    typeof data.training_requirements === "object"
  ) {
    // If training_requirements is an object, try to extract a message
    data.message =
      data.message ||
      data.training_requirements.message ||
      (typeof data.training_requirements === "string"
        ? data.training_requirements
        : JSON.stringify(data.training_requirements));
  }

  // Ensure terms are accepted
  data.terms_accepted = data.terms_accepted || data.accept || false;
  data.privacy_policy_accepted =
    data.privacy_policy_accepted || data.terms_accepted;

  // Set default priority and status for corporate training inquiries
  data.priority = data.priority || "high";
  data.status = data.status || "submitted";

  // Create the form
  const corporateForm = new this(data);

  // Save and return
  return await corporateForm.save();
};

// Static method to create Hire from Medh inquiry
universalFormSchema.statics.createHireFromMedh = async function (data) {
  // Set form type
  data.form_type = "hire_from_medh_inquiry";

  // Normalize contact_info
  if (!data.contact_info && (data.full_name || data.email)) {
    data.contact_info = {
      full_name: data.full_name,
      email: data.email,
      phone_number: data.phone || data.phone_number, // Handle both field names
      country: data.country,
    };
  }

  // Normalize company_info to professional_info
  data.professional_info = data.company_info || {
    company_name: data.company_name,
    company_website: data.company_website,
    department: data.department,
  };

  // Normalize requirements to hire_requirements
  data.hire_requirements = data.requirements || {
    requirement_type: data.requirement_type,
    training_domain: data.training_domain,
    team_size: data.team_size, // Add team_size mapping
    start_date: data.start_date,
    budget_range: data.budget_range,
    detailed_requirements: data.detailed_requirements,
    document_upload: data.document_upload,
    has_document: !!data.document_upload,
  };

  // Map detailed_requirements to message field (required by schema)
  data.message = data.detailed_requirements || data.message;

  // Normalize acceptance
  data.terms_accepted = data.terms_accepted || data.accept || false;
  data.privacy_policy_accepted =
    data.privacy_policy_accepted || data.terms_accepted;
  data.accept = data.terms_accepted; // Ensure accept field is set

  // Default metadata
  data.priority = data.priority || "high";
  data.status = data.status || "submitted";

  // Save form
  const form = new this(data);
  return await form.save();
};

universalFormSchema.methods.markComplete = function () {
  this.is_complete = true;
  this.completion_percentage = 100;
  if (this.status === "submitted" || this.status === "under_review") {
    this.status = "completed";
  }
  return this.save();
};

universalFormSchema.methods.updateStep = function (stepNumber, stepData = {}) {
  this.current_step = stepNumber;
  if (!this.completed_steps.includes(stepNumber)) {
    this.completed_steps.push(stepNumber);
  }

  // Update step data
  Object.keys(stepData).forEach((key) => {
    this.step_data.set(`step_${stepNumber}_${key}`, stepData[key]);
  });

  // Update completion percentage
  this.completion_percentage = this.calculateCompletionPercentage();

  return this.save();
};

const UniversalForm = mongoose.model("UniversalForm", universalFormSchema);
export default UniversalForm;
