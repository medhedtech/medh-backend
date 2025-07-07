import express from "express";
const router = express.Router();

import {
  createParentCategory,
  getParentCategories,
  getParentCategoryById,
  updateParentCategory,
  deleteParentCategory,
  getParentCategoryDetails,
  createDefaultParentCategories,
} from "../controllers/parent-category-controller.js";

import { authenticateToken } from "../middleware/auth.js";
import {
  validateCreateParentCategory,
  validateUpdateParentCategory,
  validateGetParentCategories,
  validateGetParentCategoryById,
  validateDeleteParentCategory,
  validateGetParentCategoryDetails
} from "../validations/parentCategoryValidation.js";

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Parent Category CRUD routes
router.post("/create", validateCreateParentCategory, createParentCategory);
router.get("/", validateGetParentCategories, getParentCategories);
router.get("/:id", validateGetParentCategoryById, getParentCategoryById);
router.get("/:id/details", validateGetParentCategoryDetails, getParentCategoryDetails);
router.put("/:id", validateUpdateParentCategory, updateParentCategory);
router.delete("/:id", validateDeleteParentCategory, deleteParentCategory);

// Utility routes
router.post("/create-defaults", createDefaultParentCategories);

export default router;
