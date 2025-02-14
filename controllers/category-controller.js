const Category = require("../models/category-model");
const Course = require("../models/course-model");

// Create a new category
const createCategory = async (req, res) => {
  try {
    const { category_name, category_image } = req.body;

    // Validate input
    if (!category_name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Check for duplicate category name
    const existingCategory = await Category.findOne({ category_name });
    if (existingCategory) {
      return res
        .status(400)
        .json({ message: "Category with this name already exists" });
    }

    const category = new Category({ category_name, category_image });
    await category.save();

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating category", error });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Get a single category by ID with populated courses
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id).populate({
      path: "courses",
      select: "course_title course_category",
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category fetched successfully",
      category,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching category", error });
  }
};

// Update a category by ID
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, category_image } = req.body;

    if (!category_name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { category_name, category_image },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating category", error });
  }
};

// Delete a category by ID
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    // Find the category
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    const associatedCourses = await Course.find({ category_id: id });
    if (associatedCourses.length > 0) {
      return res.status(400).json({
        message: "Cannot delete category with associated courses",
      });
    }

    await category.deleteOne();

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting category", error });
  }
};

// Get related courses for a specific category
const getRelatedCourses = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate id
    if (!id) {
      return res.status(400).json({ message: "Category ID is required" });
    }

    // Check if the category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Find related courses
    const relatedCourses = await Course.find({
      specifications: id,
    }).select("course_title course_category");

    res.status(200).json({
      message: "Related courses fetched successfully",
      category: category.category_name,
      courses: relatedCourses,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching related courses", error });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getRelatedCourses,
};
