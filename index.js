// import path from 'path';

import bodyParser from "body-parser";
import compression from "compression";
import express from "express";
import fileUpload from "express-fileupload";
import mongoSanitize from "express-mongo-sanitize";
// import helmet from 'helmet';
import mongoose from "mongoose";
import morgan from "morgan";
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

const app = express();

// Use the centralized CORS middleware
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

// CORS headers for all routes as a fallback
app.use((req, res, next) => {
  if (req.headers.origin) {
    const allowedOrigins =
      ENV_VARS.ALLOWED_ORIGINS.length > 0
        ? ENV_VARS.ALLOWED_ORIGINS
        : [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://medh.co",
            "https://www.medh.co",
          ];

    const origin = req.headers.origin;
    if (
      allowedOrigins.includes(origin) ||
      ENV_VARS.NODE_ENV === "development"
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
  }
  next();
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
const gracefulShutdown = () => {
  logger.info("Received shutdown signal. Starting graceful shutdown...");
  
  // Close both HTTP and HTTPS servers if they exist
  if (httpServer) {
    httpServer.close(async () => {
      logger.connection.closed("HTTP Server", {
        port: PORT,
        environment: ENV_VARS.NODE_ENV,
      });
      
      if (!httpsServer) {
        // Only exit if HTTPS server doesn't exist or is already closed
        await shutdownServices();
      }
    });
  }
  
  if (httpsServer) {
    httpsServer.close(async () => {
      logger.connection.closed("HTTPS Server", {
        port: HTTPS_PORT,
        environment: ENV_VARS.NODE_ENV,
      });
      
      await shutdownServices();
    });
  }
};

// Extract shared shutdown logic
const shutdownServices = async () => {
  try {
    await mongoose.connection.close();
    logger.connection.closed("MongoDB", {
      reason: "Application shutdown",
      graceful: true,
    });
    process.exit(0);
  } catch (err) {
    logger.connection.error("MongoDB", err, {
      reason: "Application shutdown",
      graceful: false,
    });
    process.exit(1);
  }
};

// Initialize DB connection
connectDB();

// Start server(s)
const PORT = ENV_VARS.PORT;
const HTTPS_PORT = ENV_VARS.HTTPS_PORT || 443;
let httpServer, httpsServer;

// In production, use HTTPS if certificates are available
if (ENV_VARS.NODE_ENV === 'production' && ENV_VARS.TLS_CERT_PATH) {
  try {
    const certPath = ENV_VARS.TLS_CERT_PATH;
    
    // Create HTTPS server
    httpsServer = https.createServer(tlsConfig.production(certPath), app);
    
    httpsServer.listen(HTTPS_PORT, () => {
      logger.info(`HTTPS Server running on port ${HTTPS_PORT} in ${ENV_VARS.NODE_ENV} mode`);
      logger.connection.success("HTTPS Server", {
        port: HTTPS_PORT,
        environment: ENV_VARS.NODE_ENV,
      });
    });
    
    // Also create HTTP server for redirect to HTTPS
    httpServer = http.createServer((req, res) => {
      // Redirect HTTP to HTTPS
      res.writeHead(301, { 
        'Location': `https://${req.headers.host.split(':')[0]}:${HTTPS_PORT}${req.url}` 
      });
      res.end();
    });
    
    httpServer.listen(PORT, () => {
      logger.info(`HTTP->HTTPS redirect server running on port ${PORT}`);
    });
  } catch (error) {
    // If HTTPS setup fails, fall back to HTTP
    logger.error(`HTTPS server setup failed: ${error.message}. Falling back to HTTP.`);
    httpServer = http.createServer(app);
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${ENV_VARS.NODE_ENV} mode (HTTP fallback)`);
    });
  }
} else if (ENV_VARS.NODE_ENV === 'development' && ENV_VARS.USE_HTTPS === 'true') {
  // In development, use HTTPS with self-signed certificates if requested
  try {
    // Create HTTPS server with development certificates
    httpsServer = https.createServer(tlsConfig.development(), app);
    
    httpsServer.listen(PORT, () => {
      logger.info(`HTTPS Development Server running on port ${PORT} in ${ENV_VARS.NODE_ENV} mode`);
    });
  } catch (error) {
    // If HTTPS setup fails in development, fall back to HTTP
    logger.error(`HTTPS development server setup failed: ${error.message}. Falling back to HTTP.`);
    httpServer = http.createServer(app);
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${ENV_VARS.NODE_ENV} mode (HTTP fallback)`);
    });
  }
} else {
  // Standard HTTP server for development or when HTTPS is not configured
  httpServer = http.createServer(app);
  httpServer.listen(PORT, () => {
    logger.info(`HTTP Server running on port ${PORT} in ${ENV_VARS.NODE_ENV} mode`);
    logger.connection.success("HTTP Server", {
      port: PORT,
      environment: ENV_VARS.NODE_ENV,
    });
  });
}

// Register shutdown handlers
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

export default app;
