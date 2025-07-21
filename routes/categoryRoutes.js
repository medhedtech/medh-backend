import express from "express";
const router = express.Router();

import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getRelatedCourses,
} from "../controllers/category-controller.js";

import {
  validateCreateCategory,
  validateUpdateCategory,
  validateGetCategories,
  validateGetCategoryById,
  validateDeleteCategory,
  validateGetRelatedCourses,
} from "../validations/categoryValidation.js";

// Category routes
router.post("/create", validateCreateCategory, createCategory);
router.get("/", validateGetCategories, getCategories);
router.get("/live", validateGetCategories, (req, res, next) => {
  req.query.class_type = "live";
  getCategories(req, res, next);
});
router.get("/blended", validateGetCategories, (req, res, next) => {
  req.query.class_type = "blended";
  getCategories(req, res, next);
});
router.get("/get/:id", validateGetCategoryById, getCategoryById);
router.get(
  "/related-courses/:id",
  validateGetRelatedCourses,
  getRelatedCourses,
);
router.post("/update/:id", validateUpdateCategory, updateCategory);
router.delete("/delete/:id", validateDeleteCategory, deleteCategory);

export default router;
