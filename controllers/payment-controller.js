const EnrolledCourse = require("../models/enrolled-courses-model");
const Subscription = require('../models/subscription-model');
const Course = require("../models/course-model");
const User = require("../models/user-controller");
const EnrolledModule = require("../models/enrolled-modules.modal");
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');
const PDF = require('html-pdf-chrome');
const chromeService = require('../utils/chromeService');
const { uploadFile } = require('../utils/uploadFile');
const { generateSubscriptionPdfContent } = require('../utils/htmlTemplate');
const nodemailer = require("nodemailer");

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

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Create a reusable function for generating and uploading PDF receipts
const generateAndUploadReceipt = async (data, type) => {
  try {
    await chromeService.ensureRunning();
    
    // Generate appropriate HTML content based on receipt type
    let htmlContent;
    if (type === 'subscription') {
      htmlContent = generateSubscriptionPdfContent({
        subscription_id: data._id,
        plan_name: data.plan_name,
        amount: data.amount,
        duration_months: data.duration_months,
        start_date: data.start_date.toLocaleDateString(),
        payment_id: data.payment_id || data.payment_details?.payment_id,
        payment_date: new Date().toLocaleDateString(),
        customer_name: data.user_name || '',
        customer_email: data.user_email || ''
      });
    } else if (type === 'course') {
      htmlContent = generateSubscriptionPdfContent({
        subscription_id: data._id,
        plan_name: data.course_name || 'Course Enrollment',
        amount: data.payment_details?.amount || 0,
        start_date: data.enrollment_date?.toLocaleDateString() || new Date().toLocaleDateString(),
        payment_id: data.payment_details?.payment_id || data.payment_details?.payment_order_id,
        payment_date: data.payment_details?.payment_date?.toLocaleDateString() || new Date().toLocaleDateString(),
        customer_name: data.student_name || '',
        customer_email: data.student_email || ''
      });
    }

    const pdf = await PDF.create(htmlContent, pdfOptions);
    const pdfBuffer = await pdf.toBuffer();

    const folderPath = type === 'subscription' ? 'subscriptions' : 'enrollments';
    const pdfKey = `${folderPath}/receipts/${data._id}_${Date.now()}.pdf`;
    
    // Upload PDF to storage
    return new Promise((resolve, reject) => {
      uploadFile(
        {
          key: pdfKey,
          file: pdfBuffer,
          contentType: 'application/pdf'
        },
        (url) => {
          resolve(url);
        },
        (error) => reject(error)
      );
    });
  } catch (error) {
    logger.error(`Error generating ${type} receipt`, {
      error: {
        message: error.message,
        stack: error.stack
      },
      id: data._id
    });
    throw error;
  }
};

// Function to send receipt via email
const sendReceiptEmail = async (email, receiptUrl, paymentDetails, type) => {
  try {
    const subject = type === 'subscription' 
      ? `Your Subscription Receipt - ${paymentDetails.plan_name}` 
      : `Your Course Enrollment Receipt - ${paymentDetails.course_name || 'Course'}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank you for your ${type === 'subscription' ? 'subscription' : 'course enrollment'}</h2>
        <p>Your payment has been successfully processed.</p>
        <p><strong>Payment ID:</strong> ${paymentDetails.payment_id || paymentDetails.payment_details?.payment_id || 'N/A'}</p>
        <p><strong>Amount:</strong> ${paymentDetails.amount || paymentDetails.payment_details?.amount || 0}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p>Please find your receipt attached or <a href="${receiptUrl}" target="_blank">download it here</a>.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p>Thank you for choosing our platform!</p>
      </div>
    `;
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html,
      attachments: receiptUrl ? [{
        filename: `${type}_receipt.pdf`,
        path: receiptUrl
      }] : []
    });
    
    logger.info(`Receipt email sent to ${email}`);
    return true;
  } catch (error) {
    logger.error(`Error sending receipt email to ${email}`, {
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    return false;
  }
};

// Combined function to process payment and create either enrollment or subscription
exports.processPaymentAndEnroll = async (req, res) => {
  try {
    const { 
      student_id, 
      course_id, 
      enrollment_type,
      paymentResponse,
      currencyCode,
      activePricing,
      getFinalPrice,
      plan_id,
      plan_name,
      duration_months,
      payment_type, // "course" or "subscription"
      is_self_paced = false,
      expiry_date = null,
      student_email = null,
      student_name = null
    } = req.body;

    // Check if the student exists
    const student = await User.findById(student_id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    let result;

    // Process payment differently based on type
    if (payment_type === "course") {
      // Check if the course exists
      const course = await Course.findById(course_id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Create a new enrollment record
      const newEnrolledCourse = new EnrolledCourse({
        student_id,
        course_id,
        is_self_paced,
        enrollment_type,
        batch_size: enrollment_type === 'batch' && activePricing ? activePricing.min_batch_size : 1,
        payment_status: 'completed',
        enrollment_date: new Date(),
        course_progress: 0,
        status: 'active',
        course_name: course.course_title || 'Course',
        student_name: student_name || student.full_name,
        student_email: student_email || student.email,
        ...(expiry_date && { expiry_date }),
        ...(paymentResponse && {
          payment_details: {
            payment_id: paymentResponse.razorpay_payment_id || '',
            payment_signature: paymentResponse.razorpay_signature || '',
            payment_order_id: paymentResponse.razorpay_order_id || '',
            payment_method: 'razorpay',
            amount: typeof getFinalPrice === 'function' ? getFinalPrice() : paymentResponse.amount || 0,
            currency: currencyCode || 'INR',
            payment_date: new Date()
          }
        })
      });

      // Save the enrollment record
      await newEnrolledCourse.save();

      // Create enrolled modules if course has videos
      if (course.course_videos && course.course_videos.length > 0) {
        const enrolledModules = course.course_videos.map((video_url) => ({
          student_id,
          course_id,
          enrollment_id: newEnrolledCourse._id,
          video_url,
        }));
        await EnrolledModule.insertMany(enrolledModules);
      }

      // Generate PDF receipt for course enrollment
      try {
        const receiptUrl = await generateAndUploadReceipt(newEnrolledCourse, 'course');
        if (receiptUrl) {
          newEnrolledCourse.receipt_url = receiptUrl;
          await newEnrolledCourse.save();
          
          // Send email with receipt
          if (student.email || student_email) {
            await sendReceiptEmail(
              student.email || student_email, 
              receiptUrl, 
              {
                course_name: course.course_title,
                payment_details: newEnrolledCourse.payment_details
              }, 
              'course'
            );
          }
        }
      } catch (pdfError) {
        logger.error('Error with course enrollment receipt', {
          error: pdfError.message,
          enrollmentId: newEnrolledCourse._id
        });
        // Continue even if PDF generation fails
      }

      result = {
        message: "Student enrolled successfully",
        data: newEnrolledCourse
      };
    } else if (payment_type === "subscription") {
      // Create a new subscription
      const start_date = new Date();
      
      const subscription = new Subscription({
        user_id: student_id,
        plan_id,
        plan_name,
        user_name: student_name || student.full_name,
        user_email: student_email || student.email,
        amount: typeof getFinalPrice === 'function' ? getFinalPrice() : paymentResponse?.amount || 0,
        duration_months,
        start_date,
        end_date: new Date(start_date.setMonth(start_date.getMonth() + duration_months)),
        payment_status: 'completed',
        payment_id: paymentResponse?.razorpay_payment_id || '',
        payment_details: paymentResponse && {
          payment_id: paymentResponse.razorpay_payment_id || '',
          payment_signature: paymentResponse.razorpay_signature || '',
          payment_order_id: paymentResponse.razorpay_order_id || '',
          payment_method: 'razorpay',
          amount: typeof getFinalPrice === 'function' ? getFinalPrice() : paymentResponse.amount || 0,
          currency: currencyCode || 'INR',
          payment_date: new Date()
        }
      });

      await subscription.save();

      // Generate PDF receipt
      try {
        const receiptUrl = await generateAndUploadReceipt(subscription, 'subscription');
        if (receiptUrl) {
          subscription.receipt_url = receiptUrl;
          await subscription.save();
          
          // Send email with receipt
          if (student.email || student_email) {
            await sendReceiptEmail(
              student.email || student_email, 
              receiptUrl, 
              subscription, 
              'subscription'
            );
          }
        }
      } catch (pdfError) {
        logger.error('Error with subscription receipt', {
          error: pdfError.message,
          subscriptionId: subscription._id
        });
        // Continue even if PDF generation fails
      }

      result = {
        message: "Subscription created successfully",
        data: subscription
      };
    } else {
      return res.status(400).json({ 
        message: "Invalid payment type. Must be 'course' or 'subscription'." 
      });
    }

    res.status(201).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ 
      success: false,
      message: "Error processing payment and enrollment",
      error: error.message 
    });
  }
};

// Get all enrollments and subscriptions for a student
exports.getStudentPayments = async (req, res) => {
  try {
    const { student_id } = req.params;

    // Fetch both enrollments and subscriptions
    const [enrollments, subscriptions] = await Promise.all([
      EnrolledCourse.find({ student_id })
        .populate("student_id")
        .populate({
          path: "course_id",
          populate: {
            path: "assigned_instructor",
            model: "AssignedInstructor",
          },
        }),
      Subscription.find({ user_id: student_id })
        .populate("user_id", "full_name email")
        .populate(
          "plan_id",
          "plan_name plan_category plan_description plan_fee plan_image status plan_grade"
        )
    ]);

    // If both are empty, return 404
    if (!enrollments.length && !subscriptions.length) {
      return res
        .status(404)
        .json({ message: "No payments found for this student" });
    }

    // Combine the results
    const payments = {
      enrollments,
      subscriptions,
      total: enrollments.length + subscriptions.length
    };

    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error("Error fetching student payments:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching student payments",
      error: error.message 
    });
  }
};

// Get payment details (either enrollment or subscription)
exports.getPaymentById = async (req, res) => {
  try {
    const { payment_id, payment_type } = req.params;

    let paymentDetails;

    if (payment_type === 'course') {
      paymentDetails = await EnrolledCourse.findById(payment_id)
        .populate("student_id")
        .populate("course_id");
    } else if (payment_type === 'subscription') {
      paymentDetails = await Subscription.findById(payment_id)
        .populate("user_id", "full_name email")
        .populate(
          "plan_id",
          "plan_name plan_category plan_description plan_fee plan_image status plan_grade"
        );
    } else {
      return res.status(400).json({ 
        success: false,
        message: "Invalid payment type. Must be 'course' or 'subscription'." 
      });
    }

    if (!paymentDetails) {
      return res.status(404).json({ 
        success: false,
        message: "Payment not found" 
      });
    }

    res.status(200).json({
      success: true,
      data: paymentDetails
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching payment details",
      error: error.message 
    });
  }
};

// Get payment statistics for admin dashboard
exports.getPaymentStats = async (req, res) => {
  try {
    // Get counts and totals
    const [
      enrollmentCount,
      subscriptionCount,
      enrollmentTotal,
      subscriptionTotal
    ] = await Promise.all([
      EnrolledCourse.countDocuments(),
      Subscription.countDocuments(),
      EnrolledCourse.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $toDouble: "$payment_details.amount" } }
          }
        }
      ]),
      Subscription.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $toDouble: "$amount" } }
          }
        }
      ])
    ]);

    // Get recent payments (both enrollments and subscriptions)
    const [recentEnrollments, recentSubscriptions] = await Promise.all([
      EnrolledCourse.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("student_id", "full_name email")
        .populate("course_id", "course_title"),
      Subscription.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user_id", "full_name email")
        .populate("plan_id", "plan_name")
    ]);

    const stats = {
      total_payments: enrollmentCount + subscriptionCount,
      total_amount: (enrollmentTotal[0]?.total || 0) + (subscriptionTotal[0]?.total || 0),
      enrollment_count: enrollmentCount,
      subscription_count: subscriptionCount,
      enrollment_amount: enrollmentTotal[0]?.total || 0,
      subscription_amount: subscriptionTotal[0]?.total || 0,
      recent_payments: [
        ...recentEnrollments.map(e => ({
          type: 'enrollment',
          id: e._id,
          student: e.student_id,
          item: e.course_id.course_title,
          amount: e.payment_details?.amount || 0,
          date: e.createdAt
        })),
        ...recentSubscriptions.map(s => ({
          type: 'subscription',
          id: s._id,
          student: s.user_id,
          item: s.plan_name,
          amount: s.amount,
          date: s.createdAt
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error fetching payment statistics:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching payment statistics",
      error: error.message 
    });
  }
};

// Generate receipt for existing payment
exports.generateReceiptForExistingPayment = async (req, res) => {
  try {
    const { payment_id, payment_type } = req.params;
    
    let paymentRecord;
    
    if (payment_type === 'course') {
      paymentRecord = await EnrolledCourse.findById(payment_id)
        .populate("student_id", "full_name email")
        .populate("course_id", "course_title");
        
      if (!paymentRecord) {
        return res.status(404).json({ 
          success: false, 
          message: "Enrollment record not found" 
        });
      }
      
      // Add additional fields for receipt generation
      paymentRecord.course_name = paymentRecord.course_id.course_title;
      paymentRecord.student_name = paymentRecord.student_id.full_name;
      paymentRecord.student_email = paymentRecord.student_id.email;
      
    } else if (payment_type === 'subscription') {
      paymentRecord = await Subscription.findById(payment_id)
        .populate("user_id", "full_name email")
        .populate("plan_id", "plan_name");
        
      if (!paymentRecord) {
        return res.status(404).json({ 
          success: false, 
          message: "Subscription record not found" 
        });
      }
      
      // Add additional fields for receipt generation
      paymentRecord.user_name = paymentRecord.user_id.full_name;
      paymentRecord.user_email = paymentRecord.user_id.email;
      
    } else {
      return res.status(400).json({ 
        success: false,
        message: "Invalid payment type. Must be 'course' or 'subscription'." 
      });
    }
    
    // Check if receipt already exists
    if (paymentRecord.receipt_url) {
      return res.status(200).json({
        success: true,
        message: "Receipt already exists",
        receipt_url: paymentRecord.receipt_url
      });
    }
    
    // Generate new receipt
    const receiptUrl = await generateAndUploadReceipt(paymentRecord, payment_type);
    
    if (receiptUrl) {
      // Update the record with receipt URL
      paymentRecord.receipt_url = receiptUrl;
      await paymentRecord.save();
      
      // Send email with receipt if requested
      if (req.query.send_email === 'true') {
        const email = payment_type === 'course' 
          ? paymentRecord.student_id.email 
          : paymentRecord.user_id.email;
          
        await sendReceiptEmail(
          email,
          receiptUrl,
          paymentRecord,
          payment_type
        );
      }
      
      res.status(200).json({
        success: true,
        message: "Receipt generated successfully",
        receipt_url: receiptUrl
      });
    } else {
      throw new Error("Failed to generate receipt");
    }
    
  } catch (error) {
    console.error("Error generating receipt:", error);
    res.status(500).json({ 
      success: false,
      message: "Error generating receipt",
      error: error.message 
    });
  }
};

// Resend receipt email
exports.resendReceiptEmail = async (req, res) => {
  try {
    const { payment_id, payment_type } = req.params;
    const { email } = req.body;
    
    let paymentRecord;
    
    if (payment_type === 'course') {
      paymentRecord = await EnrolledCourse.findById(payment_id)
        .populate("student_id", "full_name email")
        .populate("course_id", "course_title");
    } else if (payment_type === 'subscription') {
      paymentRecord = await Subscription.findById(payment_id)
        .populate("user_id", "full_name email")
        .populate("plan_id", "plan_name");
    } else {
      return res.status(400).json({ 
        success: false,
        message: "Invalid payment type. Must be 'course' or 'subscription'."
      });
    }
    
    if (!paymentRecord) {
      return res.status(404).json({ 
        success: false, 
        message: "Payment record not found" 
      });
    }
    
    // Check if receipt exists
    if (!paymentRecord.receipt_url) {
      // Generate receipt if it doesn't exist
      try {
        const receiptUrl = await generateAndUploadReceipt(paymentRecord, payment_type);
        if (receiptUrl) {
          paymentRecord.receipt_url = receiptUrl;
          await paymentRecord.save();
        } else {
          throw new Error("Failed to generate receipt");
        }
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to generate receipt",
          error: error.message
        });
      }
    }
    
    // Send email
    const recipientEmail = email || 
      (payment_type === 'course' ? paymentRecord.student_id.email : paymentRecord.user_id.email);
      
    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: "No email address provided or found in record"
      });
    }
    
    const emailSent = await sendReceiptEmail(
      recipientEmail,
      paymentRecord.receipt_url,
      paymentRecord,
      payment_type
    );
    
    if (emailSent) {
      res.status(200).json({
        success: true,
        message: `Receipt email sent to ${recipientEmail}`
      });
    } else {
      throw new Error("Failed to send receipt email");
    }
    
  } catch (error) {
    console.error("Error sending receipt email:", error);
    res.status(500).json({ 
      success: false,
      message: "Error sending receipt email",
      error: error.message 
    });
  }
};

// Get all payment receipts for a student
exports.getStudentReceipts = async (req, res) => {
  try {
    const { student_id } = req.params;
    
    // Fetch all enrollments and subscriptions with receipt URLs
    const [enrollments, subscriptions] = await Promise.all([
      EnrolledCourse.find({ 
        student_id, 
        receipt_url: { $exists: true, $ne: null } 
      })
        .select('_id receipt_url payment_details.amount payment_details.payment_date course_id enrollment_date')
        .populate("course_id", "course_title"),
      Subscription.find({ 
        user_id: student_id, 
        receipt_url: { $exists: true, $ne: null } 
      })
        .select('_id receipt_url amount start_date plan_name')
    ]);
    
    // Format the response
    const receipts = [
      ...enrollments.map(e => ({
        id: e._id,
        type: 'course',
        name: e.course_id?.course_title || 'Course Enrollment',
        amount: e.payment_details?.amount || 0,
        date: e.payment_details?.payment_date || e.enrollment_date,
        receipt_url: e.receipt_url
      })),
      ...subscriptions.map(s => ({
        id: s._id,
        type: 'subscription',
        name: s.plan_name || 'Subscription',
        amount: s.amount || 0,
        date: s.start_date,
        receipt_url: s.receipt_url
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.status(200).json({
      success: true,
      data: receipts
    });
    
  } catch (error) {
    console.error("Error fetching student receipts:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching student receipts",
      error: error.message 
    });
  }
}; 