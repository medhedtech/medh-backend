import Admin from "../models/admin-model.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

class AdminAuthController {
  constructor() {
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.getProfile = this.getProfile.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
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
      const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "MEDH_ADMIN_SECRET_2024";
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

      // Log admin login
      console.log(`🔐 ADMIN LOGIN: ${admin.email} (${admin.admin_role}) from ${sessionData.ip_address}`);

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
}

export default new AdminAuthController();

