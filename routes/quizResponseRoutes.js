import express from "express";

import {
  submitQuizResponse,
  getQuizResponsesByUser,
  getQuizResponsesByQuiz,
  getQuizResponseById,
} from "../controllers/quizResponseController.js";

const router = express.Router();

router.post("/submit", submitQuizResponse);
router.get("/user/:userId", getQuizResponsesByUser);
router.get("/quiz/:quizId", getQuizResponsesByQuiz);
router.get("/:id", getQuizResponseById);

export default router;
