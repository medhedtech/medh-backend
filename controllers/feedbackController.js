import FeedbackCoorporate from "../models/feedback-coorporate-admin.modal.js";
import InstructorFeedback from "../models/feedback-instructor.js";
import Feedback from "../models/feedback.js";

export const submitFeedback = async (req, res) => {
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

export const getFeedbackByCourse = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ courseId: req.params.courseId });
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllFeedbacks = async (req, res) => {
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
export const deleteFeedback = async (req, res) => {
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

export const submitInstructorFeedback = async (req, res) => {
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

export const getAllInstructorFeedbacks = async (req, res) => {
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
export const deleteInstructorFeedback = async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const deletedFeedback =
      await InstructorFeedback.findByIdAndDelete(feedbackId);
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

export const submitCoorporateFeedback = async (req, res) => {
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

export const getAllCoorporateFeedbacks = async (req, res) => {
  try {
    const feedbacks = await FeedbackCoorporate.find({})
      .populate("userId")
      .sort({ createdAt: -1 });
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Coorporate feedback by ID
// Renamed function to avoid naming conflict with previous deleteFeedback
export const deleteCoorporateFeedback = async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const deletedFeedback =
      await FeedbackCoorporate.findByIdAndDelete(feedbackId);
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
