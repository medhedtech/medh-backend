import mongoose from "mongoose";
import dotenv from "dotenv";
import ParentCategory from "../models/parent-category-model.js";

// Load environment variables
dotenv.config();

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

// Default parent categories data
const defaultParentCategories = [
  {
    name: "Children & Teens",
    description:
      "Educational content and courses designed specifically for children and teenagers",
    icon: "child-icon",
    color: "#10B981",
    sortOrder: 1,
    metadata: {
      targetAudience: "Children and teenagers aged 5-18",
      ageRange: { min: 5, max: 18 },
      skillLevel: "beginner",
    },
  },
  {
    name: "Professionals",
    description: "Career-focused courses and professional development programs",
    icon: "professional-icon",
    color: "#3B82F6",
    sortOrder: 2,
    metadata: {
      targetAudience: "Working professionals and career-oriented individuals",
      ageRange: { min: 18, max: 65 },
      skillLevel: "intermediate",
    },
  },
  {
    name: "Homemakers",
    description:
      "Life skills, hobbies, and personal development courses for homemakers",
    icon: "home-icon",
    color: "#F59E0B",
    sortOrder: 3,
    metadata: {
      targetAudience: "Homemakers and individuals managing households",
      ageRange: { min: 18, max: 80 },
      skillLevel: "all",
    },
  },
  {
    name: "Lifelong Learners",
    description:
      "Diverse learning opportunities for individuals pursuing continuous education",
    icon: "learner-icon",
    color: "#8B5CF6",
    sortOrder: 4,
    metadata: {
      targetAudience: "Individuals committed to continuous learning",
      ageRange: { min: 16, max: 100 },
      skillLevel: "all",
    },
  },
];

// Initialize parent categories
const initializeParentCategories = async () => {
  try {
    console.log("🚀 Starting parent categories initialization...");

    const results = {
      created: [],
      skipped: [],
      errors: [],
    };

    for (const categoryData of defaultParentCategories) {
      try {
        // Check if category already exists
        const existingCategory = await ParentCategory.findOne({
          name: categoryData.name,
        });

        if (existingCategory) {
          console.log(`⏭️  Skipping "${categoryData.name}" - already exists`);
          results.skipped.push(categoryData.name);
          continue;
        }

        // Create new category
        const category = new ParentCategory(categoryData);
        await category.save();

        console.log(
          `✅ Created "${categoryData.name}" with ID: ${category._id}`,
        );
        results.created.push({
          name: categoryData.name,
          id: category._id,
        });
      } catch (error) {
        console.error(
          `❌ Error creating "${categoryData.name}":`,
          error.message,
        );
        results.errors.push({
          name: categoryData.name,
          error: error.message,
        });
      }
    }

    // Display summary
    console.log("\n📊 Initialization Summary:");
    console.log(`✅ Created: ${results.created.length}`);
    console.log(`⏭️  Skipped: ${results.skipped.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);

    if (results.created.length > 0) {
      console.log("\n✅ Successfully created parent categories:");
      results.created.forEach((cat) => {
        console.log(`   - ${cat.name} (ID: ${cat.id})`);
      });
    }

    if (results.skipped.length > 0) {
      console.log("\n⏭️  Skipped existing categories:");
      results.skipped.forEach((name) => {
        console.log(`   - ${name}`);
      });
    }

    if (results.errors.length > 0) {
      console.log("\n❌ Errors encountered:");
      results.errors.forEach((error) => {
        console.log(`   - ${error.name}: ${error.error}`);
      });
    }

    // Verify all categories exist
    const totalCategories = await ParentCategory.countDocuments();
    console.log(`\n📈 Total parent categories in database: ${totalCategories}`);

    if (totalCategories === defaultParentCategories.length) {
      console.log("🎉 All default parent categories are now available!");
    } else {
      console.log(
        "⚠️  Some categories may be missing. Check the errors above.",
      );
    }
  } catch (error) {
    console.error("❌ Initialization failed:", error.message);
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await initializeParentCategories();

    console.log("\n✨ Parent categories initialization completed!");
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

export default initializeParentCategories;
