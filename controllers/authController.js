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
import dbUtils from "../utils/dbUtils.js";
import { validationResult } from "express-validator";
import nodemailer from "nodemailer";
import geoip from "geoip-lite";
import { UAParser } from "ua-parser-js";

class AuthController {
  constructor() {
    this.activeUsers = new Map();
    this.sessionStore = new Map();
  }

  /**
   * Toggle user active status (true/false)
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

      // Toggle the active status
      user.is_active = !user.is_active;
      await user.save();

      return res.status(200).json({
        success: true,
        message: `User status changed to ${user.is_active ? "active" : "inactive"}`,
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
      user.password_reset_token = resetPasswordToken;
      user.password_reset_expires = resetPasswordExpires;
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

        logger.auth.info("Password reset email sent", {
          email: normalizedEmail,
        });
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

      // First, try to find user by temporary password verification token
      let user = await User.findOne({
        temp_password_verification_token: token,
        temp_password_verification_expires: { $gt: Date.now() },
        temp_password_verified: true,
      });

      // If not found, try the original reset token method (for backward compatibility)
      if (!user) {
        const hashedToken = crypto
          .createHash("sha256")
          .update(token)
          .digest("hex");

        user = await User.findOne({
          password_reset_token: hashedToken,
          password_reset_expires: { $gt: Date.now() },
        });
      }

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Password reset token is invalid or has expired.",
        });
      }

      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      // Clear the reset token fields and temp password verification fields
      user.password_reset_token = undefined;
      user.password_reset_expires = undefined;
      user.temp_password_verified = false;
      user.temp_password_verification_token = undefined;
      user.temp_password_verification_expires = undefined;

      // Reset failed login attempts and unlock account
      user.failed_login_attempts = 0;
      user.account_locked_until = undefined;

      // Save the updated user
      await user.save();

      // Log password reset activity
      await user.logActivity("password_reset", null, {
        reset_time: new Date(),
        reset_method: user.temp_password_verified
          ? "temp_password_verification"
          : "email_token",
      });

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
   * Verify temporary password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyTempPassword(req, res) {
    try {
      const { email, tempPassword } = req.body;

      // Validate input
      if (!email || !tempPassword) {
        return res.status(400).json({
          success: false,
          message: "Email and temporary password are required.",
          errors: {
            email: !email ? "Email is required" : null,
            tempPassword: !tempPassword
              ? "Temporary password is required"
              : null,
          },
        });
      }

      // Normalize email to lowercase for case-insensitive handling
      const normalizedEmail = email.toLowerCase().trim();

      // Find the user
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        logger.auth.warn(
          "Temp password verification attempt for non-existent user",
          {
            email: normalizedEmail,
          },
        );
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if user has an active reset token (indicating they requested password reset)
      if (
        !user.password_reset_token ||
        !user.password_reset_expires ||
        user.password_reset_expires <= Date.now()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No valid password reset request found. Please request a new password reset.",
        });
      }

      // Check if account is locked using improved logic
      const lockStatus = this.isAccountLocked(user);
      if (lockStatus.isLocked) {
        return res.status(423).json({
          success: false,
          message: `Account is temporarily locked due to multiple failed attempts. Please try again after ${lockStatus.remainingTimeFormatted}.`,
          lockout_info: {
            locked_until: lockStatus.lockedUntil,
            remaining_time: lockStatus.remainingTimeFormatted,
            remaining_minutes: lockStatus.remainingMinutes,
            lockout_reason: lockStatus.lockoutReason,
          },
        });
      }

      // If lockout period has expired, reset fields
      if (lockStatus.needsReset) {
        await this.resetLockoutFields(user);
      }

      // Debug logging for password verification
      logger.auth.debug("Starting password verification", {
        email: normalizedEmail,
        tempPasswordLength: tempPassword.length,
        hasPasswordHash: !!user.password,
        passwordHashPrefix: user.password
          ? user.password.substring(0, 20)
          : "none",
      });

      // Verify the temporary password
      const isMatch = await bcrypt.compare(tempPassword, user.password);

      logger.auth.debug("Password verification result", {
        email: normalizedEmail,
        isMatch: isMatch,
        tempPassword: tempPassword, // Only for debugging, remove in production
      });

      if (!isMatch) {
        try {
          const attemptResult = await this.incrementFailedAttempts(
            user,
            "temp_password",
          );

          if (attemptResult.shouldReturnError) {
            if (attemptResult.isLocked) {
              logger.auth.warn(
                "Account locked due to failed temp password attempts",
                {
                  email: normalizedEmail,
                  attempts: attemptResult.attempts,
                  lockout_duration_minutes:
                    attemptResult.lockInfo.remainingMinutes,
                },
              );

              return res.status(423).json({
                success: false,
                message: `Account temporarily locked due to multiple failed attempts. Please try again after ${attemptResult.lockInfo.remainingMinutes} minute(s).`,
                lockout_info: {
                  locked_until: attemptResult.lockInfo.lockedUntil,
                  remaining_time: attemptResult.lockInfo.remainingTimeFormatted,
                  remaining_minutes: attemptResult.lockInfo.remainingMinutes,
                  lockout_reason: attemptResult.lockInfo.lockoutReason,
                },
              });
            } else {
              logger.auth.warn("Failed temp password verification", {
                email: normalizedEmail,
                attempts: attemptResult.attempts,
                remaining_attempts: attemptResult.remainingAttempts,
              });

              return res.status(401).json({
                success: false,
                message: "Incorrect temporary password",
                attempts_info: {
                  failed_attempts: attemptResult.attempts,
                  remaining_attempts: attemptResult.remainingAttempts,
                  warning:
                    attemptResult.remainingAttempts <= 1
                      ? "Account will be locked after next failed attempt"
                      : null,
                },
              });
            }
          }
        } catch (error) {
          logger.auth.error(
            "Error handling failed temp password verification",
            {
              error: error.message,
              email: normalizedEmail,
              stack: error.stack,
            },
          );

          return res.status(500).json({
            success: false,
            message: "Server error during verification",
            error:
              process.env.NODE_ENV === "development"
                ? error.message
                : "Internal server error",
          });
        }
      }

      // Temporary password is correct - reset failed attempts and prepare for password change
      await this.resetLockoutFields(user);

      // Generate a temporary verification token for password reset
      const verificationToken = crypto.randomBytes(32).toString("hex");
      user.temp_password_verified = true;
      user.temp_password_verification_token = verificationToken;
      user.temp_password_verification_expires = Date.now() + 15 * 60 * 1000; // 15 minutes

      await user.save();

      // Log successful verification
      await user.logActivity(
        "temp_password_verified",
        null,
        {
          verification_time: new Date(),
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
          verification_token: verificationToken,
        },
        {
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
          device_type: this.extractDeviceInfo(req).device_type,
          geolocation: this.extractLocationInfo(req),
        },
      );

      logger.auth.info("Temporary password verified successfully", {
        email: normalizedEmail,
        verification_token: verificationToken,
      });

      return res.status(200).json({
        success: true,
        message:
          "Temporary password verified successfully. You can now set a new password.",
        data: {
          verification_token: verificationToken,
          expires_in_minutes: 15,
          next_step:
            "Use this token to set a new password via /reset-password endpoint",
        },
      });
    } catch (err) {
      logger.auth.error("Temp password verification process failed", {
        error: err,
        stack: err.stack,
      });
      return res.status(500).json({
        success: false,
        message: "Server error during temporary password verification",
        error:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Internal server error",
      });
    }
  }

  /**
   * Change password for authenticated user
   * Enhanced with better security, validation, and notifications
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async changePassword(req, res) {
    try {
      const {
        currentPassword,
        newPassword,
        confirmPassword,
        invalidateAllSessions = false,
      } = req.body;
      const userId = req.user.id;

      // Input validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message:
            "Current password, new password, and password confirmation are required.",
          errors: {
            currentPassword: !currentPassword
              ? "Current password is required"
              : null,
            newPassword: !newPassword ? "New password is required" : null,
            confirmPassword: !confirmPassword
              ? "Password confirmation is required"
              : null,
          },
        });
      }

      // Password confirmation validation
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "New password and confirmation do not match.",
          errors: {
            confirmPassword: "Password confirmation does not match",
          },
        });
      }

      // Enhanced password validation
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Password does not meet security requirements.",
          errors: {
            newPassword: passwordValidation.errors,
          },
          requirements: passwordValidation.requirements,
        });
      }

      // Find user with retry logic for database issues
      // Use the same method as login to ensure consistency
      let user;
      try {
        user = await User.findById(userId);
        if (!user) {
          // Fallback: try finding by email from token
          const tokenUser = await User.findById(req.user.id);
          user = tokenUser;
        }
      } catch (dbError) {
        logger.error("Database error during password change - user lookup", {
          error: dbError.message,
          userId,
          stack: dbError.stack,
        });

        return res.status(500).json({
          success: false,
          message: "Database connection issue. Please try again in a moment.",
          error: "Database temporarily unavailable",
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if account is locked using improved logic
      const lockStatus = this.isAccountLocked(user);
      if (lockStatus.isLocked) {
        return res.status(423).json({
          success: false,
          message: `Account is temporarily locked. Please try again after ${lockStatus.remainingTimeFormatted}.`,
          lockout_info: {
            locked_until: lockStatus.lockedUntil,
            remaining_time: lockStatus.remainingTimeFormatted,
            remaining_minutes: lockStatus.remainingMinutes,
            lockout_reason: lockStatus.lockoutReason,
          },
        });
      }

      // If lockout period has expired, reset fields
      if (lockStatus.needsReset) {
        await this.resetLockoutFields(user);
      }

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);

      if (!isMatch) {
        try {
          const attemptResult = await this.incrementFailedAttempts(
            user,
            "password_change",
          );

          if (attemptResult.shouldReturnError) {
            if (attemptResult.isLocked) {
              logger.warn(
                "Account locked due to multiple failed password change attempts",
                {
                  userId: user._id,
                  email: user.email,
                  attempts: attemptResult.attempts,
                  lockoutDurationMinutes:
                    attemptResult.lockInfo.remainingMinutes,
                },
              );

              return res.status(423).json({
                success: false,
                message: `Account temporarily locked due to multiple failed password change attempts. Please try again after ${attemptResult.lockInfo.remainingMinutes} minute(s).`,
                lockout_info: {
                  locked_until: attemptResult.lockInfo.lockedUntil,
                  remaining_time: attemptResult.lockInfo.remainingTimeFormatted,
                  remaining_minutes: attemptResult.lockInfo.remainingMinutes,
                  lockout_reason: attemptResult.lockInfo.lockoutReason,
                },
              });
            } else {
              return res.status(400).json({
                success: false,
                message: "Current password is incorrect",
                attempts_info: {
                  failed_attempts: attemptResult.attempts,
                  remaining_attempts: attemptResult.remainingAttempts,
                  warning:
                    attemptResult.remainingAttempts <= 1
                      ? "Account will be locked after next failed attempt"
                      : null,
                },
              });
            }
          }
        } catch (dbError) {
          logger.error(
            "Database error handling failed password change attempt",
            {
              error: dbError.message,
              userId,
              stack: dbError.stack,
            },
          );

          return res.status(400).json({
            success: false,
            message: "Current password is incorrect",
          });
        }
      }

      // Check if new password is the same as current
      const isSamePassword = await user.comparePassword(newPassword);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: "New password cannot be the same as your current password.",
          errors: {
            newPassword: "Password must be different from current password",
          },
        });
      }

      // Store old password hash for audit purposes (optional security measure)
      const oldPasswordHash = user.password;

      // Hash the new password with stronger salt rounds
      const salt = await bcrypt.genSalt(12);
      user.password = await bcrypt.hash(newPassword, salt);

      // Reset password change attempts and account lock
      await this.resetLockoutFields(user);

      // Update password change metadata
      user.last_password_change = new Date();
      user.password_change_count = (user.password_change_count || 0) + 1;

      // Save user changes
      try {
        await dbUtils.save(user);
      } catch (dbError) {
        logger.error("Database error during password change - user save", {
          error: dbError.message,
          userId,
          stack: dbError.stack,
        });

        return res.status(500).json({
          success: false,
          message: "Failed to save password changes. Please try again.",
          error: "Database save error",
        });
      }

      // Log password change activity with enhanced details
      await user.logActivity(
        "password_change",
        null,
        {
          password_changed_at: new Date(),
          password_strength: passwordValidation.score,
          invalidate_sessions: invalidateAllSessions,
          change_count: user.password_change_count,
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
        },
        {
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
          device_type: this.extractDeviceInfo(req).device_type,
          geolocation: this.extractLocationInfo(req),
          security_event: true,
        },
      );

      // Invalidate all sessions if requested (security measure)
      if (invalidateAllSessions) {
        await user.invalidateAllSessions();
        this.activeUsers.delete(user._id.toString());

        // Clear all sessions from our session store for this user
        for (const [sessionId, sessionData] of this.sessionStore.entries()) {
          if (sessionData.user_id.toString() === userId) {
            this.sessionStore.delete(sessionId);
          }
        }

        logger.info("All sessions invalidated after password change", {
          userId: user._id,
          email: user.email,
        });
      }

      // Send security notification email
      try {
        const deviceInfo = this.extractDeviceInfo(req);
        const locationInfo = this.extractLocationInfo(req);

        await this.sendPasswordChangeNotification(
          user,
          deviceInfo,
          locationInfo,
          invalidateAllSessions,
        );
      } catch (emailError) {
        logger.warn("Failed to send password change notification email", {
          error: emailError.message,
          userId: user._id,
          email: user.email,
        });
        // Don't fail the password change if email fails
      }

      // Generate new JWT if sessions are not invalidated
      let newToken = null;
      if (!invalidateAllSessions) {
        newToken = this.generateJWT(user);
      }

      logger.info("Password successfully changed", {
        userId: user._id,
        email: user.email,
        sessions_invalidated: invalidateAllSessions,
        password_strength: passwordValidation.score,
      });

      return res.status(200).json({
        success: true,
        message: "Password has been changed successfully.",
        data: {
          password_changed_at: user.last_password_change,
          sessions_invalidated: invalidateAllSessions,
          new_token: newToken,
          security_recommendations: [
            "Use a unique password for each account",
            "Enable two-factor authentication for added security",
            "Regularly review your account activity",
            "Keep your recovery information up to date",
          ],
        },
      });
    } catch (err) {
      logger.error("Error in change password process:", {
        error: err.message,
        stack: err.stack,
        userId: req.user?.id,
      });

      return res.status(500).json({
        success: false,
        message: "Server error during password change.",
        error:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Internal server error",
      });
    }
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} - Validation result with score and requirements
   */
  validatePasswordStrength(password) {
    const requirements = {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      noCommonPatterns: true,
    };

    const errors = [];
    let score = 0;

    // Length check
    if (password.length < requirements.minLength) {
      errors.push(
        `Password must be at least ${requirements.minLength} characters long`,
      );
    } else if (password.length >= requirements.minLength) {
      score += 20;
    }

    if (password.length > requirements.maxLength) {
      errors.push(
        `Password must not exceed ${requirements.maxLength} characters`,
      );
    }

    // Character requirements
    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    } else if (/[A-Z]/.test(password)) {
      score += 15;
    }

    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    } else if (/[a-z]/.test(password)) {
      score += 15;
    }

    if (requirements.requireNumbers && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    } else if (/\d/.test(password)) {
      score += 15;
    }

    if (
      requirements.requireSpecialChars &&
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      errors.push("Password must contain at least one special character");
    } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 15;
    }

    // Common pattern checks
    const commonPatterns = [
      /^123456/i,
      /^password/i,
      /^qwerty/i,
      /^abc123/i,
      /^admin/i,
      /^letmein/i,
      /(.)\1{3,}/, // Repeated characters
    ];

    const hasCommonPattern = commonPatterns.some((pattern) =>
      pattern.test(password),
    );
    if (hasCommonPattern) {
      errors.push("Password contains common patterns and is not secure");
      score -= 20;
    } else {
      score += 20;
    }

    // Bonus points for length and complexity
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    if (/[A-Z].*[A-Z]/.test(password)) score += 5; // Multiple uppercase
    if (/\d.*\d/.test(password)) score += 5; // Multiple numbers
    if (
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?].*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
        password,
      )
    )
      score += 5; // Multiple special chars

    score = Math.max(0, Math.min(100, score));

    return {
      isValid: errors.length === 0,
      errors: errors,
      score: score,
      strength:
        score >= 80
          ? "Very Strong"
          : score >= 60
            ? "Strong"
            : score >= 40
              ? "Medium"
              : score >= 20
                ? "Weak"
                : "Very Weak",
      requirements: requirements,
    };
  }

  /**
   * Send password change notification email
   * @param {Object} user - User object
   * @param {Object} deviceInfo - Device information
   * @param {Object} locationInfo - Location information
   * @param {boolean} sessionsInvalidated - Whether all sessions were invalidated
   */
  async sendPasswordChangeNotification(
    user,
    deviceInfo,
    locationInfo,
    sessionsInvalidated = false,
  ) {
    try {
      const emailService = (await import("../services/emailService.js"))
        .default;

      const changeDetails = {
        "Changed On": new Date().toLocaleString("en-US", {
          timeZone: user.preferences?.timezone || "UTC",
          dateStyle: "full",
          timeStyle: "medium",
        }),
        Device: deviceInfo.device_name || "Unknown Device",
        Browser: deviceInfo.browser || "Unknown Browser",
        "Operating System": deviceInfo.operating_system || "Unknown OS",
        Location: `${locationInfo.city || "Unknown"}, ${locationInfo.country || "Unknown"}`,
        "IP Address": deviceInfo.ip_address || "Unknown",
        "Sessions Invalidated": sessionsInvalidated
          ? "Yes - All devices logged out"
          : "No - Current session maintained",
      };

      const subject = sessionsInvalidated
        ? "🔐 Password Changed & All Sessions Terminated - Medh Learning Platform"
        : "🔐 Password Changed Successfully - Medh Learning Platform";

      const message = sessionsInvalidated
        ? `Your password has been changed successfully and all active sessions have been terminated for security. You will need to log in again on all devices. If you did not make this change, please contact support immediately.`
        : `Your password has been changed successfully. If you did not make this change, please secure your account immediately and contact support.`;

      await emailService.sendNotificationEmail(user.email, subject, message, {
        user_name: user.full_name,
        email: user.email,
        details: changeDetails,
        actionUrl: `${process.env.FRONTEND_URL || "https://app.medh.co"}/security`,
        actionText: "Review Account Security",
        currentYear: new Date().getFullYear(),
        urgent: true,
      });

      logger.info("Password change notification sent successfully", {
        userId: user._id,
        email: user.email,
        sessionsInvalidated,
      });
    } catch (error) {
      logger.error("Failed to send password change notification", {
        error: error.message,
        userId: user._id,
        email: user.email,
      });
      throw error;
    }
  }

  // Enhanced User Registration with Real-Time Analytics
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      let { full_name, email, password, username, phone_numbers, gender } =
        req.body;

      // Note: gender is optional and not required for account creation
      // It will only be saved if provided by the user

      // Check if email already exists
      const existingEmailUser = await User.findOne({
        email: email.toLowerCase(),
      });
      if (existingEmailUser) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists",
          details: {
            email_taken: true,
            username_taken: false,
          },
        });
      }

      // Auto-generate username if not provided
      if (!username || username.trim() === "") {
        username = await this.generateUniqueUsername(full_name, email);
      } else {
        // Only check for username conflicts if username was provided by user
        const existingUsernameUser = await User.findOne({
          username: username.trim(),
        });
        if (existingUsernameUser) {
          return res.status(409).json({
            success: false,
            message: "This username is already taken",
            details: {
              email_taken: false,
              username_taken: true,
            },
          });
        }
      }

      // Extract device and location information
      const deviceInfo = this.extractDeviceInfo(req);
      const locationInfo = this.extractLocationInfo(req);

      // Generate student ID for student roles
      let studentId = null;
      const role = req.body.role || "student"; // Default to student role

      if (role === "student" || role === "corporate-student") {
        try {
          studentId = await User.generateStudentId();
        } catch (error) {
          console.error("Error generating student ID:", error);
          return res.status(500).json({
            success: false,
            message: "Error generating student enrollment ID",
            error:
              process.env.NODE_ENV === "development"
                ? error.message
                : undefined,
          });
        }
      }

      // Create new user with enhanced tracking
      const newUser = new User({
        full_name,
        email: email.toLowerCase(),
        username,
        password,
        phone_numbers,
        role,
        student_id: studentId,
        devices: [deviceInfo],
        statistics: {
          engagement: {
            total_logins: 0,
            total_session_time: 0,
            last_active_date: new Date(),
          },
          learning: {
            current_streak: 0,
            longest_streak: 0,
          },
        },
        preferences: {
          theme: "auto",
          language: "en",
          timezone: locationInfo.timezone || "UTC",
        },
        meta: {
          referral_source: req.body.referral_source || "direct",
          // Gender is optional - only set if provided
          ...(req.body.gender && { gender: req.body.gender.toLowerCase() }),
        },
      });

      await newUser.save();

      // Log registration activity
      await newUser.logActivity(
        "register",
        null,
        {
          registration_method: "email",
          referral_source: req.body.referral_source || "direct",
        },
        {
          ip_address: deviceInfo.ip_address,
          user_agent: req.headers["user-agent"],
          device_type: deviceInfo.device_type,
          geolocation: locationInfo,
        },
      );

      // Send verification email with OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      newUser.email_verification_token = otp;
      newUser.email_verification_expires = Date.now() + 10 * 60 * 1000; // 10 minutes
      await newUser.save();

      await this.sendVerificationEmail(newUser.email, otp);

      // Generate JWT token
      const token = this.generateJWT(newUser);

      // Track real-time user registration
      this.trackUserAnalytics("user_registered", {
        user_id: newUser._id,
        email: newUser.email,
        registration_date: new Date(),
        device_info: deviceInfo,
        location_info: locationInfo,
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully. Please verify your email.",
        data: {
          user: {
            id: newUser._id,
            full_name: newUser.full_name,
            email: newUser.email,
            username: newUser.username,
            role: newUser.role,
            student_id: newUser.student_id,
            email_verified: newUser.email_verified,
            profile_completion: newUser.profile_completion,
            account_type: newUser.account_type,
            created_at: newUser.created_at,
          },
          token,
          expires_in: "24h",
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during registration",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Enhanced Login with Real-Time Session Management
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, password, remember_me = false } = req.body;

      // Find user by email with retry logic
      let user;
      try {
        user = await dbUtils.findOne(User, { email: email.toLowerCase() });
      } catch (dbError) {
        logger.error("Database error during login - user lookup", {
          error: dbError.message,
          email: email.toLowerCase(),
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

      // Check if account is locked using improved logic
      const lockStatus = this.isAccountLocked(user);
      if (lockStatus.isLocked) {
        return res.status(423).json({
          success: false,
          message: `Account temporarily locked due to multiple failed login attempts. Please try again after ${lockStatus.remainingMinutes} minute(s).`,
          lockout_info: {
            locked_until: lockStatus.lockedUntil,
            remaining_time: lockStatus.remainingTimeFormatted,
            remaining_minutes: lockStatus.remainingMinutes,
            lockout_reason: lockStatus.lockoutReason,
          },
        });
      }

      // If lockout period has expired, reset fields
      if (lockStatus.needsReset) {
        await this.resetLockoutFields(user);
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        try {
          const attemptResult = await this.incrementFailedAttempts(
            user,
            "login",
          );

          if (attemptResult.shouldReturnError) {
            if (attemptResult.isLocked) {
              return res.status(423).json({
                success: false,
                message: `Account temporarily locked due to multiple failed attempts. Please try again after ${attemptResult.lockInfo.remainingMinutes} minute(s).`,
                lockout_info: {
                  locked_until: attemptResult.lockInfo.lockedUntil,
                  remaining_time: attemptResult.lockInfo.remainingTimeFormatted,
                  remaining_minutes: attemptResult.lockInfo.remainingMinutes,
                  lockout_reason: attemptResult.lockInfo.lockoutReason,
                },
              });
            } else {
              return res.status(401).json({
                success: false,
                message: "Invalid credentials",
                attempts_info: {
                  failed_attempts: attemptResult.attempts,
                  remaining_attempts: attemptResult.remainingAttempts,
                  warning:
                    attemptResult.remainingAttempts <= 1
                      ? "Account will be locked after next failed attempt"
                      : null,
                },
              });
            }
          }
        } catch (dbError) {
          logger.error(
            "Database error during login - failed attempt handling",
            {
              error: dbError.message,
              userId: user._id,
              stack: dbError.stack,
            },
          );

          return res.status(401).json({
            success: false,
            message: "Invalid credentials",
          });
        }
      }

      // Reset failed login attempts on successful login
      await this.resetLockoutFields(user);

      // Check if MFA is enabled for this user
      if (user.two_factor_enabled) {
        // For MFA-enabled users, return a temporary response indicating MFA is required
        return res.status(200).json({
          success: true,
          message:
            "Password verified. Please provide your two-factor authentication code.",
          requires_mfa: true,
          mfa_method: user.two_factor_method,
          data: {
            user_id: user._id.toString(),
            temp_session: true,
            phone_hint:
              user.two_factor_method === "sms" && user.two_factor_phone
                ? `***-***-${user.two_factor_phone.slice(-4)}`
                : null,
          },
        });
      }

      // Extract device and location information
      const deviceInfo = this.extractDeviceInfo(req);
      const locationInfo = this.extractLocationInfo(req);

      // Create or update session
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

      // Calculate login streak
      const lastLogin = user.last_login;
      const now = new Date();
      const daysDiff = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        user.statistics.learning.current_streak += 1;
        user.statistics.learning.longest_streak = Math.max(
          user.statistics.learning.longest_streak,
          user.statistics.learning.current_streak,
        );
      } else if (daysDiff > 1) {
        user.statistics.learning.current_streak = 1;
      }

      try {
        await dbUtils.save(user);
      } catch (dbError) {
        logger.error("Database error during login - user statistics save", {
          error: dbError.message,
          userId: user._id,
        });
        // Continue with login process even if statistics save fails
      }

      // Log login activity
      await user.logActivity(
        "login",
        null,
        {
          login_method: "email_password",
          session_id: sessionId,
          remember_me,
        },
        {
          ip_address: deviceInfo.ip_address,
          user_agent: req.headers["user-agent"],
          device_type: deviceInfo.device_type,
          geolocation: locationInfo,
        },
      );

      // Generate JWT token
      const tokenExpiry = remember_me ? "30d" : "24h";
      const token = this.generateJWT(user, tokenExpiry);

      // Track real-time login
      this.activeUsers.set(user._id.toString(), {
        user_id: user._id,
        session_id: sessionId,
        login_time: new Date(),
        device_info: deviceInfo,
        location_info: locationInfo,
      });

      this.sessionStore.set(sessionId, {
        user_id: user._id,
        created_at: new Date(),
        last_activity: new Date(),
        device_info: deviceInfo,
      });

      // Send login notification email if from new device
      if (this.isNewDevice(user, deviceInfo)) {
        this.sendLoginNotification(user, deviceInfo, locationInfo);
      }

      return this.completeLogin(
        user,
        deviceInfo,
        locationInfo,
        sessionId,
        token,
        remember_me,
        res,
      );
    } catch (error) {
      logger.error("Login error:", {
        error: error.message,
        stack: error.stack,
        email: req.body?.email,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error during login",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Complete login process after MFA verification
   */
  async completeMFALogin(req, res) {
    try {
      const { user_id, verified } = req.body;

      if (!verified) {
        return res.status(400).json({
          success: false,
          message: "MFA verification required",
        });
      }

      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

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

      await user.save();

      // Generate JWT token
      const token = this.generateJWT(user);

      return this.completeLogin(
        user,
        deviceInfo,
        locationInfo,
        sessionId,
        token,
        false,
        res,
      );
    } catch (error) {
      logger.error("Complete MFA login error:", {
        error: error.message,
        stack: error.stack,
        userId: req.body?.user_id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error completing login",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Complete login process (shared between regular and MFA login)
   */
  completeLogin(
    user,
    deviceInfo,
    locationInfo,
    sessionId,
    token,
    remember_me,
    res,
  ) {
    // Track real-time login
    this.activeUsers.set(user._id.toString(), {
      user_id: user._id,
      session_id: sessionId,
      login_time: new Date(),
      device_info: deviceInfo,
      location_info: locationInfo,
    });

    this.sessionStore.set(sessionId, {
      user_id: user._id,
      created_at: new Date(),
      last_activity: new Date(),
      device_info: deviceInfo,
    });

    // Send login notification email if from new device
    if (this.isNewDevice(user, deviceInfo)) {
      this.sendLoginNotification(user, deviceInfo, locationInfo);
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          full_name: user.full_name,
          email: user.email,
          username: user.username,
          role: user.role,
          student_id: user.student_id,
          user_image: user.user_image,
          account_type: user.account_type,
          email_verified: user.email_verified,
          profile_completion: user.profile_completion,
          is_online: true,
          last_seen: user.last_seen,
          statistics: user.statistics,
          preferences: user.preferences,
        },
        token,
        session_id: sessionId,
        expires_in: remember_me ? "30d" : "24h",
      },
    });
  }

  // Enhanced Logout with Session Cleanup
  async logout(req, res) {
    try {
      const { session_id } = req.body;
      const user = req.user;

      if (session_id) {
        await user.endSession(session_id);
        this.sessionStore.delete(session_id);
      }

      // Log logout activity
      await user.logActivity("logout", null, {
        session_id,
        logout_time: new Date(),
      });

      // Remove from active users if no other sessions
      const activeSessions = user.sessions.filter((s) => s.is_active);
      if (activeSessions.length === 0) {
        this.activeUsers.delete(user._id.toString());
        await user.setOffline();
      }

      res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during logout",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Logout from all devices - invalidate all sessions for the user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async logoutAllDevices(req, res) {
    try {
      const user = req.user;

      // Get count of active sessions before invalidation
      const activeSessionCount = user.sessions
        ? user.sessions.filter((s) => s.is_active).length
        : 0;

      // Invalidate all sessions for this user
      await user.invalidateAllSessions();

      // Remove from active users tracking
      this.activeUsers.delete(user._id.toString());

      // Clear all sessions from our session store for this user
      for (const [sessionId, sessionData] of this.sessionStore.entries()) {
        if (sessionData.user_id.toString() === user._id.toString()) {
          this.sessionStore.delete(sessionId);
        }
      }

      // Revoke all refresh tokens for this user
      try {
        await jwtUtils.revokeAllUserTokens(user._id.toString());
      } catch (tokenError) {
        logger.warn("Failed to revoke all refresh tokens", {
          error: tokenError.message,
          userId: user._id,
        });
      }

      // Log the logout all devices activity
      await user.logActivity(
        "logout_all_devices",
        null,
        {
          logout_time: new Date(),
          sessions_terminated: activeSessionCount,
          security_action: true,
        },
        {
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
          device_type: this.extractDeviceInfo(req).device_type,
          geolocation: this.extractLocationInfo(req),
          security_event: true,
        },
      );

      // Send security notification email
      try {
        const deviceInfo = this.extractDeviceInfo(req);
        const locationInfo = this.extractLocationInfo(req);

        await this.sendLogoutAllDevicesNotification(
          user,
          deviceInfo,
          locationInfo,
          activeSessionCount,
        );
      } catch (emailError) {
        logger.warn("Failed to send logout all devices notification email", {
          error: emailError.message,
          userId: user._id,
          email: user.email,
        });
        // Don't fail the logout if email fails
      }

      logger.info("All sessions invalidated by user request", {
        userId: user._id,
        email: user.email,
        sessionCount: activeSessionCount,
      });

      res.status(200).json({
        success: true,
        message: "Successfully logged out from all devices",
        data: {
          sessions_terminated: activeSessionCount,
          logout_time: new Date(),
          security_recommendations: [
            "Change your password if you suspect unauthorized access",
            "Review your recent login activity",
            "Enable two-factor authentication for added security",
            "Use strong, unique passwords for all accounts",
          ],
        },
      });
    } catch (error) {
      logger.error("Logout all devices error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "Internal server error during logout from all devices",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Real-Time User Profile with Analytics
  async getProfile(req, res) {
    try {
      const user = req.user;

      // Update last seen
      await user.updateLastSeen();

      // Calculate real statistics by integrating with other models
      const realStats = await this.calculateRealUserStatistics(user._id);

      // Get comprehensive profile data
      const profileData = {
        user: {
          id: user._id,
          full_name: user.full_name,
          email: user.email,
          username: user.username,
          student_id: user.student_id,
          role: user.role,
          user_image: user.user_image,
          cover_image: user.cover_image,
          bio: user.bio,
          address: user.address,
          organization: user.organization,
          phone_numbers: user.phone_numbers,
          social_links: {
            facebook: user.facebook_link,
            instagram: user.instagram_link,
            linkedin: user.linkedin_link,
            twitter: user.twitter_link,
            youtube: user.youtube_link,
            github: user.github_link,
            portfolio: user.portfolio_link,
          },
          account_info: {
            account_type: user.account_type,
            subscription_status: user.subscription_status,
            subscription_plan: user.subscription_plan,
            email_verified: user.email_verified,
            phone_verified: user.phone_verified,
            two_factor_enabled: user.two_factor_enabled,
            created_at: user.created_at,
            last_login: user.last_login,
            last_profile_update: user.last_profile_update,
          },
          status: {
            is_online: user.is_online,
            last_seen: user.last_seen,
            activity_status: user.activity_status,
            status_message: user.status_message,
          },
          location: {
            country: user.country,
            timezone: user.timezone,
            address: user.address,
          },
          meta: user.meta,
          preferences: user.preferences,
          statistics: realStats, // Use real calculated statistics
          profile_completion: user.profile_completion,
        },
        analytics: {
          recent_activity: user.activity_log.slice(-10),
          active_sessions: user.sessions.filter((s) => s.is_active).length,
          total_sessions: user.sessions.length,
          devices_count: user.devices.length,
          login_frequency: this.calculateLoginFrequency(user),
          engagement_score: this.calculateEngagementScore(user),
        },
      };

      res.status(200).json({
        success: true,
        message: "Profile retrieved successfully",
        data: profileData,
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error retrieving profile",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Calculate Real User Statistics by integrating with other models
  async calculateRealUserStatistics(userId) {
    try {
      // Import models dynamically to avoid circular dependencies
      const { default: Enrollment } = await import(
        "../models/enrollment-model.js"
      );
      const { default: Certificate } = await import(
        "../models/certificate-model.js"
      );
      const { default: Progress } = await import("../models/progress-model.js");
      const { default: Course } = await import("../models/course-model.js");

      // Parallel queries for better performance
      const [enrollments, certificates, progressRecords, user] =
        await Promise.all([
          Enrollment.find({ student: userId }).populate(
            "course",
            "title category pricing",
          ),
          Certificate.find({ student: userId }),
          Progress.find({ student: userId }),
          User.findById(userId),
        ]);

      // Calculate learning statistics
      const learning = {
        total_courses_enrolled: enrollments.length,
        total_courses_completed: enrollments.filter(
          (e) => e.status === "completed",
        ).length,
        total_learning_time: progressRecords.reduce(
          (total, progress) => total + (progress.meta?.totalTimeSpent || 0),
          0,
        ),
        current_streak: await this.calculateCurrentStreak(userId),
        longest_streak: await this.calculateLongestStreak(userId),
        certificates_earned: certificates.filter((c) => c.status === "active")
          .length,
        skill_points: this.calculateSkillPoints(progressRecords, certificates),
        achievements_unlocked: this.calculateAchievements(
          enrollments,
          certificates,
          progressRecords,
        ),
        courses_in_progress: enrollments.filter((e) => e.status === "active")
          .length,
        completion_rate:
          enrollments.length > 0
            ? Math.round(
                (enrollments.filter((e) => e.status === "completed").length /
                  enrollments.length) *
                  100,
              )
            : 0,
        average_score: this.calculateAverageScore(progressRecords),
        favorite_categories: await this.getFavoriteCategories(enrollments),
      };

      // Calculate engagement statistics
      const engagement = {
        total_logins: user.statistics?.engagement?.total_logins || 0,
        total_session_time:
          user.statistics?.engagement?.total_session_time || 0,
        avg_session_duration:
          user.statistics?.engagement?.avg_session_duration || 0,
        last_active_date: user.last_seen,
        consecutive_active_days:
          await this.calculateConsecutiveActiveDays(userId),
        total_page_views: user.statistics?.engagement?.total_page_views || 0,
        feature_usage_count:
          user.statistics?.engagement?.feature_usage_count || new Map(),
        study_hours_this_week: await this.getStudyHoursThisWeek(userId),
        study_hours_this_month: await this.getStudyHoursThisMonth(userId),
        most_active_day: await this.getMostActiveDay(userId),
        preferred_study_time: await this.getPreferredStudyTime(userId),
      };

      // Calculate social statistics
      const social = {
        reviews_written: 0, // TODO: Implement when review system is added
        discussions_participated: 0, // TODO: Implement when discussion system is added
        content_shared: 0, // TODO: Implement when sharing system is added
        followers_count: 0, // TODO: Implement when social features are added
        following_count: 0, // TODO: Implement when social features are added
        community_reputation: this.calculateCommunityReputation(
          certificates,
          progressRecords,
        ),
        peer_interactions: 0, // TODO: Implement when peer system is added
        mentor_sessions: 0, // TODO: Implement when mentoring system is added
      };

      // Calculate financial statistics
      const financial = {
        total_spent: enrollments.reduce(
          (total, enrollment) =>
            total + (enrollment.pricing_snapshot?.final_price || 0),
          0,
        ),
        total_courses_purchased: enrollments.filter(
          (e) => e.pricing_snapshot?.final_price > 0,
        ).length,
        subscription_months: this.calculateSubscriptionMonths(user),
        refunds_requested: 0, // TODO: Implement when refund system is added
        lifetime_value: enrollments.reduce(
          (total, enrollment) =>
            total + (enrollment.pricing_snapshot?.final_price || 0),
          0,
        ),
        average_course_price: this.calculateAverageCoursePrice(enrollments),
        savings_from_discounts: enrollments.reduce(
          (total, enrollment) =>
            total + (enrollment.pricing_snapshot?.discount_applied || 0),
          0,
        ),
        most_expensive_course: this.getMostExpensiveCourse(enrollments),
        payment_methods_used: this.getPaymentMethodsUsed(enrollments),
        currency_preference: user.preferences?.currency || "USD",
      };

      return {
        learning,
        engagement,
        social,
        financial,
        last_updated: new Date(),
      };
    } catch (error) {
      console.error("Error calculating real user statistics:", error);
      // Return default statistics if calculation fails
      return {
        learning: {
          total_courses_enrolled: 0,
          total_courses_completed: 0,
          total_learning_time: 0,
          current_streak: 0,
          longest_streak: 0,
          certificates_earned: 0,
          skill_points: 0,
          achievements_unlocked: 0,
        },
        engagement: {
          total_logins: 0,
          total_session_time: 0,
          avg_session_duration: 0,
          last_active_date: null,
          consecutive_active_days: 0,
          total_page_views: 0,
          feature_usage_count: new Map(),
        },
        social: {
          reviews_written: 0,
          discussions_participated: 0,
          content_shared: 0,
          followers_count: 0,
          following_count: 0,
          community_reputation: 0,
        },
        financial: {
          total_spent: 0,
          total_courses_purchased: 0,
          subscription_months: 0,
          refunds_requested: 0,
          lifetime_value: 0,
        },
        last_updated: new Date(),
        error: "Failed to calculate statistics",
      };
    }
  }

  // Enhanced Profile Update with Real-Time Notifications
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const user = req.user;
      const updateData = req.body;

      // Fields that are not allowed to be updated via this endpoint
      const restrictedFields = [
        "password",
        "email",
        "email_verified",
        "phone_verified",
        "account_type",
        "subscription_status",
        "is_banned",
        "role",
        "statistics",
        "activity_log",
        "sessions",
        "devices",
      ];

      // Remove restricted fields
      restrictedFields.forEach((field) => delete updateData[field]);

      // Handle nested updates
      if (updateData.meta) {
        user.meta = { ...user.meta, ...updateData.meta };
        delete updateData.meta;
      }

      if (updateData.preferences) {
        user.preferences = { ...user.preferences, ...updateData.preferences };
        delete updateData.preferences;
      }

      // Update user fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          user[key] = updateData[key];
        }
      });

      await user.save();

      // Log profile update activity
      await user.logActivity("profile_update", null, {
        updated_fields: Object.keys(updateData),
        profile_completion_before: user.profile_completion,
      });

      // Send real-time notification to user's active sessions
      this.sendRealTimeNotification(user._id, "profile_updated", {
        message: "Your profile has been updated successfully",
        profile_completion: user.profile_completion,
        updated_at: user.updated_at,
      });

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          user: user.profile_summary,
          profile_completion: user.profile_completion,
          updated_fields: Object.keys(updateData),
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error updating profile",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Real-Time Active Users
  async getActiveUsers(req, res) {
    try {
      const activeUsers = await User.findOnlineUsers();

      res.status(200).json({
        success: true,
        message: "Active users retrieved successfully",
        data: {
          total_active: activeUsers.length,
          users: activeUsers,
          real_time_stats: {
            active_in_last_5min: this.getActiveUsersInLastMinutes(5),
            active_in_last_hour: this.getActiveUsersInLastMinutes(60),
            peak_concurrent_today: this.getPeakConcurrentToday(),
          },
        },
      });
    } catch (error) {
      console.error("Get active users error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error retrieving active users",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // User Analytics Dashboard
  async getUserAnalytics(req, res) {
    try {
      const { timeframe = "30d", user_id } = req.query;
      const requestingUser = req.user;

      // Check if user is requesting their own analytics or has admin privileges
      const targetUserId = user_id || requestingUser._id;
      if (
        targetUserId !== requestingUser._id.toString() &&
        requestingUser.account_type !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to view analytics for other users",
        });
      }

      const user = await User.findById(targetUserId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const analytics = {
        profile: {
          profile_completion: user.profile_completion,
          account_age_days: Math.floor(
            (Date.now() - user.created_at) / (1000 * 60 * 60 * 24),
          ),
          verification_status: {
            email: user.email_verified,
            phone: user.phone_verified,
            identity: user.identity_verified,
          },
        },
        engagement: {
          total_logins: user.statistics.engagement.total_logins,
          total_session_time: user.statistics.engagement.total_session_time,
          avg_session_duration: user.statistics.engagement.avg_session_duration,
          last_active: user.statistics.engagement.last_active_date,
          consecutive_active_days:
            user.statistics.engagement.consecutive_active_days,
          login_frequency: this.calculateLoginFrequency(user),
          engagement_score: this.calculateEngagementScore(user),
        },
        learning: user.statistics.learning,
        social: user.statistics.social,
        devices: {
          total_devices: user.devices.length,
          active_devices: user.devices.filter(
            (d) => d.last_seen > Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).length,
          device_breakdown: this.getDeviceBreakdown(user.devices),
        },
        recent_activity: user.activity_log.slice(-50),
        performance_metrics: {
          response_time: this.calculateAvgResponseTime(user),
          error_rate: this.calculateErrorRate(user),
          feature_adoption: this.calculateFeatureAdoption(user),
        },
      };

      res.status(200).json({
        success: true,
        message: "User analytics retrieved successfully",
        data: analytics,
      });
    } catch (error) {
      console.error("Get user analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error retrieving analytics",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Password Reset Request
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.status(200).json({
          success: true,
          message: "If the email exists, a password reset link has been sent",
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      user.password_reset_token = resetToken;
      user.password_reset_expires = Date.now() + 60 * 60 * 1000; // 1 hour
      await user.save();

      // Send reset email
      await this.sendPasswordResetEmail(user.email, resetToken);

      // Log password reset request
      await user.logActivity("password_reset_request", null, {
        request_time: new Date(),
        reset_token_expires: user.password_reset_expires,
      });

      res.status(200).json({
        success: true,
        message: "If the email exists, a password reset link has been sent",
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error processing password reset request",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // System Analytics (Admin Only)
  async getSystemAnalytics(req, res) {
    try {
      const user = req.user;

      if (user.account_type !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized access to system analytics",
        });
      }

      const { timeframe = "30d" } = req.query;

      const systemAnalytics = await User.getUserAnalytics(timeframe);
      const realtimeStats = {
        active_users_now: this.activeUsers.size,
        active_sessions: this.sessionStore.size,
        users_online: await User.countDocuments({ is_online: true }),
        peak_concurrent_users: this.getPeakConcurrentToday(),
        avg_session_duration: this.calculateAvgSessionDuration(),
        top_countries: await this.getTopCountries(),
        device_breakdown: await this.getSystemDeviceBreakdown(),
        engagement_trends: await this.getEngagementTrends(timeframe),
      };

      res.status(200).json({
        success: true,
        message: "System analytics retrieved successfully",
        data: {
          overview: systemAnalytics[0] || {},
          realtime: realtimeStats,
          trends: await this.getSystemTrends(timeframe),
        },
      });
    } catch (error) {
      console.error("Get system analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error retrieving system analytics",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Account Lockout Management Methods

  /**
   * Calculate progressive lockout duration based on failed attempts
   * Enhanced with more granular control and better scaling
   * @param {number} attempts - Number of failed attempts
   * @returns {number} - Lockout duration in milliseconds
   */
  calculateLockoutDuration(attempts) {
    // Progressive lockout strategy
    const lockoutLevels = {
      3: 1 * 60 * 1000, // 1 minute for 3 attempts
      4: 5 * 60 * 1000, // 5 minutes for 4 attempts
      5: 15 * 60 * 1000, // 15 minutes for 5 attempts
      6: 30 * 60 * 1000, // 30 minutes for 6 attempts
      7: 60 * 60 * 1000, // 1 hour for 7 attempts
      8: 2 * 60 * 60 * 1000, // 2 hours for 8 attempts
      9: 4 * 60 * 60 * 1000, // 4 hours for 9 attempts
    };

    // For 10+ attempts, use 24 hours
    if (attempts >= 10) {
      return 24 * 60 * 60 * 1000; // 24 hours
    }

    return lockoutLevels[attempts] || 0;
  }

  /**
   * Check if account is currently locked
   * @param {Object} user - User document
   * @returns {Object} - Lock status information
   */
  isAccountLocked(user) {
    if (!user.account_locked_until) {
      return { isLocked: false };
    }

    const now = Date.now();
    const isLocked = user.account_locked_until > now;

    if (!isLocked) {
      // Account was locked but lockout period has expired
      return {
        isLocked: false,
        wasLocked: true,
        needsReset: true,
      };
    }

    const remainingTime = user.account_locked_until - now;
    const remainingMinutes = Math.ceil(remainingTime / (1000 * 60));

    return {
      isLocked: true,
      remainingTime,
      remainingMinutes,
      remainingTimeFormatted: this.formatRemainingTime(remainingTime),
      lockedUntil: user.account_locked_until,
      lockoutReason: user.lockout_reason || "multiple_failed_attempts",
    };
  }

  /**
   * Safely increment failed attempts and handle locking logic
   * Uses atomic operations to prevent race conditions
   * @param {Object} user - User document
   * @param {string} attemptType - Type of failed attempt ('login', 'temp_password', 'password_change')
   * @returns {Object} - Result of the attempt increment
   */
  async incrementFailedAttempts(user, attemptType = "login") {
    try {
      const lockStatus = this.isAccountLocked(user);

      // If account was locked but lockout period expired, reset counters
      if (lockStatus.needsReset) {
        await this.resetLockoutFields(user);
        user.failed_login_attempts = 0;
        user.password_change_attempts = 0;
        user.account_locked_until = undefined;
        user.lockout_reason = undefined;
      }

      // If account is currently locked, return lock information
      if (lockStatus.isLocked) {
        return {
          isLocked: true,
          lockInfo: lockStatus,
          shouldReturnError: true,
        };
      }

      // Determine which counter to increment
      const attemptField =
        attemptType === "password_change"
          ? "password_change_attempts"
          : "failed_login_attempts";
      const currentAttempts = (user[attemptField] || 0) + 1;

      // Calculate if this increment should trigger a lockout
      const lockoutDuration = this.calculateLockoutDuration(currentAttempts);
      const shouldLock = lockoutDuration > 0;

      // Prepare update object
      const updateData = {
        [attemptField]: currentAttempts,
        last_failed_attempt: new Date(),
      };

      if (shouldLock) {
        updateData.account_locked_until = Date.now() + lockoutDuration;
        updateData.lockout_reason = attemptType + "_attempts";
      }

      // Use atomic update to prevent race conditions
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $set: updateData },
        { new: true },
      );

      if (!updatedUser) {
        throw new Error("Failed to update user attempt counter");
      }

      // Update local user object
      Object.assign(user, updateData);

      const result = {
        isLocked: shouldLock,
        attempts: currentAttempts,
        lockoutDuration: shouldLock ? lockoutDuration : 0,
        lockoutDurationMinutes: shouldLock
          ? Math.ceil(lockoutDuration / (60 * 1000))
          : 0,
        remainingAttempts: Math.max(0, 3 - currentAttempts),
        shouldReturnError: shouldLock,
      };

      if (shouldLock) {
        result.lockInfo = {
          lockedUntil: updateData.account_locked_until,
          remainingTime: lockoutDuration,
          remainingMinutes: result.lockoutDurationMinutes,
          remainingTimeFormatted: this.formatRemainingTime(lockoutDuration),
          lockoutReason: updateData.lockout_reason,
        };

        logger.warn(`Account locked due to ${attemptType} attempts`, {
          userId: user._id,
          email: user.email,
          attempts: currentAttempts,
          lockoutDurationMinutes: result.lockoutDurationMinutes,
          lockoutReason: updateData.lockout_reason,
        });
      }

      return result;
    } catch (error) {
      logger.error("Error incrementing failed attempts:", {
        error: error.message,
        userId: user._id,
        attemptType,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Reset lockout fields atomically
   * @param {Object} user - User document
   */
  async resetLockoutFields(user) {
    try {
      const updateData = {
        failed_login_attempts: 0,
        password_change_attempts: 0,
        account_locked_until: undefined,
        lockout_reason: undefined,
        last_failed_attempt: undefined,
      };

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            failed_login_attempts: 0,
            password_change_attempts: 0,
          },
          $unset: {
            account_locked_until: 1,
            lockout_reason: 1,
            last_failed_attempt: 1,
          },
        },
        { new: true },
      );

      if (updatedUser) {
        // Update local user object
        Object.assign(user, updateData);
      }

      return updatedUser;
    } catch (error) {
      logger.error("Error resetting lockout fields:", {
        error: error.message,
        userId: user._id,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get all locked accounts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getLockedAccounts(req, res) {
    try {
      // Check if user has admin privileges
      if (!this.hasAdminAccess(req.user)) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized. Admin access required.",
        });
      }

      // Find all locked accounts
      const lockedUsers = await User.find({
        account_locked_until: { $exists: true, $ne: null, $gt: Date.now() },
      }).select(
        "full_name email failed_login_attempts password_change_attempts account_locked_until lockout_reason created_at last_login",
      );

      // Calculate remaining lockout time for each user
      const lockedAccountsWithDetails = lockedUsers.map((user) => {
        const remainingTime = user.account_locked_until - Date.now();
        const remainingMinutes = Math.ceil(remainingTime / (1000 * 60));

        return {
          id: user._id,
          full_name: user.full_name,
          email: user.email,
          failed_login_attempts: user.failed_login_attempts || 0,
          password_change_attempts: user.password_change_attempts || 0,
          lockout_reason: user.lockout_reason || "unknown",
          locked_until: user.account_locked_until,
          remaining_minutes: remainingMinutes,
          remaining_time_formatted: this.formatRemainingTime(remainingTime),
          created_at: user.created_at,
          last_login: user.last_login,
        };
      });

      res.status(200).json({
        success: true,
        message: `Found ${lockedAccountsWithDetails.length} locked accounts`,
        data: {
          total_locked: lockedAccountsWithDetails.length,
          accounts: lockedAccountsWithDetails,
        },
      });
    } catch (error) {
      logger.error("Get locked accounts error:", error);
      res.status(500).json({
        success: false,
        message: "Server error retrieving locked accounts",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Unlock a specific account
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async unlockAccount(req, res) {
    try {
      // Check if user has admin privileges
      if (!this.hasAdminAccess(req.user)) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized. Admin access required.",
        });
      }

      const { userId } = req.params;
      const { resetAttempts = true } = req.body;

      // Find the user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if account is actually locked
      if (
        !user.account_locked_until ||
        user.account_locked_until <= Date.now()
      ) {
        return res.status(400).json({
          success: false,
          message: "Account is not currently locked",
          data: {
            user_email: user.email,
            current_status: "unlocked",
          },
        });
      }

      // Store previous state for logging
      const previousState = {
        locked_until: user.account_locked_until,
        failed_login_attempts: user.failed_login_attempts,
        password_change_attempts: user.password_change_attempts,
        lockout_reason: user.lockout_reason,
      };

      // Unlock the account using atomic operation
      const updateFields = {
        $unset: {
          account_locked_until: 1,
          lockout_reason: 1,
          last_failed_attempt: 1,
        },
      };

      if (resetAttempts) {
        updateFields.$set = {
          failed_login_attempts: 0,
          password_change_attempts: 0,
        };
      }

      const updatedUser = await User.findByIdAndUpdate(user._id, updateFields, {
        new: true,
      });

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "Failed to unlock account - user not found during update",
        });
      }

      // Force a fresh reload to ensure no cached data issues
      await updatedUser.save();

      // Update local user object
      user.account_locked_until = undefined;
      user.lockout_reason = undefined;
      user.last_failed_attempt = undefined;
      if (resetAttempts) {
        user.failed_login_attempts = 0;
        user.password_change_attempts = 0;
      }

      // Log the unlock activity (using valid enum value)
      try {
        await user.logActivity("admin_action", null, {
          action_type: "account_unlocked",
          unlocked_at: new Date(),
          unlocked_by_admin: req.user.email,
          previous_state: previousState,
          attempts_reset: resetAttempts,
        });
      } catch (logError) {
        // Continue even if logging fails
        logger.warn("Failed to log unlock activity", {
          error: logError.message,
        });
      }

      logger.info("Account unlocked by admin", {
        unlockedUserId: user._id,
        unlockedUserEmail: user.email,
        adminUserId: req.user.id,
        adminEmail: req.user.email,
        previousState,
      });

      res.status(200).json({
        success: true,
        message: "Account unlocked successfully",
        data: {
          user: {
            id: user._id,
            email: user.email,
            full_name: user.full_name,
            unlocked_at: new Date(),
            attempts_reset: resetAttempts,
          },
          previous_state: previousState,
        },
      });
    } catch (error) {
      logger.error("Unlock account error:", error);
      res.status(500).json({
        success: false,
        message: "Server error unlocking account",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Unlock all locked accounts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async unlockAllAccounts(req, res) {
    try {
      // Check if user has super admin privileges
      if (!this.hasSuperAdminAccess(req.user)) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized. Super admin access required.",
        });
      }

      const { resetAttempts = true } = req.body;

      // Find all locked accounts
      const lockedUsers = await User.find({
        account_locked_until: { $exists: true, $ne: null, $gt: Date.now() },
      });

      if (lockedUsers.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No locked accounts found",
          data: {
            unlocked_count: 0,
            accounts: [],
          },
        });
      }

      // Store information about unlocked accounts
      const unlockedAccounts = [];

      // Unlock all accounts using atomic operation
      const lockoutQuery = {
        account_locked_until: { $exists: true, $ne: null, $gt: Date.now() },
      };

      const updateQuery = {
        $unset: {
          account_locked_until: 1,
          lockout_reason: 1,
          last_failed_attempt: 1,
        },
      };

      if (resetAttempts) {
        updateQuery.$set = {
          failed_login_attempts: 0,
          password_change_attempts: 0,
        };
      }

      const result = await User.updateMany(lockoutQuery, updateQuery);

      // Log activity for each unlocked user
      for (const user of lockedUsers) {
        unlockedAccounts.push({
          id: user._id,
          email: user.email,
          full_name: user.full_name,
          was_locked_until: user.account_locked_until,
          lockout_reason: user.lockout_reason,
          failed_login_attempts: user.failed_login_attempts || 0,
          password_change_attempts: user.password_change_attempts || 0,
        });

        // Log unlock activity for each user
        // Log bulk unlock activity (using valid enum value)
        try {
          await user.logActivity("admin_action", null, {
            action_type: "account_unlocked_bulk",
            unlocked_at: new Date(),
            unlocked_by_admin: req.user.email,
            bulk_unlock: true,
            attempts_reset: resetAttempts,
          });
        } catch (logError) {
          // Continue even if logging fails
          logger.warn("Failed to log bulk unlock activity", {
            error: logError.message,
          });
        }
      }

      logger.info("Bulk account unlock performed", {
        adminUserId: req.user.id,
        adminEmail: req.user.email,
        unlockedCount: result.modifiedCount,
        attemptReset: resetAttempts,
      });

      res.status(200).json({
        success: true,
        message: `Successfully unlocked ${result.modifiedCount} accounts`,
        data: {
          unlocked_count: result.modifiedCount,
          attempts_reset: resetAttempts,
          accounts: unlockedAccounts,
        },
      });
    } catch (error) {
      logger.error("Unlock all accounts error:", error);
      res.status(500).json({
        success: false,
        message: "Server error unlocking accounts",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get account lockout statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getLockoutStats(req, res) {
    try {
      // Check if user has admin privileges
      if (!this.hasAdminAccess(req.user)) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized. Admin access required.",
        });
      }

      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

      // Get various lockout statistics
      const [
        currentlyLocked,
        lockedLast24h,
        lockedLastWeek,
        lockoutReasons,
        attemptStats,
      ] = await Promise.all([
        // Currently locked accounts
        User.countDocuments({
          account_locked_until: { $gt: now },
        }),

        // Accounts locked in last 24 hours
        User.countDocuments({
          account_locked_until: { $gte: oneDayAgo },
        }),

        // Accounts locked in last week
        User.countDocuments({
          account_locked_until: { $gte: oneWeekAgo },
        }),

        // Lockout reasons breakdown
        User.aggregate([
          { $match: { lockout_reason: { $exists: true, $ne: null } } },
          { $group: { _id: "$lockout_reason", count: { $sum: 1 } } },
        ]),

        // Failed attempt statistics
        User.aggregate([
          {
            $group: {
              _id: null,
              avg_failed_login_attempts: { $avg: "$failed_login_attempts" },
              max_failed_login_attempts: { $max: "$failed_login_attempts" },
              avg_password_change_attempts: {
                $avg: "$password_change_attempts",
              },
              max_password_change_attempts: {
                $max: "$password_change_attempts",
              },
              total_users_with_failed_logins: {
                $sum: { $cond: [{ $gt: ["$failed_login_attempts", 0] }, 1, 0] },
              },
              total_users_with_failed_password_changes: {
                $sum: {
                  $cond: [{ $gt: ["$password_change_attempts", 0] }, 1, 0],
                },
              },
            },
          },
        ]),
      ]);

      const stats = attemptStats[0] || {};

      res.status(200).json({
        success: true,
        message: "Lockout statistics retrieved successfully",
        data: {
          current_status: {
            currently_locked: currentlyLocked,
            locked_last_24h: lockedLast24h,
            locked_last_week: lockedLastWeek,
          },
          lockout_reasons: lockoutReasons.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          attempt_statistics: {
            avg_failed_login_attempts:
              Math.round((stats.avg_failed_login_attempts || 0) * 100) / 100,
            max_failed_login_attempts: stats.max_failed_login_attempts || 0,
            users_with_failed_logins: stats.total_users_with_failed_logins || 0,
            avg_password_change_attempts:
              Math.round((stats.avg_password_change_attempts || 0) * 100) / 100,
            max_password_change_attempts:
              stats.max_password_change_attempts || 0,
            users_with_failed_password_changes:
              stats.total_users_with_failed_password_changes || 0,
          },
          lockout_levels: {
            level_1: "3 attempts = 1 minute",
            level_2: "4 attempts = 5 minutes",
            level_3: "5 attempts = 15 minutes",
            level_4: "6 attempts = 30 minutes",
            level_5: "7 attempts = 1 hour",
            level_6: "8 attempts = 2 hours",
            level_7: "9 attempts = 4 hours",
            level_8: "10+ attempts = 24 hours",
          },
        },
      });
    } catch (error) {
      logger.error("Get lockout stats error:", error);
      res.status(500).json({
        success: false,
        message: "Server error retrieving lockout statistics",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Format remaining time into human readable format
   * @param {number} timeMs - Time in milliseconds
   * @returns {string} - Formatted time string
   */
  formatRemainingTime(timeMs) {
    if (timeMs <= 0) return "Expired";

    const minutes = Math.floor(timeMs / (1000 * 60));
    const seconds = Math.floor((timeMs % (1000 * 60)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Check if user has basic admin roles (without super admin check)
   * @param {Object} user - User object from token
   * @returns {boolean} - Whether user has basic admin access
   */
  hasBasicAdminAccess(user) {
    if (!user) return false;

    // Check various admin role formats
    const adminRoles = ["admin", "administrator"];

    // Check primary role field
    if (user.role && adminRoles.includes(user.role.toLowerCase())) {
      return true;
    }

    // Check admin_role field
    if (user.admin_role && adminRoles.includes(user.admin_role.toLowerCase())) {
      return true;
    }

    // Check if role is an array and contains admin roles
    if (Array.isArray(user.role)) {
      return user.role.some((role) => adminRoles.includes(role.toLowerCase()));
    }

    // Check permissions array if exists
    if (user.permissions && Array.isArray(user.permissions)) {
      const adminPermissions = ["admin", "user_management"];
      return user.permissions.some((permission) =>
        adminPermissions.includes(permission.toLowerCase()),
      );
    }

    return false;
  }

  /**
   * Check if user has super admin access (highest level privileges)
   * @param {Object} user - User object from token
   * @returns {boolean} - Whether user has super admin access
   */
  hasSuperAdminAccess(user) {
    if (!user) return false;

    // Check various super admin role formats
    const superAdminRoles = [
      "super_admin",
      "superadmin",
      "super-admin",
      "root",
      "system_admin",
      "master_admin",
      "owner",
    ];

    // Check primary role field
    if (user.role && superAdminRoles.includes(user.role.toLowerCase())) {
      return true;
    }

    // Check admin_role field
    if (
      user.admin_role &&
      superAdminRoles.includes(user.admin_role.toLowerCase())
    ) {
      return true;
    }

    // Check if role is an array and contains super admin roles
    if (Array.isArray(user.role)) {
      return user.role.some((role) =>
        superAdminRoles.includes(role.toLowerCase()),
      );
    }

    // Check permissions array if exists
    if (user.permissions && Array.isArray(user.permissions)) {
      const superAdminPermissions = ["super_admin", "system_admin", "root"];
      return user.permissions.some((permission) =>
        superAdminPermissions.includes(permission.toLowerCase()),
      );
    }

    // Check for super admin boolean flags
    if (user.is_super_admin === true || user.isSuperAdmin === true) {
      return true;
    }

    return false;
  }

  /**
   * Check if user has admin access (includes both admin and super admin)
   * Super admin automatically has all admin privileges
   * @param {Object} user - User object from token
   * @returns {boolean} - Whether user has admin access
   */
  hasAdminAccess(user) {
    if (!user) return false;

    // Super admin automatically has admin access
    if (this.hasSuperAdminAccess(user)) {
      return true;
    }

    // Check for basic admin access
    if (this.hasBasicAdminAccess(user)) {
      return true;
    }

    return false;
  }

  // Helper Methods

  extractDeviceInfo(req) {
    const ua = UAParser(req.headers["user-agent"]);
    const ip = req.ip || req.connection.remoteAddress;

    // Enhanced device detection
    const deviceVendor =
      ua.device.vendor ||
      (ua.os.name === "iOS"
        ? "Apple"
        : ua.os.name === "Android"
          ? "Google"
          : "");
    const deviceModel = ua.device.model || "";

    // Build a meaningful device name
    let deviceName = "Unknown Device";
    if (deviceVendor && deviceModel) {
      deviceName = `${deviceVendor} ${deviceModel}`;
    } else if (ua.os.name && ua.browser.name) {
      // For desktop browsers, create a meaningful name
      if (ua.device.type === "mobile") {
        deviceName = `Mobile ${ua.browser.name}`;
      } else if (ua.device.type === "tablet") {
        deviceName = `Tablet ${ua.browser.name}`;
      } else {
        deviceName = `${ua.os.name} Computer`;
      }
    } else if (ua.browser.name) {
      deviceName = `${ua.browser.name} Browser`;
    }

    // Enhanced browser info
    const browserInfo = ua.browser.name
      ? `${ua.browser.name} ${ua.browser.version || ""}`.trim()
      : "Unknown Browser";

    // Enhanced OS info
    const osInfo = ua.os.name
      ? `${ua.os.name} ${ua.os.version || ""}`.trim()
      : "Unknown OS";

    // Better device type detection
    let deviceType = ua.device.type || "desktop";
    if (!ua.device.type) {
      // Fallback detection based on user agent
      const userAgent = req.headers["user-agent"]?.toLowerCase() || "";
      if (
        userAgent.includes("mobile") ||
        userAgent.includes("iphone") ||
        userAgent.includes("android")
      ) {
        deviceType = "mobile";
      } else if (userAgent.includes("tablet") || userAgent.includes("ipad")) {
        deviceType = "tablet";
      }
    }

    return {
      device_id: crypto
        .createHash("md5")
        .update(req.headers["user-agent"] + ip)
        .digest("hex"),
      device_name: deviceName,
      device_type: deviceType,
      operating_system: osInfo,
      browser: browserInfo,
      ip_address: ip,
      user_agent: req.headers["user-agent"],
      screen_resolution: req.headers["screen-resolution"],
      last_seen: new Date(),
    };
  }

  extractLocationInfo(req) {
    // Enhanced IP address extraction with better IPv6 handling
    let ip =
      req.ip ||
      req.connection.remoteAddress ||
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] ||
      req.headers["x-client-ip"] ||
      req.connection.socket?.remoteAddress ||
      "unknown";

    // Handle IPv6 mapped IPv4 addresses (::ffff:x.x.x.x)
    if (ip.startsWith("::ffff:")) {
      ip = ip.substring(7);
    }

    // Handle IPv6 loopback
    if (ip === "::1") {
      ip = "127.0.0.1";
    }

    // Skip geolocation for localhost/private IPs but provide better fallback
    const isLocalhost = ip === "127.0.0.1" || ip === "localhost";
    const isPrivateIP =
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      (ip.startsWith("172.") &&
        parseInt(ip.split(".")[1]) >= 16 &&
        parseInt(ip.split(".")[1]) <= 31);
    const isUnknown = ip === "unknown" || !ip;

    if (isLocalhost || isPrivateIP || isUnknown) {
      // Better handling for development/local environments
      return {
        country: isLocalhost
          ? "Local Development"
          : isPrivateIP
            ? "Private Network"
            : "Unknown",
        region: isLocalhost
          ? "Localhost"
          : isPrivateIP
            ? "Local Network"
            : "Unknown",
        city: isLocalhost
          ? "Development Environment"
          : isPrivateIP
            ? "Local Network"
            : "Unknown",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        coordinates: null,
      };
    }

    // Use GeoIP lookup for public IPs
    try {
      const geo = geoip.lookup(ip);

      if (geo) {
        return {
          country: geo.country || "Unknown",
          region: geo.region || "Unknown",
          city: geo.city || "Unknown",
          timezone: geo.timezone || "UTC",
          coordinates: geo.ll
            ? {
                latitude: geo.ll[0],
                longitude: geo.ll[1],
              }
            : null,
        };
      }
    } catch (error) {
      logger.warn("GeoIP lookup failed", { ip, error: error.message });
    }

    // Fallback for when GeoIP lookup fails
    return {
      country: "Unknown",
      region: "Unknown",
      city: "Unknown",
      timezone: "UTC",
      coordinates: null,
    };
  }

  generateJWT(user, expiresIn = "24h") {
    // Handle both user object and userId string
    const userData = typeof user === "string" ? { _id: user } : user;

    // Determine the role - use admin_role if available, otherwise use role
    const userRole = userData.admin_role || userData.role || "student";

    return jwt.sign(
      {
        userId: userData._id || userData.id,
        id: userData._id || userData.id,
        email: userData.email,
        role: userRole,
        type: "access",
      },
      ENV_VARS.JWT_SECRET_KEY,
      { expiresIn },
    );
  }

  isNewDevice(user, deviceInfo) {
    return !user.devices.some(
      (device) => device.device_id === deviceInfo.device_id,
    );
  }

  calculateEngagementScore(user) {
    const stats = user.statistics.engagement;
    const learningStats = user.statistics.learning;
    const socialStats = user.statistics.social;

    let score = 0;

    // Base engagement (40% weight)
    score += Math.min(stats.total_logins * 0.5, 100) * 0.4;

    // Learning engagement (30% weight)
    score += Math.min(learningStats.current_streak * 2, 100) * 0.3;

    // Social engagement (20% weight)
    score += Math.min(socialStats.community_reputation * 0.1, 100) * 0.2;

    // Profile completion (10% weight)
    score += (user.profile_completion || 0) * 0.1;

    return Math.round(score);
  }

  calculateLoginFrequency(user) {
    const stats = user.statistics.engagement;
    const accountAgeDays = Math.floor(
      (Date.now() - user.created_at) / (1000 * 60 * 60 * 24),
    );

    if (accountAgeDays === 0) return 0;

    return Math.round((stats.total_logins / accountAgeDays) * 100) / 100;
  }

  getDeviceBreakdown(devices) {
    const breakdown = {};
    devices.forEach((device) => {
      breakdown[device.device_type] = (breakdown[device.device_type] || 0) + 1;
    });
    return breakdown;
  }

  async sendVerificationEmail(email, otp) {
    try {
      // Use the existing emailService for verification emails
      const emailService = (await import("../services/emailService.js"))
        .default;

      // Find user to get their name
      const user = await User.findOne({ email: email.toLowerCase() });
      const userName = user ? user.full_name : "User";

      await emailService.sendOTPVerificationEmail(email, userName, otp);

      console.log(
        "Verification email sent successfully to:",
        email,
        "with OTP:",
        otp,
      );
    } catch (error) {
      console.log("Verification email failed, but continuing:", error.message);
      throw error; // Re-throw so calling code can handle it
    }
  }

  async sendPasswordResetEmail(email, token) {
    // This method is deprecated - use emailService.sendPasswordResetEmail instead
    console.log(
      "Password reset email would be sent to:",
      email,
      "with token:",
      token,
    );
  }

  async sendLoginNotification(user, deviceInfo, locationInfo) {
    try {
      // Use the existing emailService for login notifications
      const emailService = (await import("../services/emailService.js"))
        .default;

      const loginDetails = {
        Device: deviceInfo.device_name || "Unknown Device",
        Browser: deviceInfo.browser || "Unknown Browser",
        "Operating System": deviceInfo.operating_system || "Unknown OS",
        Location: `${locationInfo.city || "Unknown"}, ${locationInfo.country || "Unknown"}`,
        "IP Address": deviceInfo.ip_address || "Unknown",
        "Login Time": new Date().toLocaleString("en-US", {
          timeZone: user.preferences?.timezone || "UTC",
          dateStyle: "full",
          timeStyle: "medium",
        }),
      };

      await emailService.sendNotificationEmail(
        user.email,
        "🔐 New Login Detected - Medh Learning Platform",
        `Hello ${user.full_name}, we detected a new login to your Medh Learning Platform account. If this was you, you can safely ignore this email. If you don't recognize this activity, please secure your account immediately.`,
        {
          user_name: user.full_name,
          email: user.email,
          details: loginDetails,
          actionUrl: `${process.env.FRONTEND_URL || "https://app.medh.co"}/security`,
          actionText: "Review Account Security",
          currentYear: new Date().getFullYear(),
        },
      );

      console.log("Login notification sent successfully to:", user.email);
    } catch (error) {
      console.log("Login notification failed, but continuing:", error.message);
    }
  }

  sendRealTimeNotification(userId, type, data) {
    // Implement WebSocket or Server-Sent Events notification
    // This would integrate with your real-time communication system
    console.log(`Real-time notification for user ${userId}:`, { type, data });
  }

  trackUserAnalytics(event, data) {
    // Implement analytics tracking (e.g., to Google Analytics, Mixpanel, etc.)
    console.log(`Analytics event: ${event}`, data);
  }

  cleanupInactiveSessions() {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    for (const [sessionId, sessionData] of this.sessionStore.entries()) {
      if (sessionData.last_activity < fiveMinutesAgo) {
        this.sessionStore.delete(sessionId);
      }
    }
  }

  getActiveUsersInLastMinutes(minutes) {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return Array.from(this.activeUsers.values()).filter(
      (user) => user.login_time >= cutoff,
    ).length;
  }

  getPeakConcurrentToday() {
    // This would be implemented with a more sophisticated tracking system
    return Math.max(this.activeUsers.size, 0);
  }

  calculateAvgResponseTime(user) {
    // Implement based on your API response time tracking
    return 150; // milliseconds
  }

  calculateErrorRate(user) {
    // Implement based on your error tracking
    return 0.5; // percentage
  }

  calculateFeatureAdoption(user) {
    // Implement based on feature usage tracking
    return {};
  }

  calculateAvgSessionDuration() {
    const sessions = Array.from(this.sessionStore.values());
    if (sessions.length === 0) return 0;

    const totalDuration = sessions.reduce((sum, session) => {
      return sum + (Date.now() - session.created_at);
    }, 0);

    return Math.round(totalDuration / sessions.length / 1000 / 60); // minutes
  }

  async getTopCountries() {
    return await User.aggregate([
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
  }

  async getSystemDeviceBreakdown() {
    return await User.aggregate([
      { $unwind: "$devices" },
      { $group: { _id: "$devices.device_type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  async getEngagementTrends(timeframe) {
    const daysAgo = parseInt(timeframe);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    return await User.aggregate([
      { $match: { created_at: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$created_at",
            },
          },
          registrations: { $sum: 1 },
          avg_engagement: { $avg: "$statistics.engagement.total_logins" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getSystemTrends(timeframe) {
    // Implement comprehensive system trend analysis
    return {
      user_growth: await this.getUserGrowthTrend(timeframe),
      engagement_trend: await this.getEngagementTrends(timeframe),
      device_trends: await this.getDeviceTrends(timeframe),
      geographic_trends: await this.getGeographicTrends(timeframe),
    };
  }

  async getUserGrowthTrend(timeframe) {
    const daysAgo = parseInt(timeframe);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    return await User.aggregate([
      { $match: { created_at: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$created_at",
            },
          },
          new_users: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getDeviceTrends(timeframe) {
    const daysAgo = parseInt(timeframe);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    return await User.aggregate([
      { $match: { created_at: { $gte: startDate } } },
      { $unwind: "$devices" },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$created_at",
              },
            },
            device_type: "$devices.device_type",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);
  }

  async getGeographicTrends(timeframe) {
    const daysAgo = parseInt(timeframe);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    return await User.aggregate([
      { $match: { created_at: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$created_at",
              },
            },
            country: "$country",
          },
          count: { $sum: 1 },
        },
      },
    ]);
  }

  // Statistics Helper Methods
  async calculateCurrentStreak(userId) {
    try {
      const { default: Progress } = await import("../models/progress-model.js");

      // Get user's progress records sorted by last accessed date
      const progressRecords = await Progress.find({ student: userId })
        .sort({ lastAccessed: -1 })
        .limit(30); // Last 30 days

      if (progressRecords.length === 0) return 0;

      let streak = 0;
      const today = new Date();

      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);

        const hasActivityOnDate = progressRecords.some((record) => {
          const recordDate = new Date(record.lastAccessed);
          return recordDate.toDateString() === checkDate.toDateString();
        });

        if (hasActivityOnDate) {
          streak++;
        } else if (i > 0) {
          // Don't break on first day (today) if no activity
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error("Error calculating current streak:", error);
      return 0;
    }
  }

  async calculateLongestStreak(userId) {
    try {
      const { default: Progress } = await import("../models/progress-model.js");

      const progressRecords = await Progress.find({ student: userId }).sort({
        lastAccessed: 1,
      });

      if (progressRecords.length === 0) return 0;

      let longestStreak = 0;
      let currentStreak = 0;
      let lastDate = null;

      progressRecords.forEach((record) => {
        const recordDate = new Date(record.lastAccessed);
        recordDate.setHours(0, 0, 0, 0);

        if (lastDate) {
          const dayDiff = Math.floor(
            (recordDate - lastDate) / (1000 * 60 * 60 * 24),
          );

          if (dayDiff === 1) {
            currentStreak++;
          } else if (dayDiff > 1) {
            longestStreak = Math.max(longestStreak, currentStreak);
            currentStreak = 1;
          }
        } else {
          currentStreak = 1;
        }

        lastDate = recordDate;
      });

      return Math.max(longestStreak, currentStreak);
    } catch (error) {
      console.error("Error calculating longest streak:", error);
      return 0;
    }
  }

  calculateSkillPoints(progressRecords, certificates) {
    let skillPoints = 0;

    // Points from completed lessons
    progressRecords.forEach((progress) => {
      skillPoints += progress.meta?.completedLessons * 10 || 0;
      skillPoints += progress.meta?.completedQuizzes * 25 || 0;
      skillPoints += progress.meta?.completedAssignments * 50 || 0;
    });

    // Bonus points from certificates
    certificates.forEach((cert) => {
      if (cert.status === "active") {
        const gradePoints = {
          "A+": 100,
          A: 90,
          "A-": 85,
          "B+": 80,
          B: 75,
          "B-": 70,
          "C+": 65,
          C: 60,
          "C-": 55,
          D: 50,
          F: 0,
        };
        skillPoints += gradePoints[cert.grade] || 0;
      }
    });

    return skillPoints;
  }

  calculateAchievements(enrollments, certificates, progressRecords) {
    let achievements = 0;

    // First course enrollment
    if (enrollments.length >= 1) achievements++;

    // First course completion
    if (enrollments.some((e) => e.status === "completed")) achievements++;

    // First certificate
    if (certificates.some((c) => c.status === "active")) achievements++;

    // Milestone achievements
    if (enrollments.length >= 5) achievements++; // Course Explorer
    if (enrollments.length >= 10) achievements++; // Learning Enthusiast
    if (certificates.length >= 3) achievements++; // Certificate Collector
    if (certificates.length >= 5) achievements++; // Expert Learner

    // Streak achievements
    const totalLearningTime = progressRecords.reduce(
      (total, progress) => total + (progress.meta?.totalTimeSpent || 0),
      0,
    );

    if (totalLearningTime >= 100) achievements++; // 100 hours of learning
    if (totalLearningTime >= 500) achievements++; // 500 hours of learning

    return achievements;
  }

  calculateAverageScore(progressRecords) {
    let totalScore = 0;
    let scoreCount = 0;

    progressRecords.forEach((progress) => {
      const avgQuizScore = progress.meta?.averageQuizScore || 0;
      const avgAssignmentScore = progress.meta?.averageAssignmentScore || 0;

      if (avgQuizScore > 0) {
        totalScore += avgQuizScore;
        scoreCount++;
      }

      if (avgAssignmentScore > 0) {
        totalScore += avgAssignmentScore;
        scoreCount++;
      }
    });

    return scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
  }

  async getFavoriteCategories(enrollments) {
    const categories = {};

    enrollments.forEach((enrollment) => {
      if (enrollment.course?.category) {
        categories[enrollment.course.category] =
          (categories[enrollment.course.category] || 0) + 1;
      }
    });

    return Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category, count]) => ({ category, count }));
  }

  async calculateConsecutiveActiveDays(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.activity_log) return 0;

      const today = new Date();
      let consecutiveDays = 0;

      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);

        const hasActivityOnDate = user.activity_log.some((activity) => {
          const activityDate = new Date(activity.timestamp);
          return activityDate.toDateString() === checkDate.toDateString();
        });

        if (hasActivityOnDate) {
          consecutiveDays++;
        } else if (i > 0) {
          break;
        }
      }

      return consecutiveDays;
    } catch (error) {
      console.error("Error calculating consecutive active days:", error);
      return 0;
    }
  }

  async getStudyHoursThisWeek(userId) {
    try {
      const { default: Progress } = await import("../models/progress-model.js");

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const progressRecords = await Progress.find({
        student: userId,
        lastAccessed: { $gte: oneWeekAgo },
      });

      const totalMinutes = progressRecords.reduce(
        (total, progress) => total + (progress.meta?.totalTimeSpent || 0),
        0,
      );

      return Math.round((totalMinutes / 60) * 100) / 100; // Convert to hours with 2 decimal places
    } catch (error) {
      console.error("Error calculating study hours this week:", error);
      return 0;
    }
  }

  async getStudyHoursThisMonth(userId) {
    try {
      const { default: Progress } = await import("../models/progress-model.js");

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const progressRecords = await Progress.find({
        student: userId,
        lastAccessed: { $gte: oneMonthAgo },
      });

      const totalMinutes = progressRecords.reduce(
        (total, progress) => total + (progress.meta?.totalTimeSpent || 0),
        0,
      );

      return Math.round((totalMinutes / 60) * 100) / 100;
    } catch (error) {
      console.error("Error calculating study hours this month:", error);
      return 0;
    }
  }

  async getMostActiveDay(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.activity_log) return "N/A";

      const dayActivity = {};
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      user.activity_log.forEach((activity) => {
        const day = new Date(activity.timestamp).getDay();
        const dayName = dayNames[day];
        dayActivity[dayName] = (dayActivity[dayName] || 0) + 1;
      });

      const mostActiveDay = Object.entries(dayActivity).sort(
        ([, a], [, b]) => b - a,
      )[0];

      return mostActiveDay ? mostActiveDay[0] : "N/A";
    } catch (error) {
      console.error("Error calculating most active day:", error);
      return "N/A";
    }
  }

  async getPreferredStudyTime(userId) {
    try {
      const { default: Progress } = await import("../models/progress-model.js");

      const progressRecords = await Progress.find({ student: userId });
      const hourActivity = {};

      progressRecords.forEach((progress) => {
        const hour = new Date(progress.lastAccessed).getHours();
        hourActivity[hour] = (hourActivity[hour] || 0) + 1;
      });

      const mostActiveHour = Object.entries(hourActivity).sort(
        ([, a], [, b]) => b - a,
      )[0];

      if (mostActiveHour) {
        const hour = parseInt(mostActiveHour[0]);
        if (hour < 12) return `${hour === 0 ? 12 : hour} AM`;
        return `${hour === 12 ? 12 : hour - 12} PM`;
      }

      return "N/A";
    } catch (error) {
      console.error("Error calculating preferred study time:", error);
      return "N/A";
    }
  }

  calculateCommunityReputation(certificates, progressRecords) {
    let reputation = 0;

    // Base reputation from certificates
    certificates.forEach((cert) => {
      if (cert.status === "active") {
        reputation += cert.finalScore || 0;
      }
    });

    // Bonus reputation from consistent learning
    const totalLearningTime = progressRecords.reduce(
      (total, progress) => total + (progress.meta?.totalTimeSpent || 0),
      0,
    );

    reputation += Math.floor(totalLearningTime / 60); // 1 point per hour

    return Math.round(reputation);
  }

  calculateSubscriptionMonths(user) {
    if (!user.subscription_start || !user.subscription_end) return 0;

    const start = new Date(user.subscription_start);
    const end = new Date(user.subscription_end);
    const monthsDiff =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());

    return Math.max(0, monthsDiff);
  }

  calculateAverageCoursePrice(enrollments) {
    const paidEnrollments = enrollments.filter(
      (e) => e.pricing_snapshot?.final_price > 0,
    );

    if (paidEnrollments.length === 0) return 0;

    const totalPrice = paidEnrollments.reduce(
      (total, enrollment) => total + enrollment.pricing_snapshot.final_price,
      0,
    );

    return Math.round((totalPrice / paidEnrollments.length) * 100) / 100;
  }

  getMostExpensiveCourse(enrollments) {
    const paidEnrollments = enrollments.filter(
      (e) => e.pricing_snapshot?.final_price > 0,
    );

    if (paidEnrollments.length === 0) return null;

    const mostExpensive = paidEnrollments.reduce((max, enrollment) =>
      enrollment.pricing_snapshot.final_price > max.pricing_snapshot.final_price
        ? enrollment
        : max,
    );

    return {
      course_title: mostExpensive.course?.title || "Unknown Course",
      price: mostExpensive.pricing_snapshot.final_price,
      currency: mostExpensive.pricing_snapshot.currency,
    };
  }

  getPaymentMethodsUsed(enrollments) {
    const methods = new Set();

    enrollments.forEach((enrollment) => {
      if (enrollment.payment_info?.payment_method) {
        methods.add(enrollment.payment_info.payment_method);
      }
    });

    return Array.from(methods);
  }

  // Alias methods for backward compatibility
  async registerUser(req, res) {
    return this.register(req, res);
  }

  async loginUser(req, res) {
    return this.login(req, res);
  }

  async verifyEmailOTP(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: "Email and OTP are required",
        });
      }

      const user = await User.findOne({
        email: email.toLowerCase(),
        email_verification_token: otp,
        email_verification_expires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP",
        });
      }

      user.email_verified = true;
      user.email_verification_token = undefined;
      user.email_verification_expires = undefined;
      await user.save();

      res.status(200).json({
        success: true,
        message: "Email verified successfully",
        data: {
          user: {
            id: user._id,
            email: user.email,
            email_verified: user.email_verified,
          },
        },
      });
    } catch (error) {
      logger.error("Email verification error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during email verification",
        error: error.message,
      });
    }
  }

  async resendVerificationOTP(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.email_verified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      // Generate new 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.email_verification_token = otp;
      user.email_verification_expires = Date.now() + 10 * 60 * 1000; // 10 minutes
      await user.save();

      await this.sendVerificationEmail(user.email, otp);

      res.status(200).json({
        success: true,
        message: "Verification email sent successfully",
      });
    } catch (error) {
      logger.error("Resend verification error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during resend verification",
        error: error.message,
      });
    }
  }

  async checkUserStatus(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          exists: false,
        });
      }

      res.status(200).json({
        success: true,
        message: "User status retrieved",
        data: {
          exists: true,
          email_verified: user.email_verified,
          is_active: user.is_active,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error("Check user status error:", error);
      res.status(500).json({
        success: false,
        message: "Server error checking user status",
        error: error.message,
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      // Verify refresh token
      const decoded = jwt.verify(refresh_token, ENV_VARS.JWT_SECRET_KEY);
      const userId = decoded.id || decoded.userId; // Support both old and new formats
      const user = await User.findById(userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid refresh token",
        });
      }

      // Generate new access token
      const newAccessToken = this.generateJWT(user);
      const newRefreshToken = jwt.sign(
        {
          id: user._id,
          type: "refresh",
          token: require("crypto").randomBytes(40).toString("hex"),
        },
        ENV_VARS.JWT_SECRET_KEY,
        { expiresIn: "7d" },
      );

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          expires_in: "24h",
        },
      });
    } catch (error) {
      logger.error("Refresh token error:", error);
      res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
        error: error.message,
      });
    }
  }

  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, role, status, search } = req.query;

      // Build query
      const query = {};
      if (role) query.role = role;
      if (status) query.is_active = status === "active";

      if (search) {
        query.$or = [
          { full_name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { username: { $regex: search, $options: "i" } },
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const users = await User.find(query)
        .select("-password")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ created_at: -1 });

      // Normalize user_image to always be an object
      const normalizedUsers = users.map((user) => {
        const u = user.toObject();
        if (u.user_image && typeof u.user_image === "string") {
          u.user_image = { url: u.user_image };
        }
        // Optionally, ensure upload_date exists
        if (
          u.user_image &&
          typeof u.user_image === "object" &&
          !u.user_image.upload_date
        ) {
          u.user_image.upload_date = null;
        }
        return u;
      });

      const total = await User.countDocuments(query);

      res.status(200).json({
        success: true,
        count: normalizedUsers.length,
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        data: normalizedUsers,
      });
    } catch (error) {
      logger.error("Get all users error:", error);
      res.status(500).json({
        success: false,
        message: "Server error retrieving users",
        error: error.message,
      });
    }
  }

  async getAllStudents(req, res) {
    try {
      const query = { role: { $in: ["student", "coorporate-student"] } };
      const students = await User.find(query)
        .select("-password")
        .sort({ created_at: -1 });

      // Normalize user_image to always be an object
      const normalizedStudents = students.map((student) => {
        const s = student.toObject();
        if (s.user_image && typeof s.user_image === "string") {
          s.user_image = { url: s.user_image };
        }
        // Optionally, ensure upload_date exists
        if (
          s.user_image &&
          typeof s.user_image === "object" &&
          !s.user_image.upload_date
        ) {
          s.user_image.upload_date = null;
        }
        return s;
      });

      res.status(200).json({
        success: true,
        count: normalizedStudents.length,
        data: normalizedStudents,
      });
    } catch (error) {
      logger.error("Get all students error:", error);
      res.status(500).json({
        success: false,
        message: "Server error retrieving students",
        error: error.message,
      });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Normalize user_image to always be an object
      const normalizedUser = user.toObject();
      if (
        normalizedUser.user_image &&
        typeof normalizedUser.user_image === "string"
      ) {
        normalizedUser.user_image = { url: normalizedUser.user_image };
      }
      // Optionally, ensure upload_date exists
      if (
        normalizedUser.user_image &&
        typeof normalizedUser.user_image === "object" &&
        !normalizedUser.user_image.upload_date
      ) {
        normalizedUser.user_image.upload_date = null;
      }

      res.status(200).json({
        success: true,
        data: normalizedUser,
      });
    } catch (error) {
      logger.error("Get user by ID error:", error);
      res.status(500).json({
        success: false,
        message: "Server error retrieving user",
        error: error.message,
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Remove sensitive fields that shouldn't be updated directly
      delete updates.password;
      delete updates.email_verification_token;
      delete updates.resetPasswordToken;

      const user = await User.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Normalize user_image to always be an object
      const normalizedUser = user.toObject();
      if (
        normalizedUser.user_image &&
        typeof normalizedUser.user_image === "string"
      ) {
        normalizedUser.user_image = { url: normalizedUser.user_image };
      }
      // Optionally, ensure upload_date exists
      if (
        normalizedUser.user_image &&
        typeof normalizedUser.user_image === "object" &&
        !normalizedUser.user_image.upload_date
      ) {
        normalizedUser.user_image.upload_date = null;
      }

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: normalizedUser,
      });
    } catch (error) {
      logger.error("Update user error:", error);
      res.status(500).json({
        success: false,
        message: "Server error updating user",
        error: error.message,
      });
    }
  }

  async updateUserByEmail(req, res) {
    try {
      const { email } = req.params;
      const updates = req.body;

      // Remove sensitive fields that shouldn't be updated directly
      delete updates.password;
      delete updates.email_verification_token;
      delete updates.resetPasswordToken;

      const user = await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        updates,
        { new: true, runValidators: true },
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Normalize user_image to always be an object
      const normalizedUser = user.toObject();
      if (
        normalizedUser.user_image &&
        typeof normalizedUser.user_image === "string"
      ) {
        normalizedUser.user_image = { url: normalizedUser.user_image };
      }
      // Optionally, ensure upload_date exists
      if (
        normalizedUser.user_image &&
        typeof normalizedUser.user_image === "object" &&
        !normalizedUser.user_image.upload_date
      ) {
        normalizedUser.user_image.upload_date = null;
      }

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: normalizedUser,
      });
    } catch (error) {
      logger.error("Update user by email error:", error);
      res.status(500).json({
        success: false,
        message: "Server error updating user",
        error: error.message,
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findByIdAndDelete(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
        data: { id: user._id },
      });
    } catch (error) {
      logger.error("Delete user error:", error);
      res.status(500).json({
        success: false,
        message: "Server error deleting user",
        error: error.message,
      });
    }
  }

  /**
   * Check if email or username is available
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkAvailability(req, res) {
    try {
      const { email, username } = req.query;

      if (!email && !username) {
        return res.status(400).json({
          success: false,
          message: "Either email or username parameter is required",
        });
      }

      const result = {
        success: true,
        data: {},
      };

      if (email) {
        const existingEmailUser = await User.findOne({
          email: email.toLowerCase(),
        });
        result.data.email = {
          value: email.toLowerCase(),
          available: !existingEmailUser,
          taken: !!existingEmailUser,
        };
      }

      if (username) {
        const existingUsernameUser = await User.findOne({ username });
        result.data.username = {
          value: username,
          available: !existingUsernameUser,
          taken: !!existingUsernameUser,
        };
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("Check availability error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during availability check",
        error: error.message,
      });
    }
  }

  /**
   * Generate a unique username based on full name and email
   * @param {string} fullName - User's full name
   * @param {string} email - User's email
   * @returns {Promise<string>} - Unique username
   */
  async generateUniqueUsername(fullName, email) {
    try {
      // Create base username from full name
      let baseUsername = fullName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") // Remove special characters
        .substring(0, 15); // Limit length

      // If base username is too short, use part of email
      if (baseUsername.length < 3) {
        const emailPart = email
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        baseUsername = emailPart.substring(0, 15);
      }

      // If still too short, use a default
      if (baseUsername.length < 3) {
        baseUsername = "user";
      }

      // Check if base username is available
      let username = baseUsername;
      let counter = 1;

      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;

        // Prevent infinite loop
        if (counter > 9999) {
          username = `${baseUsername}${Date.now()}`;
          break;
        }
      }

      return username;
    } catch (error) {
      console.error("Error generating unique username:", error);
      // Fallback to timestamp-based username
      return `user${Date.now()}`;
    }
  }

  /**
   * Send logout all devices notification email
   * @param {Object} user - User object
   * @param {Object} deviceInfo - Device information
   * @param {Object} locationInfo - Location information
   * @param {number} sessionCount - Number of sessions terminated
   */
  async sendLogoutAllDevicesNotification(
    user,
    deviceInfo,
    locationInfo,
    sessionCount,
  ) {
    try {
      const emailService = (await import("../services/emailService.js"))
        .default;

      const logoutDetails = {
        "Initiated From Device": deviceInfo.device_name || "Unknown Device",
        Browser: deviceInfo.browser || "Unknown Browser",
        "Operating System": deviceInfo.operating_system || "Unknown OS",
        Location: `${locationInfo.city || "Unknown"}, ${locationInfo.country || "Unknown"}`,
        "IP Address": deviceInfo.ip_address || "Unknown",
        "Logout Time": new Date().toLocaleString("en-US", {
          timeZone: user.preferences?.timezone || "UTC",
          dateStyle: "full",
          timeStyle: "medium",
        }),
        "Sessions Terminated": sessionCount.toString(),
      };

      await emailService.sendNotificationEmail(
        user.email,
        "🚪 Logged Out From All Devices - Medh Learning Platform",
        `Hello ${user.full_name}, you have been logged out from all devices on your Medh Learning Platform account. This action was initiated from one of your devices. If you did not request this, please contact support immediately.`,
        {
          user_name: user.full_name,
          email: user.email,
          details: logoutDetails,
          actionUrl: `${process.env.FRONTEND_URL || "https://app.medh.co"}/login`,
          actionText: "Login Again",
          currentYear: new Date().getFullYear(),
          urgent: true,
        },
      );

      logger.info("Logout all devices notification sent successfully", {
        userId: user._id,
        email: user.email,
        sessionCount,
      });
    } catch (error) {
      logger.error("Failed to send logout all devices notification", {
        error: error.message,
        userId: user._id,
        email: user.email,
      });
      throw error;
    }
  }
}

// Create and export controller instance
const authController = new AuthController();
export default authController;
