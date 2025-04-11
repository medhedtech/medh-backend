import mongoose from "mongoose";

import logger from "../utils/logger.js";

import { ENV_VARS } from "./envVars.js";

// Set mongoose options
mongoose.set("strictQuery", false);

// MongoDB connection with retries
const connectDB = async (retryCount = 0, maxRetries = 5) => {
  try {
    if (!ENV_VARS.MONGODB_URI) {
      throw new Error(
        "MongoDB connection URI is not defined in environment variables",
      );
    }

    // Connection options with increased timeouts
    const options = {
      serverSelectionTimeoutMS: 30000, // Increase from 5000 to 30000
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000, // Add explicit connect timeout
      maxPoolSize: 10, // Add connection pool size
      minPoolSize: 5, // Add minimum pool size
      maxIdleTimeMS: 30000, // Add max idle time
      heartbeatFrequencyMS: 10000, // Add heartbeat frequency
      retryWrites: true, // Enable retry for write operations
      retryReads: true, // Enable retry for read operations
      w: "majority", // Write concern for better consistency
      readPreference: "secondaryPreferred", // Read preference for better performance
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(ENV_VARS.MONGODB_URI, options);

    // Extract the host and database from the connection
    const host = conn.connection.host;
    const database = conn.connection.name;

    // Use the new connection status formatter
    logger.connection.success("MongoDB", {
      host,
      database,
      port: conn.connection.port || 27017,
    });

    // Set up mongoose debug mode conditionally based on environment variable
    if (
      ENV_VARS.NODE_ENV === "development" &&
      process.env.MONGOOSE_DEBUG === "true"
    ) {
      mongoose.set("debug", true);
      logger.info("Mongoose debugging enabled.");
    }

    // Connection Event Listeners
    conn.connection.on("connected", () => {
      logger.connection.success("MongoDB", {
        host: conn.connection.host,
        database: conn.connection.name,
      });
    });

    conn.connection.on("error", (err) => {
      logger.connection.error("MongoDB", err);
    });

    conn.connection.on("disconnected", () => {
      logger.connection.closed("MongoDB");
    });

    conn.connection.on("reconnected", () => {
      logger.connection.success("MongoDB", {
        host: conn.connection.host,
        database: conn.connection.name,
        message: "Reconnected successfully",
      });
    });

    return conn;
  } catch (err) {
    logger.connection.error("MongoDB", err, {
      uri: ENV_VARS.MONGODB_URI
        ? ENV_VARS.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")
        : "undefined", // Mask credentials
      attempt: retryCount + 1,
      maxRetries,
    });

    // Implement retry logic with exponential backoff
    if (retryCount < maxRetries) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff with max 30s
      logger.info(
        `Retrying MongoDB connection in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`,
      );

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(connectDB(retryCount + 1, maxRetries));
        }, retryDelay);
      });
    } else {
      logger.connection.error(
        "MongoDB",
        new Error(`Failed to connect after ${maxRetries} attempts`),
        {
          uri: ENV_VARS.MONGODB_URI
            ? ENV_VARS.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")
            : "undefined", // Mask credentials
          attempts: maxRetries,
        },
      );
      // Don't exit the process - let the app continue running even without DB
      // This allows API endpoints that don't require DB to still function
      throw err;
    }
  }
};

// Graceful shutdown handling
process.on("SIGINT", async () => {
  if (mongoose.connection.readyState !== 0) {
    // 0 = disconnected
    await mongoose.connection.close();
    logger.connection.closed("MongoDB", {
      reason: "Application termination",
      graceful: true,
    });
  }
  process.exit(0);
});

export default connectDB;
