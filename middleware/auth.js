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
export const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      logger.warn('Authentication failed: No token provided', { 
        ip: req.ip, 
        path: req.originalUrl,
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required',
        error_code: 'NO_TOKEN_PROVIDED',
        hint: 'Please include Authorization header with Bearer token'
      });
    }

    // Try to verify token with new JWT utility first
    let user = verifyAccessToken(token);
    
    // If new verification fails, try old verification method as fallback
    if (!user) {
      try {
        const decoded = jwt.verify(token, ENV_VARS.JWT_SECRET_KEY);
        
        // Handle legacy token formats
        if (decoded.user) {
          // Old auth service format
          user = {
            id: decoded.user.id,
            role: decoded.user.role,
            _id: decoded.user.id
          };
        } else if (decoded.id) {
          // Direct format
          user = {
            id: decoded.id,
            role: decoded.role,
            email: decoded.email,
            _id: decoded.id
          };
        }
        
        if (user) {
          logger.debug('Token verified using fallback method', { 
            userId: user.id, 
            format: decoded.user ? 'legacy' : 'direct'
          });
        }
      } catch (fallbackError) {
        logger.warn('Both primary and fallback token verification failed', {
          primaryError: 'verifyAccessToken returned null',
          fallbackError: fallbackError.message
        });
      }
    }
    
    if (!user) {
      logger.warn('Token verification failed', { 
        ip: req.ip, 
        path: req.originalUrl,
        tokenPrefix: token.substr(0, 20) + '...',
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token',
        error_code: 'INVALID_TOKEN',
        hint: 'Please refresh your token or login again'
      });
    }

    // Attach user to request
    req.user = user;
    logger.debug('Authentication successful', { 
      userId: user.id, 
      role: user.role, 
      path: req.originalUrl 
    });
    next();
  } catch (error) {
    logger.error('Authentication error', { 
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      path: req.originalUrl
    });
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error',
      error_code: 'AUTH_SERVER_ERROR'
    });
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

      // Handle both string and array roles
      const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
      const hasPermission = userRoles.some(role => allowedRoles.includes(role));
      
      if (!hasPermission) {
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
  if (req.user) {
    // Handle both array and string roles
    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    if (userRoles.includes("admin")) {
      return next();
    }
  }
  next(new AppError("Access denied. Admin only.", 403));
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
