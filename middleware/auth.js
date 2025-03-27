const jwt = require('jsonwebtoken');
const User = require('../models/user-controller');

/**
 * Middleware to authenticate user requests
 */
const authenticateUser = (req, res, next) => {
  try {
    // Check for token in Authorization header (preferred)
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    // If not found, check for token in x-access-token header
    if (!token) {
      token = req.header('x-access-token');
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('Token received:', token);
    console.log('JWT Secret Key:', process.env.JWT_SECRET_KEY);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      console.log('Decoded token:', decoded);
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error('JWT Verification Error:', jwtError);
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: jwtError.message,
        details: {
          name: jwtError.name,
          expiredAt: jwtError.expiredAt
        }
      });
    }
  } catch (err) {
    console.error('General auth error:', err);
    res.status(401).json({
      success: false,
      message: 'Authentication error',
      error: err.message
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
    
    // Get user roles - handle both nested user object and direct role property
    const userRoles = req.user.role || (req.user.user && req.user.user.role);
    
    // Ensure we have an array of roles
    const userRoleArray = Array.isArray(userRoles) ? userRoles : [userRoles];
    
    // Check if any of the user's roles are in the allowed roles
    const hasPermission = userRoleArray.some(role => roles.includes(role));
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied: User role(s) [${userRoleArray.join(', ')}] not authorized. Required roles: [${roles.join(', ')}]`
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
  authenticate: authenticateUser,
  authorize,
  verifyStudentOwnership
}; 