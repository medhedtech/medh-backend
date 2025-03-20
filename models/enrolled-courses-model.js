const mongoose = require("mongoose");

const enrolledCourseSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    enrollment_type: {
      type: String,
      enum: ["individual", "batch"],
      default: "individual",
    },
    batch_size: {
      type: Number,
      default: 1,
    },
    payment_status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    enrollment_date: {
      type: Date,
      default: Date.now,
    },
    expiry_date: {
      type: Date,
    },
    is_self_paced: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "completed", "expired", "cancelled"],
      default: "active",
    },
    is_completed: {
      type: Boolean,
      default: false,
    },
    completed_on: { 
      type: Date, 
      default: null 
    },
    memership_id: {
      type: String,
    },
    is_certifiled: {
      type: Boolean,
      default: false,
    },
    payment_details: {
      payment_id: String,
      payment_signature: String,
      payment_order_id: String,
      payment_method: String,
      amount: Number,
      currency: String,
      payment_date: Date,
    },
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
      default: Date.now
    },
    progress: {
      type: Number,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100'],
      default: 0
    },
    notes: [{
      lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
      },
      content: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
    }],
    bookmarks: [{
      lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
      },
      timestamp: {
        type: Number,
        required: true
      },
      note: {
        type: String,
        trim: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    assignment_submissions: [{
      assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment'
      },
      submission: {
        type: String,
        required: true
      },
      submittedAt: {
        type: Date,
        default: Date.now
      }
    }],
    quiz_submissions: [{
      quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz'
      },
      answers: [{
        type: String,
        required: true
      }],
      score: {
        type: Number,
        required: true
      },
      percentage: {
        type: Number,
        required: true
      },
      submittedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
enrolledCourseSchema.index({ student_id: 1, course_id: 1 }, { unique: true });
enrolledCourseSchema.index({ status: 1 });
enrolledCourseSchema.index({ payment_status: 1 });
enrolledCourseSchema.index({ last_accessed: 1 });
enrolledCourseSchema.index({ progress: 1 });

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

// Pre-save middleware to update progress
enrolledCourseSchema.pre('save', async function(next) {
  if (this.isModified('completed_lessons') || 
      this.isModified('completed_assignments') || 
      this.isModified('completed_quizzes')) {
    this.progress = await this.calculateProgress();
    
    // Update completion status if progress is 100%
    if (this.progress === 100 && !this.is_completed) {
      this.is_completed = true;
      this.completed_on = new Date();
      this.status = 'completed';
    }
  }
  next();
});

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

const EnrolledCourse = mongoose.model("EnrolledCourse", enrolledCourseSchema);

module.exports = EnrolledCourse;
