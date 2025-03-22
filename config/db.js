const mongoose = require("mongoose");
const { ENV_VARS } = require("../config/envVars");
const logger = require("../utils/logger");

// Set mongoose options
mongoose.set('strictQuery', false); // Recommended by Mongoose for future compatibility

// MongoDB connection with retries
const connectDB = async (retryCount = 0, maxRetries = 5) => {
  try {
    if (!ENV_VARS.MONGO_URI) {
      throw new Error('MongoDB connection URI is not defined in environment variables');
    }

    // Connection options
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    // Connect to MongoDB
    await mongoose.connect(ENV_VARS.MONGO_URI, options);
    
    logger.info("MongoDB connected successfully");

    // Connection Event Listeners
    mongoose.connection.on("connected", () => logger.info("Mongoose connected"));
    mongoose.connection.on("error", (err) => logger.error("Mongoose connection error:", err));
    mongoose.connection.on("disconnected", () => logger.warn("Mongoose disconnected"));

    return true;
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    
    // Implement retry logic
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
