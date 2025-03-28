const cors = require('cors');
const { ENV_VARS } = require('./envVars');
const logger = require('../utils/logger');

// Get allowed origins from environment variable or use default origins
const allowedOrigins = ENV_VARS.ALLOWED_ORIGINS.length > 0 
  ? ENV_VARS.ALLOWED_ORIGINS 
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://medh.co',
      'https://www.medh.co'
    ];

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
    
    if (allowedOrigins.indexOf(origin) !== -1 || ENV_VARS.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      logger.warn(`Blocked request from unauthorized origin: ${origin}`);
      // Return an error for unauthorized origins
      callback(new Error('Not allowed by CORS'));
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
  // If this is a preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    // Apply CORS headers and respond immediately
    return cors(corsOptions)(req, res, () => {
      res.status(204).end();
    });
  }
  
  // For non-OPTIONS requests, apply regular CORS middleware
  return corsMiddleware(req, res, next);
};

module.exports = handlePreflight; 