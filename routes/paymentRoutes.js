const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment-controller');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

// Process payment and create enrollment/subscription
router.post('/process', authenticateUser, paymentController.processPaymentAndEnroll);

// Get all payments (enrollments and subscriptions) for a student
router.get('/student/:student_id', authenticateUser, paymentController.getStudentPayments);

// Get a specific payment by ID and type
router.get('/:payment_type/:payment_id', authenticateUser, paymentController.getPaymentById);

// Get payment statistics (admin only)
router.get('/stats', authenticateUser, authorizeRoles('admin'), paymentController.getPaymentStats);

// New receipt-related routes
// Generate receipt for existing payment
router.post('/receipt/:payment_type/:payment_id', authenticateUser, paymentController.generateReceiptForExistingPayment);

// Resend receipt email
router.post('/receipt/:payment_type/:payment_id/email', authenticateUser, paymentController.resendReceiptEmail);

// Get all receipts for a student
router.get('/receipts/student/:student_id', authenticateUser, paymentController.getStudentReceipts);

module.exports = router; 