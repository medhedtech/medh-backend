import crypto from "crypto";

import razorpayConfig from "../config/razorpay.js";
import { ENV_VARS } from "../config/envVars.js";
import Order from "../models/Order.js";

/**
 * Create a new Razorpay order
 * @param {Object} orderData - Order information
 * @returns {Promise<Object>} Created order details
 */
export const createOrder = async (orderData) => {
  try {
    // Defensive logging
    console.log("[RazorpayService][createOrder] orderData:", orderData);

    const razorpay = await razorpayConfig.getInstance();

    if (!razorpay) {
      throw new Error(
        "Razorpay is not initialized. Please check your credentials.",
      );
    }

    const {
      amount,
      currency = "INR",
      receipt,
      notes,
      userId,
      productInfo,
    } = orderData;

    // Validate required fields
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      throw new Error("Invalid amount: must be a positive number.");
    }
    let safeReceipt = receipt;
    if (!safeReceipt || typeof safeReceipt !== "string") {
      throw new Error(
        "Invalid receipt: must be a non-empty string up to 40 characters.",
      );
    }
    if (safeReceipt.length > 40) {
      console.warn(
        `[RazorpayService] Truncating receipt from ${safeReceipt.length} to 40 characters.`,
      );
      safeReceipt = safeReceipt.slice(0, 40);
    }

    // Create order in Razorpay
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // Amount in paise (Razorpay uses smallest currency unit)
      currency,
      receipt: safeReceipt,
      notes,
    });

    // Store order in database
    const order = new Order({
      userId,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency,
      receipt,
      notes,
      productInfo,
    });

    await order.save();
    return { order, razorpayOrder };
  } catch (error) {
    // Enhanced error handling
    let errorMsg = "Unknown error";
    if (error && typeof error === "object" && "message" in error) {
      errorMsg = error.message;
    } else if (typeof error === "string") {
      errorMsg = error;
    } else if (error) {
      try {
        errorMsg = JSON.stringify(error);
      } catch (e) {
        errorMsg = String(error);
      }
    }
    console.error("[RazorpayService][createOrder] Raw error:", error);
    throw new Error(`Failed to create Razorpay order: ${errorMsg}`);
  }
};

/**
 * Verify Razorpay payment
 * @param {Object} paymentData - Payment verification data
 * @returns {Promise<Object>} Verification result
 */
export const verifyPayment = async (paymentData) => {
  try {
    const { orderId, paymentId, signature } = paymentData;

    // Find the order in our database
    const order = await Order.findOne({ razorpayOrderId: orderId });
    if (!order) {
      throw new Error("Order not found");
    }

    // Verify signature
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", ENV_VARS.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const isSignatureValid = expectedSignature === signature;

    if (isSignatureValid) {
      // Update order status
      order.razorpayPaymentId = paymentId;
      order.razorpaySignature = signature;
      order.status = "paid";
      await order.save();

      return {
        success: true,
        order,
        productInfo: order.productInfo,
      };
    } else {
      order.status = "failed";
      await order.save();
      throw new Error("Invalid payment signature");
    }
  } catch (error) {
    throw new Error(`Payment verification failed: ${error.message}`);
  }
};

/**
 * Fetch payment details by ID
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} Payment details
 */
export const getPaymentDetails = async (paymentId) => {
  try {
    const razorpay = await razorpayConfig.getInstance();

    if (!razorpay) {
      throw new Error(
        "Razorpay is not initialized. Please check your credentials.",
      );
    }

    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    throw new Error(`Failed to fetch payment details: ${error.message}`);
  }
};

/**
 * Get all orders for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of orders
 */
export const getUserOrders = async (userId) => {
  try {
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    return orders;
  } catch (error) {
    throw new Error(`Failed to fetch user orders: ${error.message}`);
  }
};

/**
 * Retrieve order by ID
 * @param {string} orderId - Razorpay order ID
 * @returns {Promise<Object>} Order details
 */
export const getOrderById = async (orderId) => {
  try {
    const order = await Order.findOne({ razorpayOrderId: orderId });
    if (!order) {
      throw new Error("Order not found");
    }
    return order;
  } catch (error) {
    throw new Error(`Failed to fetch order: ${error.message}`);
  }
};

// Export as default object for easier importing
export default {
  createOrder,
  verifyPayment,
  getPaymentDetails,
  getUserOrders,
  getOrderById,
};
