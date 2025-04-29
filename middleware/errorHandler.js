/**
 * Standardized Error Handler Middleware
 * 
 * Part of Sprint 3: DevOps Essentials
 * Provides consistent error handling across the application
 */

import logger from '../utils/logger.js';
import metrics from '../utils/metrics.js';

// Error codes and their default messages
const ERROR_TYPES = {
  VALIDATION: {
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'Invalid input data'
  },
  AUTHENTICATION: {
    status: 401,
    code: 'AUTHENTICATION_ERROR',
    message: 'Authentication required'
  },
  AUTHORIZATION: {
    status: 403,
    code: 'AUTHORIZATION_ERROR',
    message: 'Insufficient permissions'
  },
  NOT_FOUND: {
    status: 404,
    code: 'RESOURCE_NOT_FOUND',
    message: 'Resource not found'
  },
  CONFLICT: {
    status: 409,
    code: 'RESOURCE_CONFLICT',
    message: 'Resource conflict'
  },
  RATE_LIMIT: {
    status: 429,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests'
  },
  INTERNAL: {
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error'
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service temporarily unavailable'
  }
};

/**
 * Creates a standard error object with consistent structure
 * @param {string} type - Error type from ERROR_TYPES
 * @param {string} message - Custom error message (optional)
 * @param {Object} details - Additional error details (optional)
 * @returns {Object} Standardized error object
 */
export const createError = (type, message, details = {}) => {
  if (!ERROR_TYPES[type]) {
    type = 'INTERNAL';
  }

  const error = new Error(message || ERROR_TYPES[type].message);
  error.status = ERROR_TYPES[type].status;
  error.code = ERROR_TYPES[type].code;
  error.details = details;
  
  return error;
};

/**
 * Main error handler middleware
 * Processes all errors and returns standardized responses
 */
export const errorHandler = (err, req, res, next) => {
  // Increment error count metric
  metrics.errorCount.increment();
  
  // Ensure error has appropriate properties
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Something went wrong';
  
  // Log the error with appropriate level
  const logMethod = status >= 500 ? 'error' : 'warn';
  logger[logMethod](`[${code}] ${message}`, {
    error: {
      status,
      code,
      message,
      stack: err.stack,
      details: err.details
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      user: req.user ? req.user.id : 'anonymous'
    }
  });
  
  // Return formatted error response
  const response = {
    status: 'error',
    code,
    message
  };
  
  // Include error details in non-production environments
  if (process.env.NODE_ENV !== 'production' && err.details) {
    response.details = err.details;
  }
  
  // Include request ID if available
  if (req.id) {
    response.requestId = req.id;
  }
  
  return res.status(status).json(response);
};

/**
 * 404 Handler - Convert 404s to standardized errors
 */
export const notFoundHandler = (req, res, next) => {
  next(createError('NOT_FOUND', `Route not found: ${req.originalUrl}`));
};

// Export error types for usage throughout the application
export const ERROR = Object.keys(ERROR_TYPES).reduce((acc, key) => {
  acc[key] = key;
  return acc;
}, {});

export default {
  errorHandler,
  notFoundHandler,
  createError,
  ERROR
};
