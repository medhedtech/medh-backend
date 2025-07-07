import mongoose from "mongoose";
import dotenv from "dotenv";
import MasterData from "../models/master-data-model.js";
import Category from "../models/category-model.js";

// Helper function to calculate sessions for course duration
// Rule: 1 month = 8 sessions
const calculateSessionsForDuration = (duration) => {
  // Extract months from duration string
  const monthMatch = duration.match(/(\d+)\s*month/i);
  const weekMatch = duration.match(/(\d+)\s*week/i);
  const hourMatch = duration.match(/(\d+)\s*hour/i);
  const minuteMatch = duration.match(/(\d+)\s*minute/i);

  let totalSessions = 0;

  // Calculate sessions from months (1 month = 8 sessions)
  if (monthMatch) {
    const months = parseInt(monthMatch[1]);
    totalSessions += months * 8;
  }

  // Calculate sessions from weeks (1 week = 2 sessions, assuming 4 weeks per month)
  if (weekMatch) {
    const weeks = parseInt(weekMatch[1]);
    totalSessions += Math.ceil(weeks * 2);
  }

  // For hours/minutes, assume 1 session = 2 hours
  if (hourMatch) {
    const hours = parseInt(hourMatch[1]);
    totalSessions += Math.ceil(hours / 2);
  }

  if (minuteMatch) {
    const minutes = parseInt(minuteMatch[1]);
    const hours = minutes / 60;
    totalSessions += Math.ceil(hours / 2);
  }

  // If no time units found, return original duration
  if (totalSessions === 0) {
    return duration;
  }

  // Format: "original_duration (X sessions)"
  return `${duration} (${totalSessions} sessions)`;
};

// Load environment variables
dotenv.config();

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

// Initialize master data
const initializeMasterData = async () => {
  try {
    console.log("🚀 Starting master data initialization...");

    // Check if master data already exists
    const existingMasterData = await MasterData.getAllMasterData();

    if (existingMasterData) {
      console.log("⏭️  Master data already exists, skipping initialization");
      console.log("\n📊 Current master data:");
      console.log(
        `   Parent Categories: ${existingMasterData.parentCategories.length}`,
      );
      console.log(`   Categories: ${existingMasterData.categories.length}`);
      console.log(`   Certificates: ${existingMasterData.certificates.length}`);
      console.log(`   Grades: ${existingMasterData.grades.length}`);
      console.log(
        `   Course Durations: ${existingMasterData.courseDurations.length}`,
      );

      console.log("\n📋 Current items:");
      console.log(
        "   Parent Categories:",
        existingMasterData.parentCategories.join(", "),
      );
      console.log("   Categories:", existingMasterData.categories.join(", "));
      console.log(
        "   Certificates:",
        existingMasterData.certificates.join(", "),
      );
      console.log("   Grades:", existingMasterData.grades.join(", "));
      console.log(
        "   Course Durations:",
        existingMasterData.courseDurations.join(", "),
      );

      return;
    }

    // Create new master data with defaults
    const masterData = new MasterData();
    await masterData.save();

    // Sync categories from Category model
    await MasterData.syncCategoriesFromModel();

    console.log("✅ Master data initialized successfully!");
    console.log("\n📊 Master data summary:");
    console.log(`   Parent Categories: ${masterData.parentCategories.length}`);
    console.log(`   Categories: Synced from Category model`);
    console.log(`   Certificates: ${masterData.certificates.length}`);
    console.log(`   Grades: ${masterData.grades.length}`);
    console.log(`   Course Durations: ${masterData.courseDurations.length}`);

    console.log("\n📋 Default items created:");
    console.log(
      "   Parent Categories:",
      masterData.parentCategories.join(", "),
    );
    console.log("   Categories: Synced from existing Category model");
    console.log("   Certificates:", masterData.certificates.join(", "));
    console.log("   Grades:", masterData.grades.join(", "));
    console.log("   Course Durations:", masterData.courseDurations.join(", "));

    console.log("\n🎉 Master data is ready for use!");
  } catch (error) {
    console.error("❌ Initialization failed:", error.message);
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await initializeMasterData();

    console.log("\n✨ Master data initialization completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Script execution failed:", error.message);
    process.exit(1);
  }
};

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default initializeMasterData;
