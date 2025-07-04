import mongoose from 'mongoose';
const { Schema } = mongoose;

// Sub-schema for individual lesson progress tracking
const lessonProgressDetailSchema = new Schema({
  lessonId: {
    type: String,
    required: [true, "Lesson ID is required"],
    index: true
  },
  weekId: {
    type: String,
    required: [true, "Week ID is required"]
  },
  sectionId: {
    type: String,
    default: null // null for direct week lessons
  },
  lessonType: {
    type: String,
    enum: ['video', 'reading', 'quiz', 'assignment', 'live_class', 'practical', 'other'],
    default: 'video'
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'skipped'],
    default: 'not_started',
    index: true
  },
  // Progress percentage for partially completed lessons (0-100)
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // Time tracking
  timeSpent: {
    type: Number, // in seconds
    default: 0,
    min: 0
  },
  // Video-specific progress
  videoProgress: {
    totalDuration: {
      type: Number, // in seconds
      default: 0
    },
    watchedDuration: {
      type: Number, // in seconds
      default: 0
    },
    watchedPercentage: {
      type: Number, // 0-100
      default: 0
    },
    lastWatchPosition: {
      type: Number, // in seconds
      default: 0
    }
  },
  // Engagement tracking
  interactions: {
    notes: [{
      content: {
        type: String,
        required: true
      },
      timestamp: {
        type: Number, // video timestamp in seconds
        default: 0
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    bookmarks: [{
      title: {
        type: String,
        required: true
      },
      timestamp: {
        type: Number, // video timestamp in seconds
        default: 0
      },
      description: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  // Timestamps
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  // Attempts and retries
  attempts: {
    type: Number,
    default: 0,
    min: 0
  },
  // Prerequisites validation
  prerequisitesMet: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Sub-schema for quiz/assessment progress
const assessmentProgressSchema = new Schema({
  assessmentId: {
    type: String,
    required: [true, "Assessment ID is required"],
    index: true
  },
  assessmentType: {
    type: String,
    enum: ['quiz', 'assignment', 'project', 'exam'],
    required: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'submitted', 'graded', 'completed'],
    default: 'not_started'
  },
  attempts: [{
    attemptNumber: {
      type: Number,
      required: true
    },
    startedAt: {
      type: Date,
      required: true
    },
    submittedAt: Date,
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    feedback: String,
    timeSpent: {
      type: Number, // in seconds
      default: 0
    },
    answers: [{
      questionId: String,
      response: Schema.Types.Mixed, // Can be string, number, array, etc.
      isCorrect: Boolean,
      pointsEarned: Number
    }]
  }],
  bestScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  averageScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  passingScore: {
    type: Number,
    default: 70,
    min: 0,
    max: 100
  },
  isPassed: {
    type: Boolean,
    default: false
  },
  totalTimeSpent: {
    type: Number, // in seconds
    default: 0
  }
}, { timestamps: true });

// Main enhanced progress schema
const enhancedProgressSchema = new Schema({
  // Core references
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Student reference is required"],
    index: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, "Course reference is required"],
    index: true
  },
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EnrolledCourse',
    required: [true, "Enrollment reference is required"],
    index: true
  },
  
  // Course structure metadata (cached for performance)
  courseStructure: {
    totalWeeks: {
      type: Number,
      default: 0
    },
    totalSections: {
      type: Number,
      default: 0
    },
    totalLessons: {
      type: Number,
      default: 0
    },
    totalAssessments: {
      type: Number,
      default: 0
    },
    totalVideoDuration: {
      type: Number, // in seconds
      default: 0
    }
  },
  
  // Detailed lesson progress tracking
  lessonProgress: [lessonProgressDetailSchema],
  
  // Assessment progress tracking
  assessmentProgress: [assessmentProgressSchema],
  
  // Overall progress metrics
  overallProgress: {
    // Lesson completion progress
    lessonsCompleted: {
      type: Number,
      default: 0,
      min: 0
    },
    lessonsInProgress: {
      type: Number,
      default: 0,
      min: 0
    },
    lessonsNotStarted: {
      type: Number,
      default: 0,
      min: 0
    },
    lessonCompletionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    
    // Assessment completion progress
    assessmentsCompleted: {
      type: Number,
      default: 0,
      min: 0
    },
    assessmentCompletionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    
    // Overall course completion
    overallCompletionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true
    },
    
    // Time tracking
    totalTimeSpent: {
      type: Number, // in seconds
      default: 0,
      min: 0
    },
    averageTimePerLesson: {
      type: Number, // in seconds
      default: 0,
      min: 0
    },
    
    // Learning velocity
    averageLessonsPerWeek: {
      type: Number,
      default: 0,
      min: 0
    },
    estimatedCompletionDate: Date,
    
    // Performance metrics
    averageQuizScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    averageAssignmentScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  // Learning path and sequence tracking
  learningPath: {
    currentWeek: {
      type: Number,
      default: 1,
      min: 1
    },
    currentSection: String,
    currentLesson: String,
    isSequential: {
      type: Boolean,
      default: true
    },
    unlockedLessons: [String], // Array of lesson IDs that are unlocked
    blockedLessons: [String] // Array of lesson IDs that are blocked due to prerequisites
  },
  
  // Completion criteria and requirements
  completionCriteria: {
    requireAllLessons: {
      type: Boolean,
      default: true
    },
    requiredLessonPercentage: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    requireAllAssessments: {
      type: Boolean,
      default: true
    },
    minimumQuizScore: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    },
    minimumAssignmentScore: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    }
  },
  
  // Course completion status
  isCompleted: {
    type: Boolean,
    default: false,
    index: true
  },
  completedAt: Date,
  
  // Analytics and insights
  learningAnalytics: {
    studyStreak: {
      current: {
        type: Number,
        default: 0
      },
      longest: {
        type: Number,
        default: 0
      },
      lastStudyDate: Date
    },
    weeklyActivity: [{
      week: Number,
      lessonsCompleted: Number,
      timeSpent: Number,
      quizzesAttempted: Number,
      averageScore: Number
    }],
    strongAreas: [String], // Topics/skills where student excels
    improvementAreas: [String], // Topics/skills that need work
    preferredStudyTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night'],
      default: 'evening'
    }
  },
  
  // Timestamps
  lastAccessedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  firstAccessedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better query performance
enhancedProgressSchema.index({ student: 1, course: 1 }, { unique: true });
enhancedProgressSchema.index({ 'lessonProgress.status': 1 });
enhancedProgressSchema.index({ 'overallProgress.overallCompletionPercentage': 1 });
enhancedProgressSchema.index({ lastAccessedAt: 1 });
enhancedProgressSchema.index({ isCompleted: 1 });

// Virtual for course completion status
enhancedProgressSchema.virtual('completionStatus').get(function() {
  if (this.isCompleted) return 'completed';
  if (this.overallProgress.overallCompletionPercentage === 0) return 'not_started';
  if (this.overallProgress.overallCompletionPercentage === 100) return 'ready_for_completion';
  return 'in_progress';
});

// Virtual for next lesson to complete
enhancedProgressSchema.virtual('nextLesson').get(function() {
  const nextLesson = this.lessonProgress.find(lesson => 
    lesson.status === 'not_started' || lesson.status === 'in_progress'
  );
  return nextLesson ? nextLesson.lessonId : null;
});

// Method to update lesson progress
enhancedProgressSchema.methods.updateLessonProgress = async function(lessonId, progressData) {
  const lessonIndex = this.lessonProgress.findIndex(lesson => lesson.lessonId === lessonId);
  
  if (lessonIndex === -1) {
    // Create new lesson progress entry
    this.lessonProgress.push({
      lessonId,
      ...progressData,
      startedAt: progressData.status !== 'not_started' ? new Date() : null,
      completedAt: progressData.status === 'completed' ? new Date() : null,
      lastAccessedAt: new Date(),
      attempts: progressData.status !== 'not_started' ? 1 : 0
    });
  } else {
    // Update existing lesson progress
    const lesson = this.lessonProgress[lessonIndex];
    
    // Update fields
    Object.assign(lesson, progressData);
    
    // Handle status changes
    if (progressData.status === 'completed' && !lesson.completedAt) {
      lesson.completedAt = new Date();
    }
    
    if (progressData.status !== 'not_started' && !lesson.startedAt) {
      lesson.startedAt = new Date();
    }
    
    lesson.lastAccessedAt = new Date();
    
    if (progressData.status === 'in_progress') {
      lesson.attempts += 1;
    }
  }
  
  // Recalculate overall progress
  await this.recalculateProgress();
  
  // Update study streak
  this.updateStudyStreak();
  
  return this.save();
};

// Method to recalculate overall progress
enhancedProgressSchema.methods.recalculateProgress = async function() {
  const totalLessons = this.courseStructure.totalLessons;
  const totalAssessments = this.courseStructure.totalAssessments;
  
  if (totalLessons === 0) {
    this.overallProgress.lessonCompletionPercentage = 100;
    this.overallProgress.overallCompletionPercentage = 100;
    return;
  }
  
  // Calculate lesson progress
  const completedLessons = this.lessonProgress.filter(lesson => lesson.status === 'completed').length;
  const inProgressLessons = this.lessonProgress.filter(lesson => lesson.status === 'in_progress').length;
  const notStartedLessons = totalLessons - completedLessons - inProgressLessons;
  
  this.overallProgress.lessonsCompleted = completedLessons;
  this.overallProgress.lessonsInProgress = inProgressLessons;
  this.overallProgress.lessonsNotStarted = notStartedLessons;
  this.overallProgress.lessonCompletionPercentage = Math.round((completedLessons / totalLessons) * 100);
  
  // Calculate assessment progress
  const completedAssessments = this.assessmentProgress.filter(assessment => 
    assessment.status === 'completed' || assessment.isPassed
  ).length;
  
  this.overallProgress.assessmentsCompleted = completedAssessments;
  this.overallProgress.assessmentCompletionPercentage = totalAssessments > 0 
    ? Math.round((completedAssessments / totalAssessments) * 100) 
    : 100;
  
  // Calculate overall completion percentage based on completion criteria
  let overallCompletion = 0;
  
  if (this.completionCriteria.requireAllLessons) {
    // All lessons must be completed for 100%
    overallCompletion = this.overallProgress.lessonCompletionPercentage;
  } else {
    // Use required lesson percentage
    const requiredLessons = Math.ceil((totalLessons * this.completionCriteria.requiredLessonPercentage) / 100);
    overallCompletion = Math.min(100, Math.round((completedLessons / requiredLessons) * 100));
  }
  
  // Factor in assessment requirements
  if (this.completionCriteria.requireAllAssessments && totalAssessments > 0) {
    // Both lessons and assessments must be completed
    overallCompletion = Math.min(overallCompletion, this.overallProgress.assessmentCompletionPercentage);
  }
  
  this.overallProgress.overallCompletionPercentage = overallCompletion;
  
  // Check if course is completed
  if (overallCompletion === 100 && !this.isCompleted) {
    this.isCompleted = true;
    this.completedAt = new Date();
  }
  
  // Calculate time-based metrics
  this.overallProgress.totalTimeSpent = this.lessonProgress.reduce((total, lesson) => 
    total + (lesson.timeSpent || 0), 0
  );
  
  this.overallProgress.averageTimePerLesson = completedLessons > 0 
    ? Math.round(this.overallProgress.totalTimeSpent / completedLessons)
    : 0;
  
  // Calculate quiz and assignment averages
  const quizScores = this.assessmentProgress
    .filter(assessment => assessment.assessmentType === 'quiz' && assessment.bestScore > 0)
    .map(assessment => assessment.bestScore);
  
  const assignmentScores = this.assessmentProgress
    .filter(assessment => assessment.assessmentType === 'assignment' && assessment.bestScore > 0)
    .map(assessment => assessment.bestScore);
  
  this.overallProgress.averageQuizScore = quizScores.length > 0
    ? Math.round(quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length)
    : 0;
  
  this.overallProgress.averageAssignmentScore = assignmentScores.length > 0
    ? Math.round(assignmentScores.reduce((sum, score) => sum + score, 0) / assignmentScores.length)
    : 0;
};

// Method to update study streak
enhancedProgressSchema.methods.updateStudyStreak = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastStudyDate = this.learningAnalytics.studyStreak.lastStudyDate;
  
  if (!lastStudyDate) {
    // First study session
    this.learningAnalytics.studyStreak.current = 1;
    this.learningAnalytics.studyStreak.longest = 1;
    this.learningAnalytics.studyStreak.lastStudyDate = today;
    return;
  }
  
  const lastStudyDateOnly = new Date(lastStudyDate);
  lastStudyDateOnly.setHours(0, 0, 0, 0);
  
  const daysDifference = Math.floor((today - lastStudyDateOnly) / (1000 * 60 * 60 * 24));
  
  if (daysDifference === 0) {
    // Same day, no change to streak
    return;
  } else if (daysDifference === 1) {
    // Consecutive day, increment streak
    this.learningAnalytics.studyStreak.current += 1;
    this.learningAnalytics.studyStreak.longest = Math.max(
      this.learningAnalytics.studyStreak.longest,
      this.learningAnalytics.studyStreak.current
    );
  } else {
    // Streak broken, reset to 1
    this.learningAnalytics.studyStreak.current = 1;
  }
  
  this.learningAnalytics.studyStreak.lastStudyDate = today;
};

// Method to get detailed progress report
enhancedProgressSchema.methods.getProgressReport = function() {
  return {
    summary: {
      overallCompletion: this.overallProgress.overallCompletionPercentage,
      lessonsCompleted: this.overallProgress.lessonsCompleted,
      totalLessons: this.courseStructure.totalLessons,
      timeSpent: this.overallProgress.totalTimeSpent,
      currentStreak: this.learningAnalytics.studyStreak.current,
      isCompleted: this.isCompleted
    },
    lessons: {
      completed: this.overallProgress.lessonsCompleted,
      inProgress: this.overallProgress.lessonsInProgress,
      notStarted: this.overallProgress.lessonsNotStarted,
      completionPercentage: this.overallProgress.lessonCompletionPercentage
    },
    assessments: {
      completed: this.overallProgress.assessmentsCompleted,
      total: this.courseStructure.totalAssessments,
      averageQuizScore: this.overallProgress.averageQuizScore,
      averageAssignmentScore: this.overallProgress.averageAssignmentScore
    },
    learningVelocity: {
      averageTimePerLesson: this.overallProgress.averageTimePerLesson,
      studyStreak: this.learningAnalytics.studyStreak,
      weeklyActivity: this.learningAnalytics.weeklyActivity
    },
    nextSteps: {
      nextLesson: this.nextLesson,
      currentWeek: this.learningPath.currentWeek,
      recommendedActions: this.getRecommendedActions()
    }
  };
};

// Method to get recommended actions for student
enhancedProgressSchema.methods.getRecommendedActions = function() {
  const actions = [];
  
  // Check for incomplete lessons
  if (this.overallProgress.lessonsInProgress > 0) {
    actions.push({
      type: 'complete_lesson',
      priority: 'high',
      message: `You have ${this.overallProgress.lessonsInProgress} lesson(s) in progress. Complete them to maintain momentum!`
    });
  }
  
  // Check for poor quiz performance
  if (this.overallProgress.averageQuizScore > 0 && this.overallProgress.averageQuizScore < 70) {
    actions.push({
      type: 'review_content',
      priority: 'medium',
      message: `Your average quiz score is ${this.overallProgress.averageQuizScore}%. Consider reviewing the content before proceeding.`
    });
  }
  
  // Check for broken study streak
  if (this.learningAnalytics.studyStreak.current === 0) {
    actions.push({
      type: 'maintain_streak',
      priority: 'low',
      message: 'Start a new study streak by completing a lesson today!'
    });
  }
  
  // Check for course completion readiness
  if (this.overallProgress.overallCompletionPercentage >= 95 && !this.isCompleted) {
    actions.push({
      type: 'complete_course',
      priority: 'high',
      message: "You're almost done! Complete the remaining lessons to finish the course."
    });
  }
  
  return actions;
};

// Static method to get student progress across all courses
enhancedProgressSchema.statics.getStudentOverallProgress = async function(studentId) {
  const progressRecords = await this.find({ student: studentId })
    .populate('course', 'course_title course_image')
    .sort({ lastAccessedAt: -1 });
  
  const summary = {
    totalCourses: progressRecords.length,
    completedCourses: progressRecords.filter(p => p.isCompleted).length,
    inProgressCourses: progressRecords.filter(p => !p.isCompleted && p.overallProgress.overallCompletionPercentage > 0).length,
    notStartedCourses: progressRecords.filter(p => p.overallProgress.overallCompletionPercentage === 0).length,
    totalTimeSpent: progressRecords.reduce((total, p) => total + p.overallProgress.totalTimeSpent, 0),
    averageCompletion: progressRecords.length > 0 
      ? Math.round(progressRecords.reduce((total, p) => total + p.overallProgress.overallCompletionPercentage, 0) / progressRecords.length)
      : 0,
    longestStreak: Math.max(...progressRecords.map(p => p.learningAnalytics.studyStreak.longest), 0),
    currentActiveStreak: Math.max(...progressRecords.map(p => p.learningAnalytics.studyStreak.current), 0)
  };
  
  return {
    summary,
    courses: progressRecords.map(progress => ({
      course: progress.course,
      progress: progress.getProgressReport(),
      lastAccessed: progress.lastAccessedAt
    }))
  };
};

const EnhancedProgress = mongoose.model('EnhancedProgress', enhancedProgressSchema);
export default EnhancedProgress; 