import ParentCategory from "../models/parent-category-model.js";
import Category from "../models/category-model.js";
import Course from "../models/course-model.js";

// Create a new parent category
export const createParentCategory = async (req, res) => {
  try {
    const { name, description, icon, color, isActive, sortOrder, metadata } =
      req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Parent category name is required",
      });
    }

    // Check for duplicate parent category name
    const existingParentCategory = await ParentCategory.findOne({ name });
    if (existingParentCategory) {
      return res.status(400).json({
        success: false,
        message: "Parent category with this name already exists",
      });
    }

    const parentCategory = new ParentCategory({
      name,
      description,
      icon,
      color,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
      metadata,
    });

    await parentCategory.save();

    res.status(201).json({
      success: true,
      message: "Parent category created successfully",
      data: parentCategory,
    });
  } catch (error) {
    console.error("Error creating parent category:", error);
    res.status(500).json({
      success: false,
      message: "Error creating parent category",
      error: error.message,
    });
  }
};

// Get all parent categories
export const getParentCategories = async (req, res) => {
  try {
    const {
      isActive,
      sortBy = "sortOrder",
      order = "asc",
      limit,
      page = 1,
    } = req.query;

    // Build query
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = order === "desc" ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * (parseInt(limit) || 0);
    const limitNum = parseInt(limit) || 0;

    let parentCategoriesQuery = ParentCategory.find(query).sort(sort);

    if (limitNum > 0) {
      parentCategoriesQuery = parentCategoriesQuery.skip(skip).limit(limitNum);
    }

    const parentCategories = await parentCategoriesQuery;

    // Get total count for pagination
    const total = await ParentCategory.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Parent categories fetched successfully",
      data: parentCategories,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error) {
    console.error("Error fetching parent categories:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching parent categories",
      error: error.message,
    });
  }
};

// Get a single parent category by ID
export const getParentCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Parent category ID is required",
      });
    }

    const parentCategory = await ParentCategory.findById(id);

    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: "Parent category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Parent category fetched successfully",
      data: parentCategory,
    });
  } catch (error) {
    console.error("Error fetching parent category:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching parent category",
      error: error.message,
    });
  }
};

// Update a parent category by ID
export const updateParentCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, isActive, sortOrder, metadata } =
      req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Parent category ID is required",
      });
    }

    // Check if parent category exists
    const existingParentCategory = await ParentCategory.findById(id);
    if (!existingParentCategory) {
      return res.status(404).json({
        success: false,
        message: "Parent category not found",
      });
    }

    // Check for duplicate name if name is being updated
    if (name && name !== existingParentCategory.name) {
      const duplicateParentCategory = await ParentCategory.findOne({ name });
      if (duplicateParentCategory) {
        return res.status(400).json({
          success: false,
          message: "Parent category with this name already exists",
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (metadata !== undefined) updateData.metadata = metadata;

    const updatedParentCategory = await ParentCategory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Parent category updated successfully",
      data: updatedParentCategory,
    });
  } catch (error) {
    console.error("Error updating parent category:", error);
    res.status(500).json({
      success: false,
      message: "Error updating parent category",
      error: error.message,
    });
  }
};

// Delete a parent category by ID
export const deleteParentCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Parent category ID is required",
      });
    }

    // Check if parent category exists
    const parentCategory = await ParentCategory.findById(id);
    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: "Parent category not found",
      });
    }

    // Check if there are any categories associated with this parent category
    const associatedCategories = await Category.find({ parentCategory: id });
    if (associatedCategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete parent category with associated categories",
        associatedCategoriesCount: associatedCategories.length,
      });
    }

    // Check if there are any courses directly associated with this parent category
    const associatedCourses = await Course.find({ parentCategory: id });
    if (associatedCourses.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete parent category with associated courses",
        associatedCoursesCount: associatedCourses.length,
      });
    }

    await ParentCategory.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Parent category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting parent category:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting parent category",
      error: error.message,
    });
  }
};

// Get parent category with associated categories and courses
export const getParentCategoryDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Parent category ID is required",
      });
    }

    const parentCategory = await ParentCategory.findById(id);
    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: "Parent category not found",
      });
    }

    // Get associated categories
    const associatedCategories = await Category.find({ parentCategory: id });

    // Get associated courses
    const associatedCourses = await Course.find({ parentCategory: id })
      .select("course_title course_category course_duration prices status")
      .limit(10);

    res.status(200).json({
      success: true,
      message: "Parent category details fetched successfully",
      data: {
        parentCategory,
        associatedCategories,
        associatedCourses,
        stats: {
          categoriesCount: associatedCategories.length,
          coursesCount: associatedCourses.length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching parent category details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching parent category details",
      error: error.message,
    });
  }
};

// Bulk create default parent categories
export const createDefaultParentCategories = async (req, res) => {
  try {
    const defaultCategories = [
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
        description:
          "Career-focused courses and professional development programs",
        icon: "professional-icon",
        color: "#3B82F6",
        sortOrder: 2,
        metadata: {
          targetAudience:
            "Working professionals and career-oriented individuals",
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

    const createdCategories = [];
    const errors = [];

    for (const categoryData of defaultCategories) {
      try {
        const existingCategory = await ParentCategory.findOne({
          name: categoryData.name,
        });
        if (existingCategory) {
          errors.push(`Category "${categoryData.name}" already exists`);
          continue;
        }

        const category = new ParentCategory(categoryData);
        await category.save();
        createdCategories.push(category);
      } catch (error) {
        errors.push(`Error creating "${categoryData.name}": ${error.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: "Default parent categories creation completed",
      data: {
        created: createdCategories,
        errors: errors.length > 0 ? errors : null,
      },
    });
  } catch (error) {
    console.error("Error creating default parent categories:", error);
    res.status(500).json({
      success: false,
      message: "Error creating default parent categories",
      error: error.message,
    });
  }
};
