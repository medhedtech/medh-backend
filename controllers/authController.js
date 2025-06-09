import crypto from "crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { ENV_VARS } from "../config/envVars.js";
import User, {
  USER_ROLES,
  USER_PERMISSIONS,
  USER_ADMIN_ROLES,
} from "../models/user-modal.js";
import emailService from "../services/emailService.js";
import logger from "../utils/logger.js";
import userValidation from "../validations/userValidation.js";
import jwtUtils from "../utils/jwt.js";

/**
 * Generate a random 6-digit OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Authentication Controller Class
 */
class AuthController {
  /**
   * Register a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async registerUser(req, res) {
    try {
      // Validate request body
      const { error, value } = userValidation.validate(req.body);

      if (error) {
        logger.auth.warn("Validation error during registration", {
          error: error.details[0].message,
          requestBody: req.body,
        });
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const {
        full_name,
        email,
        phone_numbers,
        password = "",
        agree_terms,
        meta = { gender: "Male", upload_resume: [] },
        role = [USER_ROLES.STUDENT],
      } = value;

      // Normalize email to lowercase for case-insensitive handling
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        logger.auth.warn("Registration attempt with existing email", { email: normalizedEmail });
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Generate OTP for email verification
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // OTP valid for 15 minutes

      // Create user with specified role or default student role
      const user = new User({
        full_name,
        email: normalizedEmail,
        phone_numbers,
        password,
        agree_terms,
        role: role,
        status: "Inactive", // User starts as inactive until email is verified
        meta: meta || {
          gender: "Male",
          upload_resume: [],
          age: "",
          age_group: "",
          category: "",
        },
        assign_department: [],
        permissions: [],
        emailVerified: false,
        emailVerificationOTP: otp,
        emailVerificationOTPExpires: otpExpiry,
      });

      // Hash the password before saving
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      logger.auth.debug("User prepared for registration", {
        email,
        role: user.role,
        status: user.status,
      });

      // Save the user to database
      await user.save();

      logger.auth.info("User registered successfully", {
        userId: user._id,
        email: normalizedEmail,
      });

      // Send OTP verification email to the user
      try {
        await emailService.sendOTPVerificationEmail(normalizedEmail, full_name, otp);
      } catch (emailError) {
        logger.auth.error("OTP verification email sending failed", {
          error: emailError,
          email: normalizedEmail,
        });
        // Continue registration even if email sending fails
      }

      return res.status(201).json({
        success: true,
        message: "User registered successfully. Please verify your email with the OTP sent.",
        data: {
          id: user._id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      });
    } catch (err) {
      logger.auth.error("Registration failed", {
        error: err,
        stack: err.stack,
      });
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }

  /**
   * Verify email with OTP
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyEmailOTP(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: "Email and OTP are required",
        });
      }

      // Normalize email to lowercase for case-insensitive handling
      const normalizedEmail = email.toLowerCase().trim();

      // Find user by email
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if OTP is valid and not expired
      if (
        user.emailVerificationOTP !== otp ||
        Date.now() > user.emailVerificationOTPExpires
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP",
        });
      }

      // Update user verification status
      user.emailVerified = true;
      user.status = "Active";
      user.emailVerificationOTP = undefined;
      user.emailVerificationOTPExpires = undefined;
      await user.save();

      // Send welcome email to the user
      try {
        await emailService.sendWelcomeEmail(normalizedEmail, user.full_name, {});
      } catch (emailError) {
        logger.auth.error("Welcome email sending failed", {
          error: emailError,
          email: normalizedEmail,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (err) {
      logger.auth.error("Email verification failed", {
        error: err,
        stack: err.stack,
      });
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }

  /**
   * Resend OTP for email verification
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resendVerificationOTP(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      // Normalize email to lowercase for case-insensitive handling
      const normalizedEmail = email.toLowerCase().trim();

      // Find user by email
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if email is already verified
      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      // Generate new OTP
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // OTP valid for 15 minutes

      // Update user with new OTP
      user.emailVerificationOTP = otp;
      user.emailVerificationOTPExpires = otpExpiry;
      await user.save();

      // Send new OTP verification email
      try {
        await emailService.sendOTPVerificationEmail(normalizedEmail, user.full_name, otp);
      } catch (emailError) {
        logger.auth.error("OTP verification email sending failed", {
          error: emailError,
          email: normalizedEmail,
        });
        return res.status(500).json({
          success: false,
          message: "Failed to send verification email",
        });
      }

      return res.status(200).json({
        success: true,
        message: "New verification OTP sent successfully",
      });
    } catch (err) {
      logger.auth.error("Resend verification OTP failed", {
        error: err,
        stack: err.stack,
      });
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }

  /**
   * Login a user and generate access + refresh tokens
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async loginUser(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // Normalize email to lowercase for case-insensitive handling
      const normalizedEmail = email.toLowerCase().trim();

      // Find user by email
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        logger.auth.warn("Login attempt with non-existent email", { email: normalizedEmail });
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if user is active
      if (user.status !== "Active") {
        logger.auth.warn("Login attempt with inactive account", { 
          userId: user._id, 
          email: normalizedEmail, 
          status: user.status 
        });
        return res.status(401).json({
          success: false,
          message: "Account is not active. Please contact support.",
        });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logger.auth.warn("Login attempt with invalid password", { 
          userId: user._id, 
          email: normalizedEmail 
        });
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Extract login metadata for analytics
      const loginMetadata = {
        ip_address: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                   (req.connection.socket ? req.connection.socket.remoteAddress : null),
        user_agent: req.headers['user-agent'] || 'Unknown',
        timestamp: new Date(),
        device_info: this.extractDeviceInfo(req.headers['user-agent']),
        location: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        session_id: crypto.randomBytes(16).toString('hex'),
      };

      // Update login statistics and tracking
      await this.updateLoginStatistics(user, loginMetadata);

      // Generate tokens
      const accessToken = jwtUtils.generateAccessToken(user);
      const refreshToken = await jwtUtils.generateRefreshToken(user);
      
      // Log successful login with comprehensive details
      logger.auth.info("User logged in successfully", { 
        userId: user._id, 
        email: normalizedEmail, 
        role: user.role,
        loginCount: user.login_count,
        lastLogin: user.last_login,
        ipAddress: loginMetadata.ip_address,
        userAgent: loginMetadata.user_agent,
        deviceInfo: loginMetadata.device_info
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          id: user._id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          permissions: user.permissions,
          access_token: accessToken,
          refresh_token: refreshToken,
          login_stats: {
            login_count: user.login_count,
            last_login: user.last_login,
            session_id: loginMetadata.session_id,
          },
        },
      });
    } catch (err) {
      logger.auth.error("Login error", { 
        error: err.message, 
        stack: err.stack 
      });
      return res.status(500).json({
        success: false,
        message: "Server error during login",
        error: err.message,
      });
    }
  }

  /**
   * Extract device information from user agent
   * @param {string} userAgent - User agent string
   * @returns {Object} Device information
   */
  extractDeviceInfo(userAgent) {
    if (!userAgent) return { type: 'Unknown', browser: 'Unknown', os: 'Unknown' };

    const deviceInfo = {
      type: 'Desktop',
      browser: 'Unknown',
      os: 'Unknown',
      is_mobile: false,
      is_tablet: false,
    };

    // Detect device type
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      deviceInfo.is_mobile = true;
      deviceInfo.type = 'Mobile';
    }
    if (/iPad|Android(?!.*Mobile)/i.test(userAgent)) {
      deviceInfo.is_tablet = true;
      deviceInfo.type = 'Tablet';
    }

    // Detect browser
    if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox';
    else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari';
    else if (userAgent.includes('Edge')) deviceInfo.browser = 'Edge';
    else if (userAgent.includes('Opera')) deviceInfo.browser = 'Opera';

    // Detect OS
    if (userAgent.includes('Windows')) deviceInfo.os = 'Windows';
    else if (userAgent.includes('Mac OS')) deviceInfo.os = 'macOS';
    else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux';
    else if (userAgent.includes('Android')) deviceInfo.os = 'Android';
    else if (userAgent.includes('iOS')) deviceInfo.os = 'iOS';

    return deviceInfo;
  }

  /**
   * Update user login statistics and tracking
   * @param {Object} user - User document
   * @param {Object} loginMetadata - Login metadata
   */
  async updateLoginStatistics(user, loginMetadata) {
    try {
      // Calculate time since last login
      const now = new Date();
      const timeSinceLastLogin = user.last_login ? 
        Math.floor((now - user.last_login) / (1000 * 60 * 60 * 24)) : null; // days

      // Initialize login history if it doesn't exist
      if (!user.login_history) {
        user.login_history = [];
      }

      // Add current login to history (keep last 50 logins)
      const loginRecord = {
        timestamp: now,
        ip_address: loginMetadata.ip_address,
        user_agent: loginMetadata.user_agent,
        device_info: loginMetadata.device_info,
        session_id: loginMetadata.session_id,
        days_since_last_login: timeSinceLastLogin,
      };

      user.login_history.unshift(loginRecord);
      if (user.login_history.length > 50) {
        user.login_history = user.login_history.slice(0, 50);
      }

      // Update basic login statistics
      user.login_count = (user.login_count || 0) + 1;
      user.last_login = now;

      // Update login analytics
      if (!user.login_analytics) {
        user.login_analytics = {
          first_login: now,
          total_sessions: 0,
          unique_devices: [],
          unique_ips: [],
          login_frequency: {
            daily: 0,
            weekly: 0,
            monthly: 0,
          },
          device_stats: {
            mobile: 0,
            tablet: 0,
            desktop: 0,
          },
          browser_stats: {},
          os_stats: {},
        };
      }

      // Update analytics
      user.login_analytics.total_sessions += 1;

      // Track unique devices (by user agent hash)
      const deviceHash = crypto.createHash('md5').update(loginMetadata.user_agent).digest('hex');
      if (!user.login_analytics.unique_devices.includes(deviceHash)) {
        user.login_analytics.unique_devices.push(deviceHash);
        // Keep only last 20 unique devices
        if (user.login_analytics.unique_devices.length > 20) {
          user.login_analytics.unique_devices = user.login_analytics.unique_devices.slice(-20);
        }
      }

      // Track unique IPs
      if (loginMetadata.ip_address && !user.login_analytics.unique_ips.includes(loginMetadata.ip_address)) {
        user.login_analytics.unique_ips.push(loginMetadata.ip_address);
        // Keep only last 20 unique IPs
        if (user.login_analytics.unique_ips.length > 20) {
          user.login_analytics.unique_ips = user.login_analytics.unique_ips.slice(-20);
        }
      }

      // Update device statistics
      if (loginMetadata.device_info.is_mobile) {
        user.login_analytics.device_stats.mobile += 1;
      } else if (loginMetadata.device_info.is_tablet) {
        user.login_analytics.device_stats.tablet += 1;
      } else {
        user.login_analytics.device_stats.desktop += 1;
      }

      // Update browser statistics
      const browser = loginMetadata.device_info.browser;
      user.login_analytics.browser_stats[browser] = (user.login_analytics.browser_stats[browser] || 0) + 1;

      // Update OS statistics
      const os = loginMetadata.device_info.os;
      user.login_analytics.os_stats[os] = (user.login_analytics.os_stats[os] || 0) + 1;

      // Update login frequency (calculate based on login history)
      this.updateLoginFrequency(user);

      // Save user with updated statistics
      await user.save();

      logger.auth.debug("Login statistics updated", {
        userId: user._id,
        loginCount: user.login_count,
        totalSessions: user.login_analytics.total_sessions,
        uniqueDevices: user.login_analytics.unique_devices.length,
        uniqueIPs: user.login_analytics.unique_ips.length,
      });

    } catch (error) {
      logger.auth.error("Error updating login statistics", {
        userId: user._id,
        error: error.message,
        stack: error.stack,
      });
      // Don't throw error to prevent login failure due to analytics issues
    }
  }

  /**
   * Update login frequency analytics
   * @param {Object} user - User document
   */
  updateLoginFrequency(user) {
    if (!user.login_history || user.login_history.length === 0) return;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Count logins in different time periods
    user.login_analytics.login_frequency.daily = user.login_history.filter(
      login => new Date(login.timestamp) >= oneDayAgo
    ).length;

    user.login_analytics.login_frequency.weekly = user.login_history.filter(
      login => new Date(login.timestamp) >= oneWeekAgo
    ).length;

    user.login_analytics.login_frequency.monthly = user.login_history.filter(
      login => new Date(login.timestamp) >= oneMonthAgo
    ).length;
  }

  /**
   * Refresh an access token using a refresh token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async refreshToken(req, res) {
    try {
      // Extract refresh token from multiple possible sources
      let refresh_token = req.body.refresh_token || 
                         req.body.refreshToken || 
                         req.body.refresh_token || 
                         req.headers['x-refresh-token'];

      // Log the request details for debugging
      logger.auth.debug("Refresh token request received", {
        bodyKeys: Object.keys(req.body || {}),
        hasRefreshToken: !!refresh_token,
        bodyContent: req.body,
        headers: {
          contentType: req.headers['content-type'],
          authorization: req.headers.authorization ? 'present' : 'missing',
          xRefreshToken: req.headers['x-refresh-token'] ? 'present' : 'missing'
        },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Check if refresh token exists
      if (!refresh_token) {
        logger.auth.warn("Refresh token missing from request", {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          bodyKeys: Object.keys(req.body || {}),
          requestBody: req.body
        });
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
          error_code: "MISSING_REFRESH_TOKEN",
          hint: "Include refresh_token in request body or x-refresh-token header",
          received: {
            bodyKeys: Object.keys(req.body || {}),
            hasBody: !!req.body
          }
        });
      }
      
      // Validate refresh token format
      if (typeof refresh_token !== 'string' || refresh_token.length < 10) {
        logger.auth.warn("Invalid refresh token format", {
          tokenType: typeof refresh_token,
          tokenLength: refresh_token ? refresh_token.length : 0,
          ip: req.ip
        });
        return res.status(400).json({
          success: false,
          message: "Invalid refresh token format",
          error_code: "INVALID_REFRESH_TOKEN_FORMAT"
        });
      }
      
      // Get user by ID function for token refresh
      const getUserById = async (userId) => {
        try {
          const user = await User.findById(userId);
          if (!user) {
            logger.auth.warn("User not found during token refresh", { userId });
          }
          return user;
        } catch (error) {
          logger.auth.error("Error fetching user during token refresh", { 
            userId, 
            error: error.message 
          });
          return null;
        }
      };
      
      logger.auth.debug("Attempting token refresh", {
        tokenPrefix: refresh_token.substr(0, 20) + '...',
        tokenLength: refresh_token.length
      });
      
      // Verify and refresh tokens
      const tokens = await jwtUtils.refreshAccessToken(refresh_token, getUserById);
      
      if (!tokens) {
        logger.auth.warn("Token refresh failed - invalid or expired refresh token", {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          tokenPrefix: refresh_token.substr(0, 20) + '...'
        });
        return res.status(401).json({
          success: false,
          message: "Invalid or expired refresh token",
          error_code: "INVALID_REFRESH_TOKEN",
          hint: "Please login again to get new tokens"
        });
      }
      
      logger.auth.info("Token refreshed successfully", {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken
        }
      });
    } catch (error) {
      logger.auth.error("Token refresh error", {
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestBody: req.body
      });
      return res.status(500).json({
        success: false,
        message: "Server error during token refresh",
        error_code: "TOKEN_REFRESH_SERVER_ERROR"
      });
    }
  }
  
  /**
   * Logout a user by invalidating their refresh token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async logout(req, res) {
    try {
      const { refresh_token } = req.body;
      
      if (!refresh_token) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required"
        });
      }
      
      // Revoke the refresh token
      const result = await jwtUtils.revokeRefreshToken(refresh_token);
      
      if (!result) {
        return res.status(400).json({
          success: false,
          message: "Invalid refresh token"
        });
      }
      
      logger.auth.info("User logged out successfully", {
        userId: req.user.id
      });
      
      return res.status(200).json({
        success: true,
        message: "Logged out successfully"
      });
    } catch (error) {
      logger.auth.error("Logout error", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      return res.status(500).json({
        success: false,
        message: "Server error during logout"
      });
    }
  }

  /**
   * Get all users with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        role,
        status,
        admin_role,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Build query based on filters
      const query = {};

      if (role) query.role = role;
      if (status) query.status = status;
      if (admin_role) query.admin_role = admin_role;

      // Search by name or email if search parameter is provided
      if (search) {
        query.$or = [
          { full_name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;

      // Execute query with pagination and sorting
      const users = await User.find(query)
        .select("-password")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const total = await User.countDocuments(query);

      return res.status(200).json({
        success: true,
        count: users.length,
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        data: users,
      });
    } catch (err) {
      logger.error("Error getting all users:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }

  /**
   * Get all users with the STUDENT role with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllStudents(req, res) {
    try {
      const {
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Build query - only active students with student or corporate-student roles
      const query = { 
        role: { $in: [USER_ROLES.STUDENT, "coorporate-student"] },
        status: "Active"
      };

      // Search by name or email if search parameter is provided
      if (search) {
        query.$or = [
          { full_name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;

      // Execute query without pagination - get all active students
      const students = await User.find(query)
        .select("-password")
        .populate({
          path: 'assigned_instructor',
          select: 'full_name email role domain phone_numbers',
          match: { role: { $in: ['instructor'] } }
        })
        .sort(sort);

      if (!students || students.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No active students found",
        });
      }

      res.status(200).json({
        success: true,
        count: students.length,
        message: "All active students retrieved successfully",
        data: students,
      });
    } catch (err) {
      logger.error("Error fetching students:", err);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }

  /**
   * Get user by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserById(req, res) {
    try {
      const user = await User.findById(req.params.id).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      logger.error("Error getting user by ID:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }

  /**
   * Get user by email
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserByEmail(req, res) {
    try {
      const { email } = req.params;
      // Normalize email to lowercase for case-insensitive handling
      const normalizedEmail = email.toLowerCase().trim();
      const user = await User.findOne({ email: normalizedEmail }).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      logger.error("Error getting user by email:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }

  /**
   * Update a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateUser(req, res) {
    try {
      const userId = req.params.id;
      const updateData = req.body;

      // Prevent password update via this endpoint
      if (updateData.password) {
        delete updateData.password;
      }

      // Find user first to check if it exists
      const existingUser = await User.findById(userId);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Update user
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true },
      ).select("-password");

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: user,
      });
    } catch (err) {
      logger.error("Error updating user:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }

  /**
   * Update user by email
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateUserByEmail(req, res) {
    try {
      const { email } = req.params;
      const updateData = req.body;

      // Normalize email to lowercase for case-insensitive handling
      const normalizedEmail = email.toLowerCase().trim();

      // Prevent password update via this endpoint
      if (updateData.password) {
        delete updateData.password;
      }

      // Find user first to check if it exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Update user
      const user = await User.findOneAndUpdate(
        { email: normalizedEmail },
        { $set: updateData },
        { new: true, runValidators: true },
      ).select("-password");

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: user,
      });
    } catch (err) {
      logger.error("Error updating user by email:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }

  /**
   * Update user role
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role, admin_role } = req.body;

      // Validate role
      if (role && !Object.values(USER_ROLES).includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }

      // Validate admin role
      if (admin_role && !Object.values(USER_ADMIN_ROLES).includes(admin_role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid admin role",
        });
      }

      // Find user first to check if it exists
      const existingUser = await User.findById(id);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Update user role
      const updateData = {};
      if (role) updateData.role = [role];
      if (admin_role) updateData.admin_role = admin_role;

      const user = await User.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true },
      ).select("-password");

      return res.status(200).json({
        success: true,
        message: "User role updated successfully",
        data: user,
      });
    } catch (err) {
      logger.error("Error updating user role:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }

  /**
   * Update user permissions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateUserPermissions(req, res) {
    try {
      const { id } = req.params;
      const { permissions } = req.body;

      // Validate permissions
      if (permissions && !Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          message: "Permissions must be an array",
        });
      }

      // Check if all permissions are valid
      if (permissions) {
        const validPermissions = Object.values(USER_PERMISSIONS);
        const invalidPermissions = permissions.filter(
          (permission) => !validPermissions.includes(permission),
        );

        if (invalidPermissions.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid permissions",
            invalidPermissions,
          });
        }
      }

      // Find user first to check if it exists
      const existingUser = await User.findById(id);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Update user permissions
      const user = await User.findByIdAndUpdate(
        id,
        { $set: { permissions } },
        { new: true, runValidators: true },
      ).select("-password");

      return res.status(200).json({
        success: true,
        message: "User permissions updated successfully",
        data: user,
      });
    } catch (err) {
      logger.error("Error updating user permissions:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }

  /**
   * Delete a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteUser(req, res) {
    try {
      const user = await User.findByIdAndDelete(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (err) {
      logger.error("Error deleting user:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }

  /**
   * Toggle user status (Active/Inactive)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async toggleUserStatus(req, res) {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Toggle the status
      user.status = user.status === "Active" ? "Inactive" : "Active";
      await user.save();

      return res.status(200).json({
        success: true,
        message: `User status changed to ${user.status}`,
        data: user,
      });
    } catch (err) {
      logger.error("Error toggling user status:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }

  /**
   * Handle forgot password process
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Normalize email to lowercase for case-insensitive handling
      const normalizedEmail = email.toLowerCase().trim();

      // Find the user
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        logger.auth.warn("Forgot password attempt for non-existent user", {
          email: normalizedEmail,
        });
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(20).toString("hex");
      const resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      // Set token expiry time (1 hour)
      const resetPasswordExpires = Date.now() + 3600000; // 1 hour

      // Update user with reset token info
      user.resetPasswordToken = resetPasswordToken;
      user.resetPasswordExpires = resetPasswordExpires;
      await user.save();

      // Generate temporary password
      const tempPassword = crypto.randomBytes(4).toString("hex");

      // Hash the temporary password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(tempPassword, salt);

      // Update user password with temporary password
      user.password = hashedPassword;
      await user.save();

      // Send email with temporary password using the improved email service
      try {
        await emailService.sendPasswordResetEmail(
          normalizedEmail,
          user.full_name,
          tempPassword,
        );

        logger.auth.info("Password reset email sent", { email: normalizedEmail });
        return res.status(200).json({
          success: true,
          message: "Password reset email sent",
        });
      } catch (emailError) {
        logger.auth.error("Failed to send password reset email", {
          error: emailError,
          email: normalizedEmail,
        });
        return res.status(500).json({
          success: false,
          message: "Failed to send password reset email",
          error: emailError.message,
        });
      }
    } catch (err) {
      logger.auth.error("Forgot password process failed", {
        error: err,
        stack: err.stack,
      });
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }

  /**
   * Reset password using token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      // Validate input
      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: "Token and new password are required.",
        });
      }

      // Basic password validation (matches user model requirement)
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long.",
        });
      }

      // Hash the token received from the request to compare with the stored hash
      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      // Find user by hashed token and check expiry
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Password reset token is invalid or has expired.",
        });
      }

      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      // Clear the reset token fields
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      // Save the updated user
      await user.save();

      logger.info(`Password successfully reset for user: ${user.email}`);

      return res.status(200).json({
        success: true,
        message: "Password has been reset successfully.",
      });
    } catch (err) {
      logger.error("Error in reset password process:", err);
      return res.status(500).json({
        success: false,
        message: "Server error during password reset.",
        error: err.message,
      });
    }
  }

  /**
   * Change password for authenticated user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id; // Assuming middleware sets req.user

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password and new password are required.",
        });
      }

      // Basic password validation
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters long.",
        });
      }

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);

      // Save the updated user
      await user.save();

      logger.info(`Password successfully changed for user: ${user.email}`);

      return res.status(200).json({
        success: true,
        message: "Password has been changed successfully.",
      });
    } catch (err) {
      logger.error("Error in change password process:", err);
      return res.status(500).json({
        success: false,
        message: "Server error during password change.",
        error: err.message,
      });
    }
  }
}

// Create and export controller instance
const authController = new AuthController();
export default authController;
