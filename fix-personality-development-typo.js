/* global db print printjson */
// MongoDB Script to Fix "Personality Devlopement" Typo
// This script fixes the typo in course titles across all course collections

// Connect to MongoDB (run this in MongoDB shell or with mongosh)
// mongosh "your-connection-string"

// 1. Fix typo in the main 'courses' collection
db.courses.updateMany(
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

// 2. Fix typo in the 'basecourses' collection (if it exists)
db.basecourses.updateMany(
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

// 3. Verify the changes
print("=== Verification Query ===");
print("Courses with corrected title:");
db.courses
  .find(
    { course_title: "Personality Development" },
    { course_title: 1, _id: 1 },
  )
  .forEach(printjson);

print("\nRemaining courses with typo (should be 0):");
db.courses
  .find(
    {
      course_title: {
        $regex: /devlopement/i,
      },
    },
    { course_title: 1, _id: 1 },
  )
  .forEach(printjson);

// 4. Summary
print("\n=== Summary ===");
print(
  "Total courses with 'Personality Development': " +
    db.courses.countDocuments({ course_title: "Personality Development" }),
);

print(
  "Total courses with typo (should be 0): " +
    db.courses.countDocuments({
      course_title: { $regex: /devlopement/i },
    }),
);

// Alternative: If you want to use Mongoose/Node.js instead of MongoDB shell
// Run this in your Node.js application:

/*
const mongoose = require('mongoose');
const Course = require('./models/course-model');
const BaseCourse = require('./models/course-types/base-course');

async function fixPersonalityDevelopmentTypo() {
  try {
    // Fix in main courses collection
    const courseResult = await Course.updateMany(
      {
        course_title: {
          $in: [
            "Personality Devlopement",
            "Personality Devlopement ",
            "personality devlopement"
          ]
        }
      },
      {
        $set: {
          course_title: "Personality Development"
        }
      }
    );

    // Fix in basecourses collection
    const baseCourseResult = await BaseCourse.updateMany(
      {
        course_title: {
          $in: [
            "Personality Devlopement",
            "Personality Devlopement ",
            "personality devlopement"
          ]
        }
      },
      {
        $set: {
          course_title: "Personality Development"
        }
      }
    );

    console.log('✅ Typo fix completed:');
    console.log(`- Courses updated: ${courseResult.modifiedCount}`);
    console.log(`- Base courses updated: ${baseCourseResult.modifiedCount}`);

    // Verify the fix
    const remainingTypo = await Course.countDocuments({
      course_title: { $regex: /devlopement/i }
    });

    console.log(`- Remaining courses with typo: ${remainingTypo} (should be 0)`);

  } catch (error) {
    console.error('❌ Error fixing typo:', error);
  }
}

// Run the fix
fixPersonalityDevelopmentTypo();
*/
