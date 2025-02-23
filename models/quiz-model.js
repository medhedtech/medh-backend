const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true
  },
  options: {
    type: [String],
    required: [true, 'Options are required'],
    validate: {
      validator: function(options) {
        return options.length >= 2 && options.length <= 4;
      },
      message: 'Quiz must have between 2 and 4 options'
    }
  },
  correctAnswer: {
    type: String,
    required: [true, 'Correct answer is required'],
    validate: {
      validator: function(answer) {
        return this.options.includes(answer);
      },
      message: 'Correct answer must be one of the options'
    }
  },
  explanation: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: String,
    trim: true,
    default: 'General'
  },
  difficultyLevel: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  }
});

const quizSchema = new mongoose.Schema({
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Quiz creator is required']
  },
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Class ID is required']
  },
  class_name: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true
  },
  quiz_title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true
  },
  quiz_time: {
    type: Number,
    required: [true, 'Quiz time limit is required'],
    min: [1, 'Quiz time must be at least 1 minute']
  },
  passing_percentage: {
    type: Number,
    required: [true, 'Passing percentage is required'],
    min: [0, 'Passing percentage cannot be negative'],
    max: [100, 'Passing percentage cannot exceed 100']
  },
  questions: [questionSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  attempts_allowed: {
    type: Number,
    default: 1,
    min: [1, 'At least one attempt must be allowed']
  },
  shuffle_questions: {
    type: Boolean,
    default: true
  },
  show_results: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
quizSchema.index({ class_id: 1, created_by: 1 });
quizSchema.index({ quiz_title: 1 });

// Virtual for total questions count
quizSchema.virtual('totalQuestions').get(function() {
  return this.questions.length;
});

// Virtual for total points possible
quizSchema.virtual('totalPoints').get(function() {
  return this.questions.length * 1; // Assuming each question is worth 1 point
});

// Instance method to check if a student can attempt the quiz
quizSchema.methods.canAttempt = function(studentAttempts) {
  return studentAttempts < this.attempts_allowed;
};

// Static method to find active quizzes for a course
quizSchema.statics.findActiveQuizzes = function(courseId) {
  return this.find({
    class_id: courseId,
    isActive: true
  }).select('-questions.correctAnswer');
};

// Middleware to validate questions array
quizSchema.pre('save', function(next) {
  if (this.questions.length === 0) {
    next(new Error('Quiz must have at least one question'));
  }
  next();
});

// Create the model
const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz; 