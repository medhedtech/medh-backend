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

// Validation rules for creating a parent category
export const validateCreateParentCategory = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Parent category name is required")
    .isIn([
      "Children & Teens",
      "Professionals",
      "Homemakers",
      "Lifelong Learners",
    ])
    .withMessage(
      "Parent category name must be one of: Children & Teens, Professionals, Homemakers, Lifelong Learners",
    )
    .isLength({ max: 50 })
    .withMessage("Parent category name cannot exceed 50 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("icon")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Icon name cannot exceed 100 characters"),

  body("color")
    .optional()
    .trim()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Color must be a valid hex color code"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),

  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer"),

  body("metadata.targetAudience")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Target audience cannot exceed 200 characters"),

  body("metadata.ageRange.min")
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage("Minimum age must be between 0 and 150"),

  body("metadata.ageRange.max")
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage("Maximum age must be between 0 and 150")
    .custom((value, { req }) => {
      const minAge = req.body.metadata?.ageRange?.min;
      if (minAge && value <= minAge) {
        throw new Error("Maximum age must be greater than minimum age");
      }
      return true;
    }),

  body("metadata.skillLevel")
    .optional()
    .isIn(["beginner", "intermediate", "advanced", "all"])
    .withMessage(
      "Skill level must be one of: beginner, intermediate, advanced, all",
    ),

  handleValidationErrors,
];

// Validation rules for updating a parent category
export const validateUpdateParentCategory = [
  param("id").isMongoId().withMessage("Invalid parent category ID format"),

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Parent category name cannot be empty")
    .isIn([
      "Children & Teens",
      "Professionals",
      "Homemakers",
      "Lifelong Learners",
    ])
    .withMessage(
      "Parent category name must be one of: Children & Teens, Professionals, Homemakers, Lifelong Learners",
    )
    .isLength({ max: 50 })
    .withMessage("Parent category name cannot exceed 50 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("icon")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Icon name cannot exceed 100 characters"),

  body("color")
    .optional()
    .trim()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Color must be a valid hex color code"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),

  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer"),

  body("metadata.targetAudience")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Target audience cannot exceed 200 characters"),

  body("metadata.ageRange.min")
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage("Minimum age must be between 0 and 150"),

  body("metadata.ageRange.max")
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage("Maximum age must be between 0 and 150")
    .custom((value, { req }) => {
      const minAge = req.body.metadata?.ageRange?.min;
      if (minAge && value <= minAge) {
        throw new Error("Maximum age must be greater than minimum age");
      }
      return true;
    }),

  body("metadata.skillLevel")
    .optional()
    .isIn(["beginner", "intermediate", "advanced", "all"])
    .withMessage(
      "Skill level must be one of: beginner, intermediate, advanced, all",
    ),

  handleValidationErrors,
];

// Validation rules for getting parent categories
export const validateGetParentCategories = [
  query("isActive")
    .optional()
    .isIn(["true", "false"])
    .withMessage("isActive must be either 'true' or 'false'"),

  query("sortBy")
    .optional()
    .isIn(["name", "sortOrder", "createdAt", "updatedAt"])
    .withMessage(
      "sortBy must be one of: name, sortOrder, createdAt, updatedAt",
    ),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("order must be either 'asc' or 'desc'"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  handleValidationErrors,
];

// Validation rules for getting a single parent category
export const validateGetParentCategoryById = [
  param("id").isMongoId().withMessage("Invalid parent category ID format"),

  handleValidationErrors,
];

// Validation rules for deleting a parent category
export const validateDeleteParentCategory = [
  param("id").isMongoId().withMessage("Invalid parent category ID format"),

  handleValidationErrors,
];

// Validation rules for getting parent category details
export const validateGetParentCategoryDetails = [
  param("id").isMongoId().withMessage("Invalid parent category ID format"),

  handleValidationErrors,
];
