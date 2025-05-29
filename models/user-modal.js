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

// Export model constants for use in other files
export const USER_ROLES = ROLES;
export const USER_PERMISSIONS = PERMISSIONS;
export const USER_ADMIN_ROLES = ADMIN_ROLES;

// Create and export the model
const User = mongoose.model("User", userSchema);
export default User;
