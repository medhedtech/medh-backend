import rateLimit from "express-rate-limit";
import { ENV_VARS } from "../config/envVars.js";
import logger from "../utils/logger.js";

/**
 * Configuration for different rate limit scenarios
 */
const RATE_LIMITS = {
  // Login attempts - stricter limits to prevent brute force
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: ENV_VARS.NODE_ENV === "production" ? 10 : 100, // 10 attempts per IP in production
    message: "Too many login attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Registration - prevent spam account creation
  REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: ENV_VARS.NODE_ENV === "production" ? 5 : 100, // 5 new accounts per hour in production
    message: "Too many account creation attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Password reset - prevent abuse
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: ENV_VARS.NODE_ENV === "production" ? 3 : 100, // 3 password reset attempts per hour in production
    message: "Too many password reset attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  },

  // General API rate limit - protect against abuse while allowing normal use
  API: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: ENV_VARS.NODE_ENV === "production" ? 100 : 1000, // 100 requests per 5 minutes in production
    message: "Too many requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  },
};

/**
 * Create a custom handler for rate limit exceeded events
 * @param {string} limitType - Type of rate limit that was exceeded
 * @returns {Function} Rate limit handler function
 */
const createRateLimitHandler = (limitType) => {
  return (req, res) => {
    const path = req.originalUrl || req.url;
    const ip = req.ip || req.connection.remoteAddress;

    // Log the rate limit exceeded event
    logger.warn(`Rate limit exceeded: ${limitType}`, {
      path,
      ip,
      method: req.method,
      userAgent: req.headers["user-agent"],
    });

    // Return a standardized error response
    res.status(429).json({
      success: false,
      status: "error",
      message:
        RATE_LIMITS[limitType].message ||
        "Too many requests, please try again later",
      retryAfter: Math.ceil(RATE_LIMITS[limitType].windowMs / 1000),
    });
  };
};

/**
 * Generate a rate limiter with the given configuration
 * @param {string} limitType - Type of rate limit to create (LOGIN, REGISTER, etc.)
 * @returns {Function} Express middleware for rate limiting
 */
export const getRateLimiter = (limitType) => {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.API;

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    standardHeaders: config.standardHeaders,
    legacyHeaders: config.legacyHeaders,
    handler: createRateLimitHandler(limitType),
    // Skip rate limiting in test environment
    skip: () => ENV_VARS.NODE_ENV === "test",
    // Store additional request data for logging
    keyGenerator: (req) => {
      // Use IP address as the key
      return req.ip || req.connection.remoteAddress;
    },
  });
};

// Remove all rate limiter exports and logic
