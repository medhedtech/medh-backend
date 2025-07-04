import mongoose from "mongoose";
const { Schema } = mongoose;

// Base lesson options
const lessonOptions = {
  discriminatorKey: "lessonType", // Determines subtype: "video", "quiz", or "assessment"
  _id: false,
  timestamps: true,
};

// Base Lesson Schema with common fields
const baseLessonSchema = new Schema(
  {
    id: {
      type: String,
      // ID will be auto-generated, not required on input
    },
    title: {
      type: String,
      required: [true, "Lesson title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isPreview: {
      type: Boolean,
      default: false,
    },
    lessonType: {
      type: String,
      enum: ["video", "quiz", "assessment", "text"],
      default: "text",
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
    resources: [
      {
        id: { type: String }, // ID will be auto-generated
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
      },
    ],
  },
  lessonOptions,
);

// Video Lesson Schema: additional fields for video URL and duration
const videoLessonSchema = new Schema(
  {
    video_url: {
      type: String,
      required: [true, "Video URL is required"],
      trim: true,
      validate: {
        validator: (v) => {
          // Allow empty string for optional video_url or validate URL format
          if (!v || v === '') return true;
          return /^(http(s)?:\/\/)/.test(v);
        },
        message: "Video URL must be a valid URL",
      },
    },
    duration: {
      type: String,
      default: "",
      trim: true,
    },
    video_thumbnail: {
      type: String,
      default: "",
      trim: true,
    },
    video_quality: {
      type: String,
      enum: ["720p", "1080p", "4K", "auto"],
      default: "auto",
    },
  },
  lessonOptions,
);

// Quiz Lesson Schema: add a required quiz_id field referencing Quiz
const quizLessonSchema = new Schema(
  {
    quiz_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: [true, "Quiz ID is required"],
    },
    passing_score: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },
    max_attempts: {
      type: Number,
      default: 3,
      min: 1,
    },
  },
  lessonOptions,
);

// Assessment Lesson Schema: add a required assignment_id field referencing Assignment
const assessmentLessonSchema = new Schema(
  {
    assignment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: [true, "Assignment ID is required"],
    },
    submission_deadline: {
      type: Date,
    },
    max_file_size: {
      type: Number,
      default: 10, // MB
    },
    allowed_file_types: [{
      type: String,
      enum: ["pdf", "doc", "docx", "txt", "zip"],
    }],
  },
  lessonOptions,
);

// Create discriminator models
const LessonModel = mongoose.model('Lesson', baseLessonSchema);
const VideoLesson = LessonModel.discriminator('video', videoLessonSchema);
const QuizLesson = LessonModel.discriminator('quiz', quizLessonSchema);
const AssessmentLesson = LessonModel.discriminator('assessment', assessmentLessonSchema);

export {
  baseLessonSchema,
  videoLessonSchema,
  quizLessonSchema,
  assessmentLessonSchema,
  LessonModel,
  VideoLesson,
  QuizLesson,
  AssessmentLesson,
};
