import User from "../models/user-modal.js";
import { Course, Batch } from "../models/course-model.js";
import Enrollment from "../models/enrollment-model.js";
import Order from "../models/Order.js";
import Announcement from "../models/announcement-model.js";
import Blog from "../models/blog-model.js";
import Category from "../models/category-model.js";
import mongoose from "mongoose";
import { createBatchS3Folder } from "../utils/s3BatchFolderManager.js";

/**
 * Bulk operations for users
 * @route POST /api/v1/admin/users/bulk
 * @access Admin only
 */
export const bulkUserOperations = async (req, res) => {
  try {
    const { operation, userIds, data } = req.body;

    if (!operation || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: "Operation and userIds array are required",
      });
    }

    let result;

    switch (operation) {
      case "updateStatus":
        if (!data?.status) {
          return res.status(400).json({
            success: false,
            message: "Status is required for status update operation",
          });
        }
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { status: data.status, updatedAt: new Date() },
        );
        break;

      case "delete":
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { status: "deleted", deletedAt: new Date(), updatedAt: new Date() },
        );
        break;

      case "activate":
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { status: "active", updatedAt: new Date() },
        );
        break;

      case "suspend":
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { status: "suspended", updatedAt: new Date() },
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid operation",
        });
    }

    res.status(200).json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Error in bulk user operations:", error);
    res.status(500).json({
      success: false,
      message: "Server error while performing bulk operation",
      error: error.message,
    });
  }
};

/**
 * Create new course
 * @route POST /api/v1/admin/courses
 * @access Admin only
 */
export const createCourse = async (req, res) => {
  try {
    const courseData = req.body;

    // Add creation metadata
    courseData.createdAt = new Date();
    courseData.updatedAt = new Date();
    courseData.createdBy = req.user.id;

    const course = new Course(courseData);
    await course.save();

    const populatedCourse = await Course.findById(course._id)
      .populate("category", "name")
      .populate(
        "createdBy",
        "personalInfo.firstName personalInfo.lastName email",
      );

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: populatedCourse,
    });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating course",
      error: error.message,
    });
  }
};

/**
 * Update course
 * @route PUT /api/v1/admin/courses/:id
 * @access Admin only
 */
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID format",
      });
    }

    updateData.updatedAt = new Date();
    updateData.updatedBy = req.user.id;

    const course = await Course.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("category", "name")
      .populate(
        "createdBy",
        "personalInfo.firstName personalInfo.lastName email",
      );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: course,
    });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating course",
      error: error.message,
    });
  }
};

/**
 * Delete course (soft delete)
 * @route DELETE /api/v1/admin/courses/:id
 * @access Admin only
 */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID format",
      });
    }

    // Check if course has active enrollments
    const activeEnrollments = await Enrollment.countDocuments({
      course_id: id,
      status: "active",
    });

    if (activeEnrollments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete course with ${activeEnrollments} active enrollments`,
      });
    }

    const course = await Course.findByIdAndUpdate(
      id,
      {
        status: "deleted",
        deletedAt: new Date(),
        updatedAt: new Date(),
        deletedBy: req.user.id,
      },
      { new: true },
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
      data: course,
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting course",
      error: error.message,
    });
  }
};

/**
 * Bulk course operations
 * @route POST /api/v1/admin/courses/bulk
 * @access Admin only
 */
export const bulkCourseOperations = async (req, res) => {
  try {
    const { operation, courseIds, data } = req.body;

    if (!operation || !courseIds || !Array.isArray(courseIds)) {
      return res.status(400).json({
        success: false,
        message: "Operation and courseIds array are required",
      });
    }

    let result;
    const updateData = { updatedAt: new Date(), updatedBy: req.user.id };

    switch (operation) {
      case "updateStatus":
        if (!data?.status) {
          return res.status(400).json({
            success: false,
            message: "Status is required for status update operation",
          });
        }
        result = await Course.updateMany(
          { _id: { $in: courseIds } },
          { ...updateData, status: data.status },
        );
        break;

      case "updateCategory":
        if (!data?.category) {
          return res.status(400).json({
            success: false,
            message: "Category is required for category update operation",
          });
        }
        result = await Course.updateMany(
          { _id: { $in: courseIds } },
          { ...updateData, category: data.category },
        );
        break;

      case "updatePrice":
        if (data?.price === undefined) {
          return res.status(400).json({
            success: false,
            message: "Price is required for price update operation",
          });
        }
        result = await Course.updateMany(
          { _id: { $in: courseIds } },
          { ...updateData, price: data.price },
        );
        break;

      case "publish":
        result = await Course.updateMany(
          { _id: { $in: courseIds } },
          { ...updateData, status: "published" },
        );
        break;

      case "unpublish":
        result = await Course.updateMany(
          { _id: { $in: courseIds } },
          { ...updateData, status: "draft" },
        );
        break;

      case "delete":
        result = await Course.updateMany(
          { _id: { $in: courseIds } },
          { ...updateData, status: "deleted", deletedAt: new Date() },
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid operation",
        });
    }

    res.status(200).json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Error in bulk course operations:", error);
    res.status(500).json({
      success: false,
      message: "Server error while performing bulk course operation",
      error: error.message,
    });
  }
};

/**
 * Create new batch
 * @route POST /api/v1/admin/batches
 * @access Admin only
 */
export const createBatch = async (req, res) => {
  try {
    const batchData = req.body;
    const adminId = req.user.id;

    // Add creation metadata
    batchData.createdAt = new Date();
    batchData.updatedAt = new Date();
    batchData.createdBy = adminId;

    // Use the Course.createBatch method to ensure instructor details are populated
    const courseId = batchData.course;
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required for batch creation",
      });
    }

    const batch = await Course.createBatch(courseId, batchData, adminId);

    // Create S3 folder for the batch
    try {
      const s3FolderResult = await createBatchS3Folder(
        batch._id.toString(),
        batch.batch_name || 'New Batch'
      );
      
      if (s3FolderResult.success) {
        console.log(`✅ S3 folder created for batch: ${batch.batch_name} (${batch._id})`);
        console.log(`   - S3 Path: ${s3FolderResult.s3Path}`);
      } else {
        console.warn(`⚠️ Failed to create S3 folder for batch: ${batch.batch_name}`, s3FolderResult.error);
      }
    } catch (s3Error) {
      console.error(`❌ Error creating S3 folder for batch: ${batch.batch_name}`, s3Error);
      // Don't fail batch creation if S3 folder creation fails
    }

    const populatedBatch = await Batch.findById(batch._id)
      .populate("course", "title")
      .populate(
        "instructor",
        "personalInfo.firstName personalInfo.lastName email",
      )
      .select("+instructor_details"); // Include instructor_details field

    res.status(201).json({
      success: true,
      message: "Batch created successfully",
      data: populatedBatch,
    });
  } catch (error) {
    console.error("Error creating batch:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating batch",
      error: error.message,
    });
  }
};

/**
 * Update batch
 * @route PUT /api/v1/admin/batches/:id
 * @access Admin only
 */
export const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID format",
      });
    }

    updateData.updatedAt = new Date();
    updateData.updatedBy = req.user.id;

    const batch = await Batch.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("course", "title")
      .populate(
        "instructor",
        "personalInfo.firstName personalInfo.lastName email",
      )
      .select("+instructor_details"); // Include instructor_details field

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Batch updated successfully",
      data: batch,
    });
  } catch (error) {
    console.error("Error updating batch:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating batch",
      error: error.message,
    });
  }
};

/**
 * Update enrollment status
 * @route PUT /api/v1/admin/enrollments/:id/status
 * @access Admin only
 */
export const updateEnrollmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enrollment ID format",
      });
    }

    if (
      !status ||
      !["active", "inactive", "completed", "cancelled", "suspended"].includes(
        status,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Must be active, inactive, completed, cancelled, or suspended",
      });
    }

    const updateData = {
      status,
      updatedAt: new Date(),
      updatedBy: req.user.id,
    };

    if (reason) {
      updateData.statusReason = reason;
    }

    const enrollment = await Enrollment.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate(
        "student_id",
        "personalInfo.firstName personalInfo.lastName email",
      )
      .populate("course_id", "title")
      .populate("batch_id", "name");

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

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
 * Create new announcement
 * @route POST /api/v1/admin/announcements
 * @access Admin only
 */
export const createAnnouncement = async (req, res) => {
  try {
    const announcementData = req.body;

    // Add creation metadata
    announcementData.createdAt = new Date();
    announcementData.updatedAt = new Date();
    announcementData.createdBy = req.user.id;

    const announcement = new Announcement(announcementData);
    await announcement.save();

    const populatedAnnouncement = await Announcement.findById(
      announcement._id,
    ).populate(
      "createdBy",
      "personalInfo.firstName personalInfo.lastName email",
    );

    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: populatedAnnouncement,
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating announcement",
      error: error.message,
    });
  }
};

/**
 * Update announcement
 * @route PUT /api/v1/admin/announcements/:id
 * @access Admin only
 */
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement ID format",
      });
    }

    updateData.updatedAt = new Date();
    updateData.updatedBy = req.user.id;

    const announcement = await Announcement.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate(
      "createdBy",
      "personalInfo.firstName personalInfo.lastName email",
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      data: announcement,
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating announcement",
      error: error.message,
    });
  }
};

/**
 * Get comprehensive admin dashboard overview
 * @route GET /api/v1/admin/overview
 * @access Admin only
 */
export const getAdminOverview = async (req, res) => {
  try {
    // Get quick stats for the overview
    const [
      totalUsers,
      activeUsers,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      activeEnrollments,
      totalRevenue,
      monthlyRevenue,
      recentUsers,
      recentEnrollments,
      topCourses,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "active" }),
      Course.countDocuments(),
      Course.countDocuments({ status: "published" }),
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ status: "active" }),
      Order.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).then((r) => r[0]?.total || 0),
      Order.aggregate([
        {
          $match: {
            status: "paid",
            createdAt: {
              $gte: new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1,
              ),
            },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).then((r) => r[0]?.total || 0),
      User.find({}, null, { sort: { createdAt: -1 }, limit: 5 }).select(
        "personalInfo.firstName personalInfo.lastName email role createdAt",
      ),
      Enrollment.find({}, null, { sort: { enrollment_date: -1 }, limit: 5 })
        .populate("student_id", "personalInfo.firstName personalInfo.lastName")
        .populate("course_id", "title"),
      Enrollment.aggregate([
        {
          $group: {
            _id: "$course_id",
            enrollmentCount: { $sum: 1 },
          },
        },
        { $sort: { enrollmentCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "courses",
            localField: "_id",
            foreignField: "_id",
            as: "courseInfo",
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          users: {
            total: totalUsers,
            active: activeUsers,
            inactiveRate:
              totalUsers > 0
                ? (((totalUsers - activeUsers) / totalUsers) * 100).toFixed(2)
                : 0,
          },
          courses: {
            total: totalCourses,
            published: publishedCourses,
            publishRate:
              totalCourses > 0
                ? ((publishedCourses / totalCourses) * 100).toFixed(2)
                : 0,
          },
          enrollments: {
            total: totalEnrollments,
            active: activeEnrollments,
            completionRate:
              totalEnrollments > 0
                ? ((activeEnrollments / totalEnrollments) * 100).toFixed(2)
                : 0,
          },
          revenue: {
            total: totalRevenue,
            monthly: monthlyRevenue,
            growth: 0, // Can be calculated with previous month data
          },
        },
        recentActivity: {
          newUsers: recentUsers,
          newEnrollments: recentEnrollments,
          topCourses: topCourses,
        },
        quickActions: [
          { name: "Create Course", endpoint: "/admin/courses", method: "POST" },
          { name: "Create Batch", endpoint: "/admin/batches", method: "POST" },
          {
            name: "Create Announcement",
            endpoint: "/admin/announcements",
            method: "POST",
          },
          { name: "View Reports", endpoint: "/admin/reports", method: "GET" },
        ],
      },
    });
  } catch (error) {
    console.error("Error fetching admin overview:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching admin overview",
      error: error.message,
    });
  }
};

/**
 * Delete batch (soft delete)
 * @route DELETE /api/v1/admin/batches/:id
 * @access Admin only
 */
export const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID format",
      });
    }

    // Check if batch has active enrollments
    const activeEnrollments = await Enrollment.countDocuments({
      batch_id: id,
      status: "active",
    });

    if (activeEnrollments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete batch with ${activeEnrollments} active enrollments`,
      });
    }

    const batch = await Batch.findByIdAndUpdate(
      id,
      {
        status: "deleted",
        deletedAt: new Date(),
        updatedAt: new Date(),
        deletedBy: req.user.id,
      },
      { new: true },
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Batch deleted successfully",
      data: batch,
    });
  } catch (error) {
    console.error("Error deleting batch:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting batch",
      error: error.message,
    });
  }
};

/**
 * Delete announcement (soft delete)
 * @route DELETE /api/v1/admin/announcements/:id
 * @access Admin only
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement ID format",
      });
    }

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      {
        status: "deleted",
        deletedAt: new Date(),
        updatedAt: new Date(),
        deletedBy: req.user.id,
      },
      { new: true },
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
      data: announcement,
    });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting announcement",
      error: error.message,
    });
  }
};

/**
 * Bulk batch operations
 * @route POST /api/v1/admin/batches/bulk
 * @access Admin only
 */
export const bulkBatchOperations = async (req, res) => {
  try {
    const { operation, batchIds, data } = req.body;

    if (!operation || !batchIds || !Array.isArray(batchIds)) {
      return res.status(400).json({
        success: false,
        message: "Operation and batchIds array are required",
      });
    }

    let result;
    const updateData = { updatedAt: new Date(), updatedBy: req.user.id };

    switch (operation) {
      case "updateStatus":
        if (!data?.status) {
          return res.status(400).json({
            success: false,
            message: "Status is required for status update operation",
          });
        }
        result = await Batch.updateMany(
          { _id: { $in: batchIds } },
          { ...updateData, status: data.status },
        );
        break;

      case "updateInstructor":
        if (!data?.instructor) {
          return res.status(400).json({
            success: false,
            message: "Instructor is required for instructor update operation",
          });
        }
        result = await Batch.updateMany(
          { _id: { $in: batchIds } },
          { ...updateData, instructor: data.instructor },
        );
        break;

      case "updateCapacity":
        if (!data?.capacity) {
          return res.status(400).json({
            success: false,
            message: "Capacity is required for capacity update operation",
          });
        }
        result = await Batch.updateMany(
          { _id: { $in: batchIds } },
          { ...updateData, capacity: data.capacity },
        );
        break;

      case "activate":
        result = await Batch.updateMany(
          { _id: { $in: batchIds } },
          { ...updateData, status: "active" },
        );
        break;

      case "deactivate":
        result = await Batch.updateMany(
          { _id: { $in: batchIds } },
          { ...updateData, status: "inactive" },
        );
        break;

      case "delete":
        result = await Batch.updateMany(
          { _id: { $in: batchIds } },
          { ...updateData, status: "deleted", deletedAt: new Date() },
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid operation",
        });
    }

    res.status(200).json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Error in bulk batch operations:", error);
    res.status(500).json({
      success: false,
      message: "Server error while performing bulk batch operation",
      error: error.message,
    });
  }
};

/**
 * Bulk enrollment operations
 * @route POST /api/v1/admin/enrollments/bulk
 * @access Admin only
 */
export const bulkEnrollmentOperations = async (req, res) => {
  try {
    const { operation, enrollmentIds, data } = req.body;

    if (!operation || !enrollmentIds || !Array.isArray(enrollmentIds)) {
      return res.status(400).json({
        success: false,
        message: "Operation and enrollmentIds array are required",
      });
    }

    let result;
    const updateData = { updatedAt: new Date(), updatedBy: req.user.id };

    switch (operation) {
      case "updateStatus":
        if (!data?.status) {
          return res.status(400).json({
            success: false,
            message: "Status is required for status update operation",
          });
        }
        result = await Enrollment.updateMany(
          { _id: { $in: enrollmentIds } },
          { ...updateData, status: data.status },
        );
        break;

      case "activate":
        result = await Enrollment.updateMany(
          { _id: { $in: enrollmentIds } },
          { ...updateData, status: "active" },
        );
        break;

      case "suspend":
        result = await Enrollment.updateMany(
          { _id: { $in: enrollmentIds } },
          { ...updateData, status: "suspended" },
        );
        break;

      case "complete":
        result = await Enrollment.updateMany(
          { _id: { $in: enrollmentIds } },
          { ...updateData, status: "completed", completion_date: new Date() },
        );
        break;

      case "cancel":
        result = await Enrollment.updateMany(
          { _id: { $in: enrollmentIds } },
          { ...updateData, status: "cancelled", cancellation_date: new Date() },
        );
        break;

      case "transferBatch":
        if (!data?.batchId) {
          return res.status(400).json({
            success: false,
            message: "Batch ID is required for batch transfer operation",
          });
        }
        result = await Enrollment.updateMany(
          { _id: { $in: enrollmentIds } },
          { ...updateData, batch_id: data.batchId },
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid operation",
        });
    }

    res.status(200).json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Error in bulk enrollment operations:", error);
    res.status(500).json({
      success: false,
      message: "Server error while performing bulk enrollment operation",
      error: error.message,
    });
  }
};

/**
 * Bulk announcement operations
 * @route POST /api/v1/admin/announcements/bulk
 * @access Admin only
 */
export const bulkAnnouncementOperations = async (req, res) => {
  try {
    const { operation, announcementIds, data } = req.body;

    if (!operation || !announcementIds || !Array.isArray(announcementIds)) {
      return res.status(400).json({
        success: false,
        message: "Operation and announcementIds array are required",
      });
    }

    let result;
    const updateData = { updatedAt: new Date(), updatedBy: req.user.id };

    switch (operation) {
      case "updateStatus":
        if (!data?.status) {
          return res.status(400).json({
            success: false,
            message: "Status is required for status update operation",
          });
        }
        result = await Announcement.updateMany(
          { _id: { $in: announcementIds } },
          { ...updateData, status: data.status },
        );
        break;

      case "updatePriority":
        if (!data?.priority) {
          return res.status(400).json({
            success: false,
            message: "Priority is required for priority update operation",
          });
        }
        result = await Announcement.updateMany(
          { _id: { $in: announcementIds } },
          { ...updateData, priority: data.priority },
        );
        break;

      case "publish":
        result = await Announcement.updateMany(
          { _id: { $in: announcementIds } },
          { ...updateData, status: "published", publishedAt: new Date() },
        );
        break;

      case "unpublish":
        result = await Announcement.updateMany(
          { _id: { $in: announcementIds } },
          { ...updateData, status: "draft" },
        );
        break;

      case "archive":
        result = await Announcement.updateMany(
          { _id: { $in: announcementIds } },
          { ...updateData, status: "archived", archivedAt: new Date() },
        );
        break;

      case "delete":
        result = await Announcement.updateMany(
          { _id: { $in: announcementIds } },
          { ...updateData, status: "deleted", deletedAt: new Date() },
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid operation",
        });
    }

    res.status(200).json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Error in bulk announcement operations:", error);
    res.status(500).json({
      success: false,
      message: "Server error while performing bulk announcement operation",
      error: error.message,
    });
  }
};

/**
 * Create new user
 * @route POST /api/v1/admin/users
 * @access Admin only
 */
export const createUser = async (req, res) => {
  try {
    const userData = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Validate required fields
    if (!userData.full_name || !userData.email) {
      return res.status(400).json({
        success: false,
        message: "Full name and email are required",
      });
    }

    // For non-demo users, password is required
    if (!userData.is_demo && !userData.password) {
      return res.status(400).json({
        success: false,
        message: "Password is required for regular users",
      });
    }

    // Add creation metadata
    userData.createdAt = new Date();
    userData.updatedAt = new Date();
    userData.createdBy = req.user.id;
    userData.status = userData.status || "active";

    // Set password_set correctly based on user type
    if (userData.password && !userData.is_demo) {
      userData.password_set = true;
      userData.first_login_completed = true;
    } else if (userData.is_demo) {
      userData.password_set = !!userData.password;
      userData.first_login_completed = false;
    }

    // Ensure email is lowercase
    userData.email = userData.email.toLowerCase();

    // Set default role if not provided
    if (!userData.role) {
      userData.role = "student";
    }

    const user = new User(userData);
    await user.save();

    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokens;
    delete userResponse.mfa;

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating user",
      error: error.message,
    });
  }
};

/**
 * Update user details
 * @route PUT /api/v1/admin/users/:id
 * @access Admin only
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Remove sensitive fields from update
    delete updateData.password;
    delete updateData.refreshTokens;
    delete updateData.mfa;

    updateData.updatedAt = new Date();
    updateData.updatedBy = req.user.id;

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      select: "-password -refreshTokens -mfa.backupCodes",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating user",
      error: error.message,
    });
  }
};

/**
 * Create new blog post
 * @route POST /api/v1/admin/blogs
 * @access Admin only
 */
export const createBlog = async (req, res) => {
  try {
    const blogData = req.body;

    // Add creation metadata
    blogData.createdAt = new Date();
    blogData.updatedAt = new Date();
    blogData.author = req.user.id;
    blogData.views = 0;

    const blog = new Blog(blogData);
    await blog.save();

    const populatedBlog = await Blog.findById(blog._id).populate(
      "author",
      "personalInfo.firstName personalInfo.lastName email",
    );

    res.status(201).json({
      success: true,
      message: "Blog post created successfully",
      data: populatedBlog,
    });
  } catch (error) {
    console.error("Error creating blog post:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating blog post",
      error: error.message,
    });
  }
};

/**
 * Update blog post
 * @route PUT /api/v1/admin/blogs/:id
 * @access Admin only
 */
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID format",
      });
    }

    updateData.updatedAt = new Date();
    updateData.updatedBy = req.user.id;

    const blog = await Blog.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("author", "personalInfo.firstName personalInfo.lastName email");

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Blog post updated successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error updating blog post:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating blog post",
      error: error.message,
    });
  }
};

/**
 * Delete blog post (soft delete)
 * @route DELETE /api/v1/admin/blogs/:id
 * @access Admin only
 */
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID format",
      });
    }

    const blog = await Blog.findByIdAndUpdate(
      id,
      {
        status: "deleted",
        deletedAt: new Date(),
        updatedAt: new Date(),
        deletedBy: req.user.id,
      },
      { new: true },
    );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Blog post deleted successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting blog post",
      error: error.message,
    });
  }
};

/**
 * Bulk blog operations
 * @route POST /api/v1/admin/blogs/bulk
 * @access Admin only
 */
export const bulkBlogOperations = async (req, res) => {
  try {
    const { operation, blogIds, data } = req.body;

    if (!operation || !blogIds || !Array.isArray(blogIds)) {
      return res.status(400).json({
        success: false,
        message: "Operation and blogIds array are required",
      });
    }

    let result;
    const updateData = { updatedAt: new Date(), updatedBy: req.user.id };

    switch (operation) {
      case "updateStatus":
        if (!data?.status) {
          return res.status(400).json({
            success: false,
            message: "Status is required for status update operation",
          });
        }
        result = await Blog.updateMany(
          { _id: { $in: blogIds } },
          { ...updateData, status: data.status },
        );
        break;

      case "updateCategory":
        if (!data?.category) {
          return res.status(400).json({
            success: false,
            message: "Category is required for category update operation",
          });
        }
        result = await Blog.updateMany(
          { _id: { $in: blogIds } },
          { ...updateData, category: data.category },
        );
        break;

      case "publish":
        result = await Blog.updateMany(
          { _id: { $in: blogIds } },
          { ...updateData, status: "published", publishedAt: new Date() },
        );
        break;

      case "unpublish":
        result = await Blog.updateMany(
          { _id: { $in: blogIds } },
          { ...updateData, status: "draft" },
        );
        break;

      case "feature":
        result = await Blog.updateMany(
          { _id: { $in: blogIds } },
          { ...updateData, featured: true },
        );
        break;

      case "unfeature":
        result = await Blog.updateMany(
          { _id: { $in: blogIds } },
          { ...updateData, featured: false },
        );
        break;

      case "delete":
        result = await Blog.updateMany(
          { _id: { $in: blogIds } },
          { ...updateData, status: "deleted", deletedAt: new Date() },
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid operation",
        });
    }

    res.status(200).json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Error in bulk blog operations:", error);
    res.status(500).json({
      success: false,
      message: "Server error while performing bulk blog operation",
      error: error.message,
    });
  }
};
