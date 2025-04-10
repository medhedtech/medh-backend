import EnrolledCourse from "../models/enrolled-courses-model.js";
import Subscription from '../models/subscription-model.js';
import Course from "../models/course-model.js";
import User from "../models/user-modal.js";
import EnrolledModule from "../models/enrolled-modules.modal.js";
import logger from '../utils/logger.js';
import { AppError } from '../utils/errorHandler.js';
import PDF from 'html-pdf-chrome';
import { chromeService} from '../utils/chromeService.js';
import { uploadFile } from '../utils/uploadFile.js';
import { generatePdfContentForSubscription } from '../utils/htmlTemplate.js';
import nodemailer from "nodemailer";

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
      htmlContent = generatePdfContentForSubscription({
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
      htmlContent = generatePdfContentForSubscription({
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
export const processPaymentAndEnroll = async (req, res) => {
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

      result = newEnrolledCourse;
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

      result = subscription;
    } else {
      return res.status(400).json({ 
        message: "Invalid payment type. Must be 'course' or 'subscription'." 
      });
    }

    res.status(201).json({
      success: true,
      message: `${payment_type === 'course' ? 'Course enrollment' : 'Subscription'} created successfully`,
      data: result
    });
  } catch (error) {
    logger.error('Error processing payment and enrollment', {
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({
      success: false,
      message: 'Error processing payment and enrollment',
      error: error.message
    });
  }
};

// Get all payments for a student
export const getStudentPayments = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Convert string params to numbers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Query for both enrollments and subscriptions with pagination
    const [
      enrollments, 
      subscriptions, 
      totalEnrollments, 
      totalSubscriptions,
      // Get all enrollments and subscriptions for statistics (without pagination)
      allEnrollments,
      allSubscriptions
    ] = await Promise.all([
      // Enrollments with course info (paginated)
      EnrolledCourse.find({ student_id })
        .skip(skip)
        .limit(limitNum)
        .populate({
          path: 'course_id',
          select: 'course_title course_image'
        })
        .lean(),
      
      // Subscriptions (paginated)
      Subscription.find({ user_id: student_id })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      
      // Total counts for pagination
      EnrolledCourse.countDocuments({ student_id }),
      Subscription.countDocuments({ user_id: student_id }),
      
      // All enrollments for statistics (without pagination)
      EnrolledCourse.find({ student_id })
        .populate({
          path: 'course_id',
          select: 'course_title course_image'
        })
        .lean(),
      
      // All subscriptions for statistics (without pagination)
      Subscription.find({ user_id: student_id })
        .lean()
    ]);

    // Format enrollment data
    const formattedEnrollments = enrollments.map(enrollment => ({
      id: enrollment._id,
      orderId: enrollment.payment_details?.payment_order_id || 'N/A',
      type: 'Course Enrollment',
      paymentType: enrollment.enrollment_type,
      course_id: enrollment.course_id,
      course: enrollment.course_id?.course_title || 'Unknown Course',
      courseImage: enrollment.course_id?.course_image || '',
      price: {
        amount: enrollment.payment_details?.amount || 0,
        currency: enrollment.payment_details?.currency || 'INR'
      },
      status: enrollment.payment_status,
      enrollmentStatus: enrollment.status,
      enrollmentDate: enrollment.enrollment_date,
      expiryDate: enrollment.expiry_date,
      progress: enrollment.progress,
      isCertified: enrollment.is_certified
    }));

    // Format subscription data
    const formattedSubscriptions = subscriptions.map(subscription => ({
      id: subscription._id,
      orderId: subscription.payment_details?.payment_order_id || 'N/A',
      type: 'Subscription',
      paymentType: 'Membership',
      course: subscription.plan_name,
      courseImage: '',
      price: {
        amount: subscription.amount || 0,
        currency: subscription.payment_details?.currency || 'INR'
      },
      status: subscription.payment_status,
      enrollmentStatus: subscription.status,
      enrollmentDate: subscription.start_date,
      expiryDate: subscription.end_date,
      isActive: subscription.status === 'active',
      remainingDays: Math.max(0, Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)))
    }));

    // Combine and sort by date (most recent first)
    const allPayments = [...formattedEnrollments, ...formattedSubscriptions]
      .sort((a, b) => new Date(b.enrollmentDate) - new Date(a.enrollmentDate));
    
    // Calculate pagination info
    const totalItems = totalEnrollments + totalSubscriptions;
    const totalPages = Math.ceil(totalItems / limitNum);

    // Calculate statistics in real-time from all data
    // Format all enrollments and subscriptions for statistics
    const allFormattedEnrollments = allEnrollments.map(enrollment => {
      // Extract payment amount from payment_details
      const paymentAmount = enrollment.payment_details?.amount || 0;
      
      return {
        id: enrollment._id,
        orderId: enrollment.payment_details?.payment_order_id || 'N/A',
        type: 'Course Enrollment',
        price: {
          amount: paymentAmount,
          currency: enrollment.payment_details?.currency || 'INR'
        },
        status: enrollment.payment_status,
        enrollmentDate: enrollment.enrollment_date
      };
    });

    const allFormattedSubscriptions = allSubscriptions.map(subscription => {
      // Extract payment amount from subscription
      const paymentAmount = subscription.amount || 0;
      
      return {
        id: subscription._id,
        orderId: subscription.payment_details?.payment_order_id || 'N/A',
        type: 'Subscription',
        price: {
          amount: paymentAmount,
          currency: subscription.payment_details?.currency || 'INR'
        },
        status: subscription.payment_status,
        enrollmentDate: subscription.start_date,
        isActive: subscription.status === 'active',
        endDate: subscription.end_date
      };
    });

    // Combine all payments for statistics
    const allPaymentsForStats = [...allFormattedEnrollments, ...allFormattedSubscriptions]
      .sort((a, b) => new Date(b.enrollmentDate) - new Date(a.enrollmentDate));

    // Calculate total spent (lifetime spending) - IMPROVED CALCULATION
    let totalSpent = 0;
    
    // Calculate from enrollments
    allEnrollments.forEach(enrollment => {
      if (enrollment.payment_details && enrollment.payment_details.amount) {
        totalSpent += parseFloat(enrollment.payment_details.amount);
      }
    });
    
    // Calculate from subscriptions
    allSubscriptions.forEach(subscription => {
      if (subscription.amount) {
        totalSpent += parseFloat(subscription.amount);
      }
    });
    
    // Round to 2 decimal places to avoid floating point issues
    totalSpent = Math.round(totalSpent * 100) / 100;

    // Calculate total payments (successful transactions)
    const totalPayments = allPaymentsForStats.length;

    // Get the most recent payment
    const lastPayment = allPaymentsForStats[0] || null;
    
    // Count active subscriptions
    const activeSubscriptions = allFormattedSubscriptions.filter(sub => 
      sub.isActive && new Date(sub.endDate) > new Date()
    ).length;

    // Log the raw payment data for debugging
    logger.info('Raw payment data for debugging:', {
      enrollmentCount: allEnrollments.length,
      subscriptionCount: allSubscriptions.length,
      sampleEnrollment: allEnrollments[0]?.payment_details,
      sampleSubscription: allSubscriptions[0]?.amount,
      calculatedTotalSpent: totalSpent
    });

    res.status(200).json({
      success: true,
      data: allPayments,
      pagination: {
        total: totalItems,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      statistics: {
        totalSpent: {
          amount: totalSpent,
          currency: 'INR',
          label: 'Lifetime spending'
        },
        totalPayments: {
          count: totalPayments,
          label: 'Successful transactions'
        },
        lastPayment: {
          date: lastPayment ? new Date(lastPayment.enrollmentDate) : new Date(),
          formattedDate: lastPayment ? new Date(lastPayment.enrollmentDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }) : 'N/A',
          label: 'Most recent transaction'
        },
        activeSubscriptions: {
          count: activeSubscriptions,
          label: 'Current subscriptions'
        },
        lastOrderId: {
          id: lastPayment?.orderId || 'N/A',
          label: 'Order ID'
        },
        lastPrice: {
          amount: lastPayment?.price?.amount || 0,
          currency: lastPayment?.price?.currency || 'INR',
          label: 'Price'
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching student payments', {
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching student payments',
      error: error.message
    });
  }
};

// Get a specific payment by ID and type
export const getPaymentById = async (req, res) => {
  try {
    const { payment_type, payment_id } = req.params;
    
    let payment;
    if (payment_type === 'course') {
      payment = await EnrolledCourse.findById(payment_id);
    } else if (payment_type === 'subscription') {
      payment = await Subscription.findById(payment_id);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment type'
      });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    logger.error('Error fetching payment by ID', {
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching payment by ID',
      error: error.message
    });
  }
};

// Get payment statistics (admin only)
export const getPaymentStats = async (req, res) => {
  try {
    const [
      totalEnrollments,
      totalSubscriptions,
      totalRevenue,
      recentPayments,
      studentSpending
    ] = await Promise.all([
      EnrolledCourse.countDocuments(),
      Subscription.countDocuments(),
      Promise.all([
        EnrolledCourse.aggregate([
          { $group: { _id: null, total: { $sum: "$payment_details.amount" } } }
        ]),
        Subscription.aggregate([
          { $group: { _id: null, total: { $sum: "$payment_details.amount" } } }
        ])
      ]),
      Promise.all([
        EnrolledCourse.find().sort({ enrollment_date: -1 }).limit(5),
        Subscription.find().sort({ start_date: -1 }).limit(5)
      ]),
      // Calculate total spent per student
      Promise.all([
        EnrolledCourse.aggregate([
          {
            $group: {
              _id: "$student_id",
              totalSpent: { $sum: "$payment_details.amount" },
              enrollments: { $sum: 1 }
            }
          },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "student"
            }
          },
          { $unwind: "$student" },
          {
            $project: {
              studentName: "$student.name",
              studentEmail: "$student.email",
              totalSpent: 1,
              enrollments: 1
            }
          }
        ]),
        Subscription.aggregate([
          {
            $group: {
              _id: "$user_id",
              totalSpent: { $sum: "$payment_details.amount" },
              subscriptions: { $sum: 1 }
            }
          },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "student"
            }
          },
          { $unwind: "$student" },
          {
            $project: {
              studentName: "$student.name",
              studentEmail: "$student.email",
              totalSpent: 1,
              subscriptions: 1
            }
          }
        ])
      ])
    ]);

    const totalRevenueAmount = (totalRevenue[0][0]?.total || 0) + (totalRevenue[1][0]?.total || 0);
    const recentPaymentsList = [...recentPayments[0], ...recentPayments[1]]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Combine and aggregate student spending
    const studentSpendingMap = new Map();
    
    // Process enrollments
    studentSpending[0].forEach(student => {
      studentSpendingMap.set(student._id.toString(), {
        studentName: student.studentName,
        studentEmail: student.studentEmail,
        totalSpent: student.totalSpent,
        enrollments: student.enrollments,
        subscriptions: 0
      });
    });

    // Process subscriptions and combine with enrollments
    studentSpending[1].forEach(student => {
      const existing = studentSpendingMap.get(student._id.toString());
      if (existing) {
        existing.totalSpent += student.totalSpent;
        existing.subscriptions = student.subscriptions;
      } else {
        studentSpendingMap.set(student._id.toString(), {
          studentName: student.studentName,
          studentEmail: student.studentEmail,
          totalSpent: student.totalSpent,
          enrollments: 0,
          subscriptions: student.subscriptions
        });
      }
    });

    // Convert map to array and sort by total spent
    const studentSpendingList = Array.from(studentSpendingMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent);

    res.status(200).json({
      success: true,
      data: {
        totalEnrollments,
        totalSubscriptions,
        totalRevenue: totalRevenueAmount,
        recentPayments: recentPaymentsList,
        studentSpending: studentSpendingList
      }
    });
  } catch (error) {
    logger.error('Error fetching payment statistics', {
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching payment statistics',
      error: error.message
    });
  }
};

// Generate receipt for existing payment
export const generateReceiptForExistingPayment = async (req, res) => {
  try {
    const { payment_type, payment_id } = req.params;
    
    let payment;
    if (payment_type === 'course') {
      payment = await EnrolledCourse.findById(payment_id);
    } else if (payment_type === 'subscription') {
      payment = await Subscription.findById(payment_id);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment type'
      });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const receiptUrl = await generateAndUploadReceipt(payment, payment_type);
    if (receiptUrl) {
      payment.receipt_url = receiptUrl;
      await payment.save();
      
      // Send email with receipt
      const email = payment_type === 'course' ? payment.student_email : payment.user_email;
      if (email) {
        await sendReceiptEmail(
          email,
          receiptUrl,
          payment_type === 'course' 
            ? { course_name: payment.course_name, payment_details: payment.payment_details }
            : { plan_name: payment.plan_name, payment_details: payment.payment_details },
          payment_type
        );
      }
    }

    res.status(200).json({
      success: true,
      message: 'Receipt generated successfully',
      data: { receipt_url: receiptUrl }
    });
  } catch (error) {
    logger.error('Error generating receipt for existing payment', {
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({
      success: false,
      message: 'Error generating receipt',
      error: error.message
    });
  }
};

// Resend receipt email
export const resendReceiptEmail = async (req, res) => {
  try {
    const { payment_type, payment_id } = req.params;
    
    let payment;
    if (payment_type === 'course') {
      payment = await EnrolledCourse.findById(payment_id);
    } else if (payment_type === 'subscription') {
      payment = await Subscription.findById(payment_id);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment type'
      });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (!payment.receipt_url) {
      return res.status(400).json({
        success: false,
        message: 'No receipt URL found for this payment'
      });
    }

    const email = payment_type === 'course' ? payment.student_email : payment.user_email;
    if (email) {
      const sent = await sendReceiptEmail(
        email,
        payment.receipt_url,
        payment_type === 'course'
          ? { course_name: payment.course_name, payment_details: payment.payment_details }
          : { plan_name: payment.plan_name, payment_details: payment.payment_details },
        payment_type
      );

      if (sent) {
        res.status(200).json({
          success: true,
          message: 'Receipt email sent successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to send receipt email'
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'No email address found for this payment'
      });
    }
  } catch (error) {
    logger.error('Error resending receipt email', {
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({
      success: false,
      message: 'Error resending receipt email',
      error: error.message
    });
  }
};

// Get all receipts for a student
export const getStudentReceipts = async (req, res) => {
  try {
    const { student_id } = req.params;
    
    // Get both enrollments and subscriptions with receipt URLs
    const [enrollments, subscriptions] = await Promise.all([
      EnrolledCourse.find({ student_id, receipt_url: { $exists: true } }),
      Subscription.find({ user_id: student_id, receipt_url: { $exists: true } })
    ]);

    const receipts = [
      ...enrollments.map(e => ({
        type: 'course',
        id: e._id,
        receipt_url: e.receipt_url,
        payment_date: e.payment_details?.payment_date,
        amount: e.payment_details?.amount,
        course_name: e.course_name
      })),
      ...subscriptions.map(s => ({
        type: 'subscription',
        id: s._id,
        receipt_url: s.receipt_url,
        payment_date: s.payment_details?.payment_date,
        amount: s.payment_details?.amount,
        plan_name: s.plan_name
      }))
    ].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

    res.status(200).json({
      success: true,
      data: receipts
    });
  } catch (error) {
    logger.error('Error fetching student receipts', {
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching student receipts',
      error: error.message
    });
  }
}; 