import express from "express";
import { ENV_VARS } from "./config/envVars.js";
import corsMiddleware from "./config/cors.js";
import connectDB from "./config/db.js";
import logger from "./utils/logger.js";

const app = express();

import { dirname, join } from "path";
import { fileURLToPath } from "url";

import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import morgan from "morgan";
import session from "express-session";
import passport from "passport";

import { corsOptions } from "./config/cors.js";
import handlePreflight from "./config/cors.js";
import errorHandler from "./middleware/errorHandler.js";
import trackingMiddleware from "./middleware/trackingMiddleware.js";
import routes from "./routes/index.js";
import sentryUtils from "./utils/sentry.js";
import "./config/passport-config.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import studentProgressRoutes from "./routes/studentProgressRoutes.js";
import courseMaterialRoutes from "./routes/courseMaterialRoutes.js";
import sessionRatingRoutes from "./routes/sessionRatingRoutes.js";
import emailManagementRoutes from "./routes/emailManagementRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Sentry
sentryUtils.initSentry();

// Trust proxy - Enable to get real IP addresses through load balancers/proxies
app.set("trust proxy", true);

// Add Sentry request handler middleware
sentryUtils.setupSentryRequestHandler(app);

// For development, if MONGODB_URI is not set, use local MongoDB
if (ENV_VARS.NODE_ENV === "development" && !process.env.MONGODB_URL) {
  process.env.MONGODB_URL = "mongodb://localhost:27017/medh";
  console.log(
    "Using local MongoDB instance for development:",
    process.env.MONGODB_URL,
  );
}

// Initialize database connection using the enhanced connection module
connectDB().catch((error) => {
  console.error("Initial MongoDB connection error:", error);
  console.log("Application will continue running with limited functionality.");
  // We don't exit the process here to allow the app to run even without DB
});

// Initialize session reminder cron jobs
import initializeSessionReminderCrons from "./cronjob/session-reminder-cron.js";

// Initialize Zoom recording sync cron job
import { startZoomRecordingSync } from "./cronjob/zoom-recording-sync.js";

// Start session reminder cron jobs after database connection
mongoose.connection.once("open", () => {
  console.log("MongoDB connected, initializing session reminder cron jobs...");
  initializeSessionReminderCrons();

  console.log("Starting Zoom recording sync cron job...");
  startZoomRecordingSync();
});

// Middleware - CORS handling must be first
// Apply CORS middleware before any other middleware
app.use(handlePreflight);
// Then apply other middleware
app.use(
  helmet({
    // Disable contentSecurityPolicy as it can interfere with CORS
    contentSecurityPolicy: false,
  }),
);

// Configure JSON parser with increased limit for base64 uploads
app.use(
  express.json({
    limit: "10gb", // Increase limit for base64 uploads
    verify: (req, res, buf, encoding) => {
      // Store raw body for potential streaming use
      if (
        req.headers["content-type"] === "application/json" &&
        req.url.includes("/upload/base64")
      ) {
        req.rawBody = buf.toString(encoding || "utf8");
      }
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: "10gb" }));
app.use(morgan("dev"));

// Session configuration for OAuth
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-session-secret-here",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Static files
app.use("/uploads", express.static(join(__dirname, "uploads")));

// Tracking middleware
app.use(trackingMiddleware.requestTracker);
app.use(trackingMiddleware.sessionTracker);
app.use(trackingMiddleware.uiActivityTracker);

// Import health routes
import healthRoutes from "./routes/healthRoutes.js";

// Health check routes
app.use("/api/v1/health", healthRoutes);

// Keep the basic health endpoint for backward compatibility
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: {
      status:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    },
  });
});

// Routes
app.use("/api/v1", routes);

// API Routes
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/student", studentProgressRoutes);
app.use("/api/v1/materials", courseMaterialRoutes);
app.use("/api/v1/sessions", sessionRatingRoutes); // New route for session ratings
app.use("/api/v1/email-management", emailManagementRoutes); // Email management routes

// Add Sentry error handler before other error handlers
sentryUtils.setupSentryErrorHandler(app);

// Error handling
app.use(errorHandler);

// Add error tracking middleware
app.use(trackingMiddleware.errorTracker);

// Add a debug endpoint for CORS issues
app.use("/api/cors-debug", (req, res) => {
  res.status(200).json({
    message: "CORS debug endpoint working",
    allowedOrigins:
      ENV_VARS.ALLOWED_ORIGINS.length > 0
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
            "https://api2.medh.co",
            "https://devlopment.d1jhsaafm20wk0.amplifyapp.com",
          ],
    origin: req.headers.origin || "No origin in request",
    corsHeadersApplied: {
      "Access-Control-Allow-Origin": res.getHeader(
        "Access-Control-Allow-Origin",
      ),
      "Access-Control-Allow-Methods": res.getHeader(
        "Access-Control-Allow-Methods",
      ),
      "Access-Control-Allow-Headers": res.getHeader(
        "Access-Control-Allow-Headers",
      ),
      "Access-Control-Allow-Credentials": res.getHeader(
        "Access-Control-Allow-Credentials",
      ),
    },
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

console.log("App starting - ENV check for Redis");
console.log("REDIS_ENABLED from process.env:", process.env.REDIS_ENABLED);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
