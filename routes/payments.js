const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/auth');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation');

// @route   GET /api/v1/payments/key
// @desc    Get Razorpay API key
// @access  Public
router.get('/key', paymentController.getRazorpayKey);

// @route   POST /api/v1/payments/create-order
// @desc    Create a new order
// @access  Private
router.post(
  '/create-order',
  authMiddleware,
  [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('currency').optional().isString().withMessage('Currency must be a string'),
    body('productInfo').isObject().withMessage('Product information is required')
  ],
  validateRequest,
  paymentController.createOrder
);

// @route   POST /api/v1/payments/verify-payment
// @desc    Verify payment after completion
// @access  Private
router.post(
  '/verify-payment',
  authMiddleware,
  [
    body('razorpay_order_id').isString().withMessage('Order ID is required'),
    body('razorpay_payment_id').isString().withMessage('Payment ID is required'),
    body('razorpay_signature').isString().withMessage('Signature is required')
  ],
  validateRequest,
  paymentController.verifyPayment
);

// @route   GET /api/v1/payments/orders
// @desc    Get all orders for a user
// @access  Private
router.get('/orders', authMiddleware, paymentController.getUserOrders);

// @route   GET /api/v1/payments/:paymentId
// @desc    Get payment details
// @access  Private
router.get('/:paymentId', authMiddleware, paymentController.getPaymentDetails);

module.exports = router; 