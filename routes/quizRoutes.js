const express = require("express");
const {
  getAllQuizzes,
  createQuiz,
  uploadQuiz,
  getQuizById,
} = require("../controllers/quizController");

const router = express.Router();

router.get("/", getAllQuizzes);
router.get("/get/:id", getQuizById);
router.post("/", createQuiz);
router.post("/upload", uploadQuiz);
module.exports = router;
