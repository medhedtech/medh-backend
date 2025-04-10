import mongoose from "mongoose";
import mongoosePaginate from 'mongoose-paginate-v2';

// Sub-schemas for better organization
const paymentDetailsSchema = new mongoose.Schema({
  payment_id: String,
  payment_signature: String,
  payment_order_id: String,
  payment_method: String,
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR'
  },
  payment_date: {
    type: Date,
    default: Date.now
  }
});

const noteSchema = new mongoose.Schema({
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Note content is required'],
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const bookmarkSchema = new mongoose.Schema({
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  timestamp: {
    type: Number,
    required: [true, 'Timestamp is required'],
    min: [0, 'Timestamp cannot be negative']
  },
  note: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  submission: {
    type: String,
    required: [true, 'Submission content is required']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  grade: {
    type: Number,
    min: [0, 'Grade cannot be negative']
  },
  feedback: String,
  status: {
    type: String,
    enum: ['submitted', 'graded', 'returned'],
    default: 'submitted'
  }
});

const quizSubmissionSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    answer: {
      type: String,
      required: true
    }
  }],
  score: {
    type: Number,
    required: true,
    min: [0, 'Score cannot be negative']
  },
  percentage: {
    type: Number,
    required: true,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  timeSpent: {
    type: Number, // in seconds
    required: true
  },
  attempts: {
    type: Number,
    default: 1
  }
});

const enrolledCourseSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, 'Student ID is required'],
      index: true
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, 'Course ID is required'],
      index: true
    },
    enrollment_type: {
      type: String,
      enum: ["individual", "batch"],
      default: "individual",
      required: true
    },
    batch_size: {
      type: Number,
      default: 1,
      min: [1, 'Batch size must be at least 1']
    },
    payment_status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
      required: true
    },
    enrollment_date: {
      type: Date,
      default: Date.now,
      required: true
    },
    expiry_date: {
      type: Date,
      required: function() {
        return !this.is_self_paced;
      }
    },
    is_self_paced: {
      type: Boolean,
      default: false,
      required: true
    },
    status: {
      type: String,
      enum: ["active", "completed", "expired", "cancelled", "suspended"],
      default: "active",
      required: true
    },
    is_completed: {
      type: Boolean,
      default: false,
      required: true
    },
    completed_on: { 
      type: Date,
      default: null 
    },
    membership_id: {
      type: String,
      sparse: true
    },
    is_certified: {
      type: Boolean,
      default: false,
      required: true
    },
    certificate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Certificate',
      sparse: true
    },
    payment_details: paymentDetailsSchema,
    completed_lessons: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    }],
    completed_assignments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment'
    }],
    completed_quizzes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz'
    }],
    last_accessed: {
      type: Date,
      default: Date.now,
      required: true
    },
    progress: {
      type: Number,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100'],
      default: 0,
      required: true
    },
    notes: [noteSchema],
    bookmarks: [bookmarkSchema],
    assignment_submissions: [assignmentSubmissionSchema],
    quiz_submissions: [quizSubmissionSchema],
    learning_path: {
      type: String,
      enum: ['sequential', 'flexible'],
      default: 'sequential'
    },
    completion_criteria: {
      required_progress: {
        type: Number,
        default: 100
      },
      required_assignments: {
        type: Boolean,
        default: true
      },
      required_quizzes: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
enrolledCourseSchema.index({ student_id: 1, course_id: 1 }, { unique: true });
enrolledCourseSchema.index({ status: 1 });
enrolledCourseSchema.index({ payment_status: 1 });
enrolledCourseSchema.index({ last_accessed: 1 });
enrolledCourseSchema.index({ progress: 1 });
enrolledCourseSchema.index({ is_completed: 1 });
enrolledCourseSchema.index({ is_certified: 1 });
enrolledCourseSchema.index({ enrollment_date: 1 });
enrolledCourseSchema.index({ expiry_date: 1 });

// Virtual for remaining time
enrolledCourseSchema.virtual('remainingTime').get(function() {
  if (this.is_self_paced) return null;
  if (!this.expiry_date) return null;
  return this.expiry_date - new Date();
});

// Method to calculate overall progress
enrolledCourseSchema.methods.calculateProgress = async function() {
  const course = await this.model('Course').findById(this.course_id);
  if (!course) return 0;

  const totalItems = course.lessons.length + course.assignments.length + course.quizzes.length;
  if (totalItems === 0) return 0;

  const completedItems = this.completed_lessons.length + 
                        this.completed_assignments.length + 
                        this.completed_quizzes.length;

  return Math.round((completedItems / totalItems) * 100);
};

// Method to check if course is expired
enrolledCourseSchema.methods.isExpired = function() {
  if (this.is_self_paced) return false;
  return this.expiry_date && new Date() > this.expiry_date;
};

// Method to check if course can be accessed
enrolledCourseSchema.methods.canAccess = function() {
  return this.status === 'active' && !this.isExpired();
};

// Method to get course completion status
enrolledCourseSchema.methods.getCompletionStatus = function() {
  if (this.is_completed) return 'completed';
  if (this.isExpired()) return 'expired';
  if (this.status === 'cancelled') return 'cancelled';
  if (this.status === 'suspended') return 'suspended';
  return 'in_progress';
};

// Method to check if a lesson is completed
enrolledCourseSchema.methods.isLessonCompleted = function(lessonId) {
  return this.completed_lessons.includes(lessonId);
};

// Method to check if an assignment is completed
enrolledCourseSchema.methods.isAssignmentCompleted = function(assignmentId) {
  return this.completed_assignments.includes(assignmentId);
};

// Method to check if a quiz is completed
enrolledCourseSchema.methods.isQuizCompleted = function(quizId) {
  return this.completed_quizzes.includes(quizId);
};

// Method to get assignment submission
enrolledCourseSchema.methods.getAssignmentSubmission = function(assignmentId) {
  return this.assignment_submissions.find(sub => 
    sub.assignmentId.toString() === assignmentId.toString()
  );
};

// Method to get quiz submission
enrolledCourseSchema.methods.getQuizSubmission = function(quizId) {
  return this.quiz_submissions.find(sub => 
    sub.quizId.toString() === quizId.toString()
  );
};

// Method to add or update a note
enrolledCourseSchema.methods.addNote = function(lessonId, content) {
  const existingNote = this.notes.find(note => 
    note.lessonId.toString() === lessonId.toString()
  );

  if (existingNote) {
    existingNote.content = content;
    existingNote.updatedAt = new Date();
  } else {
    this.notes.push({
      lessonId,
      content,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
};

// Method to add or update a bookmark
enrolledCourseSchema.methods.addBookmark = function(lessonId, timestamp, note = '') {
  const existingBookmark = this.bookmarks.find(bookmark => 
    bookmark.lessonId.toString() === lessonId.toString()
  );

  if (existingBookmark) {
    existingBookmark.timestamp = timestamp;
    existingBookmark.note = note;
  } else {
    this.bookmarks.push({
      lessonId,
      timestamp,
      note,
      createdAt: new Date()
    });
  }
};

// Pre-save middleware to update progress and status
enrolledCourseSchema.pre('save', async function(next) {
  if (this.isModified('completed_lessons') || 
      this.isModified('completed_assignments') || 
      this.isModified('completed_quizzes')) {
    
    this.progress = await this.calculateProgress();
    
    // Check completion criteria
    const meetsProgressCriteria = this.progress >= this.completion_criteria.required_progress;
    const meetsAssignmentCriteria = !this.completion_criteria.required_assignments || 
      this.completed_assignments.length === this.model('Course').findById(this.course_id).assignments.length;
    const meetsQuizCriteria = !this.completion_criteria.required_quizzes || 
      this.completed_quizzes.length === this.model('Course').findById(this.course_id).quizzes.length;

    if (meetsProgressCriteria && meetsAssignmentCriteria && meetsQuizCriteria && !this.is_completed) {
      this.is_completed = true;
      this.completed_on = new Date();
      this.status = 'completed';
    }
  }

  // Update status if expired
  if (!this.is_self_paced && this.isExpired() && this.status === 'active') {
    this.status = 'expired';
  }

  next();
});

// Apply the paginate plugin to the schema
enrolledCourseSchema.plugin(mongoosePaginate);

const EnrolledCourse = mongoose.model("EnrolledCourse", enrolledCourseSchema);

export default EnrolledCourse;
