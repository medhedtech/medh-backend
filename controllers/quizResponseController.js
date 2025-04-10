import mongoose from "mongoose";
import QuizResponse from "../models/quizResponse.js";
import User from "../models/user-modal.js";
import Quiz from "../models/quiz-model.js";

export const submitQuizResponse = async (req, res) => {
  try {
    const { quizId, userId, answers, score, timeSpent } = req.body;

    // Validate quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create quiz response
    const quizResponse = await QuizResponse.create({
      quiz: quizId,
      user: userId,
      answers,
      score,
      timeSpent
    });

    res.status(201).json({
      message: "Quiz response submitted successfully",
      quizResponse
    });
  } catch (error) {
    res.status(500).json({
      message: "Error submitting quiz response",
      error: error.message
    });
  }
};

export const getQuizResponsesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const responses = await QuizResponse.find({ user: userId })
      .populate('quiz')
      .sort('-createdAt');

    res.status(200).json({
      message: "Quiz responses fetched successfully",
      responses
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching quiz responses",
      error: error.message
    });
  }
};

export const getQuizResponsesByQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const responses = await QuizResponse.find({ quiz: quizId })
      .populate('user', '-password')
      .sort('-createdAt');

    res.status(200).json({
      message: "Quiz responses fetched successfully",
      responses
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching quiz responses",
      error: error.message
    });
  }
};

export const getQuizResponseById = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await QuizResponse.findById(id)
      .populate('quiz')
      .populate('user', '-password');

    if (!response) {
      return res.status(404).json({ message: "Quiz response not found" });
    }

    res.status(200).json({
      message: "Quiz response fetched successfully",
      response
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching quiz response",
      error: error.message
    });
  }
};
