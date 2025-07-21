import mongoose from "mongoose";
import dotenv from "dotenv";
import Category from "../models/category-model.js";
import logger from "../utils/logger.js";

dotenv.config(); // Load environment variables

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URL; // Changed from MONGO_URI to MONGODB_URL
    if (!mongoURI) {
      throw new Error("MONGODB_URL is not defined in environment variables");
    }
    await mongoose.connect(mongoURI);
    logger.info("MongoDB connected successfully for script.");
  } catch (err) {
    logger.error("MongoDB connection error in script:", err);
    process.exit(1);
  }
};

const updateCategoryClassTypes = async () => {
  await connectDB();

  const liveCategoryNames = [
    "AI & Data Science",
    "Digital Marketing with Data Analytics",
    "Personality Development",
    "Vedic Mathematics",
  ];

  try {
    logger.info("Starting category class_type update...");

    // Update 'live' categories
    const liveUpdateResult = await Category.updateMany(
      { category_name: { $in: liveCategoryNames } },
      { $set: { class_type: "live" } },
    );
    logger.info(
      `Updated ${liveUpdateResult.modifiedCount} categories to 'live'.`,
    );

    // Update 'blended' categories (all others not in liveCategoryNames)
    const blendedUpdateResult = await Category.updateMany(
      { category_name: { $nin: liveCategoryNames } },
      { $set: { class_type: "blended" } },
    );
    logger.info(
      `Updated ${blendedUpdateResult.modifiedCount} categories to 'blended'.`,
    );

    logger.info("Category class_type update completed.");
  } catch (error) {
    logger.error("Error updating category class_types:", error);
  } finally {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected.");
    process.exit(0);
  }
};

updateCategoryClassTypes();
