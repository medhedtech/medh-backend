const Quiz = require("../models/quiz");
const xlsx = require("xlsx");

exports.getAllQuizzes = async (req, res) => {
  try {
    const { meet_title } = req.query;

    const query = {};
    if (meet_title) {
      query.class_name = meet_title;
    }

    // const quizzes = await Quiz.find(query);
    const quizzes = await Quiz.find(query).sort({ createdAt: -1 });

    res.status(200).json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createQuiz = async (req, res) => {
  const { courseId, title, questions } = req.body;
  try {
    const newQuiz = new Quiz({ courseId, title, questions });
    await newQuiz.save();
    res.status(201).json(newQuiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.uploadQuiz = async (req, res) => {
  try {
    if (!req.files || !req.files.sheet) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = req.files.sheet;
    const workbook = xlsx.read(file.data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const validQuestions = [];
    const rejectedItems = [];

    sheetData.forEach((row, index) => {
      // Ensure all fields are treated as strings and trimmed
      const question = String(row["Question"] || "")
        .toLowerCase()
        .trim();
      const options = [
        String(row["Option 1"] || "").trim(),
        String(row["Option 2"] || "").trim(),
        String(row["Option 3"] || "").trim(),
        String(row["Option 4"] || "").trim(),
      ];
      const correctAnswer = String(row["Correct Answer"] || "").trim();

      // Validate question, options, and correct answer
      if (!question || options.some((option) => !option) || !correctAnswer) {
        rejectedItems.push({ rowIndex: index + 2, ...row });
      } else if (!options.includes(correctAnswer)) {
        rejectedItems.push({
          rowIndex: index + 2,
          error: "Correct Answer must match one of the options",
          ...row,
        });
      } else {
        validQuestions.push({ question, options, correctAnswer });
      }
    });

    if (validQuestions.length === 0) {
      return res.status(400).json({
        message: "No valid questions found in the sheet",
        rejectedItems,
      });
    }

    const quiz = await Quiz.findOne({
      created_by: req.body.created_by,
      class_id: req.body.class_id,
      class_name: req.body.class_name,
      quiz_title: req.body.quiz_title,
      passing_percentage: req.body.passing_percentage,
      quiz_time: req.body.quiz_time,
    });

    if (!quiz) {
      const newQuiz = new Quiz({
        created_by: req.body.created_by,
        class_id: req.body.class_id,
        class_name: req.body.class_name,
        quiz_title: req.body.quiz_title,
        quiz_time: req.body.quiz_time,
        questions: validQuestions,
        passing_percentage: req.body.passing_percentage,
      });

      await newQuiz.save();
      return res.status(201).json({
        message: "Quiz created successfully",
        quiz: newQuiz,
        rejectedItems,
      });
    } else {
      // Update existing quiz
      validQuestions.forEach((newQuestion) => {
        const existingQuestion = quiz.questions.find(
          (q) => q.question === newQuestion.question
        );

        if (existingQuestion) {
          // Update options and correct answer for an existing question
          existingQuestion.options = newQuestion.options;
          existingQuestion.correctAnswer = newQuestion.correctAnswer;
        } else {
          // Add new question if not already in the quiz
          quiz.questions.push(newQuestion);
        }
      });

      await quiz.save();

      res.status(200).json({
        message: "Quiz updated successfully",
        quiz,
        rejectedItems,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred", error });
  }
};

exports.getQuizById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the quiz exists in the database by its ID
    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // If the quiz is found, return it
    res.status(200).json(quiz);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching the quiz", error });
  }
};
