import jwt from "jsonwebtoken";

import { ENV_VARS } from "../config/envVars.js";
import User from "../models/user-modal.js";
import { AppError } from "../utils/errorHandler.js";
import logger from "../utils/logger.js";
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Authentication middleware using access tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateToken = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      logger.warn('Authentication failed: No token provided', { 
        ip: req.ip, 
        path: req.originalUrl
      });
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Verify token
    const user = verifyAccessToken(token);
    
    if (!user) {
      logger.warn('Authentication failed: Invalid token', { 
        ip: req.ip, 
        path: req.originalUrl 
      });
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error', { 
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ success: false, message: 'Authentication error' });
  }
};

/**
 * Role-based authorization middleware
 * @param {string|string[]} roles - Role or array of roles allowed to access the resource
 * @returns {Function} Express middleware function
 */
export const authorize = (roles) => {
  // Convert single role to array
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    try {
      // User must be authenticated first
      if (!req.user) {
        logger.warn('Authorization failed: User not authenticated', { 
          path: req.originalUrl 
        });
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Authorization failed: Insufficient permissions', { 
          userId: req.user.id, 
          userRole: req.user.role, 
          requiredRoles: allowedRoles,
          path: req.originalUrl
        });
        return res.status(403).json({ success: false, message: 'Insufficient permissions' });
      }

      // User is authorized
      next();
    } catch (error) {
      logger.error('Authorization error', { 
        error: error.message,
        stack: error.stack
      });
      return res.status(500).json({ success: false, message: 'Authorization error' });
    }
  };
};

/**
 * Middleware to verify student ownership
 */
const verifyStudentOwnership = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const userId = req.user._id;

    // Allow access if user is admin or instructor
    if (req.user.role === "admin" || req.user.role === "instructor") {
      return next();
    }

    // For students, verify they own the resource
    if (student_id !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only access your own data.",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error verifying student ownership",
    });
  }
};

// Verify JWT token
export const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new AppError("No token provided", 401));
    }

    // Verify token
    const decoded = jwt.verify(token, ENV_VARS.JWT_SECRET_KEY);

    // Get user from database
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return next(new AppError("User not found", 401));
    }

    // Add user to request
    req.user = user;

    next();
  } catch (_error) {
    logger.error("Auth error:", _error);
    return next(new AppError("Invalid token", 401));
  }
};

// Check if user is admin
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    next(new AppError("Access denied. Admin only.", 403));
  }
};

// Check if user is instructor
export const isInstructor = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === "instructor" || req.user.role === "admin")
  ) {
    next();
  } else {
    next(new AppError("Access denied. Instructor only.", 403));
  }
};

// Check if user is student
export const isStudent = (req, res, next) => {
  if (req.user && (req.user.role === "student" || req.user.role === "admin")) {
    next();
  } else {
    next(new AppError("Access denied. Student only.", 403));
  }
};

export default {
  authenticateToken,
  authorize,
  verifyStudentOwnership
};
