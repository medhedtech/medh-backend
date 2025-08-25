import { body } from 'express-validator';

/**
 * Password validation middleware for different scenarios
 */

// Common password patterns to check against
const WEAK_PASSWORD_PATTERNS = [
  /^123456/i,        // Starts with 123456
  /^password/i,      // Starts with password
  /^qwerty/i,        // Starts with qwerty
  /^abc123/i,        // Starts with abc123
  /^admin/i,         // Starts with admin
  /^letmein/i,       // Starts with letmein
  /^welcome/i,       // Starts with welcome
  /^monkey/i,        // Starts with monkey
  /^dragon/i,        // Starts with dragon
  /^master/i,        // Starts with master
  /(.)\1{3,}/,       // Repeated characters (aaaa, 1111, etc.)
  /^(\d+)$/,         // Only numbers
  /^([a-z]+)$/i,     // Only letters
];

// Dictionary of common passwords to reject
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
  'password1', 'admin', 'welcome', 'login', 'guest', 'test', 'user',
  'master', 'root', 'administrator', 'support', 'service', 'temp',
  'demo', 'sample', 'example', 'default', 'changeme', 'letmein'
];

/**
 * Enhanced password strength validation
 * @param {string} password - Password to validate
 * @returns {boolean} - True if password is strong enough
 */
const validatePasswordStrength = (password) => {
  // Check minimum requirements
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isValidLength = password.length >= 8 && password.length <= 128;

  if (!isValidLength || !hasUppercase || !hasLowercase || !hasNumbers || !hasSpecialChars) {
    return false;
  }

  // Check against weak patterns
  const hasWeakPattern = WEAK_PASSWORD_PATTERNS.some(pattern => pattern.test(password));
  if (hasWeakPattern) {
    return false;
  }

  // Check against common passwords
  const isCommonPassword = COMMON_PASSWORDS.some(common => 
    password.toLowerCase().includes(common.toLowerCase())
  );
  if (isCommonPassword) {
    return false;
  }

  return true;
};

/**
 * Validation for password change requests
 */
export const validateChangePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required")
    .isLength({ min: 1 })
    .withMessage("Current password cannot be empty"),

  body("newPassword")
    .isLength({ min: 1, max: 1000 })
    .withMessage("New password must be at least 1 character long")
    .custom((value, { req }) => {
      // Ensure new password is different from current password
      if (value === req.body.currentPassword) {
        throw new Error("New password must be different from current password");
      }
      return true;
    }),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Password confirmation is required")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Password confirmation does not match new password");
      }
      return true;
    }),

  body("invalidateAllSessions")
    .optional()
    .isBoolean()
    .withMessage("invalidateAllSessions must be a boolean value")
    .toBoolean()
];

/**
 * Validation for password reset (public endpoint)
 */
export const validateResetPassword = [
  body("token")
    .notEmpty()
    .withMessage("Reset token is required")
    .isLength({ min: 1 })
    .withMessage("Reset token cannot be empty"),

  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character")
    .custom((value) => {
      if (!validatePasswordStrength(value)) {
        throw new Error("Password is too weak or contains common patterns. Please choose a stronger password.");
      }
      return true;
    }),

  body("confirmPassword")
    .optional()
    .custom((value, { req }) => {
      if (value && value !== req.body.password) {
        throw new Error("Password confirmation does not match password");
      }
      return true;
    })
];

/**
 * Validation for user registration
 */
export const validateRegistrationPassword = [
  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character")
    .custom((value) => {
      if (!validatePasswordStrength(value)) {
        throw new Error("Password is too weak or contains common patterns. Please choose a stronger password.");
      }
      return true;
    }),

  body("confirmPassword")
    .optional()
    .custom((value, { req }) => {
      if (value && value !== req.body.password) {
        throw new Error("Password confirmation does not match password");
      }
      return true;
    })
];

/**
 * Validation for forgot password (email only)
 */
export const validateForgotPassword = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address")
    .isLength({ min: 5, max: 254 })
    .withMessage("Email must be between 5 and 254 characters")
];

/**
 * Password strength checker utility function
 * @param {string} password - Password to check
 * @returns {Object} - Password strength analysis
 */
export const checkPasswordStrength = (password) => {
  let score = 0;
  const feedback = [];
  const requirements = [];

  // Length check
  if (password.length >= 8) {
    score += 20;
  } else {
    requirements.push("At least 8 characters long");
  }

  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Character variety checks
  if (/[a-z]/.test(password)) {
    score += 15;
  } else {
    requirements.push("At least one lowercase letter");
  }

  if (/[A-Z]/.test(password)) {
    score += 15;
  } else {
    requirements.push("At least one uppercase letter");
  }

  if (/\d/.test(password)) {
    score += 15;
  } else {
    requirements.push("At least one number");
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 15;
  } else {
    requirements.push("At least one special character");
  }

  // Bonus points for complexity
  if (/[a-z].*[a-z]/.test(password)) score += 5; // Multiple lowercase
  if (/[A-Z].*[A-Z]/.test(password)) score += 5; // Multiple uppercase
  if (/\d.*\d/.test(password)) score += 5; // Multiple numbers
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?].*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 5; // Multiple special chars

  // Deduct points for weak patterns
  const hasWeakPattern = WEAK_PASSWORD_PATTERNS.some(pattern => pattern.test(password));
  if (hasWeakPattern) {
    score -= 30;
    feedback.push("Avoid common patterns like '123456', 'password', or repeated characters");
  }

  // Deduct points for common passwords
  const isCommonPassword = COMMON_PASSWORDS.some(common => 
    password.toLowerCase().includes(common.toLowerCase())
  );
  if (isCommonPassword) {
    score -= 25;
    feedback.push("Avoid using common words like 'password', 'admin', or 'welcome'");
  }

  // Normalize score
  score = Math.max(0, Math.min(100, score));

  // Determine strength level
  let strength;
  let color;
  if (score >= 80) {
    strength = "Very Strong";
    color = "green";
  } else if (score >= 60) {
    strength = "Strong";
    color = "lightgreen";
  } else if (score >= 40) {
    strength = "Medium";
    color = "orange";
  } else if (score >= 20) {
    strength = "Weak";
    color = "red";
  } else {
    strength = "Very Weak";
    color = "darkred";
  }

  // Add positive feedback for strong passwords
  if (score >= 80) {
    feedback.push("Excellent! This is a very strong password.");
  } else if (score >= 60) {
    feedback.push("Good! This password meets security requirements.");
  }

  return {
    score,
    strength,
    color,
    isValid: score >= 60 && requirements.length === 0,
    requirements,
    feedback,
    meetsMinimumRequirements: requirements.length === 0
  };
};

export default {
  validateChangePassword,
  validateResetPassword,
  validateRegistrationPassword,
  validateForgotPassword,
  checkPasswordStrength,
  validatePasswordStrength
}; 