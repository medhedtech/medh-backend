import { Course, Batch } from "../models/course-model.js";
import Enrollment from "../models/enrollment-model.js";
import User from "../models/user-modal.js";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import zoomService from "../services/zoomService.js";
import { generateSignedUrl } from "../utils/cloudfrontSigner.js";
import OnlineMeeting from "../models/online-meeting.js";
import SessionRating from "../models/session-rating.model.js"; // Import the new SessionRating model
import LiveSession from "../models/liveSession.model.js"; // Import LiveSession model
import { createBatchS3Folder, createStudentS3Folder } from "../utils/s3BatchFolderManager.js";
import logger from "../utils/logger.js";

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
      const validBatchTypes = ["group", "individual"];
      if (!validBatchTypes.includes(batchDataWithoutStudent.batch_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch_type. Must be 'group' or 'individual'",
        });
      }
    } else {
      // Set default batch_type to 'group' if not provided
      batchDataWithoutStudent.batch_type = "group";
    }

    // Validate student_id if provided
    if (student_id) {
      // Ensure batch_type is individual when student_id is provided
      if (batchDataWithoutStudent.batch_type !== "individual") {
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

      if (!student.role.includes("student")) {
        return res.status(400).json({
          success: false,
          message: "User is not a student",
        });
      }

      if (!student.is_active) {
        return res.status(400).json({
          success: false,
          message: "Student account is inactive",
        });
      }
    }

    // Create the batch using the Course static method
    const newBatch = await Course.createBatch(
      courseId,
      batchDataWithoutStudent,
      adminId,
    );

    // Create S3 folder for the batch
    try {
      const s3FolderResult = await createBatchS3Folder(
        newBatch._id.toString(),
        newBatch.batch_name || 'New Batch'
      );
      
      if (s3FolderResult.success) {
        logger.info(`✅ S3 folder created for batch: ${newBatch.batch_name} (${newBatch._id})`);
        logger.info(`   - S3 Path: ${s3FolderResult.s3Path}`);
      } else {
        logger.warn(`⚠️ Failed to create S3 folder for batch: ${newBatch.batch_name}`, s3FolderResult.error);
      }
    } catch (s3Error) {
      logger.error(`❌ Error creating S3 folder for batch: ${newBatch.batch_name}`, s3Error);
      // Don't fail batch creation if S3 folder creation fails
    }

    // If student_id was provided and batch is individual, automatically enroll the student
    let enrollmentResult = null;
    if (student_id && batchDataWithoutStudent.batch_type === "individual") {
      try {
        // Get the course details for enrollment
        const course = await Course.findById(courseId);

        // Create enrollment data
        const enrollmentData = {
          student: student_id,
          course: courseId,
          batch: newBatch._id,
          enrollment_date: new Date(),
          status: "active",
          enrollment_type: "batch", // Use 'batch' type since this is a batch session, even if capacity=1
          access_expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          pricing_snapshot: {
            original_price: course?.course_price || 1000,
            final_price: course?.course_price || 1000,
            currency: "INR",
            pricing_type: "individual", // But pricing is individual since it's 1:1
            discount_applied: 0,
          },
          batch_info: {
            batch_size: 1, // Individual batch has size 1
            is_batch_leader: true,
            batch_members: [],
          },
          payment_plan: "full",
          total_amount_paid: course?.course_price || 0,
          notes: `Auto-enrolled during individual batch creation`,
          created_by: adminId,
        };

        // Create the enrollment
        const enrollment = new Enrollment(enrollmentData);
        await enrollment.save();

        // Update batch enrolled_students count
        await Batch.findByIdAndUpdate(newBatch._id, {
          $inc: { enrolled_students: 1 },
        });

        enrollmentResult = {
          student_id: student_id,
          enrollment_id: enrollment._id,
          enrollment_status: "active",
        };
      } catch (enrollmentError) {
        console.error("Error auto-enrolling student:", enrollmentError);
        // Don't fail the batch creation, just log the enrollment error
        enrollmentResult = {
          student_id: student_id,
          enrollment_error:
            "Failed to auto-enroll student. Please enroll manually.",
          error_details: enrollmentError.message,
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
      adminId,
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
      sort_by = "createdAt",
      sort_order = "desc",
      include_students = "true",
    } = req.query;

    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (batch_type) {
      if (["group", "individual"].includes(batch_type)) {
        filter.batch_type = batch_type;
      }
    }

    if (search) {
      filter.$or = [
        { batch_name: { $regex: search, $options: "i" } },
        { batch_code: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    const sortObj = {};
    sortObj[sort_by] = sort_order === "desc" ? -1 : 1;

    // Get batches with populated course and instructor details
    const batches = await Batch.find(filter)
      .populate(
        "course",
        "course_title course_image slug course_type course_category",
      )
      .populate("assigned_instructor", "full_name email phone_numbers")
      .select("+instructor_details") // Include instructor_details field
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
          status: "active",
        })
          .populate(
            "student",
            "full_name email phone_numbers user_image status",
          )
          .select(
            "student enrollment_date status progress.overall_percentage payment_plan",
          )
          .lean();

        const actualEnrolledCount = enrollments.length;

        // Update the batch document if the count is different
        if (actualEnrolledCount !== batch.enrolled_students) {
          await Batch.findByIdAndUpdate(batch._id, {
            enrolled_students: actualEnrolledCount,
          });
        }

        // Prepare batch data
        const batchWithStudents = {
          ...batch,
          enrolled_students: actualEnrolledCount,
        };

        // Include student details if requested
        if (include_students === "true") {
          batchWithStudents.enrolled_students_details = enrollments.map(
            (enrollment) => ({
              student: enrollment.student,
              enrollment_date: enrollment.enrollment_date,
              enrollment_status: enrollment.status,
              progress: enrollment.progress?.overall_percentage || 0,
              payment_plan: enrollment.payment_plan,
            }),
          );
        }

        return batchWithStudents;
      }),
    );

    // Get total count for pagination
    const totalBatches = await Batch.countDocuments(filter);
    const totalPages = Math.ceil(totalBatches / limit);

    // Calculate summary statistics
    const totalEnrolledStudents = batchesWithStudentInfo.reduce(
      (sum, batch) => sum + batch.enrolled_students,
      0,
    );
    const activeBatches = batchesWithStudentInfo.filter(
      (batch) => batch.status === "active",
    ).length;
    const upcomingBatches = batchesWithStudentInfo.filter(
      (batch) => batch.status === "Upcoming",
    ).length;

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
        completed_batches: batchesWithStudentInfo.filter(
          (b) => b.status === "Completed",
        ).length,
        cancelled_batches: batchesWithStudentInfo.filter(
          (b) => b.status === "Cancelled",
        ).length,
      },
      filters_applied: {
        status: status || "all",
        batch_type: batch_type || "all",
        search: search || null,
        include_students: include_students === "true",
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
      .select("+instructor_details") // Include instructor_details field
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
      status: "active",
    });

    // Update the batch document if the count is different
    if (actualEnrolledCount !== batch.enrolled_students) {
      await Batch.findByIdAndUpdate(batchId, {
        enrolled_students: actualEnrolledCount,
      });
    }

    // Return batch with correct enrolled students count
    const batchWithCorrectCount = {
      ...batch,
      enrolled_students: actualEnrolledCount,
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
      const validBatchTypes = ["group", "individual"];
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
    Object.keys(updateData).forEach((key) => {
      if (key !== "course" && key !== "batch_code") {
        // Prevent changing course reference or batch code
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
    const { page = 1, limit = 20, status = "active", search } = req.query;

    // Verify batch exists
    const batch = await Batch.findById(batchId).populate(
      "course",
      "course_title",
    );
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    const skip = (page - 1) * limit;

    // Build filter for enrollments
    const filter = {
      batch: batchId,
    };

    if (status && status !== "all") {
      filter.status = status;
    }

    // Get enrollments with populated student details
    let enrollmentsQuery = Enrollment.find(filter)
      .populate(
        "student",
        "full_name email phone_numbers user_image status created_at",
      )
      .populate("course", "course_title")
      .select(
        "student enrollment_date status progress.overall_percentage total_amount_paid payment_plan access_expiry_date",
      )
      .sort({ enrollment_date: -1 });

    // Apply search filter if provided
    if (search) {
      enrollmentsQuery = enrollmentsQuery.where({
        $or: [
          { "student.full_name": { $regex: search, $options: "i" } },
          { "student.email": { $regex: search, $options: "i" } },
        ],
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
    const students = enrollments.map((enrollment) => ({
      enrollmentId: enrollment._id,
      student: enrollment.student,
      enrollmentDate: enrollment.enrollment_date,
      status: enrollment.status,
      progress: enrollment.progress?.overall_percentage || 0,
      totalPaid: enrollment.total_amount_paid,
      paymentPlan: enrollment.payment_plan,
      accessExpiryDate: enrollment.access_expiry_date,
    }));

    res.status(200).json({
      success: true,
      batch: {
        id: batch._id,
        name: batch.batch_name,
        course: batch.course.course_title,
        capacity: batch.capacity,
        enrolled: batch.enrolled_students,
      },
      students: {
        count: students.length,
        totalStudents,
        totalPages,
        currentPage: parseInt(page),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        data: students,
      },
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
    const batch = await Batch.findById(batchId).populate("course");
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Check batch type and capacity constraints
    if (batch.batch_type === "individual") {
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
      status: { $ne: "cancelled" },
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: "Student is already enrolled in this batch",
      });
    }

    // Get course pricing for the enrollment
    const coursePricing = batch.course.prices?.[0] || {
      batch: 0,
      currency: "INR",
    };
    const enrollmentEndDate = new Date(batch.end_date);
    enrollmentEndDate.setDate(enrollmentEndDate.getDate() + 30); // 30 days after batch ends

    // Create enrollment
    const enrollmentData = {
      student: studentId,
      course: batch.course._id,
      batch: batchId,
      enrollment_type:
        batch.batch_type === "individual" ? "individual" : "batch",
      payment_plan: paymentPlan,
      enrollment_date: new Date(),
      access_expiry_date: enrollmentEndDate,
      status: "active",
      pricing_snapshot: {
        original_price: coursePricing.batch || 0,
        final_price: coursePricing.batch || 0,
        currency: coursePricing.currency || "INR",
        pricing_type:
          batch.batch_type === "individual" ? "individual" : "batch",
      },
      progress: {
        overall_percentage: 0,
        completed_lessons: 0,
        total_lessons: batch.course.total_lessons || 0,
      },
      created_by: req.user.id,
      notes: notes,
    };

    const enrollment = new Enrollment(enrollmentData);
    await enrollment.save();

    // Update batch enrolled count
    batch.enrolled_students += 1;
    await batch.save();

    // Create S3 folder for the student within the batch
    try {
      const studentName = student.full_name || student.first_name + ' ' + student.last_name || 'Unknown Student';
      const s3FolderResult = await createStudentS3Folder(
        batchId,
        studentId,
        studentName
      );
      
      if (s3FolderResult.success) {
        logger.info(`✅ S3 folder created for student: ${studentName} in batch: ${batch.batch_name}`);
        logger.info(`   - S3 Path: ${s3FolderResult.s3Path}`);
      } else {
        logger.warn(`⚠️ Failed to create S3 folder for student: ${studentName}`, s3FolderResult.error);
      }
    } catch (s3Error) {
      logger.error(`❌ Error creating S3 folder for student: ${studentId}`, s3Error);
      // Don't fail enrollment if S3 folder creation fails
    }

    // Populate the enrollment for response
    await enrollment.populate("student", "full_name email user_image");

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
          capacity: batch.capacity,
        },
      },
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
      status: { $ne: "cancelled" },
    }).populate("student", "full_name email");

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Student enrollment not found in this batch",
      });
    }

    // Update enrollment status to cancelled
    enrollment.status = "cancelled";
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
        cancelledDate: enrollment.cancelled_date,
      },
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
      status: "active",
    }).populate("student", "full_name email");

    if (!sourceEnrollment) {
      return res.status(404).json({
        success: false,
        message: "Student enrollment not found in source batch",
      });
    }

    // Verify target batch exists and has capacity
    const targetBatch = await Batch.findById(targetBatchId).populate("course");
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
      status: { $ne: "cancelled" },
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
        transferred_by: req.user.id,
      },
    };

    const newEnrollment = new Enrollment(newEnrollmentData);
    await newEnrollment.save();

    // Cancel old enrollment
    sourceEnrollment.status = "transferred";
    sourceEnrollment.transfer_info = {
      to_batch: targetBatchId,
      transfer_date: new Date(),
      transfer_reason: reason,
      transferred_by: req.user.id,
    };
    await sourceEnrollment.save();

    // Update batch counts
    const sourceBatch = await Batch.findById(batchId);
    if (sourceBatch) {
      sourceBatch.enrolled_students = Math.max(
        0,
        sourceBatch.enrolled_students - 1,
      );
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
            batchName: sourceBatch?.batch_name,
          },
          to: {
            batchId: targetBatchId,
            batchName: targetBatch.batch_name,
          },
          transferDate: new Date(),
          reason: reason,
        },
        newEnrollmentId: newEnrollment._id,
      },
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
      batch: batchId,
    }).populate("student", "full_name email");

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
    if (
      (oldStatus === "active" && status !== "active") ||
      (oldStatus !== "active" && status === "active")
    ) {
      const batch = await Batch.findById(batchId);
      if (batch) {
        const activeEnrollments = await Enrollment.countDocuments({
          batch: batchId,
          status: "active",
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
        updatedAt: enrollment.status_updated_at,
      },
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
        errors: errors.array(),
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
        message: "Batch not found",
      });
    }

    // Store previous status for audit
    const previousStatus = batch.status;

    // Validate status transition
    const validTransitions = {
      Upcoming: ["Active", "Cancelled"],
      Active: ["Completed", "Cancelled"],
      Completed: [], // Cannot change from completed
      Cancelled: ["Upcoming", "Active"], // Can reactivate if needed
    };

    if (!validTransitions[previousStatus]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from "${previousStatus}" to "${status}". Valid transitions: ${validTransitions[previousStatus]?.join(", ") || "None"}`,
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
            reason:
              reason || `Status changed from ${previousStatus} to ${status}`,
          },
        },
        updated_by: adminId,
        updated_at: new Date(),
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("course", "course_title course_image slug")
      .populate("assigned_instructor", "full_name email phone_numbers");

    // If batch is being activated, validate that it has required data
    if (status === "Active") {
      if (!updatedBatch.assigned_instructor) {
        return res.status(400).json({
          success: false,
          message: "Cannot activate batch without an assigned instructor",
        });
      }

      if (!updatedBatch.schedule || updatedBatch.schedule.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot activate batch without a schedule",
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
          reason:
            reason || `Status changed from ${previousStatus} to ${status}`,
        },
      },
    });
  } catch (error) {
    console.error("Error updating batch status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating batch status",
      error: error.message,
    });
  }
};

// Add a new controller function to get batches by course category
export const getBatchesByCategory = async (req, res) => {
  try {
    const { courseCategory } = req.params;
    // Find course IDs matching the provided category
    const courses = await Course.find({
      course_category: courseCategory,
    }).select("_id");
    const courseIds = courses.map((c) => c._id);
    // Fetch batches for those courses
    const batches = await Batch.find({ course: { $in: courseIds } })
      .populate("assigned_instructor", "full_name email phone_numbers")
      .populate(
        "course",
        "course_title course_image slug course_type course_category",
      );
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
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });
    }

    // Find the scheduled session sub-document
    const session = batch.schedule.id(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Scheduled session not found" });
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
    res.status(500).json({
      success: false,
      message: "Server error while adding recorded lesson",
      error: error.message,
    });
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
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });
    }

    // Find the scheduled session sub-document
    const session = batch.schedule.id(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Scheduled session not found" });
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
        if (url.includes("medh-filess.s3.") && url.includes(".amazonaws.com")) {
          const s3UrlParts = url.split(".amazonaws.com/");
          if (s3UrlParts.length === 2) {
            const objectKey = s3UrlParts[1];
            const cloudFrontUrl = `https://cdn.medh.co/${objectKey}`;
            signedUrl = generateSignedUrl(cloudFrontUrl);
          }
        }
        // Sign existing CloudFront URLs
        else if (url.includes("cdn.medh.co")) {
          signedUrl = generateSignedUrl(url);
        }

        // Add signed URL to the response data
        if (signedUrl) {
          recordedLessonData.signedUrl = signedUrl;
        }
      } catch (signError) {
        console.error(
          "Error generating signed URL for recorded lesson:",
          signError,
        );
        // Don't fail the operation, just log the error
      }
    }

    // Add the recorded lesson to the session
    session.recorded_lessons.push(recordedLessonData);
    await batch.save();

    // Get the newly added lesson
    const newLesson =
      session.recorded_lessons[session.recorded_lessons.length - 1];

    res.status(201).json({
      success: true,
      message: "Recorded lesson added successfully",
      data: {
        lesson: newLesson,
        batch: {
          id: batch._id,
          name: batch.batch_name,
          type: batch.batch_type,
        },
        session: {
          id: session._id,
          date: session.date,
          day: session.day,
          start_time: session.start_time,
          end_time: session.end_time,
        },
      },
    });
  } catch (error) {
    console.error("Error adding recorded lesson to batch:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while adding recorded lesson",
      error: error.message,
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
        message: "base64String is required",
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
        title: title || "Recorded Lesson",
        uploadStatus: "in_progress",
      },
    });

    // Continue with upload in background
    processUploadInBackground(
      batchId,
      sessionId,
      base64String,
      title,
      recorded_date,
      req.user.id,
    );
  } catch (error) {
    console.error("Error starting upload:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Server error while starting upload",
        error: error.message,
      });
    }
  }
};

// Background upload processing function
const processUploadInBackground = async (
  batchId,
  sessionId,
  base64String,
  title,
  recorded_date,
  userId,
) => {
  try {
    // Import required modules
    const { Batch } = await import("../models/course-model.js");
    const Enrollment = (await import("../models/enrollment-model.js")).default;
    const { uploadBase64FileOptimized, uploadBase64FileChunked } = await import(
      "../utils/uploadFile.js"
    );
    const { ENV_VARS } = await import("../config/envVars.js");

    console.log(
      `[Background Upload] Starting upload for batch ${batchId}, session ${sessionId}`,
    );

    // Find the batch and determine upload path
    const batch = await Batch.findById(batchId)
      .populate("course", "course_title")
      .lean();

    if (!batch) {
      console.error(`[Background Upload] Batch ${batchId} not found`);
      return;
    }

    // Determine upload directory based on batch type
    // Determine upload directory based on batch type
    let uploadFolder;
    if (batch.batch_type === "individual") {
      // For individual batch, find the enrolled student
      const enrollment = await Enrollment.findOne({
        batch: batchId,
        status: "active",
      }).select("student");

      if (!enrollment) {
        console.error(
          `[Background Upload] No active student found for individual batch ${batchId}`,
        );
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
      console.error(
        `[Background Upload] File too large: ${estimatedSize} bytes`,
      );
      return;
    }

    console.log(
      `[Background Upload] Uploading ${(estimatedSize / 1024 / 1024).toFixed(2)}MB to ${uploadFolder}`,
    );

    // Choose processing method based on file size
    const CHUNKED_THRESHOLD = 25 * 1024 * 1024; // 25MB threshold

    let uploadResult;
    if (estimatedSize > CHUNKED_THRESHOLD) {
      uploadResult = await uploadBase64FileChunked(
        base64Data,
        mimeType,
        uploadFolder,
      );
    } else {
      uploadResult = await uploadBase64FileOptimized(
        base64Data,
        mimeType,
        uploadFolder,
      );
    }

    console.log(
      `[Background Upload] Upload completed: ${uploadResult.data.url}`,
    );

    // Add the recorded lesson to the batch session
    const batchDoc = await Batch.findById(batchId);
    const session = batchDoc.schedule.id(sessionId);

    if (!session) {
      console.error(
        `[Background Upload] Session ${sessionId} not found in batch ${batchId}`,
      );
      return;
    }

    // Add the recorded lesson
    session.recorded_lessons.push({
      title: title || "Recorded Lesson",
      url: uploadResult.data.url,
      recorded_date: recorded_date || new Date(),
      created_by: userId,
    });

    await batchDoc.save();

    console.log(
      `[Background Upload] Successfully added recorded lesson to batch ${batchId}, session ${sessionId}`,
    );
  } catch (error) {
    console.error(
      `[Background Upload] Error processing upload for batch ${batchId}:`,
      error,
    );
  }
};

// Controller to get recorded lessons for a scheduled session
export const getRecordedLessonsForSession = async (req, res) => {
  try {
    const { batchId, sessionId } = req.params;
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });
    }
    const session = batch.schedule.id(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Scheduled session not found" });
    }
    const lessons = session.recorded_lessons || [];
    res.status(200).json({ success: true, data: lessons });
  } catch (error) {
    console.error("Error fetching recorded lessons:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching recorded lessons",
      error: error.message,
    });
  }
};

// Controller to get recorded lessons for a student across all sessions
export const getRecordedLessonsForStudent = async (req, res) => {
  try {
    const { studentId, batchId } = req.params;
    
    // Check if this is a batch-specific request
    const isSpecificBatch = !!batchId;
    console.log(`🎯 Request for ${isSpecificBatch ? 'specific batch' : 'all batches'}:`, { studentId, batchId });

    // Authorization: students can only access their own recorded lessons
    if (req.user && req.user.role === "student" && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access other student's recorded lessons",
      });
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // Import required AWS modules dynamically
    const { s3Client } = await import("../config/aws-config.js");
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    const { ENV_VARS } = await import("../config/envVars.js");
    const { generateSignedUrl } = await import("../utils/cloudfrontSigner.js");

    let s3VideosData = [];
    let databaseVideosData = [];
    let s3Available = true;

    // Step 1: Try to get videos from S3 (Your Previous Sessions)
    try {
      // Define video file extensions
      const videoExtensions = [
        ".mp4",
        ".avi",
        ".mov",
        ".wmv",
        ".flv",
        ".webm",
        ".mkv",
        ".m4v",
      ];

      // Try multiple search patterns to find videos for the student
      const searchPatterns = [
        `videos/student/${studentId}/`, // Standard pattern
        `videos/${studentId}/`, // Alternative pattern
        `videos/`, // Broad search to find all videos
      ];

      let allFoundObjects = [];
      let searchResults = {};

      for (const prefix of searchPatterns) {
        const listParams = {
          Bucket: ENV_VARS.UPLOAD_CONSTANTS.BUCKET_NAME,
          Prefix: prefix,
          MaxKeys: 1000,
        };

        const listCommand = new ListObjectsV2Command(listParams);
        const listResponse = await s3Client.send(listCommand);

        searchResults[prefix] = {
          keyCount: listResponse.KeyCount || 0,
          totalObjects: listResponse.Contents?.length || 0,
          isTruncated: listResponse.IsTruncated,
        };

        if (listResponse.Contents && listResponse.Contents.length > 0) {
          // Filter for video files and relevant paths
          const relevantObjects = listResponse.Contents.filter((obj) => {
            // Skip directories
            if (obj.Key.endsWith("/")) return false;

            // Check if it's a video file
            const fileName = obj.Key.split("/").pop();
            const fileExtension = fileName
              .toLowerCase()
              .substring(fileName.lastIndexOf("."));
            if (!videoExtensions.includes(fileExtension)) return false;

            // For broad search, only include objects that might be related to this student
            if (prefix === "videos/") {
              // Check if the path contains the studentId or student name
              const keyLower = obj.Key.toLowerCase();
              const studentName = student.full_name?.toLowerCase() || "";
              const studentEmail = student.email?.toLowerCase() || "";

              return (
                keyLower.includes(studentId.toLowerCase()) ||
                (studentName && keyLower.includes(studentName.split(" ")[0])) ||
                (studentEmail && keyLower.includes(studentEmail.split("@")[0]))
              );
            }

            return true;
          });

          allFoundObjects = allFoundObjects.concat(relevantObjects);
        }
      }

      console.log(
        `S3 Search Results for student ${studentId} (${student.full_name}):`,
        searchResults,
      );

      // Remove duplicates based on Key
      const uniqueObjects = allFoundObjects.filter(
        (obj, index, self) =>
          index === self.findIndex((o) => o.Key === obj.Key),
      );

      console.log(
        `Found ${uniqueObjects.length} unique video files across all search patterns`,
      );

      // Log sample findings for debugging
      if (uniqueObjects.length > 0) {
        console.log(
          "Sample video files found:",
          uniqueObjects.slice(0, 10).map((obj) => ({
            key: obj.Key,
            size: `${(obj.Size / 1024 / 1024).toFixed(2)}MB`,
            lastModified: obj.LastModified,
          })),
        );
      } else {
        console.log(
          "No video files found. Checking if any files exist in videos/ folder...",
        );
        // Do a very broad search to see what's actually in the videos folder
        const broadListParams = {
          Bucket: ENV_VARS.UPLOAD_CONSTANTS.BUCKET_NAME,
          Prefix: "videos/",
          MaxKeys: 100,
        };
        const broadListCommand = new ListObjectsV2Command(broadListParams);
        const broadListResponse = await s3Client.send(broadListCommand);

        if (broadListResponse.Contents) {
          console.log(
            "Files/folders found in videos/ directory:",
            broadListResponse.Contents.slice(0, 20).map((obj) => ({
              key: obj.Key,
              isDirectory: obj.Key.endsWith("/"),
              size: obj.Size,
            })),
          );
        }
      }

      if (uniqueObjects.length > 0) {
        // Helper function to parse GMT timestamp from filename
        const parseGMTTimestamp = (filename) => {
          const gmtMatch = filename.match(/GMT(\d{8})-(\d{6})/);
          if (!gmtMatch) return null;

          const dateStr = gmtMatch[1]; // YYYYMMDD
          const timeStr = gmtMatch[2]; // HHMMSS

          // Parse date and time
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
          const day = parseInt(dateStr.substring(6, 8));
          const hour = parseInt(timeStr.substring(0, 2));
          const minute = parseInt(timeStr.substring(2, 4));
          const second = parseInt(timeStr.substring(4, 6));

          const date = new Date(year, month, day, hour, minute, second);

          return {
            date,
            formattedDate: date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            formattedTime: date.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }),
            description: `Session recording from ${date.toLocaleDateString(
              "en-US",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              },
            )}`,
          };
        };

        // Process each video file found
        for (const object of uniqueObjects) {
          // Extract folder structure for better organization
          const keyParts = object.Key.split("/");
          const fileName = keyParts[keyParts.length - 1];

          // Extract session number from filename if present (e.g., "Session_14")
          const sessionNumberMatch = fileName.match(/Session_(\d+)/i);
          const extractedSessionNumber = sessionNumberMatch
            ? parseInt(sessionNumberMatch[1], 10)
            : null;

          // Extract file info
          const fileUrl = `https://${ENV_VARS.UPLOAD_CONSTANTS.BUCKET_NAME}.s3.${ENV_VARS.AWS_REGION}.amazonaws.com/${object.Key}`;

          // Generate signed URL for the video
          let signedUrl = fileUrl;
          try {
            // Convert S3 URL to CloudFront URL and sign it
            const cloudFrontUrl = `https://cdn.medh.co/${object.Key}`;
            signedUrl = generateSignedUrl(cloudFrontUrl);
          } catch (signError) {
            console.error("Error generating signed URL:", signError);
            // Fallback to original URL if signing fails
          }

          // Parse GMT timestamp and create session info
          const timestampInfo = parseGMTTimestamp(fileName);

          s3VideosData.push({
            id: object.Key.replace(/[^a-zA-Z0-9]/g, "_"), // Create a unique ID from the key
            title: fileName,
            // Temporarily set displayTitle and session number based on extracted info
            displayTitle: extractedSessionNumber
              ? `Session ${extractedSessionNumber}`
              : timestampInfo
                ? `Session on ${timestampInfo.formattedDate}`
                : fileName,
            fullPath: object.Key,
            url: signedUrl,
            originalUrl: fileUrl,
            fileSize: object.Size,
            lastModified: object.LastModified,
            // Session metadata
            session: timestampInfo
              ? {
                  number: extractedSessionNumber, // Store the extracted number
                  date: timestampInfo.date,
                  formattedDate: timestampInfo.formattedDate,
                  formattedTime: timestampInfo.formattedTime,
                  description: timestampInfo.description,
                  duration: "90 min", // Default duration
                  status: "Available",
                  level: "Intermediate",
                  rating: 0, // Placeholder, will be updated with actual average rating
                }
              : null,
            source: "your_previous_sessions",
            student: {
              id: studentId,
              name: student.full_name,
            },
          });
        }

        // Fetch average ratings for all collected S3 videos
        if (s3VideosData.length > 0) {
          const sessionIds = s3VideosData.map((video) => video.id);
          const ratings = await SessionRating.aggregate([
            { $match: { session_id: { $in: sessionIds } } },
            {
              $group: {
                _id: "$session_id",
                averageRating: { $avg: "$rating" },
              },
            },
          ]);

          const ratingMap = new Map();
          ratings.forEach((r) => {
            ratingMap.set(r._id, parseFloat(r.averageRating.toFixed(1)));
          });

          s3VideosData.forEach((video) => {
            if (video.session) {
              video.session.rating = ratingMap.get(video.id) || 0; // Use fetched rating or default to 0
            }
          });
        }

        // Sort s3VideosData by session date in ascending order for numbering
        // If dates are the same, sort by extractedSessionNumber ascending
        s3VideosData.sort((a, b) => {
          const dateA = a.session?.date
            ? new Date(a.session.date).getTime()
            : 0;
          const dateB = b.session?.date
            ? new Date(b.session.date).getTime()
            : 0;

          if (dateA !== dateB) {
            return dateA - dateB; // Oldest first for numbering
          }

          // If dates are the same, sort by extracted session number ascending
          const numA = a.session?.number || Infinity;
          const numB = b.session?.number || Infinity;
          return numA - numB;
        });

        // Assign sequential displayTitle and session numbers based on this ascending sort
        s3VideosData.forEach((video, index) => {
          video.displayTitle = `Session ${index + 1}`;
          if (video.session) {
            video.session.number = index + 1;
          }
        });

        // Now, sort s3VideosData by date in descending order for final display
        s3VideosData.sort((a, b) => {
          const dateA = a.session?.date
            ? new Date(a.session.date).getTime()
            : 0;
          const dateB = b.session?.date
            ? new Date(b.session.date).getTime()
            : 0;
          return dateB - dateA; // Newest first for display
        });
      }

      console.log(
        `Found ${s3VideosData.length} video files for student ${studentId} in S3`,
      );
    } catch (s3Error) {
      console.error("Error listing S3 objects for student:", s3Error);
      s3Available = false;
    }

    // Step 2: Always get videos from database (Scheduled Sessions)
    try {
      // Find active enrollments for the student
      const enrollments = await Enrollment.find({
        student: studentId,
        status: "active",
      })
        .populate({ path: "batch", select: "batch_name schedule" })
        .lean();

      // Iterate through enrollments and collect recorded lessons from batch schedules
      for (const enrollment of enrollments) {
        const batch = enrollment.batch;
        if (!batch || !batch.schedule) continue;

        for (const session of batch.schedule) {
          if (session.recorded_lessons && session.recorded_lessons.length) {
            // Generate signed URLs for video lessons stored on CloudFront or S3
            const recordedLessonsWithSignedUrls = session.recorded_lessons.map(
              (lesson) => {
                if (lesson.url) {
                  // Convert S3 URLs to CloudFront URLs and sign them (only for medh-filess bucket)
                  if (
                    lesson.url.includes("medh-filess.s3.") &&
                    lesson.url.includes(".amazonaws.com")
                  ) {
                    try {
                      // Extract the object key from S3 URL
                      const s3UrlParts = lesson.url.split(".amazonaws.com/");
                      if (s3UrlParts.length === 2) {
                        const objectKey = s3UrlParts[1];
                        const cloudFrontUrl = `https://cdn.medh.co/${objectKey}`;
                        const signedUrl = generateSignedUrl(cloudFrontUrl);
                        return {
                          ...lesson,
                          url: signedUrl, // Replace S3 URL with signed CloudFront URL
                        };
                      }
                    } catch (signError) {
                      console.error(
                        "Error converting S3 URL to signed CloudFront URL:",
                        signError,
                      );
                      return lesson; // Return original lesson if signing fails
                    }
                  }
                  // Sign existing CloudFront URLs
                  else if (lesson.url.includes("cdn.medh.co")) {
                    try {
                      const signedUrl = generateSignedUrl(lesson.url);
                      return {
                        ...lesson,
                        url: signedUrl, // Replace original URL with signed URL
                      };
                    } catch (signError) {
                      console.error(
                        "Error signing CloudFront URL for recorded lesson:",
                        signError,
                      );
                      return lesson; // Return original lesson if signing fails
                    }
                  }
                }

                return lesson; // Return original lesson for non-S3/non-CloudFront URLs (like YouTube)
              },
            );

            databaseVideosData.push({
              batch: {
                id: batch._id,
                name: batch.batch_name,
              },
              session: {
                id: session._id,
                day: session.day,
                start_time: session.start_time,
                end_time: session.end_time,
              },
              recorded_lessons: recordedLessonsWithSignedUrls,
              source: "scheduled_sessions",
            });
          }
        }
      }

      console.log(
        `Found ${databaseVideosData.length} scheduled sessions with videos for student ${studentId}`,
      );
    } catch (dbError) {
      console.error("Error fetching scheduled sessions for student:", dbError);
    }

    // Step 3: Prepare organized response
    const totalVideosCount =
      s3VideosData.length +
      databaseVideosData.reduce((total, session) => {
        return (
          total +
          (session.recorded_lessons ? session.recorded_lessons.length : 0)
        );
      }, 0);

    // Get ALL LiveSession data - batch info, instructor info, session details
    let batchDataMap = {};
    let liveSessions = [];
    let allLiveSessionsByBatch = {};
    
    try {
      // Get ALL LiveSessions with populated batch and instructor data
      liveSessions = await LiveSession.find({
        batchId: { $exists: true, $ne: null },
        instructorId: { $exists: true, $ne: null }
      })
        .populate({
          path: 'batchId',
          select: 'batch_name batch_code _id'
        })
        .populate({
          path: 'instructorId', 
          select: 'full_name email username _id'
        })
        .select('sessionTitle sessionNo sessionNumber sessionDate sessionStartTime sessionEndTime sessionDuration sessionDescription sessionDay batchId instructorId students summary remarks _id')
        .lean();
      
      console.log('📚 LiveSessions with populated data found:', liveSessions.length);
      console.log('📚 Sample LiveSession:', JSON.stringify(liveSessions[0], null, 2));
      
      console.log('📚 Total LiveSessions found:', liveSessions.length);
      console.log('📚 Sample LiveSession data:', JSON.stringify(liveSessions.slice(0, 2), null, 2));
      
      // Create batch data mapping from populated LiveSessions
      liveSessions.forEach(session => {
        console.log('📚 Processing LiveSession:', {
          sessionTitle: session.sessionTitle,
          batchId: session.batchId,
          instructorId: session.instructorId
        });
        
        if (session.batchId && session.batchId._id) {
          const batchId = session.batchId._id.toString();
          
          // Store batch info from populated data
          if (!batchDataMap[batchId]) {
            batchDataMap[batchId] = {
              batch_name: session.batchId.batch_name || `Batch ${batchId.substring(0, 8)}...`,
              batch_code: session.batchId.batch_code || '',
              instructor: session.instructorId ? {
                full_name: session.instructorId.full_name || session.instructorId.username || 'Instructor',
                email: session.instructorId.email || ''
              } : { full_name: 'Instructor', email: '' }
            };
            console.log('📚 Created batch mapping for:', batchId, batchDataMap[batchId]);
          }
          
          // Group LiveSessions by batch for easy lookup
          if (!allLiveSessionsByBatch[batchId]) {
            allLiveSessionsByBatch[batchId] = [];
          }
          allLiveSessionsByBatch[batchId].push(session);
        }
      });
      
      console.log('📚 Batch data from LiveSession:', Object.keys(batchDataMap));
      console.log('📚 LiveSessions grouped by batch:', Object.keys(allLiveSessionsByBatch));
      console.log('📚 Sample batchDataMap:', Object.values(batchDataMap)[0]);
    } catch (error) {
      console.error('Error fetching LiveSession batch data:', error);
    }

    // Create a mapping of S3 videos to LiveSession data
    const s3VideoToSessionMap = {};
    
    // Map ALL LiveSessions by their batch and session number for easy lookup
    Object.values(allLiveSessionsByBatch).flat().forEach(session => {
      if (session.batchId && session.batchId._id) {
        const batchId = session.batchId._id.toString();
        // Extract session number from sessionNo field (e.g., "1-1755808700153" -> 1)
        let sessionNumber = 1;
        if (session.sessionNo) {
          const sessionNoMatch = session.sessionNo.match(/^(\d+)/);
          if (sessionNoMatch) {
            sessionNumber = parseInt(sessionNoMatch[1]);
          }
        }
        const sessionKey = `${batchId}_${sessionNumber}`;
        s3VideoToSessionMap[sessionKey] = session;
        
        console.log(`🗺️ Mapped LiveSession: ${sessionKey} -> ${session._id} (${session.sessionTitle})`);
        console.log(`   📋 Session Details:`, {
          id: session._id,
          title: session.sessionTitle,
          sessionNo: session.sessionNo,
          batchId: batchId,
          sessionNumber: sessionNumber,
          hasSummary: !!session.summary,
          hasRemarks: !!session.remarks
        });
      }
    });

    // Organize S3 videos by batch for batch_sessions
    const batchGroups = {};
    const sessionGroups = {}; // Group videos by batch and session
    
    s3VideosData.forEach(video => {
      // Extract batch ID from S3 path
      let batchId = 'personal';
      let batchName = 'Personal Sessions';
      let instructorInfo = { full_name: 'Instructor', email: '' };
      
      if (video.fullPath && video.fullPath.includes('/')) {
        const pathParts = video.fullPath.split('/');
        if (pathParts.length >= 2 && pathParts[0] === 'videos') {
          // Check if it's batch structure: videos/{batchId}/{studentId}/...
          if (pathParts.length >= 3 && pathParts[1].length === 24) { // MongoDB ObjectId length
            batchId = pathParts[1];
            
                    // Use real batch data from LiveSession if available
        if (batchDataMap[batchId]) {
          batchName = batchDataMap[batchId].batch_name;
          instructorInfo = batchDataMap[batchId].instructor;
          console.log(`📚 Using exact batch data for ${batchId}:`, batchDataMap[batchId]);
        } else {
          // No fallback - only use data if exact match exists
          batchName = `Batch ${batchId.substring(0, 8)}...`;
          instructorInfo = { full_name: 'Instructor', email: '' };
          console.log(`📚 No LiveSession data found for batch ${batchId}, using generic name`);
        }
          }
        }
      }
      
      if (!batchGroups[batchId]) {
        batchGroups[batchId] = {
          batch_id: batchId,
          batch_name: batchName,
          instructor: instructorInfo,
          sessions: [],
          total_videos: 0,
          description: `Recorded sessions from ${batchName}`,
          source: "s3_upload"
        };
      }
      
      // Create session structure using extracted session number from S3 path
      let sessionNumber = 1; // Default fallback
      
      // Extract session number from S3 path
      if (video.fullPath) {
        // Pattern 1: session-{number} or session_{number}
        const sessionMatch = video.fullPath.match(/session[-_](\d+)/i);
        if (sessionMatch) {
          sessionNumber = parseInt(sessionMatch[1]);
        }
        
        // Pattern 2: Session {number} in folder name
        const sessionFolderMatch = video.fullPath.match(/Session\s+(\d+)/i);
        if (sessionFolderMatch) {
          sessionNumber = parseInt(sessionFolderMatch[1]);
        }
      }
      
      const sessionKey = `${batchId}_${sessionNumber}`;
      const liveSessionData = s3VideoToSessionMap[sessionKey];
      
      console.log(`🔍 Looking for session: ${sessionKey}`);
      console.log(`📋 LiveSession found:`, liveSessionData ? `✅ ${liveSessionData._id} (${liveSessionData.sessionTitle})` : '❌ Not found');
      console.log(`🗂️ Available session keys:`, Object.keys(s3VideoToSessionMap));
      console.log(`📹 S3 Video Details:`, {
        videoId: video.id,
        videoTitle: video.title,
        fullPath: video.fullPath,
        extractedBatchId: batchId,
        extractedSessionNumber: sessionNumber
      });
      
      if (liveSessionData) {
        console.log(`✅ MATCH FOUND! LiveSession data:`, {
          id: liveSessionData._id,
          title: liveSessionData.sessionTitle,
          summary: liveSessionData.summary?.title,
          remarks: liveSessionData.remarks
        });
      }
      
      // Calculate duration - prioritize LiveSession duration, then estimate from video metadata
      let calculatedDuration = null;
      
      console.log(`🕐 Duration calculation for video ${video.id}:`, {
        hasLiveSessionData: !!liveSessionData,
        sessionDuration: liveSessionData?.sessionDuration,
        videoFileSize: video.fileSize,
        videoTitle: video.title
      });
      
      if (liveSessionData?.sessionDuration) {
        calculatedDuration = liveSessionData.sessionDuration;
        console.log(`✅ Using LiveSession duration: ${calculatedDuration}`);
      } else if (liveSessionData?.video?.size) {
        // Use LiveSession video size if available
        const estimatedMinutes = Math.round(liveSessionData.video.size / (1024 * 1024 * 1.5)); 
        calculatedDuration = estimatedMinutes > 0 ? `${estimatedMinutes} min` : '1 min';
        console.log(`📊 Using LiveSession video size: ${calculatedDuration} (${liveSessionData.video.size} bytes)`);
      } else if (video.fileSize) {
        // Estimate from S3 video file size: 1MB ≈ 0.7 minutes for typical compressed video
        const fileSizeMB = video.fileSize / (1024 * 1024);
        let estimatedMinutes;
        
        if (fileSizeMB > 100) {
          // Large files: assume higher quality, longer duration
          estimatedMinutes = Math.round(fileSizeMB * 0.5); // 100MB ≈ 50 min
        } else if (fileSizeMB > 10) {
          // Medium files: standard compression
          estimatedMinutes = Math.round(fileSizeMB * 0.7); // 10MB ≈ 7 min
        } else {
          // Small files: assume short clips
          estimatedMinutes = Math.round(fileSizeMB * 1); // 1MB ≈ 1 min
        }
        
        calculatedDuration = estimatedMinutes > 0 ? `${estimatedMinutes} min` : '1 min';
        console.log(`📊 Using S3 file size estimation: ${calculatedDuration} (${fileSizeMB.toFixed(1)} MB)`);
      } else {
        calculatedDuration = '30 min'; // More realistic default
        console.log(`⚠️ Using default duration: ${calculatedDuration}`);
      }

      // Use existing sessionKey for grouping (already declared above)
      
      // Create video data with unique titles for multiple videos in same session
      const existingVideosInSession = sessionGroups[sessionKey]?.recorded_lessons?.length || 0;
      let videoTitle = liveSessionData?.sessionTitle || `Session ${sessionNumber}`;
      
      // If there are multiple videos in the same session, add part number
      if (existingVideosInSession > 0) {
        videoTitle = `${videoTitle} - Part ${existingVideosInSession + 1}`;
      }
      
      const videoData = {
        _id: video.id,
        title: videoTitle,
        video_name: video.title,
        video_url: video.url,
        url: video.url,
        recorded_date: video.lastModified,
        fileSize: video.fileSize,
        view_count: 0,
        student_name: student.full_name || student.username || 'Student',
        source: "s3_bucket"
      };
      
      // Group videos by session
      if (!sessionGroups[sessionKey]) {
        sessionGroups[sessionKey] = {
          session_id: liveSessionData?._id?.toString() || null,
          session_number: sessionNumber,
          session_title: liveSessionData?.sessionTitle || `Session ${sessionNumber}`,
          session_day: liveSessionData?.sessionDay || null,
          session_date: liveSessionData?.sessionDate || video.lastModified,
          session_start_time: liveSessionData?.sessionStartTime || null,
          session_end_time: liveSessionData?.sessionEndTime || null,
          session_duration: calculatedDuration,
          session_description: liveSessionData?.sessionDescription || null,
          instructor: liveSessionData?.instructorId ? {
            full_name: liveSessionData.instructorId.full_name || instructorInfo.full_name,
            email: liveSessionData.instructorId.email || instructorInfo.email
          } : instructorInfo,
          recorded_lessons: [],
          videos_count: 0,
          source: "s3_upload",
          batchId: batchId
        };
      }
      
      // Add video to session
      sessionGroups[sessionKey].recorded_lessons.push(videoData);
      sessionGroups[sessionKey].videos_count++;
      
      batchGroups[batchId].total_videos++;
    });

    // Add grouped sessions to batch groups
    Object.values(sessionGroups).forEach(session => {
      const batchId = session.batchId;
      if (batchGroups[batchId]) {
        batchGroups[batchId].sessions.push(session);
      }
    });

    // Filter batches if specific batchId is requested
    let filteredBatches = Object.values(batchGroups);
    if (isSpecificBatch && batchId) {
      filteredBatches = filteredBatches.filter(batch => batch.batch_id === batchId);
      console.log(`🎯 Filtered to specific batch ${batchId}:`, filteredBatches.length, 'batches found');
    }

    const responseData = {
      personal_sessions: {
        count: isSpecificBatch ? 0 : s3VideosData.length, // Hide personal sessions for specific batch requests
        videos: isSpecificBatch ? [] : s3VideosData,
        description: "Personal Sessions • by " + student.full_name,
        type: "personal",
      },
      scheduled_sessions: {
        count: isSpecificBatch ? 0 : databaseVideosData.length, // Hide scheduled sessions for specific batch requests
        sessions: isSpecificBatch ? [] : databaseVideosData,
        description: "Videos from your scheduled batch sessions",
        type: "scheduled",
      },
      batch_sessions: {
        count: filteredBatches.length,
        batches: filteredBatches,
        total_videos: filteredBatches.reduce((total, batch) => {
          return total + (batch.total_videos || 0);
        }, 0),
        description: isSpecificBatch 
          ? `Videos from batch ${batchId}` 
          : "Videos organized by batches you are enrolled in",
        type: "batch_organized",
      },
    };

    // Determine the method used
    let method;
    if (s3Available && s3VideosData.length > 0) {
      method =
        databaseVideosData.length > 0
          ? "Combined (S3 + Database)"
          : "S3 Direct Listing";
    } else if (databaseVideosData.length > 0) {
      method = "Database Fallback";
    } else {
      method = s3Available ? "S3 Direct Listing" : "Database Fallback";
    }

    res.status(200).json({
      success: true,
      count: totalVideosCount,
      data: responseData,
      message: `Retrieved ${totalVideosCount} recorded videos for student`,
      method: method,
      s3_available: s3Available,
    });
  } catch (error) {
    console.error(
      "Error fetching recorded lessons for student:",
      error.message,
    );
    res.status(500).json({
      success: false,
      message: "Server error while fetching recorded lessons for student",
      error: error.message,
    });
  }
};

// Add controller to schedule a new class session for a batch
export const addScheduledSessionToBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const {
      date,
      start_time,
      end_time,
      title,
      description,
      create_zoom_meeting = true,
    } = req.body;

    console.log("Scheduling session for batch:", batchId);
    console.log("Session data:", {
      date,
      start_time,
      end_time,
      title,
      description,
      create_zoom_meeting,
    });

    // Find the batch
    const batch = await Batch.findById(batchId).populate(
      "course",
      "course_title",
    );
    if (!batch) {
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });
    }

    console.log("Batch found:", {
      id: batch._id,
      name: batch.batch_name,
      start_date: batch.start_date,
      end_date: batch.end_date,
    });

    // Check if batch has required date fields
    if (!batch.start_date || !batch.end_date) {
      return res.status(400).json({
        success: false,
        message:
          "Batch must have start_date and end_date set before scheduling sessions",
        batch_info: {
          has_start_date: !!batch.start_date,
          has_end_date: !!batch.end_date,
        },
      });
    }

    // Check if session date is within batch duration
    const sessionDate = new Date(date);
    const batchStartDate = new Date(batch.start_date);
    const batchEndDate = new Date(batch.end_date);

    // Compare dates without time components
    const sessionDay = new Date(
      sessionDate.getFullYear(),
      sessionDate.getMonth(),
      sessionDate.getDate(),
    );
    const batchStartDay = new Date(
      batchStartDate.getFullYear(),
      batchStartDate.getMonth(),
      batchStartDate.getDate(),
    );
    const batchEndDay = new Date(
      batchEndDate.getFullYear(),
      batchEndDate.getMonth(),
      batchEndDate.getDate(),
    );

    if (sessionDay < batchStartDay || sessionDay > batchEndDay) {
      return res.status(400).json({
        success: false,
        message: "Session date must be within batch start and end dates",
        batch_duration: {
          start_date: batch.start_date,
          end_date: batch.end_date,
          requested_date: date,
        },
      });
    }

    // Check for duplicate sessions on the same date and overlapping times
    const existingSession = batch.schedule.find((session) => {
      if (!session.date) return false; // Skip old day-based sessions

      const existingSessionDate = new Date(session.date);
      const isSameDate =
        existingSessionDate.toDateString() === sessionDate.toDateString();

      if (!isSameDate) return false;

      // Check for time overlap
      const newStart = start_time;
      const newEnd = end_time;
      const existingStart = session.start_time;
      const existingEnd = session.end_time;

      const newStartMins = newStart
        .split(":")
        .reduce((acc, time) => 60 * acc + +time);
      const newEndMins = newEnd
        .split(":")
        .reduce((acc, time) => 60 * acc + +time);
      const existingStartMins = existingStart
        .split(":")
        .reduce((acc, time) => 60 * acc + +time);
      const existingEndMins = existingEnd
        .split(":")
        .reduce((acc, time) => 60 * acc + +time);

      return newStartMins < existingEndMins && newEndMins > existingStartMins;
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: "A session already exists at this date and time",
        conflicting_session: {
          date: existingSession.date,
          start_time: existingSession.start_time,
          end_time: existingSession.end_time,
        },
      });
    }

    // Calculate session duration in minutes
    const [startHours, startMinutes] = start_time.split(":").map(Number);
    const [endHours, endMinutes] = end_time.split(":").map(Number);
    const durationMinutes =
      endHours * 60 + endMinutes - (startHours * 60 + startMinutes);

    // Create session start time for Zoom
    const sessionStartTime = new Date(sessionDate);
    sessionStartTime.setHours(startHours, startMinutes, 0, 0);

    // Add the new scheduled session with date instead of day
    const newSessionData = {
      date: date,
      start_time: start_time,
      end_time: end_time,
      title: title || `Session on ${sessionDate.toLocaleDateString()}`,
      description: description || "",
      recorded_lessons: [],
      zoom_meeting: {},
      created_by: req.user.id,
      created_at: new Date(),
    };

    // Create Zoom meeting if requested
    let zoomMeetingData = null;
    if (create_zoom_meeting) {
      try {
        console.log("🎥 Creating Zoom meeting for session...");
        /**
         * Zoom meeting settings:
         * - join_before_host: true (participants and AI can join before host)
         * - ai_companion_auto_start: true (AI Companion starts automatically)
         * - ai_companion_meeting_summary: true (enable meeting summary)
         * - ai_companion_meeting_questions: true (enable meeting Q&A)
         */
        // Prepare Zoom meeting data
        const zoomMeetingRequest = {
          topic: `${batch.course?.course_title || "Course"} - ${newSessionData.title}`,
          type: 2, // Scheduled meeting
          start_time: sessionStartTime.toISOString(),
          duration: Math.max(30, durationMinutes), // Minimum 30 minutes
          timezone: "Asia/Kolkata", // Default to IST
          agenda: description || `Session for ${batch.batch_name}`,
          settings: {
            host_video: true,
            participant_video: false,
            join_before_host: true,
            mute_upon_entry: true,
            waiting_room: false,
            meeting_authentication: false, // Allow students to join without Zoom accounts
            auto_recording: "cloud", // Enable cloud recording
            password: Math.random().toString(36).substring(2, 8).toUpperCase(), // Generate random password
            // AI Companion settings
            ai_companion_auto_start: true,
            ai_companion_meeting_summary: true,
            ai_companion_meeting_questions: true,
          },
        };

        // Create Zoom meeting
        zoomMeetingData = await zoomService.createMeeting(zoomMeetingRequest);

        console.log(
          "✅ Zoom meeting created successfully:",
          zoomMeetingData.id,
        );

        // Add Zoom meeting details to session
        newSessionData.zoom_meeting = {
          meeting_id: zoomMeetingData.id,
          join_url: zoomMeetingData.join_url,
          topic: zoomMeetingData.topic,
          password: zoomMeetingData.password,
          start_url: zoomMeetingData.start_url,
          recording_synced: false,
          sync_attempts: 0,
          last_sync_error: null,
          next_retry_at: null,
        };
      } catch (zoomError) {
        console.error("❌ Error creating Zoom meeting:", zoomError);

        // Continue without Zoom meeting if creation fails
        newSessionData.zoom_meeting = {
          meeting_id: null,
          join_url: null,
          topic: null,
          password: null,
          start_url: null,
          recording_synced: false,
          sync_attempts: 0,
          last_sync_error: `Failed to create Zoom meeting: ${zoomError.message}`,
          next_retry_at: null,
        };
      }
    }

    batch.schedule.push(newSessionData);
    await batch.save();

    const newSession = batch.schedule[batch.schedule.length - 1];

    // Prepare response
    const response = {
      success: true,
      message: "Session scheduled successfully",
      data: {
        session: newSession,
        zoom_meeting: zoomMeetingData
          ? {
              id: zoomMeetingData.id,
              join_url: zoomMeetingData.join_url,
              start_url: zoomMeetingData.start_url,
              password: zoomMeetingData.password,
              topic: zoomMeetingData.topic,
              start_time: zoomMeetingData.start_time,
              duration: zoomMeetingData.duration,
            }
          : null,
      },
    };

    // Add warning if Zoom meeting creation failed
    if (create_zoom_meeting && !zoomMeetingData) {
      response.warning =
        "Session scheduled but Zoom meeting creation failed. You can create it manually later.";
    }

    res.status(201).json(response);
  } catch (error) {
    console.error("Error scheduling session for batch:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while scheduling session",
      error: error.message,
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
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });
    }
    const session = batch.schedule.id(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Scheduled session not found" });
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
    res.status(500).json({
      success: false,
      message: "Server error while creating Zoom meeting",
      error: error.message,
    });
  }
};

// Add controller to get batches for a student by their ID
export const getBatchesForStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    // Authorization: students can only access their own batches
    if (req.user.role === "student" && req.user.id !== studentId) {
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
      .populate(
        "batch",
        "batch_name batch_code start_date end_date schedule status",
      )
      .populate("course", "course_title");
    // Transform enrollments to batch list
    const batches = enrollments
      .filter((e) => e.batch)
      .map((e) => ({
        batch: e.batch,
        course: e.course,
        enrollmentDate: e.enrollment_date,
        enrollmentStatus: e.status,
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
      .populate("assigned_instructor", "full_name email")
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
    const searchEndDate = new Date(
      now.getTime() + parseInt(days_ahead) * 24 * 60 * 60 * 1000,
    );
    const batchEndDate = batch.end_date ? new Date(batch.end_date) : null;
    const actualEndDate =
      batchEndDate && batchEndDate < searchEndDate
        ? batchEndDate
        : searchEndDate;

    // Filter sessions that are in the future and within the time range
    const upcomingSessions = batch.schedule
      .filter((session) => {
        // Handle both old day-based and new date-based sessions
        if (session.date) {
          // New date-based session
          const sessionDate = new Date(session.date);
          const [hours, minutes] = session.start_time.split(":").map(Number);
          sessionDate.setHours(hours, minutes, 0, 0);

          return sessionDate > now && sessionDate <= actualEndDate;
        } else if (session.day) {
          // Legacy day-based session - we'll keep this for backward compatibility
          // but won't generate recurring sessions anymore
          return false;
        }
        return false;
      })
      .map((session) => {
        const sessionDate = new Date(session.date);
        const [startHours, startMinutes] = session.start_time
          .split(":")
          .map(Number);
        const [endHours, endMinutes] = session.end_time.split(":").map(Number);

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
          title:
            session.title || `Session on ${sessionDate.toLocaleDateString()}`,
          description: session.description || "",
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

// Add helper for legacy day-based scheduling
const getDatesForDayOfWeek = (dayOfWeek, startDate, endDate) => {
  const daysMap = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const dates = [];
  const date = new Date(startDate);
  const targetDay = daysMap[dayOfWeek];
  const diff = (targetDay - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + diff);
  while (date <= endDate) {
    dates.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }
  return dates;
};

// Get upcoming sessions for a student across all their enrolled batches
export const getUpcomingSessionsForStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { limit = 20, days_ahead = 28 } = req.query;

    // Authorization: students can only access their own sessions
    if (req.user.role === "student" && req.user.id !== studentId) {
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
    if (!student.role.includes("student")) {
      return res.status(400).json({
        success: false,
        message: "User is not a student",
      });
    }

    // Find active enrollments for the student
    const enrollments = await Enrollment.find({
      student: studentId,
      status: "active",
    })
      .populate({
        path: "batch",
        select:
          "batch_name batch_code schedule status assigned_instructor start_date end_date",
        populate: {
          path: "assigned_instructor",
          select: "full_name email",
        },
      })
      .populate("course", "course_title")
      .lean();

    const upcomingSessions = [];
    const now = new Date();
    const searchEndDate = new Date(
      now.getTime() + parseInt(days_ahead) * 24 * 60 * 60 * 1000,
    );

    // Iterate through each enrollment
    enrollments.forEach((enrollment) => {
      const batch = enrollment.batch;

      // Skip if batch doesn't exist or has no schedule
      if (!batch || !batch.schedule || batch.schedule.length === 0) {
        return;
      }

      // Consider batch end date
      const batchEndDate = batch.end_date ? new Date(batch.end_date) : null;
      const actualEndDate =
        batchEndDate && batchEndDate < searchEndDate
          ? batchEndDate
          : searchEndDate;

      // Filter and process sessions for this batch
      batch.schedule.forEach((session) => {
        if (session.date) {
          // New date-based session
          const sessionDate = new Date(session.date);
          const [startHours, startMinutes] = session.start_time
            .split(":")
            .map(Number);
          const [endHours, endMinutes] = session.end_time
            .split(":")
            .map(Number);
          sessionDate.setHours(startHours, startMinutes, 0, 0);
          const sessionEndDate = new Date(sessionDate);
          sessionEndDate.setHours(endHours, endMinutes, 0, 0);
          const isInFuture = sessionDate > now;
          const isWithinRange = sessionDate <= actualEndDate;
          const isAfterBatchStart =
            !batch.start_date || sessionDate >= new Date(batch.start_date);
          if (isInFuture && isWithinRange && isAfterBatchStart) {
            upcomingSessions.push({
              session_id: session._id,
              session_date: sessionDate,
              session_end_date: sessionEndDate,
              date: session.date,
              start_time: session.start_time,
              end_time: session.end_time,
              title:
                session.title ||
                `Session on ${sessionDate.toLocaleDateString()}`,
              description: session.description || "",
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
        } else if (session.day) {
          // Legacy day-based session: generate weekly occurrences within the period
          const occDates = getDatesForDayOfWeek(
            session.day,
            now,
            actualEndDate,
          );
          occDates.forEach((dateOnly) => {
            const sessionDate = new Date(dateOnly);
            const [startHours, startMinutes] = session.start_time
              .split(":")
              .map(Number);
            const [endHours, endMinutes] = session.end_time
              .split(":")
              .map(Number);
            sessionDate.setHours(startHours, startMinutes, 0, 0);
            const sessionEndDate = new Date(sessionDate);
            sessionEndDate.setHours(endHours, endMinutes, 0, 0);
            const isAfterBatchStart =
              !batch.start_date || sessionDate >= new Date(batch.start_date);
            if (isAfterBatchStart) {
              upcomingSessions.push({
                session_id: session._id,
                session_date: sessionDate,
                session_end_date: sessionEndDate,
                date: sessionDate.toISOString().split("T")[0],
                start_time: session.start_time,
                end_time: session.end_time,
                title:
                  session.title ||
                  `Session on ${sessionDate.toLocaleDateString()}`,
                description: session.description || "",
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
          });
        }
      });
    });

    // Sort by session date
    upcomingSessions.sort((a, b) => a.session_date - b.session_date);

    // Apply limit
    const limitedSessions = upcomingSessions.slice(0, parseInt(limit));

    // Count batches by status (but only those with actual upcoming sessions)
    const batchesWithUpcomingSessions = [
      ...new Set(upcomingSessions.map((s) => s.batch.id)),
    ];
    const activeBatches = enrollments.filter(
      (e) =>
        e.batch &&
        e.batch.status === "active" &&
        batchesWithUpcomingSessions.includes(e.batch._id.toString()),
    ).length;
    const upcomingBatches = enrollments.filter(
      (e) =>
        e.batch &&
        e.batch.status === "Upcoming" &&
        batchesWithUpcomingSessions.includes(e.batch._id.toString()),
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
        email: student.email,
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

// Add controller to manually sync Zoom recordings for a batch
export const syncZoomRecordingsForBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { force_sync = false } = req.query;

    // Find the batch
    const batch = await Batch.findById(batchId).populate(
      "course",
      "course_title",
    );
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Import the sync function
    const { manualSyncZoomRecordings } = await import(
      "../cronjob/zoom-recording-sync.js"
    );

    // Start sync process
    console.log(
      `🔄 [Manual Sync] Starting sync for batch: ${batch.batch_name}`,
    );

    // Run sync in background to avoid timeout
    manualSyncZoomRecordings(batchId).catch((error) => {
      console.error(`❌ [Manual Sync] Error syncing batch ${batchId}:`, error);
    });

    res.status(202).json({
      success: true,
      message: "Zoom recording sync started for batch",
      data: {
        batch_id: batchId,
        batch_name: batch.batch_name,
        course_title: batch.course?.course_title,
        sync_status: "started",
        force_sync: force_sync === "true",
      },
    });
  } catch (error) {
    console.error("Error starting Zoom recording sync:", error);
    res.status(500).json({
      success: false,
      message: "Server error while starting Zoom recording sync",
      error: error.message,
    });
  }
};

// Add controller to get Zoom recording sync status for a batch
export const getZoomRecordingSyncStatus = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Find the batch
    const batch = await Batch.findById(batchId).populate(
      "course",
      "course_title",
    );
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Analyze sync status for each session
    const syncStatus = batch.schedule.map((session) => {
      const zoomMeeting = session.zoom_meeting || {};
      const recordedLessons = session.recorded_lessons || [];

      const zoomRecordings = recordedLessons.filter(
        (lesson) => lesson.source === "zoom_auto_sync",
      );

      return {
        session_id: session._id,
        session_date: session.date,
        session_title: session.title,
        zoom_meeting: {
          meeting_id: zoomMeeting.meeting_id,
          topic: zoomMeeting.topic,
          recording_synced: zoomMeeting.recording_synced || false,
          last_sync_date: zoomMeeting.last_sync_date,
          sync_attempts: zoomMeeting.sync_attempts || 0,
          last_sync_error: zoomMeeting.last_sync_error,
        },
        recorded_lessons: {
          total: recordedLessons.length,
          zoom_auto_sync: zoomRecordings.length,
          manual_upload: recordedLessons.filter(
            (l) => l.source === "manual_upload",
          ).length,
          external_link: recordedLessons.filter(
            (l) => l.source === "external_link",
          ).length,
        },
        zoom_recordings: zoomRecordings.map((recording) => ({
          title: recording.title,
          file_type: recording.zoom_recording_info?.file_type,
          file_size: recording.zoom_recording_info?.file_size,
          sync_date: recording.zoom_recording_info?.sync_date,
        })),
      };
    });

    // Calculate overall sync statistics
    const totalSessions = syncStatus.length;
    const sessionsWithZoomMeetings = syncStatus.filter(
      (s) => s.zoom_meeting.meeting_id,
    ).length;
    const syncedSessions = syncStatus.filter(
      (s) => s.zoom_meeting.recording_synced,
    ).length;
    const totalRecordings = syncStatus.reduce(
      (sum, s) => sum + s.recorded_lessons.zoom_auto_sync,
      0,
    );

    res.status(200).json({
      success: true,
      data: {
        batch: {
          id: batch._id,
          name: batch.batch_name,
          course_title: batch.course?.course_title,
          batch_type: batch.batch_type,
        },
        sync_statistics: {
          total_sessions: totalSessions,
          sessions_with_zoom_meetings: sessionsWithZoomMeetings,
          synced_sessions: syncedSessions,
          total_zoom_recordings: totalRecordings,
          sync_percentage:
            sessionsWithZoomMeetings > 0
              ? Math.round((syncedSessions / sessionsWithZoomMeetings) * 100)
              : 0,
        },
        sessions: syncStatus,
      },
    });
  } catch (error) {
    console.error("Error getting Zoom recording sync status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while getting Zoom recording sync status",
      error: error.message,
    });
  }
};

// Add controller to retry failed Zoom recording syncs
export const retryFailedZoomRecordings = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { sessionId } = req.body;

    // Find the batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    let sessionsToRetry = [];

    if (sessionId) {
      // Retry specific session
      const session = batch.schedule.id(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }
      if (session.zoom_meeting?.meeting_id) {
        sessionsToRetry.push(session);
      }
    } else {
      // Retry all failed sessions
      sessionsToRetry = batch.schedule.filter(
        (session) =>
          session.zoom_meeting?.meeting_id &&
          !session.zoom_meeting.recording_synced,
      );
    }

    if (sessionsToRetry.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No sessions found that need retry",
      });
    }

    // Import the sync function
    const { manualSyncZoomRecordings } = await import(
      "../cronjob/zoom-recording-sync.js"
    );

    // Start retry process
    console.log(
      `🔄 [Retry Sync] Starting retry for ${sessionsToRetry.length} sessions`,
    );

    // Run sync in background
    manualSyncZoomRecordings(batchId).catch((error) => {
      console.error(`❌ [Retry Sync] Error retrying batch ${batchId}:`, error);
    });

    res.status(202).json({
      success: true,
      message: "Zoom recording retry started",
      data: {
        batch_id: batchId,
        sessions_to_retry: sessionsToRetry.length,
        session_ids: sessionsToRetry.map((s) => s._id),
        retry_status: "started",
      },
    });
  } catch (error) {
    console.error("Error retrying Zoom recording sync:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrying Zoom recording sync",
      error: error.message,
    });
  }
};

// Add controller to fix AI companion host requirement for existing meetings
export const fixAICompanionHostRequirement = async (req, res) => {
  try {
    const { batchId, sessionId } = req.params;
    const { meetingId } = req.body;

    // Find the batch
    const batch = await Batch.findById(batchId).populate(
      "course",
      "course_title",
    );
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Find the session
    const session = batch.schedule.id(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Use provided meeting ID or session's meeting ID
    const targetMeetingId = meetingId || session.zoom_meeting?.meeting_id;

    if (!targetMeetingId) {
      return res.status(400).json({
        success: false,
        message: "No Zoom meeting ID found for this session",
      });
    }

    console.log(
      `🔧 Fixing AI companion host requirement for meeting: ${targetMeetingId}`,
    );

    // Update the Zoom meeting to enable AI companion without host
    const updatedMeeting =
      await zoomService.enableAICompanionWithoutHost(targetMeetingId);

    console.log("✅ AI companion settings updated successfully");

    // Update session with new meeting details if it's the session's meeting
    if (!meetingId && session.zoom_meeting) {
      session.zoom_meeting.meeting_id = updatedMeeting.id;
      session.zoom_meeting.join_url = updatedMeeting.join_url;
      session.zoom_meeting.topic = updatedMeeting.topic;
      session.zoom_meeting.password = updatedMeeting.password;
      await batch.save();
    }

    res.status(200).json({
      success: true,
      message: "AI companion host requirement fixed successfully",
      data: {
        session: {
          id: session._id,
          date: session.date,
          start_time: session.start_time,
          end_time: session.end_time,
          title: session.title,
        },
        zoom_meeting: {
          id: updatedMeeting.id,
          topic: updatedMeeting.topic,
          join_url: updatedMeeting.join_url,
          password: updatedMeeting.password,
          settings: {
            ai_companion_auto_start:
              updatedMeeting.settings?.ai_companion_auto_start,
            join_before_host: updatedMeeting.settings?.join_before_host,
            waiting_room: updatedMeeting.settings?.waiting_room,
            meeting_authentication:
              updatedMeeting.settings?.meeting_authentication,
          },
        },
        batch: {
          id: batch._id,
          name: batch.batch_name,
          course_title: batch.course?.course_title,
        },
      },
    });
  } catch (error) {
    console.error("Error fixing AI companion host requirement:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fixing AI companion settings",
      error: error.message,
    });
  }
};

// Add controller to manually create Zoom meeting for an existing session
export const createZoomMeetingForExistingSession = async (req, res) => {
  try {
    const { batchId, sessionId } = req.params;
    const { force_create = false } = req.query;

    // Find the batch
    const batch = await Batch.findById(batchId).populate(
      "course",
      "course_title",
    );
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Find the session
    const session = batch.schedule.id(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Check if session already has a Zoom meeting
    if (session.zoom_meeting?.meeting_id && !force_create) {
      return res.status(400).json({
        success: false,
        message:
          "Session already has a Zoom meeting. Use force_create=true to create a new one.",
        existing_meeting: {
          meeting_id: session.zoom_meeting.meeting_id,
          join_url: session.zoom_meeting.join_url,
          topic: session.zoom_meeting.topic,
        },
      });
    }

    // Calculate session duration in minutes
    const [startHours, startMinutes] = session.start_time
      .split(":")
      .map(Number);
    const [endHours, endMinutes] = session.end_time.split(":").map(Number);
    const durationMinutes =
      endHours * 60 + endMinutes - (startHours * 60 + startMinutes);

    // Create session start time for Zoom
    const sessionStartTime = new Date(session.date);
    sessionStartTime.setHours(startHours, startMinutes, 0, 0);

    console.log("🎥 Creating Zoom meeting for existing session...");

    // Prepare Zoom meeting data
    const zoomMeetingRequest = {
      topic: `${batch.course?.course_title || "Course"} - ${session.title}`,
      type: 2, // Scheduled meeting
      start_time: sessionStartTime.toISOString(),
      duration: Math.max(30, durationMinutes), // Minimum 30 minutes
      timezone: "Asia/Kolkata", // Default to IST
      agenda: session.description || `Session for ${batch.batch_name}`,
      settings: {
        host_video: true,
        participant_video: false,
        join_before_host: true,
        mute_upon_entry: true,
        waiting_room: false,
        meeting_authentication: false, // Allow students to join without Zoom accounts
        auto_recording: "cloud", // Enable cloud recording
        password: Math.random().toString(36).substring(2, 8).toUpperCase(), // Generate random password
        // AI Companion settings
        ai_companion_auto_start: true,
        ai_companion_meeting_summary: true,
        ai_companion_meeting_questions: true,
      },
    };

    // Create Zoom meeting
    const zoomMeetingData = await zoomService.createMeeting(zoomMeetingRequest);

    console.log("✅ Zoom meeting created successfully:", zoomMeetingData.id);

    // Update session with Zoom meeting details
    session.zoom_meeting = {
      meeting_id: zoomMeetingData.id,
      join_url: zoomMeetingData.join_url,
      topic: zoomMeetingData.topic,
      password: zoomMeetingData.password,
      start_url: zoomMeetingData.start_url,
      recording_synced: false,
      sync_attempts: 0,
      last_sync_error: null,
      next_retry_at: null,
    };

    await batch.save();

    res.status(201).json({
      success: true,
      message: "Zoom meeting created successfully for session",
      data: {
        session: {
          id: session._id,
          date: session.date,
          start_time: session.start_time,
          end_time: session.end_time,
          title: session.title,
        },
        zoom_meeting: {
          id: zoomMeetingData.id,
          join_url: zoomMeetingData.join_url,
          start_url: zoomMeetingData.start_url,
          password: zoomMeetingData.password,
          topic: zoomMeetingData.topic,
          start_time: zoomMeetingData.start_time,
          duration: zoomMeetingData.duration,
        },
        batch: {
          id: batch._id,
          name: batch.batch_name,
          course_title: batch.course?.course_title,
        },
      },
    });
  } catch (error) {
    console.error("Error creating Zoom meeting for existing session:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating Zoom meeting",
      error: error.message,
    });
  }
};
