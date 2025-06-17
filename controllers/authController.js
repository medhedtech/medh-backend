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
        message: `User status changed to ${user.is_active ? 'active' : 'inactive'}`,
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

      let { full_name, email, password, username, phone_numbers } = req.body;

      // Check if email already exists
      const existingEmailUser = await User.findOne({ email: email.toLowerCase() });
      if (existingEmailUser) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists",
          details: {
            email_taken: true,
            username_taken: false
          }
        });
      }

      // Auto-generate username if not provided
      if (!username || username.trim() === '') {
        username = await this.generateUniqueUsername(full_name, email);
      } else {
        // Only check for username conflicts if username was provided by user
        const existingUsernameUser = await User.findOne({ username: username.trim() });
        if (existingUsernameUser) {
          return res.status(409).json({
            success: false,
            message: "This username is already taken",
            details: {
              email_taken: false,
              username_taken: true
            }
          });
        }
      }

      // Extract device and location information
      const deviceInfo = this.extractDeviceInfo(req);
      const locationInfo = this.extractLocationInfo(req);

      // Generate student ID for student roles
      let studentId = null;
      const role = req.body.role || 'student'; // Default to student role
      
      if (role === 'student' || role === 'corporate-student') {
        try {
          studentId = await User.generateStudentId();
        } catch (error) {
          console.error('Error generating student ID:', error);
          return res.status(500).json({
            success: false,
            message: "Error generating student enrollment ID",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
        },
      });

      await newUser.save();

      // Log registration activity
      await newUser.logActivity("register", null, {
        registration_method: "email",
        referral_source: req.body.referral_source || "direct",
      }, {
        ip_address: deviceInfo.ip_address,
        user_agent: req.headers["user-agent"],
        device_type: deviceInfo.device_type,
        geolocation: locationInfo,
      });

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
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
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

      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if account is locked
      if (user.account_locked_until && user.account_locked_until > Date.now()) {
        return res.status(423).json({
          success: false,
          message: "Account temporarily locked due to multiple failed login attempts",
          locked_until: user.account_locked_until,
        });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        user.failed_login_attempts += 1;
        
        // Lock account after 5 failed attempts for 30 minutes
        if (user.failed_login_attempts >= 5) {
          user.account_locked_until = Date.now() + 30 * 60 * 1000;
        }
        
        await user.save();
        
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
          attempts_remaining: Math.max(0, 5 - user.failed_login_attempts),
        });
      }

      // Reset failed login attempts on successful login
      user.failed_login_attempts = 0;
      user.account_locked_until = undefined;

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
          user.statistics.learning.current_streak
        );
      } else if (daysDiff > 1) {
        user.statistics.learning.current_streak = 1;
      }

      await user.save();

      // Log login activity
      await user.logActivity("login", null, {
        login_method: "email_password",
        session_id: sessionId,
        remember_me,
      }, {
        ip_address: deviceInfo.ip_address,
        user_agent: req.headers["user-agent"],
        device_type: deviceInfo.device_type,
        geolocation: locationInfo,
      });

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
        await this.sendLoginNotification(user, deviceInfo, locationInfo);
      }

      res.status(200).json({
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
          expires_in: tokenExpiry,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during login",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
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
      const activeSessions = user.sessions.filter(s => s.is_active);
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
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
          active_sessions: user.sessions.filter(s => s.is_active).length,
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
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Calculate Real User Statistics by integrating with other models
  async calculateRealUserStatistics(userId) {
    try {
      // Import models dynamically to avoid circular dependencies
      const { default: Enrollment } = await import('../models/enrollment-model.js');
      const { default: Certificate } = await import('../models/certificate-model.js');
      const { default: Progress } = await import('../models/progress-model.js');
      const { default: Course } = await import('../models/course-model.js');

      // Parallel queries for better performance
      const [
        enrollments,
        certificates,
        progressRecords,
        user
      ] = await Promise.all([
        Enrollment.find({ student: userId }).populate('course', 'title category pricing'),
        Certificate.find({ student: userId }),
        Progress.find({ student: userId }),
        User.findById(userId)
      ]);

      // Calculate learning statistics
      const learning = {
        total_courses_enrolled: enrollments.length,
        total_courses_completed: enrollments.filter(e => e.status === 'completed').length,
        total_learning_time: progressRecords.reduce((total, progress) => 
          total + (progress.meta?.totalTimeSpent || 0), 0),
        current_streak: await this.calculateCurrentStreak(userId),
        longest_streak: await this.calculateLongestStreak(userId),
        certificates_earned: certificates.filter(c => c.status === 'active').length,
        skill_points: this.calculateSkillPoints(progressRecords, certificates),
        achievements_unlocked: this.calculateAchievements(enrollments, certificates, progressRecords),
        courses_in_progress: enrollments.filter(e => e.status === 'active').length,
        completion_rate: enrollments.length > 0 ? 
          Math.round((enrollments.filter(e => e.status === 'completed').length / enrollments.length) * 100) : 0,
        average_score: this.calculateAverageScore(progressRecords),
        favorite_categories: await this.getFavoriteCategories(enrollments)
      };

      // Calculate engagement statistics
      const engagement = {
        total_logins: user.statistics?.engagement?.total_logins || 0,
        total_session_time: user.statistics?.engagement?.total_session_time || 0,
        avg_session_duration: user.statistics?.engagement?.avg_session_duration || 0,
        last_active_date: user.last_seen,
        consecutive_active_days: await this.calculateConsecutiveActiveDays(userId),
        total_page_views: user.statistics?.engagement?.total_page_views || 0,
        feature_usage_count: user.statistics?.engagement?.feature_usage_count || new Map(),
        study_hours_this_week: await this.getStudyHoursThisWeek(userId),
        study_hours_this_month: await this.getStudyHoursThisMonth(userId),
        most_active_day: await this.getMostActiveDay(userId),
        preferred_study_time: await this.getPreferredStudyTime(userId)
      };

      // Calculate social statistics
      const social = {
        reviews_written: 0, // TODO: Implement when review system is added
        discussions_participated: 0, // TODO: Implement when discussion system is added
        content_shared: 0, // TODO: Implement when sharing system is added
        followers_count: 0, // TODO: Implement when social features are added
        following_count: 0, // TODO: Implement when social features are added
        community_reputation: this.calculateCommunityReputation(certificates, progressRecords),
        peer_interactions: 0, // TODO: Implement when peer system is added
        mentor_sessions: 0, // TODO: Implement when mentoring system is added
      };

      // Calculate financial statistics
      const financial = {
        total_spent: enrollments.reduce((total, enrollment) => 
          total + (enrollment.pricing_snapshot?.final_price || 0), 0),
        total_courses_purchased: enrollments.filter(e => 
          e.pricing_snapshot?.final_price > 0).length,
        subscription_months: this.calculateSubscriptionMonths(user),
        refunds_requested: 0, // TODO: Implement when refund system is added
        lifetime_value: enrollments.reduce((total, enrollment) => 
          total + (enrollment.pricing_snapshot?.final_price || 0), 0),
        average_course_price: this.calculateAverageCoursePrice(enrollments),
        savings_from_discounts: enrollments.reduce((total, enrollment) => 
          total + (enrollment.pricing_snapshot?.discount_applied || 0), 0),
        most_expensive_course: this.getMostExpensiveCourse(enrollments),
        payment_methods_used: this.getPaymentMethodsUsed(enrollments),
        currency_preference: user.preferences?.currency || 'USD'
      };

      return {
        learning,
        engagement,
        social,
        financial,
        last_updated: new Date()
      };

    } catch (error) {
      console.error('Error calculating real user statistics:', error);
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
        error: 'Failed to calculate statistics'
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
        "password", "email", "email_verified", "phone_verified",
        "account_type", "subscription_status", "is_banned", "role",
        "statistics", "activity_log", "sessions", "devices"
      ];

      // Remove restricted fields
      restrictedFields.forEach(field => delete updateData[field]);

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
      Object.keys(updateData).forEach(key => {
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
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
      if (targetUserId !== requestingUser._id.toString() && requestingUser.account_type !== "admin") {
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
          account_age_days: Math.floor((Date.now() - user.created_at) / (1000 * 60 * 60 * 24)),
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
          consecutive_active_days: user.statistics.engagement.consecutive_active_days,
          login_frequency: this.calculateLoginFrequency(user),
          engagement_score: this.calculateEngagementScore(user),
        },
        learning: user.statistics.learning,
        social: user.statistics.social,
        devices: {
          total_devices: user.devices.length,
          active_devices: user.devices.filter(d => d.last_seen > Date.now() - 7 * 24 * 60 * 60 * 1000).length,
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
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Helper Methods

  extractDeviceInfo(req) {
    const ua = UAParser(req.headers["user-agent"]);
    const ip = req.ip || req.connection.remoteAddress;
    
    return {
      device_id: crypto.createHash("md5").update(req.headers["user-agent"] + ip).digest("hex"),
      device_name: `${ua.device.vendor || "Unknown"} ${ua.device.model || "Device"}`,
      device_type: ua.device.type || "desktop",
      operating_system: `${ua.os.name || "Unknown"} ${ua.os.version || ""}`,
      browser: `${ua.browser.name || "Unknown"} ${ua.browser.version || ""}`,
      ip_address: ip,
      user_agent: req.headers["user-agent"],
      screen_resolution: req.headers["screen-resolution"],
      last_seen: new Date(),
    };
  }

  extractLocationInfo(req) {
    // Enhanced IP address extraction
    let ip = req.ip || 
             req.connection.remoteAddress || 
             req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             req.headers['x-real-ip'] ||
             req.headers['x-client-ip'] ||
             req.connection.socket?.remoteAddress ||
             'unknown';
    
    // Skip geolocation for localhost/private IPs
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return {
        country: "Local",
        region: "Local",
        city: "Development",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        coordinates: null,
      };
    }
    
    const geo = geoip.lookup(ip);
    
    return {
      country: geo?.country || "Unknown",
      region: geo?.region || "Unknown", 
      city: geo?.city || "Unknown",
      timezone: geo?.timezone || "UTC",
      coordinates: geo ? {
        latitude: geo.ll[0],
        longitude: geo.ll[1],
      } : null,
    };
  }

  generateJWT(user, expiresIn = "24h") {
    // Handle both user object and userId string
    const userData = typeof user === 'string' ? { _id: user } : user;
    
    // Determine the role - use admin_role if available, otherwise use role
    const userRole = userData.admin_role || userData.role || 'student';
    
    return jwt.sign(
      { 
        userId: userData._id || userData.id,
        id: userData._id || userData.id,
        email: userData.email,
        role: userRole,
        type: "access" 
      },
      ENV_VARS.JWT_SECRET_KEY,
      { expiresIn }
    );
  }

  isNewDevice(user, deviceInfo) {
    return !user.devices.some(device => device.device_id === deviceInfo.device_id);
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
    const accountAgeDays = Math.floor((Date.now() - user.created_at) / (1000 * 60 * 60 * 24));
    
    if (accountAgeDays === 0) return 0;
    
    return Math.round((stats.total_logins / accountAgeDays) * 100) / 100;
  }

  getDeviceBreakdown(devices) {
    const breakdown = {};
    devices.forEach(device => {
      breakdown[device.device_type] = (breakdown[device.device_type] || 0) + 1;
    });
    return breakdown;
  }

  async sendVerificationEmail(email, otp) {
    try {
      // Use the existing emailService for verification emails
      const emailService = (await import('../services/emailService.js')).default;
      
      // Find user to get their name
      const user = await User.findOne({ email: email.toLowerCase() });
      const userName = user ? user.full_name : 'User';
      
      await emailService.sendOTPVerificationEmail(email, userName, otp);
      
      console.log('Verification email sent successfully to:', email, 'with OTP:', otp);
    } catch (error) {
      console.log('Verification email failed, but continuing:', error.message);
      throw error; // Re-throw so calling code can handle it
    }
  }

  async sendPasswordResetEmail(email, token) {
    // This method is deprecated - use emailService.sendPasswordResetEmail instead
    console.log('Password reset email would be sent to:', email, 'with token:', token);
  }

  async sendLoginNotification(user, deviceInfo, locationInfo) {
    try {
      // Use the existing emailService for login notifications
      const emailService = (await import('../services/emailService.js')).default;
      
      const loginDetails = {
        'Device': deviceInfo.device_name || 'Unknown Device',
        'Browser': deviceInfo.browser || 'Unknown Browser', 
        'Operating System': deviceInfo.operating_system || 'Unknown OS',
        'Location': `${locationInfo.city || 'Unknown'}, ${locationInfo.country || 'Unknown'}`,
        'IP Address': deviceInfo.ip_address || 'Unknown',
        'Login Time': new Date().toLocaleString('en-US', { 
          timeZone: user.preferences?.timezone || 'UTC',
          dateStyle: 'full',
          timeStyle: 'medium'
        })
      };

      await emailService.sendNotificationEmail(
        user.email,
        '🔐 New Login Detected - Medh Learning Platform',
        `Hello ${user.full_name}, we detected a new login to your Medh Learning Platform account. If this was you, you can safely ignore this email. If you don't recognize this activity, please secure your account immediately.`,
        {
          user_name: user.full_name,
          email: user.email,
          details: loginDetails,
          actionUrl: `${process.env.FRONTEND_URL || 'https://app.medh.co'}/security`,
          actionText: 'Review Account Security',
          currentYear: new Date().getFullYear()
        }
      );
      
      console.log('Login notification sent successfully to:', user.email);
    } catch (error) {
      console.log('Login notification failed, but continuing:', error.message);
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
      user => user.login_time >= cutoff
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
              date: "$created_at"
            }
          },
          registrations: { $sum: 1 },
          avg_engagement: { $avg: "$statistics.engagement.total_logins" },
        }
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
              date: "$created_at"
            }
          },
          new_users: { $sum: 1 },
        }
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
                date: "$created_at"
              }
            },
            device_type: "$devices.device_type"
          },
          count: { $sum: 1 },
        }
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
                date: "$created_at"
              }
            },
            country: "$country"
          },
          count: { $sum: 1 }
        }
      }
    ]);
  }

  // Statistics Helper Methods
  async calculateCurrentStreak(userId) {
    try {
      const { default: Progress } = await import('../models/progress-model.js');
      
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
        
        const hasActivityOnDate = progressRecords.some(record => {
          const recordDate = new Date(record.lastAccessed);
          return recordDate.toDateString() === checkDate.toDateString();
        });
        
        if (hasActivityOnDate) {
          streak++;
        } else if (i > 0) { // Don't break on first day (today) if no activity
          break;
        }
      }
      
      return streak;
    } catch (error) {
      console.error('Error calculating current streak:', error);
      return 0;
    }
  }

  async calculateLongestStreak(userId) {
    try {
      const { default: Progress } = await import('../models/progress-model.js');
      
      const progressRecords = await Progress.find({ student: userId })
        .sort({ lastAccessed: 1 });
      
      if (progressRecords.length === 0) return 0;
      
      let longestStreak = 0;
      let currentStreak = 0;
      let lastDate = null;
      
      progressRecords.forEach(record => {
        const recordDate = new Date(record.lastAccessed);
        recordDate.setHours(0, 0, 0, 0);
        
        if (lastDate) {
          const dayDiff = Math.floor((recordDate - lastDate) / (1000 * 60 * 60 * 24));
          
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
      console.error('Error calculating longest streak:', error);
      return 0;
    }
  }

  calculateSkillPoints(progressRecords, certificates) {
    let skillPoints = 0;
    
    // Points from completed lessons
    progressRecords.forEach(progress => {
      skillPoints += progress.meta?.completedLessons * 10 || 0;
      skillPoints += progress.meta?.completedQuizzes * 25 || 0;
      skillPoints += progress.meta?.completedAssignments * 50 || 0;
    });
    
    // Bonus points from certificates
    certificates.forEach(cert => {
      if (cert.status === 'active') {
        const gradePoints = {
          'A+': 100, 'A': 90, 'A-': 85,
          'B+': 80, 'B': 75, 'B-': 70,
          'C+': 65, 'C': 60, 'C-': 55,
          'D': 50, 'F': 0
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
    if (enrollments.some(e => e.status === 'completed')) achievements++;
    
    // First certificate
    if (certificates.some(c => c.status === 'active')) achievements++;
    
    // Milestone achievements
    if (enrollments.length >= 5) achievements++; // Course Explorer
    if (enrollments.length >= 10) achievements++; // Learning Enthusiast
    if (certificates.length >= 3) achievements++; // Certificate Collector
    if (certificates.length >= 5) achievements++; // Expert Learner
    
    // Streak achievements
    const totalLearningTime = progressRecords.reduce((total, progress) => 
      total + (progress.meta?.totalTimeSpent || 0), 0);
    
    if (totalLearningTime >= 100) achievements++; // 100 hours of learning
    if (totalLearningTime >= 500) achievements++; // 500 hours of learning
    
    return achievements;
  }

  calculateAverageScore(progressRecords) {
    let totalScore = 0;
    let scoreCount = 0;
    
    progressRecords.forEach(progress => {
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
    
    enrollments.forEach(enrollment => {
      if (enrollment.course?.category) {
        categories[enrollment.course.category] = (categories[enrollment.course.category] || 0) + 1;
      }
    });
    
    return Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
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
        
        const hasActivityOnDate = user.activity_log.some(activity => {
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
      console.error('Error calculating consecutive active days:', error);
      return 0;
    }
  }

  async getStudyHoursThisWeek(userId) {
    try {
      const { default: Progress } = await import('../models/progress-model.js');
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const progressRecords = await Progress.find({
        student: userId,
        lastAccessed: { $gte: oneWeekAgo }
      });
      
      const totalMinutes = progressRecords.reduce((total, progress) => 
        total + (progress.meta?.totalTimeSpent || 0), 0);
      
      return Math.round(totalMinutes / 60 * 100) / 100; // Convert to hours with 2 decimal places
    } catch (error) {
      console.error('Error calculating study hours this week:', error);
      return 0;
    }
  }

  async getStudyHoursThisMonth(userId) {
    try {
      const { default: Progress } = await import('../models/progress-model.js');
      
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const progressRecords = await Progress.find({
        student: userId,
        lastAccessed: { $gte: oneMonthAgo }
      });
      
      const totalMinutes = progressRecords.reduce((total, progress) => 
        total + (progress.meta?.totalTimeSpent || 0), 0);
      
      return Math.round(totalMinutes / 60 * 100) / 100;
    } catch (error) {
      console.error('Error calculating study hours this month:', error);
      return 0;
    }
  }

  async getMostActiveDay(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.activity_log) return 'N/A';
      
      const dayActivity = {};
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      user.activity_log.forEach(activity => {
        const day = new Date(activity.timestamp).getDay();
        const dayName = dayNames[day];
        dayActivity[dayName] = (dayActivity[dayName] || 0) + 1;
      });
      
      const mostActiveDay = Object.entries(dayActivity)
        .sort(([,a], [,b]) => b - a)[0];
      
      return mostActiveDay ? mostActiveDay[0] : 'N/A';
    } catch (error) {
      console.error('Error calculating most active day:', error);
      return 'N/A';
    }
  }

  async getPreferredStudyTime(userId) {
    try {
      const { default: Progress } = await import('../models/progress-model.js');
      
      const progressRecords = await Progress.find({ student: userId });
      const hourActivity = {};
      
      progressRecords.forEach(progress => {
        const hour = new Date(progress.lastAccessed).getHours();
        hourActivity[hour] = (hourActivity[hour] || 0) + 1;
      });
      
      const mostActiveHour = Object.entries(hourActivity)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (mostActiveHour) {
        const hour = parseInt(mostActiveHour[0]);
        if (hour < 12) return `${hour === 0 ? 12 : hour} AM`;
        return `${hour === 12 ? 12 : hour - 12} PM`;
      }
      
      return 'N/A';
    } catch (error) {
      console.error('Error calculating preferred study time:', error);
      return 'N/A';
    }
  }

  calculateCommunityReputation(certificates, progressRecords) {
    let reputation = 0;
    
    // Base reputation from certificates
    certificates.forEach(cert => {
      if (cert.status === 'active') {
        reputation += cert.finalScore || 0;
      }
    });
    
    // Bonus reputation from consistent learning
    const totalLearningTime = progressRecords.reduce((total, progress) => 
      total + (progress.meta?.totalTimeSpent || 0), 0);
    
    reputation += Math.floor(totalLearningTime / 60); // 1 point per hour
    
    return Math.round(reputation);
  }

  calculateSubscriptionMonths(user) {
    if (!user.subscription_start || !user.subscription_end) return 0;
    
    const start = new Date(user.subscription_start);
    const end = new Date(user.subscription_end);
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + 
                      (end.getMonth() - start.getMonth());
    
    return Math.max(0, monthsDiff);
  }

  calculateAverageCoursePrice(enrollments) {
    const paidEnrollments = enrollments.filter(e => e.pricing_snapshot?.final_price > 0);
    
    if (paidEnrollments.length === 0) return 0;
    
    const totalPrice = paidEnrollments.reduce((total, enrollment) => 
      total + enrollment.pricing_snapshot.final_price, 0);
    
    return Math.round(totalPrice / paidEnrollments.length * 100) / 100;
  }

  getMostExpensiveCourse(enrollments) {
    const paidEnrollments = enrollments.filter(e => e.pricing_snapshot?.final_price > 0);
    
    if (paidEnrollments.length === 0) return null;
    
    const mostExpensive = paidEnrollments.reduce((max, enrollment) => 
      enrollment.pricing_snapshot.final_price > max.pricing_snapshot.final_price ? enrollment : max);
    
    return {
      course_title: mostExpensive.course?.title || 'Unknown Course',
      price: mostExpensive.pricing_snapshot.final_price,
      currency: mostExpensive.pricing_snapshot.currency
    };
  }

  getPaymentMethodsUsed(enrollments) {
    const methods = new Set();
    
    enrollments.forEach(enrollment => {
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
        email_verification_expires: { $gt: Date.now() }
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
        data: { user: { id: user._id, email: user.email, email_verified: user.email_verified } }
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
          token: require('crypto').randomBytes(40).toString('hex')
        },
        ENV_VARS.JWT_SECRET_KEY,
        { expiresIn: "7d" }
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
      if (status) query.is_active = status === 'active';

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

      const total = await User.countDocuments(query);

      res.status(200).json({
        success: true,
        count: users.length,
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        data: users,
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

      res.status(200).json({
        success: true,
        count: students.length,
        data: students,
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

      res.status(200).json({
        success: true,
        data: user,
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
        runValidators: true 
      }).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: user,
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
        { new: true, runValidators: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: user,
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
        data: {}
      };

      if (email) {
        const existingEmailUser = await User.findOne({ email: email.toLowerCase() });
        result.data.email = {
          value: email.toLowerCase(),
          available: !existingEmailUser,
          taken: !!existingEmailUser
        };
      }

      if (username) {
        const existingUsernameUser = await User.findOne({ username });
        result.data.username = {
          value: username,
          available: !existingUsernameUser,
          taken: !!existingUsernameUser
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
        .replace(/[^a-z0-9]/g, '') // Remove special characters
        .substring(0, 15); // Limit length

      // If base username is too short, use part of email
      if (baseUsername.length < 3) {
        const emailPart = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        baseUsername = emailPart.substring(0, 15);
      }

      // If still too short, use a default
      if (baseUsername.length < 3) {
        baseUsername = 'user';
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
      console.error('Error generating unique username:', error);
      // Fallback to timestamp-based username
      return `user${Date.now()}`;
    }
  }
}

// Create and export controller instance
const authController = new AuthController();
export default authController;
