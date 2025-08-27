import mongoose from "mongoose";
import { ENV_VARS } from "./config/envVars.js";
import BlogsModel from "./models/blog-model.js";
import Course from "./models/course-model.js";
import HomeDisplay from "./models/home-display.js";
import Category from "./models/category-model.js";
import User from "./models/user-modal.js";
import {
  BlendedCourse,
  LiveCourse,
  FreeCourse,
} from "./models/course-types/index.js";

async function testDatabaseConnection() {
  console.log("Testing database connection...");
  console.log("MongoDB URI:", ENV_VARS.MONGODB_URI ? "Set" : "Not set");
  
  try {
    // Connect to MongoDB
    await mongoose.connect(ENV_VARS.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    
    console.log("✅ Database connected successfully");
    console.log("Connection state:", mongoose.connection.readyState);
    
    // Test each model
    console.log("\nTesting model access...");
    
    // Test BlogsModel
    try {
      const blogCount = await BlogsModel.countDocuments();
      console.log("✅ BlogsModel accessible, count:", blogCount);
    } catch (error) {
      console.error("❌ BlogsModel error:", error.message);
    }
    
    // Test Course model
    try {
      const courseCount = await Course.countDocuments();
      console.log("✅ Course model accessible, count:", courseCount);
    } catch (error) {
      console.error("❌ Course model error:", error.message);
    }
    
    // Test HomeDisplay model
    try {
      const homeDisplayCount = await HomeDisplay.countDocuments();
      console.log("✅ HomeDisplay model accessible, count:", homeDisplayCount);
    } catch (error) {
      console.error("❌ HomeDisplay model error:", error.message);
    }
    
    // Test Category model
    try {
      const categoryCount = await Category.countDocuments();
      console.log("✅ Category model accessible, count:", categoryCount);
    } catch (error) {
      console.error("❌ Category model error:", error.message);
    }
    
    // Test course-type models
    try {
      const blendedCount = await BlendedCourse.countDocuments();
      console.log("✅ BlendedCourse model accessible, count:", blendedCount);
    } catch (error) {
      console.error("❌ BlendedCourse model error:", error.message);
    }
    
    try {
      const liveCount = await LiveCourse.countDocuments();
      console.log("✅ LiveCourse model accessible, count:", liveCount);
    } catch (error) {
      console.error("❌ LiveCourse model error:", error.message);
    }
    
    try {
      const freeCount = await FreeCourse.countDocuments();
      console.log("✅ FreeCourse model accessible, count:", freeCount);
    } catch (error) {
      console.error("❌ FreeCourse model error:", error.message);
    }
    
    // Test specific queries that are failing
    console.log("\nTesting failing queries...");
    
    // Test blogs query
    try {
      const blogs = await BlogsModel.find({ status: "published" })
        .select({ content: 0 })
        .populate("author", "name email")
        .populate("categories", "category_name category_image")
        .sort({ createdAt: -1 })
        .skip(0)
        .limit(6)
        .lean();
      console.log("✅ Blogs query successful, found:", blogs.length);
    } catch (error) {
      console.error("❌ Blogs query error:", error.message);
    }
    
    // Test courses query
    try {
      const courses = await Course.find({ status: "Published" })
        .limit(8)
        .lean();
      console.log("✅ Courses query successful, found:", courses.length);
    } catch (error) {
      console.error("❌ Courses query error:", error.message);
    }
    
    // Test home display query
    try {
      const homeDisplays = await HomeDisplay.find({})
        .limit(10)
        .lean();
      console.log("✅ HomeDisplay query successful, found:", homeDisplays.length);
    } catch (error) {
      console.error("❌ HomeDisplay query error:", error.message);
    }
    
    // Test category query
    try {
      const categories = await Category.find({ status: "Published" })
        .limit(100)
        .lean();
      console.log("✅ Category query successful, found:", categories.length);
    } catch (error) {
      console.error("❌ Category query error:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("Full error:", error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  }
}

// Run the test
testDatabaseConnection().catch(console.error);


