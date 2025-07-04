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

// Category routes
router.post("/create", createCategory);
router.get("/", getCategories);
router.get("/get/:id", getCategoryById);
router.get("/related-courses/:id", getRelatedCourses);
router.post("/update/:id", updateCategory);
router.delete("/delete/:id", deleteCategory);

export default router;
