import User from "../models/user-modal.js";
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

export default {
  getProfile,
  updateProfile,
  deleteProfile,
  restoreProfile,
  getProfileStats,
  updatePreferences
}; 