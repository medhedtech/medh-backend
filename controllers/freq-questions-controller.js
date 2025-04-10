import FAQ from "../models/freq-questions.js";

// CREATE - Add a new FAQ
export const createFAQ = async (req, res) => {
  try {
    const { question, answer, course_id } = req.body;
    const newFAQ = new FAQ({ question, answer, course_id });
    await newFAQ.save();
    res.status(201).json({ message: "FAQ created successfully", faq: newFAQ });
  } catch (error) {
    res.status(500).json({ message: "Error creating FAQ", error });
  }
};

// READ - Get all FAQs
export const getAllFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find().populate("course_id"); // Populate course details if needed
    res.status(200).json(faqs);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving FAQs", error });
  }
};

// READ - Get FAQ by ID
export const getFAQById = async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id).populate("course_id");
    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }
    res.status(200).json(faq);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving FAQ", error });
  }
};

// UPDATE - Update an existing FAQ by ID
export const updateFAQ = async (req, res) => {
  try {
    const { question, answer, course_id } = req.body;
    const updatedFAQ = await FAQ.findByIdAndUpdate(
      req.params.id,
      { question, answer, course_id },
      { new: true } // Return the updated document
    );
    if (!updatedFAQ) {
      return res.status(404).json({ message: "FAQ not found" });
    }
    res
      .status(200)
      .json({ message: "FAQ updated successfully", faq: updatedFAQ });
  } catch (error) {
    res.status(500).json({ message: "Error updating FAQ", error });
  }
};

// DELETE - Delete an FAQ by ID
export const deleteFAQ = async (req, res) => {
  try {
    const deletedFAQ = await FAQ.findByIdAndDelete(req.params.id);
    if (!deletedFAQ) {
      return res.status(404).json({ message: "FAQ not found" });
    }
    res.status(200).json({ message: "FAQ deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting FAQ", error });
  }
};
