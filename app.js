import { dirname, join } from "path";
import { fileURLToPath } from "url";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import morgan from "morgan";

import { corsOptions } from "./config/cors.js";
import { envVars } from "./config/envVars.js";
import errorHandler from "./middleware/errorHandler.js";
import trackingMiddleware from "./middleware/trackingMiddleware.js";
import routes from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize express app
const app = express();

// Connect to MongoDB using modern async/await with proper error handling
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/medh",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
    );
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1); // Exit with failure
  }
};

// Initialize database connection
connectDB();

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Static files
app.use("/uploads", express.static(join(__dirname, "uploads")));

// Tracking middleware
app.use(trackingMiddleware.requestTracker);
app.use(trackingMiddleware.sessionTracker);
app.use(trackingMiddleware.uiActivityTracker);

// Routes
app.use("/api/v1", routes);

// Error handling
app.use(errorHandler);

// Add error tracking middleware
app.use(trackingMiddleware.errorTracker);

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

const PORT = envVars.PORT || 3000;

console.log('App starting - ENV check for Redis');
console.log('REDIS_ENABLED from process.env:', process.env.REDIS_ENABLED);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
