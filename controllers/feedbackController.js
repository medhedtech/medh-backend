const Feedback = require("../models/feedback");
const InstructorFeedback = require("../models/feedback-instructor");
const FeedbackCoorporate = require("../models/feedback-coorporate-admin.modal");

exports.submitFeedback = async (req, res) => {
  const { userId, feedback_text, feedback_for, feedback_title } = req.body;
  try {
    const feedback = new Feedback({
      userId,
      feedback_text,
      feedback_for,
      feedback_title,
      role: ["student"],
    });
    await feedback.save();
    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFeedbackByCourse = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ courseId: req.params.courseId });
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({})
      .populate("userId")
      .sort({ createdAt: -1 });

    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete feedback by ID
exports.deleteFeedback = async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const deletedFeedback = await Feedback.findByIdAndDelete(feedbackId);
    if (!deletedFeedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    res.status(200).json({ message: "Feedback deleted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to delete feedback", error: error.message });
  }
};

exports.submitInstructorFeedback = async (req, res) => {
  const { userId, feedback_text, feedback_for, feedback_title } = req.body;
  try {
    const feedback = new InstructorFeedback({
      userId,
      feedback_text,
      feedback_for,
      feedback_title,
      role: ["instructor"],
    });
    await feedback.save();
    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllInstructorFeedbacks = async (req, res) => {
  try {
    const feedbacks = await InstructorFeedback.find({})
      .populate("userId")
      .sort({ createdAt: -1 });
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete instructor feedback by ID
exports.deleteInstructorFeedback = async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const deletedFeedback = await InstructorFeedback.findByIdAndDelete(
      feedbackId
    );
    if (!deletedFeedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    res
      .status(200)
      .json({ message: "Instructor feedback deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to delete instructor feedback",
      error: error.message,
    });
  }
};

exports.submitCoorporateFeedback = async (req, res) => {
  const { userId, feedback_text, feedback_for, feedback_title } = req.body;
  try {
    const feedback = new FeedbackCoorporate({
      userId,
      feedback_text,
      feedback_for,
      feedback_title,
      role: ["coorporate-student"],
    });
    await feedback.save();
    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllCoorporateFeedbacks = async (req, res) => {
  try {
    const feedbacks = await FeedbackCoorporate.find({})
      .populate("userId")
      .sort({ createdAt: -1 });
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete feedback by ID
exports.deleteFeedback = async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const deletedFeedback = await FeedbackCoorporate.findByIdAndDelete(
      feedbackId
    );
    if (!deletedFeedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    res.status(200).json({ message: "Feedback deleted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to delete feedback", error: error.message });
  }
};
