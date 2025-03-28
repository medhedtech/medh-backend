const cors = require('cors');
const { ENV_VARS } = require('./envVars');
const logger = require('../utils/logger');

// Ensure we always include the medh.co domains
const allowedOrigins = [
  'https://medh.co',
  'https://www.medh.co',
  'https://api.medh.co',
  'http://localhost:3000',
  'http://localhost:3001'
];

// If environment variables have additional domains, add them
if (ENV_VARS.ALLOWED_ORIGINS && ENV_VARS.ALLOWED_ORIGINS.length > 0) {
  ENV_VARS.ALLOWED_ORIGINS.forEach(origin => {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  });
}

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman or curl requests)
    if (!origin) {
      if (ENV_VARS.NODE_ENV === 'production') {
        logger.warn('Request without origin header in production');
      }
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin) || ENV_VARS.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      logger.warn(`Blocked request from unauthorized origin: ${origin}`);
      // Return an error for unauthorized origins
      callback(new Error(`Not allowed by CORS: ${origin} is not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-access-token'],
  exposedHeaders: ['Content-Length', 'Date'], // Explicitly expose headers that might be needed by the client
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  maxAge: 86400, // Cache preflight requests for 24 hours
  optionsSuccessStatus: 204, // Important for preflight requests
  preflightContinue: false // Don't pass the OPTIONS request to the next handler
};

// Create CORS middleware
const corsMiddleware = cors(corsOptions);

// Middleware to handle preflight requests for all routes
const handlePreflight = (req, res, next) => {
  // First, set basic CORS headers for all requests as a fallback
  // This ensures that even if other middleware fails, CORS headers are sent
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || ENV_VARS.NODE_ENV === 'development')) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept, x-access-token');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  // If this is a preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    // Log the preflight request
    logger.info('CORS Preflight Request', {
      url: req.originalUrl,
      origin: req.headers.origin || 'No origin'
    });
    
    // Apply CORS headers and respond immediately
    return cors(corsOptions)(req, res, () => {
      res.status(204).end();
    });
  }
  
  // For non-OPTIONS requests, apply regular CORS middleware
  return corsMiddleware(req, res, next);
};

module.exports = handlePreflight; 