import mongoose from "mongoose";

const enrollJobSchema = new mongoose.Schema(
  {
    // Basic application fields
    full_name: { 
      type: String, 
      required: true,
      trim: true 
    },
    email: { 
      type: String, 
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    country: { 
      type: String,
      required: true,
      trim: true
    },
    phone_number: { 
      type: String,
      required: true,
      trim: true
    },
    resume_image: { 
      type: String 
    },
    message: { 
      type: String,
      trim: true
    },
    accept: { 
      type: Boolean,
      default: false
    },

    // Job Details
    title: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    designation: {
      type: String,
      required: true,
      trim: true
    },

    // Key Responsibilities
    key_responsibilities: [{
      type: String,
      trim: true
    }],

    // Qualifications
    qualifications: {
      education: {
        type: String,
        trim: true
      },
      experience: {
        minimum_years: {
          type: Number,
          min: 0
        },
        type: {
          type: String,
          trim: true
        }
      },
      skills: [{
        type: String,
        trim: true
      }],
      additional_requirements: [{
        type: String,
        trim: true
      }]
    },

    // Work Configuration
    work_mode: {
      type: String,
      enum: ['Remote', 'Office', 'Hybrid', 'Work from Office & Remote'],
      required: true
    },

    // Geographic Markets
    markets: [{
      type: String,
      enum: ['INDIA', 'US', 'UK', 'AUSTRALIA', 'GLOBAL'],
      uppercase: true
    }],

    // Selection Process
    selection_process: [{
      step: {
        type: String,
        required: true,
        trim: true
      },
      order: {
        type: Number,
        required: true
      },
      description: {
        type: String,
        trim: true
      }
    }],

    // Office Location
    office_location: {
      address: {
        type: String,
        trim: true
      },
      city: {
        type: String,
        trim: true
      },
      state: {
        type: String,
        trim: true
      },
      country: {
        type: String,
        trim: true
      }
    },

    // Work from Home Requirements
    wfh_requirements: [{
      requirement: {
        type: String,
        required: true,
        trim: true
      },
      specification: {
        type: String,
        trim: true
      },
      mandatory: {
        type: Boolean,
        default: true
      }
    }],

    // Job Status and Management
    job_status: {
      type: String,
      enum: ['Draft', 'Active', 'Paused', 'Closed', 'Archived'],
      default: 'Draft'
    },
    
    // Application tracking
    application_status: {
      type: String,
      enum: ['Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Rejected', 'Selected', 'Withdrawn'],
      default: 'Applied'
    },

    // Additional job metadata
    department: {
      type: String,
      trim: true
    },
    employment_type: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'],
      default: 'Full-time'
    },
    salary_range: {
      min: {
        type: Number,
        min: 0
      },
      max: {
        type: Number,
        min: 0
      },
      currency: {
        type: String,
        default: 'INR',
        uppercase: true
      },
      period: {
        type: String,
        enum: ['hourly', 'monthly', 'yearly'],
        default: 'yearly'
      }
    },

    // Application deadline
    application_deadline: {
      type: Date
    },

    // Job posting metadata
    posted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    posted_date: {
      type: Date,
      default: Date.now
    },
    last_updated: {
      type: Date,
      default: Date.now
    },

    // Company mission/culture
    company_mission: {
      type: String,
      trim: true
    },

    // Training and support information
    training_support: [{
      type: String,
      trim: true
    }],

    // Benefits
    benefits: [{
      type: String,
      trim: true
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
enrollJobSchema.index({ title: 'text', description: 'text' });
enrollJobSchema.index({ job_status: 1, posted_date: -1 });
enrollJobSchema.index({ markets: 1 });
enrollJobSchema.index({ work_mode: 1 });
enrollJobSchema.index({ application_deadline: 1 });
enrollJobSchema.index({ email: 1, title: 1 }, { unique: true }); // Prevent duplicate applications

// Virtual for application age
enrollJobSchema.virtual('application_age').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to update last_updated
enrollJobSchema.pre('save', function(next) {
  this.last_updated = new Date();
  next();
});

// Static method to get active jobs
enrollJobSchema.statics.getActiveJobs = function() {
  return this.find({ 
    job_status: 'Active',
    $or: [
      { application_deadline: { $gte: new Date() } },
      { application_deadline: null }
    ]
  }).sort({ posted_date: -1 });
};

// Instance method to check if application is still open
enrollJobSchema.methods.isApplicationOpen = function() {
  return this.job_status === 'Active' && 
         (!this.application_deadline || this.application_deadline >= new Date());
};

const JobForm = mongoose.model("JobPost", enrollJobSchema);
export default JobForm;
