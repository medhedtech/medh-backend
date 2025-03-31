const mongoose = require("mongoose");
const QuizResponse = require("../models/quizResponse");
const User = require("../models/user-modal");
const Quiz = require("../models/quiz-model");

const createResponse = async (req, res) => {
  try {
    const { quizId, studentId, responses } = req.body;

    const formattedResponses = responses.map((response) => ({
      question: response?.question,
      selectedAnswer: response.selectedAnswer,
    }));

    const quizResponse = new QuizResponse({
      quizId: new mongoose.Types.ObjectId(quizId),
      studentId: new mongoose.Types.ObjectId(studentId),
      responses: formattedResponses,
    });

    await quizResponse.save();
    res.status(201).json(quizResponse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getQuizResponses = async (req, res) => {
  try {
    const { responseId } = req.params;
    const { page = 1, limit = 10, filter } = req.query;

    const skip = (page - 1) * limit;
    const limitNumber = parseInt(limit, 10);

    // Date filtering based on 'filter' query parameter
    let dateFilter = {};

    if (filter === "History") {
      // History filter: Quizzes submitted before today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      dateFilter = { submittedAt: { $lt: startOfDay } };
    } else if (filter === "Today") {
      // Today filter: Quizzes submitted today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter = { submittedAt: { $gte: startOfDay, $lt: endOfDay } };
    }

    if (responseId) {
      // Fetch a single quiz response by ID
      const quizResponse = await QuizResponse.findById(responseId)
        .populate("quizId")
        .populate("studentId");

      if (!quizResponse) {
        return res.status(404).json({ message: "Quiz response not found." });
      }

      // Fetch quiz details based on quizId
      const quizDetails = await Quiz.findById(quizResponse.quizId);
      const studentDetails = await User.findById(quizResponse.studentId);

      return res.status(200).json({
        quizResponse: quizResponse.toObject(),
        quizDetails,
        studentDetails,
      });
    }

    // Fetch all quiz responses with pagination and date filter
    const totalResponses = await QuizResponse.countDocuments(dateFilter);
    const allResponses = await QuizResponse.find(dateFilter)
      .skip(skip)
      .limit(limitNumber)
      .populate("quizId");

    // Optionally, you can populate student details for each response
    const responsesWithStudentDetails = await Promise.all(
      allResponses.map(async (response) => {
        const student = await User.findById(response.studentId);
        const quiz = await Quiz.findById(response.quizId);
        return {
          ...response.toObject(),
          studentDetails: student,
          quizDetails: quiz,
        };
      })
    );

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalResponses / limitNumber);

    return res.status(200).json({
      currentPage: page,
      totalPages,
      totalResponses,
      responses: responsesWithStudentDetails,
    });
  } catch (error) {
    console.error("Error fetching quiz responses:", error);
    res.status(500).json({ message: "Internal server error.", error });
  }
};

const getResponseById = async (req, res) => {
  try {
    const response = await QuizResponse.findById(req.params.id).populate(
      "quizId"
    );
    if (!response) return res.status(404).json({ error: "Response not found" });
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteResponse = async (req, res) => {
  try {
    const response = await QuizResponse.findByIdAndDelete(req.params.id);
    if (!response) return res.status(404).json({ error: "Response not found" });
    res.status(200).json({ message: "Response deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createResponse,
  getQuizResponses,
  getResponseById,
  deleteResponse,
  getQuizResponses,
};
