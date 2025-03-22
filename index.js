const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { ENV_VARS } = require("./config/envVars");
const fileUpload = require("express-fileupload");
const cron = require("node-cron");
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const logger = require('./utils/logger');
const mongoose = require('mongoose');
const securityMiddleware = require('./middleware/security');

// Import routes
const router = require("./routes");
const connectDB = require("./config/db");
const { statusUpdater } = require("./cronjob/inactive-meetings");

const app = express();

// Apply security middleware (includes helmet, mongoSanitize, compression, and CORS)
securityMiddleware(app);

// Basic Middleware
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "128mb", extended: true }));
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
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

// Final CORS header enforcer - ensures headers aren't stripped by other middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (process.env.ALLOWED_ORIGINS || '').split(',').includes(origin)) {
    // Ensure CORS headers are set properly for allowed origins
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // For OPTIONS requests, immediately respond with 204
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.status(204).end();
    }
  }
  next();
});

// Routes
app.use("/api/v1", router);
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
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Initialize DB connection
connectDB();

// Start server
const PORT = ENV_VARS.PORT;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
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
