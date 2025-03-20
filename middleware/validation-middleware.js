const mongoose = require('mongoose');
const { validateObjectId: isValidObjectId, validateCourseData, sanitizeCourseData } = require('../utils/validation-helpers');

/**
 * Middleware to validate MongoDB ObjectIDs in request parameters
 * @param {string} paramName - The parameter to validate
 * @returns {function} Express middleware function
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const paramValue = req.params[paramName];
    
    if (!paramValue) {
      return res.status(400).json({
        success: false,
        message: `Missing required parameter: ${paramName}`
      });
    }
    
    if (!isValidObjectId(paramValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }
    
    next();
  };
};

/**
 * Middleware to validate course input in request body
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const validateCourseInput = (req, res, next) => {
  // Skip validation for partial updates that don't modify critical fields
  if (req.method === 'POST' && req.path.includes('/update/')) {
    const { course_title, course_category, category_type } = req.body;
    
    // If none of these critical fields are being updated, skip full validation
    if (!course_title && !course_category && !category_type) {
      return next();
    }
  }
  
  // Sanitize input data
  req.body = sanitizeCourseData(req.body);
  
  // Validate course data
  const { isValid, errors } = validateCourseData(req.body);
  
  if (!isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors
    });
  }
  
  next();
};

/**
 * Middleware to validate course ID in request parameters
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const validateCourseId = (req, res, next) => {
  const courseId = req.params.id;
  
  if (!courseId) {
    return res.status(400).json({
      success: false,
      message: 'Course ID is required'
    });
  }
  
  if (!isValidObjectId(courseId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid course ID format'
    });
  }
  
  next();
};

/**
 * Middleware to validate pagination parameters
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const validatePagination = (req, res, next) => {
  let { page, limit } = req.query;
  
  // Parse and validate pagination parameters
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  
  if (isNaN(page) || page < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page must be a positive number'
    });
  }
  
  if (isNaN(limit) || limit < 1) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be a positive number'
    });
  }
  
  // Add validated pagination parameters to request
  req.pagination = { page, limit };
  next();
};

/**
 * Middleware to validate lesson input
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const validateLessonInput = (req, res, next) => {
  const { title, description, content, duration, order, videoUrl } = req.body;
  const errors = [];

  if (!title || title.trim().length < 3) {
    errors.push('Title must be at least 3 characters long');
  }

  if (description && description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long');
  }

  if (!content || content.trim().length < 20) {
    errors.push('Content must be at least 20 characters long');
  }

  if (duration && (isNaN(duration) || duration < 0)) {
    errors.push('Duration must be a positive number');
  }

  if (order && (isNaN(order) || order < 0)) {
    errors.push('Order must be a positive number');
  }

  if (videoUrl && !isValidUrl(videoUrl)) {
    errors.push('Invalid video URL format');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors
    });
  }

  next();
};

/**
 * Middleware to validate assignment input
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const validateAssignmentInput = (req, res, next) => {
  const { title, description, dueDate, maxScore, instructions } = req.body;
  const errors = [];

  if (!title || title.trim().length < 3) {
    errors.push('Title must be at least 3 characters long');
  }

  if (description && description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long');
  }

  if (dueDate && !isValidDate(dueDate)) {
    errors.push('Invalid due date format');
  }

  if (maxScore && (isNaN(maxScore) || maxScore < 0)) {
    errors.push('Maximum score must be a positive number');
  }

  if (instructions && instructions.trim().length < 10) {
    errors.push('Instructions must be at least 10 characters long');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors
    });
  }

  next();
};

/**
 * Middleware to validate quiz input
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const validateQuizInput = (req, res, next) => {
  const { title, description, duration, questions } = req.body;
  const errors = [];

  if (!title || title.trim().length < 3) {
    errors.push('Title must be at least 3 characters long');
  }

  if (description && description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long');
  }

  if (duration && (isNaN(duration) || duration < 0)) {
    errors.push('Duration must be a positive number');
  }

  if (questions && !Array.isArray(questions)) {
    errors.push('Questions must be an array');
  } else if (questions && questions.length === 0) {
    errors.push('Quiz must have at least one question');
  } else if (questions) {
    questions.forEach((question, index) => {
      if (!question.text || question.text.trim().length < 5) {
        errors.push(`Question ${index + 1} must have text`);
      }
      if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
        errors.push(`Question ${index + 1} must have at least 2 options`);
      }
      if (question.correctAnswer === undefined || question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
        errors.push(`Question ${index + 1} must have a valid correct answer`);
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors
    });
  }

  next();
};

/**
 * Middleware to validate resource input
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const validateResourceInput = (req, res, next) => {
  const { title, description, type, url } = req.body;
  const errors = [];

  if (!title || title.trim().length < 3) {
    errors.push('Title must be at least 3 characters long');
  }

  if (description && description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long');
  }

  if (!type || !['document', 'video', 'link', 'file'].includes(type)) {
    errors.push('Invalid resource type');
  }

  if (url && !isValidUrl(url)) {
    errors.push('Invalid resource URL format');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors
    });
  }

  next();
};

/**
 * Helper function to validate URLs
 * @param {string} url - URL to validate
 * @returns {boolean} Whether the URL is valid
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Helper function to validate dates
 * @param {string} date - Date to validate
 * @returns {boolean} Whether the date is valid
 */
const isValidDate = (date) => {
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate);
};

module.exports = {
  validateObjectId,
  validateCourseInput,
  validateCourseId,
  validatePagination,
  validateLessonInput,
  validateAssignmentInput,
  validateQuizInput,
  validateResourceInput
}; 