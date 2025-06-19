import express from "express";
import {
  createFormSchema,
  getAllFormSchemas,
  getFormSchema,
  updateFormSchema,
  deleteFormSchema,
  submitFormSchema,
  getFormAnalytics,
  createCorporateTrainingForm
} from "../controllers/form-schema-controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// =========================================
// PUBLIC ROUTES (No authentication required)
// =========================================

/**
 * @desc    Get form schema configuration
 * @route   GET /api/v1/forms/schema/:identifier
 * @access  Public (for active forms)
 * @params  identifier - form_id or MongoDB _id
 * @query   config_only - return only form configuration (true/false)
 */
router.get("/:identifier", getFormSchema);

/**
 * @desc    Submit form data using form schema
 * @route   POST /api/v1/forms/schema/:form_id/submit
 * @access  Public
 * @params  form_id - the form identifier
 * @body    Form data matching the schema fields
 */
router.post("/:form_id/submit", submitFormSchema);

// =========================================
// ADMIN ROUTES (Authentication required)
// =========================================

/**
 * @desc    Create a new form schema
 * @route   POST /api/v1/forms/schema
 * @access  Private (Admin only)
 * @body    Complete form schema object
 */
router.post("/", authenticateToken, createFormSchema);

/**
 * @desc    Get all form schemas with filtering and pagination
 * @route   GET /api/v1/forms/schema
 * @access  Private (Admin only)
 * @query   status, category, page, limit, search, sortBy, sortOrder
 */
router.get("/", authenticateToken, getAllFormSchemas);

/**
 * @desc    Update an existing form schema
 * @route   PUT /api/v1/forms/schema/:id
 * @access  Private (Admin only)
 * @params  id - MongoDB _id of the form schema
 * @body    Updated form schema fields
 */
router.put("/:id", authenticateToken, updateFormSchema);

/**
 * @desc    Delete/Archive a form schema
 * @route   DELETE /api/v1/forms/schema/:id
 * @access  Private (Admin only, Super-admin for permanent deletion)
 * @params  id - MongoDB _id of the form schema
 * @query   permanent - true for hard delete (super-admin only)
 */
router.delete("/:id", authenticateToken, deleteFormSchema);

/**
 * @desc    Get form analytics and insights
 * @route   GET /api/v1/forms/schema/:id/analytics
 * @access  Private (Admin only)
 * @params  id - MongoDB _id of the form schema
 * @query   period - time period (30d, 60d, 90d), detailed - include detailed analytics
 */
router.get("/:id/analytics", authenticateToken, getFormAnalytics);

// =========================================
// CONVENIENCE ROUTES
// =========================================

/**
 * @desc    Create the default corporate training form
 * @route   POST /api/v1/forms/schema/create-corporate-training
 * @access  Private (Admin only)
 */
router.post("/create-corporate-training", authenticateToken, createCorporateTrainingForm);

export default router; 