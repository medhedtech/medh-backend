import mongoose from "mongoose";
import Category from "./category-model.js";

const masterDataSchema = new mongoose.Schema(
  {
    parentCategories: {
      type: [String],
      default: [
        "Children & Teens",
        "Professionals",
        "Homemakers",
        "Lifelong Learners",
      ],
      validate: {
        validator: function (v) {
          return v.every(
            (item) => typeof item === "string" && item.trim().length > 0,
          );
        },
        message: "All parent category names must be non-empty strings",
      },
    },
    categories: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return v.every(
            (item) => typeof item === "string" && item.trim().length > 0,
          );
        },
        message: "All category names must be non-empty strings",
      },
    },
    certificates: {
      type: [String],
      default: [
        "Executive Diploma",
        "Professional Grad Diploma",
        "Foundational Certificate",
        "Advanced Certificate",
        "Professional Certificate",
        "Specialist Certificate",
        "Master Certificate",
        "Industry Certificate",
      ],
      validate: {
        validator: function (v) {
          return v.every(
            (item) => typeof item === "string" && item.trim().length > 0,
          );
        },
        message: "All certificate names must be non-empty strings",
      },
    },
    grades: {
      type: [String],
      default: [
        "Preschool",
        "Grade 1-2",
        "Grade 3-4",
        "Grade 5-6",
        "Grade 7-8",
        "Grade 9-10",
        "Grade 11-12",
        "UG - Graduate - Professionals",
      ],
      validate: {
        validator: function (v) {
          return v.every(
            (item) => typeof item === "string" && item.trim().length > 0,
          );
        },
        message: "All grade names must be non-empty strings",
      },
    },
    courseDurations: {
      type: [String],
      default: [
        "2 hours 0 minutes (1 sessions)",
        "4 months 16 weeks (32 sessions)",
        "6 months 24 weeks (48 sessions)",
        "8 months 32 weeks (64 sessions)",
        "9 months 36 weeks (72 sessions)",
        "12 months 48 weeks (96 sessions)",
        "18 months 72 weeks (144 sessions)",
        "24 months 96 weeks (192 sessions)",
      ],
      validate: {
        validator: function (v) {
          return v.every(
            (item) => typeof item === "string" && item.trim().length > 0,
          );
        },
        message: "All course duration names must be non-empty strings",
      },
    },
  },
  {
    timestamps: true,
    collection: "master_data",
  },
);

// Indexes for better performance
masterDataSchema.index({ parentCategories: 1 });
masterDataSchema.index({ categories: 1 });
masterDataSchema.index({ certificates: 1 });
masterDataSchema.index({ grades: 1 });
masterDataSchema.index({ courseDurations: 1 });

// Pre-save middleware to trim all strings
masterDataSchema.pre("save", function (next) {
  // Trim all strings in arrays
  if (this.parentCategories) {
    this.parentCategories = this.parentCategories.map((item) => item.trim());
  }
  if (this.categories) {
    this.categories = this.categories.map((item) => item.trim());
  }
  if (this.certificates) {
    this.certificates = this.certificates.map((item) => item.trim());
  }
  if (this.grades) {
    this.grades = this.grades.map((item) => item.trim());
  }
  if (this.courseDurations) {
    this.courseDurations = this.courseDurations.map((item) => item.trim());
  }
  next();
});

// Static method to get all master data
masterDataSchema.statics.getAllMasterData = function () {
  return this.findOne().sort({ createdAt: -1 });
};

// Static method to get specific master type
masterDataSchema.statics.getMasterType = function (type) {
  return this.findOne({}, { [type]: 1 }).sort({ createdAt: -1 });
};

// Static method to add item to specific master type
masterDataSchema.statics.addToMasterType = async function (type, item) {
  const masterData = await this.findOne().sort({ createdAt: -1 });
  if (!masterData) {
    // Create new master data if none exists
    const newMasterData = new this({ [type]: [item] });
    return await newMasterData.save();
  }

  if (!masterData[type].includes(item)) {
    masterData[type].push(item);
    return await masterData.save();
  }
  return masterData;
};

// Static method to remove item from specific master type
masterDataSchema.statics.removeFromMasterType = async function (type, item) {
  const masterData = await this.findOne().sort({ createdAt: -1 });
  if (masterData) {
    masterData[type] = masterData[type].filter((i) => i !== item);
    return await masterData.save();
  }
  return null;
};

// Static method to update specific master type
masterDataSchema.statics.updateMasterType = async function (type, items) {
  const masterData = await this.findOne().sort({ createdAt: -1 });
  if (masterData) {
    masterData[type] = items;
    return await masterData.save();
  } else {
    // Create new master data if none exists
    const newMasterData = new this({ [type]: items });
    return await newMasterData.save();
  }
};

// Static method to sync categories from Category model
masterDataSchema.statics.syncCategoriesFromModel = async function () {
  try {
    const categories = await Category.find({}, "category_name class_type");
    const categoryNames = categories.map((cat) => cat.category_name);

    const masterData = await this.findOne().sort({ createdAt: -1 });
    if (masterData) {
      masterData.categories = categoryNames;
      return await masterData.save();
    } else {
      // Create new master data if none exists
      const newMasterData = new this({ categories: categoryNames });
      return await newMasterData.save();
    }
  } catch (error) {
    console.error("Error syncing categories:", error);
    throw error;
  }
};

// Static method to get categories from Category model
masterDataSchema.statics.getCategoriesFromModel = async function () {
  try {
    const categories = await Category.find({}, "category_name class_type");
    return categories.map((cat) => cat.category_name);
  } catch (error) {
    console.error("Error fetching categories from model:", error);
    return [];
  }
};

// Static method to get categories with class types from Category model
masterDataSchema.statics.getCategoriesWithClassTypes = async function () {
  try {
    const categories = await Category.find({}, "category_name class_type");
    return categories.map((cat) => ({
      name: cat.category_name,
      class_type: cat.class_type,
    }));
  } catch (error) {
    console.error("Error fetching categories with class types:", error);
    return [];
  }
};

const MasterData = mongoose.model("MasterData", masterDataSchema);
export default MasterData;
