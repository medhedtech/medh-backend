const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: {
    type: [String],
    validate: {
      validator: function (options) {
        return (
          options.length === 4 &&
          options.every((option) => option.trim() !== "")
        );
      },
      message: "All 4 options are required and cannot be empty.",
    },
  },
  correctAnswer: {
    type: String,
    required: true,
    validate: {
      validator: function (answer) {
        return this.options.includes(answer);
      },
      message: "Correct answer must match one of the options.",
    },
  },
});

const quizSchema = new mongoose.Schema(
  {
    created_by: { type: String, required: true },
    class_id: { type: String, required: true },
    class_name: { type: String, required: true },
    questions: { type: [questionSchema], default: [] },
    quiz_title: { type: String },
    passing_percentage: { type: String },
    quiz_time: { type: Number, required: true, default: 300 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);
