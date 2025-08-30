import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import passwordSecurity from "../utils/passwordSecurity.js";
const { Schema } = mongoose;

// Define constants for roles and permissions
const ROLES = {
  ADMIN: "admin",
  STUDENT: "student",
  INSTRUCTOR: "instructor",
  CORPORATE: "corporate",
  CORPORATE_STUDENT: "corporate-student",
  PARENT: "parent",
  PROGRAM_COORDINATOR: "program_coordinator",
  SALES_TEAM: "sales_team",
  SUPPORT_TEAM: "support_team",
};

const ADMIN_ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  CORPORATE_ADMIN: "corporate-admin",
  SALES_ADMIN: "sales-admin",
  SUPPORT_ADMIN: "support-admin",
};

// User Activity Tracking Schema with the missing profile_completion_view enum
const userActivitySchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "register",
        "login",
        "logout",
        "logout_all_devices",
        "profile_update",
        "profile_view",
         "profile_completion_view", // This was the missing enum value
        "course_view",
        "course_purchase",
        "content_view",
        "content_complete",
        "search",
        "review_submit",
        "social_share",
        "message_send",
        "notification_read",
        "setting_change",
        "feature_use",
        "error_encounter",
        "page_view",
        "api_call",
        "password_reset",
        "password_reset_request",
        "password_change",
        "temp_password_verified",
        "admin_action",
        "profile_restore",
         "mfa_setup_initiated", // Added missing enum value
         "mfa_setup_completed",
         "mfa_verification_attempted",
         "mfa_verification_successful",
         "mfa_verification_success", // Added missing enum value
        "mfa_verification_failed",
         "mfa_disabled",
         "mfa_enabled",
         "mfa_recovery_requested", // Added missing enum value
         "quick_login_key_generated",
         "quick_login_key_used",
         "quick_login_key_revoked",
         "session_created",
         "session_invalidated",
         "session_terminated", // Added missing enum value
         "bulk_session_termination", // Added missing enum value
         "oauth_link", // OAuth account linking
         "oauth_unlink", // OAuth account unlinking
         "oauth_email_sync", // OAuth email synchronization
         "oauth_login", // OAuth login
         "oauth_register", // OAuth registration
         "account_locked",
         "account_unlocked",
         "password_reset_requested",
         "password_reset_completed",
         "email_verification_sent",
         "email_verification_completed",
         "email_verified", // Added missing enum value
         "verification_resent", // Added missing enum value
         "temp_password_generated",
         "temp_password_used",
         "backup_codes_generated",
         "backup_codes_used",
        "backup_codes_regenerated",
         "profile_delete", // Added missing enum value
         "preferences_updated", // Added missing enum value
         "oauth_unlink", // Added missing enum value
         "oauth_disconnect", // Added missing enum value
         "oauth_email_sync", // Added missing enum value
         "device_trust_changed", // Added missing enum value
         "course_wishlist_add", // Added missing enum value
         "course_wishlist_remove", // Added missing enum value
         "wishlist_cleared", // Added missing enum value
      ],
    },
    resource: {
      type: String,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      ip_address: String,
      user_agent: String,
      device_type: {
        type: String,
        enum: ["desktop", "mobile", "tablet", "web", "unknown"],
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
          longitude: Number,
        },
      },
      referrer: String,
      session_id: String,
    },
    duration: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    _id: true,
    timestamps: false,
  },
);

// Main User Schema
const userSchema = new Schema(
  {
    // Basic Information
    full_name: {
      type: String,
      required: false, // Completely optional - user can leave it empty
      trim: true,
      maxlength: [100, "Full name cannot exceed 100 characters"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Please enter a valid email address",
      },
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      validate: {
        validator: function (v) {
          return !v || /^[a-zA-Z0-9_]+$/.test(v);
        },
        message: "Username can only contain letters, numbers, and underscores",
      },
    },
    password: {
      type: String,
      required: function () {
        return !this.is_demo && (!this.oauth || Object.keys(this.oauth).length === 0);
      },
      minlength: [1, "Password must be at least 1 character"],
    },

    // Status & Verification
    email_verified: {
      type: Boolean,
      default: false,
      },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_demo: {
      type: Boolean,
      default: false,
    },
    oauth: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Role Management
    role: {
      type: Schema.Types.Mixed,
      validate: {
        validator: function (value) {
          if (typeof value === "string") {
            return Object.values(ROLES).includes(value);
          }
          if (Array.isArray(value)) {
            return value.every((role) => Object.values(ROLES).includes(role));
          }
          return false;
        },
        message: "Role must be a valid role string or array of valid roles",
      },
      default: ROLES.STUDENT,
      set: function (value) {
        if (Array.isArray(value)) {
          if (value.length === 1) {
            return value[0];
          }
          return value;
        }
        return value;
      },
    },
    admin_role: {
          type: String,
      enum: Object.values(ADMIN_ROLES),
      sparse: true,
    },
    
    // Admin-specific fields
    user_type: {
      type: String,
      enum: ["admin", "student", "instructor", "corporate", "parent"],
      sparse: true,
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, "Department cannot exceed 100 characters"],
    },
    designation: {
      type: String,
      trim: true,
      maxlength: [100, "Designation cannot exceed 100 characters"],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || /^[\+]?[0-9\-\s\(\)]{7,20}$/.test(v);
        },
        message: "Please enter a valid phone number",
      },
    },
    
    // Security & Privacy
    failed_login_attempts: {
      type: Number,
      default: 0,
    },
    password_change_attempts: {
      type: Number,
      default: 0,
    },
    account_locked_until: Date,
    lockout_reason: {
      type: String,
      enum: [
        "login_attempts",
        "password_change_attempts",
        "temp_password_attempts",
        "admin_lock",
      ],
      sparse: true,
    },
    last_failed_attempt: Date,
    
    // Two-Factor Authentication
    two_factor_enabled: {
      type: Boolean,
      default: false,
    },
    two_factor_method: {
          type: String,
      enum: ["sms", "email", "app"],
    },
    two_factor_phone: String,
    two_factor_secret: String,
    backup_codes: [String],
    
    // Password Management
    password_reset_token: String,
    password_reset_expires: Date,
    last_password_change: Date,
    password_change_count: {
          type: Number,
          default: 0,
        },
    password_set: {
      type: Boolean,
      default: false,
    },
    
    // Temporary Password
    temp_password_verified: {
          type: Boolean,
          default: false,
        },
    temp_password_verification_token: String,
    temp_password_verification_expires: Date,
    
    // Email Verification
    email_verification_token: String,
    email_verification_expires: Date,
    
    // Quick Login
    quick_login_keys: [{
      key_id: String, // Unique identifier for the key
      hashed_key: String, // The bcrypt hashed quick login key
      created_at: {
        type: Date,
        default: Date.now,
      },
      last_used: Date,
      expires_at: Date, // When the quick login key expires (1 minute after logout)
      is_active: {
        type: Boolean,
        default: true,
      },
    }],
    
    // Profile & Account
    student_id: String,
    profile_completion: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    account_type: {
        type: String,
      enum: ["free", "premium", "corporate", "admin"],
      default: "free",
      },
    
    // Permissions
    permissions: [{
        type: String,
        enum: [
        "view_profile",
        "edit_profile",
        "delete_profile",
        "view_courses",
        "enroll_courses",
        "complete_courses",
        "manage_users",
        "manage_courses",
        "manage_content",
        "view_analytics",
        "manage_system",
        "admin_dashboard",
        "super_admin",
        "system_admin",
        "root",
      ],
    }],
    
    // Admin flags
    is_super_admin: {
        type: Boolean,
        default: false,
      },
    isSuperAdmin: {
        type: Boolean,
        default: false,
    },
    
    // Preferences
    preferences: {
      timezone: {
      type: String,
        default: "UTC",
    },
      currency: {
      type: String,
        default: "USD",
    },
      language: {
      type: String,
        default: "en",
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: false,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
    },
    
    // Statistics
    statistics: {
      engagement: {
        total_logins: {
          type: Number,
          default: 0,
        },
        last_active_date: Date,
        total_session_time: {
          type: Number,
          default: 0,
        },
        avg_session_duration: {
          type: Number,
          default: 0,
        },
        total_page_views: {
          type: Number,
          default: 0,
        },
        consecutive_active_days: {
          type: Number,
          default: 0,
        },
        feature_usage_count: {
          type: Map,
          of: Number,
          default: new Map(),
        },
      },
      learning: {
        courses_enrolled: {
          type: Number,
          default: 0,
        },
        courses_completed: {
          type: Number,
          default: 0,
        },
        total_study_time: {
          type: Number,
          default: 0,
        },
        current_streak: {
          type: Number,
          default: 0,
        },
        longest_streak: {
          type: Number,
          default: 0,
        },
        certificates_earned: {
          type: Number,
          default: 0,
        },
      },
             social: {
         connections_made: {
           type: Number,
           default: 0,
         },
         posts_created: {
           type: Number,
           default: 0,
         },
         comments_made: {
           type: Number,
           default: 0,
         },
         likes_received: {
           type: Number,
           default: 0,
         },
         community_reputation: {
           type: Number,
           default: 0,
         },
       },
    },
    
    // Activity Log
    activity_log: [userActivitySchema],
    
    // Sessions
    sessions: [{
      session_id: String,
      device_id: String,
      ip_address: String,
      user_agent: String,
      geolocation: {
        country: String,
        region: String,
        city: String,
        timezone: String,
        coordinates: {
          latitude: Number,
          longitude: Number,
        },
      },
      created_at: {
        type: Date,
        default: Date.now,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
      invalidated_at: Date,
    }],
    
    // Devices
    devices: [{
      device_id: String,
      device_name: String,
      device_type: {
      type: String,
        enum: ["desktop", "mobile", "tablet", "web", "unknown"],
        default: "unknown",
      },
      browser: String,
      operating_system: String,
      ip_address: String,
      user_agent: String,
      geolocation: {
        country: String,
        region: String,
        city: String,
        timezone: String,
        coordinates: {
          latitude: Number,
          longitude: Number,
        },
      },
      is_trusted: {
      type: Boolean,
      default: false,
    },
      is_primary: {
      type: Boolean,
      default: false,
    },
      last_used: {
        type: Date,
        default: Date.now,
      },
      created_at: {
      type: Date,
      default: Date.now,
    },
      fingerprint: String,
      risk_score: {
      type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    }],

    // Personal Details (Direct fields like name, address)
    date_of_birth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'non-binary', 'prefer-not-to-say', 'other', ''],
      default: '',
    },
    nationality: {
      type: String,
      default: '',
    },
    skills: {
      type: [String],
      default: [],
    },
    interests: {
      type: [String],
      default: [],
    },
    learning_goals: {
      type: [String],
      default: [],
    },
    certifications: {
      type: [String],
      default: [],
    },
    languages_spoken: {
      type: [String],
      default: [],
    },
    preferred_study_times: {
      type: [String],
      default: [],
    },
    experience_level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert', ''],
      default: '',
    },
    current_occupation: {
      type: String,
      default: '',
    },
    company_name: {
      type: String,
      default: '',
    },
    preferred_language: {
      type: String,
      default: 'English',
    },
    preferred_learning_style: {
      type: String,
      enum: ['visual', 'auditory', 'kinesthetic', 'reading', 'mixed', ''],
      default: '',
    },
    availability: {
      type: String,
      default: '',
    },
    emergency_contact_name: {
      type: String,
      default: '',
    },
    emergency_contact_phone: {
      type: String,
      default: '',
    },
    emergency_contact_relationship: {
      type: String,
      default: '',
    },
    how_did_you_hear: {
      type: String,
      default: '',
    },
    referral_code: {
      type: String,
      default: '',
    },
    special_requirements: {
      type: String,
      default: '',
    },
    education_level: {
      type: String,
      default: '',
    },
    institution_name: {
      type: String,
      default: '',
    },
    field_of_study: {
      type: String,
      default: '',
    },
    graduation_year: {
      type: Number,
      default: null,
    },

    // Social Media Links
    linkedin_link: {
      type: String,
      default: '',
    },
    github_link: {
      type: String,
      default: '',
    },
    portfolio_link: {
      type: String,
      default: '',
    },
    facebook_link: {
      type: String,
      default: '',
    },
    instagram_link: {
      type: String,
      default: '',
    },
    twitter_link: {
      type: String,
      default: '',
    },
    youtube_link: {
      type: String,
      default: '',
    },

    // Timestamps
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
    last_login: Date,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

// Instance methods
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    // For backward compatibility: Try old method first (direct bcrypt without pepper)
    // This preserves original user passwords without modification
    const oldMethodResult = await bcrypt.compare(candidatePassword, this.password);
    
    if (oldMethodResult) {
      console.log('✅ Login successful with original password method for:', this.email);
      return true;
    }
    
    // If old method fails, try new method (with pepper) for newly created users
    const newMethodResult = await passwordSecurity.comparePassword(
      candidatePassword,
      this.password,
    );
    
    if (newMethodResult) {
      console.log('✅ Login successful with new password method for:', this.email);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error in comparePassword:', error);
    return false;
  }
};

userSchema.methods.logActivity = async function (
  action,
  resource = null,
  details = {},
  metadata = {},
) {
  const activityEntry = {
    action,
    resource,
    details,
    metadata,
    timestamp: new Date(),
  };

  // Use findOneAndUpdate to avoid version conflicts
  const result = await this.constructor.findOneAndUpdate(
    { _id: this._id },
    { 
      $push: { 
        activity_log: {
          $each: [activityEntry],
          $slice: -1000 // Keep only the last 1000 entries
        }
      }
    },
    { new: true, runValidators: false }
  );

  // Update the current document instance
  if (result) {
    this.activity_log = result.activity_log;
  }

  return result || this;
};

userSchema.methods.createSession = async function (sessionData) {
  // Initialize sessions array if it doesn't exist
  if (!this.sessions) {
    this.sessions = [];
  }
  
  // Add new session
  this.sessions.push({
    session_id: sessionData.session_id,
    device_id: sessionData.device_id,
    ip_address: sessionData.ip_address,
    user_agent: sessionData.user_agent,
    geolocation: sessionData.geolocation,
    created_at: new Date(),
    is_active: true,
  });
  
  // Keep only the last 10 sessions
  if (this.sessions.length > 10) {
    this.sessions = this.sessions.slice(-10);
  }

  return this.save();
};

userSchema.methods.invalidateAllSessions = async function () {
  if (this.sessions) {
    this.sessions.forEach(session => {
      session.is_active = false;
      session.invalidated_at = new Date();
    });
  }
  return this.save();
};

userSchema.methods.needsPasswordSetup = function () {
  return this.is_demo && !this.password;
};

userSchema.methods.addOrUpdateDevice = async function (deviceInfo) {
  // Initialize devices array if it doesn't exist
  if (!this.devices) {
    this.devices = [];
  }
  
  // Check if device already exists
  const existingDeviceIndex = this.devices.findIndex(
    device => device.device_id === deviceInfo.device_id
  );
  
  if (existingDeviceIndex !== -1) {
    // Update existing device
    this.devices[existingDeviceIndex] = {
      ...this.devices[existingDeviceIndex],
      ...deviceInfo,
      last_used: new Date(),
    };
  } else {
    // Add new device
    this.devices.push({
      ...deviceInfo,
      created_at: new Date(),
      last_used: new Date(),
    });
  }
  
  // Keep only the last 20 devices
  if (this.devices.length > 20) {
    this.devices = this.devices.slice(-20);
  }

  return this.save();
};

userSchema.methods.getDeviceBreakdown = function () {
  if (!this.devices) return {};
  
  const breakdown = {};
  this.devices.forEach((device) => {
    breakdown[device.device_type] = (breakdown[device.device_type] || 0) + 1;
  });
  return breakdown;
};

// Clean up expired quick login keys
userSchema.methods.cleanupExpiredQuickLoginKeys = function () {
  if (!this.quick_login_keys) return this;
  
  const now = new Date();
  const originalLength = this.quick_login_keys.length;
  
  // Remove expired keys
  this.quick_login_keys = this.quick_login_keys.filter(key => {
    // Keep keys that don't have expiration or haven't expired yet
    return !key.expires_at || key.expires_at > now;
  });
  
  const removedCount = originalLength - this.quick_login_keys.length;
  if (removedCount > 0) {
    console.log(`Cleaned up ${removedCount} expired quick login keys for user ${this.email}`);
  }
  
  return this;
};

// End a specific session
userSchema.methods.endSession = async function (sessionId) {
  if (!this.sessions) return this;
  
  const sessionIndex = this.sessions.findIndex(session => session.session_id === sessionId);
  if (sessionIndex !== -1) {
    this.sessions[sessionIndex].is_active = false;
    this.sessions[sessionIndex].invalidated_at = new Date();
  }
  
  return this;
};

// Set user offline
userSchema.methods.setOffline = async function () {
  // This method can be used to mark user as offline
  // For now, we'll just return the user object
  return this;
};

// Static methods
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.generateStudentId = async function () {
  const count = await this.countDocuments({ role: "student" });
  return `STU${String(count + 1).padStart(6, "0")}`;
};

// Clean up expired quick login keys for all users
userSchema.statics.cleanupAllExpiredQuickLoginKeys = async function () {
  try {
    const users = await this.find({
      'quick_login_keys.expires_at': { $lt: new Date() }
    });
    
    let totalCleaned = 0;
    for (const user of users) {
      const originalLength = user.quick_login_keys.length;
      user.cleanupExpiredQuickLoginKeys();
      await user.save();
      totalCleaned += originalLength - user.quick_login_keys.length;
    }
    
    console.log(`Cleaned up ${totalCleaned} expired quick login keys across ${users.length} users`);
    return totalCleaned;
  } catch (error) {
    console.error('Error cleaning up expired quick login keys:', error);
    throw error;
  }
};

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  // Skip hashing if explicitly requested (for already hashed passwords)
  if (this._skipPasswordHash) return next();
  
  try {
    console.log('🔐 PRE-SAVE HOOK - Hashing password for user:', this.email);
    
    // Use passwordSecurity utility for consistent hashing with pepper
    this.password = await passwordSecurity.hashPassword(this.password);
    
    console.log('✅ PRE-SAVE HOOK - Password hashed successfully with passwordSecurity');
    next();
  } catch (error) {
    console.error('❌ PRE-SAVE HOOK - Error hashing password:', error);
    next(error);
  }
});

// Create and export the model
const User = mongoose.model("User", userSchema);
export default User;

// Define permissions constants
const PERMISSIONS = {
  // User permissions
  VIEW_PROFILE: "view_profile",
  EDIT_PROFILE: "edit_profile",
  DELETE_PROFILE: "delete_profile",
  
  // Course permissions
  VIEW_COURSES: "view_courses",
  ENROLL_COURSES: "enroll_courses",
  COMPLETE_COURSES: "complete_courses",
  
  // Admin permissions
  MANAGE_USERS: "manage_users",
  MANAGE_COURSES: "manage_courses",
  MANAGE_CONTENT: "manage_content",
  VIEW_ANALYTICS: "view_analytics",
  MANAGE_SYSTEM: "manage_system",
};

// Export constants for roles and permissions
export {
  ROLES as USER_ROLES,
  ADMIN_ROLES as USER_ADMIN_ROLES,
  PERMISSIONS as USER_PERMISSIONS,
};


