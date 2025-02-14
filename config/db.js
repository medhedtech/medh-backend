const mongoose = require("mongoose");
const { ENV_VARS } = require("../config/envVars");

const connectDB = async () => {
  try {
    await mongoose.connect(ENV_VARS.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB connected");

    // Connection Event Listeners
    mongoose.connection.on("connected", () => console.log("🟢 Mongoose connected"));
    mongoose.connection.on("error", (err) => console.error("🔴 Mongoose connection error:", err));
    mongoose.connection.on("disconnected", () => console.warn("🟡 Mongoose disconnected"));

  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

// Graceful shutdown handling
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🛑 MongoDB connection closed due to app termination");
  process.exit(0);
});

module.exports = connectDB;
