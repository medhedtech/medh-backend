import crypto from "crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

import { ENV_VARS } from "../config/envVars.js";
import User, {
  USER_ROLES,
  USER_PERMISSIONS,
  USER_ADMIN_ROLES,
} from "../models/user-modal.js";
import logger from "../utils/logger.js";
import userValidation from "../validations/userValidation.js";

/**
 * Email Service Configuration
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === "true" || true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    this.verifyConnection();
  }

  verifyConnection() {
    this.transporter.verify((_error, _success) => {
      if (_error) {
        logger.error("Email configuration error:", _error);
        this.handleConnectionError(_error);
      } else {
        logger.info("Email server is ready to send messages");
      }
    });
  }

  handleConnectionError(error) {
    if (error.code === "EAUTH") {
      logger.error("Authentication failed. Please check your credentials.");
      logger.error("If using Gmail, make sure to:");
      logger.error("1. Enable 2-Step Verification in your Google Account");
      logger.error("2. Generate an App Password from Google Account settings");
      logger.error("3. Use the App Password instead of your regular password");
    } else if (error.code === "EDNS") {
      logger.error(
        "DNS lookup failed. Please check your internet connection and SMTP server settings.",
      );
    }
  }

  async sendEmail(mailOptions) {
    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info("Email sent successfully:", info.messageId);
      return true;
    } catch (error) {
      logger.error("Email sending failed:", error);

      if (error.code === "EAUTH") {
        throw new Error(
          "Email authentication failed. Please check your email credentials.",
        );
      } else if (error.code === "ESOCKET") {
        throw new Error(
          "Email connection failed. Please check your internet connection.",
        );
      } else {
        throw new Error("Failed to send email. Please try again later.");
      }
    }
  }
}

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
        logger.warn("Validation Error:", error.details[0].message);
        logger.debug("Request Body:", req.body);
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

      // Log the user object before saving for debugging
      logger.debug("User object before saving:", JSON.stringify(user, null, 2));

      // Save the user to database
      await user.save();

      // Send welcome email to the user
      try {
        await this.sendWelcomeEmail(email, full_name, password);
      } catch (emailError) {
        logger.error("Email sending failed:", emailError);
        // Continue registration even if email sending fails
      }

      return res.status(201).json({
        success: true,
        message: "User registered successfully, and email sent to the user.",
      });
    } catch (err) {
      logger.error("Registration Error:", err);
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
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Medh Learning Platform",
      html: `
        <h2>Welcome, ${fullName}!</h2>
        <p>Thank you for registering with us. Here are your login credentials:</p>
        <ul>
          <li><strong>Username:</strong> ${email}</li>
          <li><strong>Password:</strong> ${password}</li>
        </ul>
        <p>Please keep this information secure. If you did not request this, please contact us immediately.</p>
      `,
    };

    return emailService.sendEmail(mailOptions);
  }

  /**
   * Login a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async loginUser(req, res) {
    try {
      const { email, password } = req.body;

      // Find the user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid credentials.",
        });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
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

      return res.status(200).json({
        success: true,
        message: "User logged in successfully",
        token,
        id: user.id,
        role: user.admin_role,
        permissions,
      });
    } catch (err) {
      logger.error("Login Error:", err);
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
   * Handle forgot password request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Find the user
      const user = await User.findOne({ email });
      if (!user) {
        // It's generally better not to reveal if an email exists for security reasons
        // Send a generic success message regardless
        logger.warn(
          `Password reset requested for non-existent email: ${email}`,
        );
        return res.status(200).json({
          success: true,
          message:
            "If an account with that email exists, a password reset link has been sent.",
        });
      }

      // Generate secure reset token (plain text version)
      const resetToken = crypto.randomBytes(32).toString("hex");

      // Hash the token before storing it in the database
      const resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      // Set token expiry time (e.g., 1 hour from now)
      const resetPasswordExpires = Date.now() + 3600000; // 1 hour in milliseconds

      // Update user with hashed reset token and expiry
      user.resetPasswordToken = resetPasswordToken;
      user.resetPasswordExpires = resetPasswordExpires;
      await user.save();

      // Construct the password reset URL (Replace with your frontend URL)
      const resetUrl = `${ENV_VARS.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

      // Send email with the reset link
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Password Reset Request",
          html: `
            <h2>Password Reset Request</h2>
            <p>You (or someone else) requested a password reset for your account.</p>
            <p>Click the link below to set a new password:</p>
            <p><a href="${resetUrl}" target="_blank">Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
          `,
        };

        await emailService.sendEmail(mailOptions);

        return res.status(200).json({
          success: true,
          message:
            "If an account with that email exists, a password reset link has been sent.",
        });
      } catch (emailError) {
        logger.error("Error sending password reset email:", emailError);
        // Clear the token if email fails to prevent misuse
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return res.status(500).json({
          success: false,
          message: "Failed to send password reset email",
          error: emailError.message,
        });
      }
    } catch (err) {
      logger.error("Error in forgot password process:", err);
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
