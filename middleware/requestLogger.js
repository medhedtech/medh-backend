import crypto from "crypto";

import morgan from "morgan";

import logger from "../utils/logger.js";

const requestLogger = (req, res, next) => {
  // Add request ID for tracking
  req.requestId = crypto.randomUUID();

  // Log request
  logger.logAPIRequest(req, { requestId: req.requestId });

  // Get timestamp for performance tracking
  req.startTime = Date.now();

  // Override res.json to intercept and log response
  const originalJson = res.json;
  res.json = function (body) {
    const responseTime = Date.now() - req.startTime;

    logger.logAPIResponse(req, res, responseTime, {
      requestId: req.requestId,
      responseSize: JSON.stringify(body).length,
    });

    // Log slow responses (over 1000ms)
    if (responseTime > 1000) {
      logger.logPerformance("Slow API Response", responseTime, {
        method: req.method,
        url: req.originalUrl,
        requestId: req.requestId,
      });
    }

    return originalJson.call(this, body);
  };

  // Handle errors
  res.on("error", (error) => {
    logger.logError(error, {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
    });
  });

  // Handle close/finish
  res.on("finish", () => {
    // Log 4xx and 5xx responses
    if (res.statusCode >= 400) {
      logger.logError(new Error(`HTTP ${res.statusCode}`), {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
      });
    }
  });

  next();
};

module.exports = requestLogger;
