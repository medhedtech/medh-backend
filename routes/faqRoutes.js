const express = require("express");
const {
  createFAQ,
  getAllFAQs,
  getFAQsByCategory,
  getFAQById,
  updateFAQ,
  deleteFAQ,
  getAllCategories
} = require("../controllers/faq-controller");

const router = express.Router();

// Get all FAQs
router.get("/getAll", getAllFAQs);

// Get all categories
router.get("/categories", getAllCategories);

// Get FAQs by category
router.get("/category/:category", getFAQsByCategory);

// Create a new FAQ
router.post("/create", createFAQ);

// Update an existing FAQ
router.put("/update/:id", updateFAQ);

// Delete an FAQ
router.delete("/delete/:id", deleteFAQ);

// Get FAQ by ID
router.get("/:id", getFAQById);

module.exports = router; 