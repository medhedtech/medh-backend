import mongoose from "mongoose";

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

export default mongoose.model("QuizResponse", quizResponseSchema);
