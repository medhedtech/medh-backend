import jwt from "jsonwebtoken";

import { ENV_VARS } from "../config/envVars.js";
import User from "../models/user-modal.js";
import { AppError } from "../utils/errorHandler.js";
import logger from "../utils/logger.js";
import dbUtils from "../utils/dbUtils.js";
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Helper function to check if user has a specific role
 * Implements role hierarchy: super-admin > admin > instructor > student
 * @param {string|string[]} userRole - User's role(s)
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {boolean} - Whether user has the required role
 */
const hasRole = (userRole, requiredRoles) => {
  const userRoles = Array.isArray(userRole) ? userRole : [userRole];
  const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  // Super-admin has access to everything
  if (userRoles.includes('super-admin')) {
    return true;
  }
  
  // Check for direct role match
  if (userRoles.some(role => required.includes(role))) {
    return true;
  }
  
  // admin can access anything that instructor or student can access
  if (userRoles.includes('admin')) {
    if (required.includes('instructor') || required.includes('student')) {
      return true;
    }
  }
  
  // instructor can access anything that student can access
  if (userRoles.includes('instructor')) {
    if (required.includes('student')) {
      return true;
    }
  }
  
  // sales-admin can access sales-team resources
  if (userRoles.includes('sales-admin')) {
    if (required.includes('sales_team')) {
      return true;
    }
  }
  
  // support-admin can access support-team resources
  if (userRoles.includes('support-admin')) {
    if (required.includes('support_team')) {
      return true;
    }
  }
  
  return false;
};

/**
 * Authentication middleware using access tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // Check if JWT_SECRET_KEY is available
    if (!ENV_VARS.JWT_SECRET_KEY) {
      logger.error('JWT_SECRET_KEY is not configured', {
        path: req.originalUrl,
        envVarsKeys: Object.keys(ENV_VARS)
      });
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error',
        error_code: 'MISSING_JWT_SECRET'
      });
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.split(' ')[1];
    
    // Fallback to x-access-token header if no Authorization header
    if (!token) {
      token = req.headers['x-access-token'];
    }

    if (!token) {
      logger.warn('Authentication failed: No token provided', { 
        ip: req.ip, 
        path: req.originalUrl,
        userAgent: req.headers['user-agent'],
        hasAuthHeader: !!authHeader,
        hasXAccessToken: !!req.headers['x-access-token']
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required',
        error_code: 'NO_TOKEN_PROVIDED',
        hint: 'Please include Authorization header with Bearer token'
      });
    }

    // Use direct JWT verification
    let decoded = null;
    let user = null;
    
    try {
      decoded = jwt.verify(token, ENV_VARS.JWT_SECRET_KEY);
      logger.debug('JWT token verified successfully', { 
        tokenType: decoded.type,
        userId: decoded.id || decoded.userId,
        email: decoded.email,
        role: decoded.role,
        hasUserId: !!decoded.userId,
        hasId: !!decoded.id,
        hasUser: !!decoded.user
      });
    } catch (jwtError) {
      logger.warn('JWT token verification failed', {
        error: jwtError.message,
        tokenPrefix: token.substr(0, 20) + '...',
        path: req.originalUrl
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token',
        error_code: 'INVALID_TOKEN',
        hint: 'Please refresh your token or login again'
      });
    }

    // Handle different token formats
    if (decoded.user) {
      // Old auth service format
      user = {
        id: decoded.user.id,
        role: decoded.user.role,
        email: decoded.user.email,
        _id: decoded.user.id
      };
    } else if (decoded.id) {
      // Direct format (current format)
      user = {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email,
        _id: decoded.id
      };
    } else if (decoded.userId) {
      // Legacy format with userId
      user = {
        id: decoded.userId,
        role: decoded.role || 'student',
        email: decoded.email,
        _id: decoded.userId
      };
    }
    
    if (!user) {
      logger.warn('Could not extract user from token', { 
        decodedKeys: Object.keys(decoded),
        tokenType: decoded.type,
        path: req.originalUrl
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format',
        error_code: 'INVALID_TOKEN_FORMAT'
      });
    }

    // If we have a legacy token with minimal user data, fetch full user details
    if (user.id && (!user.email || !user.role || user.role === 'student' || (!decoded.role && decoded.userId))) {
      try {
        logger.debug('Fetching user details from database', { userId: user.id });
        let fullUser = await dbUtils.findById(User, user.id, { select: '-password' });
        let isAdminUser = false;
        
        // If user not found in users collection, check admins collection
        if (!fullUser) {
          try {
            const Admin = (await import('../models/admin-model.js')).default;
            const admin = await Admin.findById(user.id).select('-password');
            
            if (admin) {
              logger.debug('Admin found in admins collection for token', { adminId: admin._id, email: admin.email });
              fullUser = admin;
              isAdminUser = true;
            }
          } catch (adminError) {
            logger.error('Error checking admins collection during token validation', { 
              error: adminError.message,
              userId: user.id 
            });
          }
        }
        
        if (fullUser) {
          // Use admin_role if present, otherwise use role
          // Handle both array and string formats for role
          let userRole = fullUser.admin_role || fullUser.role || 'student';
          if (Array.isArray(userRole)) {
            userRole = userRole[0] || 'student';
          }
          // If admin_role exists, use it over regular role
          if (fullUser.admin_role) {
            userRole = fullUser.admin_role;
          }
          
          user = {
            id: fullUser._id.toString(),
            email: fullUser.email,
            role: userRole,
            _id: fullUser._id,
            isAdmin: isAdminUser
          };
          logger.debug('Enhanced token with full user data', { 
            userId: user.id, 
            role: user.role,
            originalRole: fullUser.role,
            adminRole: fullUser.admin_role,
            isAdmin: isAdminUser
          });
        } else {
          logger.warn('User not found in database', { userId: user.id });
          return res.status(401).json({ 
            success: false, 
            message: 'User not found',
            error_code: 'USER_NOT_FOUND'
          });
        }
      } catch (dbError) {
        logger.error('Error fetching user details from database', { 
          error: dbError.message,
          stack: dbError.stack,
          userId: user.id,
          isTimeout: dbError.message.includes('timeout') || dbError.message.includes('timed out')
        });
        
        // If it's a timeout error, return a specific error message
        if (dbError.message.includes('timeout') || dbError.message.includes('timed out')) {
          return res.status(500).json({ 
            success: false, 
            message: 'Database connection timeout during authentication. Please try again.',
            error_code: 'DB_TIMEOUT'
          });
        }
        
        // Don't fail here - continue with minimal user data if possible
        if (!user.email || !user.role) {
          return res.status(500).json({ 
            success: false, 
            message: 'Database error during authentication',
            error_code: 'DB_ERROR'
          });
        }
      }
    }

    // Final validation
    if (!user.id || !user.email || !user.role) {
      logger.warn('Incomplete user data after authentication', { 
        hasId: !!user.id,
        hasEmail: !!user.email,
        hasRole: !!user.role,
        user: user
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Incomplete user data',
        error_code: 'INCOMPLETE_USER_DATA'
      });
    }

    // Attach user to request
    req.user = user;
    logger.debug('Authentication successful', { 
      userId: user.id, 
      role: user.role, 
      email: user.email,
      path: req.originalUrl 
    });
    next();
  } catch (error) {
    logger.error('Authentication error', { 
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      path: req.originalUrl,
      hasJwtSecret: !!ENV_VARS.JWT_SECRET_KEY
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

    // Allow access if user is admin or instructor (super-admin automatically qualifies)
    if (hasRole(req.user.role, ["admin", "instructor"])) {
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
    let user = await dbUtils.findById(User, decoded.id, { select: "-password" });

    // If user not found in users collection, check admins collection
    if (!user) {
      try {
        const Admin = (await import('../models/admin-model.js')).default;
        const admin = await Admin.findById(decoded.id).select('-password');
        
        if (admin) {
          logger.debug('Admin found in admins collection for verifyToken', { adminId: admin._id, email: admin.email });
          user = admin;
        }
      } catch (adminError) {
        logger.error('Error checking admins collection during token verification', { 
          error: adminError.message,
          userId: decoded.id 
        });
      }
    }

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

// Check if user is admin (super-admin automatically qualifies)
export const isAdmin = (req, res, next) => {
  if (req.user && hasRole(req.user.role, "admin")) {
    return next();
  }
  next(new AppError("Access denied. Admin only.", 403));
};

// Check if user is instructor (admin and super-admin automatically qualify)
export const isInstructor = (req, res, next) => {
  if (req.user && hasRole(req.user.role, "instructor")) {
    next();
  } else {
    next(new AppError("Access denied. Instructor only.", 403));
  }
};

// Check if user is student (instructor, admin, and super-admin automatically qualify)
export const isStudent = (req, res, next) => {
  if (req.user && hasRole(req.user.role, "student")) {
    next();
  } else {
    next(new AppError("Access denied. Student only.", 403));
  }
};

// Check if user is sales team member (sales-admin and super-admin automatically qualify)
export const isSalesTeam = (req, res, next) => {
  if (req.user && hasRole(req.user.role, "sales_team")) {
    next();
  } else {
    next(new AppError("Access denied. Sales team only.", 403));
  }
};

// Check if user is support team member (support-admin and super-admin automatically qualify)
export const isSupportTeam = (req, res, next) => {
  if (req.user && hasRole(req.user.role, "support_team")) {
    next();
  } else {
    next(new AppError("Access denied. Support team only.", 403));
  }
};

// Check if user is sales admin (super-admin automatically qualifies)
export const isSalesAdmin = (req, res, next) => {
  if (req.user && hasRole(req.user.role, "sales-admin")) {
    next();
  } else {
    next(new AppError("Access denied. Sales admin only.", 403));
  }
};

// Check if user is support admin (super-admin automatically qualifies)
export const isSupportAdmin = (req, res, next) => {
  if (req.user && hasRole(req.user.role, "support-admin")) {
    next();
  } else {
    next(new AppError("Access denied. Support admin only.", 403));
  }
};

export default {
  authenticateToken,
  authorize,
  verifyStudentOwnership
};
