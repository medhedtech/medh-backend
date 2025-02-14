const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const courseSchema = new mongoose.Schema(
  {
    course_category: {
      type: String,
      enum: ["Live Courses", "Blended Courses", "Corporate Training Courses"],
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
      type: String,
    },
    category: {
      type: String,
    },
    course_fee: {
      type: Number,
    },
    course_videos: {
      type: [String],
      default: [],
    },
    brochures: {
      type: [String],
      default: [],
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
      type: [String],
      default: [],
    },
    curriculum: [
      {
        weekTitle: {
          type: String,
          required: true,
        },
        weekDescription: {
          type: String,
          required: true,
        },
      },
    ],
    isFree: {
      type: Boolean,
      default: false,
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
  },
  { timestamps: true }
);

// Automatically generate a unique key before saving the document
courseSchema.pre("save", function (next) {
  if (!this.unique_key) {
    this.unique_key = uuidv4();
  }
  next();
});

const Course = mongoose.model("Course", courseSchema);
module.exports = Course;
