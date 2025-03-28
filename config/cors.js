const cors = require('cors');
const { ENV_VARS } = require('./envVars');

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
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || ENV_VARS.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`Blocked request from unauthorized origin: ${origin}`);
      // Return an error for unauthorized origins
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-access-token'],
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  maxAge: 86400, // Cache preflight requests for 24 hours
  optionsSuccessStatus: 204 // Important for preflight requests
};

// Create CORS middleware
const corsMiddleware = cors(corsOptions);

module.exports = corsMiddleware; 