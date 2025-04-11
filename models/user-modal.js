import mongoose from "mongoose";
const { Schema } = mongoose;

// Define constants for roles and permissions for better maintainability
const ROLES = {
  ADMIN: "admin",
  STUDENT: "student",
  INSTRUCTOR: "instructor",
  CORPORATE: "coorporate",
  CORPORATE_STUDENT: "coorporate-student",
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
};

const ADMIN_ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  CORPORATE_ADMIN: "coorporate-admin",
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
          return /^\d{10,15}$/.test(v);
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
    age: {
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

// Export model constants for use in other files
export const USER_ROLES = ROLES;
export const USER_PERMISSIONS = PERMISSIONS;
export const USER_ADMIN_ROLES = ADMIN_ROLES;

// Create and export the model
const User = mongoose.model("User", userSchema);
export default User;
