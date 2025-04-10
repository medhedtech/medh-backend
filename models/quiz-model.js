import mongoose from "mongoose";
const { Schema } = mongoose;

const optionSchema = new Schema({
  id: {
    type: String,
    required: [true, 'Option ID is required']
  },
  text: {
    type: String,
    required: [true, 'Option text is required']
  }
});

const questionSchema = new Schema({
  id: {
    type: String,
    required: [true, 'Question ID is required'],
    unique: true
  },
  question: {
    type: String,
    required: [true, 'Question text is required']
  },
  type: {
    type: String,
    required: [true, 'Question type is required'],
    enum: ['multiple_choice', 'text'],
    default: 'multiple_choice'
  },
  options: [optionSchema],
  correct_answer: {
    type: String,
    required: function() { return this.type === 'multiple_choice'; }
  },
  word_limit: {
    type: Number,
    min: [0, 'Word limit cannot be negative'],
    default: null
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

const quizSchema = new Schema({
  id: {
    type: String,
    required: [true, 'Quiz ID is required'],
    unique: true
  },
  course: {
    type: Schema.Types.ObjectId,
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
  time_limit_minutes: {
    type: Number,
    required: [true, 'Quiz time limit is required'],
    min: [0, 'Time limit cannot be negative'],
    alias: 'duration'
  },
  questions: [questionSchema],
  totalPoints: {
    type: Number,
    default: 0
  },
  passing_score: {
    type: Number,
    required: [true, 'Passing score is required'],
    min: [0, 'Passing score cannot be negative'],
    max: [100, 'Passing score cannot exceed 100'],
    alias: 'passingScore'
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
  let totalPoints = 0;
  
  this.questions.forEach((question, index) => {
    if (question.type === 'multiple_choice') {
      totalPoints += question.points;
      if (answers[question.id] === question.correct_answer) {
        score += question.points;
      }
    }
  });
  
  // Convert to percentage if totalPoints is not 0
  return totalPoints > 0 ? (score / totalPoints) * 100 : 0;
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
export default Quiz; 