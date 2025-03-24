/**
 * Middleware to handle CORS preflight requests that might involve redirects
 * For preflight requests (OPTIONS), this middleware ensures we respond directly 
 * without redirecting, as browsers do not allow redirections for preflight requests.
 */
const logger = require('../utils/logger');

const redirectionMiddleware = (req, res, next) => {
  // If this is a preflight request, we need to avoid redirects
  if (req.method === 'OPTIONS') {
    // Log the preflight request with detailed information
    logger.info('CORS Preflight Request', {
      url: req.originalUrl,
      method: req.method,
      origin: req.headers.origin || 'No origin',
      headers: req.headers
    });
    
    // Handle the case where this might be a redirect
    // If we detect this is a URL that would redirect, we'll respond directly
    // This helps prevent "Redirect is not allowed for preflight request" errors
    
    // Common redirect patterns (add more as needed)
    const redirectPatterns = [
      { from: /^\/api\/v1\/courses\/search\/?$/, to: '/api/v1/courses/search' },
      { from: /^\/api\/v1\/courses\/search\?.*$/, to: '/api/v1/courses/search' },
      { from: /^\/courses\/search\/?$/, to: '/courses/search' },
      { from: /^\/courses\/search\?.*$/, to: '/courses/search' },
      // Handle both with and without trailing slash and with query parameters
    ];
    
    // Check if this request matches any redirect patterns
    for (const pattern of redirectPatterns) {
      if (pattern.from.test(req.originalUrl)) {
        logger.info(`CORS Preflight Redirect Prevention`, {
          url: req.originalUrl,
          pattern: String(pattern.from),
          origin: req.headers.origin || 'No origin'
        });
        
        // Set CORS headers directly for this specific preflight request
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept, x-access-token');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400'); // 24 hours
        
        // Log the response headers for debugging
        logger.info('CORS Preflight Response Headers', {
          headers: res.getHeaders(),
          statusCode: 204
        });
        
        // Respond directly to the preflight without redirecting
        return res.status(204).end();
      }
    }
  }
  
  // For normal requests, just continue
  next();
};

module.exports = redirectionMiddleware; 