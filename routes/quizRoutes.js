import express from "express";
import {
  getAllQuizzes,
  createQuiz,
  uploadQuiz,
  getQuizById,
} from "../controllers/quizController.js";

const router = express.Router();

router.get("/", getAllQuizzes);
router.get("/get/:id", getQuizById);
router.post("/", createQuiz);
router.post("/upload", uploadQuiz);

export default router;
