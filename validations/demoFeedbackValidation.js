import Joi from 'joi';
import mongoose from 'mongoose';
import DemoBooking from '../models/demo-booking.model.js';
import DemoFeedback from '../models/demo-feedback.model.js';
import { AppError } from '../utils/errorHandler.js';
import catchAsync from '../utils/catchAsync.js';
import logger from '../utils/logger.js';

/**
 * Validation schema for creating demo feedback
 */
const createFeedbackSchema = Joi.object({
  demoBookingId: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.required': 'Demo booking ID is required',
      'any.invalid': 'Invalid demo booking ID format'
    }),

  overallRating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.base': 'Overall rating must be a number',
      'number.integer': 'Overall rating must be an integer',
      'number.min': 'Overall rating must be at least 1',
      'number.max': 'Overall rating cannot exceed 5',
      'any.required': 'Overall rating is required'
    }),

  contentQuality: Joi.string()
    .valid('excellent', 'good', 'average', 'poor')
    .required()
    .messages({
      'any.only': 'Content quality must be one of: excellent, good, average, poor',
      'any.required': 'Content quality rating is required'
    }),

  instructorPerformance: Joi.string()
    .valid('excellent', 'good', 'average', 'poor')
    .required()
    .messages({
      'any.only': 'Instructor performance must be one of: excellent, good, average, poor',
      'any.required': 'Instructor performance rating is required'
    }),

  additionalComments: Joi.string()
    .trim()
    .max(2000)
    .allow('')
    .messages({
      'string.max': 'Additional comments cannot exceed 2000 characters'
    }),

  wouldRecommend: Joi.boolean()
    .required()
    .messages({
      'any.required': 'Recommendation status is required'
    }),

  // Specific feedback (optional)
  specificFeedback: Joi.object({
    demoStructure: Joi.object({
      rating: Joi.string().valid('excellent', 'good', 'average', 'poor'),
      comments: Joi.string().trim().max(500).allow('')
    }),
    technicalAspects: Joi.object({
      rating: Joi.string().valid('excellent', 'good', 'average', 'poor'),
      comments: Joi.string().trim().max(500).allow('')
    }),
    interaction: Joi.object({
      rating: Joi.string().valid('excellent', 'good', 'average', 'poor'),
      comments: Joi.string().trim().max(500).allow('')
    }),
    relevance: Joi.object({
      rating: Joi.string().valid('excellent', 'good', 'average', 'poor'),
      comments: Joi.string().trim().max(500).allow('')
    })
  }).messages({
    'string.max': 'Specific feedback comments cannot exceed 500 characters'
  }),

  likedMost: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Liked most cannot exceed 1000 characters'
    }),

  improvementAreas: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Improvement areas cannot exceed 1000 characters'
    }),

  followUpInterest: Joi.object({
    enrollmentInterest: Joi.boolean().default(false),
    consultationRequest: Joi.boolean().default(false),
    moreInfoRequest: Joi.boolean().default(false),
    specificCourseInterest: Joi.string().trim().allow('')
  }),

  feedbackSource: Joi.string()
    .valid('email_link', 'website_form', 'mobile_app', 'phone_call', 'other')
    .default('website_form'),

  ipAddress: Joi.string().ip({ version: ['ipv4', 'ipv6'] }).allow(''),
  userAgent: Joi.string().max(500).allow('')
});

/**
 * Validation schema for updating feedback
 */
const updateFeedbackSchema = Joi.object({
  feedbackId: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }),

  overallRating: Joi.number().integer().min(1).max(5),
  contentQuality: Joi.string().valid('excellent', 'good', 'average', 'poor'),
  instructorPerformance: Joi.string().valid('excellent', 'good', 'average', 'poor'),
  additionalComments: Joi.string().trim().max(2000).allow(''),
  wouldRecommend: Joi.boolean(),
  
  specificFeedback: Joi.object({
    demoStructure: Joi.object({
      rating: Joi.string().valid('excellent', 'good', 'average', 'poor'),
      comments: Joi.string().trim().max(500).allow('')
    }),
    technicalAspects: Joi.object({
      rating: Joi.string().valid('excellent', 'good', 'average', 'poor'),
      comments: Joi.string().trim().max(500).allow('')
    }),
    interaction: Joi.object({
      rating: Joi.string().valid('excellent', 'good', 'average', 'poor'),
      comments: Joi.string().trim().max(500).allow('')
    }),
    relevance: Joi.object({
      rating: Joi.string().valid('excellent', 'good', 'average', 'poor'),
      comments: Joi.string().trim().max(500).allow('')
    })
  }),

  likedMost: Joi.string().trim().max(1000).allow(''),
  improvementAreas: Joi.string().trim().max(1000).allow(''),
  
  followUpInterest: Joi.object({
    enrollmentInterest: Joi.boolean(),
    consultationRequest: Joi.boolean(),
    moreInfoRequest: Joi.boolean(),
    specificCourseInterest: Joi.string().trim().allow('')
  })
});

/**
 * Validation schema for admin response
 */
const adminResponseSchema = Joi.object({
  feedbackId: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }),

  responseText: Joi.string()
    .trim()
    .max(1000)
    .required()
    .messages({
      'any.required': 'Response text is required',
      'string.max': 'Response text cannot exceed 1000 characters'
    }),

  isPublic: Joi.boolean().default(false),
  
  internalNotes: Joi.string().trim().max(1000).allow(''),
  
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  
  tags: Joi.array().items(Joi.string().trim().lowercase())
});

/**
 * Validation schema for getting feedback
 */
const getFeedbackSchema = Joi.object({
  demoBookingId: Joi.string().custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }),
  
  userId: Joi.string().custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }),
  
  overallRating: Joi.number().integer().min(1).max(5),
  contentQuality: Joi.string().valid('excellent', 'good', 'average', 'poor'),
  instructorPerformance: Joi.string().valid('excellent', 'good', 'average', 'poor'),
  wouldRecommend: Joi.boolean(),
  status: Joi.string().valid('pending', 'reviewed', 'responded', 'archived'),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')),
  
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  
  sortBy: Joi.string().valid('createdAt', 'overallRating', 'status', 'priority').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Middleware to validate create feedback request
 */
export const validateCreateFeedback = catchAsync(async (req, res, next) => {
  const { error, value } = createFeedbackSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    logger.warn('Demo feedback validation failed', {
      errors: validationErrors,
      requestBody: req.body
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors
    });
  }

  req.validatedData = value;
  next();
});

/**
 * Middleware to validate update feedback request
 */
export const validateUpdateFeedback = catchAsync(async (req, res, next) => {
  const { error, value } = updateFeedbackSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors
    });
  }

  req.validatedData = value;
  next();
});

/**
 * Middleware to validate admin response request
 */
export const validateAdminResponse = catchAsync(async (req, res, next) => {
  const { error, value } = adminResponseSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors
    });
  }

  req.validatedData = value;
  next();
});

/**
 * Middleware to validate get feedback request
 */
export const validateGetFeedback = catchAsync(async (req, res, next) => {
  const { error, value } = getFeedbackSchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors
    });
  }

  req.validatedQuery = value;
  next();
});

/**
 * Middleware to validate feedback ID parameter
 */
export const validateFeedbackId = catchAsync(async (req, res, next) => {
  const { feedbackId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid feedback ID format',
      error_code: 'INVALID_FEEDBACK_ID'
    });
  }

  req.params.feedbackId = feedbackId;
  next();
});

/**
 * Middleware to check if demo booking exists and is eligible for feedback
 */
export const checkDemoBookingEligibility = catchAsync(async (req, res, next) => {
  const { demoBookingId } = req.validatedData || req.body;

  // Check if demo booking exists
  const demoBooking = await DemoBooking.findById(demoBookingId);
  if (!demoBooking) {
    return res.status(404).json({
      success: false,
      message: 'Demo booking not found',
      error_code: 'DEMO_BOOKING_NOT_FOUND'
    });
  }

  // Check if demo is completed
  if (demoBooking.status !== 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Feedback can only be provided for completed demo sessions',
      error_code: 'DEMO_NOT_COMPLETED'
    });
  }

  // Check if user is authorized to provide feedback
  const userId = req.user?.id;
  if (userId && demoBooking.userId.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'You are not authorized to provide feedback for this demo booking',
      error_code: 'UNAUTHORIZED_FEEDBACK'
    });
  }

  req.demoBooking = demoBooking;
  next();
});

/**
 * Middleware to check for duplicate feedback
 */
export const checkDuplicateFeedback = catchAsync(async (req, res, next) => {
  const { demoBookingId } = req.validatedData || req.body;
  const userId = req.user?.id || req.validatedData?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'User authentication required for feedback',
      error_code: 'AUTH_REQUIRED'
    });
  }

  // Check if feedback already exists
  const existingFeedback = await DemoFeedback.findOne({
    demoBookingId,
    userId,
    isActive: true
  });

  if (existingFeedback) {
    return res.status(409).json({
      success: false,
      message: 'Feedback has already been provided for this demo session',
      error_code: 'DUPLICATE_FEEDBACK',
      data: {
        existingFeedbackId: existingFeedback._id,
        submittedAt: existingFeedback.createdAt
      }
    });
  }

  next();
});

/**
 * Middleware to sanitize feedback data
 */
export const sanitizeFeedbackData = (req, res, next) => {
  // Get client IP and user agent
  req.body.ipAddress = req.ip || req.connection.remoteAddress;
  req.body.userAgent = req.get('User-Agent');

  // Set user ID from authenticated user if available
  if (req.user && req.user.id) {
    req.body.userId = req.user.id;
  }

  next();
};

/**
 * Middleware to validate feedback ownership for updates
 */
export const validateFeedbackOwnership = catchAsync(async (req, res, next) => {
  const { feedbackId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error_code: 'AUTH_REQUIRED'
    });
  }

  // Find the feedback
  const feedback = await DemoFeedback.findById(feedbackId);
  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found',
      error_code: 'FEEDBACK_NOT_FOUND'
    });
  }

  // Check ownership
  if (feedback.userId.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'You are not authorized to modify this feedback',
      error_code: 'UNAUTHORIZED_FEEDBACK_UPDATE'
    });
  }

  req.feedback = feedback;
  next();
});

export default {
  validateCreateFeedback,
  validateUpdateFeedback,
  validateAdminResponse,
  validateGetFeedback,
  validateFeedbackId,
  checkDemoBookingEligibility,
  checkDuplicateFeedback,
  sanitizeFeedbackData,
  validateFeedbackOwnership
}; 