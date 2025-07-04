import mongoose from "mongoose";
import Course from "../models/course-model.js";
import { BaseCourse } from "../models/course-types/base-course.js";
import dotenv from "dotenv";

dotenv.config();

async function fixPersonalityDevelopmentTypo() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");

    // Find courses with the typo first
    const coursesWithTypo = await Course.find({
      course_title: { $regex: /devlopement/i },
    }).select("course_title _id");

    const baseCoursesWithTypo = await BaseCourse.find({
      course_title: { $regex: /devlopement/i },
    }).select("course_title _id");

    console.log(
      `\n📊 Found ${coursesWithTypo.length} courses with typo in main collection`,
    );
    console.log(
      `📊 Found ${baseCoursesWithTypo.length} courses with typo in base courses collection`,
    );

    if (coursesWithTypo.length > 0) {
      console.log("\n📝 Courses with typo in main collection:");
      coursesWithTypo.forEach((course) => {
        console.log(`  - ${course.course_title} (ID: ${course._id})`);
      });
    }

    if (baseCoursesWithTypo.length > 0) {
      console.log("\n📝 Courses with typo in base courses collection:");
      baseCoursesWithTypo.forEach((course) => {
        console.log(`  - ${course.course_title} (ID: ${course._id})`);
      });
    }

    // Fix typo in main courses collection
    const courseResult = await Course.updateMany(
      {
        course_title: {
          $in: [
            "Personality Devlopement",
            "Personality Devlopement ",
            "personality devlopement",
          ],
        },
      },
      {
        $set: {
          course_title: "Personality Development",
        },
      },
    );

    // Fix typo in basecourses collection
    const baseCourseResult = await BaseCourse.updateMany(
      {
        course_title: {
          $in: [
            "Personality Devlopement",
            "Personality Devlopement ",
            "personality devlopement",
          ],
        },
      },
      {
        $set: {
          course_title: "Personality Development",
        },
      },
    );

    console.log("\n✅ Typo fix completed:");
    console.log(`- Courses updated: ${courseResult.modifiedCount}`);
    console.log(`- Base courses updated: ${baseCourseResult.modifiedCount}`);

    // Verify the fix
    const remainingTypo = await Course.countDocuments({
      course_title: { $regex: /devlopement/i },
    });

    const remainingBaseTypo = await BaseCourse.countDocuments({
      course_title: { $regex: /devlopement/i },
    });

    console.log(`\n🔍 Verification:`);
    console.log(
      `- Remaining courses with typo: ${remainingTypo} (should be 0)`,
    );
    console.log(
      `- Remaining base courses with typo: ${remainingBaseTypo} (should be 0)`,
    );

    // Show updated courses
    const updatedCourses = await Course.find({
      course_title: "Personality Development",
    }).select("course_title _id");

    console.log(`\n✅ Updated courses (${updatedCourses.length} total):`);
    updatedCourses.forEach((course) => {
      console.log(`  - ${course.course_title} (ID: ${course._id})`);
    });

    if (remainingTypo === 0 && remainingBaseTypo === 0) {
      console.log("\n🎉 All typos have been successfully fixed!");
    } else {
      console.log("\n⚠️  Some typos may still exist. Please check manually.");
    }
  } catch (error) {
    console.error("❌ Error fixing typo:", error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("\n🔌 MongoDB connection closed");
  }
}

// Run the fix
fixPersonalityDevelopmentTypo();
