import crypto from "crypto";

import razorpay from "../config/razorpay.js";
import Order from "../models/Order.js";

/**
 * Create a new Razorpay order
 * @param {Object} orderData - Order information
 * @returns {Promise<Object>} Created order details
 */
export const createOrder = async (orderData) => {
  try {
    const {
      amount,
      currency = "INR",
      receipt,
      notes,
      userId,
      productInfo,
    } = orderData;

    // Create order in Razorpay
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // Amount in paise (Razorpay uses smallest currency unit)
      currency,
      receipt,
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
    throw new Error(`Failed to create Razorpay order: ${error.message}`);
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
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
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
