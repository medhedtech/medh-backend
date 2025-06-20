import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const { Schema } = mongoose;

// Define constants for roles and permissions for better maintainability
const ROLES = {
  ADMIN: "admin",
  STUDENT: "student",
  INSTRUCTOR: "instructor",
  CORPORATE: "corporate",
  CORPORATE_STUDENT: "corporate-student",
  PARENT: "parent",
};

const PERMISSIONS = {
  COURSE_MANAGEMENT: "course_management",
  STUDENT_MANAGEMENT: "student_management",
  INSTRUCTOR_MANAGEMENT: "instructor_management",
  CORPORATE_MANAGEMENT: "corporate_management",
  GENERATE_CERTIFICATE: "generate_certificate",
  GET_IN_TOUCH: "get_in_touch",
  ENQUIRY_FORM: "enquiry_form",
  POST_JOB: "post_job",
  FEEDBACK_COMPLAINTS: "feedback_and_complaints",
  PLACEMENT_REQUESTS: "placement_requests",
  BLOGS: "blogs",
  ADMIN_DASHBOARD: "admin_dashboard",
  STUDENT_DASHBOARD: "student_dashboard",
  INSTRUCTOR_DASHBOARD: "instructor_dashboard",
  CORPORATE_DASHBOARD: "corporate_dashboard",
  CORPORATE_STUDENT_DASHBOARD: "corporate_student_dashboard",
  INSTRUCTOR_DASHBOARD: "instructor_dashboard",
  CORPORATE_DASHBOARD: "corporate_dashboard",
  View_Course: "view_courses",
  View_Student: "view_student",
  View_Instructor: "view_instructor",
  View_Corporate: "view_corporate",
  View_Corporate_Student: "view_corporate_student",
  View_Admin: "view_admin",
  View_Super_Admin: "view_super_admin",
};

const ADMIN_ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  CORPORATE_ADMIN: "corporate-admin",
};

const AGE_GROUPS = [
  "Under 18",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
];

const GENDERS = ["male", "female", "non-binary", "prefer-not-to-say", "other"];

const COMPANY_TYPES = ["Institute", "University"];

// Define phone number schema
const phoneNumberSchema = new Schema(
  {
    country: {
      type: String,
      required: [true, "Country code is required"],
    },
    number: {
      type: String,
      required: [true, "Phone number is required"],
      validate: {
        validator: function (v) {
          return /^\+?\d{10,15}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },
  },
  { _id: false },
);

// User Activity Tracking Schema
const userActivitySchema = new Schema({
  action: {
    type: String,
    required: true,
    enum: [
      "register", "login", "logout", "profile_update", "profile_view", "course_view", "course_purchase",
      "content_view", "content_complete", "search", "review_submit",
      "social_share", "message_send", "notification_read", "setting_change",
      "feature_use", "error_encounter", "page_view", "api_call",
      "password_reset", "password_reset_request", "password_change", "temp_password_verified",
      "admin_action", "profile_restore"
    ]
  },
  resource: {
    type: String, // e.g., course_id, content_id, page_url
  },
  details: {
    type: Schema.Types.Mixed, // Flexible object for action-specific data
    default: {}
  },
  metadata: {
    ip_address: String,
    user_agent: String,
    device_type: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "unknown"]
    },
    browser: String,
    operating_system: String,
    screen_resolution: String,
    geolocation: {
      country: String,
      region: String,
      city: String,
      timezone: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    referrer: String,
    session_id: String
  },
  duration: {
    type: Number, // Time spent on action in milliseconds
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  _id: true,
  timestamps: false
});

// User Preferences Schema
const userPreferencesSchema = new Schema({
  theme: {
    type: String,
    enum: ["light", "dark", "auto", "high_contrast"],
    default: "auto"
  },
  language: {
    type: String,
    default: "en",
    validate: {
      validator: function(v) {
        return /^[a-z]{2}(-[A-Z]{2})?$/.test(v);
      },
      message: "Invalid language code format"
    }
  },
  currency: {
    type: String,
    default: "USD",
    validate: {
      validator: function(v) {
        return /^[A-Z]{3}$/.test(v);
      },
      message: "Invalid currency code format"
    }
  },
  timezone: {
    type: String,
    default: "UTC"
  },
  notifications: {
    email: {
      marketing: { type: Boolean, default: true },
      course_updates: { type: Boolean, default: true },
      system_alerts: { type: Boolean, default: true },
      weekly_summary: { type: Boolean, default: true },
      achievement_unlocked: { type: Boolean, default: true }
    },
    push: {
      enabled: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false },
      course_reminders: { type: Boolean, default: true },
      live_sessions: { type: Boolean, default: true },
      community_activity: { type: Boolean, default: false }
    },
    sms: {
      enabled: { type: Boolean, default: false },
      security_alerts: { type: Boolean, default: false },
      urgent_only: { type: Boolean, default: false }
    }
  },
  privacy: {
    profile_visibility: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public"
    },
    activity_tracking: { type: Boolean, default: true },
    data_analytics: { type: Boolean, default: true },
    third_party_sharing: { type: Boolean, default: false },
    marketing_emails: { type: Boolean, default: true }
  },
  accessibility: {
    screen_reader: { type: Boolean, default: false },
    high_contrast: { type: Boolean, default: false },
    large_text: { type: Boolean, default: false },
    keyboard_navigation: { type: Boolean, default: false },
    reduced_motion: { type: Boolean, default: false }
  },
  content: {
    autoplay_videos: { type: Boolean, default: true },
    subtitles_default: { type: Boolean, default: false },
    preferred_video_quality: {
      type: String,
      enum: ["auto", "480p", "720p", "1080p"],
      default: "auto"
    },
    content_maturity: {
      type: String,
      enum: ["all", "teen", "mature"],
      default: "all"
    }
  }
});

// User Statistics Schema
const userStatsSchema = new Schema({
  learning: {
    total_courses_enrolled: { type: Number, default: 0 },
    total_courses_completed: { type: Number, default: 0 },
    total_learning_time: { type: Number, default: 0 }, // in minutes
    current_streak: { type: Number, default: 0 },
    longest_streak: { type: Number, default: 0 },
    certificates_earned: { type: Number, default: 0 },
    skill_points: { type: Number, default: 0 },
    achievements_unlocked: { type: Number, default: 0 }
  },
  engagement: {
    total_logins: { type: Number, default: 0 },
    total_session_time: { type: Number, default: 0 },
    avg_session_duration: { type: Number, default: 0 },
    last_active_date: Date,
    consecutive_active_days: { type: Number, default: 0 },
    total_page_views: { type: Number, default: 0 },
    feature_usage_count: {
      type: Map,
      of: Number,
      default: new Map()
    }
  },
  social: {
    reviews_written: { type: Number, default: 0 },
    discussions_participated: { type: Number, default: 0 },
    content_shared: { type: Number, default: 0 },
    followers_count: { type: Number, default: 0 },
    following_count: { type: Number, default: 0 },
    community_reputation: { type: Number, default: 0 }
  },
  financial: {
    total_spent: { type: Number, default: 0 },
    total_courses_purchased: { type: Number, default: 0 },
    subscription_months: { type: Number, default: 0 },
    refunds_requested: { type: Number, default: 0 },
    lifetime_value: { type: Number, default: 0 }
  }
});

// Device Information Schema
const deviceInfoSchema = new Schema({
  device_id: {
    type: String,
    required: true,
    index: true
  },
  device_name: String,
  device_type: {
    type: String,
    enum: ["desktop", "mobile", "tablet"],
    required: true
  },
  operating_system: String,
  browser: String,
  browser_version: String,
  screen_resolution: String,
  is_primary: {
    type: Boolean,
    default: false
  },
  push_token: String, // For push notifications
  last_seen: {
    type: Date,
    default: Date.now
  },
  ip_addresses: [{
    ip: String,
    country: String,
    region: String,
    city: String,
    timestamp: { type: Date, default: Date.now }
  }],
  is_trusted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Session Information Schema
const sessionSchema = new Schema({
  session_id: {
    type: String,
    required: true,
    index: true
  },
  device_id: {
    type: String,
    required: true
  },
  start_time: {
    type: Date,
    default: Date.now
  },
  last_activity: {
    type: Date,
    default: Date.now
  },
  end_time: Date,
  duration: Number, // in milliseconds
  ip_address: String,
  user_agent: String,
  geolocation: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },
  is_active: {
    type: Boolean,
    default: true
  },
  pages_visited: [{
    path: String,
    timestamp: Date,
    duration: Number
  }],
  actions_performed: [{
    action: String,
    timestamp: Date,
    details: Schema.Types.Mixed
  }]
});

// Enhanced User Metadata Schema
const userMetaSchema = new Schema({
  // Personal Information
  date_of_birth: Date,
  gender: {
    type: String
  },
  nationality: String,
  languages_spoken: [{
    language: String,
    proficiency: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "native"]
    }
  }],
  
  // Professional Information
  occupation: String,
  industry: String,
  company: String,
  experience_level: {
    type: String,
    enum: ["entry", "mid", "senior", "executive", "student", "other"]
  },
  annual_income_range: {
    type: String,
    enum: ["under-25k", "25k-50k", "50k-75k", "75k-100k", "100k-150k", "150k-plus", "prefer-not-to-say"]
  },
  
  // Education Information
  education_level: {
    type: String,
    enum: [
      "High School",
      "Diploma", 
      "Associate Degree",
      "Bachelor's Degree",
      "Master's Degree",
      "Doctorate/PhD",
      "Professional Certificate",
      "Other"
    ]
  },
  institution_name: {
    type: String,
    trim: true
  },
  field_of_study: {
    type: String,
    trim: true
  },
  graduation_year: {
    type: Number,
    min: 1950,
    max: new Date().getFullYear() + 10
  },
  skills: {
    type: [String],
    default: []
  },
  certifications: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    issuer: {
      type: String,
      required: true,
      trim: true
    },
    year: {
      type: Number,
      min: 1950,
      max: new Date().getFullYear() + 1
    },
    expiry_date: Date,
    credential_id: String,
    credential_url: String,
    is_verified: {
      type: Boolean,
      default: false
    }
  }],
  
  // Learning Preferences
  learning_goals: [{
    goal: String,
    priority: {
      type: String,
      enum: ["high", "medium", "low"]
    },
    target_date: Date,
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  }],
  preferred_learning_style: {
    type: String,
    enum: ["visual", "auditory", "kinesthetic", "reading-writing", "mixed"]
  },
  available_time_per_week: {
    type: Number,
    min: 0,
    max: 168 // hours per week
  },
  preferred_study_times: [{
    day: {
      type: String,
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    },
    start_time: String, // Format: HH:MM
    end_time: String
  }],
  
  // Marketing & Personalization
  referral_source: {
    type: String,
    enum: ["search", "social", "email", "referral", "direct", "advertisement", "other"]
  },
  interests: [String],
  personality_type: String, // e.g., "INTJ", "Explorer", etc.
  risk_tolerance: {
    type: String,
    enum: ["conservative", "moderate", "aggressive"]
  }
});

// Main User Schema
const userSchema = new Schema({
  // Basic Information
  full_name: {
    type: String,
    required: [true, "Full name is required"],
    trim: true,
    maxlength: [100, "Full name cannot exceed 100 characters"],
    index: true
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: "Please enter a valid email address"
    }
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    minlength: [3, "Username must be at least 3 characters"],
    maxlength: [30, "Username cannot exceed 30 characters"],
    validate: {
      validator: function(v) {
        return !v || /^[a-zA-Z0-9_]+$/.test(v);
      },
      message: "Username can only contain letters, numbers, and underscores"
    }
  },
  student_id: {
    type: String,
    unique: true,
    sparse: true, // Only students will have this field
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // Pattern: MED-YYYY-NNNNNN (e.g., MED-2025-000001)
        return !v || /^MED-\d{4}-\d{6}$/.test(v);
      },
      message: "Student ID must follow the pattern MED-YYYY-NNNNNN"
    },
    index: true
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [8, "Password must be at least 8 characters"]
  },
  
  // Contact Information
  phone_numbers: [phoneNumberSchema],
  
  // Profile Information
  age: {
    type: Number,
    min: [13, "Minimum age requirement is 13"],
    max: [120, "Invalid age"]
  },
  age_group: {
    type: String,
    enum: ["teen", "young-adult", "adult", "senior"]
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, "Address must be less than 500 characters"]
  },
  organization: {
    type: String,
    trim: true,
    maxlength: [200, "Organization name must be less than 200 characters"]
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [1000, "Bio must be less than 1000 characters"]
  },
  
  // Profile Media
  user_image: {
    url: String,
    public_id: String, // For Cloudinary
    alt_text: String,
    upload_date: {
      type: Date,
      default: Date.now
    }
  },
  cover_image: {
    url: String,
    public_id: String,
    alt_text: String,
    upload_date: {
      type: Date,
      default: Date.now
    }
  },
  
  // Social Profiles
  facebook_link: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/(?:www\.)?facebook\.com\/.+/i.test(v);
      },
      message: "Invalid Facebook URL"
    }
  },
  instagram_link: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/(?:www\.)?instagram\.com\/.+/i.test(v);
      },
      message: "Invalid Instagram URL"
    }
  },
  linkedin_link: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/(?:www\.)?linkedin\.com\/.+/i.test(v);
      },
      message: "Invalid LinkedIn URL"
    }
  },
  twitter_link: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/.+/i.test(v);
      },
      message: "Invalid Twitter/X URL"
    }
  },
  youtube_link: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/(?:www\.)?youtube\.com\/.+/i.test(v);
      },
      message: "Invalid YouTube URL"
    }
  },
  github_link: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/(?:www\.)?github\.com\/.+/i.test(v);
      },
      message: "Invalid GitHub URL"
    }
  },
  portfolio_link: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/i.test(v);
      },
      message: "Invalid URL format"
    }
  },
  
  // Location & System
  country: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[A-Za-z\s]{2,50}$/.test(v);
      },
      message: "Invalid country format"
    }
  },
  timezone: {
    type: String,
    default: "UTC"
  },
  
  // Status & Verification
  email_verified: {
    type: Boolean,
    default: false
  },
  phone_verified: {
    type: Boolean,
    default: false
  },
  identity_verified: {
    type: Boolean,
    default: false
  },
  is_active: {
    type: Boolean,
    default: true
  },
  is_banned: {
    type: Boolean,
    default: false
  },
  ban_reason: String,
  ban_expires: Date,
  
  // Account Management
  account_type: {
    type: String,
    enum: ["free", "premium", "enterprise", "instructor", "admin"],
    default: "free"
  },
  membership_type: {
    type: String,
    enum: ["general", "gold", "silver"],
    default: "general"
  },
  role: {
    type: Schema.Types.Mixed, // Supports both String and Array
    validate: {
      validator: function(value) {
        // Allow both string and array of strings
        if (typeof value === 'string') {
          return Object.values(ROLES).includes(value);
        }
        if (Array.isArray(value)) {
          return value.every(role => Object.values(ROLES).includes(role));
        }
        return false;
      },
      message: 'Role must be a valid role string or array of valid roles'
    },
    default: ROLES.STUDENT,
    // Convert array to string for backward compatibility
    set: function(value) {
      if (Array.isArray(value)) {
        // If array has one element, convert to string
        if (value.length === 1) {
          return value[0];
        }
        // If multiple roles, keep as array
        return value;
      }
      return value;
    }
  },
  admin_role: {
    type: String,
    enum: Object.values(ADMIN_ROLES),
    sparse: true // Only admins will have this field
  },
  subscription_status: {
    type: String,
    enum: ["active", "inactive", "cancelled", "suspended", "trial"],
    default: "inactive"
  },
  subscription_plan: String,
  subscription_start: Date,
  subscription_end: Date,
  trial_used: {
    type: Boolean,
    default: false
  },
  
  // Security & Privacy
  two_factor_enabled: {
    type: Boolean,
    default: false
  },
  two_factor_secret: String,
  backup_codes: [String],
  password_reset_token: String,
  password_reset_expires: Date,
  email_verification_token: String,
  email_verification_expires: Date,
  // Temporary password verification fields
  temp_password_verified: {
    type: Boolean,
    default: false
  },
  temp_password_verification_token: String,
  temp_password_verification_expires: Date,
  failed_login_attempts: {
    type: Number,
    default: 0
  },
  password_change_attempts: {
    type: Number,
    default: 0
  },
  account_locked_until: Date,
  lockout_reason: {
    type: String,
    enum: ['login_attempts', 'password_change_attempts', 'temp_password_attempts', 'admin_lock'],
    sparse: true
  },
  last_failed_attempt: Date,
  
  // OAuth Integration
  oauth: {
    google: {
      id: String,
      access_token: String,
      refresh_token: String,
      profile: Schema.Types.Mixed,
      connected_at: Date,
      last_login: Date,
      last_refresh: Date
    },
    facebook: {
      id: String,
      access_token: String,
      refresh_token: String,
      profile: Schema.Types.Mixed,
      connected_at: Date,
      last_login: Date,
      last_refresh: Date
    },
    github: {
      id: String,
      access_token: String,
      refresh_token: String,
      profile: Schema.Types.Mixed,
      connected_at: Date,
      last_login: Date,
      last_refresh: Date
    },
    linkedin: {
      id: String,
      access_token: String,
      refresh_token: String,
      profile: Schema.Types.Mixed,
      connected_at: Date,
      last_login: Date,
      last_refresh: Date
    },
    microsoft: {
      id: String,
      access_token: String,
      refresh_token: String,
      profile: Schema.Types.Mixed,
      connected_at: Date,
      last_login: Date,
      last_refresh: Date
    },
    apple: {
      id: String,
      access_token: String,
      refresh_token: String,
      profile: Schema.Types.Mixed,
      connected_at: Date,
      last_login: Date,
      last_refresh: Date
    }
  },
  
  // Real-time Features
  is_online: {
    type: Boolean,
    default: false
  },
  last_seen: {
    type: Date,
    default: Date.now
  },
  status_message: {
    type: String,
    maxlength: [100, "Status message cannot exceed 100 characters"]
  },
  activity_status: {
    type: String,
    enum: ["online", "away", "busy", "invisible"],
    default: "online"
  },
  
  // Advanced Features
  api_key: {
    type: String,
    unique: true,
    sparse: true
  },
  api_rate_limit: {
    type: Number,
    default: 1000 // requests per hour
  },
  webhooks: [{
    url: String,
    events: [String],
    secret: String,
    is_active: {
      type: Boolean,
      default: true
    }
  }],
  
  // Related Schemas
  meta: userMetaSchema,
  preferences: userPreferencesSchema,
  statistics: userStatsSchema,
  devices: [deviceInfoSchema],
  sessions: [sessionSchema],
  activity_log: [userActivitySchema],
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  last_login: Date,
  last_profile_update: Date
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.two_factor_secret;
      delete ret.backup_codes;
      delete ret.password_reset_token;
      delete ret.email_verification_token;
      delete ret.temp_password_verification_token;
      delete ret.api_key;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for optimal performance (email and username already indexed via unique: true)
userSchema.index({ 'phone_numbers.number': 1 });
userSchema.index({ is_active: 1, account_type: 1 });
userSchema.index({ created_at: -1 });
userSchema.index({ last_seen: -1 });
userSchema.index({ 'statistics.engagement.last_active_date': -1 });
userSchema.index({ 'activity_log.timestamp': -1 });
userSchema.index({ 'sessions.is_active': 1 });

// Virtual for profile completion percentage
userSchema.virtual('profile_completion').get(function() {
  const requiredFields = [
    'full_name', 'email', 'phone_numbers', 'user_image', 
    'address', 'organization', 'bio', 'meta.date_of_birth',
    'meta.education_level', 'meta.institution_name', 'meta.field_of_study',
    'meta.gender', 'meta.skills', 'country', 'timezone'
  ];
  
  const socialFields = [
    'facebook_link', 'instagram_link', 'linkedin_link', 
    'twitter_link', 'youtube_link', 'github_link', 'portfolio_link'
  ];
  
  let completedFields = 0;
  const totalFields = requiredFields.length + (socialFields.length * 0.5); // Social fields worth half points
  
  requiredFields.forEach(field => {
    const fieldParts = field.split('.');
    let value = this;
    
    for (const part of fieldParts) {
      value = value?.[part];
    }
    
    if (value !== null && value !== undefined && value !== '' && 
        (!Array.isArray(value) || value.length > 0)) {
      completedFields++;
    }
  });
  
  socialFields.forEach(field => {
    if (this[field] && this[field].trim() !== '') {
      completedFields += 0.5;
    }
  });
  
  return Math.round((completedFields / totalFields) * 100);
});

// Virtual for full profile data
userSchema.virtual('profile_summary').get(function() {
  return {
    id: this._id,
    full_name: this.full_name,
    email: this.email,
    username: this.username,
    user_image: this.user_image,
    bio: this.bio,
    account_type: this.account_type,
    is_online: this.is_online,
    last_seen: this.last_seen,
    profile_completion: this.profile_completion,
    statistics: this.statistics,
    created_at: this.created_at
  };
});

// Pre-save middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre("save", function (next) {
  this.updated_at = new Date();
  
  // Update last profile update if profile fields changed
  const profileFields = ['full_name', 'bio', 'user_image', 'address', 'organization'];
  const isProfileUpdated = profileFields.some(field => this.isModified(field));
  
  if (isProfileUpdated) {
    this.last_profile_update = new Date();
  }
  
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateLastSeen = function() {
  this.last_seen = new Date();
  this.is_online = true;
  return this.save();
};

userSchema.methods.setOffline = function() {
  this.is_online = false;
  return this.save();
};

userSchema.methods.logActivity = function(action, resource = null, details = {}, metadata = {}) {
  this.activity_log.push({
    action,
    resource,
    details,
    metadata,
    timestamp: new Date()
  });
  
  // Keep only last 1000 activities to prevent document size issues
  if (this.activity_log.length > 1000) {
    this.activity_log = this.activity_log.slice(-1000);
  }
  
  return this.save();
};

userSchema.methods.createSession = function(sessionData) {
  const session = {
    session_id: sessionData.session_id,
    device_id: sessionData.device_id,
    ip_address: sessionData.ip_address,
    user_agent: sessionData.user_agent,
    geolocation: sessionData.geolocation,
    start_time: new Date()
  };
  
  // Initialize sessions array if it doesn't exist
  if (!this.sessions) {
    this.sessions = [];
  }
  
  this.sessions.push(session);
  this.is_online = true;
  this.last_seen = new Date();
  
  // Initialize statistics if they don't exist
  if (!this.statistics) {
    this.statistics = {
      learning: {
        total_courses_enrolled: 0,
        total_courses_completed: 0,
        total_learning_time: 0,
        current_streak: 0,
        longest_streak: 0,
        certificates_earned: 0,
        skill_points: 0,
        achievements_unlocked: 0
      },
      engagement: {
        total_logins: 0,
        total_session_time: 0,
        avg_session_duration: 0,
        last_active_date: new Date(),
        consecutive_active_days: 0,
        total_page_views: 0,
        feature_usage_count: new Map()
      },
      social: {
        reviews_written: 0,
        discussions_participated: 0,
        content_shared: 0,
        followers_count: 0,
        following_count: 0,
        community_reputation: 0
      },
      financial: {
        total_spent: 0,
        total_courses_purchased: 0,
        subscription_months: 0,
        refunds_requested: 0,
        lifetime_value: 0
      }
    };
  }
  
  // Initialize engagement if it doesn't exist
  if (!this.statistics.engagement) {
    this.statistics.engagement = {
      total_logins: 0,
      total_session_time: 0,
      avg_session_duration: 0,
      last_active_date: new Date(),
      consecutive_active_days: 0,
      total_page_views: 0,
      feature_usage_count: new Map()
    };
  }
  
  this.statistics.engagement.total_logins += 1;
  this.statistics.engagement.last_active_date = new Date();
  
  return this.save();
};

userSchema.methods.endSession = function(sessionId) {
  if (!this.sessions) {
    return this.save();
  }
  
  const session = this.sessions.id(sessionId);
  if (session) {
    session.end_time = new Date();
    session.duration = session.end_time - session.start_time;
    session.is_active = false;
    
    // Initialize statistics.engagement if it doesn't exist
    if (!this.statistics) {
      this.statistics = {
        engagement: {
          total_logins: 0,
          total_session_time: 0,
          avg_session_duration: 0,
          last_active_date: new Date(),
          consecutive_active_days: 0,
          total_page_views: 0,
          feature_usage_count: new Map()
        }
      };
    }
    
    if (!this.statistics.engagement) {
      this.statistics.engagement = {
        total_logins: 0,
        total_session_time: 0,
        avg_session_duration: 0,
        last_active_date: new Date(),
        consecutive_active_days: 0,
        total_page_views: 0,
        feature_usage_count: new Map()
      };
    }
    
    // Update engagement statistics
    this.statistics.engagement.total_session_time = (this.statistics.engagement.total_session_time || 0) + session.duration;
    const totalLogins = this.statistics.engagement.total_logins || 1;
    this.statistics.engagement.avg_session_duration = 
      this.statistics.engagement.total_session_time / totalLogins;
  }
  
  // Check if any other sessions are active
  const activeSessions = this.sessions.filter(s => s.is_active);
  if (activeSessions.length === 0) {
    this.is_online = false;
  }
  
  return this.save();
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findOnlineUsers = function() {
  return this.find({ is_online: true }).select('full_name username user_image last_seen');
};

userSchema.statics.getUserAnalytics = function(timeframe = '30d') {
  const daysAgo = parseInt(timeframe);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);
  
  return this.aggregate([
    {
      $match: {
        created_at: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total_users: { $sum: 1 },
        active_users: { 
          $sum: { 
            $cond: [{ $gte: ['$last_seen', startDate] }, 1, 0] 
          } 
        },
        verified_users: { 
          $sum: { 
            $cond: ['$email_verified', 1, 0] 
          } 
        },
        premium_users: { 
          $sum: { 
            $cond: [{ $eq: ['$account_type', 'premium'] }, 1, 0] 
          } 
        }
      }
    }
  ]);
};

// Add a method to verify user has a specific permission
userSchema.methods.hasPermission = function (permission) {
  if (this.admin_role === ADMIN_ROLES.SUPER_ADMIN) return true;
  return this.permissions && this.permissions.includes(permission);
};

// Add a method to verify user has a specific role
userSchema.methods.hasRole = function (role) {
  return this.role && this.role.includes(role);
};

// Add a method to check if user is an admin
userSchema.methods.isAdmin = function () {
  return (
    this.admin_role === ADMIN_ROLES.ADMIN ||
    this.admin_role === ADMIN_ROLES.SUPER_ADMIN
  );
};

// Add a method to check if user is a super admin
userSchema.methods.isSuperAdmin = function () {
  return this.admin_role === ADMIN_ROLES.SUPER_ADMIN;
};

// Add a method to check if user is a student
userSchema.methods.isStudent = function () {
  return this.role.includes(ROLES.STUDENT);
};

// Add a method to check if user is an instructor
userSchema.methods.isInstructor = function () {
  return this.role.includes(ROLES.INSTRUCTOR);
};

// Add a method to check if user is a corporate
userSchema.methods.isCorporate = function () {
  return this.role.includes(ROLES.CORPORATE);
};

// Add a method to check if user is a corporate student
userSchema.methods.isCorporateStudent = function () {
  return this.role.includes(ROLES.CORPORATE_STUDENT);
};

// Add a method to check if user is a parent
userSchema.methods.isParent = function () {
  return this.role.includes(ROLES.PARENT);
};

// Add a method to check if user is active
userSchema.methods.isActive = function () {
  return this.status === "Active";
};

// Add a method to get user's primary role
userSchema.methods.getPrimaryRole = function () {
  if (this.role && this.role.length > 0) {
    return this.role[0];
  }
  return null;
};

// Add a method to update user's last login
userSchema.methods.updateLastLogin = async function () {
  this.last_login = new Date();
  this.login_count += 1;
  return await this.save();
};

// Enhanced login analytics methods
userSchema.methods.getLoginStats = function () {
  return {
    total_logins: this.login_count || 0,
    last_login: this.last_login,
    first_login: this.login_analytics?.first_login,
    total_sessions: this.login_analytics?.total_sessions || 0,
    unique_devices: this.login_analytics?.unique_devices?.length || 0,
    unique_ips: this.login_analytics?.unique_ips?.length || 0,
    login_frequency: this.login_analytics?.login_frequency || { daily: 0, weekly: 0, monthly: 0 },
    device_stats: this.login_analytics?.device_stats || { mobile: 0, tablet: 0, desktop: 0 },
    browser_stats: this.login_analytics?.browser_stats || {},
    os_stats: this.login_analytics?.os_stats || {},
    average_session_duration: this.login_analytics?.average_session_duration || 0,
    last_activity: this.login_analytics?.last_activity,
  };
};

userSchema.methods.getRecentLoginHistory = function (limit = 10) {
  if (!this.login_history || this.login_history.length === 0) {
    return [];
  }
  return this.login_history.slice(0, limit).map(login => ({
    timestamp: login.timestamp,
    ip_address: login.ip_address,
    device_type: login.device_info?.type || 'Unknown',
    browser: login.device_info?.browser || 'Unknown',
    os: login.device_info?.os || 'Unknown',
    days_since_last_login: login.days_since_last_login,
    session_id: login.session_id,
  }));
};

userSchema.methods.isFrequentUser = function () {
  const analytics = this.login_analytics;
  if (!analytics) return false;
  
  // Consider frequent if user logs in more than 3 times per week on average
  const weeklyAverage = analytics.login_frequency?.weekly || 0;
  return weeklyAverage >= 3;
};

userSchema.methods.getDevicePreference = function () {
  const deviceStats = this.login_analytics?.device_stats;
  if (!deviceStats) return 'Unknown';
  
  const { mobile, tablet, desktop } = deviceStats;
  const total = mobile + tablet + desktop;
  
  if (total === 0) return 'Unknown';
  
  if (mobile > tablet && mobile > desktop) return 'Mobile';
  if (tablet > mobile && tablet > desktop) return 'Tablet';
  return 'Desktop';
};

userSchema.methods.getBrowserPreference = function () {
  const browserStats = this.login_analytics?.browser_stats;
  if (!browserStats || browserStats.size === 0) return 'Unknown';
  
  let maxBrowser = 'Unknown';
  let maxCount = 0;
  
  for (const [browser, count] of browserStats) {
    if (count > maxCount) {
      maxCount = count;
      maxBrowser = browser;
    }
  }
  
  return maxBrowser;
};

userSchema.methods.getLoginPattern = function () {
  if (!this.login_history || this.login_history.length < 2) {
    return { pattern: 'insufficient_data', description: 'Not enough login data' };
  }
  
  const frequency = this.login_analytics?.login_frequency;
  if (!frequency) return { pattern: 'unknown', description: 'No frequency data available' };
  
  const { daily, weekly, monthly } = frequency;
  
  if (daily >= 1) {
    return { pattern: 'daily_user', description: 'Logs in daily' };
  } else if (weekly >= 3) {
    return { pattern: 'frequent_user', description: 'Logs in multiple times per week' };
  } else if (weekly >= 1) {
    return { pattern: 'weekly_user', description: 'Logs in weekly' };
  } else if (monthly >= 1) {
    return { pattern: 'occasional_user', description: 'Logs in occasionally' };
  } else {
    return { pattern: 'inactive_user', description: 'Rarely logs in' };
  }
};

userSchema.methods.hasMultipleDevices = function () {
  const uniqueDevices = this.login_analytics?.unique_devices?.length || 0;
  return uniqueDevices > 1;
};

userSchema.methods.hasMultipleLocations = function () {
  const uniqueIPs = this.login_analytics?.unique_ips?.length || 0;
  return uniqueIPs > 1;
};

userSchema.methods.getSecurityScore = function () {
  let score = 100; // Start with perfect score
  
  // Deduct points for security concerns
  if (this.hasMultipleLocations()) {
    const uniqueIPs = this.login_analytics?.unique_ips?.length || 0;
    if (uniqueIPs > 5) score -= 20; // Many different IPs
    else if (uniqueIPs > 3) score -= 10;
  }
  
  if (this.hasMultipleDevices()) {
    const uniqueDevices = this.login_analytics?.unique_devices?.length || 0;
    if (uniqueDevices > 10) score -= 15; // Too many devices
    else if (uniqueDevices > 5) score -= 5;
  }
  
  // Check for suspicious login patterns
  const recentLogins = this.getRecentLoginHistory(5);
  const rapidLogins = recentLogins.filter((login, index) => {
    if (index === 0) return false;
    const timeDiff = new Date(recentLogins[index - 1].timestamp) - new Date(login.timestamp);
    return timeDiff < 60000; // Less than 1 minute apart
  });
  
  if (rapidLogins.length > 0) score -= 25; // Rapid successive logins
  
  return Math.max(0, Math.min(100, score));
};

// Add static methods for common queries
userSchema.statics.findByRole = function (role) {
  return this.find({ role: role });
};

userSchema.statics.findActiveUsers = function () {
  return this.find({ is_active: true });
};

userSchema.statics.findInactiveUsers = function () {
  return this.find({ is_active: false });
};

userSchema.statics.findAdmins = function () {
  return this.find({
    admin_role: { $in: [ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN] },
  });
};

userSchema.statics.findSuperAdmins = function () {
  return this.find({ admin_role: ADMIN_ROLES.SUPER_ADMIN });
};

userSchema.statics.findStudents = function () {
  return this.find({ role: ROLES.STUDENT });
};

userSchema.statics.findInstructors = function () {
  return this.find({ role: ROLES.INSTRUCTOR });
};

userSchema.statics.findCorporates = function () {
  return this.find({ role: ROLES.CORPORATE });
};

userSchema.statics.findCorporateStudents = function () {
  return this.find({ role: ROLES.CORPORATE_STUDENT });
};

// Add static method to find all parents
userSchema.statics.findParents = function () {
  return this.find({ role: ROLES.PARENT });
};

// Add static method to generate unique student ID
userSchema.statics.generateStudentId = async function() {
  const currentYear = new Date().getFullYear();
  const prefix = `MED-${currentYear}-`;
  
  try {
    // Find the latest student ID for the current year
    const latestStudent = await this.findOne({
      student_id: { $regex: `^${prefix}` }
    }).sort({ student_id: -1 });
    
    let nextNumber = 1;
    
    if (latestStudent && latestStudent.student_id) {
      // Extract the number part from the student ID
      const numberPart = latestStudent.student_id.split('-')[2];
      nextNumber = parseInt(numberPart) + 1;
    }
    
    // Format with leading zeros (6 digits)
    const formattedNumber = nextNumber.toString().padStart(6, '0');
    return `${prefix}${formattedNumber}`;
    
  } catch (error) {
    console.error('Error generating student ID:', error);
    // Fallback to timestamp-based ID
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  }
};

// Add static method to find user by student ID
userSchema.statics.findByStudentId = function(studentId) {
  return this.findOne({ student_id: studentId.toUpperCase() });
};

// Add static method to validate student ID format
userSchema.statics.isValidStudentIdFormat = function(studentId) {
  return /^MED-\d{4}-\d{6}$/.test(studentId);
};

// Create and export the model
const User = mongoose.model("User", userSchema);
export default User;

// Export constants for roles and permissions
export { ROLES as USER_ROLES, PERMISSIONS as USER_PERMISSIONS, ADMIN_ROLES as USER_ADMIN_ROLES };
