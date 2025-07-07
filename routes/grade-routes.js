import express from "express";
const router = express.Router();

import {
  createGrade,
  getGrades,
  getGradeById,
  updateGrade,
  deleteGrade,
  getGradeDetails,
  getGradesByAcademicLevel,
  getGradesByDifficulty,
  createDefaultGrades,
} from "../controllers/grade-controller.js";

import { authenticateToken } from "../middleware/auth.js";
import {
  validateCreateGrade,
  validateUpdateGrade,
  validateGetGrades,
  validateGetGradeById,
  validateDeleteGrade,
  validateGetGradeDetails,
  validateGetGradesByAcademicLevel,
  validateGetGradesByDifficulty,
} from "../validations/gradeValidation.js";

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Grade CRUD routes
router.post("/create", validateCreateGrade, createGrade);
router.get("/", validateGetGrades, getGrades);
router.get("/:id", validateGetGradeById, getGradeById);
router.get("/:id/details", validateGetGradeDetails, getGradeDetails);
router.put("/:id", validateUpdateGrade, updateGrade);
router.delete("/:id", validateDeleteGrade, deleteGrade);

// Specialized routes
router.get(
  "/academic-level/:level",
  validateGetGradesByAcademicLevel,
  getGradesByAcademicLevel,
);
router.get(
  "/difficulty/:difficulty",
  validateGetGradesByDifficulty,
  getGradesByDifficulty,
);

// Utility routes
router.post("/create-defaults", createDefaultGrades);

export default router;
