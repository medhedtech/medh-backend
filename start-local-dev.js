#!/usr/bin/env node

/**
 * Script to start the application with a local MongoDB instance for development
 * This avoids the need to modify the .env file
 */

// Set environment variables before importing the app
process.env.NODE_ENV = "development";
process.env.MONGODB_URL = "mongodb://localhost:27017/medh";
process.env.REDIS_ENABLED = "false"; // Disable Redis for local development

// Import and run the app
import("./index.js").catch((err) => {
  console.error("Failed to start application:", err);
  process.exit(1);
});
