import logger from "./logger.js";

/**
 * Enhanced response formatter with integrated logging
 * Provides standardized API responses with detailed logging for monitoring and debugging
 */
export const responseFormatter = {
  /**
   * Format a successful response with consistent structure and logging
   *
   * @param {Object} res - Express response object
   * @param {*} data - Response data payload
   * @param {String} message - Success message
   * @param {Number} status - HTTP status code (default: 200)
   * @returns {Object} Formatted response
   */
  success: (res, data, message = "Operation successful", status = 200) => {
    // Add request ID to response if available
    const requestId = res.req?.requestId;
    const response = {
      success: true,
      message,
      data,
      ...(requestId && { requestId }),
    };

    // Log successful response details
    logger.info(`Success Response: ${message}`, {
      status,
      message,
      requestId,
      responseType: "success",
      dataSize: data ? JSON.stringify(data).length : 0,
    });

    return res.status(status).json(response);
  },

  /**
   * Format an error response with consistent structure and detailed error logging
   *
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {*} error - Error details or instance
   * @param {Number} status - HTTP status code (default: 500)
   * @returns {Object} Formatted error response
   */
  error: (res, message = "Operation failed", error = null, status = 500) => {
    // Extract request ID if available
    const requestId = res.req?.requestId;

    // Prepare error response
    const response = {
      success: false,
      message,
      ...(process.env.NODE_ENV !== "production" && error && { error }),
      ...(requestId && { requestId }),
    };

    // Format error for logging (with different detail levels based on environment)
    const errorForLogging =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error;

    // Log error with appropriate level
    if (status >= 500) {
      logger.error(`Server Error: ${message}`, {
        status,
        message,
        error: errorForLogging,
        requestId,
        category: "API_ERROR",
      });
    } else {
      logger.warn(`Client Error: ${message}`, {
        status,
        message,
        error: errorForLogging,
        requestId,
        category: "API_ERROR",
      });
    }

    return res.status(status).json(response);
  },

  /**
   * Format a validation error response
   *
   * @param {Object} res - Express response object
   * @param {Array|Object} errors - Validation errors
   * @param {String} message - Error message
   * @returns {Object} Formatted validation error response
   */
  validationError: (res, errors, message = "Validation failed") => {
    const requestId = res.req?.requestId;
    const formattedErrors = Array.isArray(errors) ? errors : [errors];

    logger.warn(`Validation Error: ${message}`, {
      message,
      errors: formattedErrors,
      requestId,
      category: "VALIDATION_ERROR",
    });

    return res.status(422).json({
      success: false,
      message,
      errors: formattedErrors,
      ...(requestId && { requestId }),
    });
  },

  /**
   * Format a response for unauthorized access
   *
   * @param {Object} res - Express response object
   * @param {String} message - Unauthorized message
   * @returns {Object} Formatted unauthorized response
   */
  unauthorized: (res, message = "Unauthorized access") => {
    const requestId = res.req?.requestId;

    logger.warn(`Unauthorized: ${message}`, {
      message,
      requestId,
      ip: res.req?.ip,
      url: res.req?.originalUrl,
      method: res.req?.method,
      category: "SECURITY",
    });

    return res.status(401).json({
      success: false,
      message,
      ...(requestId && { requestId }),
    });
  },

  /**
   * Format a response for forbidden access
   *
   * @param {Object} res - Express response object
   * @param {String} message - Forbidden message
   * @returns {Object} Formatted forbidden response
   */
  forbidden: (res, message = "Access forbidden") => {
    const requestId = res.req?.requestId;

    logger.warn(`Forbidden: ${message}`, {
      message,
      requestId,
      ip: res.req?.ip,
      url: res.req?.originalUrl,
      method: res.req?.method,
      userId: res.req?.user?._id,
      category: "SECURITY",
    });

    return res.status(403).json({
      success: false,
      message,
      ...(requestId && { requestId }),
    });
  },

  /**
   * Format a not found response
   *
   * @param {Object} res - Express response object
   * @param {String} message - Not found message
   * @returns {Object} Formatted not found response
   */
  notFound: (res, message = "Resource not found") => {
    const requestId = res.req?.requestId;

    logger.info(`Not Found: ${message}`, {
      message,
      requestId,
      url: res.req?.originalUrl,
      method: res.req?.method,
      category: "API_ERROR",
    });

    return res.status(404).json({
      success: false,
      message,
      ...(requestId && { requestId }),
    });
  },
};
