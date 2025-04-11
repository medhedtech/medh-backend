import jwt from "jsonwebtoken";

import { ENV_VARS } from "../config/envVars.js";
import User from "../models/user-modal.js";
import { AppError } from "../utils/errorHandler.js";
import logger from "../utils/logger.js";

/**
 * Middleware to authenticate user requests
 */
const authenticateUser = (req, res, next) => {
  try {
    // Check for token in Authorization header (preferred)
    let token = req.header("Authorization")?.replace("Bearer ", "");

    // If not found, check for token in x-access-token header
    if (!token) {
      token = req.header("x-access-token");
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    logger.debug("Token received:", token);

    try {
      const decoded = jwt.verify(token, ENV_VARS.JWT_SECRET_KEY);
      logger.debug("Decoded token:", decoded);
      req.user = decoded;
      next();
    } catch (jwtError) {
      logger.error("JWT Verification Error:", jwtError);
      res.status(401).json({
        success: false,
        message: "Invalid token",
        error: jwtError.message,
        details: {
          name: jwtError.name,
          expiredAt: jwtError.expiredAt,
        },
      });
    }
  } catch (err) {
    logger.error("General auth error:", err);
    res.status(401).json({
      success: false,
      message: "Authentication error",
      error: err.message,
    });
  }
};

/**
 * Middleware to authorize user based on roles
 * @param {Array} roles - Array of allowed roles
 */
const authorize = (roles) => {
  return (req, res, next) => {
    // Check if user exists
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "Access denied: User not authenticated properly",
      });
    }

    // Get user roles - handle both nested user object and direct role property
    const userRoles = req.user.role || (req.user.user && req.user.user.role);

    // Ensure we have an array of roles
    const userRoleArray = Array.isArray(userRoles) ? userRoles : [userRoles];

    // Check if any of the user's roles are in the allowed roles
    const hasPermission = userRoleArray.some((role) => roles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied: User role(s) [${userRoleArray.join(", ")}] not authorized. Required roles: [${roles.join(", ")}]`,
      });
    }

    next();
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

export { authenticateUser as authenticate, authorize, verifyStudentOwnership };

// Default export for use with authMiddleware reference in routes
export default authenticateUser;
