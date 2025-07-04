import mongoose from "mongoose";
import BlendedCourse from "./models/course-types/blended-course.js";

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URL || "mongodb://localhost:27017/medh",
    );
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

async function fixExistingLessons() {
  try {
    await connectDB();

    const courseId = "67e14360cd2f46d71bf0587c";
    console.log(`🔍 Finding course: ${courseId}`);

    const course = await BlendedCourse.findById(courseId);
    if (!course) {
      console.log("❌ Course not found");
      return;
    }

    console.log(`✅ Found course: ${course.course_title}`);
    console.log(`📚 Total weeks: ${course.curriculum.length}`);

    let updatedCount = 0;

    // Process each week
    course.curriculum.forEach((week, weekIndex) => {
      if (week.lessons && week.lessons.length > 0) {
        console.log(
          `\n📖 Week ${weekIndex + 1} (${week.id}) - ${week.lessons.length} lessons`,
        );

        week.lessons.forEach((lesson, lessonIndex) => {
          // Check if lesson is missing video fields but should have them
          const needsVideoFields = !lesson.video_url && !lesson.lessonType;

          if (needsVideoFields) {
            console.log(`  🔧 Updating lesson: ${lesson.title}`);

            // Add missing fields with sensible defaults
            lesson.lessonType = "video";
            lesson.video_url =
              "https://medhdocuments.s3.ap-south-1.amazonaws.com/videos/placeholder.mp4";
            lesson.duration = "30 minutes";

            // If we can infer from the title that it should have specific content
            if (lesson.title.includes("3454")) {
              lesson.video_url =
                "https://medhdocuments.s3.ap-south-1.amazonaws.com/videos/1749140025780-fxzbr5.mp4";
              lesson.duration = "33 minutes";
            }

            updatedCount++;
          } else {
            console.log(
              `  ✅ Lesson already has video fields: ${lesson.title}`,
            );
          }
        });
      }
    });

    if (updatedCount > 0) {
      console.log(`\n💾 Saving ${updatedCount} lesson updates...`);
      await course.save();
      console.log("✅ Successfully updated existing lessons!");
    } else {
      console.log("\n✅ No lessons needed updating");
    }
  } catch (error) {
    console.error("❌ Error fixing lessons:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the fix
fixExistingLessons();
