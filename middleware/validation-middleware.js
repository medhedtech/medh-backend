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

module.exports = {
  validateObjectId,
  validateCourseInput,
  validateCourseId,
  validatePagination
}; 