const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Resource title is required']
  },
  url: {
    type: String,
    required: [true, 'Resource URL is required']
  },
  type: {
    type: String,
    enum: ['pdf', 'link', 'video', 'document', 'other'],
    default: 'link'
  }
});

const submissionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, 'Student ID is required']
  },
  submissionFiles: {
    type: [String],
    default: []
  },
  submissionText: {
    type: String,
    trim: true
  },
  submissionLinks: {
    type: [String],
    default: []
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  score: {
    type: Number,
    min: [0, 'Score cannot be negative']
  },
  feedback: {
    type: String,
    trim: true
  },
  graded: {
    type: Boolean,
    default: false
  },
  gradedAt: {
    type: Date
  }
});

const assignmentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, 'Course ID is required']
    },
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    instructions: {
      type: String,
      trim: true
    },
    due_date: {
      type: Date,
      required: [true, 'Due date is required'],
      alias: 'deadline'
    },
    max_score: {
      type: Number,
      default: 100,
      min: [0, 'Maximum score cannot be negative']
    },
    submission_type: {
      type: String,
      enum: ['file', 'link', 'text', 'multiple'],
      default: 'file'
    },
    allowed_file_types: {
      type: [String],
      default: ['.pdf', '.doc', '.docx']
    },
    max_file_size_mb: {
      type: Number,
      default: 5,
      min: [1, 'Maximum file size must be at least 1MB']
    },
    instructor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, 'Instructor ID is required']
    },
    resources: {
      type: [resourceSchema],
      default: []
    },
    is_active: {
      type: Boolean,
      default: true
    },
    submissions: [submissionSchema],
    meta: {
      total_submissions: {
        type: Number,
        default: 0
      },
      average_score: {
        type: Number,
        default: 0
      },
      last_updated: {
        type: Date,
        default: Date.now
      }
    }
  },
  { timestamps: true }
);

// Pre-save middleware to generate ID if not provided
assignmentSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = new mongoose.Types.ObjectId().toString();
  }
  next();
});

// Method to calculate average score
assignmentSchema.methods.calculateStats = function() {
  const totalSubmissions = this.submissions.length;
  let totalScore = 0;
  
  const gradedSubmissions = this.submissions.filter(sub => sub.graded);
  gradedSubmissions.forEach(sub => {
    if (sub.score !== undefined) {
      totalScore += sub.score;
    }
  });
  
  this.meta.total_submissions = totalSubmissions;
  this.meta.average_score = gradedSubmissions.length > 0 ? 
    totalScore / gradedSubmissions.length : 0;
  this.meta.last_updated = new Date();
  
  return this.meta;
};

module.exports = mongoose.model("Assignment", assignmentSchema);
