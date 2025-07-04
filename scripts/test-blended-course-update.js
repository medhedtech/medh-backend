import mongoose from "mongoose";
import Course from "../models/course-model.js";
import { ENV_VARS } from "../config/envVars.js";

/**
 * Test script to check what courses would be affected by the update
 * This script performs a dry run without making any changes
 */

const testBlendedCourseUpdate = async () => {
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(ENV_VARS.MONGODB_URI || process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB successfully");

    // Find courses with class_type "Blended Courses"
    console.log("\n🔍 Analyzing courses with class_type 'Blended Courses'...");

    const blendedCourses = await Course.find({
      class_type: "Blended Courses",
    }).select("_id course_title class_type course_duration createdAt");

    if (blendedCourses.length === 0) {
      console.log("⚠️  No courses found with class_type 'Blended Courses'");
      return;
    }

    console.log(`📊 Analysis Results:`);
    console.log(
      `   Total courses with class_type 'Blended Courses': ${blendedCourses.length}`,
    );
    console.log("");

    // Group by current course_duration values
    const durationGroups = blendedCourses.reduce((groups, course) => {
      const duration = course.course_duration || "null/undefined";
      if (!groups[duration]) {
        groups[duration] = [];
      }
      groups[duration].push(course);
      return groups;
    }, {});

    console.log("📈 Current course_duration distribution:");
    Object.entries(durationGroups).forEach(([duration, courses]) => {
      console.log(`   "${duration}": ${courses.length} courses`);
    });
    console.log("");

    // Show detailed information for each course
    console.log("📋 Detailed course information:");
    blendedCourses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.course_title}`);
      console.log(`   ID: ${course._id}`);
      console.log(
        `   Current course_duration: "${course.course_duration || "null/undefined"}"`,
      );
      console.log(`   class_type: "${course.class_type}"`);
      console.log(
        `   Created: ${course.createdAt ? course.createdAt.toLocaleDateString() : "N/A"}`,
      );
      console.log("");
    });

    // Show what would be changed
    const coursesToUpdate = blendedCourses.filter(
      (course) => course.course_duration !== "self paced",
    );

    console.log("🔄 Impact Analysis:");
    console.log(`   Courses that will be updated: ${coursesToUpdate.length}`);
    console.log(
      `   Courses already with "self paced": ${blendedCourses.length - coursesToUpdate.length}`,
    );
    console.log("");

    if (coursesToUpdate.length > 0) {
      console.log("📝 Courses that would be updated:");
      coursesToUpdate.forEach((course, index) => {
        console.log(`${index + 1}. ${course.course_title}`);
        console.log(`   FROM: "${course.course_duration || "null/undefined"}"`);
        console.log(`   TO: "self paced"`);
        console.log("");
      });
    }

    // Show MongoDB query that would be executed
    console.log("🔧 MongoDB Update Query:");
    console.log(`db.courses.updateMany(`);
    console.log(`  { "class_type": "Blended Courses" },`);
    console.log(`  {`);
    console.log(`    $set: {`);
    console.log(`      "course_duration": "self paced",`);
    console.log(`      "meta.lastUpdated": new Date()`);
    console.log(`    }`);
    console.log(`  }`);
    console.log(`)`);
    console.log("");

    console.log(
      "ℹ️  This was a DRY RUN - no changes were made to the database.",
    );
    console.log(
      "🚀 To execute the actual update, run: node scripts/update-blended-course-duration.js",
    );
  } catch (error) {
    console.error("❌ Error occurred during test:", error);
    throw error;
  } finally {
    // Ensure database connection is closed
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("🔌 MongoDB connection closed");
    }
  }
};

// Execute the test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testBlendedCourseUpdate()
    .then(() => {
      console.log("\n✨ Test completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Test failed:", error.message);
      process.exit(1);
    });
}

export default testBlendedCourseUpdate;
