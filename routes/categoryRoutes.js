const express = require("express");
const router = express.Router();

const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getRelatedCourses,
} = require("../controllers/category-controller");

// Category routes
router.post("/create", createCategory);
router.get("/getAll", getCategories);
router.get("/get/:id", getCategoryById);
router.get("/related-courses/:id", getRelatedCourses);
router.post("/update/:id", updateCategory);
router.delete("/delete/:id", deleteCategory);

module.exports = router;
