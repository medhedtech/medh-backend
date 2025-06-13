import { Course, Batch } from "../models/course-model.js";
import Enrollment from "../models/enrollment-model.js";
import User from "../models/user-modal.js";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import zoomService from "../services/zoomService.js";
import { generateSignedUrl } from "../utils/cloudfrontSigner.js";

/**
 * @typedef {('group'|'individual')} TBatchType
 */

/**
 * Create a new batch for a course
 * @route POST /api/courses/:courseId/batches
 * @access Admin only
 */
export const createBatch = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId } = req.params;
    const batchData = req.body;
    const adminId = req.user.id;

    // Extract student_id from batch data for separate processing
    const { student_id, ...batchDataWithoutStudent } = batchData;

    // Validate batch_type if provided
    if (batchDataWithoutStudent.batch_type) {
      const validBatchTypes = ['group', 'individual'];
      if (!validBatchTypes.includes(batchDataWithoutStudent.batch_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch_type. Must be 'group' or 'individual'",
        });
      }
    } else {
      // Set default batch_type to 'group' if not provided
      batchDataWithoutStudent.batch_type = 'group';
    }

    // Validate student_id if provided
    if (student_id) {
      // Ensure batch_type is individual when student_id is provided
      if (batchDataWithoutStudent.batch_type !== 'individual') {
        return res.status(400).json({
          success: false,
          message: "student_id can only be provided for individual batch type",
        });
      }

      // Verify student exists and is active
      const student = await User.findById(student_id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      if (!student.role.includes('student')) {
        return res.status(400).json({
          success: false,
          message: "User is not a student",
        });
      }

      if (student.status !== 'Active') {
        return res.status(400).json({
          success: false,
          message: "Student account is inactive",
        });
      }
    }

    // Create the batch using the Course static method
    const newBatch = await Course.createBatch(courseId, batchDataWithoutStudent, adminId);

    // If student_id was provided and batch is individual, automatically enroll the student
    let enrollmentResult = null;
    if (student_id && batchDataWithoutStudent.batch_type === 'individual') {
      try {
        // Get the course details for enrollment
        const course = await Course.findById(courseId);
        
        // Create enrollment data
        const enrollmentData = {
          student: student_id,
          course: courseId,
          batch: newBatch._id,
          enrollment_date: new Date(),
          status: 'active',
          enrollment_type: 'batch', // Use 'batch' type since this is a batch session, even if capacity=1
          access_expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          pricing_snapshot: {
            original_price: course?.course_price || 1000,
            final_price: course?.course_price || 1000,
            currency: 'INR',
            pricing_type: 'individual', // But pricing is individual since it's 1:1
            discount_applied: 0
          },
          batch_info: {
            batch_size: 1, // Individual batch has size 1
            is_batch_leader: true,
            batch_members: []
          },
          payment_plan: 'full',
          total_amount_paid: course?.course_price || 0,
          notes: `Auto-enrolled during individual batch creation`,
          created_by: adminId
        };

        // Create the enrollment
        const enrollment = new Enrollment(enrollmentData);
        await enrollment.save();

        // Update batch enrolled_students count
        await Batch.findByIdAndUpdate(newBatch._id, {
          $inc: { enrolled_students: 1 }
        });

        enrollmentResult = {
          student_id: student_id,
          enrollment_id: enrollment._id,
          enrollment_status: 'active'
        };

      } catch (enrollmentError) {
        console.error("Error auto-enrolling student:", enrollmentError);
        // Don't fail the batch creation, just log the enrollment error
        enrollmentResult = {
          student_id: student_id,
          enrollment_error: "Failed to auto-enroll student. Please enroll manually.",
          error_details: enrollmentError.message
        };
      }
    }

    // Prepare response
    const response = {
      success: true,
      message: "Batch created successfully",
      data: newBatch,
    };

    // Add enrollment info if student was processed
    if (enrollmentResult) {
      response.student_enrollment = enrollmentResult;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating batch:", error.message);
    res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Assign an instructor to a batch
 * @route PUT /api/batches/:batchId/assign-instructor/:instructorId
 * @access Admin only
 */
export const assignInstructorToBatch = async (req, res) => {
  try {
    const { batchId, instructorId } = req.params;
    const adminId = req.user.id;

    // Assign instructor using the Course static method
    const updatedBatch = await Course.assignInstructorToBatch(
      batchId,
      instructorId,
      adminId
    );

    res.status(200).json({
      success: true,
      message: "Instructor assigned to batch successfully",
      data: updatedBatch,
    });
  } catch (error) {
    console.error("Error assigning instructor:", error.message);
    res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all batches for a course
 * @route GET /api/courses/:courseId/batches
 * @access Admin, Instructor
 */
export const getBatchesForCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    const courseExists = await Course.findById(courseId);
    if (!courseExists) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const batches = await Course.getBatchesForCourse(courseId);

    res.status(200).json({
      success: true,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    console.error("Error fetching batches:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching batches",
    });
  }
};

/**
 * Get all batches across all courses
 * @route GET /api/batches
 * @access Admin, Instructor
 */
export const getAllBatches = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status,
      batch_type,
      search,
      sort_by = 'createdAt',
      sort_order = 'desc',
      include_students = 'true'
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (batch_type) {
      if (['group', 'individual'].includes(batch_type)) {
        filter.batch_type = batch_type;
      }
    }
    
    if (search) {
      filter.$or = [
        { batch_name: { $regex: search, $options: 'i' } },
        { batch_code: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort object
    const sortObj = {};
    sortObj[sort_by] = sort_order === 'desc' ? -1 : 1;

    // Get batches with populated course and instructor details
    const batches = await Batch.find(filter)
      .populate('course', 'course_title course_image slug course_type course_category')
      .populate('assigned_instructor', 'full_name email phone_numbers')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Calculate actual enrolled students count and optionally get student details
    const batchesWithStudentInfo = await Promise.all(
      batches.map(async (batch) => {
        // Get active enrollments for this batch
        const enrollments = await Enrollment.find({
          batch: batch._id,
          status: 'active'
        })
        .populate('student', 'full_name email phone_numbers user_image status')
        .select('student enrollment_date status progress.overall_percentage payment_plan')
        .lean();

        const actualEnrolledCount = enrollments.length;

        // Update the batch document if the count is different
        if (actualEnrolledCount !== batch.enrolled_students) {
          await Batch.findByIdAndUpdate(batch._id, {
            enrolled_students: actualEnrolledCount
          });
        }

        // Prepare batch data
        const batchWithStudents = {
          ...batch,
          enrolled_students: actualEnrolledCount,
        };

        // Include student details if requested
        if (include_students === 'true') {
          batchWithStudents.enrolled_students_details = enrollments.map(enrollment => ({
            student: enrollment.student,
            enrollment_date: enrollment.enrollment_date,
            enrollment_status: enrollment.status,
            progress: enrollment.progress?.overall_percentage || 0,
            payment_plan: enrollment.payment_plan
          }));
        }

        return batchWithStudents;
      })
    );

    // Get total count for pagination
    const totalBatches = await Batch.countDocuments(filter);
    const totalPages = Math.ceil(totalBatches / limit);

    // Calculate summary statistics
    const totalEnrolledStudents = batchesWithStudentInfo.reduce((sum, batch) => sum + batch.enrolled_students, 0);
    const activeBatches = batchesWithStudentInfo.filter(batch => batch.status === 'active').length;
    const upcomingBatches = batchesWithStudentInfo.filter(batch => batch.status === 'Upcoming').length;

    res.status(200).json({
      success: true,
      count: batchesWithStudentInfo.length,
      totalBatches,
      totalPages,
      currentPage: parseInt(page),
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      summary: {
        total_enrolled_students: totalEnrolledStudents,
        active_batches: activeBatches,
        upcoming_batches: upcomingBatches,
        completed_batches: batchesWithStudentInfo.filter(b => b.status === 'Completed').length,
        cancelled_batches: batchesWithStudentInfo.filter(b => b.status === 'Cancelled').length,
      },
      filters_applied: {
        status: status || 'all',
        batch_type: batch_type || 'all',
        search: search || null,
        include_students: include_students === 'true'
      },
      data: batchesWithStudentInfo,
    });
  } catch (error) {
    console.error("Error fetching all batches:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching batches",
      error: error.message,
    });
  }
};

/**
 * Get details of a specific batch
 * @route GET /api/batches/:batchId
 * @access Admin, Instructor, Enrolled Students
 */
export const getBatchDetails = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Find batch with populated instructor and course details
    const batch = await Batch.findById(batchId)
      .populate("assigned_instructor", "full_name email phone_numbers")
      .populate("course", "course_title course_image slug")
      .lean();

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Calculate actual enrolled students count
    const actualEnrolledCount = await Enrollment.countDocuments({
      batch: batchId,
      status: 'active'
    });

    // Update the batch document if the count is different
    if (actualEnrolledCount !== batch.enrolled_students) {
      await Batch.findByIdAndUpdate(batchId, {
        enrolled_students: actualEnrolledCount
      });
    }

    // Return batch with correct enrolled students count
    const batchWithCorrectCount = {
      ...batch,
      enrolled_students: actualEnrolledCount
    };

    res.status(200).json({
      success: true,
      data: batchWithCorrectCount,
    });
  } catch (error) {
    console.error("Error fetching batch details:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching batch details",
    });
  }
};

/**
 * Update a batch
 * @route PUT /api/batches/:batchId
 * @access Admin only
 */
export const updateBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const updateData = req.body;
    const adminId = req.user.id;

    // Validate batch_type if provided in update
    if (updateData.batch_type) {
      const validBatchTypes = ['group', 'individual'];
      if (!validBatchTypes.includes(updateData.batch_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch_type. Must be 'group' or 'individual'",
        });
      }
    }

    // Find the batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Update the batch with the provided data
    Object.keys(updateData).forEach(key => {
      if (key !== 'course' && key !== 'batch_code') { // Prevent changing course reference or batch code
        batch[key] = updateData[key];
      }
    });
    
    // Track who updated the batch
    batch.updated_by = adminId;

    const updatedBatch = await batch.save();

    res.status(200).json({
      success: true,
      message: "Batch updated successfully",
      data: updatedBatch,
    });
  } catch (error) {
    console.error("Error updating batch:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete a batch
 * @route DELETE /api/batches/:batchId
 * @access Admin only
 */
export const deleteBatch = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Find the batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Check if batch has enrolled students
    if (batch.enrolled_students > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete batch with enrolled students",
      });
    }

    // Delete the batch
    await Batch.findByIdAndDelete(batchId);

    res.status(200).json({
      success: true,
      message: "Batch deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting batch:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while deleting batch",
    });
  }
};

/* ========================================= */
/* STUDENT MANAGEMENT FUNCTIONS              */
/* ========================================= */

/**
 * Get all students in a batch
 * @route GET /api/batches/:batchId/students
 * @access Admin, Instructor
 */
export const getBatchStudents = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status = "active",
      search 
    } = req.query;

    // Verify batch exists
    const batch = await Batch.findById(batchId).populate('course', 'course_title');
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    const skip = (page - 1) * limit;
    
    // Build filter for enrollments
    const filter = { 
      batch: batchId
    };
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Get enrollments with populated student details
    let enrollmentsQuery = Enrollment.find(filter)
      .populate('student', 'full_name email phone_numbers user_image status created_at')
      .populate('course', 'course_title')
      .select('student enrollment_date status progress.overall_percentage total_amount_paid payment_plan access_expiry_date')
      .sort({ enrollment_date: -1 });

    // Apply search filter if provided
    if (search) {
      enrollmentsQuery = enrollmentsQuery.where({
        $or: [
          { 'student.full_name': { $regex: search, $options: 'i' } },
          { 'student.email': { $regex: search, $options: 'i' } }
        ]
      });
    }

    const enrollments = await enrollmentsQuery
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalStudents = await Enrollment.countDocuments(filter);
    const totalPages = Math.ceil(totalStudents / limit);

    // Transform data for response
    const students = enrollments.map(enrollment => ({
      enrollmentId: enrollment._id,
      student: enrollment.student,
      enrollmentDate: enrollment.enrollment_date,
      status: enrollment.status,
      progress: enrollment.progress?.overall_percentage || 0,
      totalPaid: enrollment.total_amount_paid,
      paymentPlan: enrollment.payment_plan,
      accessExpiryDate: enrollment.access_expiry_date
    }));

    res.status(200).json({
      success: true,
      batch: {
        id: batch._id,
        name: batch.batch_name,
        course: batch.course.course_title,
        capacity: batch.capacity,
        enrolled: batch.enrolled_students
      },
      students: {
        count: students.length,
        totalStudents,
        totalPages,
        currentPage: parseInt(page),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        data: students
      }
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
 * Add a student to a batch
 * @route POST /api/batches/:batchId/students
 * @access Admin only
 */
export const addStudentToBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { studentId, paymentPlan = "full_payment", notes } = req.body;

    // Verify batch exists and has capacity
    const batch = await Batch.findById(batchId).populate('course');
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Check batch type and capacity constraints
    if (batch.batch_type === 'individual') {
      // For individual batches, only allow one student
      if (batch.enrolled_students >= 1) {
        return res.status(400).json({
          success: false,
          message: "Individual batch can only have one student",
        });
      }
    } else {
      // For group batches, check normal capacity
      if (batch.enrolled_students >= batch.capacity) {
        return res.status(400).json({
          success: false,
          message: "Batch has reached maximum capacity",
        });
      }
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check if student is already enrolled in this batch
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      batch: batchId,
      status: { $ne: 'cancelled' }
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: "Student is already enrolled in this batch",
      });
    }

    // Get course pricing for the enrollment
    const coursePricing = batch.course.prices?.[0] || { batch: 0, currency: 'INR' };
    const enrollmentEndDate = new Date(batch.end_date);
    enrollmentEndDate.setDate(enrollmentEndDate.getDate() + 30); // 30 days after batch ends

    // Create enrollment
    const enrollmentData = {
      student: studentId,
      course: batch.course._id,
      batch: batchId,
      enrollment_type: batch.batch_type === 'individual' ? 'individual' : 'batch',
      payment_plan: paymentPlan,
      enrollment_date: new Date(),
      access_expiry_date: enrollmentEndDate,
      status: 'active',
      pricing_snapshot: {
        original_price: coursePricing.batch || 0,
        final_price: coursePricing.batch || 0,
        currency: coursePricing.currency || 'INR',
        pricing_type: batch.batch_type === 'individual' ? 'individual' : 'batch'
      },
      progress: {
        overall_percentage: 0,
        completed_lessons: 0,
        total_lessons: batch.course.total_lessons || 0
      },
      created_by: req.user.id,
      notes: notes
    };

    const enrollment = new Enrollment(enrollmentData);
    await enrollment.save();

    // Update batch enrolled count
    batch.enrolled_students += 1;
    await batch.save();

    // Populate the enrollment for response
    await enrollment.populate('student', 'full_name email user_image');

    res.status(201).json({
      success: true,
      message: `Student added to ${batch.batch_type} batch successfully`,
      data: {
        enrollmentId: enrollment._id,
        student: enrollment.student,
        enrollmentDate: enrollment.enrollment_date,
        status: enrollment.status,
        batch: {
          id: batch._id,
          name: batch.batch_name,
          type: batch.batch_type,
          enrolled: batch.enrolled_students,
          capacity: batch.capacity
        }
      }
    });
  } catch (error) {
    console.error("Error adding student to batch:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding student to batch",
      error: error.message,
    });
  }
};

/**
 * Remove a student from a batch
 * @route DELETE /api/batches/:batchId/students/:studentId
 * @access Admin only
 */
export const removeStudentFromBatch = async (req, res) => {
  try {
    const { batchId, studentId } = req.params;
    const { reason = "Manual removal by admin" } = req.body;

    // Find the enrollment
    const enrollment = await Enrollment.findOne({
      student: studentId,
      batch: batchId,
      status: { $ne: 'cancelled' }
    }).populate('student', 'full_name email');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Student enrollment not found in this batch",
      });
    }

    // Update enrollment status to cancelled
    enrollment.status = 'cancelled';
    enrollment.cancellation_reason = reason;
    enrollment.cancelled_date = new Date();
    enrollment.cancelled_by = req.user.id;
    await enrollment.save();

    // Update batch enrolled count
    const batch = await Batch.findById(batchId);
    if (batch) {
      batch.enrolled_students = Math.max(0, batch.enrolled_students - 1);
      await batch.save();
    }

    res.status(200).json({
      success: true,
      message: "Student removed from batch successfully",
      data: {
        student: enrollment.student,
        cancellationReason: reason,
        cancelledDate: enrollment.cancelled_date
      }
    });
  } catch (error) {
    console.error("Error removing student from batch:", error);
    res.status(500).json({
      success: false,
      message: "Server error while removing student from batch",
      error: error.message,
    });
  }
};

/**
 * Transfer a student from one batch to another
 * @route POST /api/batches/:batchId/students/:studentId/transfer
 * @access Admin only
 */
export const transferStudentToBatch = async (req, res) => {
  try {
    const { batchId, studentId } = req.params;
    const { targetBatchId, reason = "Batch transfer by admin" } = req.body;

    if (batchId === targetBatchId) {
      return res.status(400).json({
        success: false,
        message: "Source and target batches cannot be the same",
      });
    }

    // Find source enrollment
    const sourceEnrollment = await Enrollment.findOne({
      student: studentId,
      batch: batchId,
      status: 'active'
    }).populate('student', 'full_name email');

    if (!sourceEnrollment) {
      return res.status(404).json({
        success: false,
        message: "Student enrollment not found in source batch",
      });
    }

    // Verify target batch exists and has capacity
    const targetBatch = await Batch.findById(targetBatchId).populate('course');
    if (!targetBatch) {
      return res.status(404).json({
        success: false,
        message: "Target batch not found",
      });
    }

    if (targetBatch.enrolled_students >= targetBatch.capacity) {
      return res.status(400).json({
        success: false,
        message: "Target batch has reached maximum capacity",
      });
    }

    // Verify both batches are for the same course
    if (!sourceEnrollment.course.equals(targetBatch.course._id)) {
      return res.status(400).json({
        success: false,
        message: "Cannot transfer student between batches of different courses",
      });
    }

    // Check if student is already enrolled in target batch
    const existingTargetEnrollment = await Enrollment.findOne({
      student: studentId,
      batch: targetBatchId,
      status: { $ne: 'cancelled' }
    });

    if (existingTargetEnrollment) {
      return res.status(400).json({
        success: false,
        message: "Student is already enrolled in the target batch",
      });
    }

    // Create new enrollment in target batch
    const newEnrollmentData = {
      ...sourceEnrollment.toObject(),
      _id: undefined,
      batch: targetBatchId,
      enrollment_date: new Date(),
      transfer_info: {
        from_batch: batchId,
        transfer_date: new Date(),
        transfer_reason: reason,
        transferred_by: req.user.id
      }
    };

    const newEnrollment = new Enrollment(newEnrollmentData);
    await newEnrollment.save();

    // Cancel old enrollment
    sourceEnrollment.status = 'transferred';
    sourceEnrollment.transfer_info = {
      to_batch: targetBatchId,
      transfer_date: new Date(),
      transfer_reason: reason,
      transferred_by: req.user.id
    };
    await sourceEnrollment.save();

    // Update batch counts
    const sourceBatch = await Batch.findById(batchId);
    if (sourceBatch) {
      sourceBatch.enrolled_students = Math.max(0, sourceBatch.enrolled_students - 1);
      await sourceBatch.save();
    }

    targetBatch.enrolled_students += 1;
    await targetBatch.save();

    res.status(200).json({
      success: true,
      message: "Student transferred successfully",
      data: {
        student: sourceEnrollment.student,
        transfer: {
          from: {
            batchId: batchId,
            batchName: sourceBatch?.batch_name
          },
          to: {
            batchId: targetBatchId,
            batchName: targetBatch.batch_name
          },
          transferDate: new Date(),
          reason: reason
        },
        newEnrollmentId: newEnrollment._id
      }
    });
  } catch (error) {
    console.error("Error transferring student:", error);
    res.status(500).json({
      success: false,
      message: "Server error while transferring student",
      error: error.message,
    });
  }
};

/**
 * Update student status in a batch
 * @route PUT /api/batches/:batchId/students/:studentId/status
 * @access Admin only
 */
export const updateStudentStatusInBatch = async (req, res) => {
  try {
    const { batchId, studentId } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ["active", "completed", "on_hold", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
    }

    // Find enrollment
    const enrollment = await Enrollment.findOne({
      student: studentId,
      batch: batchId
    }).populate('student', 'full_name email');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Student enrollment not found in this batch",
      });
    }

    const oldStatus = enrollment.status;
    enrollment.status = status;
    
    if (reason) {
      enrollment.status_change_reason = reason;
    }
    
    enrollment.status_updated_by = req.user.id;
    enrollment.status_updated_at = new Date();

    await enrollment.save();

    // Update batch count if status affects enrollment
    if ((oldStatus === 'active' && status !== 'active') || 
        (oldStatus !== 'active' && status === 'active')) {
      const batch = await Batch.findById(batchId);
      if (batch) {
        const activeEnrollments = await Enrollment.countDocuments({
          batch: batchId,
          status: 'active'
        });
        batch.enrolled_students = activeEnrollments;
        await batch.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Student status updated successfully",
      data: {
        student: enrollment.student,
        oldStatus: oldStatus,
        newStatus: status,
        reason: reason,
        updatedAt: enrollment.status_updated_at
      }
    });
  } catch (error) {
    console.error("Error updating student status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating student status",
      error: error.message,
    });
  }
};

/**
 * Update batch status (e.g., Upcoming → Active → Completed/Cancelled)
 * @route PUT /api/v1/batches/:batchId/status
 * @access Admin, Super-Admin
 */
export const updateBatchStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array()
      });
    }

    const { batchId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user.id;

    // Check if batch exists
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found"
      });
    }

    // Store previous status for audit
    const previousStatus = batch.status;

    // Validate status transition
    const validTransitions = {
      'Upcoming': ['Active', 'Cancelled'],
      'Active': ['Completed', 'Cancelled'],
      'Completed': [], // Cannot change from completed
      'Cancelled': ['Upcoming', 'Active'] // Can reactivate if needed
    };

    if (!validTransitions[previousStatus]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from "${previousStatus}" to "${status}". Valid transitions: ${validTransitions[previousStatus]?.join(', ') || 'None'}`
      });
    }

    // Update batch status
    const updatedBatch = await Batch.findByIdAndUpdate(
      batchId,
      {
        status: status,
        $push: {
          status_history: {
            previous_status: previousStatus,
            new_status: status,
            changed_by: adminId,
            changed_at: new Date(),
            reason: reason || `Status changed from ${previousStatus} to ${status}`
          }
        },
        updated_by: adminId,
        updated_at: new Date()
      },
      { 
        new: true,
        runValidators: true
      }
    ).populate('course', 'course_title course_image slug')
     .populate('assigned_instructor', 'full_name email phone_numbers');

    // If batch is being activated, validate that it has required data
    if (status === 'Active') {
      if (!updatedBatch.assigned_instructor) {
        return res.status(400).json({
          success: false,
          message: "Cannot activate batch without an assigned instructor"
        });
      }
      
      if (!updatedBatch.schedule || updatedBatch.schedule.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot activate batch without a schedule"
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Batch status successfully changed from "${previousStatus}" to "${status}"`,
      data: {
        batch: updatedBatch,
        status_change: {
          from: previousStatus,
          to: status,
          changed_by: adminId,
          changed_at: new Date(),
          reason: reason || `Status changed from ${previousStatus} to ${status}`
        }
      }
    });

  } catch (error) {
    console.error("Error updating batch status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating batch status",
      error: error.message
    });
  }
};

// Add a new controller function to get batches by course category
export const getBatchesByCategory = async (req, res) => {
  try {
    const { courseCategory } = req.params;
    // Find course IDs matching the provided category
    const courses = await Course.find({ course_category: courseCategory }).select('_id');
    const courseIds = courses.map(c => c._id);
    // Fetch batches for those courses
    const batches = await Batch.find({ course: { $in: courseIds } })
      .populate('assigned_instructor', 'full_name email phone_numbers')
      .populate('course', 'course_title course_image slug course_type course_category');
    res.status(200).json({
      success: true,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    console.error("Error fetching batches by category:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching batches by category",
    });
  }
};

// Add a new controller function to add a recorded lesson to a batch
export const addRecordedLessonToBatch = async (req, res) => {
  try {
    const { batchId, sessionId } = req.params;
    const { title, url, recorded_date } = req.body;

    // Find the batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    // Find the scheduled session sub-document
    const session = batch.schedule.id(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Scheduled session not found" });
    }

    // Add the recorded lesson under the scheduled session
    session.recorded_lessons.push({
      title,
      url,
      recorded_date: recorded_date || new Date(),
      created_by: req.user.id,
    });
    await batch.save();

    res.status(201).json({ success: true, data: session.recorded_lessons });
  } catch (error) {
    console.error("Error adding recorded lesson to batch:", error.message);
    res.status(500).json({ success: false, message: "Server error while adding recorded lesson", error: error.message });
  }
};

/**
 * Add recorded lesson to batch with automatic CloudFront URL signing
 * @route POST /api/v1/batches/:batchId/sessions/:sessionId/recorded-lessons-with-signing
 * @access Admin, Instructor
 */
export const addRecordedLessonToBatchWithUpload = async (req, res) => {
  try {
    const { batchId, sessionId } = req.params;
    const { title, url, recorded_date } = req.body;

    // Find the batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    // Find the scheduled session sub-document
    const session = batch.schedule.id(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Scheduled session not found" });
    }

    // Create the recorded lesson object
    const recordedLessonData = {
      title,
      url,
      recorded_date: recorded_date || new Date(),
      created_by: req.user.id,
    };

    // Generate signed URL if it's a CloudFront/S3 URL
    if (url) {
      try {
        let signedUrl;
        
        // Convert S3 URL to CloudFront URL and sign it (only for medh-filess bucket)
        if (url.includes('medh-filess.s3.') && url.includes('.amazonaws.com')) {
          const s3UrlParts = url.split('.amazonaws.com/');
          if (s3UrlParts.length === 2) {
            const objectKey = s3UrlParts[1];
            const cloudFrontUrl = `https://cdn.medh.co/${objectKey}`;
            signedUrl = generateSignedUrl(cloudFrontUrl);
          }
        }
        // Sign existing CloudFront URLs
        else if (url.includes('cdn.medh.co')) {
          signedUrl = generateSignedUrl(url);
        }
        
        // Add signed URL to the response data
        if (signedUrl) {
          recordedLessonData.signedUrl = signedUrl;
        }
      } catch (signError) {
        console.error("Error generating signed URL for recorded lesson:", signError);
        // Don't fail the operation, just log the error
      }
    }

    // Add the recorded lesson to the session
    session.recorded_lessons.push(recordedLessonData);
    await batch.save();

    // Get the newly added lesson
    const newLesson = session.recorded_lessons[session.recorded_lessons.length - 1];

    res.status(201).json({ 
      success: true, 
      message: "Recorded lesson added successfully",
      data: {
        lesson: newLesson,
        batch: {
          id: batch._id,
          name: batch.batch_name,
          type: batch.batch_type
        },
        session: {
          id: session._id,
          date: session.date,
          day: session.day,
          start_time: session.start_time,
          end_time: session.end_time
        }
      }
    });
  } catch (error) {
    console.error("Error adding recorded lesson to batch:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Server error while adding recorded lesson", 
      error: error.message 
    });
  }
};

/**
 * Upload and add recorded lesson to batch in one operation
 * @route POST /api/v1/batches/:batchId/sessions/:sessionId/upload-recorded-lesson
 * @access Admin, Instructor
 */
export const uploadAndAddRecordedLesson = async (req, res) => {
  try {
    const { batchId, sessionId } = req.params;
    const { base64String, title, recorded_date } = req.body;

    if (!base64String) {
      return res.status(400).json({
        success: false,
        message: "base64String is required"
      });
    }

    // Send immediate response to prevent timeout
    res.status(202).json({
      success: true,
      message: "Upload started successfully",
      status: "uploading",
      data: {
        batchId,
        sessionId,
        title: title || 'Recorded Lesson',
        uploadStatus: "in_progress"
      }
    });

    // Continue with upload in background
    processUploadInBackground(batchId, sessionId, base64String, title, recorded_date, req.user.id);
    
  } catch (error) {
    console.error("Error starting upload:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Server error while starting upload",
        error: error.message
      });
    }
  }
};

// Background upload processing function
const processUploadInBackground = async (batchId, sessionId, base64String, title, recorded_date, userId) => {
  try {

    // Import required modules
    const { Batch } = await import("../models/course-model.js");
    const Enrollment = (await import("../models/enrollment-model.js")).default;
    const { uploadBase64FileOptimized, uploadBase64FileChunked } = await import("../utils/uploadFile.js");
    const { ENV_VARS } = await import("../config/envVars.js");

    console.log(`[Background Upload] Starting upload for batch ${batchId}, session ${sessionId}`);

    // Find the batch and determine upload path
    const batch = await Batch.findById(batchId)
      .populate('course', 'course_title')
      .lean();
    
    if (!batch) {
      console.error(`[Background Upload] Batch ${batchId} not found`);
      return;
    }

    // Determine upload directory based on batch type
    // Determine upload directory based on batch type
    let uploadFolder;
    if (batch.batch_type === 'individual') {
      // For individual batch, find the enrolled student
      const enrollment = await Enrollment.findOne({ 
        batch: batchId, 
        status: 'active' 
      }).select('student');
      
      if (!enrollment) {
        console.error(`[Background Upload] No active student found for individual batch ${batchId}`);
        return;
      }
      
      uploadFolder = `videos/student/${enrollment.student}`;
    } else {
      // For group batch, use batch ID
      uploadFolder = `videos/${batchId}`;
    }

    // Parse base64 data
    let mimeType;
    let base64Data;
    
    const dataUriMatch = base64String.match(/^data:(.*?);base64,(.*)$/);
    if (dataUriMatch) {
      mimeType = dataUriMatch[1];
      base64Data = dataUriMatch[2];
    } else {
      // Raw base64 string, assume video/mp4
      mimeType = "video/mp4";
      base64Data = base64String;
    }

    // Validate that it's a video file
    if (!mimeType.startsWith("video/")) {
      console.error(`[Background Upload] Invalid file type: ${mimeType}`);
      return;
    }

    // Quick size estimation
    const estimatedSize = (base64Data.length * 3) / 4;
    if (estimatedSize > ENV_VARS.UPLOAD_CONSTANTS.MAX_FILE_SIZE) {
      console.error(`[Background Upload] File too large: ${estimatedSize} bytes`);
      return;
    }

    console.log(`[Background Upload] Uploading ${(estimatedSize / 1024 / 1024).toFixed(2)}MB to ${uploadFolder}`);

    // Choose processing method based on file size
    const CHUNKED_THRESHOLD = 25 * 1024 * 1024; // 25MB threshold
    
    let uploadResult;
    if (estimatedSize > CHUNKED_THRESHOLD) {
      uploadResult = await uploadBase64FileChunked(base64Data, mimeType, uploadFolder);
    } else {
      uploadResult = await uploadBase64FileOptimized(base64Data, mimeType, uploadFolder);
    }

    console.log(`[Background Upload] Upload completed: ${uploadResult.data.url}`);

    // Add the recorded lesson to the batch session
    const batchDoc = await Batch.findById(batchId);
    const session = batchDoc.schedule.id(sessionId);
    
    if (!session) {
      console.error(`[Background Upload] Session ${sessionId} not found in batch ${batchId}`);
      return;
    }

    // Add the recorded lesson
    session.recorded_lessons.push({
      title: title || 'Recorded Lesson',
      url: uploadResult.data.url,
      recorded_date: recorded_date || new Date(),
      created_by: userId,
    });
    
    await batchDoc.save();

    console.log(`[Background Upload] Successfully added recorded lesson to batch ${batchId}, session ${sessionId}`);

  } catch (error) {
    console.error(`[Background Upload] Error processing upload for batch ${batchId}:`, error);
  }
};

// Controller to get recorded lessons for a scheduled session
export const getRecordedLessonsForSession = async (req, res) => {
  try {
    const { batchId, sessionId } = req.params;
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    const session = batch.schedule.id(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Scheduled session not found" });
    }
    const lessons = session.recorded_lessons || [];
    res.status(200).json({ success: true, data: lessons });
  } catch (error) {
    console.error("Error fetching recorded lessons:", error.message);
    res.status(500).json({ success: false, message: "Server error while fetching recorded lessons", error: error.message });
  }
};

// Controller to get recorded lessons for a student across all sessions
export const getRecordedLessonsForStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    // Authorization: students can only access their own recorded lessons
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ success: false, message: "Unauthorized to access other student's recorded lessons" });
    }
    // Verify student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    // Find active enrollments for the student
    const enrollments = await Enrollment.find({ student: studentId, status: 'active' })
      .populate({ path: 'batch', select: 'batch_name schedule' })
      .lean();
    const lessonsData = [];
    // Iterate through enrollments and collect recorded lessons
    for (const enrollment of enrollments) {
      const batch = enrollment.batch;
      if (!batch || !batch.schedule) continue;
      for (const session of batch.schedule) {
        if (session.recorded_lessons && session.recorded_lessons.length) {
          // Generate signed URLs for video lessons stored on CloudFront or S3
          const recordedLessonsWithSignedUrls = session.recorded_lessons.map(lesson => {
            if (lesson.url) {
              // Convert S3 URLs to CloudFront URLs and sign them (only for medh-filess bucket)
              if (lesson.url.includes('medh-filess.s3.') && lesson.url.includes('.amazonaws.com')) {
                try {
                  // Extract the object key from S3 URL
                  const s3UrlParts = lesson.url.split('.amazonaws.com/');
                  if (s3UrlParts.length === 2) {
                    const objectKey = s3UrlParts[1];
                    const cloudFrontUrl = `https://cdn.medh.co/${objectKey}`;
                    const signedUrl = generateSignedUrl(cloudFrontUrl);
                    return {
                      ...lesson,
                      url: signedUrl  // Replace S3 URL with signed CloudFront URL
                    };
                  }
                } catch (signError) {
                  console.error("Error converting S3 URL to signed CloudFront URL:", signError);
                  return lesson; // Return original lesson if signing fails
                }
              }
              // Sign existing CloudFront URLs
              else if (lesson.url.includes('cdn.medh.co')) {
                try {
                  const signedUrl = generateSignedUrl(lesson.url);
                  return {
                    ...lesson,
                    url: signedUrl  // Replace original URL with signed URL
                  };
                } catch (signError) {
                  console.error("Error signing CloudFront URL for recorded lesson:", signError);
                  return lesson; // Return original lesson if signing fails
                }
              }
            }
            
            return lesson; // Return original lesson for non-S3/non-CloudFront URLs (like YouTube)
          });

          lessonsData.push({
            batch: {
              id: batch._id,
              name: batch.batch_name
            },
            session: {
              id: session._id,
              day: session.day,
              start_time: session.start_time,
              end_time: session.end_time
            },
            recorded_lessons: recordedLessonsWithSignedUrls
          });
        }
      }
    }
    res.status(200).json({ success: true, count: lessonsData.length, data: lessonsData });
  } catch (error) {
    console.error("Error fetching recorded lessons for student:", error.message);
    res.status(500).json({ success: false, message: "Server error while fetching recorded lessons for student", error: error.message });
  }
};

// Add controller to schedule a new class session for a batch
export const addScheduledSessionToBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { date, start_time, end_time, title, description } = req.body;

    // Find the batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    // Check if session date is within batch duration
    const sessionDate = new Date(date);
    const batchStartDate = new Date(batch.start_date);
    const batchEndDate = new Date(batch.end_date);
    
    if (sessionDate < batchStartDate || sessionDate > batchEndDate) {
      return res.status(400).json({ 
        success: false, 
        message: "Session date must be within batch start and end dates",
        batch_duration: {
          start_date: batch.start_date,
          end_date: batch.end_date
        }
      });
    }

    // Check for duplicate sessions on the same date and overlapping times
    const existingSession = batch.schedule.find(session => {
      if (!session.date) return false; // Skip old day-based sessions
      
      const existingSessionDate = new Date(session.date);
      const isSameDate = existingSessionDate.toDateString() === sessionDate.toDateString();
      
      if (!isSameDate) return false;
      
      // Check for time overlap
      const newStart = start_time;
      const newEnd = end_time;
      const existingStart = session.start_time;
      const existingEnd = session.end_time;
      
      const newStartMins = newStart.split(':').reduce((acc, time) => (60 * acc) + +time);
      const newEndMins = newEnd.split(':').reduce((acc, time) => (60 * acc) + +time);
      const existingStartMins = existingStart.split(':').reduce((acc, time) => (60 * acc) + +time);
      const existingEndMins = existingEnd.split(':').reduce((acc, time) => (60 * acc) + +time);
      
      return (newStartMins < existingEndMins && newEndMins > existingStartMins);
    });

    if (existingSession) {
      return res.status(400).json({ 
        success: false, 
        message: "A session already exists at this date and time",
        conflicting_session: {
          date: existingSession.date,
          start_time: existingSession.start_time,
          end_time: existingSession.end_time
        }
      });
    }

    // Add the new scheduled session with date instead of day
    const newSessionData = {
      date: date,
      start_time: start_time,
      end_time: end_time,
      title: title || `Session on ${sessionDate.toLocaleDateString()}`,
      description: description || '',
      recorded_lessons: [],
      zoom_meeting: {},
      created_by: req.user.id,
      created_at: new Date()
    };

    batch.schedule.push(newSessionData);
    await batch.save();

    const newSession = batch.schedule[batch.schedule.length - 1];
    res.status(201).json({ 
      success: true, 
      message: "Session scheduled successfully",
      data: newSession 
    });
  } catch (error) {
    console.error("Error scheduling session for batch:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Server error while scheduling session", 
      error: error.message 
    });
  }
};

// Create a Zoom meeting for a scheduled session
export const createZoomMeetingForSession = async (req, res) => {
  try {
    const { batchId, sessionId } = req.params;
    const meetingData = req.body;

    // Create Zoom meeting via service
    const meeting = await zoomService.createMeeting(meetingData);

    // Find batch and session
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    const session = batch.schedule.id(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Scheduled session not found" });
    }

    // Store meeting details in session
    session.zoom_meeting = {
      meeting_id: meeting.id,
      join_url: meeting.join_url,
      topic: meeting.topic,
      password: meeting.password,
    };
    await batch.save();

    res.status(201).json({ success: true, data: session.zoom_meeting });
  } catch (error) {
    console.error("Error creating Zoom meeting for session:", error.message);
    res.status(500).json({ success: false, message: "Server error while creating Zoom meeting", error: error.message });
  }
};

// Add controller to get batches for a student by their ID
export const getBatchesForStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    // Authorization: students can only access their own batches
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access other student's batches",
      });
    }
    // Verify student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }
    // Fetch enrollments for student with batch and course details
    const enrollments = await Enrollment.find({ student: studentId })
      .populate('batch', 'batch_name batch_code start_date end_date schedule status')
      .populate('course', 'course_title');
    // Transform enrollments to batch list
    const batches = enrollments
      .filter(e => e.batch)
      .map(e => ({
        batch: e.batch,
        course: e.course,
        enrollmentDate: e.enrollment_date,
        enrollmentStatus: e.status
      }));
    return res.status(200).json({
      success: true,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    console.error("Error fetching student batches:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching student batches",
      error: error.message,
    });
  }
};

// Get upcoming sessions for a specific batch
export const getUpcomingSessionsForBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { limit = 10, days_ahead = 28 } = req.query;

    // Find the batch
    const batch = await Batch.findById(batchId)
      .populate('assigned_instructor', 'full_name email')
      .lean();
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Check if batch has a schedule
    if (!batch.schedule || batch.schedule.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Batch has no scheduled sessions",
        data: [],
        count: 0,
      });
    }

    const now = new Date();
    const searchEndDate = new Date(now.getTime() + (parseInt(days_ahead) * 24 * 60 * 60 * 1000));
    const batchEndDate = batch.end_date ? new Date(batch.end_date) : null;
    const actualEndDate = batchEndDate && batchEndDate < searchEndDate ? batchEndDate : searchEndDate;
    
    // Filter sessions that are in the future and within the time range
    const upcomingSessions = batch.schedule
      .filter(session => {
        // Handle both old day-based and new date-based sessions
        if (session.date) {
          // New date-based session
          const sessionDate = new Date(session.date);
        const [hours, minutes] = session.start_time.split(':').map(Number);
        sessionDate.setHours(hours, minutes, 0, 0);
        
          return sessionDate > now && sessionDate <= actualEndDate;
        } else if (session.day) {
          // Legacy day-based session - we'll keep this for backward compatibility
          // but won't generate recurring sessions anymore
          return false;
        }
        return false;
      })
      .map(session => {
        const sessionDate = new Date(session.date);
        const [startHours, startMinutes] = session.start_time.split(':').map(Number);
        const [endHours, endMinutes] = session.end_time.split(':').map(Number);
        
        sessionDate.setHours(startHours, startMinutes, 0, 0);
        const sessionEndDate = new Date(sessionDate);
        sessionEndDate.setHours(endHours, endMinutes, 0, 0);
        
        return {
            session_id: session._id,
            session_date: sessionDate,
            session_end_date: sessionEndDate,
          date: session.date,
            start_time: session.start_time,
            end_time: session.end_time,
          title: session.title || `Session on ${sessionDate.toLocaleDateString()}`,
          description: session.description || '',
            batch: {
              id: batch._id,
              name: batch.batch_name,
              code: batch.batch_code,
              status: batch.status,
              start_date: batch.start_date,
              end_date: batch.end_date,
            },
            instructor: batch.assigned_instructor,
            zoom_meeting: session.zoom_meeting,
            has_recorded_lessons: session.recorded_lessons?.length > 0,
          is_upcoming: true,
        };
      })
      .sort((a, b) => a.session_date - b.session_date)
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      count: upcomingSessions.length,
      batch_status: batch.status,
      search_period: {
        from: now.toISOString(),
        to: actualEndDate.toISOString(),
        batch_end_date: batch.end_date,
      },
      data: upcomingSessions,
    });
  } catch (error) {
    console.error("Error fetching upcoming sessions for batch:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching upcoming sessions",
      error: error.message,
    });
  }
};

// Get upcoming sessions for a student across all their enrolled batches
export const getUpcomingSessionsForStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { limit = 20, days_ahead = 28 } = req.query;

    // Authorization: students can only access their own sessions
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access other student's sessions",
      });
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check if user has student role
    if (!student.role.includes('student')) {
      return res.status(400).json({
        success: false,
        message: "User is not a student",
      });
    }

    // Find active enrollments for the student
    const enrollments = await Enrollment.find({ 
      student: studentId, 
      status: 'active' 
    })
    .populate({
      path: 'batch',
      select: 'batch_name batch_code schedule status assigned_instructor start_date end_date',
      populate: {
        path: 'assigned_instructor',
        select: 'full_name email'
      }
    })
    .populate('course', 'course_title')
    .lean();

    const upcomingSessions = [];
    const now = new Date();
    const searchEndDate = new Date(now.getTime() + (parseInt(days_ahead) * 24 * 60 * 60 * 1000));

    // Iterate through each enrollment
    enrollments.forEach(enrollment => {
      const batch = enrollment.batch;
      
      // Skip if batch doesn't exist or has no schedule
      if (!batch || !batch.schedule || batch.schedule.length === 0) {
        return;
      }

      // Consider batch end date
      const batchEndDate = batch.end_date ? new Date(batch.end_date) : null;
      const actualEndDate = batchEndDate && batchEndDate < searchEndDate ? batchEndDate : searchEndDate;

      // Filter and process sessions for this batch
      batch.schedule.forEach(session => {
        // Handle both old day-based and new date-based sessions
        if (session.date) {
          // New date-based session
          const sessionDate = new Date(session.date);
          const [startHours, startMinutes] = session.start_time.split(':').map(Number);
          const [endHours, endMinutes] = session.end_time.split(':').map(Number);
          
          sessionDate.setHours(startHours, startMinutes, 0, 0);
          const sessionEndDate = new Date(sessionDate);
          sessionEndDate.setHours(endHours, endMinutes, 0, 0);
          
          // Only include sessions that are in the future and within the time range
          const isInFuture = sessionDate > now;
          const isWithinRange = sessionDate <= actualEndDate;
          const isAfterBatchStart = !batch.start_date || sessionDate >= new Date(batch.start_date);
          
          if (isInFuture && isWithinRange && isAfterBatchStart) {
            upcomingSessions.push({
              session_id: session._id,
              session_date: sessionDate,
              session_end_date: sessionEndDate,
              date: session.date,
              start_time: session.start_time,
              end_time: session.end_time,
              title: session.title || `Session on ${sessionDate.toLocaleDateString()}`,
              description: session.description || '',
              batch: {
                id: batch._id,
                name: batch.batch_name,
                code: batch.batch_code,
                status: batch.status,
                start_date: batch.start_date,
                end_date: batch.end_date,
              },
              course: {
                id: enrollment.course._id,
                title: enrollment.course.course_title,
              },
              instructor: batch.assigned_instructor,
              zoom_meeting: session.zoom_meeting,
              has_recorded_lessons: session.recorded_lessons?.length > 0,
              enrollment_status: enrollment.status,
              is_upcoming: true,
            });
          }
      }
        // Note: We're not processing legacy day-based sessions anymore
      });
    });

    // Sort by session date
    upcomingSessions.sort((a, b) => a.session_date - b.session_date);

    // Apply limit
    const limitedSessions = upcomingSessions.slice(0, parseInt(limit));

    // Count batches by status (but only those with actual upcoming sessions)
    const batchesWithUpcomingSessions = [...new Set(upcomingSessions.map(s => s.batch.id))];
    const activeBatches = enrollments.filter(e => 
      e.batch && 
      e.batch.status === 'active' && 
      batchesWithUpcomingSessions.includes(e.batch._id.toString())
    ).length;
    const upcomingBatches = enrollments.filter(e => 
      e.batch && 
      e.batch.status === 'Upcoming' && 
      batchesWithUpcomingSessions.includes(e.batch._id.toString())
    ).length;

    res.status(200).json({
      success: true,
      count: limitedSessions.length,
      total_upcoming: upcomingSessions.length,
      active_batches: activeBatches,
      upcoming_batches: upcomingBatches,
      total_batches: activeBatches + upcomingBatches,
      days_ahead: parseInt(days_ahead),
      search_period: {
        from: now.toISOString(),
        to: searchEndDate.toISOString(),
      },
      student: {
        id: student._id,
        name: student.full_name,
        email: student.email
      },
      data: limitedSessions,
    });
  } catch (error) {
    console.error("Error fetching upcoming sessions for student:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching upcoming sessions",
      error: error.message,
    });
  }
}; 