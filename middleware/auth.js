const jwt = require('jsonwebtoken');
const User = require('../models/user-controller');

/**
 * Middleware to authenticate user requests
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header - check both Authorization and x-access-token
    let token;
    
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    // If no token in Authorization header, check x-access-token
    if (!token && req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
    }
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: No token provided'
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || 'mynewjwtsecretkeytoken');
      
      // Add user information to request
      // Check if user property is in the decoded object (to handle different token formats)
      req.user = decoded.user || decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: Invalid token',
        error: error.message
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
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
        message: 'Access denied: User not authenticated properly'
      });
    }
    
    // Check for role - handle both string and array formats
    const userRole = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    
    // Check if any of the user's roles are in the allowed roles
    const hasPermission = roles.some(role => userRole.includes(role));
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied: User role(s) not authorized`
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
    if (req.user.role === 'admin' || req.user.role === 'instructor') {
      return next();
    }

    // For students, verify they own the resource
    if (student_id !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own data.'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying student ownership'
    });
  }
};

module.exports = {
  authenticate,
  authorize,
  verifyStudentOwnership
}; 