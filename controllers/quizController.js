import ExcelJS from "exceljs";

import Quiz from "../models/quiz-model.js";
import { AppError } from "../utils/errorHandler.js";
import logger from "../utils/logger.js";

export const getAllQuizzes = async (req, res) => {
  try {
    const { class_id, created_by, isActive } = req.query;

    const query = {};
    if (class_id) query.class_id = class_id;
    if (created_by) query.created_by = created_by;
    if (isActive !== undefined) query.isActive = isActive === "true";

    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 })
      .populate("created_by", "full_name email")
      .populate("class_id", "course_title");

    logger.info("Fetched all quizzes", {
      count: quizzes.length,
      filters: query,
    });

    res.status(200).json({
      status: "success",
      data: quizzes,
    });
  } catch (error) {
    logger.error("Error fetching quizzes", {
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
    res.status(500).json({
      status: "error",
      message: "Failed to fetch quizzes",
    });
  }
};

export const createQuiz = async (req, res) => {
  try {
    const {
      created_by,
      class_id,
      class_name,
      quiz_title,
      quiz_time,
      passing_percentage,
      questions,
      attempts_allowed,
      shuffle_questions,
      show_results,
    } = req.body;

    const newQuiz = new Quiz({
      created_by,
      class_id,
      class_name,
      quiz_title,
      quiz_time,
      passing_percentage,
      questions,
      attempts_allowed,
      shuffle_questions,
      show_results,
    });

    await newQuiz.save();

    logger.info("Quiz created", {
      quizId: newQuiz._id,
      title: quiz_title,
      questionCount: questions.length,
    });

    res.status(201).json({
      status: "success",
      data: newQuiz,
    });
  } catch (error) {
    logger.error("Error creating quiz", {
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const uploadQuiz = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      throw new AppError("No file uploaded", 400);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.files.file.data);
    const worksheet = workbook.getWorksheet(1);

    const questions = [];
    const rejectedItems = [];

    worksheet.eachRow(
      { includeEmpty: false, skipHeader: true },
      (row, rowNumber) => {
        if (rowNumber > 1) {
          // Skip header row
          const question = {
            question: row.getCell(1).value?.toString().trim(),
            options: [
              row.getCell(2).value?.toString().trim(),
              row.getCell(3).value?.toString().trim(),
              row.getCell(4).value?.toString().trim(),
              row.getCell(5).value?.toString().trim(),
            ].filter(Boolean),
            correctAnswer: row.getCell(6).value?.toString().trim(),
            explanation: row.getCell(7).value?.toString().trim() || "",
            category: row.getCell(8).value?.toString().trim() || "General",
            difficultyLevel:
              row.getCell(9).value?.toString().trim() || "Medium",
          };

          // Validate question
          if (
            !question.question ||
            question.options.length < 2 ||
            !question.correctAnswer
          ) {
            rejectedItems.push({
              rowNumber,
              ...question,
              error: "Missing required fields",
            });
          } else if (!question.options.includes(question.correctAnswer)) {
            rejectedItems.push({
              rowNumber,
              ...question,
              error: "Correct answer must match one of the options",
            });
          } else {
            questions.push(question);
          }
        }
      },
    );

    if (questions.length === 0) {
      throw new AppError("No valid questions found in the file", 400);
    }

    const {
      created_by,
      class_id,
      class_name,
      quiz_title,
      quiz_time,
      passing_percentage,
    } = req.body;

    // Find existing quiz or create new one
    let quiz = await Quiz.findOne({
      created_by,
      class_id,
      quiz_title,
    });

    if (quiz) {
      // Update existing quiz
      quiz.questions = [...quiz.questions, ...questions];
      quiz.quiz_time = quiz_time;
      quiz.passing_percentage = passing_percentage;
      await quiz.save();

      logger.info("Quiz updated from Excel", {
        quizId: quiz._id,
        addedQuestions: questions.length,
        rejectedItems: rejectedItems.length,
      });
    } else {
      // Create new quiz
      quiz = new Quiz({
        created_by,
        class_id,
        class_name,
        quiz_title,
        quiz_time,
        passing_percentage,
        questions,
      });
      await quiz.save();

      logger.info("Quiz created from Excel", {
        quizId: quiz._id,
        questionCount: questions.length,
        rejectedItems: rejectedItems.length,
      });
    }

    res.status(201).json({
      status: "success",
      message: quiz.isNew
        ? "Quiz created successfully"
        : "Quiz updated successfully",
      data: quiz,
      rejectedItems,
    });
  } catch (error) {
    logger.error("Error processing quiz upload", {
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate("created_by", "full_name email")
      .populate("class_id", "course_title");

    if (!quiz) {
      throw new AppError("Quiz not found", 404);
    }

    logger.info("Quiz fetched by ID", {
      quizId: quiz._id,
      title: quiz.quiz_title,
    });

    res.status(200).json({
      status: "success",
      data: quiz,
    });
  } catch (error) {
    logger.error("Error fetching quiz", {
      error: {
        message: error.message,
        stack: error.stack,
      },
      quizId: req.params.id,
    });
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const importQuizFromExcel = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      throw new AppError("No file uploaded", 400);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.files.file.data);
    const worksheet = workbook.getWorksheet(1);

    const quizzes = [];
    worksheet.eachRow(
      { includeEmpty: false, skipHeader: true },
      (row, rowNumber) => {
        if (rowNumber > 1) {
          // Skip header row
          const quiz = {
            question: row.getCell(1).value,
            options: [
              row.getCell(2).value,
              row.getCell(3).value,
              row.getCell(4).value,
              row.getCell(5).value,
            ],
            correctAnswer: row.getCell(6).value,
            explanation: row.getCell(7).value || "",
            category: row.getCell(8).value || "General",
            difficultyLevel: row.getCell(9).value || "Medium",
          };
          quizzes.push(quiz);
        }
      },
    );

    const savedQuizzes = await Quiz.insertMany(quizzes);

    logger.info("Quiz Import Success", {
      count: savedQuizzes.length,
      source: "Excel Import",
    });

    res.status(201).json({
      status: "success",
      message: `Successfully imported ${savedQuizzes.length} quizzes`,
      data: savedQuizzes,
    });
  } catch (error) {
    logger.error("Quiz Import Error", {
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to import quizzes",
    });
  }
};

export const exportQuizToExcel = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      throw new AppError("Quiz not found", 404);
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(quiz.quiz_title);

    // Add headers
    worksheet.columns = [
      { header: "Question", key: "question", width: 50 },
      { header: "Option 1", key: "option1", width: 20 },
      { header: "Option 2", key: "option2", width: 20 },
      { header: "Option 3", key: "option3", width: 20 },
      { header: "Option 4", key: "option4", width: 20 },
      { header: "Correct Answer", key: "correctAnswer", width: 15 },
      { header: "Explanation", key: "explanation", width: 30 },
      { header: "Category", key: "category", width: 15 },
      { header: "Difficulty Level", key: "difficultyLevel", width: 15 },
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add questions
    quiz.questions.forEach((question) => {
      worksheet.addRow({
        question: question.question,
        option1: question.options[0] || "",
        option2: question.options[1] || "",
        option3: question.options[2] || "",
        option4: question.options[3] || "",
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        category: question.category,
        difficultyLevel: question.difficultyLevel,
      });
    });

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();

    logger.info("Quiz exported to Excel", {
      quizId: quiz._id,
      title: quiz.quiz_title,
      questionCount: quiz.questions.length,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${encodeURIComponent(quiz.quiz_title)}.xlsx`,
    );
    res.send(buffer);
  } catch (error) {
    logger.error("Error exporting quiz", {
      error: {
        message: error.message,
        stack: error.stack,
      },
      quizId: req.params.id,
    });
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message,
    });
  }
};
