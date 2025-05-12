import { v4 as uuidv4 } from "uuid";

import razorpayService from "../services/razorpayService.js";
import logger from "../utils/logger.js";

import paymentProcessor from "./payment-controller.js";
import Enrollment from "../models/enrollment-model.js";

// EMI Payment Processing Helper
const processEmiPayment = async (enrollment, paymentData) => {
  try {
    await enrollment.processEmiPayment(paymentData);
    return { success: true, enrollment };
  } catch (error) {
    logger.error("EMI payment processing failed", {
      error: error.message,
      enrollmentId: enrollment._id,
      paymentData,
    });
    return { success: false, error: error.message };
  }
};

/**
 * @description Create a new order for payment (Enhanced for EMI)
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
      payment_type,
      course_id,
      enrollment_type,
      is_self_paced,
      expiry_date,
      plan_id,
      plan_name,
      duration_months,
      // EMI specific fields
      is_emi,
      emi_details,
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    // Validate EMI details if applicable
    if (is_emi && (!emi_details || !emi_details.numberOfInstallments)) {
      return res.status(400).json({
        success: false,
        message: "Invalid EMI details",
      });
    }

    const receipt = `receipt_${uuidv4()}`;
    const userId = req.user.id;

    // Enhanced productInfo with EMI details
    const enhancedProductInfo = {
      ...productInfo,
      payment_type,
      student_id: userId,
      is_emi,
      emi_details,
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
        emi_enabled: is_emi,
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

/**
 * @description Process EMI payment installment
 * @route POST /api/v1/payments/process-emi
 * @access Private
 */
export const processEmiInstallment = async (req, res) => {
  try {
    const {
      enrollment_id,
      installment_number,
      amount,
      payment_method,
      transaction_id,
    } = req.body;

    // Validate required fields
    if (!enrollment_id || !installment_number || !amount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Find enrollment
    const enrollment = await Enrollment.findById(enrollment_id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    // Process EMI payment
    const result = await processEmiPayment(enrollment, {
      installmentNumber: installment_number,
      amount,
      transactionId: transaction_id,
      paymentMethod: payment_method,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.status(200).json({
      success: true,
      message: "EMI payment processed successfully",
      data: {
        enrollment: result.enrollment,
        nextPaymentDate: result.enrollment.emiDetails.nextPaymentDate,
        remainingInstallments: result.enrollment.emiDetails.schedule.filter(
          s => s.status === "pending"
        ).length,
      },
    });
  } catch (error) {
    logger.error("EMI payment processing failed", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process EMI payment",
    });
  }
};

/**
 * @description Get EMI details for an enrollment
 * @route GET /api/v1/payments/emi/:enrollmentId
 * @access Private
 */
export const getEmiDetails = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    if (enrollment.paymentType !== "emi") {
      return res.status(400).json({
        success: false,
        message: "This is not an EMI enrollment",
      });
    }

    // Check and update access status before returning details
    await enrollment.checkAndUpdateAccess();

    res.status(200).json({
      success: true,
      data: {
        emiDetails: enrollment.emiDetails,
        accessStatus: enrollment.accessStatus,
        accessRestrictionReason: enrollment.accessRestrictionReason,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch EMI details", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch EMI details",
    });
  }
};
