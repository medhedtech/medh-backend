import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { validationResult } from "express-validator";

import { ENV_VARS } from "../config/envVars.js";
import User, { USER_ROLES as ROLES, USER_PERMISSIONS as PERMISSIONS, USER_ADMIN_ROLES as ADMIN_ROLES } from "../models/user-modal.js";
import logger from "../utils/logger.js";
import dbUtils from "../utils/dbUtils.js";
import emailService from "../services/emailService.js";

class SalesSupportController {
  constructor() {
    this.activeTeamMembers = new Map();
  }

  /**
   * Specialized login for sales and support team members
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async teamLogin(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, password, team_type } = req.body;

      // Validate team type
      if (!team_type || !["sales", "support"].includes(team_type)) {
        return res.status(400).json({
          success: false,
          message: "Team type must be either 'sales' or 'support'",
        });
      }

      // Find user by email
      let user;
      try {
        user = await dbUtils.findOne(User, { email: email.toLowerCase() });
      } catch (dbError) {
        logger.error("Database error during team login - user lookup", {
          error: dbError.message,
          email: email.toLowerCase(),
          team_type,
          stack: dbError.stack,
        });

        return res.status(500).json({
          success: false,
          message: "Internal server error during login",
          error: "Database connection issue. Please try again in a moment.",
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if user belongs to the specified team
      const expectedRole =
        team_type === "sales" ? ROLES.SALES_TEAM : ROLES.SUPPORT_TEAM;
      const expectedAdminRole =
        team_type === "sales"
          ? ADMIN_ROLES.SALES_ADMIN
          : ADMIN_ROLES.SUPPORT_ADMIN;

      const hasTeamRole =
        user.role &&
        ((Array.isArray(user.role) && user.role.includes(expectedRole)) ||
          user.role === expectedRole);

      const hasAdminRole = user.admin_role === expectedAdminRole;
      const hasSuperAdminRole = user.admin_role === ADMIN_ROLES.SUPER_ADMIN;

      if (!hasTeamRole && !hasAdminRole && !hasSuperAdminRole) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You must be a ${team_type} team member to access this login.`,
        });
      }

      // Check if account is locked
      if (user.is_locked) {
        return res.status(423).json({
          success: false,
          message: "Account is locked. Please contact your administrator.",
        });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if MFA is enabled
      if (user.two_factor_enabled) {
        return res.status(200).json({
          success: true,
          message:
            "Credentials verified. Please provide your two-factor authentication code.",
          requires_mfa: true,
          mfa_method: user.two_factor_method,
          data: {
            user_id: user._id.toString(),
            team_type,
            temp_session: true,
            phone_hint:
              user.two_factor_method === "sms" && user.two_factor_phone
                ? `***-***-${user.two_factor_phone.slice(-4)}`
                : null,
          },
        });
      }

      // Complete login process
      await this.completeTeamLogin(user, team_type, req, res);
    } catch (error) {
      logger.error("Team login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during login",
        error: error.message,
      });
    }
  }

  /**
   * Complete team login process
   * @param {Object} user - User object
   * @param {string} team_type - Type of team (sales/support)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async completeTeamLogin(user, team_type, req, res) {
    try {
      // Extract device and location information
      const deviceInfo = this.extractDeviceInfo(req);
      const locationInfo = this.extractLocationInfo(req);

      // Create session
      const sessionId = crypto.randomBytes(32).toString("hex");
      const sessionData = {
        session_id: sessionId,
        device_id: deviceInfo.device_id,
        ip_address: deviceInfo.ip_address,
        user_agent: req.headers["user-agent"],
        geolocation: locationInfo,
      };

      await user.createSession(sessionData);

      // Update user statistics
      user.last_login = new Date();
      user.statistics.engagement.last_active_date = new Date();
      user.statistics.engagement.total_logins += 1;

      try {
        await dbUtils.save(user);
      } catch (dbError) {
        logger.error(
          "Database error during team login - user statistics save",
          {
            error: dbError.message,
            userId: user._id,
          },
        );
      }

      // Log login activity
      await user.logActivity(
        "login",
        null,
        {
          login_method: "team_login",
          team_type,
          session_id: sessionId,
        },
        {
          ip_address: deviceInfo.ip_address,
          device_type: deviceInfo.device_type,
          browser: deviceInfo.browser,
          operating_system: deviceInfo.operating_system,
          geolocation: locationInfo,
        },
      );

      // Generate JWT token
      const token = this.generateTeamJWT(user, team_type);

      // Track active team member
      this.activeTeamMembers.set(user._id.toString(), {
        user_id: user._id,
        team_type,
        session_id: sessionId,
        login_time: new Date(),
        device_info: deviceInfo,
        location_info: locationInfo,
      });

      // Send login notification email if from new device
      if (this.isNewDevice(user, deviceInfo)) {
        this.sendTeamLoginNotification(
          user,
          deviceInfo,
          locationInfo,
          team_type,
        );
      }

      // Determine permissions based on role
      const permissions = this.getTeamPermissions(user, team_type);

      return res.status(200).json({
        success: true,
        message: `${team_type.charAt(0).toUpperCase() + team_type.slice(1)} team login successful`,
        data: {
          user: {
            id: user._id,
            full_name: user.full_name,
            email: user.email,
            username: user.username,
            role: user.role,
            admin_role: user.admin_role,
            user_image: user.user_image,
            email_verified: user.email_verified,
            is_online: true,
            last_seen: user.last_seen,
            team_type,
            permissions,
          },
          token,
          session_id: sessionId,
          expires_in: "24h",
          team_type,
        },
      });
    } catch (error) {
      logger.error("Complete team login error:", error);
      throw error;
    }
  }

  /**
   * Generate JWT token for team members
   * @param {Object} user - User object
   * @param {string} team_type - Type of team (sales/support)
   * @returns {string} JWT token
   */
  generateTeamJWT(user, team_type) {
    return jwt.sign(
      {
        userId: user._id,
        id: user._id,
        email: user.email,
        role: user.role,
        admin_role: user.admin_role,
        team_type,
        type: "team_access",
      },
      ENV_VARS.JWT_SECRET_KEY,
      { expiresIn: "24h" },
    );
  }

  /**
   * Get team-specific permissions
   * @param {Object} user - User object
   * @param {string} team_type - Type of team (sales/support)
   * @returns {Array} Array of permissions
   */
  getTeamPermissions(user, team_type) {
    if (user.admin_role === ADMIN_ROLES.SUPER_ADMIN) {
      return Object.values(PERMISSIONS);
    }

    if (team_type === "sales") {
      if (user.admin_role === ADMIN_ROLES.SALES_ADMIN) {
        return [
          PERMISSIONS.SALES_DASHBOARD,
          PERMISSIONS.VIEW_LEADS,
          PERMISSIONS.MANAGE_LEADS,
          PERMISSIONS.VIEW_SALES_REPORTS,
          PERMISSIONS.MANAGE_QUOTES,
          PERMISSIONS.VIEW_CUSTOMER_DATA,
        ];
      }
      return [
        PERMISSIONS.SALES_DASHBOARD,
        PERMISSIONS.VIEW_LEADS,
        PERMISSIONS.VIEW_SALES_REPORTS,
        PERMISSIONS.VIEW_CUSTOMER_DATA,
      ];
    } else if (team_type === "support") {
      if (user.admin_role === ADMIN_ROLES.SUPPORT_ADMIN) {
        return [
          PERMISSIONS.SUPPORT_DASHBOARD,
          PERMISSIONS.VIEW_TICKETS,
          PERMISSIONS.MANAGE_TICKETS,
          PERMISSIONS.VIEW_SUPPORT_REPORTS,
          PERMISSIONS.MANAGE_FAQ,
          PERMISSIONS.VIEW_CUSTOMER_SUPPORT_DATA,
        ];
      }
      return [
        PERMISSIONS.SUPPORT_DASHBOARD,
        PERMISSIONS.VIEW_TICKETS,
        PERMISSIONS.VIEW_SUPPORT_REPORTS,
        PERMISSIONS.VIEW_CUSTOMER_SUPPORT_DATA,
      ];
    }

    return [];
  }

  /**
   * Extract device information from request
   * @param {Object} req - Express request object
   * @returns {Object} Device information
   */
  extractDeviceInfo(req) {
    const userAgent = req.headers["user-agent"] || "";
    const ip = req.ip || req.connection.remoteAddress || "unknown";

    // Simple device detection
    let deviceType = "desktop";
    if (/mobile/i.test(userAgent)) deviceType = "mobile";
    else if (/tablet/i.test(userAgent)) deviceType = "tablet";

    return {
      device_id: crypto
        .createHash("md5")
        .update(ip + userAgent)
        .digest("hex"),
      ip_address: ip,
      device_type: deviceType,
      browser: userAgent.split(" ").pop() || "unknown",
      operating_system: "unknown",
    };
  }

  /**
   * Extract location information from request
   * @param {Object} req - Express request object
   * @returns {Object} Location information
   */
  extractLocationInfo(req) {
    const ip = req.ip || req.connection.remoteAddress || "unknown";

    return {
      ip_address: ip,
      country: "unknown",
      region: "unknown",
      city: "unknown",
      timezone: "unknown",
    };
  }

  /**
   * Check if device is new for user
   * @param {Object} user - User object
   * @param {Object} deviceInfo - Device information
   * @returns {boolean} Whether device is new
   */
  isNewDevice(user, deviceInfo) {
    if (!user.login_analytics?.unique_devices) return true;
    return !user.login_analytics.unique_devices.includes(deviceInfo.device_id);
  }

  /**
   * Send team login notification email
   * @param {Object} user - User object
   * @param {Object} deviceInfo - Device information
   * @param {Object} locationInfo - Location information
   * @param {string} team_type - Type of team (sales/support)
   */
  async sendTeamLoginNotification(user, deviceInfo, locationInfo, team_type) {
    try {
      await emailService.sendTeamLoginNotification(
        user.email,
        user.full_name,
        deviceInfo,
        locationInfo,
        team_type,
      );
    } catch (error) {
      logger.error("Failed to send team login notification", {
        error: error.message,
        userId: user._id,
        team_type,
      });
    }
  }

  /**
   * Get team dashboard statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTeamDashboardStats(req, res) {
    try {
      const { team_type } = req.params;

      if (!["sales", "support"].includes(team_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid team type",
        });
      }

      // Get team members count
      const teamRole =
        team_type === "sales" ? ROLES.SALES_TEAM : ROLES.SUPPORT_TEAM;
      const adminRole =
        team_type === "sales"
          ? ADMIN_ROLES.SALES_ADMIN
          : ADMIN_ROLES.SUPPORT_ADMIN;

      const teamMembers = await User.countDocuments({
        $or: [
          { role: teamRole },
          { admin_role: adminRole },
          { admin_role: ADMIN_ROLES.SUPER_ADMIN },
        ],
        is_active: true,
      });

      // Get active team members
      const activeTeamMembers = this.activeTeamMembers.size;

      // Get recent logins (last 24 hours)
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentLogins = await User.countDocuments({
        $or: [
          { role: teamRole },
          { admin_role: adminRole },
          { admin_role: ADMIN_ROLES.SUPER_ADMIN },
        ],
        last_login: { $gte: last24Hours },
      });

      return res.status(200).json({
        success: true,
        message: `${team_type.charAt(0).toUpperCase() + team_type.slice(1)} team dashboard statistics`,
        data: {
          team_type,
          total_team_members: teamMembers,
          active_team_members: activeTeamMembers,
          recent_logins_24h: recentLogins,
          dashboard_type: `${team_type}_dashboard`,
        },
      });
    } catch (error) {
      logger.error("Error getting team dashboard stats:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving dashboard statistics",
        error: error.message,
      });
    }
  }

  /**
   * Get all team members
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTeamMembers(req, res) {
    try {
      const { team_type } = req.params;

      if (!["sales", "support"].includes(team_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid team type",
        });
      }

      const teamRole =
        team_type === "sales" ? ROLES.SALES_TEAM : ROLES.SUPPORT_TEAM;
      const adminRole =
        team_type === "sales"
          ? ADMIN_ROLES.SALES_ADMIN
          : ADMIN_ROLES.SUPPORT_ADMIN;

      const teamMembers = await User.find({
        $or: [
          { role: teamRole },
          { admin_role: adminRole },
          { admin_role: ADMIN_ROLES.SUPER_ADMIN },
        ],
        is_active: true,
      }).select("-password -resetPasswordToken -resetPasswordExpires");

      return res.status(200).json({
        success: true,
        message: `${team_type.charAt(0).toUpperCase() + team_type.slice(1)} team members retrieved`,
        data: {
          team_type,
          members: teamMembers,
          total_count: teamMembers.length,
        },
      });
    } catch (error) {
      logger.error("Error getting team members:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving team members",
        error: error.message,
      });
    }
  }

  /**
   * Logout team member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async teamLogout(req, res) {
    try {
      const { session_id } = req.body;
      const userId = req.user.id;

      // Remove from active team members
      this.activeTeamMembers.delete(userId);

      // Update user session
      const user = await User.findById(userId);
      if (user) {
        await user.endSession(session_id);
        user.is_online = false;
        user.last_seen = new Date();
        await user.save();

        // Log logout activity
        await user.logActivity("logout", null, {
          session_id,
          logout_method: "team_logout",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Team logout successful",
      });
    } catch (error) {
      logger.error("Team logout error:", error);
      res.status(500).json({
        success: false,
        message: "Error during logout",
        error: error.message,
      });
    }
  }
}

export default new SalesSupportController();
