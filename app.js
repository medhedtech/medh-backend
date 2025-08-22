import express from "express";
import { ENV_VARS } from "./config/envVars.js";
import corsMiddleware from "./config/cors.js";
import connectDB from "./config/db.js";
import logger from "./utils/logger.js";

const app = express();

import { dirname, join } from "path";
import { fileURLToPath } from "url";

import helmet from "helmet";
import mongoose from "mongoose";
import morgan from "morgan";
import session from "express-session";
import passport from "passport";

import handlePreflight from "./config/cors.js";
// import errorHandler from "./middleware/errorHandler.js"; // ❌ commented: was returning HTML?
import trackingMiddleware from "./middleware/trackingMiddleware.js";
import routes from "./routes/index.js";
import sentryUtils from "./utils/sentry.js";
import "./config/passport-config.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import studentProgressRoutes from "./routes/studentProgressRoutes.js";
import courseMaterialRoutes from "./routes/courseMaterialRoutes.js";
import sessionRatingRoutes from "./routes/sessionRatingRoutes.js";
import emailManagementRoutes from "./routes/emailManagementRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Sentry
sentryUtils.initSentry();
app.set("trust proxy", true);
sentryUtils.setupSentryRequestHandler(app);

// MongoDB connection
if (ENV_VARS.NODE_ENV === "development" && !process.env.MONGODB_URL) {
  process.env.MONGODB_URL = "mongodb://localhost:27017/medh";
  console.log("Using local MongoDB instance for development:", process.env.MONGODB_URL);
}
connectDB().catch((error) => {
  console.error("Initial MongoDB connection error:", error);
  console.log("Application will continue running with limited functionality.");
});

// Cron jobs
import initializeSessionReminderCrons from "./cronjob/session-reminder-cron.js";
import { startZoomRecordingSync } from "./cronjob/zoom-recording-sync.js";
mongoose.connection.once("open", () => {
  console.log("MongoDB connected, initializing session reminder cron jobs...");
  initializeSessionReminderCrons();
  console.log("Starting Zoom recording sync cron job...");
  startZoomRecordingSync();
});

// Middleware
app.use(handlePreflight);
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(
  express.json({
    limit: "10gb", // 10GB for large file uploads
    verify: (req, res, buf, encoding) => {
      if (
        req.headers["content-type"] === "application/json" &&
        req.url.includes("/upload/base64")
      ) {
        req.rawBody = buf.toString(encoding || "utf8");
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "10gb" }));
app.use(morgan("dev"));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-session-secret-here",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Static
app.use("/uploads", express.static(join(__dirname, "uploads")));

// Routes
app.use("/api/v1/health", healthRoutes);
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: {
      status: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    },
  });
});
app.use("/api/v1", routes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/student", studentProgressRoutes);
app.use("/api/v1/materials", courseMaterialRoutes);
app.use("/api/v1/sessions", sessionRatingRoutes);
app.use("/api/v1/email-management", emailManagementRoutes);

// Debug CORS endpoint
app.use("/api/cors-debug", (req, res) => {
  res.status(200).json({
    message: "CORS debug endpoint working",
    allowedOrigins:
      ENV_VARS.ALLOWED_ORIGINS.length > 0
        ? ENV_VARS.ALLOWED_ORIGINS
        : ["http://localhost:3000"],
    origin: req.headers.origin || "No origin in request",
  });
});

// ❌ Old 404 handler (duplicate) – commented
/*
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});
*/

// Single 404 Handler (keep only this one)
app.use((req, res, next) => {
  res.status(404).json({
    status: "error",
    message: `Route not found: ${req.originalUrl}`,
  });
});

// Old custom error handler middleware – commented
// app.use(errorHandler);

// Global Error Handler (always JSON)
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);
  
  res.status(err.statusCode || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

const PORT = ENV_VARS.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
