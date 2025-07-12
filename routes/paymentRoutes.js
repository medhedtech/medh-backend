import express from "express";

const router = express.Router();
import * as paymentController from "../controllers/paymentController.js";
import * as paymentProcessor from "../controllers/payment-controller.js";
import { authenticateToken, authorize } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validation.js";
import { validateEnrollment } from "../middleware/validators/enrollmentValidator.js";
import { body } from "express-validator";
import { validateRequest } from "../middleware/validation.js";

// Process payment and create enrollment/subscription
router.post(
  "/process",
  authenticateToken,
  validateEnrollment,
  paymentProcessor.processPaymentAndEnroll,
);

// Get all payments (enrollments and subscriptions) for a student
router.get(
  "/student/:student_id",
  authenticateToken,
  validateObjectId("student_id"),
  paymentProcessor.getStudentPayments,
);

// Get a specific payment by ID and type
router.get(
  "/:payment_type/:payment_id",
  authenticateToken,
  validateObjectId("payment_id"),
  paymentProcessor.getPaymentById,
);

// Get payment statistics (admin only)
router.get(
  "/stats",
  authenticateToken,
  authorize(["admin"]),
  paymentProcessor.getPaymentStats,
);

// New receipt-related routes
// Generate receipt for existing payment
router.post(
  "/receipt/:payment_type/:payment_id",
  authenticateToken,
  validateObjectId("payment_id"),
  paymentProcessor.generateReceiptForExistingPayment,
);

// Resend receipt email
router.post(
  "/receipt/:payment_type/:payment_id/email",
  authenticateToken,
  validateObjectId("payment_id"),
  paymentProcessor.resendReceiptEmail,
);

// Get all receipts for a student
router.get(
  "/receipts/student/:student_id",
  authenticateToken,
  validateObjectId("student_id"),
  paymentProcessor.getStudentReceipts,
);

// Create order (Razorpay)
router.post(
  "/create-order",
  authenticateToken,
  [
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("currency")
      .optional()
      .isString()
      .withMessage("Currency must be a string"),
    body("productInfo")
      .isObject()
      .withMessage("Product information is required"),
  ],
  validateRequest,
  paymentController.createOrder,
);

// Get Razorpay Key
router.get("/key", paymentController.getRazorpayKey);

export default router;
