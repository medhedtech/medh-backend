import cors from "cors";

import logger from "../utils/logger.js";

import { ENV_VARS } from "./envVars.js";

// CORS configuration
export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://medh.org",
      "https://www.medh.org",
      "https://admin.medh.org",
      "https://api.medh.org",
      "https://medh.co",
      "https://www.medh.co",
      "https://admin.medh.co",
      "https://api.medh.co",
      "https://staging.medh.co",
      "https://api2.medh.co"
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      ENV_VARS.NODE_ENV === "development"
    ) {
      // Log successful CORS origin for debugging
      logger.info(`CORS accepted origin: ${origin}`);
      callback(null, true);
    } else {
      // Log rejected origins for debugging
      logger.warn(`CORS rejected origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "x-access-token",
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// Create CORS middleware
const corsMiddleware = cors(corsOptions);

// Middleware to handle preflight requests for all routes
const handlePreflight = (req, res, next) => {
  // Define the list of allowed origins within this scope
  const definedAllowedOrigins =
    ENV_VARS.ALLOWED_ORIGINS && ENV_VARS.ALLOWED_ORIGINS.length > 0
      ? ENV_VARS.ALLOWED_ORIGINS
      : [
          // Fallback list (using the one defined in corsOptions for consistency)
          "http://localhost:3000",
          "http://localhost:3001",
          "https://medh.org",
          "https://www.medh.org",
          "https://admin.medh.org",
          "https://api.medh.org",
          "https://medh.co",
          "https://www.medh.co",
          "https://admin.medh.co",
          "https://api.medh.co",
          "https://staging.medh.co",
          "https://api2.medh.co",
        ];

  // Get the origin from the request
  const origin = req.headers.origin;
  
  // Log the origin for debugging purposes
  logger.info(`CORS middleware processing request from origin: ${origin || 'undefined'}, method: ${req.method}, path: ${req.path}`);
  
  // For preflight requests (OPTIONS)
  if (req.method === "OPTIONS") {
    // Always set CORS headers for OPTIONS requests
    // This is critical for preflight requests to work
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-access-token");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Max-Age", "86400"); // 24 hours
    
    logger.info(`CORS preflight headers set for origin: ${origin || '*'}`);
    
    // Return 204 No Content for OPTIONS requests
    return res.status(204).end();
  }
  
  // For regular requests, check if the origin is allowed
  if (origin && (definedAllowedOrigins.includes(origin) || ENV_VARS.NODE_ENV === "development")) {
    // Set CORS headers for allowed origins
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-access-token");
    res.header("Access-Control-Allow-Credentials", "true");
    
    logger.info(`CORS headers set for origin: ${origin}`);
  } else if (origin) {
    logger.warn(`CORS origin rejected: ${origin}`);
  }
  
  // Continue to the next middleware
  next();
};

export default handlePreflight;
