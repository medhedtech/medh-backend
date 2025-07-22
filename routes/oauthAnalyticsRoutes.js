import express from "express";
import { query } from "express-validator";
import oauthAnalyticsController from "../controllers/oauthAnalyticsController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * OAuth Analytics Routes
 * Provides insights and metrics for OAuth adoption and usage
 */

/**
 * @route   GET /api/v1/oauth/analytics/stats
 * @desc    Get OAuth adoption statistics
 * @access  Private (Admin only)
 */
router.get(
  "/stats",
  authenticateToken,
  [
    query("timeframe")
      .optional()
      .isIn(["7d", "30d", "90d", "1y"])
      .withMessage("Invalid timeframe. Use: 7d, 30d, 90d, or 1y"),
    query("provider")
      .optional()
      .isIn(["google", "facebook", "github", "linkedin", "microsoft", "apple"])
      .withMessage("Invalid provider"),
  ],
  (req, res, next) => {
    // Check if user has admin role
    if (
      !req.user.admin_role ||
      !["super_admin", "admin", "analytics_admin"].includes(req.user.admin_role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }
    next();
  },
  oauthAnalyticsController.getOAuthStats,
);

/**
 * @route   GET /api/v1/oauth/analytics/funnel
 * @desc    Get OAuth conversion funnel metrics
 * @access  Private (Admin only)
 */
router.get(
  "/funnel",
  authenticateToken,
  [
    query("timeframe")
      .optional()
      .isIn(["7d", "30d", "90d"])
      .withMessage("Invalid timeframe. Use: 7d, 30d, or 90d"),
  ],
  (req, res, next) => {
    // Check if user has admin role
    if (
      !req.user.admin_role ||
      !["super_admin", "admin", "analytics_admin"].includes(req.user.admin_role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }
    next();
  },
  oauthAnalyticsController.getOAuthConversionFunnel,
);

/**
 * @route   GET /api/v1/oauth/analytics/security
 * @desc    Get OAuth security metrics
 * @access  Private (Admin only)
 */
router.get(
  "/security",
  authenticateToken,
  [
    query("timeframe")
      .optional()
      .isIn(["7d", "30d", "90d"])
      .withMessage("Invalid timeframe. Use: 7d, 30d, or 90d"),
  ],
  (req, res, next) => {
    // Check if user has admin role
    if (
      !req.user.admin_role ||
      !["super_admin", "admin", "analytics_admin", "security_admin"].includes(
        req.user.admin_role,
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }
    next();
  },
  oauthAnalyticsController.getOAuthSecurityMetrics,
);

/**
 * @route   GET /api/v1/oauth/analytics/dashboard
 * @desc    Get comprehensive OAuth dashboard data
 * @access  Private (Admin only)
 */
router.get(
  "/dashboard",
  authenticateToken,
  [
    query("timeframe")
      .optional()
      .isIn(["7d", "30d", "90d"])
      .withMessage("Invalid timeframe. Use: 7d, 30d, or 90d"),
  ],
  async (req, res, next) => {
    try {
      // Check if user has admin role
      if (
        !req.user.admin_role ||
        !["super_admin", "admin", "analytics_admin"].includes(
          req.user.admin_role,
        )
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }

      // Get all analytics data in parallel
      const [statsResponse, funnelResponse, securityResponse] =
        await Promise.all([
          new Promise((resolve) => {
            const mockReq = { ...req };
            const mockRes = {
              status: () => mockRes,
              json: (data) => resolve(data),
            };
            oauthAnalyticsController.getOAuthStats(mockReq, mockRes);
          }),
          new Promise((resolve) => {
            const mockReq = { ...req };
            const mockRes = {
              status: () => mockRes,
              json: (data) => resolve(data),
            };
            oauthAnalyticsController.getOAuthConversionFunnel(mockReq, mockRes);
          }),
          new Promise((resolve) => {
            const mockReq = { ...req };
            const mockRes = {
              status: () => mockRes,
              json: (data) => resolve(data),
            };
            oauthAnalyticsController.getOAuthSecurityMetrics(mockReq, mockRes);
          }),
        ]);

      res.status(200).json({
        success: true,
        data: {
          stats: statsResponse.data,
          funnel: funnelResponse.data,
          security: securityResponse.data,
          generated_at: new Date(),
          timeframe: req.query.timeframe || "30d",
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to generate OAuth dashboard",
        error: error.message,
      });
    }
  },
);

export default router;
