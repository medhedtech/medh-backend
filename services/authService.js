import crypto from "crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { ENV_VARS } from "../config/envVars.js";
import User, {
  USER_ROLES,
  USER_PERMISSIONS,
  USER_ADMIN_ROLES,
} from "../models/user-modal.js";
import logger from "../utils/logger.js";

import EmailService from "./emailService.js";

/**
 * Authentication Service
 * Handles all business logic related to authentication
 */
class AuthService {
  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Register a new user
   * @param {Object} userData - User data for registration
   * @returns {Object} Newly created user
   */
  async registerUser(userData) {
    const {
      full_name,
      email,
      phone_numbers,
      password,
      agree_terms,
      status = "Active",
      meta = { gender: "Male", upload_resume: [] },
    } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("User already exists");
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

    // Send welcome email
    try {
      await this.sendWelcomeEmail(email, full_name, password);
    } catch (error) {
      logger.error("Failed to send welcome email:", error);
      // Continue even if email sending fails
    }

    return user;
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

    return this.emailService.sendEmail(mailOptions);
  }

  /**
   * Authenticate a user and generate JWT token
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Object} Authentication data including token
   */
  async loginUser(email, password) {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid credentials");
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

    return {
      token,
      id: user.id,
      role: user.admin_role,
      permissions,
    };
  }

  /**
   * Get all users
   * @param {Object} filters - Optional filters for user query
   * @returns {Array} List of users
   */
  async getAllUsers(filters = {}) {
    return User.find(filters).select("-password");
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Object} User data
   */
  async getUserById(userId) {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  /**
   * Update user by ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user
   */
  async updateUser(userId, updateData) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  /**
   * Update user by email
   * @param {string} email - User email
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user
   */
  async updateUserByEmail(email, updateData) {
    // Prevent password update via this method
    if (updateData.password) {
      delete updateData.password;
    }

    const user = await User.findOneAndUpdate(
      { email },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  /**
   * Delete user by ID
   * @param {string} userId - User ID
   * @returns {boolean} Success status
   */
  async deleteUser(userId) {
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      throw new Error("User not found");
    }

    return true;
  }

  /**
   * Toggle user active/inactive status
   * @param {string} userId - User ID
   * @returns {Object} Updated user
   */
  async toggleUserStatus(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Toggle the status
    user.status = user.status === "Active" ? "Inactive" : "Active";
    await user.save();

    return user;
  }

  /**
   * Handle forgot password process
   * @param {string} email - User email
   * @returns {boolean} Success status
   */
  async forgotPassword(email) {
    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found");
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

    // Send email with temporary password
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset - Temporary Password",
      html: `
        <h2>Password Reset</h2>
        <p>You have requested to reset your password. Here is your temporary password:</p>
        <p><strong>${tempPassword}</strong></p>
        <p>Please use this temporary password to log in, then change your password immediately.</p>
        <p>This temporary password will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      `,
    };

    await this.emailService.sendEmail(mailOptions);

    return true;
  }
}

// Create and export service instance
const authService = new AuthService();
export default authService;
