import mongoose from "mongoose";

const parentCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      required: [true, "Parent category name is required"],
      trim: true,
      enum: {
        values: [
          "Children & Teens",
          "Professionals",
          "Homemakers",
          "Lifelong Learners",
        ],
        message:
          "Parent category must be one of: Children & Teens, Professionals, Homemakers, Lifelong Learners",
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
      default: "default-icon",
    },
    color: {
      type: String,
      trim: true,
      default: "#3B82F6",
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
      targetAudience: {
        type: String,
        trim: true,
      },
      ageRange: {
        min: { type: Number, min: 0 },
        max: { type: Number, min: 0 },
      },
      skillLevel: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "all"],
        default: "all",
      },
    },
    stats: {
      totalCourses: { type: Number, default: 0 },
      totalEnrollments: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    collection: "parent_categories",
  },
);

// Indexes for better performance
parentCategorySchema.index({ name: 1 });
parentCategorySchema.index({ isActive: 1 });
parentCategorySchema.index({ sortOrder: 1 });

// Pre-save middleware to update stats
parentCategorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.name = this.name.trim();
  }
  next();
});

// Virtual for formatted name
parentCategorySchema.virtual("displayName").get(function () {
  return this.name;
});

// Method to update stats
parentCategorySchema.methods.updateStats = async function () {
  // This method can be used to update stats from related collections
  // Implementation can be added later when needed
};

const ParentCategory = mongoose.model("ParentCategory", parentCategorySchema);
export default ParentCategory;
