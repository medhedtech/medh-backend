import { body, validationResult } from "express-validator";

/**
 * Validates enrollment data
 * @returns {Array} Array of validation middleware functions
 */
export const validateEnrollment = [
  // Required fields validation - support both naming conventions
  body("student_id")
    .optional()
    .isMongoId()
    .withMessage("Invalid Student ID format"),

  body("course_id")
    .optional()
    .isMongoId()
    .withMessage("Invalid Course ID format"),

  body("courseId")
    .optional()
    .isMongoId()
    .withMessage("Invalid Course ID format"),

  body("batchId")
    .optional()
    .isMongoId()
    .withMessage("Invalid Batch ID format"),

  // Custom validation to ensure at least one of the required fields is present
  body()
    .custom((value, { req }) => {
      const hasCourseId = value.course_id || value.courseId;
      const hasBatchId = value.batch_id || value.batchId;
      
      if (!hasCourseId) {
        throw new Error("Course ID is required (course_id or courseId)");
      }
      
      if (!hasBatchId) {
        throw new Error("Batch ID is required (batch_id or batchId)");
      }
      
      return true;
    }),

  // Optional fields validation
  body("expiry_date")
    .optional()
    .isISO8601()
    .withMessage("Invalid expiry date format")
    .custom((value) => {
      const date = new Date(value);
      if (date <= new Date()) {
        throw new Error("Expiry date must be in the future");
      }
      return true;
    }),

  body("is_self_paced")
    .optional()
    .isBoolean()
    .withMessage("is_self_paced must be a boolean"),

  body("enrollment_type")
    .optional()
    .isIn(["individual", "batch", "corporate"])
    .withMessage("Invalid enrollment type"),

  body("batch_size")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Batch size must be a positive integer"),

  body("payment_status")
    .optional()
    .isIn(["pending", "completed", "failed", "refunded", "partial"])
    .withMessage("Invalid payment status"),

  body("status")
    .optional()
    .isIn(["active", "completed", "dropped", "suspended", "expired"])
    .withMessage("Invalid status"),

  // Payment details validation
  body("paymentResponse")
    .optional()
    .isObject()
    .withMessage("Payment response must be an object"),

  body("currencyCode")
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency code must be a 3-letter code"),

  body("activePricing")
    .optional()
    .isObject()
    .withMessage("Active pricing must be an object"),

  // Metadata validation
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];
