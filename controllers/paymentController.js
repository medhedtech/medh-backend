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

/**
 * @description Get comprehensive payment history for user profile
 * @route GET /api/v1/payments/user/:userId/comprehensive-history
 * @access Private
 */
export const getComprehensivePaymentHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Authorization check
    if (userId !== requestingUserId && !['admin', 'super-admin'].includes(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view payment history"
      });
    }

    // Get all payment data from multiple sources
    const paymentHistory = [];
    
    // Get Razorpay orders
    const orders = await razorpayService.getUserOrders(userId);
    orders.forEach(order => {
      paymentHistory.push({
        source: 'razorpay_order',
        order_id: order._id,
        razorpay_order_id: order.razorpayOrderId,
        amount: order.amount,
        currency: order.currency,
        payment_date: order.createdAt,
        payment_method: 'razorpay',
        payment_status: order.status,
        product_info: order.productInfo,
        payment_type: order.productInfo?.payment_type || 'course'
      });
    });

    // Get enrollment payments
    const EnrolledCourse = (await import("../models/enrolled-courses-model.js")).default;
    const enrollments = await EnrolledCourse.find({ 
      student_id: userId 
    }).populate('course_id', 'course_title course_image');

    enrollments.forEach(enrollment => {
      if (enrollment.payment_details) {
        paymentHistory.push({
          source: 'enrollment',
          enrollment_id: enrollment._id,
          course_title: enrollment.course_id?.course_title,
          amount: enrollment.payment_details.amount,
          currency: enrollment.payment_details.currency,
          payment_date: enrollment.payment_details.payment_date,
          payment_method: enrollment.payment_details.payment_method,
          transaction_id: enrollment.payment_details.payment_id,
          payment_status: enrollment.payment_status,
          payment_type: enrollment.payment_type || 'course_enrollment',
          emi_details: enrollment.payment_type === 'emi' ? {
            total_installments: enrollment.emiDetails?.numberOfInstallments,
            installment_amount: enrollment.emiDetails?.installmentAmount,
            paid_installments: enrollment.emiDetails?.schedule?.filter(s => s.status === 'paid').length || 0,
            pending_installments: enrollment.emiDetails?.schedule?.filter(s => s.status === 'pending').length || 0,
            overdue_installments: enrollment.emiDetails?.schedule?.filter(s => {
              return s.status === 'pending' && new Date(s.dueDate) < new Date();
            }).length || 0,
            next_payment_date: enrollment.emiDetails?.nextPaymentDate,
            schedule: enrollment.emiDetails?.schedule || []
          } : null
        });
      }

      // Add individual EMI installment payments
      if (enrollment.emiDetails?.schedule) {
        enrollment.emiDetails.schedule.forEach((installment, index) => {
          if (installment.status === 'paid' && installment.paidDate) {
            paymentHistory.push({
              source: 'emi_installment',
              enrollment_id: enrollment._id,
              course_title: enrollment.course_id?.course_title,
              amount: installment.amount,
              currency: enrollment.payment_details?.currency || 'USD',
              payment_date: installment.paidDate,
              payment_method: installment.paymentMethod || 'unknown',
              transaction_id: installment.transactionId,
              payment_status: 'completed',
              payment_type: 'emi_installment',
              installment_details: {
                installment_number: index + 1,
                due_date: installment.dueDate,
                late_fee: installment.lateFee || 0,
                parent_enrollment_id: enrollment._id
              }
            });
          }
        });
      }
    });

    // Sort by payment date (most recent first)
    paymentHistory.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

    // Calculate comprehensive analytics
    const analytics = calculatePaymentAnalytics(paymentHistory, enrollments);

    res.status(200).json({
      success: true,
      message: "Comprehensive payment history retrieved successfully",
      data: {
        payment_history: paymentHistory,
        analytics: analytics,
        summary: {
          total_transactions: paymentHistory.length,
          total_amount: paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0),
          total_courses: enrollments.length,
          emi_enrollments: enrollments.filter(e => e.payment_type === 'emi').length
        }
      }
    });

  } catch (error) {
    logger.error("Failed to fetch comprehensive payment history", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch comprehensive payment history",
    });
  }
};

/**
 * Helper function to calculate comprehensive payment analytics
 */
const calculatePaymentAnalytics = (paymentHistory, enrollments) => {
  // Separate payment types
  const regularPayments = paymentHistory.filter(p => !p.payment_type?.includes('emi'));
  const emiPayments = paymentHistory.filter(p => p.payment_type?.includes('emi'));
  const installmentPayments = paymentHistory.filter(p => p.payment_type === 'emi_installment');
  const emiEnrollments = paymentHistory.filter(p => p.payment_type === 'emi_enrollment');

  // Calculate totals
  const totalSpent = paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);
  const regularTotal = regularPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const emiTotal = emiPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Calculate EMI metrics
  const emiMetrics = {
    total_emi_enrollments: emiEnrollments.length,
    total_emi_amount: emiEnrollments.reduce((sum, p) => sum + (p.amount || 0), 0),
    total_installments_paid: installmentPayments.length,
    total_installment_amount: installmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    
    active_emi_enrollments: enrollments.filter(e => 
      e.payment_type === 'emi' && ['active', 'pending'].includes(e.payment_status)
    ).length,
    
    total_pending_amount: enrollments.reduce((total, enrollment) => {
      if (enrollment.payment_type === 'emi' && enrollment.emiDetails?.schedule) {
        const pendingInstallments = enrollment.emiDetails.schedule.filter(s => s.status === 'pending');
        return total + pendingInstallments.reduce((sum, installment) => sum + (installment.amount || 0), 0);
      }
      return total;
    }, 0),
    
    overdue_amount: enrollments.reduce((total, enrollment) => {
      if (enrollment.payment_type === 'emi' && enrollment.emiDetails?.schedule) {
        const now = new Date();
        const overdueInstallments = enrollment.emiDetails.schedule.filter(s => 
          s.status === 'pending' && new Date(s.dueDate) < now
        );
        return total + overdueInstallments.reduce((sum, installment) => sum + (installment.amount || 0), 0);
      }
      return total;
    }, 0)
  };

  // Payment method analysis
  const paymentMethods = paymentHistory.reduce((acc, payment) => {
    const method = payment.payment_method || 'unknown';
    if (!acc[method]) {
      acc[method] = { count: 0, total_amount: 0 };
    }
    acc[method].count++;
    acc[method].total_amount += payment.amount || 0;
    return acc;
  }, {});

  // Monthly spending analysis
  const monthlySpending = paymentHistory.reduce((acc, payment) => {
    const month = new Date(payment.payment_date).toISOString().slice(0, 7); // YYYY-MM
    if (!acc[month]) {
      acc[month] = { 
        total: 0, 
        count: 0, 
        regular: 0, 
        emi: 0, 
        installment: 0 
      };
    }
    acc[month].total += payment.amount || 0;
    acc[month].count++;
    
    if (payment.payment_type?.includes('emi')) {
      if (payment.payment_type === 'emi_installment') {
        acc[month].installment += payment.amount || 0;
      } else {
        acc[month].emi += payment.amount || 0;
      }
    } else {
      acc[month].regular += payment.amount || 0;
    }
    
    return acc;
  }, {});

  // Transaction success rate
  const successfulTransactions = paymentHistory.filter(p => 
    ['completed', 'success', 'paid'].includes(p.payment_status?.toLowerCase())
  ).length;
  
  const failedTransactions = paymentHistory.filter(p => 
    ['failed', 'cancelled', 'rejected'].includes(p.payment_status?.toLowerCase())
  ).length;

  return {
    financial_overview: {
      total_spent: totalSpent,
      regular_payments_total: regularTotal,
      emi_payments_total: emiTotal,
      average_transaction_amount: paymentHistory.length > 0 ? totalSpent / paymentHistory.length : 0,
      largest_transaction: Math.max(...paymentHistory.map(p => p.amount || 0), 0)
    },
    
    transaction_analytics: {
      total_transactions: paymentHistory.length,
      successful_transactions: successfulTransactions,
      failed_transactions: failedTransactions,
      pending_transactions: paymentHistory.filter(p => 
        ['pending', 'processing'].includes(p.payment_status?.toLowerCase())
      ).length,
      success_rate: paymentHistory.length > 0 ? (successfulTransactions / paymentHistory.length * 100) : 100
    },
    
    payment_methods: paymentMethods,
    
    emi_analytics: emiMetrics,
    
    spending_patterns: {
      monthly_breakdown: monthlySpending,
      payment_frequency: calculatePaymentFrequency(paymentHistory),
      seasonal_trends: calculateSeasonalTrends(paymentHistory)
    },
    
    financial_health: {
      payment_consistency: calculatePaymentConsistency(paymentHistory),
      emi_default_risk: emiMetrics.overdue_amount > 0 ? 'high' : 
                        emiMetrics.total_pending_amount > emiMetrics.total_emi_amount * 0.3 ? 'medium' : 'low',
      outstanding_obligations: emiMetrics.total_pending_amount,
      next_payment_due: getNextPaymentDue(enrollments)
    }
  };
};

// Helper functions for payment analytics
const calculatePaymentFrequency = (payments) => {
  if (payments.length < 2) return { average_days_between_payments: 0, frequency_category: 'insufficient_data' };
  
  const sortedDates = payments
    .map(p => new Date(p.payment_date))
    .sort((a, b) => a - b);
  
  let totalDays = 0;
  for (let i = 1; i < sortedDates.length; i++) {
    const daysDiff = (sortedDates[i] - sortedDates[i-1]) / (1000 * 60 * 60 * 24);
    totalDays += daysDiff;
  }
  
  const averageDays = Math.round(totalDays / (sortedDates.length - 1));
  
  let frequencyCategory;
  if (averageDays <= 7) frequencyCategory = 'very_frequent';
  else if (averageDays <= 30) frequencyCategory = 'frequent';
  else if (averageDays <= 90) frequencyCategory = 'moderate';
  else frequencyCategory = 'infrequent';
  
  return {
    average_days_between_payments: averageDays,
    frequency_category: frequencyCategory,
    first_payment: sortedDates[0],
    last_payment: sortedDates[sortedDates.length - 1]
  };
};

const calculateSeasonalTrends = (payments) => {
  const seasons = { spring: 0, summer: 0, autumn: 0, winter: 0 };
  
  payments.forEach(payment => {
    const month = new Date(payment.payment_date).getMonth();
    if (month >= 2 && month <= 4) seasons.spring += payment.amount || 0;
    else if (month >= 5 && month <= 7) seasons.summer += payment.amount || 0;
    else if (month >= 8 && month <= 10) seasons.autumn += payment.amount || 0;
    else seasons.winter += payment.amount || 0;
  });
  
  return seasons;
};

const calculatePaymentConsistency = (payments) => {
  if (payments.length < 3) return 'insufficient_data';
  
  const successfulPayments = payments.filter(p => 
    ['completed', 'success', 'paid'].includes(p.payment_status?.toLowerCase())
  );
  
  const consistencyScore = (successfulPayments.length / payments.length) * 100;
  
  if (consistencyScore >= 95) return 'excellent';
  if (consistencyScore >= 85) return 'good';
  if (consistencyScore >= 70) return 'fair';
  return 'poor';
};

const getNextPaymentDue = (enrollments) => {
  let nextPaymentDate = null;
  let nextPaymentAmount = 0;
  
  enrollments.forEach(enrollment => {
    if (enrollment.payment_type === 'emi' && enrollment.emiDetails?.schedule) {
      const pendingInstallments = enrollment.emiDetails.schedule.filter(s => s.status === 'pending');
      if (pendingInstallments.length > 0) {
        const nextInstallment = pendingInstallments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
        if (!nextPaymentDate || new Date(nextInstallment.dueDate) < new Date(nextPaymentDate)) {
          nextPaymentDate = nextInstallment.dueDate;
          nextPaymentAmount = nextInstallment.amount;
        }
      }
    }
  });
  
  return nextPaymentDate ? { date: nextPaymentDate, amount: nextPaymentAmount } : null;
};
