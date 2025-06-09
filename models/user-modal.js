import mongoose from "mongoose";
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

const GENDERS = ["Male", "Female", "Others"];

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

// Define user meta schema
const userMetaSchema = new Schema(
  {
    course_name: {
      type: String,
    },
    date_of_birth: {
      type: Date,
    },
    education_level: {
      type: String,
    },
    language: {
      type: String,
    },
    age_group: {
      type: String,
      enum: AGE_GROUPS,
    },
    category: {
      type: String,
    },
    gender: {
      type: String,
      enum: GENDERS,
      default: "Male",
    },
    upload_resume: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);

// Define the main user schema with improved validation
const userSchema = new Schema(
  {
    full_name: {
      type: String,
      trim: true,
      required: [true, "Full name is required"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: [true, "Email is required"],
      unique: true,
      validate: {
        validator: function (v) {
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
    phone_numbers: [phoneNumberSchema],
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    agree_terms: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    role: {
      type: [String],
      enum: Object.values(ROLES),
      default: [ROLES.STUDENT],
    },
    role_description: {
      type: String,
    },
    assign_department: {
      type: [String],
    },
    permissions: {
      type: [String],
      enum: Object.values(PERMISSIONS),
    },
    age: {
      type: String,
    },
    age_group: {
      type: String,
      enum: AGE_GROUPS,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    facebook_link: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/(?:www\.)?facebook\.com\/.+/i.test(v);
        },
        message: (props) => `${props.value} is not a valid Facebook URL!`,
      },
    },
    instagram_link: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/(?:www\.)?instagram\.com\/.+/i.test(v);
        },
        message: (props) => `${props.value} is not a valid Instagram URL!`,
      },
    },
    linkedin_link: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/(?:www\.)?linkedin\.com\/.+/i.test(v);
        },
        message: (props) => `${props.value} is not a valid LinkedIn URL!`,
      },
    },
    user_image: {
      type: String,
    },
    meta: {
      type: userMetaSchema,
      default: () => ({
        gender: "Male",
        upload_resume: [],
      }),
    },
    admin_role: {
      type: String,
      enum: Object.values(ADMIN_ROLES),
      default: ADMIN_ROLES.ADMIN,
    },
    company_type: {
      type: String,
      enum: COMPANY_TYPES,
    },
    company_website: {
      type: String,
      validate: {
        validator: function (v) {
          return (
            !v || /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(v)
          );
        },
        message: (props) => `${props.value} is not a valid website URL!`,
      },
    },
    corporate_id: {
      type: String,
    },
    last_login: {
      type: Date,
    },
    login_count: {
      type: Number,
      default: 0,
    },
    // Enhanced login tracking and analytics
    login_history: [{
      timestamp: {
        type: Date,
        required: true,
      },
      ip_address: {
        type: String,
        trim: true,
      },
      user_agent: {
        type: String,
        trim: true,
      },
      device_info: {
        type: {
          type: String,
          enum: ['Desktop', 'Mobile', 'Tablet', 'Unknown'],
          default: 'Unknown',
        },
        browser: {
          type: String,
          default: 'Unknown',
        },
        os: {
          type: String,
          default: 'Unknown',
        },
        is_mobile: {
          type: Boolean,
          default: false,
        },
        is_tablet: {
          type: Boolean,
          default: false,
        },
      },
      session_id: {
        type: String,
        trim: true,
      },
      days_since_last_login: {
        type: Number,
        min: 0,
      },
    }],
    login_analytics: {
      first_login: {
        type: Date,
      },
      total_sessions: {
        type: Number,
        default: 0,
        min: 0,
      },
      unique_devices: [{
        type: String, // Hashed device fingerprints
      }],
      unique_ips: [{
        type: String,
        validate: {
          validator: function(v) {
            // Basic IP validation (IPv4 and IPv6)
            return !v || /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(v);
          },
          message: props => `${props.value} is not a valid IP address!`
        }
      }],
      login_frequency: {
        daily: {
          type: Number,
          default: 0,
          min: 0,
        },
        weekly: {
          type: Number,
          default: 0,
          min: 0,
        },
        monthly: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      device_stats: {
        mobile: {
          type: Number,
          default: 0,
          min: 0,
        },
        tablet: {
          type: Number,
          default: 0,
          min: 0,
        },
        desktop: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      browser_stats: {
        type: Map,
        of: Number,
        default: new Map(),
      },
      os_stats: {
        type: Map,
        of: Number,
        default: new Map(),
      },
      average_session_duration: {
        type: Number, // in minutes
        default: 0,
        min: 0,
      },
      last_activity: {
        type: Date,
      },
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationOTP: {
      type: String,
    },
    emailVerificationOTPExpires: {
      type: Date,
    },
    // Instructor assignment fields for students
    assigned_instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      validate: {
        validator: async function(v) {
          if (!v) return true; // Allow null/undefined
          const instructor = await mongoose.model('User').findById(v);
          return instructor && instructor.role.includes('instructor');
        },
        message: 'Assigned instructor must have instructor role'
      }
    },
    instructor_assignment_date: {
      type: Date,
    },
    instructor_assignment_type: {
      type: String,
      enum: ["mentor", "tutor", "advisor", "supervisor"],
      default: "mentor",
    },
    instructor_assignment_notes: {
      type: String,
      trim: true,
    },
    // Location and timezone fields
    timezone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          // Basic timezone validation - accepts formats like 'UTC', 'America/New_York', 'Asia/Kolkata', etc.
          return !v || /^[A-Za-z]+\/[A-Za-z_]+$|^UTC$|^GMT[+-]\d{1,2}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid timezone format!`,
      },
    },
    country: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          // Basic country validation - accepts 2-3 letter country codes or full country names
          return !v || /^[A-Za-z\s]{2,50}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid country format!`,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
  },
);

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
  return this.find({ status: "Active" });
};

userSchema.statics.findInactiveUsers = function () {
  return this.find({ status: "Inactive" });
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

// Add indexes for better query performance
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ admin_role: 1 });
userSchema.index({ "phone_numbers.number": 1 });
userSchema.index({ assigned_instructor: 1 });
userSchema.index({ last_login: -1 }); // For recent login queries
userSchema.index({ login_count: -1 }); // For most active users
userSchema.index({ "login_analytics.total_sessions": -1 }); // For session analytics
userSchema.index({ "login_analytics.first_login": 1 }); // For user registration analytics
userSchema.index({ "login_history.timestamp": -1 }); // For login history queries
userSchema.index({ "login_history.ip_address": 1 }); // For security analysis
userSchema.index({ email: 1, last_login: -1 }); // Compound index for user activity queries

// Export model constants for use in other files
export const USER_ROLES = ROLES;
export const USER_PERMISSIONS = PERMISSIONS;
export const USER_ADMIN_ROLES = ADMIN_ROLES;

// Create and export the model
const User = mongoose.model("User", userSchema);
export default User;
