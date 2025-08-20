import User from "../models/user-modal.js";
import EnrolledCourse from "../models/enrolled-courses-model.js";
import Course from "../models/course-model.js";
import Quiz from "../models/quiz-model.js";
import Order from "../models/Order.js";
import Progress from "../models/progress-model.js";
import Certificate from "../models/certificate-model.js";
import EnhancedProgress from "../models/enhanced-progress.model.js";
import logger from "../utils/logger.js";
import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV_VARS } from "../config/envVars.js";

// Helper functions for enhanced progress analytics
const calculateLearningStreak = (progressData) => {
  if (!progressData || progressData.length === 0) return 0;

  const sortedData = progressData.sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  );
  let streak = 0;
  let currentDate = new Date();

  for (const entry of sortedData) {
    const entryDate = new Date(entry.updatedAt);
    const daysDiff = Math.floor(
      (currentDate - entryDate) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff <= 1) {
      streak++;
      currentDate = entryDate;
    } else {
      break;
    }
  }

  return streak;
};

const calculatePerformanceTrends = (progressData) => {
  if (!progressData || progressData.length < 2)
    return { trend: "stable", change: 0 };

  const recent = progressData.slice(0, Math.min(10, progressData.length));
  const older = progressData.slice(10, Math.min(20, progressData.length));

  const recentAvg =
    recent.reduce((sum, p) => sum + (p.score || 0), 0) / recent.length;
  const olderAvg =
    older.length > 0
      ? older.reduce((sum, p) => sum + (p.score || 0), 0) / older.length
      : recentAvg;

  const change = recentAvg - olderAvg;
  const trend = change > 5 ? "improving" : change < -5 ? "declining" : "stable";

  return { trend, change: Math.round(change * 100) / 100 };
};

const calculateLearningVelocity = (progressData) => {
  if (!progressData || progressData.length < 2) return 0;

  const sortedData = progressData.sort(
    (a, b) => new Date(a.updatedAt) - new Date(b.updatedAt),
  );
  const timeSpan =
    new Date(sortedData[sortedData.length - 1].updatedAt) -
    new Date(sortedData[0].updatedAt);
  const days = timeSpan / (1000 * 60 * 60 * 24);

  return days > 0 ? Math.round((progressData.length / days) * 100) / 100 : 0;
};

/**
 * @desc Get complete user profile
 * @route GET /api/v1/profile/:userId
 * @access Private (User can view own profile, admins can view any profile)
 */
export const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Authorization: Users can only view their own profile unless they're admin
    if (
      userId !== requestingUserId &&
      !["admin", "super-admin"].includes(requestingUserRole)
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this profile",
      });
    }

    // Find user and exclude sensitive fields for non-admin users
    const sensitiveFields =
      userId !== requestingUserId
        ? "-password -two_factor_secret -backup_codes -password_reset_token -email_verification_token -oauth -api_key -webhooks -failed_login_attempts -account_locked_until"
        : "-password -two_factor_secret -backup_codes -password_reset_token -email_verification_token -oauth.google.access_token -oauth.google.refresh_token -oauth.facebook.access_token -oauth.facebook.refresh_token -oauth.github.access_token -oauth.github.refresh_token -oauth.linkedin.access_token -oauth.linkedin.refresh_token -oauth.microsoft.access_token -oauth.microsoft.refresh_token -oauth.apple.access_token -oauth.apple.refresh_token";

    const user = await User.findById(userId).select(sensitiveFields);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Log profile view activity
    if (userId === requestingUserId) {
      user.logActivity("profile_view", userId, {
        view_type: "self_view",
        timestamp: new Date(),
      });
    }

    logger.info("Profile retrieved successfully", {
      userId,
      requestingUserId,
      profileCompletion: user.profile_completion,
    });

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        user,
        profile_completion: user.profile_completion,
        last_updated: user.updated_at,
        account_status: {
          is_active: user.is_active,
          is_banned: user.is_banned,
          email_verified: user.email_verified,
          phone_verified: user.phone_verified,
          identity_verified: user.identity_verified,
        },
      },
    });
  } catch (error) {
    logger.error("Error retrieving profile", {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc Update user profile
 * @route PUT /api/v1/profile/:userId
 * @access Private (User can update own profile, admins can update any profile)
 */
export const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { userId } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;
    const updateData = req.body;

    // Authorization: Users can only update their own profile unless they're admin
    if (
      userId !== requestingUserId &&
      !["admin", "super-admin"].includes(requestingUserRole)
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this profile",
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Fields that regular users cannot update (admin-only fields)
    const adminOnlyFields = [
      "role",
      "admin_role",
      "is_active",
      "is_banned",
      "ban_reason",
      "ban_expires",
      "account_type",
      "subscription_status",
      "subscription_plan",
      "subscription_start",
      "subscription_end",
      "email_verified",
      "phone_verified",
      "identity_verified",
      "api_key",
      "api_rate_limit",
      "webhooks",
      "failed_login_attempts",
      "account_locked_until",
    ];

    // Remove admin-only fields if user is not admin
    if (!["admin", "super-admin"].includes(requestingUserRole)) {
      adminOnlyFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          delete updateData[field];
        }
      });
    }

    // Handle password update separately
    if (updateData.password) {
      if (updateData.password.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Password cannot be empty",
        });
      }

      // Hash the new password
      const salt = await bcrypt.genSalt(12);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    // Handle email update - require verification
    if (updateData.email && updateData.email !== user.email) {
      updateData.email_verified = false;
      updateData.email_verification_token = jwt.sign(
        { userId: user._id, email: updateData.email },
        ENV_VARS.JWT_SECRET_KEY,
        { expiresIn: "24h" },
      );
      updateData.email_verification_expires = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      );
    }

    // Handle nested object updates
    if (updateData.meta) {
      updateData.meta = { ...user.meta?.toObject(), ...updateData.meta };
    }
    if (updateData.preferences) {
      updateData.preferences = {
        ...user.preferences?.toObject(),
        ...updateData.preferences,
      };
    }
    if (updateData.user_image) {
      // Ensure user_image is an object before spreading
      const existingUserImage =
        typeof user.user_image === "string"
          ? { url: user.user_image }
          : user.user_image || {};
      updateData.user_image = {
        ...existingUserImage,
        ...updateData.user_image,
      };
    }
    if (updateData.cover_image) {
      // Ensure cover_image is an object before spreading
      const existingCoverImage =
        typeof user.cover_image === "string"
          ? { url: user.cover_image }
          : user.cover_image || {};
      updateData.cover_image = {
        ...existingCoverImage,
        ...updateData.cover_image,
      };
    }

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...updateData,
        updated_at: new Date(),
        last_profile_update: new Date(),
      },
      {
        new: true,
        runValidators: true,
        select:
          "-password -two_factor_secret -backup_codes -password_reset_token -email_verification_token",
      },
    );

    // Log profile update activity
    updatedUser.logActivity("profile_update", userId, {
      updated_fields: Object.keys(updateData),
      timestamp: new Date(),
    });

    logger.info("Profile updated successfully", {
      userId,
      requestingUserId,
      updatedFields: Object.keys(updateData),
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: updatedUser,
        profile_completion: updatedUser.profile_completion,
        updated_fields: Object.keys(updateData),
      },
    });
  } catch (error) {
    logger.error("Error updating profile", {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
    });

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while updating profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc Delete user profile (soft delete)
 * @route DELETE /api/v1/profile/:userId
 * @access Private (User can delete own profile, admins can delete any profile)
 */
export const deleteProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;
    const { permanent = false } = req.query;

    // Authorization: Users can only delete their own profile unless they're admin
    if (
      userId !== requestingUserId &&
      !["admin", "super-admin"].includes(requestingUserRole)
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this profile",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Only super-admin can perform permanent deletion
    if (permanent === "true" && requestingUserRole !== "super-admin") {
      return res.status(403).json({
        success: false,
        message: "Only super-admin can permanently delete profiles",
      });
    }

    if (permanent === "true") {
      // Permanent deletion
      await User.findByIdAndDelete(userId);

      logger.warn("Profile permanently deleted", {
        userId,
        requestingUserId,
        deletedUser: {
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      });

      res.status(200).json({
        success: true,
        message: "Profile permanently deleted",
      });
    } else {
      // Soft deletion
      const deletedUser = await User.findByIdAndUpdate(
        userId,
        {
          is_active: false,
          is_banned: true,
          ban_reason: "Account deleted by user",
          email: `deleted_${Date.now()}_${user.email}`, // Prevent email conflicts
          username: user.username
            ? `deleted_${Date.now()}_${user.username}`
            : undefined,
          deleted_at: new Date(),
          updated_at: new Date(),
        },
        { new: true, select: "full_name email is_active deleted_at" },
      );

      // Log deletion activity
      user.logActivity("profile_delete", userId, {
        deletion_type: "soft_delete",
        timestamp: new Date(),
      });

      logger.warn("Profile soft deleted", {
        userId,
        requestingUserId,
        deletedUser: {
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      });

      res.status(200).json({
        success: true,
        message: "Profile deactivated successfully",
        data: {
          user: deletedUser,
          deletion_type: "soft_delete",
          can_be_restored: true,
        },
      });
    }
  } catch (error) {
    logger.error("Error deleting profile", {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while deleting profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc Restore soft-deleted profile
 * @route POST /api/v1/profile/:userId/restore
 * @access Private (Admin only)
 */
export const restoreProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserRole = req.user.role;

    // Only admins can restore profiles
    if (!["admin", "super-admin"].includes(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        message: "Only administrators can restore profiles",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.is_active && !user.is_banned) {
      return res.status(400).json({
        success: false,
        message: "Profile is already active",
      });
    }

    // Restore the profile
    const restoredUser = await User.findByIdAndUpdate(
      userId,
      {
        is_active: true,
        is_banned: false,
        ban_reason: undefined,
        restored_at: new Date(),
        updated_at: new Date(),
      },
      { new: true, select: "full_name email is_active restored_at" },
    );

    // Log restoration activity
    user.logActivity("profile_restore", userId, {
      restored_by: req.user.id,
      timestamp: new Date(),
    });

    logger.info("Profile restored successfully", {
      userId,
      restoredBy: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: "Profile restored successfully",
      data: {
        user: restoredUser,
      },
    });
  } catch (error) {
    logger.error("Error restoring profile", {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while restoring profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc Get profile statistics and analytics
 * @route GET /api/v1/profile/:userId/stats
 * @access Private (User can view own stats, admins can view any stats)
 */
export const getProfileStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Authorization: Users can only view their own stats unless they're admin
    if (
      userId !== requestingUserId &&
      !["admin", "super-admin"].includes(requestingUserRole)
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view these statistics",
      });
    }

    const user = await User.findById(userId).select(
      "statistics activity_log preferences created_at last_seen",
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Calculate additional stats
    const accountAge = Math.floor(
      (new Date() - user.created_at) / (1000 * 60 * 60 * 24),
    );
    const recentActivity = user.activity_log?.slice(-10) || [];

    res.status(200).json({
      success: true,
      message: "Profile statistics retrieved successfully",
      data: {
        statistics: user.statistics,
        account_metrics: {
          account_age_days: accountAge,
          profile_completion: user.profile_completion,
          last_seen: user.last_seen,
          recent_activity: recentActivity,
        },
        preferences: user.preferences,
      },
    });
  } catch (error) {
    logger.error("Error retrieving profile statistics", {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc Update user preferences
 * @route PUT /api/v1/profile/:userId/preferences
 * @access Private (User can update own preferences)
 */
export const updatePreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;
    const preferences = req.body;

    // Authorization: Users can only update their own preferences
    if (userId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update these preferences",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Merge with existing preferences
    const updatedPreferences = {
      ...user.preferences?.toObject(),
      ...preferences,
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        preferences: updatedPreferences,
        updated_at: new Date(),
      },
      { new: true, select: "preferences" },
    );

    // Log preference update
    user.logActivity("setting_change", userId, {
      changed_preferences: Object.keys(preferences),
      timestamp: new Date(),
    });

    logger.info("User preferences updated", {
      userId,
      updatedPreferences: Object.keys(preferences),
    });

    res.status(200).json({
      success: true,
      message: "Preferences updated successfully",
      data: {
        preferences: updatedUser.preferences,
      },
    });
  } catch (error) {
    logger.error("Error updating preferences", {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while updating preferences",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc Get comprehensive user profile with all related data for profile page
 * @route GET /api/v1/profile/me/comprehensive
 * @access Private
 */
export const getComprehensiveProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user with all necessary data (excluding sensitive fields)
    const user = await User.findById(userId).select(
      "-password -two_factor_secret -backup_codes -password_reset_token -email_verification_token -oauth.google.access_token -oauth.google.refresh_token -oauth.facebook.access_token -oauth.facebook.refresh_token -oauth.github.access_token -oauth.github.refresh_token -oauth.linkedin.access_token -oauth.linkedin.refresh_token -oauth.microsoft.access_token -oauth.microsoft.refresh_token -oauth.apple.access_token -oauth.apple.refresh_token",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get enrollments with comprehensive course details using EnrolledCourse model
    const enrollments = await EnrolledCourse.find({
      student_id: userId,
    })
      .populate({
        path: "student_id",
        select: "full_name email role profile_image",
      })
      .populate({
        path: "course_id",
        populate: {
          path: "assigned_instructor",
          select: "full_name email role domain phone_numbers",
          match: { role: { $in: ["instructor"] } },
        },
      })
      .sort({ enrollment_date: -1 });

    // Get comprehensive course statistics
    const courseStats = {
      total_enrolled: enrollments.length,
      active_courses: enrollments.filter((e) => e.status === "active").length,
      completed_courses: enrollments.filter((e) => e.status === "completed")
        .length,
      pending_courses: enrollments.filter((e) => e.status === "pending").length,
      cancelled_courses: enrollments.filter((e) => e.status === "cancelled")
        .length,
      suspended_courses: enrollments.filter((e) => e.status === "suspended")
        .length,
      expired_courses: enrollments.filter((e) => e.status === "expired").length,
      average_progress:
        enrollments.length > 0
          ? enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) /
            enrollments.length
          : 0,
      total_certificates: enrollments.filter((e) => e.is_certified).length,
      total_payments: enrollments.reduce(
        (sum, e) => sum + (e.payment_details?.amount || 0),
        0,
      ),
      individual_enrollments: enrollments.filter(
        (e) => e.enrollment_type === "individual",
      ).length,
      batch_enrollments: enrollments.filter(
        (e) => e.enrollment_type === "batch",
      ).length,
    };

    // Get detailed payment history from enrollments
    const paymentHistory = [];

    // From enrollments
    enrollments.forEach((enrollment) => {
      if (enrollment.payment_details) {
        paymentHistory.push({
          source: "enrollment",
          enrollment_id: enrollment._id,
          course_title: enrollment.course_id?.course_title,
          amount: enrollment.payment_details.amount,
          currency: enrollment.payment_details.currency,
          payment_date: enrollment.payment_details.payment_date,
          payment_method: enrollment.payment_details.payment_method,
          transaction_id: enrollment.payment_details.payment_id,
          payment_status: enrollment.payment_status,
          receipt_url: enrollment.payment_details.receipt_url,
          payment_type: "course_enrollment",
        });
      }
    });

    // Get additional payment data from Order model if available
    try {
      const orders = await Order.find({
        $or: [
          { user_id: userId },
          { student_id: userId },
          { customer_id: userId },
        ],
      }).sort({ createdAt: -1 });

      orders.forEach((order) => {
        paymentHistory.push({
          source: "order",
          order_id: order._id,
          course_title: order.course_name || order.product_name,
          amount: order.amount || order.total,
          currency: order.currency || "USD",
          payment_date: order.createdAt || order.payment_date,
          payment_method: order.payment_method,
          transaction_id: order.transaction_id || order.order_id,
          payment_status: order.status || order.payment_status,
          receipt_url: order.receipt_url,
          payment_type: order.order_type || "purchase",
        });
      });
    } catch (orderError) {
      logger.warn("Could not fetch orders for payment history", {
        userId,
        error: orderError.message,
      });
    }

    // Get EMI payment data from enhanced enrollments
    try {
      const emiEnrollments = await EnrolledCourse.find({
        student_id: userId,
        payment_type: "emi",
      }).populate("course_id", "course_title course_image");

      // Process EMI payments and add to payment history
      emiEnrollments.forEach((enrollment) => {
        // Add main EMI enrollment payment
        if (enrollment.payment_details) {
          paymentHistory.push({
            source: "emi_enrollment",
            enrollment_id: enrollment._id,
            course_title: enrollment.course_id?.course_title,
            amount: enrollment.payment_details.amount,
            currency: enrollment.payment_details.currency,
            payment_date: enrollment.payment_details.payment_date,
            payment_method: enrollment.payment_details.payment_method,
            transaction_id: enrollment.payment_details.payment_id,
            payment_status: enrollment.payment_status,
            payment_type: "emi_enrollment",
            emi_details: {
              total_installments: enrollment.emiDetails?.numberOfInstallments,
              installment_amount: enrollment.emiDetails?.installmentAmount,
              paid_installments:
                enrollment.emiDetails?.schedule?.filter(
                  (s) => s.status === "paid",
                ).length || 0,
              next_payment_date: enrollment.emiDetails?.nextPaymentDate,
              grace_period_days: enrollment.emiDetails?.gracePeriodDays,
            },
          });
        }

        // Add individual EMI installment payments
        if (enrollment.emiDetails?.schedule) {
          enrollment.emiDetails.schedule.forEach((installment, index) => {
            if (installment.status === "paid" && installment.paidDate) {
              paymentHistory.push({
                source: "emi_installment",
                enrollment_id: enrollment._id,
                course_title: enrollment.course_id?.course_title,
                amount: installment.amount,
                currency: enrollment.payment_details?.currency || "USD",
                payment_date: installment.paidDate,
                payment_method: installment.paymentMethod || "unknown",
                transaction_id: installment.transactionId,
                payment_status: "completed",
                payment_type: "emi_installment",
                installment_details: {
                  installment_number: index + 1,
                  due_date: installment.dueDate,
                  late_fee: installment.lateFee || 0,
                },
              });
            }
          });
        }
      });
    } catch (emiError) {
      logger.warn("Could not fetch EMI payment data", {
        userId,
        error: emiError.message,
      });
    }

    // Get quiz/assessment results with detailed info
    const quizResults = await Quiz.find({
      "submissions.student_id": userId,
    }).select(
      "title course_id submissions.$ max_attempts time_limit total_marks",
    );

    // Get certificates earned by the user
    let certificates = [];
    try {
      certificates = await Certificate.find({
        $or: [{ student_id: userId }, { user_id: userId }],
      })
        .populate("course_id", "course_title course_image")
        .sort({ issued_date: -1 });
    } catch (certError) {
      logger.warn("Could not fetch certificates", {
        userId,
        error: certError.message,
      });
    }

    // Get detailed progress data from Progress model
    let detailedProgress = [];
    try {
      detailedProgress = await Progress.find({
        $or: [{ student_id: userId }, { user_id: userId }],
      })
        .populate("course_id", "course_title course_image")
        .sort({ last_updated: -1 });
    } catch (progressError) {
      logger.warn("Could not fetch detailed progress", {
        userId,
        error: progressError.message,
      });
    }

    // Get comprehensive enhanced progress data with detailed analytics
    let enhancedProgressData = [];
    let enhancedAnalytics = {};
    let detailedProgressReports = [];

    try {
      // Get enhanced progress records (from the new comprehensive model)
      enhancedProgressData = await EnhancedProgress.find({
        student: userId,
      })
        .populate(
          "course",
          "course_title course_image course_category course_type duration_weeks",
        )
        .populate(
          "enrollment",
          "enrollment_date status payment_status progress",
        )
        .sort({ lastAccessedAt: -1 });

      // Get detailed progress reports for each course
      detailedProgressReports = enhancedProgressData.map((progress) => ({
        course_id: progress.course._id,
        course_title: progress.course.course_title,
        course_image: progress.course.course_image,
        course_category: progress.course.course_category,
        enrollment_id: progress.enrollment._id,
        enrollment_status: progress.enrollment.status,
        detailed_report: progress.getProgressReport(),
        last_accessed: progress.lastAccessedAt,
        completion_status: progress.completionStatus,
        next_lesson: progress.nextLesson,
        recommended_actions: progress.getRecommendedActions(),
      }));

      // Calculate comprehensive enhanced analytics
      if (enhancedProgressData.length > 0) {
        const completedCourses = enhancedProgressData.filter(
          (p) => p.isCompleted,
        );
        const inProgressCourses = enhancedProgressData.filter(
          (p) =>
            !p.isCompleted && p.overallProgress.overallCompletionPercentage > 0,
        );
        const notStartedCourses = enhancedProgressData.filter(
          (p) => p.overallProgress.overallCompletionPercentage === 0,
        );

        // Aggregate lesson and assessment data
        const totalLessonsCompleted = enhancedProgressData.reduce(
          (sum, p) => sum + p.overallProgress.lessonsCompleted,
          0,
        );
        const totalLessons = enhancedProgressData.reduce(
          (sum, p) => sum + p.courseStructure.totalLessons,
          0,
        );
        const totalAssessmentsCompleted = enhancedProgressData.reduce(
          (sum, p) => sum + p.overallProgress.assessmentsCompleted,
          0,
        );
        const totalAssessments = enhancedProgressData.reduce(
          (sum, p) => sum + p.courseStructure.totalAssessments,
          0,
        );
        const totalTimeSpent = enhancedProgressData.reduce(
          (sum, p) => sum + p.overallProgress.totalTimeSpent,
          0,
        );

        // Calculate average scores
        const quizScores = enhancedProgressData
          .filter((p) => p.overallProgress.averageQuizScore > 0)
          .map((p) => p.overallProgress.averageQuizScore);
        const assignmentScores = enhancedProgressData
          .filter((p) => p.overallProgress.averageAssignmentScore > 0)
          .map((p) => p.overallProgress.averageAssignmentScore);

        // Calculate learning streaks
        const allStreaks = enhancedProgressData.map((p) => ({
          current: p.learningAnalytics.studyStreak.current,
          longest: p.learningAnalytics.studyStreak.longest,
        }));

        enhancedAnalytics = {
          // Course-level analytics
          total_courses_tracked: enhancedProgressData.length,
          completed_courses: completedCourses.length,
          in_progress_courses: inProgressCourses.length,
          not_started_courses: notStartedCourses.length,
          course_completion_rate:
            enhancedProgressData.length > 0
              ? (completedCourses.length / enhancedProgressData.length) * 100
              : 0,

          // Lesson-level analytics
          total_lessons_completed: totalLessonsCompleted,
          total_lessons_available: totalLessons,
          lesson_completion_rate:
            totalLessons > 0 ? (totalLessonsCompleted / totalLessons) * 100 : 0,

          // Assessment analytics
          total_assessments_completed: totalAssessmentsCompleted,
          total_assessments_available: totalAssessments,
          assessment_completion_rate:
            totalAssessments > 0
              ? (totalAssessmentsCompleted / totalAssessments) * 100
              : 0,
          average_quiz_score:
            quizScores.length > 0
              ? quizScores.reduce((sum, score) => sum + score, 0) /
                quizScores.length
              : 0,
          average_assignment_score:
            assignmentScores.length > 0
              ? assignmentScores.reduce((sum, score) => sum + score, 0) /
                assignmentScores.length
              : 0,

          // Time and engagement analytics
          total_learning_time: totalTimeSpent,
          average_time_per_course:
            enhancedProgressData.length > 0
              ? totalTimeSpent / enhancedProgressData.length
              : 0,
          average_time_per_lesson:
            totalLessonsCompleted > 0
              ? totalTimeSpent / totalLessonsCompleted
              : 0,

          // Study patterns and streaks
          current_active_streak: Math.max(
            ...allStreaks.map((s) => s.current),
            0,
          ),
          longest_study_streak: Math.max(
            ...allStreaks.map((s) => s.longest),
            0,
          ),
          average_completion_percentage:
            enhancedProgressData.length > 0
              ? enhancedProgressData.reduce(
                  (sum, p) =>
                    sum + p.overallProgress.overallCompletionPercentage,
                  0,
                ) / enhancedProgressData.length
              : 0,

          // Course type breakdown
          course_type_breakdown: enhancedProgressData.reduce((acc, p) => {
            const courseType = p.course.course_type || "unknown";
            if (!acc[courseType]) {
              acc[courseType] = { count: 0, completed: 0, total_progress: 0 };
            }
            acc[courseType].count++;
            if (p.isCompleted) acc[courseType].completed++;
            acc[courseType].total_progress +=
              p.overallProgress.overallCompletionPercentage;
            return acc;
          }, {}),

          // Category breakdown
          category_breakdown: enhancedProgressData.reduce((acc, p) => {
            const category = p.course.course_category || "uncategorized";
            if (!acc[category]) {
              acc[category] = { count: 0, completed: 0, average_progress: 0 };
            }
            acc[category].count++;
            if (p.isCompleted) acc[category].completed++;
            acc[category].average_progress =
              (acc[category].average_progress +
                p.overallProgress.overallCompletionPercentage) /
              acc[category].count;
            return acc;
          }, {}),

          // Weekly activity aggregation
          weekly_activity_summary: enhancedProgressData.reduce((summary, p) => {
            p.learningAnalytics.weeklyActivity.forEach((week) => {
              if (!summary[week.week]) {
                summary[week.week] = {
                  lessons_completed: 0,
                  time_spent: 0,
                  quizzes_attempted: 0,
                  courses_active: 0,
                  total_score: 0,
                  score_count: 0,
                };
              }
              summary[week.week].lessons_completed +=
                week.lessonsCompleted || 0;
              summary[week.week].time_spent += week.timeSpent || 0;
              summary[week.week].quizzes_attempted +=
                week.quizzesAttempted || 0;
              summary[week.week].courses_active++;
              if (week.averageScore > 0) {
                summary[week.week].total_score += week.averageScore;
                summary[week.week].score_count++;
              }
            });
            return summary;
          }, {}),

          // Learning preferences and patterns
          learning_patterns: {
            strong_areas: [
              ...new Set(
                enhancedProgressData.flatMap(
                  (p) => p.learningAnalytics.strongAreas || [],
                ),
              ),
            ],
            improvement_areas: [
              ...new Set(
                enhancedProgressData.flatMap(
                  (p) => p.learningAnalytics.improvementAreas || [],
                ),
              ),
            ],
            preferred_study_times: enhancedProgressData.reduce((acc, p) => {
              const time = p.learningAnalytics.preferredStudyTime;
              acc[time] = (acc[time] || 0) + 1;
              return acc;
            }, {}),
            most_active_time: null, // Will be calculated below
          },
        };

        // Calculate most active study time
        const studyTimes =
          enhancedAnalytics.learning_patterns.preferred_study_times;
        enhancedAnalytics.learning_patterns.most_active_time = Object.keys(
          studyTimes,
        ).reduce((a, b) => (studyTimes[a] > studyTimes[b] ? a : b), "evening");
      }
    } catch (enhancedProgressError) {
      logger.warn("Could not fetch enhanced progress data", {
        userId,
        error: enhancedProgressError.message,
      });
    }

    // Comprehensive learning analytics with enhanced progress integration
    const learningAnalytics = {
      // Core learning metrics
      total_learning_time: Math.max(
        user.statistics?.learning?.total_learning_time || 0,
        enhancedAnalytics.total_learning_time || 0,
      ),
      current_streak: Math.max(
        user.statistics?.learning?.current_streak || 0,
        enhancedAnalytics.current_active_streak || 0,
      ),
      longest_streak: Math.max(
        user.statistics?.learning?.longest_streak || 0,
        enhancedAnalytics.longest_study_streak || 0,
      ),

      // Achievement and recognition metrics
      certificates_earned: certificates.length,
      skill_points: user.statistics?.learning?.skill_points || 0,
      achievements_unlocked:
        user.statistics?.learning?.achievements_unlocked || 0,

      // Course completion metrics
      total_courses_enrolled: courseStats.total_enrolled,
      total_courses_completed: Math.max(
        courseStats.completed_courses,
        enhancedAnalytics.completed_courses || 0,
      ),
      completion_rate:
        courseStats.total_enrolled > 0
          ? (Math.max(
              courseStats.completed_courses,
              enhancedAnalytics.completed_courses || 0,
            ) /
              courseStats.total_enrolled) *
            100
          : 0,

      // Enhanced course analytics from detailed tracking
      courses_in_progress: enhancedAnalytics.in_progress_courses || 0,
      courses_not_started: enhancedAnalytics.not_started_courses || 0,
      course_completion_rate: enhancedAnalytics.course_completion_rate || 0,

      // Lesson-level analytics (from enhanced progress)
      total_lessons_completed: Math.max(
        detailedProgress.reduce(
          (sum, progress) => sum + (progress.lessons_completed || 0),
          0,
        ),
        enhancedAnalytics.total_lessons_completed || 0,
      ),
      total_lessons_available: enhancedAnalytics.total_lessons_available || 0,
      lesson_completion_rate: enhancedAnalytics.lesson_completion_rate || 0,

      // Assessment and performance metrics
      total_assessments_completed: Math.max(
        detailedProgress.reduce(
          (sum, progress) => sum + (progress.assignments_completed || 0),
          0,
        ),
        enhancedAnalytics.total_assessments_completed || 0,
      ),
      total_assessments_available:
        enhancedAnalytics.total_assessments_available || 0,
      assessment_completion_rate:
        enhancedAnalytics.assessment_completion_rate || 0,

      // Scoring and performance analytics
      average_quiz_score: Math.max(
        quizResults.length > 0
          ? quizResults.reduce((sum, quiz) => {
              const userSubmission = quiz.submissions.find(
                (s) => s.student_id.toString() === userId,
              );
              return sum + (userSubmission?.score || 0);
            }, 0) / quizResults.length
          : 0,
        enhancedAnalytics.average_quiz_score || 0,
      ),
      average_assignment_score: enhancedAnalytics.average_assignment_score || 0,
      overall_performance_rating:
        enhancedAnalytics.average_quiz_score &&
        enhancedAnalytics.average_assignment_score
          ? (enhancedAnalytics.average_quiz_score +
              enhancedAnalytics.average_assignment_score) /
            2
          : enhancedAnalytics.average_quiz_score ||
            enhancedAnalytics.average_assignment_score ||
            0,

      // Time and engagement analytics
      average_time_per_course: enhancedAnalytics.average_time_per_course || 0,
      average_time_per_lesson: Math.max(
        detailedProgress.length > 0
          ? detailedProgress.reduce(
              (sum, progress) => sum + (progress.average_lesson_time || 0),
              0,
            ) / detailedProgress.length
          : 0,
        enhancedAnalytics.average_time_per_lesson || 0,
      ),
      total_quiz_attempts: quizResults.reduce(
        (sum, quiz) =>
          sum +
          quiz.submissions.filter((s) => s.student_id.toString() === userId)
            .length,
        0,
      ),

      // Activity tracking
      last_learning_activity: Math.max(
        detailedProgress.length > 0
          ? Math.max(
              ...detailedProgress.map((p) =>
                new Date(p.last_updated || 0).getTime(),
              ),
            )
          : 0,
        enhancedProgressData.length > 0
          ? Math.max(
              ...enhancedProgressData.map((p) =>
                new Date(p.lastAccessedAt || 0).getTime(),
              ),
            )
          : 0,
      ),

      // Comprehensive enhanced progress analytics
      enhanced_progress: {
        // Detailed tracking metrics
        total_courses_tracked: enhancedAnalytics.total_courses_tracked || 0,
        completed_courses_tracked: enhancedAnalytics.completed_courses || 0,
        in_progress_courses_tracked: enhancedAnalytics.in_progress_courses || 0,
        average_completion_percentage:
          enhancedAnalytics.average_completion_percentage || 0,

        // Course type and category breakdown
        course_type_breakdown: enhancedAnalytics.course_type_breakdown || {},
        category_breakdown: enhancedAnalytics.category_breakdown || {},

        // Learning patterns and preferences
        learning_patterns: enhancedAnalytics.learning_patterns || {
          strong_areas: [],
          improvement_areas: [],
          preferred_study_times: {},
          most_active_time: "evening",
        },

        // Weekly activity patterns
        weekly_activity_summary:
          enhancedAnalytics.weekly_activity_summary || {},

        // Detailed progress reports for active courses
        detailed_course_reports: detailedProgressReports.slice(0, 10), // Limit to top 10 most recent
      },
    };

    // Enhanced social metrics
    const socialMetrics = {
      followers_count: user.statistics?.social?.followers_count || 0,
      following_count: user.statistics?.social?.following_count || 0,
      reviews_written: user.statistics?.social?.reviews_written || 0,
      discussions_participated:
        user.statistics?.social?.discussions_participated || 0,
      content_shared: user.statistics?.social?.content_shared || 0,
      community_reputation: user.statistics?.social?.community_reputation || 0,
      profile_views: user.statistics?.social?.profile_views || 0,
      likes_received: user.statistics?.social?.likes_received || 0,
    };

    // Enhanced engagement metrics with login analytics
    const engagementMetrics = {
      total_logins: user.statistics?.engagement?.total_logins || 0,
      total_session_time: user.statistics?.engagement?.total_session_time || 0,
      avg_session_duration:
        user.statistics?.engagement?.avg_session_duration || 0,
      last_active_date:
        user.statistics?.engagement?.last_active_date || user.last_seen,
      consecutive_active_days:
        user.statistics?.engagement?.consecutive_active_days || 0,
      total_page_views: user.statistics?.engagement?.total_page_views || 0,
      login_frequency: user.getLoginStats?.()?.login_frequency || {
        daily: 0,
        weekly: 0,
        monthly: 0,
      },
      device_preference: user.getDevicePreference?.() || "Unknown",
      browser_preference: user.getBrowserPreference?.() || "Unknown",
      login_pattern: user.getLoginPattern?.() || {
        pattern: "unknown",
        description: "No pattern data",
      },
    };

    // Enhanced financial metrics with comprehensive payment and EMI analysis
    const totalSpentFromPayments = paymentHistory.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0,
    );

    // Separate payment types for detailed analysis
    const regularPayments = paymentHistory.filter(
      (p) => !p.payment_type?.includes("emi"),
    );
    const emiPayments = paymentHistory.filter((p) =>
      p.payment_type?.includes("emi"),
    );
    const installmentPayments = paymentHistory.filter(
      (p) => p.payment_type === "emi_installment",
    );
    const emiEnrollments = paymentHistory.filter(
      (p) => p.payment_type === "emi_enrollment",
    );

    // Calculate EMI-specific metrics
    const emiMetrics = {
      total_emi_enrollments: emiEnrollments.length,
      total_emi_amount: emiEnrollments.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0,
      ),
      total_installments_paid: installmentPayments.length,
      total_installment_amount: installmentPayments.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0,
      ),
      pending_emi_enrollments: enrollments.filter(
        (e) =>
          e.payment_type === "emi" &&
          ["pending", "active"].includes(e.payment_status),
      ).length,
      upcoming_installments: enrollments.reduce((count, enrollment) => {
        if (
          enrollment.payment_type === "emi" &&
          enrollment.emiDetails?.schedule
        ) {
          return (
            count +
            enrollment.emiDetails.schedule.filter((s) => s.status === "pending")
              .length
          );
        }
        return count;
      }, 0),
      overdue_installments: enrollments.reduce((count, enrollment) => {
        if (
          enrollment.payment_type === "emi" &&
          enrollment.emiDetails?.schedule
        ) {
          const now = new Date();
          return (
            count +
            enrollment.emiDetails.schedule.filter(
              (s) => s.status === "pending" && new Date(s.dueDate) < now,
            ).length
          );
        }
        return count;
      }, 0),
      emi_completion_rate:
        emiEnrollments.length > 0
          ? (emiEnrollments.filter((payment) => {
              const enrollment = enrollments.find(
                (e) => e._id.toString() === payment.enrollment_id?.toString(),
              );
              if (!enrollment?.emiDetails?.schedule) return false;
              const totalInstallments = enrollment.emiDetails.schedule.length;
              const paidInstallments = enrollment.emiDetails.schedule.filter(
                (s) => s.status === "paid",
              ).length;
              return paidInstallments === totalInstallments;
            }).length /
              emiEnrollments.length) *
            100
          : 0,
    };

    // Calculate comprehensive financial metrics
    const financialMetrics = {
      // Core spending metrics
      total_spent: Math.max(courseStats.total_payments, totalSpentFromPayments),
      regular_payments_total: regularPayments.reduce(
        (sum, p) => sum + (p.amount || 0),
        0,
      ),
      emi_payments_total: emiPayments.reduce(
        (sum, p) => sum + (p.amount || 0),
        0,
      ),

      // Course and subscription metrics
      total_courses_purchased: courseStats.total_enrolled,
      subscription_months: user.statistics?.financial?.subscription_months || 0,
      lifetime_value: Math.max(
        courseStats.total_payments,
        totalSpentFromPayments,
      ),

      // Average and per-course costs
      average_course_cost:
        courseStats.total_enrolled > 0
          ? totalSpentFromPayments / courseStats.total_enrolled
          : 0,
      average_transaction_amount:
        paymentHistory.length > 0
          ? totalSpentFromPayments / paymentHistory.length
          : 0,
      highest_single_payment: Math.max(
        ...paymentHistory.map((p) => p.amount || 0),
        0,
      ),

      // Payment method analytics
      payment_methods_used: [
        ...new Set(paymentHistory.map((p) => p.payment_method).filter(Boolean)),
      ],
      payment_method_distribution: paymentHistory.reduce((acc, payment) => {
        const method = payment.payment_method || "unknown";
        if (!acc[method]) {
          acc[method] = { count: 0, total_amount: 0 };
        }
        acc[method].count++;
        acc[method].total_amount += payment.amount || 0;
        return acc;
      }, {}),
      most_used_payment_method:
        paymentHistory.length > 0
          ? Object.entries(
              paymentHistory.reduce((acc, payment) => {
                const method = payment.payment_method || "unknown";
                acc[method] = (acc[method] || 0) + 1;
                return acc;
              }, {}),
            ).sort(([, a], [, b]) => b - a)[0]?.[0]
          : null,

      // Transaction status analytics
      successful_transactions: paymentHistory.filter((p) =>
        ["completed", "success", "paid"].includes(
          p.payment_status?.toLowerCase(),
        ),
      ).length,
      failed_transactions: paymentHistory.filter((p) =>
        ["failed", "cancelled", "rejected"].includes(
          p.payment_status?.toLowerCase(),
        ),
      ).length,
      pending_transactions: paymentHistory.filter((p) =>
        ["pending", "processing"].includes(p.payment_status?.toLowerCase()),
      ).length,
      transaction_success_rate:
        paymentHistory.length > 0
          ? (paymentHistory.filter((p) =>
              ["completed", "success", "paid"].includes(
                p.payment_status?.toLowerCase(),
              ),
            ).length /
              paymentHistory.length) *
            100
          : 100,

      // EMI-specific metrics
      emi_metrics: emiMetrics,

      // Spending patterns and trends
      monthly_spending: paymentHistory.reduce((acc, payment) => {
        const month = new Date(payment.payment_date).toISOString().slice(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = { total: 0, count: 0, types: {} };
        }
        acc[month].total += payment.amount || 0;
        acc[month].count++;
        acc[month].types[payment.payment_type] =
          (acc[month].types[payment.payment_type] || 0) + (payment.amount || 0);
        return acc;
      }, {}),

      // Payment timing analytics
      payment_frequency: {
        last_payment_date:
          paymentHistory.length > 0
            ? Math.max(
                ...paymentHistory.map((p) =>
                  new Date(p.payment_date).getTime(),
                ),
              )
            : null,
        first_payment_date:
          paymentHistory.length > 0
            ? Math.min(
                ...paymentHistory.map((p) =>
                  new Date(p.payment_date).getTime(),
                ),
              )
            : null,
        average_days_between_payments:
          paymentHistory.length > 1
            ? calculateAverageDaysBetweenPayments(paymentHistory)
            : 0,
      },

      // Financial health indicators
      financial_health: {
        pending_payment_ratio:
          enrollments.length > 0
            ? (enrollments.filter((e) => e.payment_status === "pending")
                .length /
                enrollments.length) *
              100
            : 0,
        emi_default_risk:
          emiMetrics.overdue_installments > 0
            ? "high"
            : emiMetrics.upcoming_installments > 3
              ? "medium"
              : "low",
        payment_consistency: calculatePaymentConsistency(paymentHistory),
        total_outstanding_amount: calculateOutstandingAmount(enrollments),
      },
    };

    // Helper function to calculate average days between payments
    function calculateAverageDaysBetweenPayments(payments) {
      if (payments.length < 2) return 0;

      const sortedDates = payments
        .map((p) => new Date(p.payment_date))
        .sort((a, b) => a - b);

      let totalDays = 0;
      for (let i = 1; i < sortedDates.length; i++) {
        const daysDiff =
          (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
        totalDays += daysDiff;
      }

      return Math.round(totalDays / (sortedDates.length - 1));
    }

    // Helper function to calculate payment consistency score
    function calculatePaymentConsistency(payments) {
      if (payments.length < 3) return 100; // Too few payments to determine consistency

      const successfulPayments = payments.filter((p) =>
        ["completed", "success", "paid"].includes(
          p.payment_status?.toLowerCase(),
        ),
      );

      const consistencyScore =
        (successfulPayments.length / payments.length) * 100;

      if (consistencyScore >= 95) return "excellent";
      if (consistencyScore >= 80) return "good";
      if (consistencyScore >= 60) return "fair";
      return "poor";
    }

    // Helper function to calculate total outstanding amount
    function calculateOutstandingAmount(enrollments) {
      return enrollments.reduce((total, enrollment) => {
        if (
          enrollment.payment_type === "emi" &&
          enrollment.emiDetails?.schedule
        ) {
          const pendingInstallments = enrollment.emiDetails.schedule.filter(
            (s) => s.status === "pending",
          );
          const pendingAmount = pendingInstallments.reduce(
            (sum, installment) => sum + (installment.amount || 0),
            0,
          );
          return total + pendingAmount;
        }
        if (enrollment.payment_status === "pending") {
          return total + (enrollment.payment_details?.amount || 0);
        }
        return total;
      }, 0);
    }

    // Comprehensive account status
    const accountStatus = {
      is_active: user.is_active,
      is_banned: user.is_banned,
      ban_reason: user.ban_reason,
      ban_expires: user.ban_expires,
      email_verified: user.email_verified,
      phone_verified: user.phone_verified,
      identity_verified: user.identity_verified,
      account_type: user.account_type,
      subscription_status: user.subscription_status,
      subscription_plan: user.subscription_plan,
      subscription_start: user.subscription_start,
      subscription_end: user.subscription_end,
      trial_used: user.trial_used,
      two_factor_enabled: user.two_factor_enabled,
      failed_login_attempts: user.failed_login_attempts,
      account_locked_until: user.account_locked_until,
    };

    // Enhanced device and security information
    const deviceInfo = {
      registered_devices: user.devices?.length || 0,
      trusted_devices: user.devices?.filter((d) => d.is_trusted).length || 0,
      active_sessions: user.sessions?.filter((s) => s.is_active).length || 0,
      last_login_device: user.devices?.find((d) => d.is_primary) || null,
      device_breakdown: user.getDeviceBreakdown?.(user.devices) || {
        mobile: 0,
        tablet: 0,
        desktop: 0,
      },
      unique_ip_addresses: user.login_analytics?.unique_ips?.length || 0,
      security_score: user.getSecurityScore?.() || 100,
      recent_login_locations:
        user.devices?.slice(0, 5).map((d) => ({
          device_type: d.device_type,
          last_seen: d.last_seen,
          location: d.ip_addresses?.[0]?.city || "Unknown",
        })) || [],
    };

    // Recent activity with more details
    const recentActivity = (user.activity_log?.slice(-20) || []).map(
      (activity) => ({
        action: activity.action,
        resource: activity.resource,
        timestamp: activity.timestamp,
        details: activity.details,
        ip_address: activity.metadata?.ip_address,
        device_type: activity.metadata?.device_type,
        duration: activity.duration,
      }),
    );

    // Profile completion calculation
    const profileCompletion = user.profile_completion || 0;

    // Calculate account age
    const accountAge = Math.floor(
      (new Date() - user.created_at) / (1000 * 60 * 60 * 24),
    );

    // Current active learning
    const activeLearning = enrollments
      .filter(
        (e) => e.status === "active" && e.progress > 0 && e.progress < 100,
      )
      .sort(
        (a, b) =>
          new Date(b.last_accessed || 0) - new Date(a.last_accessed || 0),
      )
      .slice(0, 10)
      .map((e) => ({
        enrollment_id: e._id,
        course_title: e.course_id?.course_title,
        course_image: e.course_id?.course_image,
        progress: e.progress || 0,
        lessons_completed: e.completed_lessons?.length || 0,
        last_accessed: e.last_accessed,
        instructor: e.course_id?.assigned_instructor,
      }));

    // Course categories and learning paths
    const learningPaths = enrollments.reduce((paths, enrollment) => {
      const category = enrollment.course_id?.course_category;
      if (category) {
        if (!paths[category]) {
          paths[category] = {
            category: category,
            courses_count: 0,
            completed_count: 0,
            total_progress: 0,
          };
        }
        paths[category].courses_count++;
        if (enrollment.status === "completed")
          paths[category].completed_count++;
        paths[category].total_progress += enrollment.progress || 0;
      }
      return paths;
    }, {});

    // Convert to array and calculate averages
    const learningPathsArray = Object.values(learningPaths).map((path) => ({
      ...path,
      average_progress:
        path.courses_count > 0 ? path.total_progress / path.courses_count : 0,
    }));

    // Log profile view activity
    user.logActivity("profile_view", userId, {
      view_type: "comprehensive_view",
      timestamp: new Date(),
      sections_accessed: [
        "basic_info",
        "learning_analytics",
        "payment_history",
        "device_info",
      ],
    });

    // Transform enrollments to match the enrolled student endpoint format
    const enrollmentsWithPaymentInfo = enrollments.map((enrollment) => {
      const enrollmentObj = enrollment.toObject();
      enrollmentObj.payment_type = "course";
      return enrollmentObj;
    });

    // Comprehensive response structure for profile page
    const response = {
      success: true,
      message: "Comprehensive profile retrieved successfully",
      data: {
        // Editable basic user information (email excluded)
        basic_info: {
          id: user._id,
          full_name: user.full_name,
          username: user.username,
          student_id: user.student_id,
          phone_numbers: user.phone_numbers || [],
          age: user.age,
          age_group: user.age_group,
          address: user.address,
          organization: user.organization,
          bio: user.bio,
          country: user.country,
          timezone: user.timezone,
          // Social links (all editable)
          facebook_link: user.facebook_link,
          instagram_link: user.instagram_link,
          linkedin_link: user.linkedin_link,
          twitter_link: user.twitter_link,
          youtube_link: user.youtube_link,
          github_link: user.github_link,
          portfolio_link: user.portfolio_link,
          // Read-only fields
          email: user.email, // Read-only for display
          role: user.role,
          admin_role: user.admin_role,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_seen: user.last_seen,
          profile_completion: profileCompletion,
        },

        // Editable profile media
        profile_media: {
          user_image: user.user_image || {
            url: null,
            public_id: null,
            alt_text: null,
          },
          cover_image: user.cover_image || {
            url: null,
            public_id: null,
            alt_text: null,
          },
        },

        // Editable personal details and metadata
        personal_details: {
          date_of_birth: user.meta?.date_of_birth,
          gender: user.meta?.gender,
          nationality: user.meta?.nationality,
          languages_spoken: user.meta?.languages_spoken || [],
          occupation: user.meta?.occupation,
          industry: user.meta?.industry,
          company: user.meta?.company,
          experience_level: user.meta?.experience_level,
          annual_income_range: user.meta?.annual_income_range,
          education_level: user.meta?.education_level,
          institution_name: user.meta?.institution_name,
          field_of_study: user.meta?.field_of_study,
          graduation_year: user.meta?.graduation_year,
          skills: user.meta?.skills || [],
          certifications: user.meta?.certifications || [],
          learning_goals: user.meta?.learning_goals || [],
          preferred_learning_style: user.meta?.preferred_learning_style,
          available_time_per_week: user.meta?.available_time_per_week,
          preferred_study_times: user.meta?.preferred_study_times || [],
          interests: user.meta?.interests || [],
        },

        // Account status (mostly read-only with some editable preferences)
        account_status: accountStatus,

        // Comprehensive learning analytics
        learning_analytics: learningAnalytics,

        // Detailed course and enrollment data - matching enrolled student endpoint format
        education: {
          course_stats: courseStats,
          learning_paths: learningPathsArray,
          enrollments: enrollmentsWithPaymentInfo,
          active_learning: activeLearning,
          quiz_results: quizResults.map((quiz) => ({
            quiz_id: quiz._id,
            title: quiz.title,
            course_id: quiz.course_id,
            max_attempts: quiz.max_attempts,
            time_limit: quiz.time_limit,
            total_marks: quiz.total_marks,
            user_score:
              quiz.submissions.find((s) => s.student_id.toString() === userId)
                ?.score || 0,
            attempts_used: quiz.submissions.filter(
              (s) => s.student_id.toString() === userId,
            ).length,
          })),
          certificates: certificates.map((cert) => ({
            certificate_id: cert._id,
            course_id: cert.course_id?._id,
            course_title: cert.course_id?.course_title,
            course_image: cert.course_id?.course_image,
            certificate_number: cert.certificate_number,
            issued_date: cert.issued_date,
            certificate_url: cert.certificate_url,
            certificate_type: cert.certificate_type,
            grade: cert.grade,
            instructor_name: cert.instructor_name,
            valid_until: cert.valid_until,
            verification_url: cert.verification_url,
          })),
          detailed_progress: detailedProgress.map((progress) => ({
            progress_id: progress._id,
            course_id: progress.course_id?._id,
            course_title: progress.course_id?.course_title,
            course_image: progress.course_id?.course_image,
            overall_progress: progress.overall_progress,
            lessons_completed: progress.lessons_completed,
            assignments_completed: progress.assignments_completed,
            quizzes_completed: progress.quizzes_completed,
            last_updated: progress.last_updated,
            time_spent: progress.time_spent,
            average_lesson_time: progress.average_lesson_time,
            learning_path: progress.learning_path,
            milestones_reached: progress.milestones_reached,
          })),

          // Enhanced progress tracking data with comprehensive lesson and assessment details
          enhanced_progress: enhancedProgressData.map((progress) => ({
            // Basic progress information
            progress_id: progress._id,
            student_id: progress.student,
            course_id: progress.course?._id,
            course_title: progress.course?.course_title,
            course_image: progress.course?.course_image,
            course_category: progress.course?.course_category,
            course_type: progress.course?.course_type,
            enrollment_id: progress.enrollment?._id,
            enrollment_status: progress.enrollment?.status,

            // Course structure and completion overview
            course_structure: progress.courseStructure,
            overall_progress: progress.overallProgress,
            is_completed: progress.isCompleted,
            completed_at: progress.completedAt,
            completion_status: progress.completionStatus,

            // Detailed lesson progress
            lesson_progress: {
              total_lessons: progress.lessonProgress.length,
              completed_lessons: progress.lessonProgress.filter(
                (l) => l.status === "completed",
              ).length,
              in_progress_lessons: progress.lessonProgress.filter(
                (l) => l.status === "in_progress",
              ).length,
              not_started_lessons: progress.lessonProgress.filter(
                (l) => l.status === "not_started",
              ).length,
              skipped_lessons: progress.lessonProgress.filter(
                (l) => l.status === "skipped",
              ).length,

              // Lesson type breakdown
              lesson_type_breakdown: progress.lessonProgress.reduce(
                (acc, lesson) => {
                  acc[lesson.lessonType] = (acc[lesson.lessonType] || 0) + 1;
                  return acc;
                },
                {},
              ),

              // Video progress analytics
              video_analytics: {
                total_video_duration: progress.lessonProgress.reduce(
                  (sum, lesson) =>
                    sum + (lesson.videoProgress?.totalDuration || 0),
                  0,
                ),
                total_watched_duration: progress.lessonProgress.reduce(
                  (sum, lesson) =>
                    sum + (lesson.videoProgress?.watchedDuration || 0),
                  0,
                ),
                average_watch_percentage:
                  progress.lessonProgress.length > 0
                    ? progress.lessonProgress.reduce(
                        (sum, lesson) =>
                          sum + (lesson.videoProgress?.watchedPercentage || 0),
                        0,
                      ) / progress.lessonProgress.length
                    : 0,
              },

              // Recent lesson activity
              recent_lessons: progress.lessonProgress
                .sort(
                  (a, b) =>
                    new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt),
                )
                .slice(0, 5)
                .map((lesson) => ({
                  lesson_id: lesson.lessonId,
                  week_id: lesson.weekId,
                  section_id: lesson.sectionId,
                  lesson_type: lesson.lessonType,
                  status: lesson.status,
                  progress_percentage: lesson.progressPercentage,
                  time_spent: lesson.timeSpent,
                  last_accessed: lesson.lastAccessedAt,
                  attempts: lesson.attempts,
                })),
            },

            // Assessment progress details
            assessment_progress: {
              total_assessments: progress.assessmentProgress.length,
              completed_assessments: progress.assessmentProgress.filter(
                (a) => a.status === "completed",
              ).length,
              passed_assessments: progress.assessmentProgress.filter(
                (a) => a.isPassed,
              ).length,

              // Assessment type breakdown
              assessment_type_breakdown: progress.assessmentProgress.reduce(
                (acc, assessment) => {
                  acc[assessment.assessmentType] =
                    (acc[assessment.assessmentType] || 0) + 1;
                  return acc;
                },
                {},
              ),

              // Performance metrics
              average_score:
                progress.assessmentProgress.length > 0
                  ? progress.assessmentProgress.reduce(
                      (sum, assessment) => sum + (assessment.bestScore || 0),
                      0,
                    ) / progress.assessmentProgress.length
                  : 0,

              // Recent assessments
              recent_assessments: progress.assessmentProgress
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                .slice(0, 5)
                .map((assessment) => ({
                  assessment_id: assessment.assessmentId,
                  assessment_type: assessment.assessmentType,
                  status: assessment.status,
                  best_score: assessment.bestScore,
                  average_score: assessment.averageScore,
                  is_passed: assessment.isPassed,
                  total_attempts: assessment.attempts.length,
                  total_time_spent: assessment.totalTimeSpent,
                })),
            },

            // Learning path and navigation
            learning_path: progress.learningPath,
            next_lesson: progress.nextLesson,

            // Learning analytics and insights
            learning_analytics: progress.learningAnalytics,

            // Recommended actions
            recommended_actions: progress.getRecommendedActions(),

            // Timestamps and access information
            first_accessed: progress.firstAccessedAt,
            last_accessed: progress.lastAccessedAt,
            created_at: progress.createdAt,
            updated_at: progress.updatedAt,
          })),
        },

        // Social metrics and community engagement
        social_metrics: socialMetrics,

        // Enhanced engagement and usage analytics
        engagement_metrics: engagementMetrics,

        // Comprehensive financial information
        financial_metrics: financialMetrics,
        payment_history: paymentHistory.sort(
          (a, b) => new Date(b.payment_date) - new Date(a.payment_date),
        ),

        // Device and security information
        device_info: deviceInfo,

        // Editable user preferences and settings
        preferences: user.preferences || {
          theme: "auto",
          language: "en",
          currency: "USD",
          timezone: "UTC",
          notifications: {},
          privacy: {},
          accessibility: {},
          content: {},
        },

        // Recent activity with enhanced details
        recent_activity: recentActivity,

        // Account insights and performance indicators
        account_insights: {
          account_age_days: accountAge,
          member_since: user.created_at,
          profile_completion_percentage: profileCompletion,
          verification_status: {
            email: user.email_verified,
            phone: user.phone_verified,
            identity: user.identity_verified,
          },
          subscription_info: {
            is_subscribed: user.subscription_status === "active",
            plan: user.subscription_plan,
            expires: user.subscription_end,
            trial_used: user.trial_used,
          },
          security_info: {
            two_factor_enabled: user.two_factor_enabled,
            security_score: deviceInfo.security_score,
            trusted_devices: deviceInfo.trusted_devices,
            recent_login_attempts: user.failed_login_attempts,
          },
        },

        // Performance indicators
        performance_indicators: {
          learning_consistency: learningAnalytics.current_streak,
          engagement_level:
            engagementMetrics.avg_session_duration > 1800
              ? "high"
              : engagementMetrics.avg_session_duration > 900
                ? "medium"
                : "low",
          progress_rate: courseStats.average_progress,
          community_involvement: socialMetrics.community_reputation,
          payment_health:
            enrollments.length > 0
              ? (enrollments.filter((e) => e.payment_status === "completed")
                  .length /
                  enrollments.length) *
                100
              : 100,
        },
      },
    };

    logger.info("Comprehensive profile retrieved successfully", {
      userId,
      profileCompletion,
      coursesEnrolled: courseStats.total_enrolled,
      engagementLevel: response.data.performance_indicators.engagement_level,
      paymentHistory: paymentHistory.length,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error("Error retrieving comprehensive profile", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving comprehensive profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc Update comprehensive user profile (excluding email)
 * @route PUT /api/v1/profile/me/comprehensive
 * @access Private
 */
export const updateComprehensiveProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const userId = req.user.id;
    const updateData = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Fields that cannot be updated through this endpoint
    const protectedFields = [
      "email",
      "_id",
      "role",
      "admin_role",
      "is_active",
      "is_banned",
      "ban_reason",
      "ban_expires",
      "account_type",
      "subscription_status",
      "subscription_plan",
      "subscription_start",
      "subscription_end",
      "email_verified",
      "phone_verified",
      "identity_verified",
      "two_factor_enabled",
      "failed_login_attempts",
      "account_locked_until",
      "created_at",
      "statistics",
      "devices",
      "sessions",
      "activity_log",
    ];

    // Remove protected fields from update data
    protectedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        delete updateData[field];
        logger.warn(`Attempted to update protected field: ${field}`, {
          userId,
        });
      }
    });

    // Handle password update separately if provided
    if (updateData.password) {
      if (updateData.password.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Password cannot be empty",
        });
      }

      // Hash the new password
      const salt = await bcrypt.genSalt(12);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    // Handle phone number updates
    if (updateData.phone_numbers) {
      // Validate phone numbers format
      for (const phone of updateData.phone_numbers) {
        if (!phone.country || !phone.number) {
          return res.status(400).json({
            success: false,
            message: "Phone numbers must have both country and number fields",
          });
        }
      }
      // If phone number changes, reset verification
      if (
        JSON.stringify(user.phone_numbers) !==
        JSON.stringify(updateData.phone_numbers)
      ) {
        updateData.phone_verified = false;
      }
    }

    // Handle nested object updates for meta data
    if (updateData.meta) {
      const existingMeta = user.meta?.toObject() || {};
      const newMeta = { ...existingMeta };

      // Clean up empty string values from the request before processing
      const cleanedMeta = {};
      Object.keys(updateData.meta).forEach((key) => {
        const value = updateData.meta[key];

        // Only include non-empty values in the cleaned meta
        if (value !== undefined && value !== null) {
          if (typeof value === "string") {
            // Only include non-empty strings
            if (value.trim() !== "") {
              cleanedMeta[key] = value.trim();
            }
            // If empty string, don't include it (preserves existing data)
          } else if (Array.isArray(value)) {
            // Always include arrays (even empty ones)
            cleanedMeta[key] = value;
          } else {
            // Include other types (numbers, booleans, etc.)
            cleanedMeta[key] = value;
          }
        }
      });

      // Process each cleaned meta field
      Object.keys(cleanedMeta).forEach((key) => {
        const value = cleanedMeta[key];

        // Handle special cases for normalization
        if (key === "gender" && typeof value === "string") {
          // Normalize gender to lowercase for consistency
          newMeta[key] = value.toLowerCase();
        } else if (key === "experience_level" && typeof value === "string") {
          // Normalize experience level to lowercase
          newMeta[key] = value.toLowerCase();
        } else if (key === "annual_income_range" && typeof value === "string") {
          // Normalize income range to lowercase
          newMeta[key] = value.toLowerCase();
        } else if (key === "date_of_birth" && typeof value === "string") {
          // Handle date of birth
          newMeta[key] = new Date(value);
        } else if (
          key === "graduation_year" &&
          (typeof value === "string" || typeof value === "number")
        ) {
          // Handle graduation year with validation
          const year = parseInt(value);
          newMeta[key] = Math.min(
            Math.max(year, 1950),
            new Date().getFullYear() + 10,
          );
        } else {
          // Update with new value
          newMeta[key] = value;
        }
      });

      updateData.meta = newMeta;
    }

    // Handle user preferences updates
    if (updateData.preferences) {
      updateData.preferences = {
        ...user.preferences?.toObject(),
        ...updateData.preferences,
      };
    }

    // Handle profile media updates
    if (updateData.user_image) {
      // Ensure user_image is an object before spreading
      const existingUserImage =
        typeof user.user_image === "string"
          ? { url: user.user_image }
          : user.user_image || {};

      updateData.user_image = {
        ...existingUserImage,
        ...updateData.user_image,
        upload_date: new Date(),
      };
    }

    if (updateData.cover_image) {
      // Ensure cover_image is an object before spreading
      const existingCoverImage =
        typeof user.cover_image === "string"
          ? { url: user.cover_image }
          : user.cover_image || {};

      updateData.cover_image = {
        ...existingCoverImage,
        ...updateData.cover_image,
        upload_date: new Date(),
      };
    }

    // Validate social media links
    const socialLinks = [
      "facebook_link",
      "instagram_link",
      "linkedin_link",
      "twitter_link",
      "youtube_link",
      "github_link",
      "portfolio_link",
    ];

    socialLinks.forEach((link) => {
      if (updateData[link] && updateData[link].trim() === "") {
        updateData[link] = null; // Convert empty strings to null
      }
    });

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...updateData,
        updated_at: new Date(),
        last_profile_update: new Date(),
      },
      {
        new: true,
        runValidators: true,
        select:
          "-password -two_factor_secret -backup_codes -password_reset_token -email_verification_token",
      },
    );

    // Log profile update activity
    updatedUser.logActivity("profile_update", userId, {
      updated_fields: Object.keys(updateData),
      update_type: "comprehensive_update",
      timestamp: new Date(),
    });

    // Calculate new profile completion
    const profileCompletion = updatedUser.profile_completion || 0;

    logger.info("Comprehensive profile updated successfully", {
      userId,
      updatedFields: Object.keys(updateData),
      newProfileCompletion: profileCompletion,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: updatedUser._id,
          full_name: updatedUser.full_name,
          username: updatedUser.username,
          student_id: updatedUser.student_id,
          profile_completion: profileCompletion,
          updated_at: updatedUser.updated_at,
        },
        profile_completion: profileCompletion,
        updated_fields: Object.keys(updateData),
      },
    });
  } catch (error) {
    logger.error("Error updating comprehensive profile", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while updating profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc Get user's enhanced progress analytics
 * @route GET /api/v1/profile/:userId/enhanced-progress
 * @access Private (User can view own progress, admins can view any)
 */
export const getEnhancedProgressAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;
    const { courseId, timeframe = "month", contentType } = req.query;

    // Authorization check
    if (
      userId !== requestingUserId &&
      !["admin", "super-admin", "instructor"].includes(requestingUserRole)
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this progress data",
      });
    }

    // Build query for enhanced progress
    const query = { userId: userId, isActive: true };
    if (courseId) query.courseId = courseId;
    if (contentType) query.contentType = contentType;

    // Add time filter
    if (timeframe !== "all") {
      const now = new Date();
      let startDate;

      switch (timeframe) {
        case "week":
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
          break;
        case "quarter":
          startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      }

      query.updatedAt = { $gte: startDate };
    }

    // Get enhanced progress data
    const progressData = await EnhancedProgress.find(query)
      .populate("courseId", "course_title course_category course_image")
      .populate("contentId", "title type difficulty")
      .sort({ updatedAt: -1 });

    // Calculate comprehensive analytics
    const analytics = {
      summary: {
        total_entries: progressData.length,
        completed: progressData.filter((p) => p.status === "completed").length,
        in_progress: progressData.filter((p) => p.status === "in_progress")
          .length,
        not_started: progressData.filter((p) => p.status === "not_started")
          .length,
        paused: progressData.filter((p) => p.status === "paused").length,
        total_time_spent: progressData.reduce(
          (sum, p) => sum + (p.timeSpent || 0),
          0,
        ),
        average_score:
          progressData.length > 0
            ? progressData.reduce((sum, p) => sum + (p.score || 0), 0) /
              progressData.length
            : 0,
        completion_rate:
          progressData.length > 0
            ? (progressData.filter((p) => p.status === "completed").length /
                progressData.length) *
              100
            : 0,
      },

      breakdown: {
        by_content_type: progressData.reduce((acc, p) => {
          acc[p.contentType] = (acc[p.contentType] || 0) + 1;
          return acc;
        }, {}),

        by_course: progressData.reduce((acc, p) => {
          const courseTitle = p.courseId?.course_title || "Unknown Course";
          if (!acc[courseTitle]) {
            acc[courseTitle] = {
              count: 0,
              completed: 0,
              total_score: 0,
              total_time: 0,
            };
          }
          acc[courseTitle].count++;
          if (p.status === "completed") acc[courseTitle].completed++;
          acc[courseTitle].total_score += p.score || 0;
          acc[courseTitle].total_time += p.timeSpent || 0;
          return acc;
        }, {}),

        by_status: progressData.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {}),
      },

      trends: {
        daily_activity: calculateDailyActivity(progressData),
        performance_trend: calculatePerformanceTrends(progressData),
        learning_velocity: calculateLearningVelocity(progressData),
        streak_analysis: calculateLearningStreak(progressData),
      },

      recent_activity: progressData.slice(0, 10).map((p) => ({
        content_type: p.contentType,
        course_title: p.courseId?.course_title,
        progress_percentage: p.progressPercentage,
        status: p.status,
        score: p.score,
        time_spent: p.timeSpent,
        updated_at: p.updatedAt,
      })),
    };

    logger.info("Enhanced progress analytics retrieved", {
      userId,
      requestingUserId,
      timeframe,
      totalEntries: progressData.length,
    });

    res.status(200).json({
      success: true,
      message: "Enhanced progress analytics retrieved successfully",
      data: {
        analytics,
        timeframe,
        query_parameters: { courseId, contentType },
        generated_at: new Date(),
      },
    });
  } catch (error) {
    logger.error("Error retrieving enhanced progress analytics", {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message:
        "Internal server error while retrieving enhanced progress analytics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc Sync enrollment progress with enhanced progress tracking
 * @route POST /api/v1/profile/:userId/sync-progress
 * @access Private (User can sync own progress, admins can sync any)
 */
export const syncEnrollmentProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Authorization check
    if (
      userId !== requestingUserId &&
      !["admin", "super-admin", "instructor"].includes(requestingUserRole)
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to sync progress data",
      });
    }

    // Get all enrollments for the user
    const enrollments = await EnrolledCourse.find({
      student_id: userId,
    }).populate("course_id", "course_title course_category");

    let syncedCount = 0;
    let errors = [];

    // Sync each enrollment's progress to enhanced progress tracking
    for (const enrollment of enrollments) {
      try {
        // Sync overall course progress
        const courseProgressData = {
          userId: userId,
          courseId: enrollment.course_id._id,
          contentType: "course",
          contentId: enrollment.course_id._id,
          progressPercentage: enrollment.progress || 0,
          status:
            enrollment.status === "completed"
              ? "completed"
              : enrollment.progress > 0
                ? "in_progress"
                : "not_started",
          timeSpent: 0, // Will be calculated from detailed progress
          lastAccessed: enrollment.last_accessed || new Date(),
          metadata: {
            enrollment_id: enrollment._id,
            enrollment_date: enrollment.enrollment_date,
            access_expiry_date: enrollment.access_expiry_date,
            enrollment_type: enrollment.enrollment_type,
            batch_id: enrollment.batch_id,
            synced_from: "enrollment",
          },
        };

        // Check if enhanced progress entry already exists
        let enhancedProgress = await EnhancedProgress.findOne({
          userId: userId,
          courseId: enrollment.course_id._id,
          contentType: "course",
          contentId: enrollment.course_id._id,
        });

        if (enhancedProgress) {
          // Update existing entry
          await EnhancedProgress.findByIdAndUpdate(enhancedProgress._id, {
            progressPercentage: courseProgressData.progressPercentage,
            status: courseProgressData.status,
            lastAccessed: courseProgressData.lastAccessed,
            metadata: {
              ...enhancedProgress.metadata,
              ...courseProgressData.metadata,
            },
            updatedAt: new Date(),
          });
        } else {
          // Create new enhanced progress entry
          await EnhancedProgress.create(courseProgressData);
        }

        syncedCount++;
      } catch (syncError) {
        errors.push({
          enrollment_id: enrollment._id,
          course_title: enrollment.course_id?.course_title,
          error: syncError.message,
        });

        logger.warn("Error syncing individual enrollment progress", {
          userId,
          enrollmentId: enrollment._id,
          error: syncError.message,
        });
      }
    }

    logger.info("Progress synchronization completed", {
      userId,
      requestingUserId,
      totalEnrollments: enrollments.length,
      syncedCount,
      errorCount: errors.length,
    });

    res.status(200).json({
      success: true,
      message: `Progress synchronization completed. ${syncedCount} enrollments synced.`,
      data: {
        total_enrollments: enrollments.length,
        synced_count: syncedCount,
        error_count: errors.length,
        errors: errors,
        sync_timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error("Error during progress synchronization", {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: "Internal server error during progress synchronization",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Helper function for daily activity calculation
const calculateDailyActivity = (progressData) => {
  const dailyStats = {};

  progressData.forEach((entry) => {
    const date = new Date(entry.updatedAt).toISOString().split("T")[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { count: 0, time_spent: 0, scores: [] };
    }
    dailyStats[date].count++;
    dailyStats[date].time_spent += entry.timeSpent || 0;
    if (entry.score) dailyStats[date].scores.push(entry.score);
  });

  // Convert to array and calculate averages
  return Object.entries(dailyStats)
    .map(([date, stats]) => ({
      date,
      activity_count: stats.count,
      total_time_spent: stats.time_spent,
      average_score:
        stats.scores.length > 0
          ? stats.scores.reduce((sum, score) => sum + score, 0) /
            stats.scores.length
          : null,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

export default {
  getProfile,
  updateProfile,
  deleteProfile,
  restoreProfile,
  getProfileStats,
  updatePreferences,
  getComprehensiveProfile,
  updateComprehensiveProfile,
  getEnhancedProgressAnalytics,
  syncEnrollmentProgress,
};
