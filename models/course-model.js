const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// Define PDF resource schema (previously missing)
const pdfResourceSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  url: { 
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /\.pdf($|\?|#)/.test(v) || 
               /\/pdf\//.test(v) || 
               /documents.*\.amazonaws\.com/.test(v) ||
               /drive\.google\.com/.test(v) ||
               /dropbox\.com/.test(v);
      },
      message: props => `${props.value} is not a valid PDF URL. URL must end with .pdf or be from a supported cloud storage provider.`
    }
  },
  description: { 
    type: String, 
    default: '' 
  },
  size_mb: { 
    type: Number, 
    min: 0,
    max: 50,
    default: null 
  },
  pages: { 
    type: Number, 
    min: 1,
    default: null 
  },
  upload_date: { 
    type: Date, 
    default: Date.now 
  }
});

// Define FAQ schema
const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true,
    trim: true
  }
});

// Define curriculum week schema
const curriculumWeekSchema = new mongoose.Schema({
  weekTitle: {
    type: String,
    required: true,
    trim: true
  },
  weekDescription: {
    type: String,
    required: true,
    trim: true
  },
  topics: {
    type: [String],
    default: []
  },
  resources: {
    type: [{
      title: { type: String, required: true, trim: true },
      type: { 
        type: String, 
        enum: ['video', 'pdf', 'link', 'other'],
        required: true
      },
      url: { 
        type: String,
        required: true,
        validate: {
          validator: function(v) {
            // Only validate if type is pdf
            if (this.type === 'pdf') {
              return /\.pdf($|\?|#)/.test(v) || 
                     /\/pdf\//.test(v) || 
                     /documents.*\.amazonaws\.com/.test(v) ||
                     /drive\.google\.com/.test(v) ||
                     /dropbox\.com/.test(v);
            }
            return true;
          },
          message: props => `${props.value} is not a valid PDF URL. URL must end with .pdf or be from a supported cloud storage provider.`
        }
      },
      description: { type: String, default: '' },
      // Additional fields for PDF resources
      size_mb: { 
        type: Number, 
        min: 0,
        max: 50,
        default: null 
      },
      pages: { 
        type: Number, 
        min: 1,
        default: null 
      },
      upload_date: { 
        type: Date, 
        default: Date.now 
      }
    }],
    default: []
  }
});

// Define tools and technologies schema
const toolTechnologySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['programming_language', 'framework', 'library', 'tool', 'platform', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    default: ''
  },
  logo_url: {
    type: String,
    default: ''
  }
});

// Define bonus module schema
const bonusModuleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  resources: {
    type: [{
      title: { type: String, required: true, trim: true },
      type: { 
        type: String, 
        enum: ['video', 'pdf', 'link', 'other'],
        required: true
      },
      url: { 
        type: String,
        required: true,
        validate: {
          validator: function(v) {
            // Only validate if type is pdf
            if (this.type === 'pdf') {
              return /\.pdf($|\?|#)/.test(v) || 
                     /\/pdf\//.test(v) || 
                     /documents.*\.amazonaws\.com/.test(v) ||
                     /drive\.google\.com/.test(v) ||
                     /dropbox\.com/.test(v);
            }
            return true;
          },
          message: props => `${props.value} is not a valid PDF URL. URL must end with .pdf or be from a supported cloud storage provider.`
        }
      },
      description: { type: String, default: '' },
      // Additional fields for PDF resources
      size_mb: { 
        type: Number, 
        min: 0,
        max: 50,
        default: null 
      },
      pages: { 
        type: Number, 
        min: 1,
        default: null 
      },
      upload_date: { 
        type: Date, 
        default: Date.now 
      }
    }],
    default: []
  }
});

// Define price schema for individual and batch pricing
const priceSchema = new mongoose.Schema({
  currency: {
    type: String,
    required: true,
    trim: true,
    enum: ['USD', 'EUR', 'INR', 'GBP', 'AUD', 'CAD']
  },
  individual: {
    type: Number,
    min: 0,
    default: 0
  },
  batch: {
    type: Number,
    min: 0,
    default: 0
  },
  min_batch_size: {
    type: Number,
    min: 2,
    default: 2
  },
  max_batch_size: {
    type: Number,
    min: 2,
    default: 10
  },
  early_bird_discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  group_discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  }
});

const courseSchema = new mongoose.Schema(
  {
    course_category: {
      type: String,
    },
    course_title: {
      type: String,
    },
    course_tag: {
      type: String,
      enum: ["Live", "Hybrid", "Pre-Recorded", "Free"],
    },
    no_of_Sessions: {
      type: Number,
    },
    course_duration: {
      type: String,
    },
    session_duration: {
      type: String,
    },
    course_description: {
      type: {
        program_overview: {
          type: String
        },
        benefits: {
          type: String
        }
      }
    },
    category: {
      type: String,
    },
    course_fee: {
      type: Number,
      min: 0,
      default: 0
    },
    // Add prices array for multiple currencies with individual and batch pricing
    prices: {
      type: [priceSchema],
      default: []
    },
    course_videos: {
      type: [String],
      default: [],
    },
    brochures: {
      type: [String],
      default: [],
      validate: {
        validator: function(v) {
          // Validate that brochures contain valid PDF URLs
          return v.every(url => 
            /\.pdf($|\?|#)/.test(url) || 
            /\/pdf\//.test(url) || 
            /documents.*\.amazonaws\.com/.test(url) ||
            /drive\.google\.com/.test(url) ||
            /dropbox\.com/.test(url)
          );
        },
        message: 'Brochures must be valid PDF files'
      }
    },
    status: {
      type: String,
      enum: ["Published", "Upcoming"],
      default: "Upcoming",
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    assigned_instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssignedInstructor",
      default: null,
    },
    specifications: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    unique_key: {
      type: String,
      unique: true,
    },
    course_image: {
      type: String,
    },
    course_grade: {
      type: String,
    },
    resource_videos: {
      type: [String],
      default: [],
    },
    resource_pdfs: {
      type: [pdfResourceSchema],
      default: [],
    },
    curriculum: {
      type: [curriculumWeekSchema],
      default: []
    },
    // FAQs field
    faqs: {
      type: [faqSchema],
      default: []
    },
    // Tools and technologies field
    tools_technologies: {
      type: [toolTechnologySchema],
      default: []
    },
    // Bonus modules field
    bonus_modules: {
      type: [bonusModuleSchema],
      default: []
    },
    recorded_videos: {
      type: [String],
      default: [],
    },
    efforts_per_Week: {
      type: String,
    },
    class_type: {
      type: String,
    },
    is_Certification: {
      type: String,
      enum: ["Yes", "No"],
    },
    is_Assignments: {
      type: String,
      enum: ["Yes", "No"],
    },
    is_Projects: {
      type: String,
      enum: ["Yes", "No"],
    },
    is_Quizes: {
      type: String,
      enum: ["Yes", "No"],
    },
    related_courses: {
      type: [String],
      default: [],
    },
    min_hours_per_week: {
      type: Number,
      min: 0
    },
    max_hours_per_week: {
      type: Number,
      min: 0
    },
    category_type: {
      type: String,
      enum: ["Free", "Paid", "Live", "Hybrid", "Pre-Recorded"],
      default: "Paid"
    }
  },
  { timestamps: true }
);

// Add text index for better search performance
courseSchema.index({
  course_title: 'text',
  course_category: 'text',
  'course_description.program_overview': 'text',
  'course_description.benefits': 'text',
  course_tag: 'text'
}, {
  weights: {
    course_title: 10,
    course_category: 5,
    'course_description.program_overview': 3,
    'course_description.benefits': 2,
    course_tag: 1
  },
  name: "CourseSearchIndex"
});

// Add compound indexes for common filter combinations
courseSchema.index({ category_type: 1, status: 1, course_fee: 1 });
courseSchema.index({ course_category: 1, isFree: 1 });
courseSchema.index({ createdAt: -1 });

// Automatically generate a unique key before saving the document
courseSchema.pre("save", function (next) {
  if (!this.unique_key) {
    this.unique_key = uuidv4();
  }
  
  // Auto-calculate isFree based on category_type
  this.isFree = (this.category_type === "Free");
  
  // Format efforts_per_Week if not provided but min/max hours are
  if (!this.efforts_per_Week && this.min_hours_per_week && this.max_hours_per_week) {
    this.efforts_per_Week = `${this.min_hours_per_week} - ${this.max_hours_per_week} hours / week`;
  }
  
  // Set course_fee based on the first batch price if available
  if (this.prices && this.prices.length > 0 && this.prices[0].batch) {
    this.course_fee = this.prices[0].batch;
  }
  
  next();
});

// Helper function to validate PDF URLs
courseSchema.statics.isValidPdfUrl = function(url) {
  return /\.pdf($|\?|#)/.test(url) || 
         /\/pdf\//.test(url) || 
         /documents.*\.amazonaws\.com/.test(url) ||
         /drive\.google\.com/.test(url) ||
         /dropbox\.com/.test(url);
};

const Course = mongoose.model("Course", courseSchema);
module.exports = Course;
