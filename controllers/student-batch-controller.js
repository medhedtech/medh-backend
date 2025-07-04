import { validationResult } from "express-validator";
import mongoose from "mongoose";
import Enrollment from "../models/enrollment-model.js";
import { Course, Batch } from "../models/course-model.js";
import User from "../models/user-modal.js"; // Use User model instead of Student

/**
 * Enroll a student in a course batch
 * @route POST /api/students/:studentId/enroll
 * @access Admin and self
 */
export const enrollStudentInBatch = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId } = req.params;
    const { courseId, batchId, paymentDetails } = req.body;

    // Verify student exists using User model
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Additional check: ensure the user has student role
    if (!student.role || !student.role.includes('student')) {
      return res.status(400).json({
        success: false,
        message: "User is not a student",
      });
    }

    // Check if student is active
    if (student.status === "Inactive") {
      return res.status(400).json({
        success: false,
        message: "Student account is inactive. Please contact administrator.",
      });
    }

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Verify batch exists and has capacity
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Check if batch has reached capacity
    if (batch.enrolled_students >= batch.capacity) {
      return res.status(400).json({
        success: false,
        message: "Batch has reached maximum capacity",
      });
    }

    // Check if student is already enrolled in this course/batch
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      batch: batchId,
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: "Student is already enrolled in this batch",
      });
    }

    // Calculate access expiry date based on batch end date
    const accessExpiryDate = new Date(batch.end_date);
    accessExpiryDate.setDate(accessExpiryDate.getDate() + 30); // Add 30 days grace period after batch ends

    // Get course pricing for the enrollment
    const coursePricing = course.prices?.[0] || { batch: 0, individual: 0, currency: 'INR' };
    const enrollmentType = req.body.enrollment_type || "batch";
    
    // Calculate pricing based on enrollment type
    let originalPrice, finalPrice, pricingType;
    if (enrollmentType === "individual") {
      originalPrice = coursePricing.individual || 0;
      finalPrice = originalPrice;
      pricingType = "individual";
    } else {
      originalPrice = coursePricing.batch || 0;
      finalPrice = originalPrice;
      pricingType = "batch";
    }

    // Apply discount if provided
    let discountApplied = 0;
    if (req.body.discount_applied && req.body.discount_applied > 0) {
      discountApplied = req.body.discount_applied;
      finalPrice = Math.max(0, finalPrice - discountApplied);
    }

    // Create new enrollment
    const enrollment = new Enrollment({
      student: studentId,
      course: courseId,
      batch: batchId,
      enrollment_date: new Date(),
      status: "active",
      access_expiry_date: accessExpiryDate,
      enrollment_type: enrollmentType,
      enrollment_source: req.body.enrollment_source || "website",
      created_by: req.user.id,
      // Required pricing_snapshot fields
      pricing_snapshot: {
        original_price: originalPrice,
        final_price: finalPrice,
        currency: coursePricing.currency || "INR",
        pricing_type: pricingType,
        discount_applied: discountApplied,
        discount_code: req.body.discount_code || null
      },
      // Progress tracking initialization
      progress: {
        overall_percentage: 0,
        lessons_completed: 0,
        last_activity_date: new Date()
      },
      // Batch-specific information (required for batch enrollments)
      batch_info: {
        batch_size: enrollmentType === "batch" ? (req.body.batch_size || 2) : 1,
        is_batch_leader: enrollmentType === "batch",
        batch_members: enrollmentType === "batch" ? (req.body.batch_members || []) : []
      }
    });

    // If payment details are provided, add them
    if (paymentDetails) {
      enrollment.payments.push({
        amount: paymentDetails.amount,
        currency: paymentDetails.currency || "INR",
        payment_method: paymentDetails.payment_method,
        transaction_id: paymentDetails.transaction_id,
        payment_status: paymentDetails.payment_status || "pending",
        payment_date: new Date(),
        receipt_url: paymentDetails.receipt_url,
        metadata: paymentDetails.metadata
      });

      // Update total amount paid if payment is completed
      if (paymentDetails.payment_status === "completed") {
        enrollment.total_amount_paid = paymentDetails.amount;
      }
    }

    // If payment plan details are provided
    if (req.body.payment_plan) {
      enrollment.payment_plan = req.body.payment_plan;
      enrollment.installments_count = req.body.installments_count || 1;
      
      if (req.body.payment_plan === "installment" && req.body.next_payment_date) {
        enrollment.next_payment_date = new Date(req.body.next_payment_date);
      }
    }

    // If discount is applied
    if (req.body.discount_applied) {
      enrollment.discount_applied = req.body.discount_applied;
      enrollment.discount_code = req.body.discount_code;
    }

    // Save the enrollment
    await enrollment.save();

    // Update batch enrolled student count
    batch.enrolled_students += 1;
    await batch.save();

    // Return success response with enrollment details
    res.status(201).json({
      success: true,
      message: "Student successfully enrolled in batch",
      data: enrollment,
    });
  } catch (error) {
    console.error("Error enrolling student:", error);
    res.status(500).json({
      success: false,
      message: "Server error while enrolling student",
      error: error.message,
    });
  }
};

/**
 * Record a payment for an enrollment
 * @route POST /api/enrollments/:enrollmentId/payments
 * @access Admin only
 */
export const recordPayment = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const paymentData = req.body;

    // Validate paymentData
    if (!paymentData.amount || !paymentData.payment_method) {
      return res.status(400).json({
        success: false,
        message: "Payment amount and method are required",
      });
    }

    // Find enrollment
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    // Record payment using model method
    await enrollment.recordPayment({
      amount: paymentData.amount,
      currency: paymentData.currency || "INR",
      payment_method: paymentData.payment_method,
      transaction_id: paymentData.transaction_id,
      payment_status: paymentData.payment_status || "completed",
      payment_date: new Date(),
      receipt_url: paymentData.receipt_url,
      metadata: paymentData.metadata,
    });

    // Update next payment date if payment plan is installment
    if (enrollment.payment_plan === "installment" && 
        enrollment.installments_count > enrollment.payments.length &&
        paymentData.payment_status === "completed") {
      
      // Calculate next payment date (usually monthly)
      const nextPaymentDate = new Date();
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      enrollment.next_payment_date = nextPaymentDate;
      await enrollment.save();
    }

    res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      data: enrollment,
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(500).json({
      success: false,
      message: "Server error while recording payment",
      error: error.message,
    });
  }
};

/**
 * Update student progress in a course
 * @route PUT /api/enrollments/:enrollmentId/progress/:lessonId
 * @access Student, Admin, Instructor
 */
export const updateProgress = async (req, res) => {
  try {
    const { enrollmentId, lessonId } = req.params;
    const progressData = req.body;

    // Find enrollment
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    // Verify user has permission (student owns enrollment or admin/instructor)
    const isStudent = enrollment.student.toString() === req.user.id;
    const isAdminOrInstructor = ["admin", "instructor"].includes(req.user.role);
    
    if (!isStudent && !isAdminOrInstructor) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this enrollment progress",
      });
    }

    // Update progress using model method
    await enrollment.updateProgress(lessonId, {
      status: progressData.status || "in_progress",
      progress_percentage: progressData.progress_percentage,
      last_accessed: new Date(),
      time_spent_seconds: progressData.time_spent_seconds || 0,
    });

    res.status(200).json({
      success: true,
      message: "Progress updated successfully",
      data: {
        overall_percentage: enrollment.progress.overall_percentage,
        lessons_completed: enrollment.progress.lessons_completed,
      },
    });
  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating progress",
      error: error.message,
    });
  }
};

/**
 * Record an assessment score
 * @route POST /api/enrollments/:enrollmentId/assessments/:assessmentId/scores
 * @access Student, Admin, Instructor
 */
export const recordAssessmentScore = async (req, res) => {
  try {
    const { enrollmentId, assessmentId } = req.params;
    const scoreData = req.body;

    // Find enrollment
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    // Verify user has permission
    const isStudent = enrollment.student.toString() === req.user.id;
    const isAdminOrInstructor = ["admin", "instructor"].includes(req.user.role);
    
    if (!isStudent && !isAdminOrInstructor) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this enrollment assessment",
      });
    }

    // Update assessment score using model method
    await enrollment.updateAssessmentScore(assessmentId, {
      score: scoreData.score,
      max_possible_score: scoreData.max_possible_score,
      passed: scoreData.passed,
      attempts: scoreData.attempts || 1,
      last_attempt_date: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Assessment score recorded successfully",
      data: enrollment.assessments.find(a => 
        a.assessment_id.toString() === assessmentId
      ),
    });
  } catch (error) {
    console.error("Error recording assessment score:", error);
    res.status(500).json({
      success: false,
      message: "Server error while recording assessment score",
      error: error.message,
    });
  }
};

/**
 * Get all enrollments for a student
 * @route GET /api/students/:studentId/enrollments
 * @access Student, Admin
 */
export const getStudentEnrollments = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Verify user has permission
    const isOwnEnrollments = studentId === req.user.id;
    const isAdmin = req.user.role === "admin";
    
    if (!isOwnEnrollments && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access these enrollments",
      });
    }

    // Get enrollments with course and batch details
    const enrollments = await Enrollment.find({ student: studentId })
      .populate("course", "course_title course_image slug category_type")
      .populate("batch", "batch_name batch_code start_date end_date schedule")
      .sort({ enrollment_date: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    console.error("Error fetching student enrollments:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching enrollments",
      error: error.message,
    });
  }
};

/**
 * Get all students enrolled in a batch
 * @route GET /api/batches/:batchId/students
 * @access Admin, Instructor
 */
export const getBatchStudents = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Verify batch exists
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Get students with enrollment details
    const enrollments = await Enrollment.findStudentsInBatch(batchId);

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    console.error("Error fetching batch students:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching batch students",
      error: error.message,
    });
  }
};

/**
 * Get enrollment details
 * @route GET /api/enrollments/:enrollmentId
 * @access Student (own enrollment), Admin, Instructor
 */
export const getEnrollmentDetails = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    // Find enrollment with populated details
    const enrollment = await Enrollment.findById(enrollmentId)
      .populate("student", "first_name last_name email profile_picture")
      .populate("course", "course_title course_image slug course_description")
      .populate("batch", "batch_name schedule assigned_instructor start_date end_date")
      .populate("certificate_id");

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    // Verify user has permission
    const isOwnEnrollment = enrollment.student._id.toString() === req.user.id;
    const isAdminOrInstructor = ["admin", "instructor"].includes(req.user.role);
    
    if (!isOwnEnrollment && !isAdminOrInstructor) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access this enrollment",
      });
    }

    res.status(200).json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    console.error("Error fetching enrollment details:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching enrollment details",
      error: error.message,
    });
  }
};

/**
 * Update enrollment status (activate/deactivate/complete)
 * @route PUT /api/enrollments/:enrollmentId/status
 * @access Admin only
 */
export const updateEnrollmentStatus = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ["active", "completed", "cancelled", "on_hold", "expired"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Find enrollment
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    // Update status
    enrollment.status = status;
    await enrollment.save();

    res.status(200).json({
      success: true,
      message: "Enrollment status updated successfully",
      data: enrollment,
    });
  } catch (error) {
    console.error("Error updating enrollment status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating enrollment status",
      error: error.message,
    });
  }
};

/**
 * Get payment history for an enrollment
 * @route GET /api/enrollments/:enrollmentId/payments
 * @access Student (own enrollment), Admin
 */
export const getPaymentHistory = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    // Find enrollment
    const enrollment = await Enrollment.findById(enrollmentId)
      .populate("student", "first_name last_name email")
      .populate("course", "course_title");

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    // Verify user has permission
    const isOwnEnrollment = enrollment.student._id.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    
    if (!isOwnEnrollment && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access this payment history",
      });
    }

    const paymentHistory = {
      enrollmentId: enrollment._id,
      studentName: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
      studentEmail: enrollment.student.email,
      courseName: enrollment.course.course_title,
      totalAmountPaid: enrollment.total_amount_paid,
      paymentPlan: enrollment.payment_plan,
      discountApplied: enrollment.discount_applied,
      discountCode: enrollment.discount_code,
      payments: enrollment.payments.sort((a, b) => 
        new Date(b.payment_date) - new Date(a.payment_date)
      )
    };

    res.status(200).json({
      success: true,
      data: paymentHistory,
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching payment history",
      error: error.message,
    });
  }
};

/**
 * Get dashboard statistics for enrollments
 * @route GET /api/enrollments/stats
 * @access Admin only
 */
export const getEnrollmentStats = async (req, res) => {
  try {
    const stats = await Enrollment.getDashboardStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching enrollment stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching enrollment statistics",
      error: error.message,
    });
  }
}; 