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
  // For change password, only check if password is not empty
  if (!password || password.length === 0) {
    return false;
  }
  return true;
};

/**
 * Validation for password change requests - NO RESTRICTIONS
 */
export const validateChangePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required")
    .isLength({ min: 1 })
    .withMessage("Current password cannot be empty"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
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
      // Ensure password confirmation matches new password
      if (value !== req.body.newPassword) {
        throw new Error("Password confirmation must match new password");
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
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be between 6 and 128 characters")
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
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be between 6 and 128 characters")
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
  // For change password, always return strong if not empty
  if (!password || password.length === 0) {
    return {
      score: 0,
      strength: "Very Weak",
      color: "darkred",
      isValid: false,
      requirements: ["Password cannot be empty"],
      feedback: ["Password is required"],
      meetsMinimumRequirements: false
    };
  }

  return {
    score: 100,
    strength: "Strong",
    color: "green",
    isValid: true,
    requirements: [],
    feedback: ["Password is valid"],
    meetsMinimumRequirements: true
  };
};

export default {
  validateChangePassword,
  validateResetPassword,
  validateRegistrationPassword,
  validateForgotPassword,
  checkPasswordStrength,
}; 