import Admin from "../models/admin-model.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

class AdminAuthController {
  constructor() {
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.getProfile = this.getProfile.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.verifyTempPassword = this.verifyTempPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
  }

  // Generate JWT token for admin
  generateToken(adminId) {
    return jwt.sign(
      { 
        id: adminId, 
        type: 'admin',
        timestamp: Date.now() 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "24h" }
    );
  }

  // Admin Registration (Super Secure - Only for authorized personnel)
  async register(req, res) {
    try {
      const {
        full_name,
        email,
        password,
        admin_role = "admin",
        permissions = [],
        phone,
        department,
        designation,
        secret_key // Special secret key for admin registration
      } = req.body;

      // Validate required fields
      if (!full_name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Full name, email, and password are required",
        });
      }

      // Super secure check - only allow registration with secret key
      const { ENV_VARS } = await import('../config/envVars.js');
      const ADMIN_SECRET_KEY = ENV_VARS.ADMIN_SECRET_KEY;
      if (secret_key !== ADMIN_SECRET_KEY) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized admin registration attempt",
        });
      }

      // Check if admin already exists
      const existingAdmin = await Admin.findByEmail(email);
      if (existingAdmin) {
        return res.status(409).json({
          success: false,
          message: "Admin with this email already exists",
        });
      }

      // Password validation
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long",
        });
      }

      // Create new admin
      const adminData = {
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        password,
        admin_role,
        permissions: Array.isArray(permissions) ? permissions : [],
        phone: phone?.trim(),
        department: department?.trim(),
        designation: designation?.trim(),
        is_verified: true, // Auto-verify admin accounts
        created_by: req.admin?.id || null,
      };

      const admin = await Admin.create(adminData);

      // Generate token
      const token = this.generateToken(admin._id);

      // Create session
      const sessionData = {
        session_id: uuidv4(),
        device_id: req.headers["x-device-id"] || "unknown",
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers["user-agent"],
      };

      await admin.createSession(sessionData);

      // Log admin registration
      console.log(`🔐 NEW ADMIN REGISTERED: ${admin.email} (${admin.admin_role})`);

      res.status(201).json({
        success: true,
        message: "Admin registered successfully",
        data: {
          admin: {
            id: admin._id,
            full_name: admin.full_name,
            email: admin.email,
            admin_role: admin.admin_role,
            permissions: admin.permissions,
            department: admin.department,
            designation: admin.designation,
          },
          token,
          session_id: sessionData.session_id,
        },
      });
    } catch (error) {
      console.error("❌ Admin registration error:", error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Admin with this email already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error during admin registration",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Admin Login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // Find admin by email
      const admin = await Admin.findByEmail(email);
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Check if account is locked
      if (admin.isLocked) {
        return res.status(423).json({
          success: false,
          message: "Account is temporarily locked due to too many failed attempts",
        });
      }

      // Check if account is active
      if (!admin.is_active) {
        return res.status(403).json({
          success: false,
          message: "Admin account is deactivated",
        });
      }

      // Verify password
      const isPasswordValid = await admin.comparePassword(password);
      if (!isPasswordValid) {
        // Increment failed login attempts
        await admin.incLoginAttempts();
        
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Reset failed login attempts on successful login
      if (admin.failed_login_attempts > 0) {
        await admin.resetLoginAttempts();
      }

      // Update last login
      admin.last_login = new Date();
      admin.last_activity = new Date();
      await admin.save();

      // Generate token
      const token = this.generateToken(admin._id);

      // Create session
      const sessionData = {
        session_id: uuidv4(),
        device_id: req.headers["x-device-id"] || "unknown",
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers["user-agent"],
      };

      await admin.createSession(sessionData);

      // Track device for admin login notifications
      const deviceInfo = {
        device_id: sessionData.device_id,
        ip_address: sessionData.ip_address,
        device_name: req.headers["user-agent"] || "Unknown Device",
        browser: this.extractBrowser(req.headers["user-agent"]),
        operating_system: this.extractOS(req.headers["user-agent"]),
        device_type: this.extractDeviceType(req.headers["user-agent"]),
        user_agent: req.headers["user-agent"],
      };
      
      // Add/update device tracking
      await admin.addDevice(deviceInfo);

      // Log admin login
      console.log(`🔐 ADMIN LOGIN: ${admin.email} (${admin.admin_role}) from ${sessionData.ip_address}`);

      // Send admin login notification email
      try {
        const authController = (await import('./authController.js')).default;
        const authInstance = new authController();
        
        const locationInfo = {
          city: "Unknown", // You can integrate with IP geolocation service
          country: "Unknown",
        };
        
        // Send notification for admin logins (high security)
        // Only send if it's a new device or first login in 24 hours
        const shouldNotify = authInstance.isNewDevice(admin, deviceInfo) || 
                           !admin.last_login || 
                           (Date.now() - admin.last_login.getTime()) > 24 * 60 * 60 * 1000;
        
        if (shouldNotify) {
          await authInstance.sendAdminLoginNotification(admin, deviceInfo, locationInfo);
          console.log('🚨 Admin login notification sent to:', admin.email);
        } else {
          console.log('📱 Admin login from known device, notification skipped:', admin.email);
        }
      } catch (notificationError) {
        console.log('❌ Admin login notification failed:', notificationError.message);
        // Don't block login if notification fails
      }

      res.status(200).json({
        success: true,
        message: "Admin login successful",
        data: {
          admin: {
            id: admin._id,
            full_name: admin.full_name,
            email: admin.email,
            admin_role: admin.admin_role,
            permissions: admin.permissions,
            department: admin.department,
            designation: admin.designation,
            last_login: admin.last_login,
          },
          token,
          session_id: sessionData.session_id,
        },
      });
    } catch (error) {
      console.error("❌ Admin login error:", error);
      
      res.status(500).json({
        success: false,
        message: "Internal server error during admin login",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Admin Logout
  async logout(req, res) {
    try {
      const admin = await Admin.findById(req.admin.id);
      if (admin) {
        // Invalidate current session
        const sessionId = req.headers["x-session-id"];
        if (sessionId && admin.sessions) {
          const sessionIndex = admin.sessions.findIndex(
            session => session.session_id === sessionId
          );
          if (sessionIndex !== -1) {
            admin.sessions[sessionIndex].is_active = false;
            admin.sessions[sessionIndex].invalidated_at = new Date();
            await admin.save();
          }
        }

        console.log(`🔐 ADMIN LOGOUT: ${admin.email}`);
      }

      res.status(200).json({
        success: true,
        message: "Admin logout successful",
      });
    } catch (error) {
      console.error("❌ Admin logout error:", error);
      
      res.status(500).json({
        success: false,
        message: "Error during admin logout",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get Admin Profile
  async getProfile(req, res) {
    try {
      const admin = await Admin.findById(req.admin.id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Admin profile retrieved successfully",
        data: {
          admin: {
            id: admin._id,
            full_name: admin.full_name,
            email: admin.email,
            admin_role: admin.admin_role,
            permissions: admin.permissions,
            phone: admin.phone,
            department: admin.department,
            designation: admin.designation,
            last_login: admin.last_login,
            last_activity: admin.last_activity,
            created_at: admin.created_at,
          },
        },
      });
    } catch (error) {
      console.error("❌ Get admin profile error:", error);
      
      res.status(500).json({
        success: false,
        message: "Error retrieving admin profile",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update Admin Profile
  async updateProfile(req, res) {
    try {
      const {
        full_name,
        phone,
        department,
        designation,
      } = req.body;

      const updateData = {};
      if (full_name) updateData.full_name = full_name.trim();
      if (phone) updateData.phone = phone.trim();
      if (department) updateData.department = department.trim();
      if (designation) updateData.designation = designation.trim();

      const admin = await Admin.findByIdAndUpdate(
        req.admin.id,
        { ...updateData, last_activity: new Date() },
        { new: true, runValidators: true }
      );

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      console.log(`🔐 ADMIN PROFILE UPDATED: ${admin.email}`);

      res.status(200).json({
        success: true,
        message: "Admin profile updated successfully",
        data: {
          admin: {
            id: admin._id,
            full_name: admin.full_name,
            email: admin.email,
            admin_role: admin.admin_role,
            permissions: admin.permissions,
            phone: admin.phone,
            department: admin.department,
            designation: admin.designation,
            last_activity: admin.last_activity,
          },
        },
      });
    } catch (error) {
      console.error("❌ Update admin profile error:", error);
      
      res.status(500).json({
        success: false,
        message: "Error updating admin profile",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Admin Forgot Password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Validate required fields
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      // Normalize email to lowercase for case-insensitive handling
      const normalizedEmail = email.toLowerCase().trim();

      // Find admin by email
      const admin = await Admin.findByEmail(normalizedEmail);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found with this email address",
        });
      }

      // Check if admin account is active
      if (!admin.is_active) {
        return res.status(403).json({
          success: false,
          message: "Admin account is deactivated",
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

      // Update admin with reset token info
      admin.password_reset_token = resetPasswordToken;
      admin.password_reset_expires = resetPasswordExpires;

      // Generate temporary password
      const tempPassword = crypto.randomBytes(6).toString("hex").toUpperCase();

      // Hash the temporary password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(tempPassword, salt);

      // Update admin password with temporary password (already hashed)
      admin.password = hashedPassword;
      
      // Skip pre-save hook for this save since password is already hashed
      admin._skipPasswordHash = true;
      await admin.save();
      delete admin._skipPasswordHash;

      // Send admin password reset email
      try {
        const emailService = (await import("../services/emailService.js")).default;
        
        const adminData = {
          name: admin.full_name,
          email: admin.email,
          department: admin.department,
          designation: admin.designation,
          admin_role: admin.admin_role,
        };

        await emailService.sendAdminPasswordResetEmail(
          admin.email,
          admin.full_name,
          tempPassword,
          adminData
        );

        console.log(`🔑 Admin password reset email sent to: ${admin.email}`);
        console.log(`🔐 Temporary password: ${tempPassword}`);
      } catch (emailError) {
        console.error("Failed to send admin password reset email:", emailError);
        // Continue with success response even if email fails
      }

      // Log admin password reset activity
      console.log(`🔐 ADMIN PASSWORD RESET: ${admin.email} (${admin.admin_role})`);

      res.status(200).json({
        success: true,
        message: "Admin password reset successful. Check your email for the temporary password.",
        data: {
          email: admin.email,
          expires_in: "1 hour",
          admin_role: admin.admin_role,
        },
      });
    } catch (error) {
      console.error("❌ Admin forgot password error:", error);
      
      res.status(500).json({
        success: false,
        message: "Internal server error during admin password reset",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Admin Verify Temporary Password
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

      // Find admin by email
      const admin = await Admin.findByEmail(normalizedEmail);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found with this email address",
        });
      }

      // Check if admin has an active reset token (indicating they requested password reset)
      if (
        !admin.password_reset_token ||
        !admin.password_reset_expires ||
        admin.password_reset_expires <= Date.now()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No valid password reset request found. Please request a new password reset.",
        });
      }

      // Check if admin account is active
      if (!admin.is_active) {
        return res.status(403).json({
          success: false,
          message: "Admin account is deactivated",
        });
      }

      // Verify the temporary password against the hashed password stored in admin.password
      const isMatch = await bcrypt.compare(tempPassword, admin.password);

      if (!isMatch) {
        // Increment failed attempts
        admin.failed_login_attempts = (admin.failed_login_attempts || 0) + 1;
        admin.last_failed_login = new Date();
        
        // Lock account after 5 failed attempts
        if (admin.failed_login_attempts >= 5) {
          admin.account_locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }
        
        await admin.save();

        return res.status(400).json({
          success: false,
          message: "Incorrect temporary password. Please check your email for the correct temporary password.",
          attempts_remaining: Math.max(0, 5 - admin.failed_login_attempts),
        });
      }

      // Reset failed attempts on successful verification
      admin.failed_login_attempts = 0;
      admin.last_failed_login = null;
      admin.account_locked_until = null;
      await admin.save();

      return res.status(200).json({
        success: true,
        message: "Temporary password verified successfully. You can now set a new password.",
        data: {
          email: normalizedEmail,
          admin_role: admin.admin_role,
          verified: true,
        },
      });
    } catch (error) {
      console.error("❌ Admin verify temp password error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during temporary password verification",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Admin Reset Password (requires temp password verification first)
  async resetPassword(req, res) {
    try {
      const { email, tempPassword, newPassword, confirmPassword } = req.body;

      // Validate input
      if (!email || !tempPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Email, temporary password, new password, and confirm password are required",
          errors: {
            email: !email ? "Email is required" : null,
            tempPassword: !tempPassword ? "Temporary password is required" : null,
            newPassword: !newPassword ? "New password is required" : null,
            confirmPassword: !confirmPassword ? "Confirm password is required" : null,
          },
        });
      }

      // Check if passwords match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "New password and confirm password do not match",
        });
      }

      // Password strength validation for admin accounts
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Admin password must be at least 8 characters long",
        });
      }

      // Find admin by email
      const admin = await Admin.findByEmail(email.toLowerCase());
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found with this email address",
        });
      }

      // Check if admin has an active reset token (indicating they requested password reset)
      if (
        !admin.password_reset_token ||
        !admin.password_reset_expires ||
        admin.password_reset_expires <= Date.now()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No valid password reset request found. Please request a new password reset.",
        });
      }

      // Check if admin account is active
      if (!admin.is_active) {
        return res.status(403).json({
          success: false,
          message: "Admin account is deactivated",
        });
      }

      // Verify the temporary password first
      const isMatch = await bcrypt.compare(tempPassword, admin.password);
      if (!isMatch) {
        // Increment failed attempts
        admin.failed_login_attempts = (admin.failed_login_attempts || 0) + 1;
        admin.last_failed_login = new Date();
        
        // Lock account after 5 failed attempts
        if (admin.failed_login_attempts >= 5) {
          admin.account_locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }
        
        await admin.save();

        return res.status(400).json({
          success: false,
          message: "Incorrect temporary password. Please check your email for the correct temporary password.",
          attempts_remaining: Math.max(0, 5 - admin.failed_login_attempts),
        });
      }

      // Set the new password (will be hashed by the pre-save hook)
      admin.password = newPassword;

      // Clear reset token fields
      admin.password_reset_token = undefined;
      admin.password_reset_expires = undefined;

      // Reset failed login attempts and unlock account
      admin.failed_login_attempts = 0;
      admin.lock_until = undefined;

      // Update last activity
      admin.last_activity = new Date();

      await admin.save();

      // End all active sessions for security
      await admin.invalidateAllSessions();

      // Log admin password reset completion
      console.log(`🔐 ADMIN PASSWORD RESET COMPLETED: ${admin.email} (${admin.admin_role})`);

      res.status(200).json({
        success: true,
        message: "Admin password reset successfully. Please login with your new password.",
        data: {
          admin: {
            id: admin._id,
            email: admin.email,
            admin_role: admin.admin_role,
          },
        },
      });
    } catch (error) {
      console.error("❌ Admin reset password error:", error);
      
      res.status(500).json({
        success: false,
        message: "Internal server error during admin password reset",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Helper methods for device info extraction
  extractBrowser(userAgent) {
    if (!userAgent) return "Unknown Browser";
    
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    if (userAgent.includes("Opera")) return "Opera";
    
    return "Unknown Browser";
  }

  extractOS(userAgent) {
    if (!userAgent) return "Unknown OS";
    
    if (userAgent.includes("Windows")) return "Windows";
    if (userAgent.includes("Mac OS")) return "macOS";
    if (userAgent.includes("Linux")) return "Linux";
    if (userAgent.includes("Android")) return "Android";
    if (userAgent.includes("iOS")) return "iOS";
    
    return "Unknown OS";
  }

  extractDeviceType(userAgent) {
    if (!userAgent) return "Unknown Device";
    
    if (userAgent.includes("Mobile")) return "Mobile";
    if (userAgent.includes("Tablet")) return "Tablet";
    
    return "Desktop";
  }
}

export default new AdminAuthController();



