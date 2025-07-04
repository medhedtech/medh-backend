import { v4 as uuidv4 } from "uuid";

import logger from "../utils/logger.js";

const requestTracker = (req, res, next) => {
  // Generate unique request ID
  req.requestId = uuidv4();
  req.startTime = Date.now();

  // Extract user info if available
  const userInfo = req.user
    ? {
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
      }
    : null;

  // Extract client info
  const clientInfo = {
    ip: req.ip,
    userAgent: req.get("user-agent"),
    referer: req.get("referer"),
    language: req.get("accept-language"),
  };

  // Log request
  logger.info("Incoming Request", {
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    body: sanitizeRequestBody(req.body),
    headers: sanitizeHeaders(req.headers),
    user: userInfo,
    client: clientInfo,
    sessionId: req.sessionID,
  });

  // Override response methods to track response
  const originalJson = res.json;
  const originalSend = res.send;
  const originalEnd = res.end;

  res.json = function (body) {
    logResponse(req, res, body);
    return originalJson.call(this, body);
  };

  res.send = function (body) {
    logResponse(req, res, body);
    return originalSend.call(this, body);
  };

  res.end = function (chunk) {
    logResponse(req, res, chunk);
    return originalEnd.call(this, chunk);
  };

  // Track response time
  res.on("finish", () => {
    const duration = Date.now() - req.startTime;

    // Log performance metrics
    logger.info("Request Completed", {
      requestId: req.requestId,
      duration,
      statusCode: res.statusCode,
      contentLength: res.get("content-length"),
      timestamp: new Date().toISOString(),
    });

    // Log slow requests
    if (duration > 1000) {
      logger.warn("Slow Request Detected", {
        requestId: req.requestId,
        duration,
        method: req.method,
        path: req.path,
        user: userInfo,
      });
    }
  });

  next();
};

const logResponse = (req, res, body) => {
  const duration = Date.now() - req.startTime;

  const responseLog = {
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    duration,
    statusCode: res.statusCode,
    headers: res.getHeaders(),
    body: sanitizeResponseBody(body),
  };

  // Log based on status code
  if (res.statusCode >= 500) {
    logger.error("Server Error Response", responseLog);
  } else if (res.statusCode >= 400) {
    logger.warn("Client Error Response", responseLog);
  } else {
    logger.info("Success Response", responseLog);
  }
};

const sanitizeRequestBody = (body) => {
  if (!body) return body;
  const sanitized = { ...body };
  const sensitiveFields = [
    "password",
    "token",
    "apiKey",
    "secret",
    "creditCard",
    "ssn",
    "authorization",
  ];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  });

  return sanitized;
};

const sanitizeResponseBody = (body) => {
  if (!body) return body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return body.length > 1000 ? body.substring(0, 1000) + "..." : body;
    }
  }

  const sanitized = { ...body };
  const sensitiveFields = ["token", "secret", "apiKey"];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  });

  return sanitized;
};

const sanitizeHeaders = (headers) => {
  const sanitized = { ...headers };
  const sensitiveHeaders = [
    "authorization",
    "cookie",
    "x-api-key",
    "proxy-authorization",
  ];

  sensitiveHeaders.forEach((header) => {
    if (sanitized[header]) {
      sanitized[header] = "[REDACTED]";
    }
  });

  return sanitized;
};

module.exports = requestTracker;
