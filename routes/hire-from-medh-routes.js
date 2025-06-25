import express from "express";
import {
  createHireFromMedh,
  getAllHireFromMedh,
  getHireFromMedhById,
  updateHireFromMedh,
  deleteHireFromMedh,
  getHireFromMedhFormInfo,
  getHireFromMedhAnalytics
} from "../controllers/hire-from-medh-controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Public routes
/**
 * @route   POST /api/v1/hire-from-medh
 * @desc    Submit a new hire from medh inquiry
 * @access  Public
 * @body    {
 *   full_name: string,
 *   email: string,
 *   country: string,
 *   phone: string,
 *   company_name: string,
 *   company_website?: string,
 *   department: string,
 *   team_size: "1–5" | "6–20" | "21–50" | "50+",
 *   requirement_type: "Hire Medh-trained Candidates" | "Corporate Upskilling/Training" | "Both",
 *   training_domain: string,
 *   start_date?: string,
 *   budget_range?: string,
 *   detailed_requirements: string,
 *   document_upload?: string,
 *   terms_accepted: boolean
 * }
 */
router.post("/", createHireFromMedh);
router.post("/create", createHireFromMedh); // Legacy endpoint

/**
 * @route   GET /api/v1/hire-from-medh/info
 * @desc    Get hire from medh form information, requirements, and example
 * @access  Public
 */
router.get("/info", getHireFromMedhFormInfo);
router.get("/form-info", getHireFromMedhFormInfo); // Alias endpoint

// Protected routes (require authentication)
/**
 * @route   GET /api/v1/hire-from-medh
 * @desc    Get all hire from medh inquiries (admin/staff only)
 * @access  Private
 * @query   {
 *   status?: string,
 *   priority?: string,
 *   requirement_type?: string,
 *   team_size?: string,
 *   page?: number,
 *   limit?: number
 * }
 */
router.get("/", authenticateToken, getAllHireFromMedh);
router.get("/getAll", authenticateToken, getAllHireFromMedh); // Legacy endpoint

/**
 * @route   GET /api/v1/hire-from-medh/analytics
 * @desc    Get hire from medh analytics and statistics
 * @access  Private
 */
router.get("/analytics", authenticateToken, getHireFromMedhAnalytics);

/**
 * @route   GET /api/v1/hire-from-medh/:id
 * @desc    Get a specific hire from medh inquiry by ID
 * @access  Private
 */
router.get("/get/:id", authenticateToken, getHireFromMedhById); // Legacy endpoint
router.get("/:id", authenticateToken, getHireFromMedhById);

/**
 * @route   PUT /api/v1/hire-from-medh/:id
 * @desc    Update a hire from medh inquiry by ID
 * @access  Private
 * @body    {
 *   status?: string,
 *   priority?: string,
 *   assigned_to?: string,
 *   internal_notes?: string
 * }
 */
router.put("/update/:id", authenticateToken, updateHireFromMedh); // Legacy endpoint
router.put("/:id", authenticateToken, updateHireFromMedh);

/**
 * @route   DELETE /api/v1/hire-from-medh/:id
 * @desc    Delete (soft delete) a hire from medh inquiry by ID
 * @access  Private
 */
router.delete("/delete/:id", authenticateToken, deleteHireFromMedh); // Legacy endpoint
router.delete("/:id", authenticateToken, deleteHireFromMedh);

export default router; 