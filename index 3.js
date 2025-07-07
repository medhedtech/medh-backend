// import path from 'path';

import bodyParser from "body-parser";
import compression from "compression";
import express from "express";
import session from "express-session";
import fileUpload from "express-fileupload";
import mongoSanitize from "express-mongo-sanitize";
// import helmet from 'helmet';
import mongoose from "mongoose";
import morgan from "morgan";
import passport from "passport";
// import cron from 'node-cron';
import http from "http";
import https from "https";
import path from "path";
import fs from "fs";

import corsMiddleware from "./config/cors.js";
import connectDB from "./config/db.js";
import { ENV_VARS } from "./config/envVars.js";
import { tlsConfig } from "./config/tls.js";
// import { statusUpdater } from './cronjob/inactive-meetings.js';
import redirectionMiddleware from "./middleware/redirection.js";
import securityMiddleware from "./middleware/security.js";
import router from "./routes/index.js";
import logger from "./utils/logger.js";
import app from './app.js';

const PORT = process.env.PORT || 3000;

console.log('Starting Medh Backend Server...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', PORT);

// CRITICAL: Use the centralized CORS middleware first before any other middleware
// This ensures CORS headers are set properly and not overridden
app.use(corsMiddleware);

// Apply security middleware but we'll modify it to not apply additional CORS headers
securityMiddleware(app);

// Use morgan for HTTP request logging in development
if (ENV_VARS.NODE_ENV === "development") {
  // Configure morgan to use our custom API logging
  app.use(
    morgan(function (tokens, req, res) {
      // Don't log static file requests
      if (req.originalUrl.startsWith("/public")) {
        return null;
      }

      // Use our API logger
      const method = req.method;
      const url = req.originalUrl || req.url;
      const status = res.statusCode;
      const responseTime = tokens["response-time"](req, res);

      // Use our custom API formatter
      logger.api.response(req, res, parseFloat(responseTime), {
        contentLength: tokens.res(req, res, "content-length"),
      });

      // Return empty string since we're handling the logging separately
      return "";
    }),
  );
}

// Apply compression for better performance
app.use(compression());
app.use(mongoSanitize()); // Prevent MongoDB operator injection

// Basic Middleware
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true, limit: "10gb" }));
app.use(bodyParser.json({ limit: "10gb", extended: true }));
app.use(express.json({ limit: "10gb" }));
app.use(
  fileUpload({
    limits: { fileSize: 1024 * 1024 * 10 * 1024 }, // 10GB max file size
    useTempFiles: true,
    tempFileDir: "/tmp/",
  }),
);

// Session configuration for OAuth
app.use(session({
  secret: ENV_VARS.SESSION_SECRET || 'your-session-secret-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: ENV_VARS.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Initialize Passport strategies
import "./config/passport-config.js";

// Add middleware to handle upload/base64 requests specially
app.use("/api/v1/upload/base64", (req, res, next) => {
  // Always set CORS headers for this specific endpoint
  const origin = req.headers.origin;
  const allowedOrigins =
    ENV_VARS.ALLOWED_ORIGINS.length > 0
      ? ENV_VARS.ALLOWED_ORIGINS
      : [
          "http://localhost:3000",
          "http://localhost:3001",
          "https://medh.co",
          "https://www.medh.co",
        ];

  if (
    origin &&
    (allowedOrigins.includes(origin) || ENV_VARS.NODE_ENV === "development")
  ) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, x-access-token",
    );
    res.header("Access-Control-Allow-Credentials", "true");
  }

  // Continue to next middleware
  next();
});

// Apply redirection middleware to handle CORS preflight requests that might involve redirects
app.use(redirectionMiddleware);

// CORS debug endpoint - helps diagnose CORS issues
app.use('/cors-debug', (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins =
    ENV_VARS.ALLOWED_ORIGINS.length > 0
      ? ENV_VARS.ALLOWED_ORIGINS
      : [
          "http://localhost:3000",
          "http://localhost:3001",
          "https://medh.co",
          "https://www.medh.co",
        ];
  
  // Log the request for debugging
  logger.info('CORS Debug Request', {
    origin,
    allowedOrigins,
    method: req.method,
    path: req.path,
    headers: req.headers
  });
  
  // Add CORS headers for this response
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Authorization, Accept, x-access-token");
    res.header("Access-Control-Allow-Credentials", "true");
  }
  
  // Return CORS diagnostic info
  return res.status(200).json({
    message: 'CORS debug endpoint',
    allowedOrigins,
    requestOrigin: origin || 'No origin in request',
    isAllowed: !origin || allowedOrigins.includes(origin) || ENV_VARS.NODE_ENV === 'development',
    responseHeaders: res.getHeaders(),
    environment: ENV_VARS.NODE_ENV
  });
});

// Main API routes
app.use("/api/v1", router);

// Direct access to various endpoints without /api/v1 prefix (for compatibility)
// Extract all route paths from moduleRoutes in routes/index.js
const moduleRoutesPaths = [
  "/auth",
  "/categories",
  "/courses",
  "/freq",
  "/faq",
  "/students",
  "/instructors",
  "/certificates",
  "/online-meetings",
  "/enrolled",
  "/recorded-sessions",
  "/upload",
  "/contact",
  "/blogs",
  "/dashboard",
  "/assign-instructor",
  "/membership",
  "/resources",
  "/quizes",
  "/feedback",
  "/assignment",
  "/placements",
  "/complaint",
  "/grievance",
  "/enroll-form",
  "/add-job-post",
  "/job-post",
  "/subscription",
  "/broucher",
  "/newsletter",
  "/quiz-response",
  "/track-sessions",
  "/assign-corporate-course",
  "/corporate-training",
  "/payments",
  "/home-display",
  "/currencies",
  "/batches",
  "/enrollments",
];

// Set up direct access middleware for each path
moduleRoutesPaths.forEach((path) => {
  app.use(path, (req, res) => {
    const newUrl = `/api/v1${path}${req.url}`;
    logger.info(`Redirecting ${req.url} to ${newUrl}`);
    req.url = newUrl;
    router(req, res);
  });
});

// Handle all other routes
app.use((req, res) => {
  res.status(404).json({ message: "Invalid route" });
});

// Uncomment to enable cron job
// cron.schedule("* * * * *", () => {
//   logger.info("Running scheduled job...");
//   statusUpdater();
// });

// Global error handler
app.use((err, req, res) => {
  logger.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    status: "error",
    success: false,
    message:
      ENV_VARS.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

// Uncaught exception handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

console.log(`Medh Backend Server is ready and listening on port ${PORT}`);

export default app;
