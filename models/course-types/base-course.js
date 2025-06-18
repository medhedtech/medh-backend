import mongoose from "mongoose";
import validator from "validator";
import { v4 as uuidv4 } from "uuid";
import { SUPPORTED_CURRENCIES } from "../../config/currencies.js";
import { 
  baseLessonSchema,
  videoLessonSchema,
  quizLessonSchema,
  assessmentLessonSchema,
} from "../lesson-schemas.js";

const { Schema } = mongoose;

// Lesson Resource Schema for curriculum lessons
const lessonResourceSchema = new Schema({
  id: {
    type: String,
    // ID will be auto-generated, not required on input
  },
  title: {
    type: String,
    required: [true, "Resource title is required"],
    trim: true,
  },
  url: {
    type: String,
    required: [true, "Resource URL is required"],
    trim: true,
  },
  type: {
    type: String,
    enum: ["pdf", "document", "link", "other"],
    required: [true, "Resource type is required"],
  },
  description: {
    type: String,
    default: "",
    trim: true,
  },
});

// Curriculum Section Schema
const curriculumSectionSchema = new Schema(
  {
    id: {
      type: String,
      // ID will be auto-generated, not required on input
    },
    title: {
      type: String,
      required: [true, "Section title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    order: {
      type: Number,
      required: [true, "Section order is required"],
      min: [0, "Order cannot be negative"],
    },
    // Now using embedded lessons instead of references
    lessons: [baseLessonSchema],
    resources: [
      {
        title: {
          type: String,
          required: [true, "Resource title is required"],
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        fileUrl: {
          type: String,
          required: [true, "Resource file URL is required"],
          trim: true,
        },
        type: {
          type: String,
          enum: ["pdf", "document", "video", "audio", "link"],
          required: [true, "Resource type is required"],
        },
      },
    ],
  },
  { timestamps: true },
);

// Curriculum Week Schema
const curriculumWeekSchema = new Schema(
  {
    id: {
      type: String,
      // ID will be auto-generated, not required on input
    },
    weekTitle: {
      type: String,
      required: [true, "Week title is required"],
      trim: true,
    },
    weekDescription: {
      type: String,
      default: "",
      trim: true,
    },
    topics: [
      {
        type: String,
        trim: true,
      },
    ],
    // Support for direct lessons without sections
    lessons: {
      type: [baseLessonSchema],
      default: [],
    },
    // Live classes specific to this week
    liveClasses: {
      type: [
        {
          title: {
            type: String,
            required: [true, "Live class title is required"],
            trim: true,
          },
          description: {
            type: String,
            default: "",
            trim: true,
          },
          scheduledDate: {
            type: Date,
            required: [true, "Live class scheduled date is required"],
          },
          duration: {
            type: Number,
            min: [15, "Live class duration must be at least 15 minutes"],
            required: [true, "Live class duration is required"],
          },
          meetingLink: {
            type: String,
            trim: true,
          },
          instructor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Instructor",
          },
          recordingUrl: {
            type: String,
            trim: true,
          },
          isRecorded: {
            type: Boolean,
            default: false,
          },
          materials: [
            {
              title: {
                type: String,
                required: [true, "Material title is required"],
                trim: true,
              },
              url: {
                type: String,
                required: [true, "Material URL is required"],
                trim: true,
              },
              type: {
                type: String,
                enum: ["pdf", "document", "presentation", "code", "other"],
                default: "other",
              },
            },
          ],
        },
      ],
      default: [],
    },
    sections: {
      type: [curriculumSectionSchema],
      default: [],
    },
  },
  { timestamps: true },
);

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
      values: SUPPORTED_CURRENCIES,
      message: "{VALUE} is not a supported currency",
    },
    uppercase: true,
  },
  individual: {
    type: Number,
    min: [0, "Individual price cannot be negative"],
    default: 0,
  },
  batch: {
    type: Number,
    min: [0, "Batch price cannot be negative"],
    default: 0,
  },
  min_batch_size: {
    type: Number,
    min: [2, "Minimum batch size must be at least 2"],
    default: 2,
  },
  max_batch_size: {
    type: Number,
    min: [2, "Maximum batch size must be at least 2"],
    default: 10,
    validate: {
      validator: function (v) {
        return v >= this.min_batch_size;
      },
      message:
        "Maximum batch size must be greater than or equal to minimum batch size",
    },
  },
  early_bird_discount: {
    type: Number,
    min: [0, "Early bird discount cannot be negative"],
    max: [100, "Early bird discount cannot exceed 100%"],
    default: 0,
  },
  group_discount: {
    type: Number,
    min: [0, "Group discount cannot be negative"],
    max: [100, "Group discount cannot exceed 100%"],
    default: 0,
  },
  is_active: {
    type: Boolean,
    default: true,
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
      type: Schema.Types.Mixed, // Allow both string and object for backward compatibility
      required: [true, "Course description is required"],
      validate: {
        validator: function(v) {
          // Allow strings for backward compatibility
          if (typeof v === 'string') {
            return v.trim().length > 0;
          }
          // Validate object structure if it's an object
          if (typeof v === 'object' && v !== null) {
            return v.program_overview && v.benefits;
          }
          return false;
        },
        message: "Course description must be a non-empty string or object with program_overview and benefits"
      },
      set: function(v) {
        // If it's a string, convert to object structure
        if (typeof v === 'string' && v.trim()) {
          return {
            program_overview: v.trim(),
            benefits: v.trim(),
            learning_objectives: [],
            course_requirements: [],
            target_audience: []
          };
        }
        return v;
      }
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
    course_grade: {
      type: String,
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

    // Legacy compatibility fields
    course_fee: {
      type: Number,
      min: [0, "Course fee cannot be negative"],
      default: 0,
    },
    
    course_videos: {
      type: [String],
      default: [],
    },
    
    resource_videos: {
      type: [String], 
      default: [],
    },
    
    recorded_videos: {
      type: [String],
      default: [],
    },
    
    min_hours_per_week: {
      type: Number,
      min: [0, "Minimum hours per week cannot be negative"],
    },
    
    max_hours_per_week: {
      type: Number,
      min: [0, "Maximum hours per week cannot be negative"],
      validate: {
        validator: function(v) {
          return this.min_hours_per_week === undefined || v >= this.min_hours_per_week;
        },
        message: "Maximum hours per week must be greater than or equal to minimum hours per week"
      }
    },
    
    specifications: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    
    unique_key: {
      type: String,
      unique: true,
      sparse: true,
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
    
    // Pricing structure (legacy compatible)
    prices: {
      type: [priceSchema],
      default: [],
    },
    
    // Data source tracking for migration compatibility
    _source: {
      type: String,
      enum: {
        values: ["legacy_model", "new_model"],
        message: "{VALUE} is not a valid source type",
      },
      default: "new_model",
      index: true,
    },
    
    // Legacy compatibility fields
    subtitle_languages: {
      type: [String],
      default: [],
    },
    no_of_Sessions: {
      type: Number,
      min: [0, "Number of sessions cannot be negative"],
    },
    course_duration: {
      type: String,
      trim: true,
    },
    session_duration: {
      type: Schema.Types.Mixed, // Allow both String and Number for backward compatibility
      validate: {
        validator: function(v) {
          if (v === null || v === undefined) return true;
          if (typeof v === 'string') return v.trim().length > 0;
          if (typeof v === 'number') return v > 0;
          return false;
        },
        message: "Session duration must be a valid string or positive number"
      }
    },
    category_type: {
      type: String,
      enum: {
        values: ["Paid", "Live", "Free"],
        message: "{VALUE} is not a valid category type",
      },
    },
    isFree: {
      type: Boolean,
      default: false,
      index: true,
    },
    assigned_instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    specifications: {
      type: Schema.Types.ObjectId,
      ref: "CategorySpecification",
    },
    unique_key: {
      type: String,
      unique: true,
      sparse: true,
    },
    resource_pdfs: [{
      title: {
        type: String,
        trim: true,
      },
      url: {
        type: String,
        validate: {
          validator: function (v) {
            return validator.isURL(v);
          },
          message: "Resource PDF URL must be valid",
        },
      },
      description: {
        type: String,
        trim: true,
      },
    }],
    bonus_modules: [{
      title: {
        type: String,
        required: true,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
      content: [{
        type: {
          type: String,
          enum: ["video", "pdf", "quiz", "assignment"],
          required: true,
        },
        title: {
          type: String,
          required: true,
          trim: true,
        },
        url: {
          type: String,
          validate: {
            validator: function (v) {
              return validator.isURL(v);
            },
            message: "Content URL must be valid",
          },
        },
        duration: String,
      }],
      order: {
        type: Number,
        default: 0,
      },
    }],
    final_evaluation: {
      has_final_exam: {
        type: Boolean,
        default: false,
      },
      has_final_project: {
        type: Boolean,
        default: false,
      },
      final_exam: {
        title: String,
        description: String,
        duration_minutes: Number,
        passing_score: {
          type: Number,
          min: 0,
          max: 100,
        },
      },
      final_project: {
        title: String,
        description: String,
        submission_deadline_days: Number,
        evaluation_criteria: [String],
      },
    },
    efforts_per_Week: {
      type: String,
      trim: true,
    },
    class_type: {
      type: String,
      trim: true,
      // Remove enum validation to allow legacy values like "Live Courses", etc.
    },
    is_Certification: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    is_Assignments: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    is_Projects: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    is_Quizes: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    related_courses: {
      type: [String],
      default: [],
    },
    min_hours_per_week: {
      type: Number,
      min: [0, "Minimum hours per week cannot be negative"],
    },
    max_hours_per_week: {
      type: Number,
      min: [0, "Maximum hours per week cannot be negative"],
      validate: {
        validator: function (v) {
          return !this.min_hours_per_week || v >= this.min_hours_per_week;
        },
        message: "Maximum hours per week must be greater than or equal to minimum hours per week",
      },
    },
    
    // Curriculum structure - now available for all course types
    curriculum: {
      type: [curriculumWeekSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    discriminatorKey: "course_type", // This allows us to create different course types
    collection: "courses", // Use the same collection as legacy courses
  }
);

// Create text search index
baseCourseSchema.index(
  {
    course_title: "text",
    course_category: "text",
    "course_description.program_overview": "text",
    "course_description.benefits": "text",
    course_tag: "text",
    course_grade: "text"
  },
  {
    weights: {
      course_title: 10,
      course_category: 5,
      "course_description.program_overview": 3,
      "course_description.benefits": 2,
      course_tag: 1,
      course_grade: 1
    },
    name: "CourseSearchIndex",
  }
);

/**
 * Recursively assign IDs to nested curriculum data.
 * Expects a curriculum array with weeks having sections and lessons.
 */
const assignCurriculumIds = (curriculum) => {
  curriculum.forEach((week, weekIndex) => {
    week.id = `week_${weekIndex + 1}`;

    // Assign IDs to direct lessons under weeks
    if (week.lessons && week.lessons.length) {
      week.lessons.forEach((lesson, lessonIndex) => {
        lesson.id = `lesson_w${weekIndex + 1}_${lessonIndex + 1}`;
        if (lesson.resources && lesson.resources.length) {
          lesson.resources.forEach((resource, resourceIndex) => {
            resource.id = `resource_${lesson.id}_${resourceIndex + 1}`;
          });
        }
      });
    }

    // Assign IDs to live classes
    if (week.liveClasses && week.liveClasses.length) {
      week.liveClasses.forEach((liveClass, classIndex) => {
        if (!liveClass.id) {
          liveClass.id = `live_w${weekIndex + 1}_${classIndex + 1}`;
        }
      });
    }

    // Original section and lesson IDs assignment
    if (week.sections && week.sections.length) {
      week.sections.forEach((section, sectionIndex) => {
        section.id = `section_${weekIndex + 1}_${sectionIndex + 1}`;
        if (section.lessons && section.lessons.length) {
          section.lessons.forEach((lesson, lessonIndex) => {
            lesson.id = `lesson_${weekIndex + 1}_${sectionIndex + 1}_${lessonIndex + 1}`;
            if (lesson.resources && lesson.resources.length) {
              lesson.resources.forEach((resource, resourceIndex) => {
                resource.id = `resource_${lesson.id}_${resourceIndex + 1}`;
              });
            }
          });
        }
      });
    }
  });
};

// Pre-save hook to assign curriculum IDs
baseCourseSchema.pre("save", function (next) {
  // Auto-generate unique key if not provided
  if (!this.unique_key) {
    this.unique_key = uuidv4();
  }
  
  // Auto-generate slug if not provided
  if (!this.slug && this.course_title) {
    const generateSlug = (title) => {
      return title
        .toLowerCase()
        .replace(/[^\w ]+/g, "")
        .replace(/ +/g, "-");
    };
    this.slug = generateSlug(this.course_title);
  }
  
  // Set isFree flag based on category_type
  this.isFree = this.category_type === "Free";
  
  // Update meta.lastUpdated if document is modified
  if (this.isModified()) {
    this.meta.lastUpdated = Date.now();
  }
  
  // Recursively assign IDs in the curriculum structure
  if (this.curriculum && this.curriculum.length > 0) {
    assignCurriculumIds(this.curriculum);
  }
  
  next();
});

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

// Check if the model already exists to prevent the "OverwriteModelError"
const BaseCourse = mongoose.models.BaseCourse || mongoose.model("BaseCourse", baseCourseSchema);

export { 
  BaseCourse,
  baseCourseSchema,
  toolTechnologySchema,
  faqSchema,
  priceSchema,
  curriculumWeekSchema,
  curriculumSectionSchema,
  lessonResourceSchema
}; 