import User from "../models/user-modal.js";
import Enrollment from "../models/enrollment-model.js";
import Course from "../models/course-model.js";
import Quiz from "../models/quiz-model.js";
import Order from "../models/Order.js";
import Progress from "../models/progress-model.js";
import Certificate from "../models/certificate-model.js";
import logger from "../utils/logger.js";
import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV_VARS } from "../config/envVars.js";

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
    if (userId !== requestingUserId && !['admin', 'super-admin'].includes(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this profile"
      });
    }

    // Find user and exclude sensitive fields for non-admin users
    const sensitiveFields = userId !== requestingUserId 
      ? '-password -two_factor_secret -backup_codes -password_reset_token -email_verification_token -oauth -api_key -webhooks -failed_login_attempts -account_locked_until'
      : '-password -two_factor_secret -backup_codes -password_reset_token -email_verification_token -oauth.google.access_token -oauth.google.refresh_token -oauth.facebook.access_token -oauth.facebook.refresh_token -oauth.github.access_token -oauth.github.refresh_token -oauth.linkedin.access_token -oauth.linkedin.refresh_token -oauth.microsoft.access_token -oauth.microsoft.refresh_token -oauth.apple.access_token -oauth.apple.refresh_token';

    const user = await User.findById(userId).select(sensitiveFields);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Log profile view activity
    if (userId === requestingUserId) {
      user.logActivity('profile_view', userId, { 
        view_type: 'self_view',
        timestamp: new Date()
      });
    }

    logger.info('Profile retrieved successfully', { 
      userId, 
      requestingUserId,
      profileCompletion: user.profile_completion
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
          identity_verified: user.identity_verified
        }
      }
    });

  } catch (error) {
    logger.error('Error retrieving profile', { 
      error: error.message, 
      stack: error.stack,
      userId: req.params.userId
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving profile",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;
    const updateData = req.body;

    // Authorization: Users can only update their own profile unless they're admin
    if (userId !== requestingUserId && !['admin', 'super-admin'].includes(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this profile"
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Fields that regular users cannot update (admin-only fields)
    const adminOnlyFields = [
      'role', 'admin_role', 'is_active', 'is_banned', 'ban_reason', 'ban_expires',
      'account_type', 'subscription_status', 'subscription_plan', 'subscription_start',
      'subscription_end', 'email_verified', 'phone_verified', 'identity_verified',
      'api_key', 'api_rate_limit', 'webhooks', 'failed_login_attempts', 'account_locked_until'
    ];

    // Remove admin-only fields if user is not admin
    if (!['admin', 'super-admin'].includes(requestingUserRole)) {
      adminOnlyFields.forEach(field => {
        if (updateData[field] !== undefined) {
          delete updateData[field];
        }
      });
    }

    // Handle password update separately
    if (updateData.password) {
      if (updateData.password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long"
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
        { expiresIn: '24h' }
      );
      updateData.email_verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    // Handle nested object updates
    if (updateData.meta) {
      updateData.meta = { ...user.meta?.toObject(), ...updateData.meta };
    }
    if (updateData.preferences) {
      updateData.preferences = { ...user.preferences?.toObject(), ...updateData.preferences };
    }
    if (updateData.user_image) {
      updateData.user_image = { ...user.user_image, ...updateData.user_image };
    }
    if (updateData.cover_image) {
      updateData.cover_image = { ...user.cover_image, ...updateData.cover_image };
    }

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        ...updateData,
        updated_at: new Date(),
        last_profile_update: new Date()
      },
      { 
        new: true, 
        runValidators: true,
        select: '-password -two_factor_secret -backup_codes -password_reset_token -email_verification_token'
      }
    );

    // Log profile update activity
    updatedUser.logActivity('profile_update', userId, {
      updated_fields: Object.keys(updateData),
      timestamp: new Date()
    });

    logger.info('Profile updated successfully', { 
      userId, 
      requestingUserId,
      updatedFields: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: updatedUser,
        profile_completion: updatedUser.profile_completion,
        updated_fields: Object.keys(updateData)
      }
    });

  } catch (error) {
    logger.error('Error updating profile', { 
      error: error.message, 
      stack: error.stack,
      userId: req.params.userId
    });

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while updating profile",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    if (userId !== requestingUserId && !['admin', 'super-admin'].includes(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this profile"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Only super-admin can perform permanent deletion
    if (permanent === 'true' && requestingUserRole !== 'super-admin') {
      return res.status(403).json({
        success: false,
        message: "Only super-admin can permanently delete profiles"
      });
    }

    if (permanent === 'true') {
      // Permanent deletion
      await User.findByIdAndDelete(userId);
      
      logger.warn('Profile permanently deleted', { 
        userId, 
        requestingUserId,
        deletedUser: {
          email: user.email,
          full_name: user.full_name,
          role: user.role
        }
      });

      res.status(200).json({
        success: true,
        message: "Profile permanently deleted"
      });
    } else {
      // Soft deletion
      const deletedUser = await User.findByIdAndUpdate(
        userId,
        {
          is_active: false,
          is_banned: true,
          ban_reason: 'Account deleted by user',
          email: `deleted_${Date.now()}_${user.email}`, // Prevent email conflicts
          username: user.username ? `deleted_${Date.now()}_${user.username}` : undefined,
          deleted_at: new Date(),
          updated_at: new Date()
        },
        { new: true, select: 'full_name email is_active deleted_at' }
      );

      // Log deletion activity
      user.logActivity('profile_delete', userId, {
        deletion_type: 'soft_delete',
        timestamp: new Date()
      });

      logger.warn('Profile soft deleted', { 
        userId, 
        requestingUserId,
        deletedUser: {
          email: user.email,
          full_name: user.full_name,
          role: user.role
        }
      });

      res.status(200).json({
        success: true,
        message: "Profile deactivated successfully",
        data: {
          user: deletedUser,
          deletion_type: "soft_delete",
          can_be_restored: true
        }
      });
    }

  } catch (error) {
    logger.error('Error deleting profile', { 
      error: error.message, 
      stack: error.stack,
      userId: req.params.userId
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while deleting profile",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    if (!['admin', 'super-admin'].includes(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        message: "Only administrators can restore profiles"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.is_active && !user.is_banned) {
      return res.status(400).json({
        success: false,
        message: "Profile is already active"
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
        updated_at: new Date()
      },
      { new: true, select: 'full_name email is_active restored_at' }
    );

    // Log restoration activity
    user.logActivity('profile_restore', userId, {
      restored_by: req.user.id,
      timestamp: new Date()
    });

    logger.info('Profile restored successfully', { 
      userId, 
      restoredBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: "Profile restored successfully",
      data: {
        user: restoredUser
      }
    });

  } catch (error) {
    logger.error('Error restoring profile', { 
      error: error.message, 
      stack: error.stack,
      userId: req.params.userId
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while restoring profile",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    if (userId !== requestingUserId && !['admin', 'super-admin'].includes(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view these statistics"
      });
    }

    const user = await User.findById(userId).select('statistics activity_log preferences created_at last_seen');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Calculate additional stats
    const accountAge = Math.floor((new Date() - user.created_at) / (1000 * 60 * 60 * 24));
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
          recent_activity: recentActivity
        },
        preferences: user.preferences
      }
    });

  } catch (error) {
    logger.error('Error retrieving profile statistics', { 
      error: error.message, 
      stack: error.stack,
      userId: req.params.userId
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving statistics",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        message: "Unauthorized to update these preferences"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Merge with existing preferences
    const updatedPreferences = {
      ...user.preferences?.toObject(),
      ...preferences
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        preferences: updatedPreferences,
        updated_at: new Date()
      },
      { new: true, select: 'preferences' }
    );

    // Log preference update
    user.logActivity('setting_change', userId, {
      changed_preferences: Object.keys(preferences),
      timestamp: new Date()
    });

    logger.info('User preferences updated', { 
      userId,
      updatedPreferences: Object.keys(preferences)
    });

    res.status(200).json({
      success: true,
      message: "Preferences updated successfully",
      data: {
        preferences: updatedUser.preferences
      }
    });

  } catch (error) {
    logger.error('Error updating preferences', { 
      error: error.message, 
      stack: error.stack,
      userId: req.params.userId
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while updating preferences",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      '-password -two_factor_secret -backup_codes -password_reset_token -email_verification_token -oauth.google.access_token -oauth.google.refresh_token -oauth.facebook.access_token -oauth.facebook.refresh_token -oauth.github.access_token -oauth.github.refresh_token -oauth.linkedin.access_token -oauth.linkedin.refresh_token -oauth.microsoft.access_token -oauth.microsoft.refresh_token -oauth.apple.access_token -oauth.apple.refresh_token'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get enrollments with comprehensive course details
    const enrollments = await Enrollment.find({ 
      student: userId
    })
    .populate({
      path: 'course',
      select: 'course_title course_subtitle course_category course_image course_level language no_of_Sessions course_duration prices tools_technologies curriculum status category_type class_type'
    })
    .populate({
      path: 'batch',
      select: 'batch_name start_date end_date status capacity enrolled_students assigned_instructor schedule'
    })
    .sort({ enrollment_date: -1 });

    // Get comprehensive course statistics
    const courseStats = {
      total_enrolled: enrollments.length,
      active_courses: enrollments.filter(e => e.status === 'active').length,
      completed_courses: enrollments.filter(e => e.status === 'completed').length,
      on_hold_courses: enrollments.filter(e => e.status === 'on_hold').length,
      cancelled_courses: enrollments.filter(e => e.status === 'cancelled').length,
      expired_courses: enrollments.filter(e => e.status === 'expired').length,
      average_progress: enrollments.length > 0 
        ? enrollments.reduce((sum, e) => sum + (e.progress?.overall_percentage || 0), 0) / enrollments.length 
        : 0,
      total_certificates: enrollments.filter(e => e.certificate_issued).length,
      total_payments: enrollments.reduce((sum, e) => sum + e.total_amount_paid, 0),
      emi_enrollments: enrollments.filter(e => e.payment_plan === 'installment').length,
      subscription_enrollments: enrollments.filter(e => e.payment_plan === 'subscription').length
    };

    // Get detailed payment history from both enrollments and orders
    const paymentHistory = [];
    
    // From enrollments
    enrollments.forEach(enrollment => {
      if (enrollment.payments && enrollment.payments.length > 0) {
        enrollment.payments.forEach(payment => {
          paymentHistory.push({
            source: 'enrollment',
            enrollment_id: enrollment._id,
            course_title: enrollment.course?.course_title,
            amount: payment.amount,
            currency: payment.currency,
            payment_date: payment.payment_date,
            payment_method: payment.payment_method,
            transaction_id: payment.transaction_id,
            payment_status: payment.payment_status,
            receipt_url: payment.receipt_url,
            payment_type: 'course_enrollment'
          });
        });
      }
    });

    // Get additional payment data from Order model if available
    try {
      const orders = await Order.find({ 
        $or: [
          { user_id: userId },
          { student_id: userId },
          { customer_id: userId }
        ]
      }).sort({ createdAt: -1 });

      orders.forEach(order => {
        paymentHistory.push({
          source: 'order',
          order_id: order._id,
          course_title: order.course_name || order.product_name,
          amount: order.amount || order.total,
          currency: order.currency || 'USD',
          payment_date: order.createdAt || order.payment_date,
          payment_method: order.payment_method,
          transaction_id: order.transaction_id || order.order_id,
          payment_status: order.status || order.payment_status,
          receipt_url: order.receipt_url,
          payment_type: order.order_type || 'purchase'
        });
      });
    } catch (orderError) {
      logger.warn('Could not fetch orders for payment history', { 
        userId, 
        error: orderError.message 
      });
    }

    // Get EMI details for active EMI enrollments
    const emiDetails = enrollments
      .filter(e => e.payment_plan === 'installment')
      .map(e => ({
        enrollment_id: e._id,
        course_title: e.course?.course_title,
        total_amount: e.pricing_snapshot.final_price,
        paid_amount: e.total_amount_paid,
        remaining_amount: e.pricing_snapshot.final_price - e.total_amount_paid,
        installments_count: e.installments_count,
        next_payment_date: e.next_payment_date,
        payment_status: e.total_amount_paid >= e.pricing_snapshot.final_price ? 'completed' : 'active'
      }));

    // Get quiz/assessment results with detailed info
    const quizResults = await Quiz.find({ 
      'submissions.student_id': userId 
    }).select('title course_id submissions.$ max_attempts time_limit total_marks');

    // Get certificates earned by the user
    let certificates = [];
    try {
      certificates = await Certificate.find({ 
        $or: [
          { student_id: userId },
          { user_id: userId }
        ]
      }).populate('course_id', 'course_title course_image').sort({ issued_date: -1 });
    } catch (certError) {
      logger.warn('Could not fetch certificates', { 
        userId, 
        error: certError.message 
      });
    }

    // Get detailed progress data from Progress model
    let detailedProgress = [];
    try {
      detailedProgress = await Progress.find({ 
        $or: [
          { student_id: userId },
          { user_id: userId }
        ]
      }).populate('course_id', 'course_title course_image').sort({ last_updated: -1 });
    } catch (progressError) {
      logger.warn('Could not fetch detailed progress', { 
        userId, 
        error: progressError.message 
      });
    }

    // Enhanced learning analytics with real-time calculations
    const learningAnalytics = {
      total_learning_time: user.statistics?.learning?.total_learning_time || 0,
      current_streak: user.statistics?.learning?.current_streak || 0,
      longest_streak: user.statistics?.learning?.longest_streak || 0,
      certificates_earned: certificates.length,
      skill_points: user.statistics?.learning?.skill_points || 0,
      achievements_unlocked: user.statistics?.learning?.achievements_unlocked || 0,
      total_courses_enrolled: courseStats.total_enrolled,
      total_courses_completed: courseStats.completed_courses,
      completion_rate: courseStats.total_enrolled > 0 ? (courseStats.completed_courses / courseStats.total_enrolled * 100) : 0,
      average_score: quizResults.length > 0 ? quizResults.reduce((sum, quiz) => {
        const userSubmission = quiz.submissions.find(s => s.student_id.toString() === userId);
        return sum + (userSubmission?.score || 0);
      }, 0) / quizResults.length : 0,
      // Enhanced analytics from Progress model
      total_lessons_completed: detailedProgress.reduce((sum, progress) => sum + (progress.lessons_completed || 0), 0),
      total_assignments_completed: detailedProgress.reduce((sum, progress) => sum + (progress.assignments_completed || 0), 0),
      total_quiz_attempts: quizResults.reduce((sum, quiz) => sum + quiz.submissions.filter(s => s.student_id.toString() === userId).length, 0),
      average_lesson_completion_time: detailedProgress.length > 0 ? 
        detailedProgress.reduce((sum, progress) => sum + (progress.average_lesson_time || 0), 0) / detailedProgress.length : 0,
      last_learning_activity: detailedProgress.length > 0 ? 
        Math.max(...detailedProgress.map(p => new Date(p.last_updated || 0).getTime())) : null
    };

    // Enhanced social metrics
    const socialMetrics = {
      followers_count: user.statistics?.social?.followers_count || 0,
      following_count: user.statistics?.social?.following_count || 0,
      reviews_written: user.statistics?.social?.reviews_written || 0,
      discussions_participated: user.statistics?.social?.discussions_participated || 0,
      content_shared: user.statistics?.social?.content_shared || 0,
      community_reputation: user.statistics?.social?.community_reputation || 0,
      profile_views: user.statistics?.social?.profile_views || 0,
      likes_received: user.statistics?.social?.likes_received || 0
    };

    // Enhanced engagement metrics with login analytics
    const engagementMetrics = {
      total_logins: user.statistics?.engagement?.total_logins || 0,
      total_session_time: user.statistics?.engagement?.total_session_time || 0,
      avg_session_duration: user.statistics?.engagement?.avg_session_duration || 0,
      last_active_date: user.statistics?.engagement?.last_active_date || user.last_seen,
      consecutive_active_days: user.statistics?.engagement?.consecutive_active_days || 0,
      total_page_views: user.statistics?.engagement?.total_page_views || 0,
      login_frequency: user.getLoginStats?.()?.login_frequency || { daily: 0, weekly: 0, monthly: 0 },
      device_preference: user.getDevicePreference?.() || 'Unknown',
      browser_preference: user.getBrowserPreference?.() || 'Unknown',
      login_pattern: user.getLoginPattern?.() || { pattern: 'unknown', description: 'No pattern data' }
    };

    // Enhanced financial metrics with detailed payment info
    const totalSpentFromPayments = paymentHistory.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const financialMetrics = {
      total_spent: Math.max(courseStats.total_payments, totalSpentFromPayments),
      total_courses_purchased: courseStats.total_enrolled,
      subscription_months: user.statistics?.financial?.subscription_months || 0,
      lifetime_value: Math.max(courseStats.total_payments, totalSpentFromPayments),
      average_course_cost: courseStats.total_enrolled > 0 ? totalSpentFromPayments / courseStats.total_enrolled : 0,
      payment_methods_used: [...new Set(paymentHistory.map(p => p.payment_method).filter(Boolean))],
      pending_payments: emiDetails.filter(e => e.payment_status === 'active').length,
      total_emi_amount: emiDetails.reduce((sum, e) => sum + e.remaining_amount, 0),
      successful_transactions: paymentHistory.filter(p => ['completed', 'success', 'paid'].includes(p.payment_status?.toLowerCase())).length,
      failed_transactions: paymentHistory.filter(p => ['failed', 'cancelled', 'rejected'].includes(p.payment_status?.toLowerCase())).length,
      pending_transactions: paymentHistory.filter(p => ['pending', 'processing'].includes(p.payment_status?.toLowerCase())).length,
      most_used_payment_method: paymentHistory.length > 0 ? 
        paymentHistory.reduce((acc, payment) => {
          acc[payment.payment_method] = (acc[payment.payment_method] || 0) + 1;
          return acc;
        }, {}) : {},
      monthly_spending: paymentHistory.reduce((acc, payment) => {
        const month = new Date(payment.payment_date).toISOString().slice(0, 7); // YYYY-MM
        acc[month] = (acc[month] || 0) + (payment.amount || 0);
        return acc;
      }, {})
    };

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
      account_locked_until: user.account_locked_until
    };

    // Enhanced device and security information
    const deviceInfo = {
      registered_devices: user.devices?.length || 0,
      trusted_devices: user.devices?.filter(d => d.is_trusted).length || 0,
      active_sessions: user.sessions?.filter(s => s.is_active).length || 0,
      last_login_device: user.devices?.find(d => d.is_primary) || null,
      device_breakdown: user.getDeviceBreakdown?.(user.devices) || { mobile: 0, tablet: 0, desktop: 0 },
      unique_ip_addresses: user.login_analytics?.unique_ips?.length || 0,
      security_score: user.getSecurityScore?.() || 100,
      recent_login_locations: user.devices?.slice(0, 5).map(d => ({
        device_type: d.device_type,
        last_seen: d.last_seen,
        location: d.ip_addresses?.[0]?.city || 'Unknown'
      })) || []
    };

    // Recent activity with more details
    const recentActivity = (user.activity_log?.slice(-20) || []).map(activity => ({
      action: activity.action,
      resource: activity.resource,
      timestamp: activity.timestamp,
      details: activity.details,
      ip_address: activity.metadata?.ip_address,
      device_type: activity.metadata?.device_type,
      duration: activity.duration
    }));

    // Profile completion calculation
    const profileCompletion = user.profile_completion || 0;

    // Calculate account age
    const accountAge = Math.floor((new Date() - user.created_at) / (1000 * 60 * 60 * 24));

    // Next upcoming courses or batches
    const upcomingCourses = enrollments
      .filter(e => e.status === 'active' && e.batch?.start_date > new Date())
      .sort((a, b) => new Date(a.batch.start_date) - new Date(b.batch.start_date))
      .slice(0, 5)
      .map(e => ({
        enrollment_id: e._id,
        course_title: e.course.course_title,
        course_image: e.course.course_image,
        start_date: e.batch?.start_date,
        batch_name: e.batch?.batch_name,
        instructor: e.batch?.assigned_instructor,
        schedule: e.batch?.schedule
      }));

    // Current active learning with curriculum progress
    const activeLearning = enrollments
      .filter(e => e.status === 'active' && (e.progress?.overall_percentage > 0 && e.progress?.overall_percentage < 100))
      .sort((a, b) => new Date(b.progress?.last_activity_date || 0) - new Date(a.progress?.last_activity_date || 0))
      .slice(0, 10)
      .map(e => ({
        enrollment_id: e._id,
        course_title: e.course.course_title,
        course_image: e.course.course_image,
        progress: e.progress?.overall_percentage || 0,
        lessons_completed: e.progress?.lessons_completed || 0,
        last_accessed: e.progress?.last_activity_date,
        curriculum_progress: e.progress?.detailed_progress || []
      }));

    // Course categories and learning paths
    const learningPaths = enrollments.reduce((paths, enrollment) => {
      const category = enrollment.course?.course_category;
      if (category) {
        if (!paths[category]) {
          paths[category] = {
            category: category,
            courses_count: 0,
            completed_count: 0,
            total_progress: 0
          };
        }
        paths[category].courses_count++;
        if (enrollment.status === 'completed') paths[category].completed_count++;
        paths[category].total_progress += enrollment.progress?.overall_percentage || 0;
      }
      return paths;
    }, {});

    // Convert to array and calculate averages
    const learningPathsArray = Object.values(learningPaths).map(path => ({
      ...path,
      average_progress: path.courses_count > 0 ? path.total_progress / path.courses_count : 0
    }));

    // Log profile view activity
    user.logActivity('profile_view', userId, { 
      view_type: 'comprehensive_view',
      timestamp: new Date(),
      sections_accessed: ['basic_info', 'learning_analytics', 'payment_history', 'device_info']
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
          profile_completion: profileCompletion
        },

        // Editable profile media
        profile_media: {
          user_image: user.user_image || { url: null, public_id: null, alt_text: null },
          cover_image: user.cover_image || { url: null, public_id: null, alt_text: null }
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
          interests: user.meta?.interests || []
        },

        // Account status (mostly read-only with some editable preferences)
        account_status: accountStatus,

        // Comprehensive learning analytics
        learning_analytics: learningAnalytics,

        // Detailed course and enrollment data
        education: {
          course_stats: courseStats,
          learning_paths: learningPathsArray,
          enrollments: enrollments.map(e => ({
            id: e._id,
            course: {
              id: e.course._id,
              title: e.course.course_title,
              subtitle: e.course.course_subtitle,
              description: e.course.course_description,
              image: e.course.course_image,
              level: e.course.course_level,
              category: e.course.course_category,
              language: e.course.language,
              duration: e.course.course_duration,
              sessions: e.course.no_of_Sessions,
              class_type: e.course.class_type,
              status: e.course.status,
              tools_technologies: e.course.tools_technologies
            },
            enrollment_date: e.enrollment_date,
            status: e.status,
            enrollment_type: e.enrollment_type,
            enrollment_source: e.enrollment_source,
            access_expiry_date: e.access_expiry_date,
            progress: {
              overall_percentage: e.progress?.overall_percentage || 0,
              lessons_completed: e.progress?.lessons_completed || 0,
              last_activity_date: e.progress?.last_activity_date,
              detailed_progress: e.progress?.detailed_progress || []
            },
            batch_info: e.batch ? {
              id: e.batch._id,
              name: e.batch.batch_name,
              start_date: e.batch.start_date,
              end_date: e.batch.end_date,
              status: e.batch.status,
              capacity: e.batch.capacity,
              enrolled_students: e.batch.enrolled_students,
              instructor: e.batch.assigned_instructor,
              schedule: e.batch.schedule
            } : null,
            pricing: e.pricing_snapshot,
            payment_plan: e.payment_plan,
            total_amount_paid: e.total_amount_paid,
            certificate_issued: e.certificate_issued,
            certificate_id: e.certificate_id
          })),
          active_learning: activeLearning,
          upcoming_courses: upcomingCourses,
          quiz_results: quizResults.map(quiz => ({
            quiz_id: quiz._id,
            title: quiz.title,
            course_id: quiz.course_id,
            max_attempts: quiz.max_attempts,
            time_limit: quiz.time_limit,
            total_marks: quiz.total_marks,
            user_score: quiz.submissions.find(s => s.student_id.toString() === userId)?.score || 0,
            attempts_used: quiz.submissions.filter(s => s.student_id.toString() === userId).length
          })),
          certificates: certificates.map(cert => ({
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
            verification_url: cert.verification_url
          })),
          detailed_progress: detailedProgress.map(progress => ({
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
            milestones_reached: progress.milestones_reached
          }))
        },

        // Social metrics and community engagement
        social_metrics: socialMetrics,

        // Enhanced engagement and usage analytics
        engagement_metrics: engagementMetrics,

        // Comprehensive financial information
        financial_metrics: financialMetrics,
        payment_history: paymentHistory.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date)),
        emi_details: emiDetails,

        // Device and security information
        device_info: deviceInfo,

        // Editable user preferences and settings
        preferences: user.preferences || {
          theme: 'auto',
          language: 'en',
          currency: 'USD',
          timezone: 'UTC',
          notifications: {},
          privacy: {},
          accessibility: {},
          content: {}
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
            identity: user.identity_verified
          },
          subscription_info: {
            is_subscribed: user.subscription_status === 'active',
            plan: user.subscription_plan,
            expires: user.subscription_end,
            trial_used: user.trial_used
          },
          security_info: {
            two_factor_enabled: user.two_factor_enabled,
            security_score: deviceInfo.security_score,
            trusted_devices: deviceInfo.trusted_devices,
            recent_login_attempts: user.failed_login_attempts
          }
        },

        // Performance indicators
        performance_indicators: {
          learning_consistency: learningAnalytics.current_streak,
          engagement_level: engagementMetrics.avg_session_duration > 1800 ? 'high' : 
                           engagementMetrics.avg_session_duration > 900 ? 'medium' : 'low',
          progress_rate: courseStats.average_progress,
          community_involvement: socialMetrics.community_reputation,
          payment_health: emiDetails.length > 0 ? 
                         (emiDetails.filter(e => e.payment_status === 'completed').length / emiDetails.length * 100) : 100
        }
      }
    };

    logger.info('Comprehensive profile retrieved successfully', { 
      userId,
      profileCompletion,
      coursesEnrolled: courseStats.total_enrolled,
      engagementLevel: response.data.performance_indicators.engagement_level,
      paymentHistory: paymentHistory.length,
      emiAccounts: emiDetails.length
    });

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error retrieving comprehensive profile', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving comprehensive profile",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const updateData = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Fields that cannot be updated through this endpoint
    const protectedFields = [
      'email', '_id', 'role', 'admin_role', 'is_active', 'is_banned', 
      'ban_reason', 'ban_expires', 'account_type', 'subscription_status', 
      'subscription_plan', 'subscription_start', 'subscription_end',
      'email_verified', 'phone_verified', 'identity_verified',
      'two_factor_enabled', 'failed_login_attempts', 'account_locked_until',
      'created_at', 'statistics', 'devices', 'sessions', 'activity_log'
    ];

    // Remove protected fields from update data
    protectedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        delete updateData[field];
        logger.warn(`Attempted to update protected field: ${field}`, { userId });
      }
    });

    // Handle password update separately if provided
    if (updateData.password) {
      if (updateData.password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long"
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
            message: "Phone numbers must have both country and number fields"
          });
        }
      }
      // If phone number changes, reset verification
      if (JSON.stringify(user.phone_numbers) !== JSON.stringify(updateData.phone_numbers)) {
        updateData.phone_verified = false;
      }
    }

    // Handle nested object updates for meta data
    if (updateData.meta) {
      updateData.meta = { 
        ...user.meta?.toObject(), 
        ...updateData.meta,
        // Validate specific fields
        date_of_birth: updateData.meta.date_of_birth ? new Date(updateData.meta.date_of_birth) : user.meta?.date_of_birth,
        graduation_year: updateData.meta.graduation_year ? 
          Math.min(Math.max(updateData.meta.graduation_year, 1950), new Date().getFullYear() + 10) : 
          user.meta?.graduation_year
      };
    }

    // Handle user preferences updates
    if (updateData.preferences) {
      updateData.preferences = { 
        ...user.preferences?.toObject(), 
        ...updateData.preferences 
      };
    }

    // Handle profile media updates
    if (updateData.user_image) {
      updateData.user_image = { 
        ...user.user_image, 
        ...updateData.user_image,
        upload_date: new Date()
      };
    }

    if (updateData.cover_image) {
      updateData.cover_image = { 
        ...user.cover_image, 
        ...updateData.cover_image,
        upload_date: new Date()
      };
    }

    // Validate social media links
    const socialLinks = [
      'facebook_link', 'instagram_link', 'linkedin_link', 
      'twitter_link', 'youtube_link', 'github_link', 'portfolio_link'
    ];
    
    socialLinks.forEach(link => {
      if (updateData[link] && updateData[link].trim() === '') {
        updateData[link] = null; // Convert empty strings to null
      }
    });

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        ...updateData,
        updated_at: new Date(),
        last_profile_update: new Date()
      },
      { 
        new: true, 
        runValidators: true,
        select: '-password -two_factor_secret -backup_codes -password_reset_token -email_verification_token'
      }
    );

    // Log profile update activity
    updatedUser.logActivity('profile_update', userId, {
      updated_fields: Object.keys(updateData),
      update_type: 'comprehensive_update',
      timestamp: new Date()
    });

    // Calculate new profile completion
    const profileCompletion = updatedUser.profile_completion || 0;

    logger.info('Comprehensive profile updated successfully', { 
      userId, 
      updatedFields: Object.keys(updateData),
      newProfileCompletion: profileCompletion
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
          updated_at: updatedUser.updated_at
        },
        profile_completion: profileCompletion,
        updated_fields: Object.keys(updateData)
      }
    });

  } catch (error) {
    logger.error('Error updating comprehensive profile', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: "Internal server error while updating profile",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  getProfile,
  updateProfile,
  deleteProfile,
  restoreProfile,
  getProfileStats,
  updatePreferences,
  getComprehensiveProfile,
  updateComprehensiveProfile
}; 