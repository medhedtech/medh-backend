import express from "express";
import { body } from "express-validator";

import salesSupportController from "../controllers/salesSupportController.js";
import {
  authenticateToken,
  isSalesTeam,
  isSupportTeam,
  isSalesAdmin,
  isSupportAdmin,
  authorize,
} from "../middleware/auth.js";

const router = express.Router();

// ============================================================================
// TEAM AUTHENTICATION ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/team/login
 * @desc    Specialized login for sales and support team members
 * @access  Public
 */
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("team_type")
      .isIn(["sales", "support"])
      .withMessage("Team type must be either 'sales' or 'support'"),
  ],
  salesSupportController.teamLogin.bind(salesSupportController),
);

/**
 * @route   POST /api/v1/team/logout
 * @desc    Logout team member
 * @access  Private (Authenticated team members)
 */
router.post(
  "/logout",
  authenticateToken,
  salesSupportController.teamLogout.bind(salesSupportController),
);

// ============================================================================
// SALES TEAM ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/team/sales/dashboard-stats
 * @desc    Get sales team dashboard statistics
 * @access  Private (Sales team members and admins)
 */
router.get(
  "/sales/dashboard-stats",
  authenticateToken,
  authorize(["sales_team", "sales-admin", "admin", "super-admin"]),
  salesSupportController.getTeamDashboardStats.bind(salesSupportController),
);

/**
 * @route   GET /api/v1/team/sales/members
 * @desc    Get all sales team members
 * @access  Private (Sales team members and admins)
 */
router.get(
  "/sales/members",
  authenticateToken,
  authorize(["sales_team", "sales-admin", "admin", "super-admin"]),
  salesSupportController.getTeamMembers.bind(salesSupportController),
);

// ============================================================================
// SUPPORT TEAM ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/team/support/dashboard-stats
 * @desc    Get support team dashboard statistics
 * @access  Private (Support team members and admins)
 */
router.get(
  "/support/dashboard-stats",
  authenticateToken,
  authorize(["support_team", "support-admin", "admin", "super-admin"]),
  salesSupportController.getTeamDashboardStats.bind(salesSupportController),
);

/**
 * @route   GET /api/v1/team/support/members
 * @desc    Get all support team members
 * @access  Private (Support team members and admins)
 */
router.get(
  "/support/members",
  authenticateToken,
  authorize(["support_team", "support-admin", "admin", "super-admin"]),
  salesSupportController.getTeamMembers.bind(salesSupportController),
);

// ============================================================================
// ADMIN MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/team/admin/create-member
 * @desc    Create a new team member (Admin only)
 * @access  Private (Admins only)
 */
router.post(
  "/admin/create-member",
  authenticateToken,
  authorize(["admin", "super-admin", "sales-admin", "support-admin"]),
  [
    body("full_name")
      .isLength({ min: 2, max: 100 })
      .withMessage("Full name must be between 2 and 100 characters"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("team_type")
      .isIn(["sales", "support"])
      .withMessage("Team type must be either 'sales' or 'support'"),
    body("role")
      .optional()
      .isIn(["sales_team", "support_team", "sales-admin", "support-admin"])
      .withMessage("Invalid role for team member"),
  ],
  async (req, res) => {
    try {
      // This endpoint would be implemented in the controller
      // For now, return a placeholder response
      res.status(501).json({
        success: false,
        message: "Create team member endpoint not yet implemented",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating team member",
        error: error.message,
      });
    }
  },
);

/**
 * @route   PUT /api/v1/team/admin/update-member/:id
 * @desc    Update team member details (Admin only)
 * @access  Private (Admins only)
 */
router.put(
  "/admin/update-member/:id",
  authenticateToken,
  authorize(["admin", "super-admin", "sales-admin", "support-admin"]),
  async (req, res) => {
    try {
      // This endpoint would be implemented in the controller
      // For now, return a placeholder response
      res.status(501).json({
        success: false,
        message: "Update team member endpoint not yet implemented",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating team member",
        error: error.message,
      });
    }
  },
);

/**
 * @route   DELETE /api/v1/team/admin/remove-member/:id
 * @desc    Remove team member (Admin only)
 * @access  Private (Admins only)
 */
router.delete(
  "/admin/remove-member/:id",
  authenticateToken,
  authorize(["admin", "super-admin", "sales-admin", "support-admin"]),
  async (req, res) => {
    try {
      // This endpoint would be implemented in the controller
      // For now, return a placeholder response
      res.status(501).json({
        success: false,
        message: "Remove team member endpoint not yet implemented",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error removing team member",
        error: error.message,
      });
    }
  },
);

export default router;
