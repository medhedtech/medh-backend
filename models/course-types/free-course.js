import mongoose from "mongoose";
import { BaseCourse } from "./base-course.js";

const { Schema } = mongoose;

// Schemas specific to free courses
const lessonSchema = new Schema({
  title: {
    type: String,
    required: [true, "Lesson title is required"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Lesson description is required"],
    trim: true,
  },
  content_type: {
    type: String,
    enum: ["video", "text", "pdf", "link"],
    required: [true, "Content type is required"],
  },
  content: {
    type: String,
    required: [true, "Content is required"],
    trim: true,
  },
  duration: {
    type: Number,
    required: function() {
      return this.content_type === "video";
    },
    min: [0, "Duration cannot be negative"],
  },
  order: {
    type: Number,
    required: [true, "Lesson order is required"],
  },
  is_preview: {
    type: Boolean,
    default: true,
  }
});

// Schema for free courses
const freeCourseSchema = new Schema({
  estimated_duration: {
    type: String,
    required: [true, "Estimated duration is required"],
    trim: true,
  },
  lessons: {
    type: [lessonSchema],
    required: [true, "Lessons are required"],
    validate: {
      validator: function(lessons) {
        return lessons.length > 0;
      },
      message: "Course must have at least one lesson"
    }
  },
  resources: [{
    title: {
      type: String,
      required: [true, "Resource title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      required: [true, "Resource URL is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["pdf", "link", "video", "other"],
      default: "other",
    }
  }],
  access_type: {
    type: String,
    enum: ["unlimited", "time-limited"],
    default: "unlimited",
  },
  access_duration: {
    type: Number, // in days
    required: function() {
      return this.access_type === "time-limited";
    },
    min: [1, "Access duration must be at least 1 day"]
  },
  prerequisites: [{
    type: String,
    trim: true,
  }],
  target_skills: [{
    type: String,
    trim: true,
  }],
  completion_certificate: {
    is_available: {
      type: Boolean,
      default: false,
    },
    requirements: {
      min_lessons_completed: {
        type: Number,
        min: [0, "Minimum lessons completed cannot be negative"],
        max: [100, "Minimum lessons completed cannot exceed 100%"],
        default: 100
      }
    }
  }
});

// Create the FreeCourse model using discriminator
const FreeCourse = BaseCourse.discriminator("free", freeCourseSchema);

export default FreeCourse; 