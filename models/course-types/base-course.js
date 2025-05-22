import mongoose from "mongoose";
const { Schema } = mongoose;

// Common schemas that will be used across all course types
const toolTechnologySchema = new Schema({
  name: {
    type: String,
    required: [true, "Tool/technology name is required"],
    trim: true,
  },
  category: {
    type: String,
    enum: {
      values: [
        "programming_language",
        "framework",
        "library",
        "tool",
        "platform",
        "other",
      ],
      message: "{VALUE} is not a valid tool category",
    },
    default: "other",
  },
  description: {
    type: String,
    default: "",
    trim: true,
  },
  logo_url: {
    type: String,
    default: "",
    trim: true,
  },
});

const faqSchema = new Schema({
  question: {
    type: String,
    required: [true, "FAQ question is required"],
    trim: true,
  },
  answer: {
    type: String,
    required: [true, "FAQ answer is required"],
    trim: true,
  },
});

const priceSchema = new Schema({
  currency: {
    type: String,
    required: [true, "Currency is required"],
    trim: true,
    enum: {
      values: ["USD", "EUR", "INR", "GBP", "AUD", "CAD"],
      message: "{VALUE} is not a supported currency",
    },
    uppercase: true,
  },
  amount: {
    type: Number,
    min: [0, "Price cannot be negative"],
    required: [true, "Price amount is required"],
  },
  discounted_amount: {
    type: Number,
    min: [0, "Discounted price cannot be negative"],
  },
});

// Base course schema that will be extended by specific course types
const baseCourseSchema = new Schema(
  {
    course_category: {
      type: String,
      required: [true, "Course category is required"],
      trim: true,
      index: true,
    },
    course_subcategory: {
      type: String,
      trim: true,
    },
    course_title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      index: true,
    },
    course_subtitle: {
      type: String,
      trim: true,
    },
    course_tag: {
      type: String,
      index: true,
    },
    course_description: {
      type: {
        program_overview: {
          type: String,
          required: [true, "Program overview is required"],
          trim: true,
        },
        benefits: {
          type: String,
          required: [true, "Benefits description is required"],
          trim: true,
        },
        learning_objectives: {
          type: [String],
          default: [],
        },
        course_requirements: {
          type: [String],
          default: [],
        },
        target_audience: {
          type: [String],
          default: [],
        },
      },
      required: [true, "Course description is required"],
    },
    course_level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced", "All Levels"],
      required: [true, "Course level is required"],
    },
    language: {
      type: String,
      default: "English",
    },
    course_image: {
      type: String,
      required: [true, "Course image URL is required"],
      trim: true,
    },
    brochures: {
      type: [String],
      default: [],
      validate: {
        validator: function (urls) {
          return urls.every(
            (url) =>
              url &&
              url.trim().length > 0 &&
              (/\.pdf($|\?|#)/.test(url) ||
                /\/pdf\//.test(url) ||
                /documents.*\.amazonaws\.com/.test(url) ||
                /drive\.google\.com/.test(url) ||
                /dropbox\.com/.test(url)),
          );
        },
        message: "Brochures must be valid PDF files",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["Published", "Upcoming", "Draft"],
        message: "{VALUE} is not a valid status",
      },
      default: "Draft",
      index: true,
    },
    course_type: {
      type: String,
      enum: ["blended", "live", "free"],
      required: [true, "Course type is required"],
    },
    tools_technologies: {
      type: [toolTechnologySchema],
      default: [],
    },
    faqs: {
      type: [faqSchema],
      default: [],
    },
    meta: {
      views: {
        type: Number,
        default: 0,
        min: 0,
      },
      ratings: {
        average: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
        },
        count: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      enrollments: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    show_in_home: {
      type: Boolean,
      default: false,
      index: true,
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    discriminatorKey: "course_type", // This allows us to create different course types
  }
);

// Add any common methods here
baseCourseSchema.methods.getStudentProgress = async function (studentId) {
  const [enrollment, progress] = await Promise.all([
    this.model("Enrollment").findOne({ course: this._id, student: studentId }),
    this.model("Progress").findOne({ course: this._id, student: studentId }),
  ]);
  
  if (!enrollment || !progress) return null;
  
  return {
    enrollment,
    progress: {
      overall: progress.overallProgress,
      lastAccessed: progress.lastAccessed,
      meta: progress.meta
    }
  };
};

const BaseCourse = mongoose.model("Course", baseCourseSchema);

export { 
  BaseCourse,
  baseCourseSchema,
  toolTechnologySchema,
  faqSchema,
  priceSchema
}; 