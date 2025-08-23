import mongoose from "mongoose";
import Enrollment from "../models/enrollment-model.js";
import { Course, Batch } from "../models/course-model.js";
import User from "../models/user-modal.js";
import Student from "../models/student-model.js";
import { createStudentS3Folder } from "../utils/s3BatchFolderManager.js";
import logger from "../utils/logger.js";

/**
 * Enroll a student in a course batch
 * @route POST /api/enrollments/students/:studentId/enroll
 * @access Admin and self
 */
export const enrollStudentInBatch = async (req, res) => {
  try {
    console.log('🚀 Starting student enrollment process...');
    console.log('📋 Request data:', {
      studentId: req.params.studentId,
      body: req.body
    });

    const { studentId } = req.params;
    const { courseId, course_id, batchId, batch_id, enrollment_type = 'batch', enrollment_source = 'direct' } = req.body;
    
    // Support both naming conventions
    const finalCourseId = courseId || course_id;
    const finalBatchId = batchId || batch_id;

    // Validate required fields
    if (!finalCourseId || !finalBatchId) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: "Course ID and Batch ID are required"
      });
    }

    // 1. Verify student exists
    console.log('🔍 Step 1: Verifying student...');
    const student = await Student.findById(studentId);
    if (!student) {
      console.log('❌ Student not found:', studentId);
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Check if student is active
    if (student.status !== "Active") {
      console.log('❌ Student account is inactive');
      return res.status(400).json({
        success: false,
        message: "Student account is inactive"
      });
    }

    console.log('✅ Student verified:', student.full_name);

    // 2. Verify course exists
    console.log('🔍 Step 2: Verifying course...');
    const course = await Course.findById(finalCourseId);
    if (!course) {
      console.log('❌ Course not found:', finalCourseId);
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    console.log('✅ Course verified:', course.course_title);

    // 3. Verify batch exists and has capacity
    console.log('🔍 Step 3: Verifying batch...');
    const batch = await Batch.findById(finalBatchId);
    if (!batch) {
      console.log('❌ Batch not found:', finalBatchId);
      return res.status(404).json({
        success: false,
        message: "Batch not found"
      });
    }

    // Check if batch has reached capacity
    if (batch.enrolled_students >= batch.capacity) {
      console.log('❌ Batch at capacity:', {
        enrolled: batch.enrolled_students,
        capacity: batch.capacity
      });
      return res.status(400).json({
        success: false,
        message: "Batch has reached maximum capacity"
      });
    }

    console.log('✅ Batch verified:', {
      name: batch.batch_name,
      capacity: batch.capacity,
      enrolled: batch.enrolled_students
    });

    // 4. Check if student is already enrolled in this batch
    console.log('🔍 Step 4: Checking existing enrollment...');
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: finalCourseId,
      batch: finalBatchId,
      status: { $ne: 'cancelled' }
    });

    if (existingEnrollment) {
      console.log('❌ Student already enrolled:', existingEnrollment._id);
      return res.status(400).json({
        success: false,
        message: "Student is already enrolled in this batch"
      });
    }

    console.log('✅ No existing enrollment found');

    // 5. Calculate access expiry date
    const accessExpiryDate = new Date(batch.end_date);
    accessExpiryDate.setDate(accessExpiryDate.getDate() + 30); // 30 days grace period

    // 6. Get course pricing
    const coursePricing = course.prices?.[0] || {
      batch: 0,
      individual: 0,
      currency: "INR"
    };

    // 7. Create enrollment record
    console.log('💾 Step 5: Creating enrollment record...');
    const enrollment = new Enrollment({
      student: studentId,
      course: finalCourseId,
      batch: finalBatchId,
      enrollment_date: new Date(),
      status: "active",
      access_expiry_date: accessExpiryDate,
      enrollment_type: enrollment_type,
      enrollment_source: enrollment_source,
      created_by: req.user?.id || studentId,
      
      // Pricing snapshot
      pricing_snapshot: {
        original_price: coursePricing.batch || 0,
        final_price: coursePricing.batch || 0,
        currency: coursePricing.currency || "INR",
        pricing_type: enrollment_type,
        discount_applied: 0,
        discount_code: null
      },
      
      // Progress tracking
      progress: {
        overall_percentage: 0,
        lessons_completed: 0,
        last_activity_date: new Date()
      },
      
      // Batch info
      batch_info: {
        batch_size: 1,
        is_batch_leader: false,
        batch_members: []
      }
    });

    // 8. Save enrollment
    await enrollment.save();
    console.log('✅ Enrollment saved:', enrollment._id);

    // 9. Update batch enrolled count and add student to batch
    console.log('📊 Step 6: Updating batch enrollment count...');
    batch.enrolled_students += 1;
    
    // Add student ID to batch's enrolled_student_ids array
    if (!batch.enrolled_student_ids) {
      batch.enrolled_student_ids = [];
    }
    batch.enrolled_student_ids.push(studentId);
    
    await batch.save();
    console.log('✅ Batch updated:', {
      enrolled_students: batch.enrolled_students,
      student_ids_count: batch.enrolled_student_ids.length
    });

    // 10. Create S3 folder for student (optional)
    try {
      const studentName = student.full_name || 
                         (student.first_name && student.last_name ? `${student.first_name} ${student.last_name}` : null) ||
                         student.first_name ||
                         student.last_name ||
                         'Unknown Student';
      
      const s3FolderResult = await createStudentS3Folder(
        finalBatchId,
        studentId,
        studentName
      );
      
      if (s3FolderResult.success) {
        console.log('✅ S3 folder created for student');
      } else {
        console.log('⚠️ S3 folder creation failed (non-critical)');
      }
    } catch (s3Error) {
      console.log('⚠️ S3 folder creation error (non-critical):', s3Error.message);
    }

    // 11. Populate enrollment for response
    await enrollment.populate([
      { path: 'student', select: 'full_name email user_image' },
      { path: 'course', select: 'course_title' },
      { path: 'batch', select: 'batch_name batch_code' }
    ]);

    console.log('✅ Enrollment process completed successfully');

    // 12. Return success response
    res.status(201).json({
      success: true,
      message: "Student successfully enrolled in batch",
      data: {
        enrollment: enrollment,
        batch: {
          _id: batch._id,
          batch_name: batch.batch_name,
          enrolled_students: batch.enrolled_students,
          capacity: batch.capacity
        }
      }
    });

  } catch (error) {
    console.error('❌ Enrollment error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: "Server error while enrolling student",
      error: error.message
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
    if (
      enrollment.payment_plan === "installment" &&
      enrollment.installments_count > enrollment.payments.length &&
      paymentData.payment_status === "completed"
    ) {
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
      data: enrollment.assessments.find(
        (a) => a.assessment_id.toString() === assessmentId,
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
      .populate(
        "batch",
        "batch_name schedule assigned_instructor start_date end_date",
      )
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
    const validStatuses = [
      "active",
      "completed",
      "cancelled",
      "on_hold",
      "expired",
    ];
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
      payments: enrollment.payments.sort(
        (a, b) => new Date(b.payment_date) - new Date(a.payment_date),
      ),
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

/**
 * Check if a student is enrolled in a specific course
 * @route GET /api/students/:studentId/enrollments/:courseId/check
 * @access Student, Admin
 */
export const checkStudentEnrollmentInCourse = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Course ID are required",
      });
    }

    // Optionally: validate ObjectId format
    if (
      !mongoose.Types.ObjectId.isValid(studentId) ||
      !mongoose.Types.ObjectId.isValid(courseId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid student or course ID format",
      });
    }

    // Check for enrollment
    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: { $ne: "cancelled" },
    })
      .populate("course", "course_title course_image slug category_type")
      .populate("batch", "batch_name batch_code start_date end_date schedule");

    if (enrollment) {
      return res.status(200).json({
        success: true,
        enrolled: true,
        message: "Student is enrolled in this course",
        data: enrollment,
      });
    } else {
      return res.status(200).json({
        success: true,
        enrolled: false,
        message: "Student is not enrolled in this course",
      });
    }
  } catch (error) {
    console.error("Error checking enrollment status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while checking enrollment status",
      error: error.message,
    });
  }
};
