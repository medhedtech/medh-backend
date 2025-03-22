const mongoose = require("mongoose");
const { ENV_VARS } = require("../config/envVars");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    await mongoose.connect(ENV_VARS.MONGO_URI);

    logger.info("MongoDB connected");

    // Connection Event Listeners
    mongoose.connection.on("connected", () => logger.info("Mongoose connected"));
    mongoose.connection.on("error", (err) => logger.error("Mongoose connection error:", err));
    mongoose.connection.on("disconnected", () => logger.warn("Mongoose disconnected"));

  } catch (err) {
    logger.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

// Graceful shutdown handling
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  logger.info("MongoDB connection closed due to app termination");
  process.exit(0);
});

module.exports = connectDB;
