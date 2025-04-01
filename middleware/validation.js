const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

/**
 * Middleware to handle express-validator validation results
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }
  next();
};

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {string} paramName - Name of the parameter to validate
 * @returns {Function} Express middleware function
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: `${paramName} is required`
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }

    next();
  };
};

/**
 * Validates if a string is a valid date
 * @param {string} paramName - Name of the parameter to validate
 * @returns {Function} Express middleware function
 */
const validateDate = (paramName) => {
  return (req, res, next) => {
    const date = req.params[paramName];
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: `${paramName} is required`
      });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format. Please provide a valid date.`
      });
    }

    next();
  };
};

/**
 * Validates if a number is within a specified range
 * @param {string} paramName - Name of the parameter to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {Function} Express middleware function
 */
const validateNumberRange = (paramName, min, max) => {
  return (req, res, next) => {
    const value = Number(req.params[paramName]);
    
    if (isNaN(value)) {
      return res.status(400).json({
        success: false,
        message: `${paramName} must be a number`
      });
    }

    if (value < min || value > max) {
      return res.status(400).json({
        success: false,
        message: `${paramName} must be between ${min} and ${max}`
      });
    }

    next();
  };
};

/**
 * Validates if a string matches a specific pattern
 * @param {string} paramName - Name of the parameter to validate
 * @param {RegExp} pattern - Regular expression pattern to match against
 * @param {string} message - Custom error message
 * @returns {Function} Express middleware function
 */
const validatePattern = (paramName, pattern, message) => {
  return (req, res, next) => {
    const value = req.params[paramName];
    
    if (!value) {
      return res.status(400).json({
        success: false,
        message: `${paramName} is required`
      });
    }

    if (!pattern.test(value)) {
      return res.status(400).json({
        success: false,
        message: message || `Invalid ${paramName} format`
      });
    }

    next();
  };
};

module.exports = {
  validateRequest,
  validateObjectId,
  validateDate,
  validateNumberRange,
  validatePattern
}; 