import MasterData from "../models/master-data-model.js";
import Category from "../models/category-model.js";

// Helper function to calculate sessions for course duration
// Rule: 1 month = 8 sessions
const calculateSessionsForDuration = (duration) => {
  // Extract months from duration string
  const monthMatch = duration.match(/(\d+)\s*month/i);
  const weekMatch = duration.match(/(\d+)\s*week/i);
  const hourMatch = duration.match(/(\d+)\s*hour/i);
  const minuteMatch = duration.match(/(\d+)\s*minute/i);

  let totalSessions = 0;

  // Calculate sessions from months (1 month = 8 sessions)
  if (monthMatch) {
    const months = parseInt(monthMatch[1]);
    totalSessions += months * 8;
  }

  // Calculate sessions from weeks (1 week = 2 sessions, assuming 4 weeks per month)
  if (weekMatch) {
    const weeks = parseInt(weekMatch[1]);
    totalSessions += Math.ceil(weeks * 2);
  }

  // For hours/minutes, assume 1 session = 2 hours
  if (hourMatch) {
    const hours = parseInt(hourMatch[1]);
    totalSessions += Math.ceil(hours / 2);
  }

  if (minuteMatch) {
    const minutes = parseInt(minuteMatch[1]);
    const hours = minutes / 60;
    totalSessions += Math.ceil(hours / 2);
  }

  // If no time units found, return original duration
  if (totalSessions === 0) {
    return duration;
  }

  // Format: "original_duration (X sessions)"
  return `${duration} (${totalSessions} sessions)`;
};

// Helper function to extract sessions count from duration string
const extractSessionsFromDuration = (durationWithSessions) => {
  const sessionsMatch = durationWithSessions.match(/\((\d+)\s*sessions?\)/i);
  return sessionsMatch ? parseInt(sessionsMatch[1]) : 0;
};

// Get all master data
export const getAllMasterData = async (req, res) => {
  try {
    const masterData = await MasterData.getAllMasterData();

    if (!masterData) {
      // Create default master data if none exists
      const defaultMasterData = new MasterData();
      await defaultMasterData.save();

      // Sync categories from Category model
      await MasterData.syncCategoriesFromModel();

      res.status(200).json({
        success: true,
        message: "Master data created with default values",
        data: defaultMasterData,
      });
    } else {
      // Always sync categories from Category model when fetching
      const updatedMasterData = await MasterData.syncCategoriesFromModel();

      res.status(200).json({
        success: true,
        message: "Master data fetched successfully",
        data: updatedMasterData,
      });
    }
  } catch (error) {
    console.error("Error fetching master data:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching master data",
      error: error.message,
    });
  }
};

// Get specific master type
export const getMasterType = async (req, res) => {
  try {
    const { type } = req.params;

    const validTypes = [
      "parentCategories",
      "categories",
      "certificates",
      "grades",
      "courseDurations",
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid master type. Must be one of: parentCategories, categories, certificates, grades, courseDurations",
      });
    }

    // Special handling for categories - fetch from Category model
    if (type === "categories") {
      const categories = await MasterData.getCategoriesFromModel();
      res.status(200).json({
        success: true,
        message: "categories fetched successfully",
        data: categories,
      });
      return;
    }

    const masterData = await MasterData.getMasterType(type);

    if (!masterData) {
      return res.status(404).json({
        success: false,
        message: "Master data not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `${type} fetched successfully`,
      data: masterData[type] || [],
    });
  } catch (error) {
    console.error("Error fetching master type:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching master type",
      error: error.message,
    });
  }
};

// Get categories with class types
export const getCategoriesWithClassTypes = async (req, res) => {
  try {
    const categories = await MasterData.getCategoriesWithClassTypes();
    
    res.status(200).json({
      success: true,
      message: "Categories with class types fetched successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories with class types:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching categories with class types",
      error: error.message,
    });
  }
};

// Add item to specific master type
export const addToMasterType = async (req, res) => {
  try {
    const { type } = req.params;
    const { item } = req.body;

    const validTypes = [
      "parentCategories",
      "categories",
      "certificates",
      "grades",
      "courseDurations",
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid master type. Must be one of: parentCategories, categories, certificates, grades, courseDurations",
      });
    }

    if (!item || typeof item !== "string" || item.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Item must be a non-empty string",
      });
    }

    // Special handling for categories - add to Category model
    if (type === "categories") {
      const { class_type = "live" } = req.body;
      
      // Validate class_type
      const validClassTypes = ["live", "blended", "free"];
      if (!validClassTypes.includes(class_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class type. Must be one of: live, blended, free",
        });
      }

      // Check if category already exists
      const existingCategory = await Category.findOne({
        category_name: item.trim(),
      });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category already exists",
        });
      }

      // Create new category
      const newCategory = new Category({
        category_name: item.trim(),
        category_image: "",
        class_type: class_type,
        courses: [],
      });
      await newCategory.save();

      // Sync categories to master data
      await MasterData.syncCategoriesFromModel();

      res.status(200).json({
        success: true,
        message: "Category added successfully",
        data: await MasterData.getCategoriesFromModel(),
        categoryDetails: {
          name: newCategory.category_name,
          class_type: newCategory.class_type,
          id: newCategory._id
        }
      });
      return;
    }

    // Special handling for course durations - calculate sessions automatically
    if (type === "courseDurations") {
      const durationWithSessions = calculateSessionsForDuration(item.trim());

      const masterData = await MasterData.addToMasterType(
        type,
        durationWithSessions,
      );

      res.status(200).json({
        success: true,
        message: `Course duration added successfully with calculated sessions`,
        data: masterData[type],
        calculatedSessions: extractSessionsFromDuration(durationWithSessions),
      });
      return;
    }

    const masterData = await MasterData.addToMasterType(type, item.trim());

    res.status(200).json({
      success: true,
      message: `Item added to ${type} successfully`,
      data: masterData[type],
    });
  } catch (error) {
    console.error("Error adding item to master type:", error);
    res.status(500).json({
      success: false,
      message: "Error adding item to master type",
      error: error.message,
    });
  }
};

// Remove item from specific master type
export const removeFromMasterType = async (req, res) => {
  try {
    const { type, item } = req.params;

    const validTypes = [
      "parentCategories",
      "categories",
      "certificates",
      "grades",
      "courseDurations",
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid master type. Must be one of: parentCategories, categories, certificates, grades, courseDurations",
      });
    }

    if (!item) {
      return res.status(400).json({
        success: false,
        message: "Item name is required",
      });
    }

    // Special handling for categories - remove from Category model
    if (type === "categories") {
      const category = await Category.findOne({ category_name: item });
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      // Check if category has courses
      if (category.courses && category.courses.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete category with associated courses",
        });
      }

      await Category.findByIdAndDelete(category._id);

      // Sync categories to master data
      await MasterData.syncCategoriesFromModel();

      res.status(200).json({
        success: true,
        message: "Category removed successfully",
        data: await MasterData.getCategoriesFromModel(),
      });
      return;
    }

    const masterData = await MasterData.removeFromMasterType(type, item);

    if (!masterData) {
      return res.status(404).json({
        success: false,
        message: "Master data not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Item removed from ${type} successfully`,
      data: masterData[type],
    });
  } catch (error) {
    console.error("Error removing item from master type:", error);
    res.status(500).json({
      success: false,
      message: "Error removing item from master type",
      error: error.message,
    });
  }
};

// Update specific master type
export const updateMasterType = async (req, res) => {
  try {
    const { type } = req.params;
    const { items } = req.body;

    const validTypes = [
      "parentCategories",
      "categories",
      "certificates",
      "grades",
      "courseDurations",
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid master type. Must be one of: parentCategories, categories, certificates, grades, courseDurations",
      });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "Items must be an array",
      });
    }

    // Validate all items are strings
    if (
      !items.every((item) => typeof item === "string" && item.trim().length > 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "All items must be non-empty strings",
      });
    }

    // Special handling for course durations - calculate sessions automatically
    if (type === "courseDurations") {
      const itemsWithSessions = items.map((item) =>
        calculateSessionsForDuration(item.trim()),
      );

      const masterData = await MasterData.updateMasterType(
        type,
        itemsWithSessions,
      );

      res.status(200).json({
        success: true,
        message: `${type} updated successfully with calculated sessions`,
        data: masterData[type],
        calculatedSessions: itemsWithSessions.map((item) => ({
          duration: item,
          sessions: extractSessionsFromDuration(item),
        })),
      });
      return;
    }

    const masterData = await MasterData.updateMasterType(
      type,
      items.map((item) => item.trim()),
    );

    res.status(200).json({
      success: true,
      message: `${type} updated successfully`,
      data: masterData[type],
    });
  } catch (error) {
    console.error("Error updating master type:", error);
    res.status(500).json({
      success: false,
      message: "Error updating master type",
      error: error.message,
    });
  }
};

// Initialize default master data
export const initializeMasterData = async (req, res) => {
  try {
    // Check if master data already exists
    const existingMasterData = await MasterData.getAllMasterData();

    if (existingMasterData) {
      return res.status(200).json({
        success: true,
        message: "Master data already exists",
        data: existingMasterData,
      });
    }

    // Create new master data with defaults
    const masterData = new MasterData();
    await masterData.save();

    res.status(201).json({
      success: true,
      message: "Master data initialized successfully",
      data: masterData,
    });
  } catch (error) {
    console.error("Error initializing master data:", error);
    res.status(500).json({
      success: false,
      message: "Error initializing master data",
      error: error.message,
    });
  }
};

// Reset master data to defaults
export const resetMasterData = async (req, res) => {
  try {
    // Delete all existing master data
    await MasterData.deleteMany({});

    // Create new master data with defaults
    const masterData = new MasterData();
    await masterData.save();

    res.status(200).json({
      success: true,
      message: "Master data reset to defaults successfully",
      data: masterData,
    });
  } catch (error) {
    console.error("Error resetting master data:", error);
    res.status(500).json({
      success: false,
      message: "Error resetting master data",
      error: error.message,
    });
  }
};

// Get master data statistics
export const getMasterDataStats = async (req, res) => {
  try {
    const masterData = await MasterData.getAllMasterData();

    if (!masterData) {
      return res.status(404).json({
        success: false,
        message: "Master data not found",
      });
    }

    const stats = {
      parentCategories: masterData.parentCategories.length,
      categories: masterData.categories.length,
      certificates: masterData.certificates.length,
      grades: masterData.grades.length,
      courseDurations: masterData.courseDurations.length,
      total:
        masterData.parentCategories.length +
        masterData.categories.length +
        masterData.certificates.length +
        masterData.grades.length +
        masterData.courseDurations.length,
    };

    res.status(200).json({
      success: true,
      message: "Master data statistics fetched successfully",
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching master data stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching master data statistics",
      error: error.message,
    });
  }
};
