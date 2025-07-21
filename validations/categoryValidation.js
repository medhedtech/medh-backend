import { body, param, query, validationResult } from "express-validator";

// Validation middleware to check for validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

// Validation rules for creating a category
export const validateCreateCategory = [
  body("category_name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ max: 100 })
    .withMessage("Category name cannot exceed 100 characters"),

  body("category_image")
    .optional()
    .trim()
    .isURL()
    .withMessage("Category image must be a valid URL")
    .isLength({ max: 255 })
    .withMessage("Category image URL cannot exceed 255 characters"),

  body("class_type")
    .optional()
    .isIn(["live", "blended", "free"])
    .withMessage("Class type must be one of: live, blended, free"),

  handleValidationErrors,
];

// Validation rules for updating a category
export const validateUpdateCategory = [
  param("id").isMongoId().withMessage("Invalid category ID format"),

  body("category_name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category name cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Category name cannot exceed 100 characters"),

  body("category_image")
    .optional()
    .trim()
    .isURL()
    .withMessage("Category image must be a valid URL")
    .isLength({ max: 255 })
    .withMessage("Category image URL cannot exceed 255 characters"),

  body("class_type")
    .optional()
    .isIn(["live", "blended", "free"])
    .withMessage("Class type must be one of: live, blended, free"),

  handleValidationErrors,
];

// Validation rules for getting categories
export const validateGetCategories = [
  query("class_type")
    .optional()
    .isIn(["live", "blended", "free"])
    .withMessage("Class type filter must be one of: live, blended, free"),

  handleValidationErrors,
];

// Validation rules for getting a single category by ID
export const validateGetCategoryById = [
  param("id").isMongoId().withMessage("Invalid category ID format"),
  handleValidationErrors,
];

// Validation rules for deleting a category
export const validateDeleteCategory = [
  param("id").isMongoId().withMessage("Invalid category ID format"),
  handleValidationErrors,
];

// Validation rules for getting related courses
export const validateGetRelatedCourses = [
  param("id").isMongoId().withMessage("Invalid category ID format"),
  handleValidationErrors,
];
