import mongoose from "mongoose";

const assignmentResourceSchema = new mongoose.Schema({
  id: {
    type: String,
    // ID will be auto-generated, not required on input
  },
  title: {
    type: String,
    required: [true, "Resource title is required"],
    trim: true,
  },
  fileUrl: {
    type: String,
    required: [true, "Resource file URL is required"],
  },
  description: {
    type: String,
    trim: true,
  },
});

const assignmentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      // ID will be auto-generated, not required on input
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
    },
    lesson: {
      type: String, // Reference to lesson ID
      required: [true, "Lesson ID is required"],
    },
    title: {
      type: String,
      required: [true, "Assignment title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Assignment description is required"],
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    maxScore: {
      type: Number,
      required: [true, "Maximum score is required"],
      min: [0, "Maximum score cannot be negative"],
    },
    instructions: {
      type: String,
      required: [true, "Assignment instructions are required"],
    },
    resources: [assignmentResourceSchema],
    submissionType: {
      type: String,
      enum: ["file", "text", "link", "multiple"],
      default: "file",
    },
    allowedFileTypes: [
      {
        type: String,
        trim: true,
      },
    ],
    maxFileSize: {
      type: Number, // in MB
      default: 10,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
    },
    lateSubmissionAllowed: {
      type: Boolean,
      default: false,
    },
    lateSubmissionPenalty: {
      type: Number,
      min: [0, "Late submission penalty cannot be negative"],
      max: [100, "Late submission penalty cannot exceed 100%"],
      default: 0,
    },
    meta: {
      submissions: {
        type: Number,
        default: 0,
      },
      averageScore: {
        type: Number,
        default: 0,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
  },
  { timestamps: true },
);

// Indexes for better query performance
assignmentSchema.index({ course: 1, lesson: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ isActive: 1 });

// Static method to get assignments by course
assignmentSchema.statics.getAssignmentsByCourse = async function (courseId) {
  return this.find({ course: courseId }).sort({ dueDate: 1 });
};

// Static method to get assignments by lesson
assignmentSchema.statics.getAssignmentsByLesson = async function (lessonId) {
  return this.find({ lesson: lessonId }).sort({ dueDate: 1 });
};

// Method to check if assignment is overdue
assignmentSchema.methods.isOverdue = function () {
  return this.dueDate < new Date();
};

// Method to calculate late submission penalty
assignmentSchema.methods.calculatePenalty = function (submissionDate) {
  if (!this.lateSubmissionAllowed || !this.isOverdue()) {
    return 0;
  }

  const daysLate = Math.ceil(
    (submissionDate - this.dueDate) / (1000 * 60 * 60 * 24),
  );
  return (this.lateSubmissionPenalty / 100) * daysLate;
};

// Pre-save hook to auto-generate IDs
assignmentSchema.pre("save", function (next) {
  // Auto-generate assignment ID if not provided
  if (!this.id) {
    const { v4: uuidv4 } = require('uuid');
    this.id = uuidv4();
  }
  
  // Auto-generate resource IDs
  if (this.resources && this.resources.length > 0) {
    this.resources.forEach((resource, index) => {
      if (!resource.id) {
        resource.id = `resource_${this.id}_${index + 1}`;
      }
    });
  }
  
  // Update meta.lastUpdated
  this.meta.lastUpdated = Date.now();
  
  next();
});

const Assignment = mongoose.model("Assignment", assignmentSchema);
export default Assignment;
