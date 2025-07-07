import mongoose from "mongoose";

const gradeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      required: [true, "Grade name is required"],
      trim: true,
      enum: {
        values: [
          "Preschool",
          "Grade 1-2",
          "Grade 3-4",
          "Grade 5-6",
          "Grade 7-8",
          "Grade 9-10",
          "Grade 11-12",
          "UG - Graduate - Professionals",
        ],
        message: "Grade must be one of the predefined grade levels",
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    icon: {
      type: String,
      trim: true,
      default: "grade-icon",
    },
    color: {
      type: String,
      trim: true,
      default: "#6B7280",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    metadata: {
      ageRange: {
        min: { type: Number, min: 0 },
        max: { type: Number, min: 0 },
      },
      difficultyLevel: {
        type: String,
        enum: ["beginner", "elementary", "intermediate", "advanced", "expert"],
        default: "beginner",
      },
      subjectAreas: [{ type: String, trim: true }],
      learningObjectives: [{ type: String, trim: true }],
      prerequisites: [{ type: String, trim: true }],
    },
    stats: {
      totalCourses: { type: Number, default: 0 },
      totalEnrollments: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      averageCompletionRate: { type: Number, default: 0, min: 0, max: 100 },
    },
    academicInfo: {
      gradeLevel: {
        type: String,
        enum: ["preschool", "primary", "middle", "high", "university"],
        required: true,
      },
      typicalAge: {
        min: { type: Number, min: 0 },
        max: { type: Number, min: 0 },
      },
      curriculumStandards: [{ type: String, trim: true }],
      keySkills: [{ type: String, trim: true }],
    },
  },
  {
    timestamps: true,
    collection: "grades",
  },
);

// Indexes for better performance
gradeSchema.index({ name: 1 });
gradeSchema.index({ isActive: 1 });
gradeSchema.index({ sortOrder: 1 });
gradeSchema.index({ "academicInfo.gradeLevel": 1 });

// Pre-save middleware to update stats
gradeSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.name = this.name.trim();
  }

  // Auto-set academic info based on grade name
  if (this.isModified("name") && !this.academicInfo.gradeLevel) {
    if (this.name === "Preschool") {
      this.academicInfo.gradeLevel = "preschool";
      this.metadata.difficultyLevel = "beginner";
    } else if (
      this.name.includes("Grade 1-2") ||
      this.name.includes("Grade 3-4")
    ) {
      this.academicInfo.gradeLevel = "primary";
      this.metadata.difficultyLevel = "elementary";
    } else if (
      this.name.includes("Grade 5-6") ||
      this.name.includes("Grade 7-8")
    ) {
      this.academicInfo.gradeLevel = "middle";
      this.metadata.difficultyLevel = "intermediate";
    } else if (
      this.name.includes("Grade 9-10") ||
      this.name.includes("Grade 11-12")
    ) {
      this.academicInfo.gradeLevel = "high";
      this.metadata.difficultyLevel = "advanced";
    } else if (this.name.includes("UG - Graduate - Professionals")) {
      this.academicInfo.gradeLevel = "university";
      this.metadata.difficultyLevel = "expert";
    }
  }

  next();
});

// Virtual for formatted name
gradeSchema.virtual("displayName").get(function () {
  return this.name;
});

// Virtual for grade range
gradeSchema.virtual("gradeRange").get(function () {
  if (this.name === "Preschool") return "Pre-K";
  if (this.name === "UG - Graduate - Professionals") return "University+";
  return this.name;
});

// Method to update stats
gradeSchema.methods.updateStats = async function () {
  // This method can be used to update stats from related collections
  // Implementation can be added later when needed
};

// Static method to get grades by academic level
gradeSchema.statics.getByAcademicLevel = function (level) {
  return this.find({ "academicInfo.gradeLevel": level, isActive: true }).sort({
    sortOrder: 1,
  });
};

// Static method to get grades by difficulty
gradeSchema.statics.getByDifficulty = function (difficulty) {
  return this.find({
    "metadata.difficultyLevel": difficulty,
    isActive: true,
  }).sort({ sortOrder: 1 });
};

const Grade = mongoose.model("Grade", gradeSchema);
export default Grade;
