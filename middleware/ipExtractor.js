/**
 * IP Extractor Middleware
 * Properly extracts real client IP addresses from various headers
 * and standardizes them for the application
 */

/**
 * Extract real client IP address from request
 * @param {Object} req - Express request object
 * @returns {String} - Client IP address
 */
export const extractClientIP = (req) => {
  // Extract IP from various headers in order of preference
  let ip = req.ip || 
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.headers['x-client-ip'] ||
           req.headers['x-cluster-client-ip'] ||
           req.headers['forwarded-for'] ||
           req.headers['forwarded'] ||
           'unknown';

  // Clean up IPv6 localhost
  if (ip === '::1') {
    ip = '127.0.0.1';
  }

  // Remove IPv6 wrapper if present
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  return ip;
};

/**
 * Middleware to enhance request with properly extracted IP
 */
export const ipExtractorMiddleware = (req, res, next) => {
  // Set the properly extracted IP on the request object
  req.clientIP = extractClientIP(req);
  
  // Also update req.ip for consistency
  if (req.clientIP !== 'unknown') {
    req.ip = req.clientIP;
  }
  
  next();
};

/**
 * Check if IP is a private/local address
 * @param {String} ip - IP address to check
 * @returns {Boolean} - True if private/local IP
 */
export const isPrivateIP = (ip) => {
  if (!ip || ip === 'unknown') return true;
  
  // Localhost addresses
  if (ip === '127.0.0.1' || ip === 'localhost' || ip === '::1') {
    return true;
  }
  
  // Private IP ranges
  const privateRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^fc00:/,                   // IPv6 unique local
    /^fe80:/,                   // IPv6 link local
  ];
  
  return privateRanges.some(range => range.test(ip));
};

export default {
  extractClientIP,
  ipExtractorMiddleware,
  isPrivateIP
}; 