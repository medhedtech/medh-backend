import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

import Course from "../models/course-model.js";

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

async function updateBlendedCourses() {
  try {
    // First, find all blended courses with pricing data
    const blendedCourses = await Course.find({
      class_type: "Blended Courses",
    });

    console.log(`Found ${blendedCourses.length} blended courses to process`);

    let updatedCount = 0;

    // Process each course individually to set sessions based on INR pricing
    for (const course of blendedCourses) {
      // Find the INR pricing if it exists
      const inrPricing = course.prices?.find(
        (price) => price.currency === "INR",
      );

      if (inrPricing) {
        const inrPrice = inrPricing.individual;
        let noOfSessions = null;

        // Apply the session rules based on price
        if (inrPrice === 2999) {
          noOfSessions = 20;
        } else if (inrPrice === 1499) {
          noOfSessions = 10;
        }

        // Only update if we need to set sessions
        if (noOfSessions !== null) {
          await Course.updateOne(
            { _id: course._id },
            { $set: { no_of_Sessions: noOfSessions } },
          );
          updatedCount++;
          console.log(
            `Updated course: ${course.course_title}, set no_of_Sessions to ${noOfSessions}`,
          );
        }
      }
    }

    console.log(`Updated ${updatedCount} blended courses with session counts`);
    process.exit(0);
  } catch (error) {
    console.error("Error updating blended courses:", error);
    process.exit(1);
  }
}

updateBlendedCourses();
