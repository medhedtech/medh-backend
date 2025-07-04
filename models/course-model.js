import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { SUPPORTED_CURRENCIES } from "../config/currencies.js";

import {
  baseLessonSchema,
  videoLessonSchema,
  quizLessonSchema,
  assessmentLessonSchema,
} from "./lesson-schemas.js";
const { Schema } = mongoose;

/* ------------------------------ */
/* Helper Functions & Constants   */
/* ------------------------------ */

const isValidPdfUrl = (v) => {
  return (
    /\.pdf($|\?|#)/.test(v) ||
    /\/pdf\//.test(v) ||
    /documents.*\.amazonaws\.com/.test(v) ||
    /drive\.google\.com/.test(v) ||
    /dropbox\.com/.test(v)
  );
};

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
};

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

/* ------------------------------ */
/* Batch Schema                   */
/* ------------------------------ */
const batchSchema = new Schema(
  {
    batch_name: {
      type: String,
      required: [true, "Batch name is required"],
      trim: true,
    },
    batch_code: {
      type: String,
      unique: true,
      required: [true, "Batch code is required"],
      trim: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required for a batch"],
    },
    status: {
      type: String,
      enum: {
        values: ["Active", "Upcoming", "Completed", "Cancelled"],
        message: "{VALUE} is not a valid batch status",
      },
      default: "Upcoming",
    },
    start_date: {
      type: Date,
      required: [true, "Batch start date is required"],
    },
    end_date: {
      type: Date,
      required: [true, "Batch end date is required"],
      validate: {
        validator: function (v) {
          return v > this.start_date;
        },
        message: "End date must be after start date",
      },
    },
    capacity: {
      type: Number,
      required: [true, "Batch capacity is required"],
      min: [1, "Batch capacity must be at least 1"],
    },
    enrolled_students: {
      type: Number,
      default: 0,
      min: [0, "Enrolled students cannot be negative"],
    },
    assigned_instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    schedule: [
      {
        // Legacy field for recurring day-based scheduling (kept for backward compatibility)
        day: {
          type: String,
          enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          required: false, // Made optional to support date-based scheduling
        },
        // New field for specific date-based scheduling
        date: {
          type: Date,
          required: false, // Either day or date should be provided
        },
        start_time: {
          type: String,
          required: true,
          match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        },
        end_time: {
          type: String,
          required: true,
          match: /^([01]\d|2[0-3]):([0-5]\d)$/,
          validate: {
            validator: function (v) {
              const startParts = this.start_time.split(':').map(Number);
              const endParts = v.split(':').map(Number);
              const startMins = startParts[0] * 60 + startParts[1];
              const endMins = endParts[0] * 60 + endParts[1];
              return endMins > startMins;
            },
            message: "End time must be after start time",
          },
        },
        // Optional fields for session metadata
        title: {
          type: String,
          trim: true,
          maxlength: [200, "Session title cannot exceed 200 characters"],
        },
        description: {
          type: String,
          trim: true,
          maxlength: [500, "Session description cannot exceed 500 characters"],
        },
        // Recorded lessons for this scheduled session
        recorded_lessons: [
          {
            title: {
              type: String,
              required: [true, "Recorded lesson title is required"],
              trim: true,
            },
            url: {
              type: String,
              required: [true, "Recorded lesson URL is required"],
              trim: true,
            },
            recorded_date: {
              type: Date,
              default: Date.now,
            },
            created_by: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              required: [true, "Creator reference is required for recorded lesson"],
            },
          },
        ],
        // Zoom meeting details for this scheduled session
        zoom_meeting: {
          meeting_id: {
            type: String,
            trim: true,
          },
          join_url: {
            type: String,
            trim: true,
          },
          topic: {
            type: String,
            trim: true,
          },
          password: {
            type: String,
            trim: true,
          },
        },
        // Audit fields for date-based sessions
        created_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        created_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    batch_notes: {
      type: String,
      trim: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator reference is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Add custom validation for schedule items
batchSchema.path('schedule').validate(function(scheduleArray) {
  if (!scheduleArray || scheduleArray.length === 0) {
    return true; // Let other validators handle empty schedule
  }
  
  for (let i = 0; i < scheduleArray.length; i++) {
    const scheduleItem = scheduleArray[i];
    const hasDay = scheduleItem.day && scheduleItem.day.trim() !== '';
    const hasDate = scheduleItem.date;
    
    // Either day or date must be provided, but not both
    if (!hasDay && !hasDate) {
      throw new Error(`Schedule item ${i + 1}: Either 'day' or 'date' must be provided`);
    }
    
    if (hasDay && hasDate) {
      throw new Error(`Schedule item ${i + 1}: Cannot have both 'day' and 'date' fields. Use either day-based or date-based scheduling`);
    }
  }
  
  return true;
}, 'Schedule validation failed');

/* ------------------------------ */
/* Schemas                        */
/* ------------------------------ */

/** PDF Resource Schema **/
const pdfResourceSchema = new Schema({
  title: {
    type: String,
    required: [true, "PDF title is required"],
    trim: true,
  },
  url: {
    type: String,
    required: [true, "PDF URL is required"],
    validate: {
      validator: isValidPdfUrl,
      message: (props) =>
        `${props.value} is not a valid PDF URL. It must end with .pdf or be from a supported provider.`,
    },
  },
  description: {
    type: String,
    default: "",
    trim: true,
  },
  size_mb: {
    type: Number,
    min: [0, "PDF size cannot be negative"],
    max: [50, "PDF size cannot exceed 50MB"],
    default: null,
  },
  pages: {
    type: Number,
    min: [1, "PDF must have at least 1 page"],
    default: null,
  },
  upload_date: {
    type: Date,
    default: Date.now,
  },
});

/** FAQ Schema **/
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

/* ------------------------------ */
/* Lesson Schemas (Embedded)      */
/* ------------------------------ */
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

/* ------------------------------ */
/* Curriculum Section Schema      */
/* ------------------------------ */
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

/* ------------------------------ */
/* Curriculum Week Schema         */
/* ------------------------------ */
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

/* ------------------------------ */
/* Tools & Technologies Schema    */
/* ------------------------------ */
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

/* ------------------------------ */
/* Bonus Module Schema            */
/* ------------------------------ */
const bonusModuleSchema = new Schema({
  title: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    default: "",
    trim: true,
  },
  resources: {
    type: [
      {
        title: {
          type: String,
          required: [true, "Resource title is required"],
          trim: true,
        },
        type: {
          type: String,
          enum: {
            values: ["video", "pdf", "link", "other"],
            message: "{VALUE} is not a valid resource type",
          },
          required: [true, "Resource type is required"],
        },
        url: {
          type: String,
          required: [true, "Resource URL is required"],
          validate: {
            validator: function (v) {
              if (this.type === "pdf") {
                return isValidPdfUrl(v);
              }
              return true;
            },
            message: (props) => `${props.value} is not a valid PDF URL.`,
          },
        },
        description: { type: String, default: "", trim: true },
        size_mb: {
          type: Number,
          min: [0, "PDF size cannot be negative"],
          max: [50, "PDF size cannot exceed 50MB"],
          default: null,
        },
        pages: {
          type: Number,
          min: [1, "PDF must have at least 1 page"],
          default: null,
        },
        upload_date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    default: [],
  },
});

/* ------------------------------ */
  /* Price Schema                   */
  /* ------------------------------ */
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

/* ------------------------------ */
/* Main Course Schema             */
/* ------------------------------ */
const courseSchema = new Schema(
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
    },
    language: {
      type: String,
      default: "English",
    },
    subtitle_languages: {
      type: [String],
      default: [],
    },
    no_of_Sessions: {
      type: Number,
      min: [1, "Number of sessions must be at least 1"],
      required: [true, "Number of sessions is required"],
    },
    course_duration: {
      type: String,
      required: [true, "Course duration is required"],
      trim: true,
    },
    session_duration: {
      type: String,
      trim: true,
    },
    prices: {
      type: [priceSchema],
      default: [],
      validate: {
        validator: function (prices) {
          if (prices.length === 0) return true;
          const currencies = prices.map((p) => p.currency);
          return new Set(currencies).size === currencies.length;
        },
        message: "Duplicate currencies are not allowed in prices array",
      },
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
    category_type: {
      type: String,
      enum: {
        values: ["Free", "Paid", "Live", "Hybrid", "Pre-Recorded"],
        message: "{VALUE} is not a valid category type",
      },
      default: "Paid",
      required: [true, "Category type is required"],
      index: true,
    },
    isFree: {
      type: Boolean,
      default: false,
      index: true,
    },
    assigned_instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
      immutable: true,
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    course_image: {
      type: String,
      required: [true, "Course image URL is required"],
      trim: true,
      validate: {
        validator: function(v) {
          // Allow empty during creation if course_image_base64 is provided
          if (!v && this.isNew && this.course_image_base64) {
            return true;
          }
          return v && v.length > 0;
        },
        message: "Course image URL is required"
      }
    },
    course_grade: {
      type: String,
      trim: true,
    },
    resource_pdfs: {
      type: [pdfResourceSchema],
      default: [],
    },
    curriculum: {
      type: [curriculumWeekSchema],
      default: [],
    },
    faqs: {
      type: [faqSchema],
      default: [],
    },
    tools_technologies: {
      type: [toolTechnologySchema],
      default: [],
    },
    bonus_modules: {
      type: [bonusModuleSchema],
      default: [],
    },
    final_evaluation: {
      final_faqs: { type: [faqSchema], default: [] },
      final_quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }],
      final_assessments: [
        { type: mongoose.Schema.Types.ObjectId, ref: "Assessment" },
      ],
      certification: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Certificate",
        default: null,
      },
    },
    efforts_per_Week: {
      type: String,
      trim: true,
    },
    class_type: {
      type: String,
      trim: true,
      enum: {
        values: [
          "Live Courses",
          "Blended Courses",
          "Self-Paced",
          "Virtual Learning",
          "Online Classes",
          "Hybrid",
          "Pre-Recorded",
        ],
        message: "{VALUE} is not a valid class type",
      },
      required: [true, "Class type is required"],
      index: true,
    },
    is_Certification: {
      type: String,
      enum: {
        values: ["Yes", "No"],
        message: "{VALUE} is not a valid certification option",
      },
      required: [true, "Certification status is required"],
    },
    is_Assignments: {
      type: String,
      enum: {
        values: ["Yes", "No"],
        message: "{VALUE} is not a valid assignments option",
      },
      required: [true, "Assignments status is required"],
    },
    is_Projects: {
      type: String,
      enum: {
        values: ["Yes", "No"],
        message: "{VALUE} is not a valid projects option",
      },
      required: [true, "Projects status is required"],
    },
    is_Quizes: {
      type: String,
      enum: {
        values: ["Yes", "No"],
        message: "{VALUE} is not a valid quizzes option",
      },
      required: [true, "Quizzes status is required"],
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
          return (
            this.min_hours_per_week === undefined ||
            v >= this.min_hours_per_week
          );
        },
        message:
          "Maximum hours per week must be greater than or equal to minimum hours per week",
      },
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
    /**
     * Tag to indicate if the course should be shown on the home page
     */
    show_in_home: {
      type: Boolean,
      default: false,
      index: true,
    },
    /**
     * Scheduled publishing fields for course automation
     */
    scheduledPublishDate: {
      type: Date,
      default: null,
    },
    scheduledPublishTimezone: {
      type: String,
      default: 'UTC',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/* ------------------------------ */
/* Indexes                        */
/* ------------------------------ */
courseSchema.index(
  {
    course_title: "text",
    course_category: "text",
    "course_description.program_overview": "text",
    "course_description.benefits": "text",
    course_tag: "text",
  },
  {
    weights: {
      course_title: 10,
      course_category: 5,
      "course_description.program_overview": 3,
      "course_description.benefits": 2,
      course_tag: 1,
    },
    name: "CourseSearchIndex",
  },
);
courseSchema.index({ category_type: 1, status: 1, course_fee: 1 });
courseSchema.index({ course_category: 1, isFree: 1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ slug: 1 }, { unique: true, sparse: true });
courseSchema.index({ scheduledPublishDate: 1 }, { sparse: true });

/* ------------------------------ */
/* Virtual Fields                 */
/* ------------------------------ */
courseSchema.virtual("durationFormatted").get(function () {
  return this.course_duration;
});
courseSchema.virtual("priceDisplay").get(function () {
  if (this.isFree) return "Free";
  if (this.prices && this.prices.length > 0) {
    const defaultPrice = this.prices[0];
    return `${defaultPrice.currency} ${defaultPrice.individual}`;
  }
  return `${this.course_fee}`;
});
courseSchema.virtual("quizzes", {
  ref: "Quiz",
  localField: "_id",
  foreignField: "course",
});
courseSchema.virtual("assignments", {
  ref: "Assignment",
  localField: "_id",
  foreignField: "course",
});
courseSchema.virtual("certificates", {
  ref: "Certificate",
  localField: "_id",
  foreignField: "course",
});

/* ------------------------------ */
/* Pre-save Hook & Automations    */
/* ------------------------------ */
courseSchema.pre("save", function (next) {
  // Auto-generate unique key and slug
  if (!this.unique_key) {
    this.unique_key = uuidv4();
  }
  if (!this.slug && this.course_title) {
    this.slug = generateSlug(this.course_title);
  }
  // Set isFree flag based on category_type
  this.isFree = this.category_type === "Free";
  // Automate efforts per week if not provided
  if (
    !this.efforts_per_Week &&
    this.min_hours_per_week &&
    this.max_hours_per_week
  ) {
    this.efforts_per_Week = `${this.min_hours_per_week} - ${this.max_hours_per_week} hours / week`;
  }
  // Always set course_fee equal to the first pricing option's batch price (if available)
  if (this.prices && this.prices.length > 0) {
    this.course_fee = this.prices[0].batch;
  }
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

/* ------------------------------ */
/* Instance Methods               */
/* ------------------------------ */
courseSchema.methods.getStatistics = async function () {
  const [totalStudents, averageRating, totalViews] = await Promise.all([
    this.model("Enrollment").countDocuments({ course: this._id }),
    this.model("Review").aggregate([
      { $match: { course: this._id, status: "approved" } },
      { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]),
    this.model("Lesson").aggregate([
      { $match: { course: this._id } },
      { $group: { _id: null, total: { $sum: "$meta.views" } } },
    ]),
  ]);

  // Count total lessons including both direct lessons and section lessons
  const totalLessons = this.curriculum.reduce((sum, week) => {
    const directLessons = week.lessons ? week.lessons.length : 0;
    const sectionLessons = week.sections
      ? week.sections.reduce(
          (weekSum, section) =>
            weekSum + (section.lessons ? section.lessons.length : 0),
          0,
        )
      : 0;
    return sum + directLessons + sectionLessons;
  }, 0);

  // Count total live classes
  const totalLiveClasses = this.curriculum.reduce((sum, week) => {
    return sum + (week.liveClasses ? week.liveClasses.length : 0);
  }, 0);

  return {
    totalStudents,
    averageRating: averageRating[0]?.avg || 0,
    totalViews: totalViews[0]?.total || 0,
    totalLessons,
    totalLiveClasses,
    totalQuizzes: await this.model("Quiz").countDocuments({ course: this._id }),
    totalAssignments: await this.model("Assignment").countDocuments({
      course: this._id,
    }),
    totalCertificates: await this.model("Certificate").countDocuments({
      course: this._id,
    }),
  };
};

courseSchema.methods.getStudentProgress = async function (studentId) {
  const [enrollment, progress] = await Promise.all([
    this.model("Enrollment").findOne({ course: this._id, student: studentId }),
    this.model("Progress").findOne({ course: this._id, student: studentId }),
  ]);
  if (!enrollment || !progress) return null;
  const lessons = await this.model("Lesson").find({ course: this._id });
  const completedLessons = progress.lessonProgress.filter(
    (p) => p.status === "completed",
  );
  const completedQuizzes = progress.quizProgress.filter(
    (p) => p.status === "completed",
  );
  const completedAssignments = progress.assignmentProgress.filter(
    (p) => p.status === "graded",
  );
  return {
    enrollment,
    progress: {
      overall: progress.overallProgress,
      lessons: {
        total: lessons.length,
        completed: completedLessons.length,
        inProgress: progress.lessonProgress.length - completedLessons.length,
      },
      quizzes: {
        total: await this.model("Quiz").countDocuments({ course: this._id }),
        completed: completedQuizzes.length,
      },
      assignments: {
        total: await this.model("Assignment").countDocuments({
          course: this._id,
        }),
        completed: completedAssignments.length,
      },
      certificate: await this.model("Certificate").findOne({
        course: this._id,
        student: studentId,
      }),
    },
  };
};

/* ------------------------------ */
/* Static Methods               */
/* ------------------------------ */
courseSchema.statics.isValidPdfUrl = function (url) {
  return isValidPdfUrl(url);
};

courseSchema.statics.findBySlugOrId = async function (identifier) {
  let course;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    course = await this.findById(identifier);
  }
  if (!course) {
    course = await this.findOne({ slug: identifier });
  }
  return course;
};

courseSchema.statics.searchCourses = async function (options = {}) {
  const {
    query = {},
    sort = { createdAt: -1 },
    page = 1,
    limit = 10,
    projection = null,
  } = options;
  const skip = (page - 1) * limit;
  const [courses, totalCount] = await Promise.all([
    this.find(query, projection).sort(sort).skip(skip).limit(limit).lean(),
    this.countDocuments(query),
  ]);
  return {
    courses,
    pagination: {
      total: totalCount,
      page,
      limit,
      pages: Math.ceil(totalCount / limit),
    },
  };
};

courseSchema.statics.createBatch = async function(courseId, batchData, adminId) {
  // Check if course exists
  const course = await this.findById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }
  
  // Generate a unique batch code if not provided
  if (!batchData.batch_code) {
    const coursePrefix = course.course_title
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    batchData.batch_code = `${coursePrefix}-${timestamp}`;
  }
  
  // Create a new batch with the provided data
  const newBatch = new Batch({
    ...batchData,
    course: courseId,
    created_by: adminId
  });
  
  return await newBatch.save();
};

courseSchema.statics.assignInstructorToBatch = async function(batchId, instructorId, adminId) {
  // Find the batch
  const batch = await Batch.findById(batchId);
  if (!batch) {
    throw new Error('Batch not found');
  }
  
  // Check if instructor exists and has instructor role
  const instructor = await mongoose.model('User').findOne({
    _id: instructorId,
    role: { $in: ['instructor'] },
    is_active: true
  });
  if (!instructor) {
    throw new Error('Instructor not found');
  }
  
  // Update the batch with the instructor
  batch.assigned_instructor = instructorId;
  batch.updated_by = adminId;
  
  return await batch.save();
};

courseSchema.statics.getBatchesForCourse = async function(courseId) {
  return await Batch.find({ course: courseId }).populate('assigned_instructor');
};

const Course = mongoose.model("Course", courseSchema);
const Batch = mongoose.model("Batch", batchSchema);

export { Course, Batch };
export default Course;
