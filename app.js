import { dirname, join } from "path";
import { fileURLToPath } from "url";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import morgan from "morgan";

import { corsOptions } from "./config/cors.js";
import handlePreflight from "./config/cors.js";
import { ENV_VARS } from "./config/envVars.js";
import errorHandler from "./middleware/errorHandler.js";
import trackingMiddleware from "./middleware/trackingMiddleware.js";
import routes from "./routes/index.js";
import sentryUtils from "./utils/sentry.js";
import connectDB from "./config/db.js";  // Import the more robust DB connection

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Sentry
sentryUtils.initSentry();

// Initialize express app
const app = express();

// Add Sentry request handler middleware
sentryUtils.setupSentryRequestHandler(app);

// For development, if MONGODB_URI is not set, use local MongoDB
if (ENV_VARS.NODE_ENV === "development" && !process.env.MONGO_URI) {
  process.env.MONGO_URI = "mongodb://localhost:27017/medh";
  console.log("Using local MongoDB instance for development:", process.env.MONGO_URI);
}

// Initialize database connection using the enhanced connection module
connectDB().catch(error => {
  console.error("Initial MongoDB connection error:", error);
  console.log("Application will continue running with limited functionality.");
  // We don't exit the process here to allow the app to run even without DB
});

// Middleware
app.use(helmet());
// Removing redundant cors middleware and using only the handlePreflight middleware
app.use(handlePreflight);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Static files
app.use("/uploads", express.static(join(__dirname, "uploads")));

// Tracking middleware
app.use(trackingMiddleware.requestTracker);
app.use(trackingMiddleware.sessionTracker);
app.use(trackingMiddleware.uiActivityTracker);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    }
  });
});

// Routes
app.use("/api/v1", routes);

// Add Sentry error handler before other error handlers
sentryUtils.setupSentryErrorHandler(app);

// Error handling
app.use(errorHandler);

// Add error tracking middleware
app.use(trackingMiddleware.errorTracker);

// Add a debug endpoint for CORS issues
app.use('/api/cors-debug', (req, res) => {
  res.status(200).json({
    message: 'CORS debug endpoint working',
    allowedOrigins: ENV_VARS.ALLOWED_ORIGINS.length > 0 
      ? ENV_VARS.ALLOWED_ORIGINS 
      : [
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
        ],
    origin: req.headers.origin || 'No origin in request',
    corsHeadersApplied: {
      'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers'),
      'Access-Control-Allow-Credentials': res.getHeader('Access-Control-Allow-Credentials'),
    }
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

const PORT = ENV_VARS.PORT || 3000;

console.log('App starting - ENV check for Redis');
console.log('REDIS_ENABLED from process.env:', process.env.REDIS_ENABLED);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
