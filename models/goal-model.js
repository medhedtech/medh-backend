const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true,
    maxlength: [200, 'Goal title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Goal description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Goal category is required'],
    enum: {
      values: ['course', 'assignment', 'exam', 'quiz', 'project', 'skill', 'career', 'personal'],
      message: 'Invalid goal category'
    },
    lowercase: true
  },
  progress: {
    type: Number,
    min: [0, 'Progress cannot be less than 0'],
    max: [100, 'Progress cannot exceed 100'],
    default: 0
  },
  deadline: {
    type: Date,
    required: [true, 'Goal deadline is required'],
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'Deadline must be in the future'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'completed', 'paused', 'cancelled'],
      message: 'Invalid goal status'
    },
    default: 'active',
    lowercase: true
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'Invalid priority level'
    },
    default: 'medium',
    lowercase: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required'],
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    sparse: true // Only for course-related goals
  },
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    sparse: true // Only for assignment-related goals
  },
  milestones: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Milestone title cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Milestone description cannot exceed 500 characters']
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    },
    dueDate: {
      type: Date
    }
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  reminderSettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    lastReminder: {
      type: Date
    }
  },
  completedAt: {
    type: Date
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  metadata: {
    estimatedHours: {
      type: Number,
      min: [0, 'Estimated hours cannot be negative']
    },
    actualHours: {
      type: Number,
      min: [0, 'Actual hours cannot be negative'],
      default: 0
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'expert'],
      default: 'medium'
    },
    source: {
      type: String,
      enum: ['self_created', 'instructor_assigned', 'system_generated'],
      default: 'self_created'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
goalSchema.index({ studentId: 1, status: 1 });
goalSchema.index({ studentId: 1, deadline: 1 });
goalSchema.index({ studentId: 1, category: 1 });
goalSchema.index({ deadline: 1, status: 1 }); // For overdue queries
goalSchema.index({ createdAt: -1 });

// Virtual fields
goalSchema.virtual('isOverdue').get(function() {
  return this.deadline < new Date() && this.status === 'active';
});

goalSchema.virtual('daysLeft').get(function() {
  if (this.status === 'completed') return 0;
  const diff = this.deadline - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

goalSchema.virtual('progressPercentage').get(function() {
  return Math.round(this.progress);
});

goalSchema.virtual('completedMilestones').get(function() {
  return this.milestones.filter(milestone => milestone.completed).length;
});

goalSchema.virtual('totalMilestones').get(function() {
  return this.milestones.length;
});

// Pre-save middleware
goalSchema.pre('save', function(next) {
  // Auto-complete goal if progress reaches 100%
  if (this.progress >= 100 && this.status === 'active') {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  // Reset completedAt if goal is not completed
  if (this.status !== 'completed') {
    this.completedAt = undefined;
  }
  
  // Update progress based on completed milestones
  if (this.milestones.length > 0) {
    const completedCount = this.milestones.filter(m => m.completed).length;
    const calculatedProgress = Math.round((completedCount / this.milestones.length) * 100);
    
    // Only update if not manually set higher
    if (calculatedProgress > this.progress) {
      this.progress = calculatedProgress;
    }
  }
  
  next();
});

// Static methods
goalSchema.statics.getStudentGoals = function(studentId, options = {}) {
  const query = { studentId, isArchived: false };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.priority) {
    query.priority = options.priority;
  }
  
  return this.find(query)
    .populate('courseId', 'title course_type')
    .populate('assignmentId', 'title')
    .sort({ priority: -1, deadline: 1, createdAt: -1 });
};

goalSchema.statics.getOverdueGoals = function(studentId) {
  return this.find({
    studentId,
    status: 'active',
    deadline: { $lt: new Date() },
    isArchived: false
  }).sort({ deadline: 1 });
};

goalSchema.statics.getUpcomingDeadlines = function(studentId, days = 7) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return this.find({
    studentId,
    status: 'active',
    deadline: { 
      $gte: new Date(),
      $lte: endDate
    },
    isArchived: false
  }).sort({ deadline: 1 });
};

// Instance methods
goalSchema.methods.updateProgress = function(newProgress) {
  this.progress = Math.min(100, Math.max(0, newProgress));
  
  if (this.progress >= 100) {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  return this.save();
};

goalSchema.methods.addMilestone = function(milestone) {
  this.milestones.push(milestone);
  return this.save();
};

goalSchema.methods.completeMilestone = function(milestoneId) {
  const milestone = this.milestones.id(milestoneId);
  if (milestone) {
    milestone.completed = true;
    milestone.completedAt = new Date();
  }
  return this.save();
};

module.exports = mongoose.model('Goal', goalSchema); 