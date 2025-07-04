import mongoose from "mongoose";

import logger from "../utils/logger.js";

import { ENV_VARS } from "./envVars.js";

// Set mongoose options
mongoose.set("strictQuery", false);

// Enable mongoose buffering since we now wait for connection before starting server
mongoose.set('bufferCommands', true);

// MongoDB connection with retries
const connectDB = async (retryCount = 0, maxRetries = 5) => {
  try {
    if (!ENV_VARS.MONGODB_URI) {
      throw new Error(
        "MongoDB connection URI is not defined in environment variables",
      );
    }

    // Connection options with increased timeouts and better resilience
    const options = {
      serverSelectionTimeoutMS: 120000, // Increase to 2 minutes
      socketTimeoutMS: 120000, // Increase socket timeout to 2 minutes
      connectTimeoutMS: 120000, // Increase connect timeout to 2 minutes
      maxPoolSize: 15, // Increase connection pool size
      minPoolSize: 5, // Increase minimum pool size
      maxIdleTimeMS: 600000, // Increase max idle time to 10 minutes
      heartbeatFrequencyMS: 5000, // Reduce heartbeat frequency for faster detection
      retryWrites: true, // Enable retry for write operations
      retryReads: true, // Enable retry for read operations
      w: "majority", // Write concern for better consistency
      readPreference: "primaryPreferred", // Prefer primary but fallback to secondary
      readConcern: { level: "majority" }, // Read concern for consistency
      // Additional timeout settings
      waitQueueTimeoutMS: 60000, // Wait queue timeout
      family: 4 // Use IPv4, skip trying IPv6
      // Note: keepAlive and keepAliveInitialDelay options have been removed in newer Mongoose versions
      // as they are now handled automatically by the MongoDB driver
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
        message: "Connection established"
      });
    });

    conn.connection.on("error", (err) => {
      logger.connection.error("MongoDB", err);
      
      // Handle specific timeout errors
      if (err.name === 'MongoTimeoutError' || err.message.includes('timeout')) {
        logger.error("MongoDB timeout detected, connection may be unstable", {
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
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

    // Handle timeout errors specifically
    conn.connection.on('timeout', () => {
      logger.error('MongoDB connection timeout');
    });

    // Handle buffer overflow
    conn.connection.on('fullsetup', () => {
      logger.info('MongoDB replica set fully connected');
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

// Add connection monitoring
setInterval(() => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  if (state !== 1) {
    logger.warn(`MongoDB connection state: ${states[state] || 'unknown'}`);
  }
}, 30000); // Check every 30 seconds

export default connectDB;
