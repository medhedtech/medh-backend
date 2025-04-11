import crypto from "crypto";

import chalk from "chalk";
import morgan from "morgan";

import logger from "../utils/logger.js";

/**
 * Enhanced request logger middleware that provides detailed request/response tracking
 * with performance metrics, error capturing, and structured logging.
 */
const requestLogger = (req, res, next) => {
  // Add unique request ID for request tracking across logs
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();

  // Add request ID to response headers for client tracking
  res.setHeader("X-Request-Id", req.requestId);

  // Log request details with structured data
  logger.logAPIRequest(req);

  // Capture start time for performance tracking
  req.startTime = Date.now();

  // Track request body size for monitoring
  const requestSize = req.headers["content-length"]
    ? parseInt(req.headers["content-length"], 10)
    : 0;

  if (requestSize > 1000000) {
    // 1MB
    logger.warn(
      `Large request payload: ${(requestSize / 1024 / 1024).toFixed(2)}MB`,
      {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        size: requestSize,
        category: "PERFORMANCE",
      },
    );
  }

  // Store original response methods for intercepting
  const originalJson = res.json;
  const originalSend = res.send;
  const originalEnd = res.end;

  // Intercept json responses
  res.json = function (body) {
    const responseTime = Date.now() - req.startTime;
    const responseSize = JSON.stringify(body).length;

    // Log response details
    logger.logAPIResponse(req, res, responseTime, {
      requestId: req.requestId,
      responseSize,
      responseType: "json",
    });

    // Track slow responses
    if (responseTime > 1000) {
      logger.logPerformance("Slow API Response", responseTime, {
        method: req.method,
        url: req.originalUrl,
        requestId: req.requestId,
        responseSize,
      });
    }

    return originalJson.call(this, body);
  };

  // Intercept send responses
  res.send = function (body) {
    const responseTime = Date.now() - req.startTime;
    const responseSize = body
      ? typeof body === "string"
        ? body.length
        : JSON.stringify(body).length
      : 0;

    // Log response details
    logger.logAPIResponse(req, res, responseTime, {
      requestId: req.requestId,
      responseSize,
      responseType: typeof body === "string" ? "text" : "json",
    });

    return originalSend.call(this, body);
  };

  // Intercept end responses (for streams, files, etc)
  res.end = function (chunk) {
    const responseTime = Date.now() - req.startTime;

    // Log response details
    logger.logAPIResponse(req, res, responseTime, {
      requestId: req.requestId,
      responseType: "stream",
    });

    return originalEnd.call(this, chunk);
  };

  // Handle errors
  res.on("error", (error) => {
    const responseTime = Date.now() - req.startTime;

    logger.logError(error, {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      duration: responseTime,
      category: "API_ERROR",
    });
  });

  // Handle close/finish
  res.on("finish", () => {
    const responseTime = Date.now() - req.startTime;

    // Add timing to detailed performance tracking
    if (req.route) {
      const routePath = req.route.path;

      // Track performance by route
      logger.performance("route_execution_time", responseTime, {
        route: routePath,
        method: req.method,
        status: res.statusCode,
        requestId: req.requestId,
      });
    }

    // Log 4xx and 5xx responses as errors
    if (res.statusCode >= 500) {
      logger.logError(new Error(`Server Error HTTP ${res.statusCode}`), {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: responseTime,
        category: "SERVER_ERROR",
      });
    } else if (res.statusCode >= 400) {
      logger.logError(new Error(`Client Error HTTP ${res.statusCode}`), {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: responseTime,
        category: "CLIENT_ERROR",
      });
    }
  });

  next();
};

// Export a Morgan middleware creator function that uses our enhanced logger
export const createMorganLogger = () => {
  // Create custom morgan token for request ID
  morgan.token("request-id", (req) => req.requestId || crypto.randomUUID());

  // Create custom token for colored status code
  morgan.token("status-colored", (_, res) => {
    const status = res.statusCode;

    // Color based on status code
    if (status >= 500) return chalk.red.bold(status);
    if (status >= 400) return chalk.yellow.bold(status);
    if (status >= 300) return chalk.cyan.bold(status);
    if (status >= 200) return chalk.green.bold(status);
    return chalk.gray(status);
  });

  // Create custom token for response time with colors
  morgan.token("response-time-colored", (req, res, digits) => {
    const time = new Date() - req.startTime;
    const timeStr = time.toFixed(digits) + "ms";

    // Color based on response time
    if (time > 1000) return chalk.red.bold(timeStr);
    if (time > 500) return chalk.yellow.bold(timeStr);
    if (time > 100) return chalk.cyan(timeStr);
    return chalk.green(timeStr);
  });

  // Custom format including request ID, method, path, status, response time, and size
  const format =
    ":request-id :method :url :status-colored :response-time-colored :res[content-length]";

  // Create morgan middleware with custom logger stream
  return morgan(format, {
    stream: {
      write: (message) => {
        // Strip the newline that morgan adds
        const logMessage = message.trim();

        // Log to our winston logger
        logger.http(logMessage);
      },
    },
  });
};

export default requestLogger;
