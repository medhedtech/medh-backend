const express = require("express");
const {
  submitFeedback,
  getFeedbackByCourse,
  getAllFeedbacks,
  deleteFeedback,
  submitInstructorFeedback,
  getAllInstructorFeedbacks,
  deleteInstructorFeedback,
  submitCoorporateFeedback,
  getAllCoorporateFeedbacks,
} = require("../controllers/feedbackController");
const router = express.Router();

router.post("/", submitFeedback);
router.post("/instructor/add", submitInstructorFeedback);
router.post("/coorporate/add", submitCoorporateFeedback);
router.get("/getAll", getAllFeedbacks);
router.get("/getAll/instructors-feedbacks", getAllInstructorFeedbacks);
router.get("/getAll/coorporate-feedbacks", getAllCoorporateFeedbacks);
router.get("/:courseId", getFeedbackByCourse);
router.delete("/delete-feedback/:id", deleteFeedback);
router.delete("/delete-coorporate/:id", deleteFeedback);
router.delete("/instructor/:id", deleteInstructorFeedback);

module.exports = router;
