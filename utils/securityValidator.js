import logger from "./logger.js";
import { rateLimit } from "express-rate-limit";
import crypto from "crypto";

/**
 * Comprehensive Security Validator for Form Submissions
 * Protects against XSS, injection attacks, and other security vulnerabilities
 */
export class SecurityValidator {
  constructor() {
    this.suspiciousPatterns = this.loadSuspiciousPatterns();
    this.rateLimitStore = new Map();
    this.ipBlocklist = new Set();
    this.maxRequestsPerMinute = 10;
  }

  /**
   * Main security validation middleware
   */
  static validateFormSubmission(req, res, next) {
    const validator = new SecurityValidator();

    try {
      // Step 1: Rate limiting check
      validator.checkRateLimit(req);

      // Step 2: IP blocklist check
      validator.checkIPBlocklist(req);

      // Step 3: Comprehensive input sanitization
      req.body = validator.sanitizeInput(req.body);

      // Step 4: Check for injection attempts
      validator.checkForInjectionAttempts(req.body);

      // Step 5: Check for suspicious patterns
      validator.checkSuspiciousPatterns(req.body, req);

      // Step 6: Validate file uploads if present
      if (req.file || req.files) {
        validator.validateFileUploads(req);
      }

      // Step 7: Check request size
      validator.validateRequestSize(req);

      next();
    } catch (error) {
      validator.logSecurityViolation(req, error);

      // Block IP after multiple violations
      validator.handleSecurityViolation(req, error);

      return res.status(400).json({
        success: false,
        message: "Invalid form data",
        error_code: "VALIDATION_FAILED",
      });
    }
  }

  /**
   * Sanitize input data recursively
   * @param {*} data - Data to sanitize
   * @returns {*} Sanitized data
   */
  sanitizeInput(data) {
    const sanitize = (obj) => {
      if (typeof obj === "string") {
        return this.sanitizeString(obj);
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      if (obj && typeof obj === "object" && obj.constructor === Object) {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          // Sanitize key names too
          const sanitizedKey = this.sanitizeString(key);
          sanitized[sanitizedKey] = sanitize(value);
        }
        return sanitized;
      }

      return obj;
    };

    return sanitize(data);
  }

  /**
   * Sanitize individual strings
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string
   */
  sanitizeString(str) {
    if (typeof str !== "string") return str;

    return (
      str
        // Remove script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        // Remove javascript: protocol
        .replace(/javascript:/gi, "")
        // Remove event handlers
        .replace(/on\w+\s*=/gi, "")
        // Remove data: protocol (potential XSS vector)
        .replace(/data\s*:/gi, "")
        // Remove vbscript: protocol
        .replace(/vbscript\s*:/gi, "")
        // Remove style attributes that could contain expressions
        .replace(/style\s*=\s*["'][^"']*expression\s*\([^"']*["']/gi, "")
        // Remove NULL bytes
        .replace(/\0/g, "")
        // Normalize whitespace
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  /**
   * Check for various injection attempts
   * @param {*} data - Data to check
   * @throws {Error} If injection attempt detected
   */
  checkForInjectionAttempts(data) {
    const maliciousPatterns = [
      // SQL Injection patterns
      {
        pattern:
          /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|where|into|values|table|database|schema)\b)/gi,
        type: "SQL_INJECTION",
        severity: "HIGH",
      },

      // NoSQL Injection patterns
      {
        pattern: /\$\w+\s*:/g,
        type: "NOSQL_INJECTION",
        severity: "HIGH",
      },

      // Template Injection patterns
      {
        pattern: /\{\{.*\}\}|\$\{.*\}|<%.*%>/g,
        type: "TEMPLATE_INJECTION",
        severity: "HIGH",
      },

      // Command Injection patterns
      {
        pattern: /(\||&|;|`|\$\(|\${|<\(|>\()/g,
        type: "COMMAND_INJECTION",
        severity: "CRITICAL",
      },

      // XSS patterns
      {
        pattern:
          /<\s*(script|iframe|object|embed|form|input|img|svg|math|details|marquee)\b[^>]*>/gi,
        type: "XSS_ATTEMPT",
        severity: "HIGH",
      },

      // LDAP Injection patterns
      {
        pattern: /(\*|\|\||&&|\(|\)|=|<|>|~|!)/g,
        type: "LDAP_INJECTION",
        severity: "MEDIUM",
      },

      // Path Traversal patterns
      {
        pattern: /(\.\.[\/\\]|%2e%2e[%2f%5c]|\.\.%2f|\.\.%5c)/gi,
        type: "PATH_TRAVERSAL",
        severity: "HIGH",
      },
    ];

    const checkString = JSON.stringify(data);

    for (const { pattern, type, severity } of maliciousPatterns) {
      const matches = checkString.match(pattern);
      if (matches) {
        throw new Error(
          `${type} attempt detected: ${matches[0]} (Severity: ${severity})`,
        );
      }
    }
  }

  /**
   * Check for suspicious patterns that might indicate malicious intent
   * @param {*} data - Data to check
   * @param {Object} req - Express request object
   * @throws {Error} If suspicious pattern detected
   */
  checkSuspiciousPatterns(data, req) {
    const checkString = JSON.stringify(data).toLowerCase();

    // Check for unusually long strings (potential buffer overflow)
    if (checkString.length > 50000) {
      // 50KB
      throw new Error("Request payload too large");
    }

    // Check for excessive nesting (potential DoS)
    const nestingLevel = this.calculateNestingLevel(data);
    if (nestingLevel > 10) {
      throw new Error("Excessive data nesting detected");
    }

    // Check for suspicious keywords
    const suspiciousKeywords = [
      "eval",
      "function",
      "constructor",
      "prototype",
      "alert",
      "confirm",
      "prompt",
      "document.cookie",
      "window.location",
      "document.write",
      "innerHTML",
      "outerHTML",
      "insertAdjacentHTML",
    ];

    for (const keyword of suspiciousKeywords) {
      if (checkString.includes(keyword.toLowerCase())) {
        logger.warn("Suspicious keyword detected", {
          keyword,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        });
      }
    }

    // Check for encoded payloads
    if (this.containsEncodedPayload(checkString)) {
      throw new Error("Encoded payload detected");
    }

    // Check for repeated patterns (potential spam/bot)
    if (this.containsRepeatedPatterns(checkString)) {
      throw new Error("Repeated patterns detected (possible bot activity)");
    }
  }

  /**
   * Calculate nesting level of object/array
   * @param {*} obj - Object to check
   * @param {number} level - Current level
   * @returns {number} Maximum nesting level
   */
  calculateNestingLevel(obj, level = 0) {
    if (typeof obj !== "object" || obj === null) {
      return level;
    }

    let maxLevel = level;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        maxLevel = Math.max(
          maxLevel,
          this.calculateNestingLevel(item, level + 1),
        );
      }
    } else {
      for (const value of Object.values(obj)) {
        maxLevel = Math.max(
          maxLevel,
          this.calculateNestingLevel(value, level + 1),
        );
      }
    }

    return maxLevel;
  }

  /**
   * Check if string contains encoded payloads
   * @param {string} str - String to check
   * @returns {boolean} Whether encoded payload detected
   */
  containsEncodedPayload(str) {
    // Check for URL encoding of suspicious patterns
    const encodedPatterns = [
      /%3c%73%63%72%69%70%74/i, // <script
      /%3c%69%66%72%61%6d%65/i, // <iframe
      /%22%3e%3c%73%63%72%69%70%74/i, // "><script
      /%27%3e%3c%73%63%72%69%70%74/i, // '><script
    ];

    return encodedPatterns.some((pattern) => pattern.test(str));
  }

  /**
   * Check for repeated patterns that might indicate bot activity
   * @param {string} str - String to check
   * @returns {boolean} Whether repeated patterns detected
   */
  containsRepeatedPatterns(str) {
    // Check for repeated characters (>50 same characters)
    if (/(.)\1{50,}/.test(str)) {
      return true;
    }

    // Check for repeated words (>10 same words)
    const words = str.split(/\s+/);
    const wordCounts = {};

    for (const word of words) {
      if (word.length > 3) {
        // Only check words longer than 3 characters
        wordCounts[word] = (wordCounts[word] || 0) + 1;
        if (wordCounts[word] > 10) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Validate file uploads for security issues
   * @param {Object} req - Express request object
   * @throws {Error} If file validation fails
   */
  validateFileUploads(req) {
    const files = req.files || (req.file ? [req.file] : []);

    for (const file of files) {
      // Check file size
      if (file.size > 100 * 1024 * 1024) {
        // 100MB
        throw new Error(`File too large: ${file.size} bytes`);
      }

      // Check filename for directory traversal
      if (
        file.originalname &&
        (file.originalname.includes("../") ||
          file.originalname.includes("..\\"))
      ) {
        throw new Error("Directory traversal in filename");
      }

      // Check for executable file extensions
      const dangerousExts = [
        ".exe",
        ".bat",
        ".cmd",
        ".com",
        ".pif",
        ".scr",
        ".vbs",
        ".js",
        ".jar",
        ".sh",
      ];
      const fileExt = file.originalname
        ? file.originalname.toLowerCase().split(".").pop()
        : "";

      if (dangerousExts.includes(`.${fileExt}`)) {
        throw new Error(`Dangerous file extension: .${fileExt}`);
      }

      // Check MIME type vs file extension consistency
      if (file.mimetype && file.originalname) {
        const expectedMimeTypes = {
          jpg: ["image/jpeg"],
          jpeg: ["image/jpeg"],
          png: ["image/png"],
          gif: ["image/gif"],
          pdf: ["application/pdf"],
          doc: ["application/msword"],
          docx: [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
        };

        const expected = expectedMimeTypes[fileExt];
        if (expected && !expected.includes(file.mimetype)) {
          throw new Error(
            `MIME type ${file.mimetype} doesn't match extension .${fileExt}`,
          );
        }
      }
    }
  }

  /**
   * Validate request size
   * @param {Object} req - Express request object
   * @throws {Error} If request too large
   */
  validateRequestSize(req) {
    const contentLength = parseInt(req.headers["content-length"], 10);
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (contentLength > maxSize) {
      throw new Error(
        `Request too large: ${contentLength} bytes (max: ${maxSize})`,
      );
    }
  }

  /**
   * Check rate limiting
   * @param {Object} req - Express request object
   * @throws {Error} If rate limit exceeded
   */
  checkRateLimit(req) {
    const ip = req.ip;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute

    if (!this.rateLimitStore.has(ip)) {
      this.rateLimitStore.set(ip, []);
    }

    const requests = this.rateLimitStore.get(ip);

    // Remove old requests outside the window
    const validRequests = requests.filter(
      (timestamp) => now - timestamp < windowMs,
    );

    if (validRequests.length >= this.maxRequestsPerMinute) {
      throw new Error(
        `Rate limit exceeded: ${validRequests.length} requests in last minute`,
      );
    }

    // Add current request
    validRequests.push(now);
    this.rateLimitStore.set(ip, validRequests);
  }

  /**
   * Check if IP is in blocklist
   * @param {Object} req - Express request object
   * @throws {Error} If IP is blocked
   */
  checkIPBlocklist(req) {
    const ip = req.ip;

    if (this.ipBlocklist.has(ip)) {
      throw new Error(`IP ${ip} is blocked`);
    }
  }

  /**
   * Handle security violations
   * @param {Object} req - Express request object
   * @param {Error} error - Security error
   */
  handleSecurityViolation(req, error) {
    const ip = req.ip;

    // Count violations for this IP
    const violationKey = `violations_${ip}`;
    const violations = this.rateLimitStore.get(violationKey) || 0;

    this.rateLimitStore.set(violationKey, violations + 1);

    // Block IP after 5 violations in 1 hour
    if (violations >= 5) {
      this.ipBlocklist.add(ip);
      logger.security("IP blocked due to repeated violations", {
        ip,
        violations: violations + 1,
        error: error.message,
      });

      // Auto-unblock after 24 hours
      setTimeout(
        () => {
          this.ipBlocklist.delete(ip);
          this.rateLimitStore.delete(violationKey);
        },
        24 * 60 * 60 * 1000,
      );
    }
  }

  /**
   * Log security violations
   * @param {Object} req - Express request object
   * @param {Error} error - Security error
   */
  logSecurityViolation(req, error) {
    logger.security("Form validation security violation", {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      url: req.originalUrl,
      method: req.method,
      body: this.sanitizeForLogging(req.body),
      error: error.message,
      timestamp: new Date().toISOString(),
      requestId: req.requestId || crypto.randomBytes(8).toString("hex"),
    });
  }

  /**
   * Sanitize data for safe logging
   * @param {*} data - Data to sanitize
   * @returns {*} Sanitized data safe for logging
   */
  sanitizeForLogging(data) {
    const sensitiveFields = ["password", "token", "secret", "key", "auth"];

    const sanitize = (obj) => {
      if (typeof obj === "string") {
        return obj.length > 100 ? obj.substring(0, 100) + "..." : obj;
      }

      if (Array.isArray(obj)) {
        return obj.slice(0, 10).map(sanitize); // Limit array size
      }

      if (obj && typeof obj === "object") {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();

          if (sensitiveFields.some((field) => lowerKey.includes(field))) {
            sanitized[key] = "[REDACTED]";
          } else {
            sanitized[key] = sanitize(value);
          }
        }
        return sanitized;
      }

      return obj;
    };

    return sanitize(data);
  }

  /**
   * Load suspicious patterns from configuration
   * @returns {Array} Array of suspicious patterns
   */
  loadSuspiciousPatterns() {
    return [
      // Add more patterns as needed
      "union select",
      "drop table",
      "script>",
      "javascript:",
      "eval(",
      "document.cookie",
    ];
  }

  /**
   * Create rate limiting middleware for specific routes
   * @param {Object} options - Rate limiting options
   * @returns {Function} Express middleware
   */
  static createRateLimit(options = {}) {
    return rateLimit({
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
      max: options.max || 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: "Too many requests, please try again later.",
        error_code: "RATE_LIMIT_EXCEEDED",
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for admin users
        return req.user && req.user.role === "super-admin";
      },
    });
  }
}

export default SecurityValidator;
