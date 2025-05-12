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

  // First, set basic CORS headers for all requests as a fallback
  const origin = req.headers.origin;
  // Use the correctly defined list here
  if (
    origin &&
    (definedAllowedOrigins.includes(origin) ||
      ENV_VARS.NODE_ENV === "development")
  ) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    );
    res.header(
      "Access-Control-Allow-Headers",
      "X-Requested-With, Content-Type, Authorization, Accept, x-access-token",
    );
    res.header("Access-Control-Allow-Credentials", "true");
  }

  // If this is a preflight OPTIONS request
  if (req.method === "OPTIONS") {
    // Log the preflight request
    logger.info("CORS Preflight Request", {
      url: req.originalUrl,
      origin: req.headers.origin || "No origin",
    });

    // Apply CORS headers and respond immediately
    return cors(corsOptions)(req, res, () => {
      res.status(204).end();
    });
  }

  // For non-OPTIONS requests, apply regular CORS middleware
  return corsMiddleware(req, res, next);
};

export default handlePreflight;
