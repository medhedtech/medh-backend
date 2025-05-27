import mongoose from "mongoose";
import { BaseCourse, baseCourseSchema } from "./base-course.js";

const { Schema } = mongoose;

// Schema for doubt sessions
const doubtSessionSchema = new Schema({
  title: {
    type: String,
    required: [true, "Session title is required"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Session description is required"],
    trim: true,
  },
  schedule: {
    date: {
      type: Date,
      required: [true, "Session date is required"],
    },
    duration: {
      type: Number,
      required: [true, "Session duration is required"],
      min: [30, "Session must be at least 30 minutes"],
    },
    time: {
      type: String,
      required: [true, "Session time is required"],
      trim: true,
    },
    timezone: {
      type: String,
      required: [true, "Timezone is required"],
      trim: true,
    }
  },
  meeting_link: {
    type: String,
    trim: true,
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Instructor",
    required: [true, "Instructor is required"],
  },
  recording_url: {
    type: String,
    trim: true,
  },
  is_recorded: {
    type: Boolean,
    default: false,
  },
  max_participants: {
    type: Number,
    required: [true, "Maximum participants is required"],
    min: [1, "Must allow at least 1 participant"],
  },
  topics_covered: [{
    type: String,
    trim: true,
  }],
  prerequisites: [{
    type: String,
    trim: true,
  }],
  materials: [{
    title: {
      type: String,
      required: [true, "Material title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    file_url: {
      type: String,
      required: [true, "File URL is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["presentation", "document", "code", "other"],
      default: "other",
    }
  }]
});

// Schemas specific to blended courses
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
    lessons: [{
      title: {
        type: String,
        required: [true, "Lesson title is required"],
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
      duration: {
        type: Number,
        required: [true, "Lesson duration is required"],
        min: [0, "Duration cannot be negative"],
      },
      content_type: {
        type: String,
        enum: ["video", "document", "quiz", "assignment"],
        required: [true, "Content type is required"],
      },
      content_url: {
        type: String,
        required: [true, "Content URL is required"],
        trim: true,
      },
      is_preview: {
        type: Boolean,
        default: false,
      },
      order: {
        type: Number,
        required: [true, "Lesson order is required"],
      }
    }],
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
    assignments: [{
      title: {
        type: String,
        required: [true, "Assignment title is required"],
        trim: true,
      },
      description: {
        type: String,
        required: [true, "Assignment description is required"],
        trim: true,
      },
      due_date: {
        type: Date,
        required: [true, "Due date is required"],
      },
      total_points: {
        type: Number,
        required: [true, "Total points is required"],
        min: [0, "Total points cannot be negative"],
      },
      instructions: {
        type: String,
        required: [true, "Instructions are required"],
        trim: true,
      }
    }],
    quizzes: [{
      title: {
        type: String,
        required: [true, "Quiz title is required"],
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
      time_limit: {
        type: Number,
        required: [true, "Time limit is required"],
        min: [1, "Time limit must be at least 1 minute"],
      },
      passing_score: {
        type: Number,
        required: [true, "Passing score is required"],
        min: [0, "Passing score cannot be negative"],
        max: [100, "Passing score cannot exceed 100"],
      }
    }],
    doubt_sessions: [doubtSessionSchema]
  },
  { timestamps: true },
);

// Schema for blended courses
const blendedCourseSchema = new Schema({
  course_duration: {
    type: String,
    required: [true, "Course duration is required"],
    trim: true,
  },
  session_duration: {
    type: String,
    required: [true, "Session duration is required"],
    trim: true,
  },
  // Note: curriculum is now inherited from BaseCourse (uses week-based structure)
  // The blended course specific curriculum sections are moved to modules for better organization
  course_modules: {
    type: [curriculumSectionSchema],
    default: [],
    validate: {
      validator: function(sections) {
        return this.curriculum.length > 0 || sections.length > 0;
      },
      message: "Course must have either curriculum weeks or course modules"
    }
  },
  doubt_session_schedule: {
    frequency: {
      type: String,
      enum: ["daily", "weekly", "bi-weekly", "monthly", "on-demand"],
      required: [true, "Doubt session frequency is required"],
    },
    preferred_days: [{
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    }],
    preferred_time_slots: [{
      start_time: {
        type: String,
        required: [true, "Start time is required"],
        trim: true,
      },
      end_time: {
        type: String,
        required: [true, "End time is required"],
        trim: true,
      },
      timezone: {
        type: String,
        required: [true, "Timezone is required"],
        trim: true,
      }
    }]
  },
  certification: {
    is_certified: {
      type: Boolean,
      required: [true, "Certification status is required"],
      default: true
    },
    certification_criteria: {
      min_assignments_score: {
        type: Number,
        min: [0, "Minimum assignment score cannot be negative"],
        max: [100, "Minimum assignment score cannot exceed 100"],
        default: 70
      },
      min_quizzes_score: {
        type: Number,
        min: [0, "Minimum quiz score cannot be negative"],
        max: [100, "Minimum quiz score cannot exceed 100"],
        default: 70
      },
      min_attendance: {
        type: Number,
        min: [0, "Minimum attendance cannot be negative"],
        max: [100, "Minimum attendance cannot exceed 100"],
        default: 80
      }
    }
  },
  // Pricing is now handled in base schema with legacy-compatible structure
});

// Add pre-save hook for course modules ID assignment
blendedCourseSchema.pre("save", function (next) {
  // Assign IDs to course_modules sections and their lessons
  if (this.course_modules && this.course_modules.length > 0) {
    this.course_modules.forEach((section, sectionIndex) => {
      if (!section.id) {
        section.id = `module_${sectionIndex + 1}`;
      }
      if (section.lessons && section.lessons.length > 0) {
        section.lessons.forEach((lesson, lessonIndex) => {
          if (!lesson.id) {
            lesson.id = `lesson_${section.id}_${lessonIndex + 1}`;
          }
        });
      }
    });
  }
  next();
});

// Create the BlendedCourse model using discriminator
const BlendedCourse = BaseCourse.discriminator("blended", blendedCourseSchema);

export default BlendedCourse; 