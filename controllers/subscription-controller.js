const Subscription = require('../models/subscription-model');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');
const PDF = require('html-pdf-chrome');
const chromeService = require('../utils/chromeService');
const { uploadFile } = require('../utils/uploadFile');
const { generateSubscriptionPdfContent } = require('../utils/htmlTemplate');
const nodemailer = require("nodemailer");
const CoorporateEnrolledModule = require("../models/coorporate-enrolled-modules.model");

const pdfOptions = {
  port: 9222, // Chrome debug port
  printOptions: {
    landscape: false,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '1cm',
      bottom: '1cm',
      left: '1cm',
      right: '1cm'
    }
  }
};

// Create a new subscription
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const createSubscription = async (req, res) => {
  try {
    const {
      user_id,
      plan_name,
      amount,
      duration_months,
      start_date,
      payment_status,
      payment_id
    } = req.body;

    const subscription = new Subscription({
      user_id,
      plan_name,
      amount,
      duration_months,
      start_date: new Date(start_date),
      end_date: new Date(new Date(start_date).setMonth(new Date(start_date).getMonth() + duration_months)),
      payment_status,
      payment_id
    });

    await subscription.save();

    // Generate PDF receipt
    try {
      await chromeService.ensureRunning();

      const htmlContent = generateSubscriptionPdfContent({
        subscription_id: subscription._id,
        plan_name,
        amount,
        duration_months,
        start_date: new Date(start_date).toLocaleDateString(),
        payment_id,
        payment_date: new Date().toLocaleDateString()
      });

      const pdf = await PDF.create(htmlContent, pdfOptions);
      const pdfBuffer = await pdf.toBuffer();

      const pdfKey = `subscriptions/receipts/${subscription._id}_${Date.now()}.pdf`;
      
      // Upload PDF to storage
      await new Promise((resolve, reject) => {
        uploadFile(
          {
            key: pdfKey,
            file: pdfBuffer,
            contentType: 'application/pdf'
          },
          (url) => {
            subscription.receipt_url = url;
            resolve();
          },
          (error) => reject(error)
        );
      });

      await subscription.save();

      logger.info('Subscription created with receipt', {
        subscriptionId: subscription._id,
        userId: user_id,
        planName: plan_name
      });

    } catch (pdfError) {
      logger.error('Error generating subscription receipt', {
        error: {
          message: pdfError.message,
          stack: pdfError.stack
        },
        subscriptionId: subscription._id
      });
      // Continue even if PDF generation fails
    }

    res.status(201).json({
      status: 'success',
      data: subscription
    });

  } catch (error) {
    logger.error('Error creating subscription', {
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('user_id', 'full_name email');

    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    logger.info('Subscription fetched', {
      subscriptionId: subscription._id,
      userId: subscription.user_id
    });

    res.status(200).json({
      status: 'success',
      data: subscription
    });
  } catch (error) {
    logger.error('Error fetching subscription', {
      error: {
        message: error.message,
        stack: error.stack
      },
      subscriptionId: req.params.id
    });
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

const getUserSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ user_id: req.params.userId })
      .sort('-createdAt')
      .populate('user_id', 'full_name email');

    logger.info('User subscriptions fetched', {
      userId: req.params.userId,
      count: subscriptions.length
    });

    res.status(200).json({
      status: 'success',
      data: subscriptions
    });
  } catch (error) {
    logger.error('Error fetching user subscriptions', {
      error: {
        message: error.message,
        stack: error.stack
      },
      userId: req.params.userId
    });
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const updateSubscriptionStatus = async (req, res) => {
  try {
    const { payment_status, payment_id } = req.body;

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    subscription.payment_status = payment_status;
    if (payment_id) subscription.payment_id = payment_id;

    await subscription.save();

    logger.info('Subscription status updated', {
      subscriptionId: subscription._id,
      status: payment_status,
      paymentId: payment_id
    });

    res.status(200).json({
      status: 'success',
      data: subscription
    });
  } catch (error) {
    logger.error('Error updating subscription status', {
      error: {
        message: error.message,
        stack: error.stack
      },
      subscriptionId: req.params.id
    });
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    subscription.status = 'cancelled';
    subscription.cancelled_at = new Date();
    await subscription.save();

    logger.info('Subscription cancelled', {
      subscriptionId: subscription._id,
      userId: subscription.user_id
    });

    res.status(200).json({
      status: 'success',
      data: subscription
    });
  } catch (error) {
    logger.error('Error cancelling subscription', {
      error: {
        message: error.message,
        stack: error.stack
      },
      subscriptionId: req.params.id
    });
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Retrieve all subscriptions
const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate("user_id", "full_name email")
      .populate(
        "plan_id",
        "plan_name plan_category plan_description plan_fee plan_image status plan_grade"
      );

    res.status(200).json({ success: true, data: subscriptions });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

const getEnrollmentStatus = async (req, res) => {
  try {
    const { studentId, courseId } = req.query;

    // Validate input
    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Course ID are required",
      });
    }

    // Check if a subscription exists with the given studentId and courseId
    const subscription = await Subscription.findOne({
      user_id: studentId,
      plan_id: courseId,
    })
      .populate("user_id", "full_name email")
      .populate(
        "plan_id",
        "plan_name plan_category plan_description plan_fee plan_image status plan_grade"
      );

    // If subscription exists, return true and the record
    if (subscription) {
      return res.status(200).json({
        success: true,
        enrolled: true,
        message: "Student is already enrolled in the course",
        data: subscription,
      });
    }

    // If subscription doesn't exist, return false
    return res.status(200).json({
      success: true,
      enrolled: false,
      message: "Student is not enrolled in the course",
    });
  } catch (err) {
    console.error("Error fetching enrollment status:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

const getCoorporateEnrollmentStatus = async (req, res) => {
  try {
    const { coorporateId, courseId } = req.query;

    // Validate input
    if (!coorporateId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Course ID are required",
      });
    }

    // Check if a subscription exists with the given studentId and courseId
    const subscription = await Subscription.findOne({
      user_id: coorporateId,
      plan_id: courseId,
    })
      .populate("user_id", "full_name email")
      .populate(
        "plan_id",
        "plan_name plan_category plan_description plan_fee plan_image status plan_grade"
      );

    // If subscription exists, return true and the record
    if (subscription) {
      return res.status(200).json({
        success: true,
        enrolled: true,
        message: "Coorporate is already enrolled in the course",
        data: subscription,
      });
    }

    // If subscription doesn't exist, return false
    return res.status(200).json({
      success: true,
      enrolled: false,
      message: "Student is not enrolled in the course",
    });
  } catch (err) {
    console.error("Error fetching enrollment status:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

const getCoorporateEmployeeEnrollmentStatus = async (req, res) => {
  try {
    const { coorporateId, courseId } = req.query;

    // Validate input
    if (!coorporateId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Coorporate ID and Course ID are required",
      });
    }

    // Check for an enrollment record in CoorporateEnrolledModule
    const enrollment = await CoorporateEnrolledModule.findOne({
      coorporate_id: coorporateId,
      course_id: courseId,
    })
      .populate(
        "coorporate_id",
        "company_name email contact_person role status"
      )
      .populate(
        "course_id",
        "plan_title plan_category plan_description plan_fee plan_image status plan_grade"
      )
      .populate("enrollment_id", "course_assigned_by status");

    // If the enrollment record exists, return details
    if (enrollment) {
      return res.status(200).json({
        success: true,
        enrolled: true,
        message: "Coorporate is already enrolled in the course",
        data: {
          coorporate: enrollment.coorporate_id,
          course: enrollment.course_id,
          enrollmentDetails: enrollment.enrollment_id,
          videoUrl: enrollment.video_url,
          isWatched: enrollment.is_watched,
        },
      });
    }

    // If no record is found, return false
    return res.status(200).json({
      success: true,
      enrolled: false,
      message: "Coorporate is not enrolled in the course",
    });
  } catch (err) {
    console.error("Error fetching enrollment status:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Update a subscription by ID
const updateSubscription = async (req, res) => {
  try {
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedSubscription)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });

    // Populate the updated subscription with student and course details
    const populatedUpdatedSubscription = await Subscription.findById(
      updatedSubscription._id
    )
      .populate("user_id", "full_name email")
      .populate(
        "plan_id",
        "plan_name plan_category plan_description plan_fee plan_image status plan_grade"
      );

    res.status(200).json({ success: true, data: populatedUpdatedSubscription });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Delete a subscription by ID
const deleteSubscription = async (req, res) => {
  try {
    const deletedSubscription = await Subscription.findByIdAndDelete(
      req.params.id
    );

    if (!deletedSubscription)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });

    res
      .status(200)
      .json({ success: true, message: "Subscription deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Retrieve all subscriptions by student ID
const getSubscriptionsByStudentId = async (req, res) => {
  try {
    const { student_id } = req.params;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    const subscriptions = await Subscription.find({ user_id: student_id })
      .populate("user_id", "full_name email")
      .populate(
        "plan_id",
        "plan_name plan_category plan_description plan_fee plan_image status plan_grade"
      )
      .sort({ createdAt: -1 });

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No subscriptions found for the given student ID",
      });
    }

    res.status(200).json({ success: true, data: subscriptions });
  } catch (err) {
    console.error("Error fetching subscriptions by student ID:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

module.exports = {
  createSubscription,
  getSubscriptionById,
  getUserSubscriptions,
  updateSubscriptionStatus,
  cancelSubscription,
  getAllSubscriptions,
  getEnrollmentStatus,
  getCoorporateEnrollmentStatus,
  updateSubscription,
  deleteSubscription,
  getSubscriptionsByStudentId,
  getCoorporateEmployeeEnrollmentStatus,
};
