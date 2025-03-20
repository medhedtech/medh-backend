const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment-controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');
const { validateEnrollment } = require('../middleware/validators/enrollmentValidator');

// Process payment and create enrollment/subscription
router.post('/process', authenticate, validateEnrollment, paymentController.processPaymentAndEnroll);

// Get all payments (enrollments and subscriptions) for a student
router.get('/student/:student_id', authenticate, validateObjectId('student_id'), paymentController.getStudentPayments);

// Get a specific payment by ID and type
router.get('/:payment_type/:payment_id', authenticate, validateObjectId('payment_id'), paymentController.getPaymentById);

// Get payment statistics (admin only)
router.get('/stats', authenticate, authorize(['admin']), paymentController.getPaymentStats);

// New receipt-related routes
// Generate receipt for existing payment
router.post('/receipt/:payment_type/:payment_id', authenticate, validateObjectId('payment_id'), paymentController.generateReceiptForExistingPayment);

// Resend receipt email
router.post('/receipt/:payment_type/:payment_id/email', authenticate, validateObjectId('payment_id'), paymentController.resendReceiptEmail);

// Get all receipts for a student
router.get('/receipts/student/:student_id', authenticate, validateObjectId('student_id'), paymentController.getStudentReceipts);

module.exports = router; 