const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema({
  question: { type: String },
  selectedAnswer: { type: String },
});

const quizResponseSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
  },
  responses: {
    type: [responseSchema],
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("QuizResponse", quizResponseSchema);
