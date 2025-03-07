const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate user based on JWT token
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const authenticateUser = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  
  // Check if token exists
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed: No token provided'
    });
  }
  
  // Extract token
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token (replace 'your_jwt_secret' with actual secret from environment variables)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Add user information to request
    req.user = decoded;
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
    // Check if user exists and has a role
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: User not authenticated properly'
      });
    }
    
    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: User role '${req.user.role}' not authorized`
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateUser,
  authorizeRoles
}; 