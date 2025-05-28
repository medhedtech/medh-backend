import { Course, Batch } from "../models/course-model.js";
import Enrollment from "../models/enrollment-model.js";
import User from "../models/user-modal.js";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import zoomService from "../services/zoomService.js";

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
      sort_order = 'desc'
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

    // Calculate actual enrolled students count for each batch
    const batchesWithCorrectCount = await Promise.all(
      batches.map(async (batch) => {
        // Count active enrollments for this batch
        const actualEnrolledCount = await Enrollment.countDocuments({
          batch: batch._id,
          status: 'active'
        });

        // Update the batch document if the count is different
        if (actualEnrolledCount !== batch.enrolled_students) {
          await Batch.findByIdAndUpdate(batch._id, {
            enrolled_students: actualEnrolledCount
          });
        }

        return {
          ...batch,
          enrolled_students: actualEnrolledCount
        };
      })
    );

    // Get total count for pagination
    const totalBatches = await Batch.countDocuments(filter);
    const totalPages = Math.ceil(totalBatches / limit);

    res.status(200).json({
      success: true,
      count: batchesWithCorrectCount.length,
      totalBatches,
      totalPages,
      currentPage: parseInt(page),
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      data: batchesWithCorrectCount,
    });
  } catch (error) {
    console.error("Error fetching all batches:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching batches",
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

// Add controller to schedule a new class session for a batch
export const addScheduledSessionToBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { day, start_time, end_time } = req.body;

    // Find the batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    // Add the new scheduled session
    batch.schedule.push({ day, start_time, end_time, recorded_lessons: [], zoom_meeting: {} });
    await batch.save();

    const newSession = batch.schedule[batch.schedule.length - 1];
    res.status(201).json({ success: true, data: newSession });
  } catch (error) {
    console.error("Error scheduling session for batch:", error.message);
    res.status(500).json({ success: false, message: "Server error while scheduling session", error: error.message });
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