import express from "express";
import { authenticateToken as isAuthenticated, authorize } from "../middleware/auth.js";
import {
  createDemoCertificate,
  verifyDemoCertificate,
} from "../controllers/demoCertificateController.js";

const router = express.Router();

// ---------------------------------------------------------------------------
// DEMO CERTIFICATE ROUTES
// Base path: /api/v1/demo-certificates
// ---------------------------------------------------------------------------

/**
 * @route   POST /api/v1/demo-certificates/create
 * @desc    Generate a demo certificate PDF for a completed demo session
 * @access  Private (instructors & admins)
 */
router.post(
  "/create",
  isAuthenticated,
  authorize(["admin", "instructor", "super-admin"]),
  createDemoCertificate,
);

/**
 * @route   GET /api/v1/demo-certificates/verify/:id
 * @desc    Public verification endpoint for demo certificates
 * @access  Public
 */
router.get("/verify/:id", verifyDemoCertificate);

export default router; 