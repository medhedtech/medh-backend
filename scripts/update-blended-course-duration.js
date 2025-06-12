import mongoose from "mongoose";
import Course from "../models/course-model.js";
import { ENV_VARS } from "../config/envVars.js";
import logger from "../utils/logger.js";

/**
 * Script to update course_duration to "self paced" for all courses 
 * where class_type is "Blended Courses"
 */

const updateBlendedCourseDuration = async () => {
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(ENV_VARS.MONGODB_URI || process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB successfully");

    // Find courses with class_type "Blended Courses"
    console.log("\n🔍 Finding courses with class_type 'Blended Courses'...");
    
    const blendedCourses = await Course.find({ 
      class_type: "Blended Courses" 
    }).select("_id course_title class_type course_duration");

    if (blendedCourses.length === 0) {
      console.log("⚠️  No courses found with class_type 'Blended Courses'");
      return;
    }

    console.log(`📊 Found ${blendedCourses.length} courses with class_type 'Blended Courses':`);
    
    // Display courses that will be updated
    blendedCourses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.course_title}`);
      console.log(`   ID: ${course._id}`);
      console.log(`   Current course_duration: "${course.course_duration}"`);
      console.log(`   Current class_type: "${course.class_type}"`);
      console.log("");
    });

    // Confirm before proceeding
    console.log("🚀 Proceeding with bulk update...");

    // Perform bulk update
    const updateResult = await Course.updateMany(
      { class_type: "Blended Courses" },
      { 
        $set: { 
          course_duration: "Self-Paced",
          // Update lastUpdated timestamp in meta
          "meta.lastUpdated": new Date()
        } 
      }
    );

    console.log("\n✅ Bulk update completed successfully!");
    console.log(`📈 Update Result:`);
    console.log(`   - Matched documents: ${updateResult.matchedCount}`);
    console.log(`   - Modified documents: ${updateResult.modifiedCount}`);
    console.log(`   - Acknowledged: ${updateResult.acknowledged}`);

    // Verify the update by fetching updated courses
    console.log("\n🔍 Verifying update...");
    const updatedCourses = await Course.find({ 
      class_type: "Blended Courses" 
    }).select("_id course_title class_type course_duration");

    console.log(`📊 Verification - Found ${updatedCourses.length} courses after update:`);
    updatedCourses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.course_title}`);
      console.log(`   ID: ${course._id}`);
      console.log(`   Updated course_duration: "${course.course_duration}"`);
      console.log(`   class_type: "${course.class_type}"`);
      console.log("");
    });

    // Log operation for audit trail
    if (logger && logger.info) {
      logger.info("Bulk update completed for blended courses", {
        operation: "update_blended_course_duration",
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount,
        timestamp: new Date().toISOString()
      });
    }

    console.log("🎉 Script execution completed successfully!");

  } catch (error) {
    console.error("❌ Error occurred during script execution:", error);
    
    if (logger && logger.error) {
      logger.error("Failed to update blended course duration", {
        operation: "update_blended_course_duration",
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        timestamp: new Date().toISOString()
      });
    }
    
    throw error;
  } finally {
    // Ensure database connection is closed
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("🔌 MongoDB connection closed");
    }
  }
};

// Execute the script if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateBlendedCourseDuration()
    .then(() => {
      console.log("\n✨ Script finished successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Script failed:", error.message);
      process.exit(1);
    });
}

export default updateBlendedCourseDuration; 