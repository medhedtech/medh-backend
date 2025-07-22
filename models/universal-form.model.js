import mongoose from "mongoose";
import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";
import countryService from "../utils/countryService.js";

// Common validation patterns
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[a-zA-Z\s'-]+$/;
const URL_REGEX = /^https?:\/\/.+/;

// Enhanced contact information schema
const contactInfoSchema = new mongoose.Schema(
  {
    // Name fields (separate as per requirements)
    first_name: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return NAME_REGEX.test(v);
        },
        message: "First name should contain only alphabets",
      },
    },
    middle_name: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || NAME_REGEX.test(v);
        },
        message: "Middle name should contain only alphabets",
      },
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return NAME_REGEX.test(v);
        },
        message: "Last name should contain only alphabets",
      },
    },
    full_name: {
      type: String,
      trim: true,
    }, // Auto-generated from first + middle + last

    // Contact details
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (email) {
          return EMAIL_REGEX.test(email);
        },
        message: "Please enter a valid email address",
      },
    },

    // Mobile number with enhanced validation and normalization
    mobile_number: {
      country_code: {
        type: String,
        required: true,
        validate: {
          validator: function (code) {
            return /^\+\d{1,4}$/.test(code);
          },
          message: "Country code must be in format +XX",
        },
      },
      number: {
        type: String,
        required: true,
        // ✅ ADD: Normalize phone number format
        set: function (value) {
          if (!value) return value;

          // Remove all non-digit characters
          const cleanNumber = value.toString().replace(/\D/g, "");

          // If number starts with country code digits, remove them
          const countryCode = this.country_code || this.parent()?.country_code;
          if (countryCode) {
            const countryDigits = countryCode.replace(/\D/g, "");
            if (cleanNumber.startsWith(countryDigits)) {
              return cleanNumber.substring(countryDigits.length);
            }
          }

          // Handle common country code patterns
          if (cleanNumber.startsWith("91") && cleanNumber.length === 12) {
            // Indian numbers: 91XXXXXXXXXX -> XXXXXXXXXX
            return cleanNumber.substring(2);
          }
          if (cleanNumber.startsWith("1") && cleanNumber.length === 11) {
            // US numbers: 1XXXXXXXXXX -> XXXXXXXXXX
            return cleanNumber.substring(1);
          }

          return cleanNumber;
        },
        validate: {
          validator: function (number) {
            // Should be 10 digits for most countries after normalization
            const cleanNumber = number.replace(/\D/g, "");
            return /^\d{10}$/.test(cleanNumber);
          },
          message: "Please enter a valid mobile number",
        },
      },
      formatted: String,
      is_validated: {
        type: Boolean,
        default: false,
      },
    },

    // Location fields
    city: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return (
            countryService.isValidCountryName(v) ||
            countryService.isValidCountryCode(v.toUpperCase())
          );
        },
        message: "Please select a valid country",
      },
    },
    address: {
      type: String,
      trim: true,
    },

    // Social media profiles
    social_profiles: {
      linkedin: {
        type: String,
        trim: true,
        validate: {
          validator: function (v) {
            return !v || /^https?:\/\/(www\.)?linkedin\.com\/.+/.test(v);
          },
          message: "Please enter a valid LinkedIn URL",
        },
      },
      facebook: {
        type: String,
        trim: true,
        validate: {
          validator: function (v) {
            return !v || /^https?:\/\/(www\.)?facebook\.com\/.+/.test(v);
          },
          message: "Please enter a valid Facebook URL",
        },
      },
      instagram: {
        type: String,
        trim: true,
        validate: {
          validator: function (v) {
            return !v || /^https?:\/\/(www\.)?instagram\.com\/.+/.test(v);
          },
          message: "Please enter a valid Instagram URL",
        },
      },
      portfolio: {
        type: String,
        trim: true,
        validate: {
          validator: function (v) {
            return !v || URL_REGEX.test(v);
          },
          message: "Please enter a valid portfolio URL",
        },
      },
    },
  },
  { _id: false },
);

// Enhanced inquiry details schema (for contact forms)
const inquiryDetailsSchema = new mongoose.Schema(
  {
    inquiry_type: {
      type: String,
      enum: [
        "course_information",
        "enrollment_assistance",
        "technical_support",
        "billing_payment",
        "corporate_training",
        "membership_plans",
        "hiring_solutions",
        "partnership_opportunities",
        "media_press",
        "general_inquiry",
        "feedback_complaint",
      ],
    },
    preferred_contact_method: {
      type: String,
      enum: ["email", "phone", "whatsapp"],
      default: "email",
    },
    urgency_level: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    course_interest: [
      {
        type: String,
        enum: [
          // AI and Data Science
          "ai_data_science",
          "ai_for_professionals",
          "ai_in_finance",
          "ai_in_healthcare",
          "ai_in_manufacturing",

          // Digital Marketing
          "digital_marketing",
          "social_media_marketing",
          "brand_management",
          "online_reputation_management",

          // Business & Management
          "business_analysis_strategy",
          "entrepreneurship_startup",
          "marketing_sales_strategy",

          // Technical Skills
          "programming_python",
          "programming_scala",
          "programming_r",
          "cloud_computing",
          "cybersecurity",

          // Finance & Accounts
          "finance_startups",
          "financial_statement_mis",
          "tax_computation_filing",

          // Personal Development
          "personality_development",
          "vedic_mathematics",
          "emotional_intelligence",
          "public_speaking",
          "time_management",

          // Career Development
          "job_search_strategies",
          "personal_branding",
          "resume_interview_prep",

          // Language & Communication
          "business_english",
          "french_language",
          "mandarin_language",
          "spanish_language",

          // Health & Wellness
          "mental_health_awareness",
          "nutrition_diet_planning",
          "yoga_mindfulness",

          // Industry Specific
          "healthcare_medical_coding",
          "hospitality_tourism",
          "interior_designing",
          "legal_compliance",

          // Environmental & Sustainability
          "renewable_energy",
          "sustainable_agriculture",
          "sustainable_housing",

          // Other
          "other",
        ],
      },
    ],
    company_size: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "500+", "not_applicable"],
    },
    budget_range: {
      type: String,
      enum: [
        "under_10k",
        "10k_50k",
        "50k_1l",
        "1l_5l",
        "5l_plus",
        "not_disclosed",
      ],
    },
    timeline: {
      type: String,
      enum: [
        "immediate",
        "within_week",
        "within_month",
        "within_quarter",
        "flexible",
      ],
    },
    heard_about_us: {
      type: String,
      enum: [
        "google_search",
        "social_media",
        "referral_friend",
        "referral_colleague",
        "advertisement",
        "blog_article",
        "webinar_event",
        "partner_institution",
        "other",
      ],
    },
    additional_requirements: { type: String, trim: true },
  },
  { _id: false },
);

// Professional information schema (for corporate training and career forms)
const professionalInfoSchema = new mongoose.Schema(
  {
    designation: {
      type: String,
      required: function () {
        return this.parent().form_type === "corporate_training_inquiry";
      },
      trim: true,
      minlength: [2, "Designation must be at least 2 characters"],
      maxlength: [100, "Designation cannot exceed 100 characters"],
    },
    company_name: {
      type: String,
      required: function () {
        return this.parent().form_type === "corporate_training_inquiry";
      },
      trim: true,
      minlength: [2, "Company name must be at least 2 characters"],
      maxlength: [150, "Company name cannot exceed 150 characters"],
    },
    company_website: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional field
          return /^(https?:\/\/)?(www\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+([\/\w\.-]*)*\/?$/.test(
            v,
          );
        },
        message: "Please enter a valid company website URL",
      },
    },
    industry: {
      type: String,
      trim: true,
      enum: [
        "technology",
        "healthcare",
        "finance",
        "education",
        "manufacturing",
        "retail",
        "consulting",
        "government",
        "non_profit",
        "other",
      ],
    },
    company_size: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "500+"],
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, "Department name cannot exceed 100 characters"],
    },
    experience_level: {
      type: String,
      enum: ["entry", "mid", "senior", "executive"],
    },
  },
  { _id: false },
);

// Training requirements schema (specific for corporate training)
const trainingRequirementsSchema = new mongoose.Schema(
  {
    training_type: {
      type: String,
      enum: [
        "technical_skills",
        "soft_skills",
        "leadership",
        "compliance",
        "product_training",
        "sales_training",
        "customer_service",
        "digital_transformation",
        "other",
      ],
    },
    training_mode: {
      type: String,
      enum: ["online", "onsite", "hybrid", "flexible"],
      default: "flexible",
    },
    participants_count: {
      type: Number,
      min: [1, "Must have at least 1 participant"],
      max: [10000, "Maximum 10,000 participants allowed"],
    },
    duration_preference: {
      type: String,
      enum: [
        "1_day",
        "2-3_days",
        "1_week",
        "2-4_weeks",
        "1-3_months",
        "ongoing",
      ],
    },
    budget_range: {
      type: String,
      enum: [
        "under_1l",
        "1l_5l",
        "5l_10l",
        "10l_25l",
        "25l_50l",
        "50l_plus",
        "not_disclosed",
      ],
    },
    timeline: {
      type: String,
      enum: [
        "immediate",
        "within_month",
        "within_quarter",
        "within_6months",
        "flexible",
      ],
    },
    specific_skills: [String],
    custom_requirements: {
      type: String,
      trim: true,
      maxlength: [2000, "Custom requirements cannot exceed 2000 characters"],
    },
    has_existing_lms: {
      type: Boolean,
      default: false,
    },
    lms_integration_needed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

// Demo session schemas for book-a-free-demo-session form type

// Parent details schema (for students under 16) - simplified to avoid duplication
const parentDetailsSchema = new mongoose.Schema(
  {
    preferred_timings: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

// Student details schema - simplified to avoid duplication with contact_info
const studentDetailsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: function () {
        return this.parent().form_type === "book_a_free_demo_session";
      },
      trim: true,
      validate: {
        validator: function (v) {
          return NAME_REGEX.test(v);
        },
        message: "Student name should contain only alphabets",
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (email) {
          return !email || EMAIL_REGEX.test(email);
        },
        message: "Please enter a valid email address",
      },
    },
    preferred_timings: {
      type: String,
      trim: true,
    },
    // For students under 16
    grade: {
      type: String,
      enum: [
        "grade_1-2",
        "grade_3-4",
        "grade_5-6",
        "grade_7-8",
        "grade_9-10",
        "grade_11-12",
        "home_study",
        // ✅ ADD: Support for alternative formats
        "grade-1-2",
        "grade-3-4",
        "grade-5-6",
        "grade-7-8",
        "grade-9-10",
        "grade-11-12",
        "Grade 1-2",
        "Grade 3-4",
        "Grade 5-6",
        "Grade 7-8",
        "Grade 9-10",
        "Grade 11-12",
        "Home Study",
      ],
      required: function () {
        return this.parent().is_student_under_16;
      },
      // ✅ ADD: Normalize grade format
      set: function (value) {
        if (!value) return value;

        // Normalize to standard format: grade_X-Y
        const normalizeGrade = (grade) => {
          const gradeStr = grade.toString().toLowerCase().trim();

          // Handle "home study" variations
          if (gradeStr.includes("home") && gradeStr.includes("study")) {
            return "home_study";
          }

          // Handle grade patterns
          const gradeMatch = gradeStr.match(/(\d+)[-\s]*(\d+)/);
          if (gradeMatch) {
            const [, start, end] = gradeMatch;
            return `grade_${start}-${end}`;
          }

          // Return as-is if no pattern matches
          return gradeStr;
        };

        return normalizeGrade(value);
      },
    },
    school_name: {
      type: String,
      trim: true,
    },
    // For students 16 and above
    highest_qualification: {
      type: String,
      enum: [
        "10th_passed",
        "12th_passed",
        "undergraduate",
        "graduate",
        "post_graduate",
      ],
      required: function () {
        return !this.parent().is_student_under_16;
      },
    },
    currently_studying: {
      type: Boolean,
      required: function () {
        return !this.parent().is_student_under_16;
      },
    },
    currently_working: {
      type: Boolean,
      required: function () {
        return !this.parent().is_student_under_16;
      },
    },
    education_institute_name: {
      type: String,
      trim: true,
    },
    // Common fields
    preferred_course: [
      {
        type: String,
        required: function () {
          return this.parent().form_type === "book_a_free_demo_session";
        },
        // Will be populated with actual live course IDs
      },
    ],
  },
  { _id: false },
);

// Demo session details schema
const demoSessionDetailsSchema = new mongoose.Schema(
  {
    preferred_date: {
      type: Date,
      validate: {
        validator: function (date) {
          return !date || date > new Date();
        },
        message: "Preferred date must be in the future",
      },
    },
    preferred_time_slot: {
      type: String,
      enum: [
        // ✅ NEW: Static time slots
        "morning 9-12",
        "afternoon 12-5",
        "evening 5-10",
        // ✅ EXISTING: Hourly time slots (for backward compatibility)
        "09:00-10:00",
        "10:00-11:00",
        "11:00-12:00",
        "12:00-13:00",
        "13:00-14:00",
        "14:00-15:00",
        "15:00-16:00",
        "16:00-17:00",
        "17:00-18:00",
        "18:00-19:00",
        "19:00-20:00",
        "20:00-21:00",
      ],
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
    demo_status: {
      type: String,
      enum: ["scheduled", "confirmed", "completed", "cancelled", "rescheduled"],
      default: "scheduled",
    },
    zoom_meeting_id: String,
    zoom_meeting_url: String,
    zoom_passcode: String,
    instructor_assigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    demo_completion_date: Date,
    demo_feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comments: String,
      would_recommend: Boolean,
    },
  },
  { _id: false },
);

// Employment information schema (for candidate applications)
const employmentInfoSchema = new mongoose.Schema(
  {
    has_work_experience: {
      type: Boolean,
      required: true,
    },
    currently_employed: {
      type: Boolean,
      required: function () {
        return this.has_work_experience;
      },
    },
    current_company: {
      name: { type: String, trim: true },
      designation: { type: String, trim: true },
      working_since: {
        month: { type: String, trim: true },
        year: { type: Number, min: 1950, max: new Date().getFullYear() },
      },
    },
    previous_company: {
      name: { type: String, trim: true },
      designation: { type: String, trim: true },
      last_working_day: { type: Date },
    },
    preferred_work_mode: {
      type: String,
      enum: ["wfh", "wfo", "hybrid"],
      required: true,
    },
  },
  { _id: false },
);

// Education information schema
const educationInfoSchema = new mongoose.Schema(
  {
    highest_qualification: {
      type: String,
      enum: ["10th", "12th", "ug", "graduate", "pg"],
      required: true,
    },
    specialization: { type: String, trim: true },
    years_of_experience: {
      type: String,
      enum: ["fresher", "1-3", "4-6", "7-10", "10+"],
    },
    current_institution: {
      name: { type: String, trim: true },
      role: { type: String, trim: true },
      start_date: { type: Date },
      end_date: { type: Date },
    },
  },
  { _id: false },
);

// Institution information schema (for partnerships)
const institutionInfoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "primary",
        "secondary",
        "high_school",
        "college",
        "university",
        "coaching",
        "other",
      ],
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || URL_REGEX.test(v);
        },
        message: "Please enter a valid website URL",
      },
    },
    year_of_establishment: {
      type: Number,
      min: 1800,
      max: new Date().getFullYear(),
    },
    address: { type: String, trim: true },
    social_media: {
      website: String,
      linkedin: String,
      facebook: String,
      instagram: String,
    },
  },
  { _id: false },
);

// Partnership details schema
const partnershipDetailsSchema = new mongoose.Schema(
  {
    program_interests: [
      {
        type: String,
        trim: true,
      },
    ],
    other_interests: { type: String, trim: true },
    target_grades: [
      {
        type: String,
        enum: [
          "grades_1-5",
          "grades_6-8",
          "grades_9-10",
          "grades_11-12",
          "ug",
          "pg",
        ],
      },
    ],
    preferred_mode: {
      type: String,
      enum: ["on_campus", "online", "hybrid", "flexible"],
    },
    timeline: {
      type: String,
      enum: [
        "immediate",
        "short_term",
        "medium_term",
        "long_term",
        "exploratory",
      ],
    },
    additional_notes: { type: String, trim: true },
    referral_source: {
      type: String,
      enum: [
        "social_media",
        "email_campaign",
        "event",
        "referral",
        "website",
        "other",
      ],
    },
  },
  { _id: false },
);

// Teaching information schema (for educators)
const teachingInfoSchema = new mongoose.Schema(
  {
    preferred_teaching_mode: {
      type: String,
      enum: ["in_person", "remote", "hybrid", "flexible"],
      required: true,
    },
    engagement_type: [
      {
        type: String,
        enum: ["full_time", "part_time", "hourly"],
        required: true,
      },
    ],
    subject_areas: [
      {
        type: String,
        trim: true,
      },
    ],
    grade_levels: [
      {
        type: String,
        enum: [
          "elementary",
          "middle_school",
          "high_school",
          "undergraduate",
          "postgraduate",
        ],
      },
    ],
    certifications: [{ type: String, trim: true }],
    it_assets: {
      has_computer: { type: Boolean, required: true },
      has_webcam: { type: Boolean, required: true },
      has_microphone: { type: Boolean, required: true },
      internet_quality: {
        type: String,
        enum: ["excellent", "good", "average", "poor"],
        required: true,
      },
      teaching_platform_experience: { type: Boolean, required: true },
    },
    teaching_portfolio: {
      portfolio_link: { type: String, trim: true },
      video_url: { type: String, trim: true },
      uploaded_file: { type: String, trim: true },
    },
    availability: {
      weekly_hours: {
        type: String,
        enum: ["less_than_10", "10-20", "21-30", "31-40", "more_than_40"],
        required: true,
      },
      preferred_schedule: {
        monday: { available: Boolean, start_time: String, end_time: String },
        tuesday: { available: Boolean, start_time: String, end_time: String },
        wednesday: { available: Boolean, start_time: String, end_time: String },
        thursday: { available: Boolean, start_time: String, end_time: String },
        friday: { available: Boolean, start_time: String, end_time: String },
        saturday: { available: Boolean, start_time: String, end_time: String },
        sunday: { available: Boolean, start_time: String, end_time: String },
      },
      notice_period: {
        type: String,
        enum: ["immediate", "1_week", "2_weeks", "1_month", "more_than_month"],
        required: true,
      },
    },
  },
  { _id: false },
);

// File upload schema
const fileUploadSchema = new mongoose.Schema(
  {
    resume: {
      filename: String,
      original_name: String,
      mimetype: String,
      size: Number,
      url: String,
      uploaded_at: { type: Date, default: Date.now },
    },
    additional_documents: [
      {
        filename: String,
        original_name: String,
        mimetype: String,
        size: Number,
        url: String,
        document_type: String,
        uploaded_at: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: false },
);

// Consent schema
const consentSchema = new mongoose.Schema(
  {
    terms_and_privacy: {
      type: Boolean,
      required: true,
      validate: {
        validator: function (v) {
          return v === true;
        },
        message: "You must agree to the Terms of Use and Privacy Policy",
      },
    },
    data_collection_consent: {
      type: Boolean,
      required: true,
      validate: {
        validator: function (v) {
          return v === true;
        },
        message: "Consent for data collection is required",
      },
    },
    marketing_consent: {
      type: Boolean,
      default: false,
    },
    accuracy_declaration: {
      type: Boolean,
      required: function () {
        return ["educator_application", "candidate_application"].includes(
          this.parent().form_type,
        );
      },
      validate: {
        validator: function (v) {
          if (
            ["educator_application", "candidate_application"].includes(
              this.parent().form_type,
            )
          ) {
            return v === true;
          }
          return true;
        },
        message: "You must declare the accuracy of the information provided",
      },
    },
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
        "candidate_application",
        "school_partnership",
        "educator_application",
        "general_contact",
        // Enhanced contact form types based on website structure
        "corporate_training_inquiry",
        "membership_inquiry",
        "hire_from_medh_inquiry",
        "course_inquiry",
        "support_request",
        "partnership_inquiry",
        "media_inquiry",
        "technical_support",
        "billing_inquiry",
        "feedback_submission",
        // Demo session booking
        "book_a_free_demo_session",
      ],
    },
    application_id: {
      type: String,
      unique: true,
      default: function () {
        const prefix = this.form_type.toUpperCase().substring(0, 3);
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}${timestamp}${random}`;
      },
    },

    // ✅ ADD: form_id field to match database index
    form_id: {
      type: String,
      unique: true,
      sparse: true, // Allows null values but enforces uniqueness for non-null values
      default: function () {
        const prefix = this.form_type.toUpperCase().substring(0, 3);
        const timestamp = Date.now().toString().slice(-6); // Different slice for form_id
        const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // Different length
        return `FORM_${prefix}_${timestamp}_${random}`;
      },
    },

    // User reference (optional - for logged-in users)
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Auto-fill metadata
    auto_filled: {
      type: Boolean,
      default: false,
    },
    auto_fill_source: {
      type: String,
      enum: ["user_profile", "previous_form", "oauth_data"],
    },
    auto_filled_fields: [String],

    // Core contact information (required for all forms)
    contact_info: {
      type: contactInfoSchema,
      required: true,
    },

    // Form-specific fields
    // For candidate applications
    post_applying_for: {
      type: String,
      trim: true,
      required: function () {
        return this.form_type === "candidate_application";
      },
    },
    employment_info: {
      type: employmentInfoSchema,
      required: function () {
        return this.form_type === "candidate_application";
      },
    },
    remarks: {
      type: String,
      trim: true,
    },

    // For school partnerships
    representative_position: {
      type: String,
      trim: true,
      required: function () {
        return this.form_type === "school_partnership";
      },
    },
    institution_info: {
      type: institutionInfoSchema,
      required: function () {
        return this.form_type === "school_partnership";
      },
    },
    partnership_details: {
      type: partnershipDetailsSchema,
      required: function () {
        return this.form_type === "school_partnership";
      },
    },

    // For educator applications
    education_info: {
      type: educationInfoSchema,
      required: function () {
        return this.form_type === "educator_application";
      },
    },
    teaching_info: {
      type: teachingInfoSchema,
      required: function () {
        return this.form_type === "educator_application";
      },
    },

    // For general contact
    subject: {
      type: String,
      trim: true,
      required: function () {
        return this.form_type === "general_contact";
      },
    },
    message: {
      type: String,
      trim: true,
      required: function () {
        return this.form_type === "general_contact";
      },
      minlength: [10, "Message must be at least 10 characters long"],
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },

    // Enhanced inquiry details for contact forms
    inquiry_details: {
      type: inquiryDetailsSchema,
      required: function () {
        return [
          "corporate_training_inquiry",
          "membership_inquiry",
          "hire_from_medh_inquiry",
          "course_inquiry",
          "support_request",
          "partnership_inquiry",
          "media_inquiry",
          "technical_support",
          "billing_inquiry",
          "feedback_submission",
        ].includes(this.form_type);
      },
    },

    // Professional information for corporate training
    professional_info: {
      type: professionalInfoSchema,
      required: function () {
        return this.form_type === "corporate_training_inquiry";
      },
    },

    // Training requirements for corporate training
    training_requirements: {
      type: trainingRequirementsSchema,
      required: function () {
        return this.form_type === "corporate_training_inquiry";
      },
    },

    // Demo session booking fields (for book_a_free_demo_session)
    is_student_under_16: {
      type: Boolean,
      required: function () {
        return this.form_type === "book_a_free_demo_session";
      },
    },
    parent_details: {
      type: parentDetailsSchema,
      required: function () {
        return (
          this.form_type === "book_a_free_demo_session" &&
          this.is_student_under_16
        );
      },
    },
    student_details: {
      type: studentDetailsSchema,
      required: function () {
        return this.form_type === "book_a_free_demo_session";
      },
    },
    demo_session_details: {
      type: demoSessionDetailsSchema,
      required: function () {
        return this.form_type === "book_a_free_demo_session";
      },
    },

    // File uploads
    files: fileUploadSchema,

    // Captcha validation
    captcha_token: {
      type: String,
      required: true,
    },
    captcha_validated: {
      type: Boolean,
      default: false,
    },

    // Consent and agreements
    consent: {
      type: consentSchema,
      required: true,
    },

    // Status and workflow
    status: {
      type: String,
      enum: [
        "submitted",
        "acknowledged",
        "under_review",
        "shortlisted",
        "interview_scheduled",
        "selected",
        "rejected",
        "on_hold",
        "completed",
      ],
      default: "submitted",
    },

    // Priority based on form type
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: function () {
        const priorities = {
          candidate_application: "medium",
          educator_application: "high",
          school_partnership: "high",
          general_contact: "low",
          corporate_training_inquiry: "high",
          membership_inquiry: "medium",
          hire_from_medh_inquiry: "high",
          course_inquiry: "medium",
          support_request: "medium",
          partnership_inquiry: "high",
          media_inquiry: "medium",
          technical_support: "high",
          billing_inquiry: "high",
          feedback_submission: "low",
          book_a_free_demo_session: "high",
        };
        return priorities[this.form_type] || "medium";
      },
    },

    // Assignment and handling
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    department: {
      type: String,
      enum: [
        "hr",
        "partnerships",
        "teaching",
        "support",
        "sales",
        "technical",
        "billing",
      ],
      default: function () {
        const departments = {
          candidate_application: "hr",
          educator_application: "teaching",
          school_partnership: "partnerships",
          general_contact: "support",
          corporate_training_inquiry: "sales",
          membership_inquiry: "sales",
          hire_from_medh_inquiry: "partnerships",
          course_inquiry: "sales",
          support_request: "support",
          partnership_inquiry: "partnerships",
          media_inquiry: "support",
          technical_support: "technical",
          billing_inquiry: "billing",
          feedback_submission: "support",
          book_a_free_demo_session: "sales",
        };
        return departments[this.form_type];
      },
    },

    // Email acknowledgment tracking
    acknowledgment_sent: {
      type: Boolean,
      default: false,
    },
    acknowledgment_sent_at: {
      type: Date,
    },
    acknowledgment_email: {
      type: String,
      default: function () {
        const emails = {
          candidate_application: "careers@medh.co",
          educator_application: "teach@medh.co",
          school_partnership: "partnerships@medh.co",
          general_contact: "care@medh.co",
          corporate_training_inquiry: "corporate@medh.co",
          membership_inquiry: "membership@medh.co",
          hire_from_medh_inquiry: "hire@medh.co",
          course_inquiry: "courses@medh.co",
          support_request: "care@medh.co",
          partnership_inquiry: "partnerships@medh.co",
          media_inquiry: "media@medh.co",
          technical_support: "tech@medh.co",
          billing_inquiry: "billing@medh.co",
          feedback_submission: "care@medh.co",
          book_a_free_demo_session: "demo@medh.co",
        };
        return emails[this.form_type];
      },
    },

    // Internal notes
    internal_notes: [
      {
        note: { type: String, trim: true },
        added_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        added_at: { type: Date, default: Date.now },
      },
    ],

    // Source tracking
    source: {
      type: String,
      enum: ["website", "mobile_app", "admin_panel", "api", "referral"],
      default: "website",
    },
    referrer: { type: String, trim: true },

    // Metadata
    ip_address: { type: String, trim: true },
    user_agent: { type: String, trim: true },
    browser_info: {
      name: String,
      version: String,
      os: String,
    },

    // Timestamps
    submitted_at: { type: Date, default: Date.now },
    processed_at: { type: Date },
    completed_at: { type: Date },

    // Soft delete
    is_deleted: { type: Boolean, default: false },
    deleted_at: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for performance
universalFormSchema.index({ form_type: 1, status: 1 });
universalFormSchema.index({ application_id: 1 });
universalFormSchema.index({ "contact_info.email": 1 });
universalFormSchema.index({ submitted_at: -1 });
universalFormSchema.index({ assigned_to: 1, status: 1 });
universalFormSchema.index({ user_id: 1, form_type: 1 });
universalFormSchema.index({ department: 1, status: 1 });

// Virtual for form age
universalFormSchema.virtual("form_age_days").get(function () {
  return Math.floor((Date.now() - this.submitted_at) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
universalFormSchema.pre("save", async function (next) {
  // Generate full name from name components
  if (this.contact_info) {
    const { first_name, middle_name, last_name } = this.contact_info;
    this.contact_info.full_name = [first_name, middle_name, last_name]
      .filter(Boolean)
      .join(" ");
  }

  // Format and validate phone number
  if (this.contact_info?.mobile_number) {
    try {
      const { country_code, number } = this.contact_info.mobile_number;
      const fullNumber = `${country_code}${number}`;
      const phoneNumber = parsePhoneNumber(fullNumber);

      if (phoneNumber && phoneNumber.isValid()) {
        this.contact_info.mobile_number.formatted =
          phoneNumber.formatInternational();
        this.contact_info.mobile_number.is_validated = true;
      }
    } catch (error) {
      console.warn("Phone number formatting failed:", error.message);
    }
  }

  // Handle demo session form specific logic
  if (this.form_type === "book_a_free_demo_session") {
    // For students under 16, use parent details for contact_info
    if (this.is_student_under_16 && this.parent_details) {
      // Parent contact info should be in the main contact_info field
      // Student name goes to student_details
      if (!this.contact_info.full_name && this.parent_details.name) {
        this.contact_info.full_name = this.parent_details.name;
      }
    } else if (!this.is_student_under_16 && this.student_details) {
      // For students 16+, use student details for contact_info
      if (!this.contact_info.full_name && this.student_details.name) {
        this.contact_info.full_name = this.student_details.name;
      }
      if (!this.contact_info.email && this.student_details.email) {
        this.contact_info.email = this.student_details.email;
      }
    }
  }

  // Auto-fill from user profile if user_id is provided and form is new
  if (this.user_id && this.isNew && !this.auto_filled) {
    try {
      await this.autoFillFromUser();
    } catch (error) {
      console.warn("Auto-fill failed:", error.message);
    }
  }

  // Set processed_at when status changes from submitted
  if (
    this.isModified("status") &&
    this.status !== "submitted" &&
    !this.processed_at
  ) {
    this.processed_at = new Date();
  }

  // Set completed_at when status is completed/selected/rejected
  if (
    this.isModified("status") &&
    ["completed", "selected", "rejected"].includes(this.status) &&
    !this.completed_at
  ) {
    this.completed_at = new Date();
  }

  next();
});

// Auto-fill method to populate form data from user profile
universalFormSchema.methods.autoFillFromUser = async function () {
  if (!this.user_id) return;

  try {
    const User = mongoose.model("User");
    const user = await User.findById(this.user_id).select(
      "full_name email phone_numbers country timezone address organization bio " +
        "linkedin_link github_link portfolio_link meta.occupation meta.industry " +
        "meta.company meta.experience_level meta.education_level",
    );

    if (!user) return;

    const autoFilledFields = [];

    // Auto-fill contact information
    if (user.full_name && !this.contact_info.full_name) {
      const nameParts = user.full_name.split(" ");
      this.contact_info.first_name = nameParts[0] || "";
      this.contact_info.last_name = nameParts[nameParts.length - 1] || "";
      if (nameParts.length > 2) {
        this.contact_info.middle_name = nameParts.slice(1, -1).join(" ");
      }
      autoFilledFields.push(
        "contact_info.first_name",
        "contact_info.last_name",
      );
    }

    if (user.email && !this.contact_info.email) {
      this.contact_info.email = user.email;
      autoFilledFields.push("contact_info.email");
    }

    if (
      user.phone_numbers?.length > 0 &&
      !this.contact_info.mobile_number?.number
    ) {
      const primaryPhone = user.phone_numbers[0];
      this.contact_info.mobile_number = {
        country_code: primaryPhone.country || "+91",
        number: primaryPhone.number,
      };
      autoFilledFields.push("contact_info.mobile_number");
    }

    if (user.country && !this.contact_info.country) {
      this.contact_info.country = user.country;
      autoFilledFields.push("contact_info.country");
    }

    if (user.address && !this.contact_info.address) {
      this.contact_info.address = user.address;
      autoFilledFields.push("contact_info.address");
    }

    // Auto-fill social profiles
    if (user.linkedin_link && !this.contact_info.social_profiles?.linkedin) {
      if (!this.contact_info.social_profiles)
        this.contact_info.social_profiles = {};
      this.contact_info.social_profiles.linkedin = user.linkedin_link;
      autoFilledFields.push("contact_info.social_profiles.linkedin");
    }

    if (user.portfolio_link && !this.contact_info.social_profiles?.portfolio) {
      if (!this.contact_info.social_profiles)
        this.contact_info.social_profiles = {};
      this.contact_info.social_profiles.portfolio = user.portfolio_link;
      autoFilledFields.push("contact_info.social_profiles.portfolio");
    }

    // Form-specific auto-fill
    if (this.form_type === "educator_application" && this.education_info) {
      if (
        user.meta?.education_level &&
        !this.education_info.highest_qualification
      ) {
        this.education_info.highest_qualification = user.meta.education_level;
        autoFilledFields.push("education_info.highest_qualification");
      }
    }

    // Set auto-fill metadata
    if (autoFilledFields.length > 0) {
      this.auto_filled = true;
      this.auto_fill_source = "user_profile";
      this.auto_filled_fields = autoFilledFields;
    }
  } catch (error) {
    console.error("Error auto-filling form from user:", error);
    throw error;
  }
};

// Method to get auto-fill data for frontend
universalFormSchema.methods.getAutoFillData = async function (userId) {
  if (!userId) return null;

  try {
    const User = mongoose.model("User");
    const user = await User.findById(userId).select(
      "full_name email phone_numbers country timezone address organization " +
        "linkedin_link github_link portfolio_link facebook_link instagram_link " +
        "meta.occupation meta.industry meta.company meta.experience_level " +
        "meta.education_level meta.skills user_image",
    );

    if (!user) return null;

    const nameParts = user.full_name ? user.full_name.split(" ") : ["", ""];

    return {
      contact_info: {
        first_name: nameParts[0] || "",
        middle_name:
          nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "",
        last_name: nameParts[nameParts.length - 1] || "",
        email: user.email || "",
        mobile_number: {
          country_code: user.phone_numbers?.[0]?.country || "+91",
          number: user.phone_numbers?.[0]?.number || "",
        },
        city: user.address?.split(",")[0] || "",
        country: user.country || "",
        address: user.address || "",
        social_profiles: {
          linkedin: user.linkedin_link || "",
          facebook: user.facebook_link || "",
          instagram: user.instagram_link || "",
          portfolio: user.portfolio_link || "",
        },
      },
      education_info: {
        highest_qualification: user.meta?.education_level || "",
        specialization: user.meta?.skills?.[0] || "",
        years_of_experience: user.meta?.experience_level || "",
      },
      professional_info: {
        current_company: {
          name: user.meta?.company || "",
          designation: user.meta?.occupation || "",
        },
      },
    };
  } catch (error) {
    console.error("Error getting auto-fill data:", error);
    return null;
  }
};

// Static method to create form with auto-fill
universalFormSchema.statics.createWithAutoFill = async function (
  formData,
  userId = null,
) {
  const form = new this(formData);

  if (userId) {
    form.user_id = userId;
  }

  return await form.save();
};

// Static method to get auto-fill data without creating form
universalFormSchema.statics.getAutoFillData = async function (userId) {
  if (!userId) return null;

  const tempForm = new this();
  return await tempForm.getAutoFillData(userId);
};

// Static methods for form-specific queries
universalFormSchema.statics.findByFormType = function (formType, options = {}) {
  const query = { form_type: formType, is_deleted: false };
  return this.find(query, null, options);
};

universalFormSchema.statics.findPendingApplications = function (
  formType = null,
) {
  const query = {
    status: { $in: ["submitted", "acknowledged", "under_review"] },
    is_deleted: false,
  };
  if (formType) query.form_type = formType;
  return this.find(query).sort({ submitted_at: -1 });
};

universalFormSchema.statics.findByDepartment = function (department) {
  return this.find({
    department: department,
    is_deleted: false,
  }).sort({ submitted_at: -1 });
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
    this.assigned_to = userId;
  }
  return this.save();
};

universalFormSchema.methods.markAcknowledged = function () {
  this.acknowledgment_sent = true;
  this.acknowledgment_sent_at = new Date();
  if (this.status === "submitted") {
    this.status = "acknowledged";
  }
  return this.save();
};

// Method to get form summary for email templates
universalFormSchema.methods.getFormSummary = function () {
  const summary = {
    application_id: this.application_id,
    form_type: this.form_type,
    submitted_at: this.submitted_at,
    contact_info: this.contact_info,
    status: this.status,
  };

  // Add form-specific data
  switch (this.form_type) {
    case "candidate_application":
      summary.post_applying_for = this.post_applying_for;
      summary.experience = this.employment_info?.has_work_experience
        ? "Experienced"
        : "Fresher";
      break;
    case "educator_application":
      summary.teaching_mode = this.teaching_info?.preferred_teaching_mode;
      summary.subjects = this.teaching_info?.subject_areas;
      break;
    case "school_partnership":
      summary.institution = this.institution_info?.name;
      summary.institution_type = this.institution_info?.type;
      break;
    case "general_contact":
      summary.subject = this.subject;
      break;
  }

  return summary;
};

const UniversalForm = mongoose.model("UniversalForm", universalFormSchema);
export default UniversalForm;
