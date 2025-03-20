const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate user based on JWT token
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const authenticateUser = (req, res, next) => {
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
};

/**
 * Middleware to authorize user based on roles
 * @param {...string} roles - Roles that are authorized
 * @returns {function} Express middleware function
 */
const authorizeRoles = (...roles) => {
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

module.exports = {
  authenticateUser,
  authorizeRoles
}; 