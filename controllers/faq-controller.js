import FAQ from "../models/faq-model.js";

// CREATE - Add a new FAQ
export const createFAQ = async (req, res) => {
  try {
    const { question, answer, category } = req.body;

    // Validate required fields
    if (!question || !answer || !category) {
      return res.status(400).json({
        success: false,
        message: "Question, answer, and category are required",
      });
    }

    const newFAQ = new FAQ({ question, answer, category });
    await newFAQ.save();

    res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data: newFAQ,
    });
  } catch (error) {
    console.error("Error creating FAQ:", error);
    res.status(500).json({
      success: false,
      message: "Error creating FAQ",
      error: error.message,
    });
  }
};

// READ - Get all FAQs
export const getAllFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "FAQs retrieved successfully",
      count: faqs.length,
      data: faqs,
    });
  } catch (error) {
    console.error("Error retrieving FAQs:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving FAQs",
      error: error.message,
    });
  }
};

// READ - Get FAQs by category
export const getFAQsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category parameter is required",
      });
    }

    const faqs = await FAQ.find({ category }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "FAQs retrieved successfully",
      count: faqs.length,
      data: faqs,
    });
  } catch (error) {
    console.error("Error retrieving FAQs by category:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving FAQs by category",
      error: error.message,
    });
  }
};

// READ - Get FAQ by ID
export const getFAQById = async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "FAQ retrieved successfully",
      data: faq,
    });
  } catch (error) {
    console.error("Error retrieving FAQ:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving FAQ",
      error: error.message,
    });
  }
};

// UPDATE - Update an existing FAQ by ID
export const updateFAQ = async (req, res) => {
  try {
    const { question, answer, category } = req.body;

    // Validate required fields
    if (!question && !answer && !category) {
      return res.status(400).json({
        success: false,
        message:
          "At least one field (question, answer, or category) is required for update",
      });
    }

    const updateData = {
      ...(question && { question }),
      ...(answer && { answer }),
      ...(category && { category }),
      updatedAt: Date.now(),
    };

    const updatedFAQ = await FAQ.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedFAQ) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      data: updatedFAQ,
    });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    res.status(500).json({
      success: false,
      message: "Error updating FAQ",
      error: error.message,
    });
  }
};

// DELETE - Delete an FAQ by ID
export const deleteFAQ = async (req, res) => {
  try {
    const deletedFAQ = await FAQ.findByIdAndDelete(req.params.id);

    if (!deletedFAQ) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
      data: deletedFAQ,
    });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting FAQ",
      error: error.message,
    });
  }
};

// GET - Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const categories = await FAQ.distinct("category");

    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error("Error retrieving categories:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving categories",
      error: error.message,
    });
  }
};
