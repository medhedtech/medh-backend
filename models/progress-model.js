import mongoose from "mongoose";
const { Schema } = mongoose;

const lessonProgressSchema = new Schema({
  lessonId: {
    type: String,
    required: [true, "Lesson ID is required"],
  },
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed"],
    default: "not_started",
  },
  completedAt: {
    type: Date,
  },
  lastAccessed: {
    type: Date,
    default: Date.now,
  },
  timeSpent: {
    type: Number, // in minutes
    default: 0,
  },
  notes: [
    {
      content: String,
      timestamp: Date,
      tags: [String],
    },
  ],
  bookmarks: [
    {
      timestamp: Number,
      title: String,
      description: String,
      tags: [String],
    },
  ],
});

const quizProgressSchema = new Schema({
  quizId: {
    type: String,
    required: [true, "Quiz ID is required"],
  },
  attempts: [
    {
      attemptNumber: {
        type: Number,
        required: true,
      },
      score: {
        type: Number,
        required: true,
      },
      answers: [
        {
          questionId: String,
          selectedAnswer: Number,
          isCorrect: Boolean,
        },
      ],
      startedAt: {
        type: Date,
        required: true,
      },
      completedAt: {
        type: Date,
        required: true,
      },
    },
  ],
  bestScore: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed", "failed"],
    default: "not_started",
  },
});

const assignmentProgressSchema = new Schema({
  assignmentId: {
    type: String,
    required: [true, "Assignment ID is required"],
  },
  submissions: [
    {
      submissionNumber: {
        type: Number,
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      files: [
        {
          filename: String,
          url: String,
          size: Number,
          mimeType: String,
        },
      ],
      submittedAt: {
        type: Date,
        required: true,
      },
      score: {
        type: Number,
      },
      feedback: {
        type: String,
      },
      gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      gradedAt: {
        type: Date,
      },
    },
  ],
  status: {
    type: String,
    enum: ["not_started", "in_progress", "submitted", "graded", "returned"],
    default: "not_started",
  },
  bestScore: {
    type: Number,
    default: 0,
  },
});

const progressSchema = new Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required"],
    },
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      required: [true, "Enrollment reference is required"],
    },
    lessonProgress: [lessonProgressSchema],
    quizProgress: [quizProgressSchema],
    assignmentProgress: [assignmentProgressSchema],
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastAccessed: {
      type: Date,
      default: Date.now,
    },
    meta: {
      totalTimeSpent: {
        type: Number, // in minutes
        default: 0,
      },
      averageQuizScore: {
        type: Number,
        default: 0,
      },
      averageAssignmentScore: {
        type: Number,
        default: 0,
      },
      completedLessons: {
        type: Number,
        default: 0,
      },
      completedQuizzes: {
        type: Number,
        default: 0,
      },
      completedAssignments: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true },
);

// Indexes for better query performance
progressSchema.index({ course: 1, student: 1 }, { unique: true });
progressSchema.index({ "lessonProgress.lessonId": 1 });
progressSchema.index({ "quizProgress.quizId": 1 });
progressSchema.index({ "assignmentProgress.assignmentId": 1 });

// Method to update lesson progress
progressSchema.methods.updateLessonProgress = async function (
  lessonId,
  status,
  timeSpent = 0,
) {
  const lessonProgress = this.lessonProgress.find(
    (p) => p.lessonId === lessonId,
  );

  if (!lessonProgress) {
    this.lessonProgress.push({
      lessonId,
      status,
      timeSpent,
      lastAccessed: new Date(),
    });
  } else {
    lessonProgress.status = status;
    lessonProgress.timeSpent += timeSpent;
    lessonProgress.lastAccessed = new Date();

    if (status === "completed") {
      lessonProgress.completedAt = new Date();
    }
  }

  await this.calculateOverallProgress();
  await this.save();
};

// Method to update quiz progress
progressSchema.methods.updateQuizProgress = async function (quizId, attempt) {
  const quizProgress = this.quizProgress.find((p) => p.quizId === quizId);

  if (!quizProgress) {
    this.quizProgress.push({
      quizId,
      attempts: [attempt],
      bestScore: attempt.score,
      status:
        attempt.score >=
        this.course.quizzes.find((q) => q.id === quizId).passingScore
          ? "completed"
          : "failed",
    });
  } else {
    quizProgress.attempts.push(attempt);
    quizProgress.bestScore = Math.max(quizProgress.bestScore, attempt.score);
    quizProgress.status =
      attempt.score >=
      this.course.quizzes.find((q) => q.id === quizId).passingScore
        ? "completed"
        : "failed";
  }

  await this.calculateOverallProgress();
  await this.save();
};

// Method to update assignment progress
progressSchema.methods.updateAssignmentProgress = async function (
  assignmentId,
  submission,
) {
  const assignmentProgress = this.assignmentProgress.find(
    (p) => p.assignmentId === assignmentId,
  );

  if (!assignmentProgress) {
    this.assignmentProgress.push({
      assignmentId,
      submissions: [submission],
      bestScore: submission.score || 0,
      status: submission.score ? "graded" : "submitted",
    });
  } else {
    assignmentProgress.submissions.push(submission);
    if (submission.score) {
      assignmentProgress.bestScore = Math.max(
        assignmentProgress.bestScore,
        submission.score,
      );
      assignmentProgress.status = "graded";
    }
  }

  await this.calculateOverallProgress();
  await this.save();
};

// Method to calculate overall progress
progressSchema.methods.calculateOverallProgress = async function () {
  const totalLessons = this.course.lessons.length;
  const totalQuizzes = this.course.quizzes.length;
  const totalAssignments = this.course.assignments.length;

  const completedLessons = this.lessonProgress.filter(
    (p) => p.status === "completed",
  ).length;
  const completedQuizzes = this.quizProgress.filter(
    (p) => p.status === "completed",
  ).length;
  const completedAssignments = this.assignmentProgress.filter(
    (p) => p.status === "graded",
  ).length;

  // Calculate weighted progress
  const lessonWeight = 0.5;
  const quizWeight = 0.3;
  const assignmentWeight = 0.2;

  const lessonProgress =
    totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  const quizProgress =
    totalQuizzes > 0 ? (completedQuizzes / totalQuizzes) * 100 : 0;
  const assignmentProgress =
    totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

  this.overallProgress = Math.round(
    lessonProgress * lessonWeight +
      quizProgress * quizWeight +
      assignmentProgress * assignmentWeight,
  );

  // Update meta information
  this.meta.completedLessons = completedLessons;
  this.meta.completedQuizzes = completedQuizzes;
  this.meta.completedAssignments = completedAssignments;

  // Calculate average scores
  const quizScores = this.quizProgress
    .filter((p) => p.attempts.length > 0)
    .map((p) => p.bestScore);

  const assignmentScores = this.assignmentProgress
    .filter((p) => p.submissions.some((s) => s.score))
    .map((p) => p.bestScore);

  this.meta.averageQuizScore =
    quizScores.length > 0
      ? quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length
      : 0;

  this.meta.averageAssignmentScore =
    assignmentScores.length > 0
      ? assignmentScores.reduce((sum, score) => sum + score, 0) /
        assignmentScores.length
      : 0;

  // Calculate total time spent
  this.meta.totalTimeSpent = this.lessonProgress.reduce(
    (total, p) => total + p.timeSpent,
    0,
  );
};

// Static method to get progress by course and student
progressSchema.statics.getProgress = async function (courseId, studentId) {
  return this.findOne({ course: courseId, student: studentId })
    .populate("course")
    .populate("student", "name email")
    .populate("enrollment");
};

const Progress = mongoose.model("Progress", progressSchema);
export default Progress;
