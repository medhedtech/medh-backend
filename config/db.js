const mongoose = require("mongoose");
const { ENV_VARS } = require("../config/envVars");
const logger = require("../utils/logger");

// Set mongoose options
mongoose.set('strictQuery', false);

// MongoDB connection with retries
const connectDB = async (retryCount = 0, maxRetries = 5) => {
  try {
    if (!ENV_VARS.MONGO_URI) {
      throw new Error('MongoDB connection URI is not defined in environment variables');
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
      w: 'majority', // Write concern for better consistency
      readPreference: 'secondaryPreferred', // Read preference for better performance
    };

    // Connect to MongoDB
    await mongoose.connect(ENV_VARS.MONGO_URI, options);
    
    logger.info("MongoDB connected successfully");

    // Connection Event Listeners
    mongoose.connection.on("connected", () => logger.info("Mongoose connected"));
    mongoose.connection.on("error", (err) => logger.error("Mongoose connection error:", err));
    mongoose.connection.on("disconnected", () => logger.warn("Mongoose disconnected"));
    mongoose.connection.on("reconnected", () => logger.info("Mongoose reconnected"));

    return true;
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    
    // Implement retry logic with exponential backoff
    if (retryCount < maxRetries) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff with max 30s
      logger.info(`Retrying MongoDB connection in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(connectDB(retryCount + 1, maxRetries));
        }, retryDelay);
      });
    } else {
      logger.error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
      // Don't exit the process - let the app continue running even without DB
      // This allows API endpoints that don't require DB to still function
      return false;
    }
  }
};

// Graceful shutdown handling
process.on("SIGINT", async () => {
  if (mongoose.connection.readyState !== 0) { // 0 = disconnected
    await mongoose.connection.close();
    logger.info("MongoDB connection closed due to app termination");
  }
  process.exit(0);
});

module.exports = connectDB;
