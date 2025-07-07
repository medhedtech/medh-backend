import mongoose from "mongoose";
import dotenv from "dotenv";
import Grade from "../models/grade-model.js";

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

// Default grades data
const defaultGrades = [
  {
    name: "Preschool",
    description: "Early childhood education for children aged 3-5 years",
    icon: "preschool-icon",
    color: "#F59E0B",
    sortOrder: 1,
    metadata: {
      ageRange: { min: 3, max: 5 },
      difficultyLevel: "beginner",
      subjectAreas: ["Basic Skills", "Social Development", "Creative Arts"],
      learningObjectives: [
        "Develop basic motor skills",
        "Learn social interaction",
        "Explore creativity",
      ],
      prerequisites: [],
    },
    academicInfo: {
      gradeLevel: "preschool",
      typicalAge: { min: 3, max: 5 },
      curriculumStandards: ["Early Learning Standards"],
      keySkills: ["Basic Communication", "Motor Skills", "Social Skills"],
    },
  },
  {
    name: "Grade 1-2",
    description: "Primary education for children in grades 1-2",
    icon: "primary-icon",
    color: "#10B981",
    sortOrder: 2,
    metadata: {
      ageRange: { min: 6, max: 8 },
      difficultyLevel: "elementary",
      subjectAreas: ["Reading", "Mathematics", "Science", "Social Studies"],
      learningObjectives: [
        "Develop reading skills",
        "Learn basic math",
        "Explore science concepts",
      ],
      prerequisites: ["Preschool education"],
    },
    academicInfo: {
      gradeLevel: "primary",
      typicalAge: { min: 6, max: 8 },
      curriculumStandards: ["Common Core Standards"],
      keySkills: ["Reading", "Basic Math", "Writing", "Critical Thinking"],
    },
  },
  {
    name: "Grade 3-4",
    description: "Primary education for children in grades 3-4",
    icon: "primary-icon",
    color: "#3B82F6",
    sortOrder: 3,
    metadata: {
      ageRange: { min: 8, max: 10 },
      difficultyLevel: "elementary",
      subjectAreas: [
        "Reading",
        "Mathematics",
        "Science",
        "Social Studies",
        "Language Arts",
      ],
      learningObjectives: [
        "Advanced reading comprehension",
        "Mathematical reasoning",
        "Scientific inquiry",
      ],
      prerequisites: ["Grade 1-2 education"],
    },
    academicInfo: {
      gradeLevel: "primary",
      typicalAge: { min: 8, max: 10 },
      curriculumStandards: ["Common Core Standards"],
      keySkills: [
        "Reading Comprehension",
        "Mathematical Reasoning",
        "Writing",
        "Research Skills",
      ],
    },
  },
  {
    name: "Grade 5-6",
    description: "Middle school education for children in grades 5-6",
    icon: "middle-icon",
    color: "#8B5CF6",
    sortOrder: 4,
    metadata: {
      ageRange: { min: 10, max: 12 },
      difficultyLevel: "intermediate",
      subjectAreas: [
        "Mathematics",
        "Science",
        "Language Arts",
        "Social Studies",
        "Technology",
      ],
      learningObjectives: [
        "Advanced problem solving",
        "Scientific method",
        "Critical analysis",
      ],
      prerequisites: ["Grade 3-4 education"],
    },
    academicInfo: {
      gradeLevel: "middle",
      typicalAge: { min: 10, max: 12 },
      curriculumStandards: [
        "Common Core Standards",
        "Next Generation Science Standards",
      ],
      keySkills: [
        "Problem Solving",
        "Critical Analysis",
        "Research",
        "Technology Literacy",
      ],
    },
  },
  {
    name: "Grade 7-8",
    description: "Middle school education for children in grades 7-8",
    icon: "middle-icon",
    color: "#EC4899",
    sortOrder: 5,
    metadata: {
      ageRange: { min: 12, max: 14 },
      difficultyLevel: "intermediate",
      subjectAreas: [
        "Mathematics",
        "Science",
        "Language Arts",
        "Social Studies",
        "Technology",
        "Foreign Languages",
      ],
      learningObjectives: [
        "Advanced mathematical concepts",
        "Scientific research",
        "Literary analysis",
      ],
      prerequisites: ["Grade 5-6 education"],
    },
    academicInfo: {
      gradeLevel: "middle",
      typicalAge: { min: 12, max: 14 },
      curriculumStandards: [
        "Common Core Standards",
        "Next Generation Science Standards",
      ],
      keySkills: [
        "Advanced Problem Solving",
        "Scientific Research",
        "Literary Analysis",
        "Digital Literacy",
      ],
    },
  },
  {
    name: "Grade 9-10",
    description: "High school education for students in grades 9-10",
    icon: "high-icon",
    color: "#EF4444",
    sortOrder: 6,
    metadata: {
      ageRange: { min: 14, max: 16 },
      difficultyLevel: "advanced",
      subjectAreas: [
        "Mathematics",
        "Science",
        "Language Arts",
        "Social Studies",
        "Technology",
        "Foreign Languages",
        "Electives",
      ],
      learningObjectives: [
        "College preparatory skills",
        "Advanced research methods",
        "Critical thinking",
      ],
      prerequisites: ["Grade 7-8 education"],
    },
    academicInfo: {
      gradeLevel: "high",
      typicalAge: { min: 14, max: 16 },
      curriculumStandards: [
        "Common Core Standards",
        "Next Generation Science Standards",
      ],
      keySkills: [
        "College Prep Skills",
        "Advanced Research",
        "Critical Thinking",
        "Leadership",
      ],
    },
  },
  {
    name: "Grade 11-12",
    description: "High school education for students in grades 11-12",
    icon: "high-icon",
    color: "#DC2626",
    sortOrder: 7,
    metadata: {
      ageRange: { min: 16, max: 18 },
      difficultyLevel: "advanced",
      subjectAreas: [
        "Advanced Mathematics",
        "Advanced Science",
        "Language Arts",
        "Social Studies",
        "Technology",
        "College Prep",
      ],
      learningObjectives: [
        "College readiness",
        "Advanced academic skills",
        "Career preparation",
      ],
      prerequisites: ["Grade 9-10 education"],
    },
    academicInfo: {
      gradeLevel: "high",
      typicalAge: { min: 16, max: 18 },
      curriculumStandards: [
        "Common Core Standards",
        "Next Generation Science Standards",
        "College Readiness Standards",
      ],
      keySkills: [
        "College Readiness",
        "Advanced Academic Skills",
        "Career Preparation",
        "Independent Learning",
      ],
    },
  },
  {
    name: "UG - Graduate - Professionals",
    description: "University and professional education for adults",
    icon: "university-icon",
    color: "#1F2937",
    sortOrder: 8,
    metadata: {
      ageRange: { min: 18, max: 100 },
      difficultyLevel: "expert",
      subjectAreas: [
        "Professional Development",
        "Advanced Studies",
        "Specialized Skills",
        "Research",
      ],
      learningObjectives: [
        "Professional advancement",
        "Specialized knowledge",
        "Research skills",
      ],
      prerequisites: ["High school education or equivalent"],
    },
    academicInfo: {
      gradeLevel: "university",
      typicalAge: { min: 18, max: 100 },
      curriculumStandards: [
        "Professional Standards",
        "Industry Standards",
        "Academic Standards",
      ],
      keySkills: [
        "Professional Skills",
        "Specialized Knowledge",
        "Research Methods",
        "Leadership",
      ],
    },
  },
];

// Initialize grades
const initializeGrades = async () => {
  try {
    console.log("🚀 Starting grades initialization...");

    const results = {
      created: [],
      skipped: [],
      errors: [],
    };

    for (const gradeData of defaultGrades) {
      try {
        // Check if grade already exists
        const existingGrade = await Grade.findOne({ name: gradeData.name });

        if (existingGrade) {
          console.log(`⏭️  Skipping "${gradeData.name}" - already exists`);
          results.skipped.push(gradeData.name);
          continue;
        }

        // Create new grade
        const grade = new Grade(gradeData);
        await grade.save();

        console.log(`✅ Created "${gradeData.name}" with ID: ${grade._id}`);
        results.created.push({
          name: gradeData.name,
          id: grade._id,
        });
      } catch (error) {
        console.error(`❌ Error creating "${gradeData.name}":`, error.message);
        results.errors.push({
          name: gradeData.name,
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
      console.log("\n✅ Successfully created grades:");
      results.created.forEach((grade) => {
        console.log(`   - ${grade.name} (ID: ${grade.id})`);
      });
    }

    if (results.skipped.length > 0) {
      console.log("\n⏭️  Skipped existing grades:");
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

    // Verify all grades exist
    const totalGrades = await Grade.countDocuments();
    console.log(`\n📈 Total grades in database: ${totalGrades}`);

    if (totalGrades === defaultGrades.length) {
      console.log("🎉 All default grades are now available!");
    } else {
      console.log("⚠️  Some grades may be missing. Check the errors above.");
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
    await initializeGrades();

    console.log("\n✨ Grades initialization completed!");
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

export default initializeGrades;
