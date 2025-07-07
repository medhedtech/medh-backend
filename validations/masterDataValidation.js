import { body, param, validationResult } from "express-validator";

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

// Validation for master type parameter
export const validateMasterType = [
  param("type")
    .isIn([
      "parentCategories",
      "categories",
      "certificates",
      "grades",
      "courseDurations",
    ])
    .withMessage(
      "Master type must be one of: parentCategories, categories, certificates, grades, courseDurations",
    ),

  handleValidationErrors,
];

// Validation for adding item to master type
export const validateAddItem = [
  body("item")
    .trim()
    .notEmpty()
    .withMessage("Item is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Item must be between 1 and 100 characters"),

  body("class_type")
    .optional()
    .isIn(["live", "blended", "free"])
    .withMessage("Class type must be one of: live, blended, free"),

  handleValidationErrors,
];

// Validation for updating items in master type
export const validateUpdateItems = [
  body("items")
    .isArray()
    .withMessage("Items must be an array")
    .notEmpty()
    .withMessage("Items array cannot be empty"),

  body("items.*")
    .trim()
    .notEmpty()
    .withMessage("All items must be non-empty strings")
    .isLength({ min: 1, max: 100 })
    .withMessage("Each item must be between 1 and 100 characters"),

  handleValidationErrors,
];

// Validation for item parameter in delete route
export const validateItemParam = [
  param("item")
    .trim()
    .notEmpty()
    .withMessage("Item name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Item must be between 1 and 100 characters"),

  handleValidationErrors,
];
