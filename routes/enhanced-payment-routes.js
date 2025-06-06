import express from "express";
import {
  getCoursePricing,
  getCourseBatches,
  createEnrollmentOrder,
  verifyEnrollmentPayment,
  processEnrollmentEMI,
  getEnrollmentPaymentHistory,
  transferToBatch,
  getEnrollmentDashboard
} from "../controllers/enhanced-payment-controller.js";
import { authenticateToken, authorize } from "../middleware/auth.js";
import { body, param, query, validationResult } from "express-validator";

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: errors.array()
    });
  }
  next();
};

// Validation rules
const validateCourseId = [
  param("courseId").isMongoId().withMessage("Invalid course ID format")
];

const validateEnrollmentId = [
  param("enrollmentId").isMongoId().withMessage("Invalid enrollment ID format")
];

const validateCreateOrder = [
  body("course_id")
    .isMongoId()
    .withMessage("Invalid course ID format"),
  body("enrollment_type")
    .isIn(["individual", "batch"])
    .withMessage("Enrollment type must be 'individual' or 'batch'"),
  body("batch_id")
    .optional()
    .isMongoId()
    .withMessage("Invalid batch ID format"),
  body("batch_size")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Batch size must be between 1 and 50"),
  body("currency")
    .optional()
    .isIn([
      // Major world currencies
      "USD", "EUR", "GBP", "JPY", "CNY", "AUD", "CAD", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", 
      // Asia-Pacific
      "INR", "SGD", "HKD", "KRW", "THB", "MYR", "IDR", "PHP", "TWD", "VND", "NZD",
      // Middle East & Africa
      "AED", "SAR", "QAR", "KWD", "BHD", "OMR", "JOD", "ILS", "TRY", "EGP", "ZAR", "NGN", "KES", "MAD", "TND",
      // Americas
      "BRL", "MXN", "ARS", "CLP", "COP", "PEN", "UYU", "BOB", "PYG", "VES",
      // Europe (additional)
      "RUB", "UAH", "BYN", "ISK", "ALL", "MKD", "RSD", "BAM", "GEL", "AMD", "AZN",
      // Others
      "PKR", "BDT", "LKR", "NPR", "BTN", "MVR", "AFN", "IRR", "IQD", "LBP", "SYP", "YER"
    ])
    .withMessage("Invalid currency"),
  body("payment_plan")
    .optional()
    .isIn(["full", "installment", "subscription"])
    .withMessage("Invalid payment plan"),
  body("batch_members")
    .optional()
    .isArray()
    .withMessage("Batch members must be an array"),
  body("batch_members.*")
    .optional()
    .isMongoId()
    .withMessage("Invalid batch member ID format")
];

const validatePaymentVerification = [
  body("razorpay_order_id")
    .notEmpty()
    .withMessage("Razorpay order ID is required"),
  body("razorpay_payment_id")
    .notEmpty()
    .withMessage("Razorpay payment ID is required"),
  body("razorpay_signature")
    .notEmpty()
    .withMessage("Razorpay signature is required"),
  body("enrollment_data")
    .isObject()
    .withMessage("Enrollment data is required")
];

const validateEMIPayment = [
  body("enrollment_id")
    .isMongoId()
    .withMessage("Invalid enrollment ID format"),
  body("installment_number")
    .isInt({ min: 1 })
    .withMessage("Invalid installment number"),
  body("amount")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a positive number"),
  body("payment_method")
    .notEmpty()
    .withMessage("Payment method is required"),
  body("transaction_id")
    .notEmpty()
    .withMessage("Transaction ID is required")
];

const validateTransferToBatch = [
  body("enrollment_id")
    .isMongoId()
    .withMessage("Invalid enrollment ID format"),
  body("batch_id")
    .isMongoId()
    .withMessage("Invalid batch ID format")
];

const validatePricingQuery = [
  query("enrollment_type")
    .optional()
    .isIn(["individual", "batch"])
    .withMessage("Enrollment type must be 'individual' or 'batch'"),
  query("batch_size")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Batch size must be between 1 and 50"),
  query("currency")
    .optional()
    .isIn([
      // Major world currencies
      "USD", "EUR", "GBP", "JPY", "CNY", "AUD", "CAD", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", 
      // Asia-Pacific
      "INR", "SGD", "HKD", "KRW", "THB", "MYR", "IDR", "PHP", "TWD", "VND", "NZD",
      // Middle East & Africa
      "AED", "SAR", "QAR", "KWD", "BHD", "OMR", "JOD", "ILS", "TRY", "EGP", "ZAR", "NGN", "KES", "MAD", "TND",
      // Americas
      "BRL", "MXN", "ARS", "CLP", "COP", "PEN", "UYU", "BOB", "PYG", "VES",
      // Europe (additional)
      "RUB", "UAH", "BYN", "ISK", "ALL", "MKD", "RSD", "BAM", "GEL", "AMD", "AZN",
      // Others
      "PKR", "BDT", "LKR", "NPR", "BTN", "MVR", "AFN", "IRR", "IQD", "LBP", "SYP", "YER"
    ])
    .withMessage("Invalid currency")
];

/**
 * Public Routes - No authentication required
 */

// Get course pricing information
router.get(
  "/course-pricing/:courseId",
  validateCourseId,
  validatePricingQuery,
  handleValidationErrors,
  getCoursePricing
);

// Get available batches for a course
router.get(
  "/course-batches/:courseId",
  validateCourseId,
  handleValidationErrors,
  getCourseBatches
);

/**
 * Private Routes - Authentication required
 */

// Create payment order for course enrollment
router.post(
  "/create-enrollment-order",
  authenticateToken,
  authorize(["student", "admin"]),
  validateCreateOrder,
  handleValidationErrors,
  createEnrollmentOrder
);

// Verify payment and create enrollment
router.post(
  "/verify-enrollment-payment",
  authenticateToken,
  authorize(["student", "admin"]),
  validatePaymentVerification,
  handleValidationErrors,
  verifyEnrollmentPayment
);

// Process EMI payment for enrollment
router.post(
  "/process-enrollment-emi",
  authenticateToken,
  authorize(["student", "admin"]),
  validateEMIPayment,
  handleValidationErrors,
  processEnrollmentEMI
);

// Get enrollment payment history
router.get(
  "/enrollment-history/:enrollmentId",
  authenticateToken,
  authorize(["student", "admin", "instructor"]),
  validateEnrollmentId,
  handleValidationErrors,
  getEnrollmentPaymentHistory
);

// Transfer enrollment from individual to batch
router.post(
  "/transfer-to-batch",
  authenticateToken,
  authorize(["student", "admin"]),
  validateTransferToBatch,
  handleValidationErrors,
  transferToBatch
);

// Get enrollment dashboard for student
router.get(
  "/enrollment-dashboard",
  authenticateToken,
  authorize(["student", "admin"]),
  getEnrollmentDashboard
);

/**
 * Admin-only Routes
 */

// Get all enrollment statistics (admin only)
router.get(
  "/admin/enrollment-stats",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const Enrollment = (await import("../models/enrollment-model.js")).default;
      const stats = await Enrollment.getDashboardStats();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get enrollment details by ID (admin/instructor only)
router.get(
  "/admin/enrollment/:enrollmentId",
  authenticateToken,
  authorize(["admin", "instructor"]),
  validateEnrollmentId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { enrollmentId } = req.params;
      const Enrollment = (await import("../models/enrollment-model.js")).default;
      
      const enrollment = await Enrollment.findById(enrollmentId)
        .populate('student', 'full_name email phone_numbers')
        .populate('course', 'course_title course_image slug')
        .populate('batch', 'batch_name batch_code start_date end_date assigned_instructor')
        .populate('created_by', 'full_name email');
      
      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: 'Enrollment not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: enrollment
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Update enrollment status (admin only)
router.patch(
  "/admin/enrollment/:enrollmentId/status",
  authenticateToken,
  authorize(["admin"]),
  validateEnrollmentId,
  [
    body("status")
      .isIn(["active", "completed", "cancelled", "on_hold", "expired"])
      .withMessage("Invalid status"),
    body("notes")
      .optional()
      .isString()
      .withMessage("Notes must be a string")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { enrollmentId } = req.params;
      const { status, notes } = req.body;
      const Enrollment = (await import("../models/enrollment-model.js")).default;
      
      const enrollment = await Enrollment.findById(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: 'Enrollment not found'
        });
      }
      
      enrollment.status = status;
      if (notes) {
        enrollment.notes = notes;
      }
      
      await enrollment.save();
      
      res.status(200).json({
        success: true,
        message: 'Enrollment status updated successfully',
        data: enrollment
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

export default router; 