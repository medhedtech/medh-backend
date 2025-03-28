const express = require("express");
const bodyParser = require("body-parser");
const { ENV_VARS } = require("./config/envVars");
const fileUpload = require("express-fileupload");
const cron = require("node-cron");
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const logger = require('./utils/logger');
const mongoose = require('mongoose');
const securityMiddleware = require('./middleware/security');
const redirectionMiddleware = require('./middleware/redirection');
const corsMiddleware = require('./config/cors');
const path = require('path');

// Import routes
const router = require("./routes");
const connectDB = require("./config/db");
const { statusUpdater } = require("./cronjob/inactive-meetings");

const app = express();

// Use the centralized CORS middleware
app.use(corsMiddleware);

// Apply security middleware but we'll modify it to not apply additional CORS headers
securityMiddleware(app);

// Apply compression for better performance
app.use(compression());
app.use(mongoSanitize()); // Prevent MongoDB operator injection

// Basic Middleware
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "128mb", extended: true }));
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: 500 * 1024 * 1024 }, // 50MB max file size
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Apply redirection middleware to handle CORS preflight requests that might involve redirects
app.use(redirectionMiddleware);

// CORS headers for all routes as a fallback
app.use((req, res, next) => {
  if (req.headers.origin) {
    const allowedOrigins = ENV_VARS.ALLOWED_ORIGINS.length > 0 
      ? ENV_VARS.ALLOWED_ORIGINS 
      : ['http://localhost:3000', 'http://localhost:3001', 'https://medh.co', 'https://www.medh.co'];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin) || ENV_VARS.NODE_ENV === 'development') {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept, x-access-token');
      res.header('Access-Control-Allow-Credentials', 'true');
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
  "/payments"
];

// Set up direct access middleware for each path
moduleRoutesPaths.forEach(path => {
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

// Schedule the job to run every minute
// cron.schedule("* * * * *", () => {
//   console.log("Running scheduled job...");
//   statusUpdater();
// });

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    success: false,
    message: ENV_VARS.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Initialize DB connection
connectDB();

// Start server
const PORT = ENV_VARS.PORT;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${ENV_VARS.NODE_ENV} mode`);
});

// Graceful shutdown handling
const gracefulShutdown = () => {
  logger.info('Received shutdown signal. Starting graceful shutdown...');
  server.close(async () => {
    logger.info('Closed express server');
    try {
      await mongoose.connection.close();
      logger.info('Closed MongoDB connection');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown();
});
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  gracefulShutdown();
});

module.exports = app;
