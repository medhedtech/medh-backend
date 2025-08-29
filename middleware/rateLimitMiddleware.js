import rateLimit from "express-rate-limit";

// Default rate limiting configuration
const defaultConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    console.log(`🚫 Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests from this IP, please try again later.",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
    });
  },
};

// Create rate limit middleware with custom config
export const rateLimitMiddleware = (config = {}) => {
  const finalConfig = { ...defaultConfig, ...config };
  return rateLimit(finalConfig);
};

// Predefined rate limiters for different use cases
export const authRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 auth attempts per 15 minutes
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
});

export const apiRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 API calls per 15 minutes
  message: {
    success: false,
    message: "API rate limit exceeded, please try again later.",
  },
});

export const strictRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 requests per 15 minutes
  message: {
    success: false,
    message: "Strict rate limit exceeded, please try again later.",
  },
});

export default rateLimitMiddleware;

