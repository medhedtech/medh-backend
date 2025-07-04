import mongoose from 'mongoose';
import moment from 'moment-timezone';

import DemoFeedback from '../models/demo-feedback.model.js';
import DemoBooking from '../models/demo-booking.model.js';
import User from '../models/user-modal.js';
import { AppError } from '../utils/errorHandler.js';
import catchAsync from '../utils/catchAsync.js';
import logger from '../utils/logger.js';

/**
 * Create new demo feedback
 * @route POST /api/demo-feedback
 * @access Private
 */
export const createDemoFeedback = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const feedbackData = {
    ...req.validatedData,
    userId,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  };

  try {
    // Create the feedback
    const feedback = new DemoFeedback(feedbackData);
    await feedback.save();

    // Populate related data for response
    await feedback.populate([
      {
        path: 'demoBookingId',
        select: 'scheduledDateTime demoType courseInterest instructorId',
        populate: {
          path: 'instructorId',
          select: 'full_name email'
        }
      },
      {
        path: 'userId',
        select: 'full_name email'
      }
    ]);

    // Update demo booking with feedback reference
    await DemoBooking.findByIdAndUpdate(
      feedbackData.demoBookingId,
      {
        rating: feedbackData.overallRating,
        feedback: feedbackData.additionalComments,
        followUpRequired: feedbackData.followUpInterest?.enrollmentInterest || 
                         feedbackData.followUpInterest?.consultationRequest ||
                         feedbackData.followUpInterest?.moreInfoRequest
      }
    );

    logger.info('Demo feedback created successfully', {
      feedbackId: feedback._id,
      userId,
      demoBookingId: feedbackData.demoBookingId,
      overallRating: feedbackData.overallRating,
      wouldRecommend: feedbackData.wouldRecommend
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        feedback: {
          id: feedback._id,
          demoBooking: feedback.demoBookingId,
          overallRating: feedback.overallRating,
          contentQuality: feedback.contentQuality,
          instructorPerformance: feedback.instructorPerformance,
          wouldRecommend: feedback.wouldRecommend,
          additionalComments: feedback.additionalComments,
          followUpInterest: feedback.followUpInterest,
          feedbackSummary: feedback.feedbackSummary,
          submittedAt: feedback.createdAt,
          canEdit: true // User can edit their own feedback
        }
      }
    });

  } catch (error) {
    logger.error('Error creating demo feedback', {
      error: error.message,
      stack: error.stack,
      userId,
      demoBookingId: feedbackData.demoBookingId
    });

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    throw new AppError('Failed to submit feedback', 500);
  }
});

/**
 * Get user's demo feedback
 * @route GET /api/demo-feedback/my-feedback
 * @access Private
 */
export const getUserFeedback = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.validatedQuery || req.query;

  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Build query
    const query = {
      userId,
      isActive: true
    };

    // Get feedback with pagination
    const [feedbacks, total] = await Promise.all([
      DemoFeedback.find(query)
        .populate({
          path: 'demoBookingId',
          select: 'scheduledDateTime demoType courseInterest instructorId meetingLink',
          populate: {
            path: 'instructorId',
            select: 'full_name email'
          }
        })
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DemoFeedback.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      message: 'User feedback retrieved successfully',
      data: {
        feedbacks: feedbacks.map(feedback => ({
          id: feedback._id,
          demoBooking: feedback.demoBookingId,
          overallRating: feedback.overallRating,
          contentQuality: feedback.contentQuality,
          instructorPerformance: feedback.instructorPerformance,
          wouldRecommend: feedback.wouldRecommend,
          additionalComments: feedback.additionalComments,
          followUpInterest: feedback.followUpInterest,
          status: feedback.status,
          submittedAt: feedback.createdAt,
          canEdit: true
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage,
          hasPrevPage
        }
      }
    });

  } catch (error) {
    logger.error('Error retrieving user feedback', {
      error: error.message,
      userId
    });
    throw new AppError('Failed to retrieve feedback', 500);
  }
});

/**
 * Get demo feedback by ID
 * @route GET /api/demo-feedback/:feedbackId
 * @access Private
 */
export const getFeedbackById = catchAsync(async (req, res) => {
  const { feedbackId } = req.params;
  const userId = req.user?.id;

  try {
    const feedback = await DemoFeedback.findById(feedbackId)
      .populate([
        {
          path: 'demoBookingId',
          select: 'scheduledDateTime demoType courseInterest instructorId userId',
          populate: {
            path: 'instructorId',
            select: 'full_name email'
          }
        },
        {
          path: 'userId',
          select: 'full_name email'
        },
        {
          path: 'adminResponse.respondedBy',
          select: 'full_name email role'
        }
      ]);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found',
        error_code: 'FEEDBACK_NOT_FOUND'
      });
    }

    // Check access permissions
    const isOwner = feedback.userId._id.toString() === userId;
    const isInstructor = feedback.demoBookingId?.instructorId?._id.toString() === userId;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

    if (!isOwner && !isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        error_code: 'ACCESS_DENIED'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Feedback retrieved successfully',
      data: {
        feedback: {
          id: feedback._id,
          demoBooking: feedback.demoBookingId,
          user: feedback.userId,
          overallRating: feedback.overallRating,
          contentQuality: feedback.contentQuality,
          instructorPerformance: feedback.instructorPerformance,
          additionalComments: feedback.additionalComments,
          wouldRecommend: feedback.wouldRecommend,
          specificFeedback: feedback.specificFeedback,
          likedMost: feedback.likedMost,
          improvementAreas: feedback.improvementAreas,
          followUpInterest: feedback.followUpInterest,
          adminResponse: feedback.adminResponse,
          status: feedback.status,
          priority: feedback.priority,
          tags: feedback.tags,
          feedbackSummary: feedback.feedbackSummary,
          averageRating: feedback.averageRating,
          submittedAt: feedback.createdAt,
          canEdit: isOwner,
          canRespond: isInstructor || isAdmin
        }
      }
    });

  } catch (error) {
    logger.error('Error retrieving feedback by ID', {
      error: error.message,
      feedbackId
    });
    throw new AppError('Failed to retrieve feedback', 500);
  }
});

/**
 * Update demo feedback
 * @route PUT /api/demo-feedback/:feedbackId
 * @access Private
 */
export const updateDemoFeedback = catchAsync(async (req, res) => {
  const { feedbackId } = req.params;
  const userId = req.user.id;
  const updateData = req.validatedData;

  try {
    // Find and verify ownership
    const feedback = await DemoFeedback.findOne({
      _id: feedbackId,
      userId,
      isActive: true
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found or access denied',
        error_code: 'FEEDBACK_NOT_FOUND'
      });
    }

    // Check if feedback can still be edited (within 24 hours of submission)
    const canEdit = moment().diff(moment(feedback.createdAt), 'hours') < 24;
    if (!canEdit) {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be edited within 24 hours of submission',
        error_code: 'EDIT_TIME_EXPIRED'
      });
    }

    // Update feedback
    Object.assign(feedback, updateData);
    await feedback.save();

    // Update demo booking if overall rating changed
    if (updateData.overallRating) {
      await DemoBooking.findByIdAndUpdate(
        feedback.demoBookingId,
        {
          rating: updateData.overallRating,
          feedback: updateData.additionalComments || feedback.additionalComments
        }
      );
    }

    await feedback.populate([
      {
        path: 'demoBookingId',
        select: 'scheduledDateTime demoType courseInterest',
        populate: {
          path: 'instructorId',
          select: 'full_name email'
        }
      }
    ]);

    logger.info('Demo feedback updated successfully', {
      feedbackId,
      userId,
      updatedFields: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      message: 'Feedback updated successfully',
      data: {
        feedback: {
          id: feedback._id,
          demoBooking: feedback.demoBookingId,
          overallRating: feedback.overallRating,
          contentQuality: feedback.contentQuality,
          instructorPerformance: feedback.instructorPerformance,
          wouldRecommend: feedback.wouldRecommend,
          additionalComments: feedback.additionalComments,
          followUpInterest: feedback.followUpInterest,
          feedbackSummary: feedback.feedbackSummary,
          updatedAt: feedback.updatedAt
        }
      }
    });

  } catch (error) {
    logger.error('Error updating demo feedback', {
      error: error.message,
      feedbackId,
      userId
    });
    throw new AppError('Failed to update feedback', 500);
  }
});

/**
 * Get all feedback (Admin/Instructor)
 * @route GET /api/demo-feedback
 * @access Private (Admin/Instructor)
 */
export const getAllFeedback = catchAsync(async (req, res) => {
  const {
    demoBookingId,
    userId,
    overallRating,
    contentQuality,
    instructorPerformance,
    wouldRecommend,
    status,
    priority,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.validatedQuery || req.query;

  try {
    // Build query
    const query = { isActive: true };

    if (demoBookingId) query.demoBookingId = demoBookingId;
    if (userId) query.userId = userId;
    if (overallRating) query.overallRating = overallRating;
    if (contentQuality) query.contentQuality = contentQuality;
    if (instructorPerformance) query.instructorPerformance = instructorPerformance;
    if (typeof wouldRecommend === 'boolean') query.wouldRecommend = wouldRecommend;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // If user is instructor, filter by their demos
    if (req.user.role === 'instructor') {
      const instructorBookings = await DemoBooking.find(
        { instructorId: req.user.id },
        { _id: 1 }
      );
      query.demoBookingId = { $in: instructorBookings.map(b => b._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get feedback with pagination
    const [feedbacks, total] = await Promise.all([
      DemoFeedback.find(query)
        .populate([
          {
            path: 'demoBookingId',
            select: 'scheduledDateTime demoType courseInterest instructorId',
            populate: {
              path: 'instructorId',
              select: 'full_name email'
            }
          },
          {
            path: 'userId',
            select: 'full_name email'
          },
          {
            path: 'adminResponse.respondedBy',
            select: 'full_name email'
          }
        ])
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DemoFeedback.countDocuments(query)
    ]);

    // Calculate pagination
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      message: 'Feedback retrieved successfully',
      data: {
        feedbacks: feedbacks.map(feedback => ({
          id: feedback._id,
          demoBooking: feedback.demoBookingId,
          user: feedback.userId,
          overallRating: feedback.overallRating,
          contentQuality: feedback.contentQuality,
          instructorPerformance: feedback.instructorPerformance,
          wouldRecommend: feedback.wouldRecommend,
          additionalComments: feedback.additionalComments,
          followUpInterest: feedback.followUpInterest,
          adminResponse: feedback.adminResponse,
          status: feedback.status,
          priority: feedback.priority,
          tags: feedback.tags,
          feedbackSummary: feedback.feedbackSummary,
          submittedAt: feedback.createdAt
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error retrieving all feedback', {
      error: error.message,
      userRole: req.user?.role
    });
    throw new AppError('Failed to retrieve feedback', 500);
  }
});

/**
 * Add admin response to feedback
 * @route POST /api/demo-feedback/:feedbackId/response
 * @access Private (Admin/Instructor)
 */
export const addAdminResponse = catchAsync(async (req, res) => {
  const { feedbackId } = req.params;
  const userId = req.user.id;
  const { responseText, isPublic, internalNotes, priority, tags } = req.validatedData;

  try {
    const feedback = await DemoFeedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found',
        error_code: 'FEEDBACK_NOT_FOUND'
      });
    }

    // Update feedback with admin response
    feedback.adminResponse = {
      respondedBy: userId,
      responseText,
      responseDate: new Date(),
      isPublic: isPublic || false
    };

    if (internalNotes) feedback.internalNotes = internalNotes;
    if (priority) feedback.priority = priority;
    if (tags) feedback.tags = [...new Set([...feedback.tags, ...tags])];
    
    feedback.status = 'responded';
    
    await feedback.save();

    await feedback.populate([
      {
        path: 'adminResponse.respondedBy',
        select: 'full_name email role'
      },
      {
        path: 'demoBookingId',
        select: 'scheduledDateTime demoType'
      },
      {
        path: 'userId',
        select: 'full_name email'
      }
    ]);

    logger.info('Admin response added to feedback', {
      feedbackId,
      respondedBy: userId,
      isPublic
    });

    res.status(200).json({
      success: true,
      message: 'Response added successfully',
      data: {
        feedback: {
          id: feedback._id,
          adminResponse: feedback.adminResponse,
          status: feedback.status,
          priority: feedback.priority,
          tags: feedback.tags,
          updatedAt: feedback.updatedAt
        }
      }
    });

  } catch (error) {
    logger.error('Error adding admin response', {
      error: error.message,
      feedbackId,
      userId
    });
    throw new AppError('Failed to add response', 500);
  }
});

/**
 * Get feedback statistics
 * @route GET /api/demo-feedback/stats
 * @access Private (Admin/Instructor)
 */
export const getFeedbackStats = catchAsync(async (req, res) => {
  const {
    startDate,
    endDate,
    instructorId,
    period = 'month'
  } = req.query;

  try {
    // Build match query
    const matchQuery = { isActive: true };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    // If instructor, filter by their demos
    if (req.user.role === 'instructor' || instructorId) {
      const targetInstructorId = instructorId || req.user.id;
      const instructorBookings = await DemoBooking.find(
        { instructorId: targetInstructorId },
        { _id: 1 }
      );
      matchQuery.demoBookingId = { $in: instructorBookings.map(b => b._id) };
    }

    // Aggregate statistics
    const stats = await DemoFeedback.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalFeedbacks: { $sum: 1 },
          averageOverallRating: { $avg: '$overallRating' },
          recommendationRate: {
            $avg: { $cond: ['$wouldRecommend', 1, 0] }
          },
          ratingDistribution: {
            $push: '$overallRating'
          },
          contentQualityDistribution: {
            $push: '$contentQuality'
          },
          instructorPerformanceDistribution: {
            $push: '$instructorPerformance'
          },
          statusDistribution: {
            $push: '$status'
          },
          priorityDistribution: {
            $push: '$priority'
          }
        }
      }
    ]);

    // Calculate distributions
    const result = stats[0] || {
      totalFeedbacks: 0,
      averageOverallRating: 0,
      recommendationRate: 0
    };

    // Process distributions
    const processDistribution = (arr) => {
      const counts = {};
      arr.forEach(item => {
        counts[item] = (counts[item] || 0) + 1;
      });
      return counts;
    };

    const responseData = {
      totalFeedbacks: result.totalFeedbacks,
      averageOverallRating: Number((result.averageOverallRating || 0).toFixed(2)),
      recommendationRate: Number(((result.recommendationRate || 0) * 100).toFixed(1)),
      distributions: {
        ratings: processDistribution(result.ratingDistribution || []),
        contentQuality: processDistribution(result.contentQualityDistribution || []),
        instructorPerformance: processDistribution(result.instructorPerformanceDistribution || []),
        status: processDistribution(result.statusDistribution || []),
        priority: processDistribution(result.priorityDistribution || [])
      }
    };

    // Get trend data if period is specified
    if (period && result.totalFeedbacks > 0) {
      const trendData = await DemoFeedback.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              $dateToString: {
                format: period === 'day' ? '%Y-%m-%d' : 
                        period === 'week' ? '%Y-%U' : '%Y-%m',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 },
            avgRating: { $avg: '$overallRating' },
            recommendationRate: {
              $avg: { $cond: ['$wouldRecommend', 1, 0] }
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      responseData.trends = trendData.map(item => ({
        period: item._id,
        count: item.count,
        averageRating: Number(item.avgRating.toFixed(2)),
        recommendationRate: Number((item.recommendationRate * 100).toFixed(1))
      }));
    }

    res.status(200).json({
      success: true,
      message: 'Feedback statistics retrieved successfully',
      data: responseData
    });

  } catch (error) {
    logger.error('Error retrieving feedback statistics', {
      error: error.message,
      userRole: req.user?.role
    });
    throw new AppError('Failed to retrieve statistics', 500);
  }
});

/**
 * Get available demo sessions for feedback
 * @route GET /api/demo-feedback/available-demos
 * @access Private
 */
export const getAvailableDemosForFeedback = catchAsync(async (req, res) => {
  const userId = req.user.id;

  try {
    // Find completed demos for the user that don't have feedback yet
    const completedBookings = await DemoBooking.find({
      userId,
      status: 'completed',
      isActive: true
    })
    .populate('instructorId', 'full_name email')
    .sort({ scheduledDateTime: -1 });

    // Get existing feedback for these bookings
    const existingFeedback = await DemoFeedback.find({
      userId,
      demoBookingId: { $in: completedBookings.map(b => b._id) },
      isActive: true
    }).select('demoBookingId');

    const feedbackBookingIds = new Set(
      existingFeedback.map(f => f.demoBookingId.toString())
    );

    // Filter out bookings that already have feedback
    const availableBookings = completedBookings.filter(
      booking => !feedbackBookingIds.has(booking._id.toString())
    );

    res.status(200).json({
      success: true,
      message: 'Available demo sessions retrieved successfully',
      data: {
        availableDemos: availableBookings.map(booking => ({
          id: booking._id,
          scheduledDateTime: booking.scheduledDateTime,
          demoType: booking.demoType,
          courseInterest: booking.courseInterest,
          instructor: booking.instructorId,
          durationMinutes: booking.durationMinutes,
          completedAt: booking.updatedAt
        })),
        totalAvailable: availableBookings.length
      }
    });

  } catch (error) {
    logger.error('Error retrieving available demos for feedback', {
      error: error.message,
      userId
    });
    throw new AppError('Failed to retrieve available demos', 500);
  }
});

export default {
  createDemoFeedback,
  getUserFeedback,
  getFeedbackById,
  updateDemoFeedback,
  getAllFeedback,
  addAdminResponse,
  getFeedbackStats,
  getAvailableDemosForFeedback
}; 