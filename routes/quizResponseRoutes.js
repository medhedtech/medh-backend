const express = require("express");
const {
  createResponse,
  getQuizResponses,
  getResponseById,
  deleteResponse,
} = require("../controllers/quizResponseController");
const router = express.Router();

router.post("/", createResponse);
router.get("/responses/:quizId?", getQuizResponses);
router.get("/:id", getResponseById);
router.delete("/:id", deleteResponse);

module.exports = router;
