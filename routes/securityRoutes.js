import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import securityController from "../controllers/securityController.js";
import { body, query, param } from "express-validator";
import { validationResult } from "express-validator";
import User from "../models/user-modal.js";
import logger from "../utils/logger.js";

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  next();
};

/**
 * @route   GET /api/v1/security/overview
 * @desc    Get comprehensive security overview for the authenticated user
 * @access  Private (Authenticated users)
 * @returns {Object} Complete security overview including stats, sessions, risk assessment, and recommendations
 */
router.get(
  "/overview",
  authenticateToken,
  securityController.getSecurityOverview
);

/**
 * @route   GET /api/v1/security/sessions
 * @desc    Get detailed information about all active sessions
 * @access  Private (Authenticated users)
 * @returns {Object} List of active sessions with device, location, and risk information
 */
router.get(
  "/sessions",
  authenticateToken,
  securityController.getActiveSessions
);

/**
 * @route   DELETE /api/v1/security/sessions/:sessionId
 * @desc    Terminate a specific session by ID
 * @access  Private (Authenticated users)
 * @param   {string} sessionId - The ID of the session to terminate
 * @returns {Object} Confirmation of session termination
 */
router.delete(
  "/sessions/:sessionId",
  authenticateToken,
  [
    param("sessionId")
      .isLength({ min: 1 })
      .withMessage("Session ID is required")
      .isAlphanumeric()
      .withMessage("Invalid session ID format")
  ],
  handleValidationErrors,
  securityController.terminateSession
);

/**
 * @route   POST /api/v1/security/logout-all-devices
 * @desc    Logout from all devices except the current one
 * @access  Private (Authenticated users)
 * @returns {Object} Summary of terminated sessions and security recommendations
 */
router.post(
  "/logout-all-devices",
  authenticateToken,
  securityController.logoutAllDevices
);

/**
 * @route   GET /api/v1/security/activity
 * @desc    Get paginated security activity history with filtering
 * @access  Private (Authenticated users)
 * @query   {number} page - Page number for pagination (default: 1)
 * @query   {number} limit - Items per page (default: 20, max: 100)
 * @query   {string} type - Filter by specific activity type (optional)
 * @query   {number} days - Number of days to look back (default: 30)
 * @returns {Object} Paginated list of security activities with metadata
 */
router.get(
  "/activity",
  authenticateToken,
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("days")
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage("Days must be between 1 and 365"),
    query("type")
      .optional()
      .isIn([
        'login', 'logout', 'logout_all_devices', 'password_change',
        'password_reset', 'password_reset_request', 'temp_password_verified',
        'session_terminated', 'bulk_session_termination', 'admin_action'
      ])
      .withMessage("Invalid activity type")
  ],
  handleValidationErrors,
  securityController.getSecurityActivity
);

/**
 * @route   GET /api/v1/security/stats
 * @desc    Get security statistics and metrics
 * @access  Private (Authenticated users)
 * @returns {Object} Security statistics including scores, trends, and analytics
 */
router.get(
  "/stats",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const fullUser = await User.findById(user.id).select('-password');
      
      if (!fullUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Get security stats directly
      const securityStats = await securityController.calculateSecurityStats(fullUser);
      const activeSessions = securityController.getEnhancedActiveSessions(fullUser);
      const riskAssessment = securityController.calculateRiskAssessment(fullUser, activeSessions);
      const loginAnalytics = securityController.getLoginAnalytics(fullUser);

      res.status(200).json({
        success: true,
        message: "Security statistics retrieved successfully",
        data: {
          stats: securityStats,
          security_assessment: {
            score: riskAssessment.score,
            level: riskAssessment.level,
            factors: riskAssessment.factors
          },
          login_analytics: loginAnalytics
        }
      });
    } catch (error) {
      logger.error("Security stats error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      
      return res.status(500).json({
        success: false,
        message: "Internal server error retrieving security statistics",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/v1/security/risk-assessment
 * @desc    Get detailed risk assessment for the user account
 * @access  Private (Authenticated users)
 * @returns {Object} Risk assessment with score, level, factors, and recommendations
 */
router.get(
  "/risk-assessment",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const fullUser = await User.findById(user.id).select('-password');
      
      if (!fullUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const activeSessions = securityController.getEnhancedActiveSessions(fullUser);
      const riskAssessment = securityController.calculateRiskAssessment(fullUser, activeSessions);
      const securityScore = securityController.calculateSecurityScore(fullUser);

      res.status(200).json({
        success: true,
        message: "Risk assessment retrieved successfully",
        data: {
          risk_assessment: riskAssessment,
          security_score: securityScore,
          session_analysis: {
            total_sessions: activeSessions.length,
            unique_locations: new Set(activeSessions.map(s => s.location)).size,
            unique_devices: new Set(activeSessions.map(s => s.device_id)).size,
            high_risk_sessions: activeSessions.filter(s => s.risk_level === 'high').length
          },
          recommendations: [
            ...riskAssessment.recommendations,
            ...securityScore.recommendations
          ].slice(0, 5) // Top 5 recommendations
        }
      });

    } catch (error) {
      logger.error("Risk assessment error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: "Internal server error retrieving risk assessment",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/v1/security/devices
 * @desc    Get information about devices that have accessed the account
 * @access  Private (Authenticated users)
 * @returns {Object} List of known devices with their security status
 */
router.get(
  "/devices",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const fullUser = await User.findById(user.id).select('-password');
      
      if (!fullUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const devices = fullUser.devices || [];
      const activeSessions = fullUser.sessions ? fullUser.sessions.filter(s => s.is_active) : [];

      const deviceInfo = devices.map(device => {
        const activeSession = activeSessions.find(s => s.device_id === device.device_id);
        const recentActivity = fullUser.activity_log ? 
          fullUser.activity_log
            .filter(a => a.metadata?.device_type === device.device_type)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5) : [];

        return {
          device_id: device.device_id,
          device_name: device.device_name || 'Unknown Device',
          device_type: device.device_type,
          operating_system: device.operating_system,
          browser: device.browser,
          is_current: !!activeSession,
          is_trusted: device.is_trusted || false,
          last_seen: device.last_seen,
          last_seen_formatted: securityController.formatTimeAgo(device.last_seen),
          first_seen: device.createdAt || device.created_at,
          session_count: activeSessions.filter(s => s.device_id === device.device_id).length,
          recent_locations: device.ip_addresses ? 
            device.ip_addresses.slice(-3).map(ip => `${ip.city || 'Unknown'}, ${ip.country || 'Unknown'}`) : 
            [],
          recent_activity: recentActivity.map(activity => ({
            action: activity.action,
            timestamp: activity.timestamp,
            formatted_time: securityController.formatTimeAgo(activity.timestamp)
          })),
          risk_level: securityController.assessDeviceRisk(device, fullUser)
        };
      });

      // Sort by last seen (most recent first)
      deviceInfo.sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen));

      res.status(200).json({
        success: true,
        message: "Device information retrieved successfully",
        data: {
          devices: deviceInfo,
          summary: {
            total_devices: devices.length,
            active_devices: deviceInfo.filter(d => d.is_current).length,
            trusted_devices: deviceInfo.filter(d => d.is_trusted).length,
            high_risk_devices: deviceInfo.filter(d => d.risk_level === 'high').length
          }
        }
      });

    } catch (error) {
      logger.error("Get devices error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: "Internal server error retrieving device information",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/v1/security/devices/:deviceId/trust
 * @desc    Mark a device as trusted or untrusted
 * @access  Private (Authenticated users)
 * @param   {string} deviceId - The ID of the device to update
 * @body    {boolean} trusted - Whether to trust the device
 */
router.post(
  "/devices/:deviceId/trust",
  authenticateToken,
  [
    param("deviceId")
      .isLength({ min: 1 })
      .withMessage("Device ID is required"),
    body("trusted")
      .isBoolean()
      .withMessage("Trusted must be a boolean value")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const user = req.user;
      const { deviceId } = req.params;
      const { trusted } = req.body;
      
      const fullUser = await User.findById(user.id);
      if (!fullUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const device = fullUser.devices.find(d => d.device_id === deviceId);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: "Device not found"
        });
      }

      device.is_trusted = trusted;
      await fullUser.save();

      // Log the device trust change
      await fullUser.logActivity("device_trust_changed", null, {
        device_id: deviceId,
        trusted: trusted,
        change_time: new Date()
      }, {
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        security_event: true
      });

      res.status(200).json({
        success: true,
        message: `Device ${trusted ? 'trusted' : 'untrusted'} successfully`,
        data: {
          device_id: deviceId,
          trusted: trusted
        }
      });

    } catch (error) {
      logger.error("Device trust update error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        deviceId: req.params.deviceId
      });
      
      res.status(500).json({
        success: false,
        message: "Internal server error updating device trust",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
);

// Error handling middleware for this router
router.use((error, req, res, next) => {
  logger.error("Security routes error:", {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  res.status(500).json({
    success: false,
    message: "Internal server error in security service",
    error: process.env.NODE_ENV === "development" ? error.message : undefined
  });
});

export default router; 