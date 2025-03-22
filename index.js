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
// const securityMiddleware = require('./middleware/security');

// Import routes
const router = require("./routes");
const connectDB = require("./config/db");
const { statusUpdater } = require("./cronjob/inactive-meetings");

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(mongoSanitize());
app.use(compression());

// Configure CORS
const isDev = process.env.NODE_ENV !== 'production';
// Configure origin handling based on environment
let corsOrigin;

if (isDev) {
  // In development, allow all origins for easier local development
  corsOrigin = true; // This allows all origins in development
  logger.info('CORS: Development mode - allowing all origins');
} else {
  // In production, use a strict allowlist
  const allowedDomains = [
    'http://api.medh.co', 
    'https://api.medh.co',
    'http://www.medh.co',
    'https://www.medh.co',
    'http://medh.co',
    'https://medh.co'
  ];
  const configuredOrigins = (ENV_VARS.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  // Add configured origins to our allowlist
  allowedDomains.push(...configuredOrigins);
  
  // Use function to validate origins in production
  corsOrigin = function(origin, callback) {
    // For requests without origin (like mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedDomains.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  };
  
  logger.info(`CORS allowed origins in production: ${allowedDomains.join(', ')}`);
}

const corsOptions = {
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    // Authentication headers
    'Authorization',
    'x-access-token',
    'X-API-Key',
    'X-Auth-Token',
    
    // Content negotiation
    'Accept',
    'Content-Type',
    'Content-Length',
    'Content-Disposition',
    'Accept-Encoding',
    'Accept-Language',
    
    // Request context
    'X-Requested-With',
    'Origin',
    'Referer',
    'User-Agent',
    
    // Caching & Validation
    'Cache-Control',
    'If-None-Match',
    'If-Modified-Since',
    'Pragma',
    'Expires',
    
    // Security
    'X-CSRF-Token',
    'X-XSRF-Token',
    
    // Custom application headers
    'X-Forwarded-For',
    'X-Forwarded-Proto',
    'X-Correlation-ID',
    'X-Request-ID'
  ],
  exposedHeaders: [
    'Content-Disposition',
    'X-Request-ID',
    'X-Correlation-ID'
  ],
  credentials: true,
  maxAge: 86400, // Cache preflight request for 24 hours
  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests explicitly
app.options('*', cors(corsOptions));

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
