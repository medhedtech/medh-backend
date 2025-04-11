import crypto from "crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { ENV_VARS } from "../config/envVars.js";
import User, {
  USER_ROLES,
  USER_PERMISSIONS,
  USER_ADMIN_ROLES,
} from "../models/user-modal.js";
import EmailService from "../services/emailService.js";
import logger from "../utils/logger.js";
import userValidation from "../validations/userValidation.js";

// Initialize email service
const emailService = new EmailService();

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
      } = value;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        logger.auth.warn("Registration attempt with existing email", { email });
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Create user with default student role
      const user = new User({
        full_name,
        email,
        phone_numbers,
        password,
        agree_terms,
        role: [USER_ROLES.STUDENT],
        status: "Active",
        meta: meta || {
          gender: "Male",
          upload_resume: [],
          age: "",
          age_group: "",
          category: "",
        },
        assign_department: [],
        permissions: [],
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
        email,
      });

      // Send welcome email to the user
      try {
        await this.sendWelcomeEmail(email, full_name, password);
      } catch (emailError) {
        logger.auth.error("Welcome email sending failed", {
          error: emailError,
          email,
        });
        // Continue registration even if email sending fails
      }

      return res.status(201).json({
        success: true,
        message: "User registered successfully, and email sent to the user.",
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
   * Send welcome email to newly registered user
   * @param {string} email - User's email
   * @param {string} fullName - User's full name
   * @param {string} password - User's password
   */
  async sendWelcomeEmail(email, fullName, password) {
    try {
      return await emailService.sendWelcomeEmail(email, fullName, { password });
    } catch (error) {
      logger.auth.error("Failed to send welcome email", { error, email });
      throw error;
    }
  }

  /**
   * Login a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async loginUser(req, res) {
    try {
      const { email, password } = req.body;

      logger.auth.debug("Login attempt", { email, ip: req.ip });

      // Find the user by email
      const user = await User.findOne({ email });
      if (!user) {
        logger.auth.warn("Login failed - user not found", {
          email,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          message: "Invalid credentials.",
        });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logger.auth.warn("Login failed - invalid password", {
          userId: user._id,
          email,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Generate JWT token
      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      };

      const token = jwt.sign(payload, ENV_VARS.JWT_SECRET_KEY, {
        expiresIn: "24h",
      });

      // Determine permissions based on admin role
      const permissions =
        user.admin_role === USER_ADMIN_ROLES.SUPER_ADMIN
          ? Object.values(USER_PERMISSIONS)
          : user.permissions || [];

      logger.auth.info("User logged in successfully", {
        userId: user._id,
        email,
        roles: user.role,
        ip: req.ip,
      });

      return res.status(200).json({
        success: true,
        message: "User logged in successfully",
        token,
        id: user.id,
        role: user.admin_role,
        permissions,
      });
    } catch (err) {
      logger.auth.error("Login failed", {
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
   * Get all users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllUsers(req, res) {
    try {
      const users = await User.find().select("-password");

      return res.status(200).json({
        success: true,
        count: users.length,
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
   * Get all users with the STUDENT role
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllStudents(req, res) {
    try {
      const students = await User.find({ role: USER_ROLES.STUDENT });

      if (!students || students.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No students found",
        });
      }

      res.status(200).json({
        success: true,
        count: students.length,
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
   * Update a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateUser(req, res) {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true },
      );

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

      // Prevent password update via this endpoint
      if (updateData.password) {
        delete updateData.password;
      }

      const user = await User.findOneAndUpdate(
        { email },
        { $set: updateData },
        { new: true, runValidators: true },
      );

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
      logger.error("Error updating user by email:", err);
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
  async toggleStudentStatus(req, res) {
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

      // Find the user
      const user = await User.findOne({ email });
      if (!user) {
        logger.auth.warn("Forgot password attempt for non-existent user", {
          email,
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
          email,
          user.full_name,
          tempPassword,
        );

        logger.auth.info("Password reset email sent", { email });
        return res.status(200).json({
          success: true,
          message: "Password reset email sent",
        });
      } catch (emailError) {
        logger.auth.error("Failed to send password reset email", {
          error: emailError,
          email,
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
}

// Create and export controller instance
const authController = new AuthController();
export default authController;
