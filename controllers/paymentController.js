import { v4 as uuidv4 } from "uuid";

import razorpayService from "../services/razorpayService.js";
import logger from "../utils/logger.js";

import paymentProcessor from "./payment-controller.js";

/**
 * @description Create a new order for payment
 * @route POST /api/v1/payments/create-order
 * @access Private
 */
export const createOrder = async (req, res) => {
  try {
    const {
      amount,
      currency,
      notes,
      productInfo,
      payment_type, // "course" or "subscription"
      // For course payments
      course_id,
      enrollment_type,
      is_self_paced,
      expiry_date,
      // For subscription payments
      plan_id,
      plan_name,
      duration_months,
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    if (!productInfo) {
      return res.status(400).json({
        success: false,
        message: "Product information is required",
      });
    }

    if (!payment_type || !["course", "subscription"].includes(payment_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment type. Must be "course" or "subscription".',
      });
    }

    const receipt = `receipt_${uuidv4()}`;
    const userId = req.user.id; // Assuming req.user is set by auth middleware

    // Enhanced productInfo with additional payment-specific data
    const enhancedProductInfo = {
      ...productInfo,
      payment_type,
      student_id: userId,
      // Add fields based on payment type
      ...(payment_type === "course" && {
        course_id,
        enrollment_type,
        is_self_paced,
        expiry_date,
      }),
      ...(payment_type === "subscription" && {
        plan_id,
        plan_name,
        duration_months,
      }),
    };

    const { order, razorpayOrder } = await razorpayService.createOrder({
      amount,
      currency,
      receipt,
      notes,
      userId,
      productInfo: enhancedProductInfo,
    });

    res.status(200).json({
      success: true,
      data: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        orderId: order._id,
      },
    });
  } catch (error) {
    logger.error("Error creating Razorpay order", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while creating order",
    });
  }
};

/**
 * @description Verify payment after completion
 * @route POST /api/v1/payments/verify-payment
 * @access Private
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "All payment verification parameters are required",
      });
    }

    const result = await razorpayService.verifyPayment({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    // Process the payment with the existing payment controller
    if (result.success && result.productInfo) {
      // Prepare data for payment processor
      const paymentResponse = {
        razorpay_payment_id,
        razorpay_signature,
        razorpay_order_id,
        amount: result.order.amount,
      };

      // Call the existing payment processor
      return paymentProcessor.processPaymentAndEnroll(
        {
          user: { id: result.order.userId },
          body: {
            ...result.productInfo, // Already contains student_id, payment_type, etc.
            paymentResponse,
            currencyCode: result.order.currency,
            getFinalPrice: () => result.order.amount,
          },
        },
        res,
      );
    }

    // If no processor integration happens, return standard response
    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: result.order,
    });
  } catch (error) {
    logger.error("Payment verification failed", {
      error: error.message,
      stack: error.stack,
    });
    res.status(400).json({
      success: false,
      message: error.message || "Payment verification failed",
    });
  }
};

/**
 * @description Get payment details
 * @route GET /api/v1/payments/:paymentId
 * @access Private
 */
export const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    const payment = await razorpayService.getPaymentDetails(paymentId);

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error("Failed to fetch payment details", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch payment details",
    });
  }
};

/**
 * @description Get all orders for a user
 * @route GET /api/v1/payments/orders
 * @access Private
 */
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming req.user is set by auth middleware

    const orders = await razorpayService.getUserOrders(userId);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    logger.error("Failed to fetch user orders", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user orders",
    });
  }
};

/**
 * @description Get Razorpay Key ID for frontend
 * @route GET /api/v1/payments/key
 * @access Public
 */
export const getRazorpayKey = (req, res) => {
  try {
    // Only expose the public key, never expose the secret key
    res.status(200).json({
      success: true,
      data: {
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch Razorpay key", {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch Razorpay key",
    });
  }
};
