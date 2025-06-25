import express from "express";
import { authenticateToken as isAuthenticated } from "../middleware/auth.js";
import {
  getCourseMaterials,
  searchMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  recordDownload,
  getMaterialsStats,
  getMaterialsFromEnrolledCourses,
  getRecentMaterials
} from "../controllers/courseMaterialController.js";

const router = express.Router();

// Protect all routes after this middleware
router.use(isAuthenticated);

/**
 * @route   GET /api/v1/materials/enrolled
 * @desc    Get all materials from enrolled courses
 * @access  Private
 */
router.get("/enrolled", getMaterialsFromEnrolledCourses);

/**
 * @route   GET /api/v1/materials/recent
 * @desc    Get recent materials from enrolled courses
 * @access  Private
 */
router.get("/recent", getRecentMaterials);

/**
 * @route   GET /api/v1/materials/search
 * @desc    Search course materials
 * @access  Private
 */
router.get("/search", searchMaterials);

/**
 * @route   GET /api/v1/materials/course/:courseId
 * @desc    Get all materials for a course
 * @access  Private
 */
router.get("/course/:courseId", getCourseMaterials);

/**
 * @route   GET /api/v1/materials/course/:courseId/stats
 * @desc    Get materials statistics for a course
 * @access  Private
 */
router.get("/course/:courseId/stats", getMaterialsStats);

/**
 * @route   GET /api/v1/materials/:id
 * @desc    Get material by ID
 * @access  Private
 */
router.get("/:id", getMaterialById);

/**
 * @route   POST /api/v1/materials
 * @desc    Create a new material
 * @access  Private (Instructor/Admin only)
 */
router.post("/", createMaterial);

/**
 * @route   PATCH /api/v1/materials/:id
 * @desc    Update a material
 * @access  Private (Instructor/Admin only)
 */
router.patch("/:id", updateMaterial);

/**
 * @route   DELETE /api/v1/materials/:id
 * @desc    Delete a material
 * @access  Private (Instructor/Admin only)
 */
router.delete("/:id", deleteMaterial);

/**
 * @route   POST /api/v1/materials/:id/download
 * @desc    Record a material download
 * @access  Private
 */
router.post("/:id/download", recordDownload);

export default router; 