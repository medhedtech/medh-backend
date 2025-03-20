const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Question ID is required'],
    unique: true
  },
  question: {
    type: String,
    required: [true, 'Question text is required']
  },
  options: [{
    type: String,
    required: [true, 'Question options are required']
  }],
  correctAnswer: {
    type: Number,
    required: [true, 'Correct answer is required'],
    min: [0, 'Correct answer index cannot be negative']
  },
  explanation: {
    type: String,
    trim: true
  },
  points: {
    type: Number,
    default: 1,
    min: [0, 'Points cannot be negative']
  }
});

const quizSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Quiz ID is required'],
    unique: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  lesson: {
    type: String, // Reference to lesson ID
    required: [true, 'Lesson ID is required']
  },
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Quiz duration is required'],
    min: [0, 'Duration cannot be negative']
  },
  questions: [questionSchema],
  totalPoints: {
    type: Number,
    default: 0
  },
  passingScore: {
    type: Number,
    required: [true, 'Passing score is required'],
    min: [0, 'Passing score cannot be negative']
  },
  maxAttempts: {
    type: Number,
    default: 3,
    min: [1, 'Maximum attempts must be at least 1']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(v) {
        return !this.startDate || !v || v >= this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  meta: {
    attempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, { timestamps: true });

// Pre-save middleware to calculate total points
quizSchema.pre('save', function(next) {
  this.totalPoints = this.questions.reduce((sum, q) => sum + q.points, 0);
  next();
});

// Method to calculate score
quizSchema.methods.calculateScore = function(answers) {
  let score = 0;
  this.questions.forEach((question, index) => {
    if (answers[index] === question.correctAnswer) {
      score += question.points;
    }
  });
  return score;
};

// Static method to get quizzes by course
quizSchema.statics.getQuizzesByCourse = async function(courseId) {
  return this.find({ course: courseId }).sort({ createdAt: 1 });
};

// Static method to get quizzes by lesson
quizSchema.statics.getQuizzesByLesson = async function(lessonId) {
  return this.find({ lesson: lessonId }).sort({ order: 1 });
};

const Quiz = mongoose.model("Quiz", quizSchema);
module.exports = Quiz; 