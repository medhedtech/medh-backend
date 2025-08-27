import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    // Basic Information
    full_name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    age: {
      type: mongoose.Schema.Types.Mixed, // Allow both Number and String
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone_numbers: [{
      type: String,
      trim: true,
    }],
    
    // Profile Information
    bio: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    timezone: {
      type: String,
      trim: true,
    },
    
    // Personal Details
    date_of_birth: {
      type: String, // Store as string to handle various date formats
      trim: true,
    },
    gender: {
      type: String,
      trim: true,
    },
    nationality: {
      type: String,
      trim: true,
    },
    
    // Social Media Links
    facebook_link: {
      type: String,
      trim: true,
    },
    instagram_link: {
      type: String,
      trim: true,
    },
    linkedin_link: {
      type: String,
      trim: true,
    },
    twitter_link: {
      type: String,
      trim: true,
    },
    youtube_link: {
      type: String,
      trim: true,
    },
    github_link: {
      type: String,
      trim: true,
    },
    portfolio_link: {
      type: String,
      trim: true,
    },
    
    // Education Information
    education_level: {
      type: String,
      trim: true,
    },
    institution_name: {
      type: String,
      trim: true,
    },
    field_of_study: {
      type: String,
      trim: true,
    },
    graduation_year: {
      type: Number,
    },
    
    // Professional Information
    occupation: {
      type: String,
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    experience_level: {
      type: String,
      trim: true,
    },
    annual_income_range: {
      type: String,
      trim: true,
    },
    
    // Skills and Interests
    skills: [{
      type: String,
      trim: true,
    }],
    interests: [{
      type: String,
      trim: true,
    }],
    learning_goals: [{
      type: String,
      trim: true,
    }],
    certifications: [{
      type: String,
      trim: true,
    }],
    preferred_study_times: [{
      type: String,
      trim: true,
    }],
    languages_spoken: [{
      type: mongoose.Schema.Types.Mixed, // Allow both String and Object formats
    }],
    
    // Course Information
    course_name: {
      type: String,
    },
    
    // System Fields
    meta: {
      createdBy: {
        type: String,
      },
      updatedBy: {
        type: String,
      },
      deletedAt: {
        type: Date,
      },
      lastProfileUpdate: {
        type: Date,
      },
      // Allow additional meta fields
      type: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    upload_image: {
      type: String,
    },
    is_subscribed: {
      type: Boolean,
      default: false,
    },
    subscription_end_date: {
      type: Date,
    },
    membership_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },
  },
  { 
    timestamps: true,
    strict: false, // Allow additional fields not defined in schema
  },
);

const Student = mongoose.model("Student", studentSchema);
export default Student;
