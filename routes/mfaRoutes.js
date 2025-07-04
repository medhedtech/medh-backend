import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import mfaController from "../controllers/mfaController.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: errors.array()
    });
  }
  next();
};

// ============================================================================
// MFA SETUP ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/auth/mfa/setup/totp
 * @desc    Setup TOTP-based MFA
 * @access  Private (requires authentication)
 */
router.post(
  "/setup/totp",
  authenticateToken,
  async (req, res) => {
    try {
      await mfaController.setupTOTP(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error setting up TOTP",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/v1/auth/mfa/setup/totp/verify
 * @desc    Verify TOTP setup with code
 * @access  Private (requires authentication)
 */
router.post(
  "/setup/totp/verify",
  authenticateToken,
  [
    body("code")
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage("Code must be a 6-digit number")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      await mfaController.verifyTOTPSetup(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error verifying TOTP setup",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/v1/auth/mfa/setup/sms
 * @desc    Setup SMS-based MFA
 * @access  Private (requires authentication)
 */
router.post(
  "/setup/sms",
  authenticateToken,
  [
    body("phone_number")
      .isMobilePhone()
      .withMessage("Please provide a valid phone number")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      await mfaController.setupSMS(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error setting up SMS MFA",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/v1/auth/mfa/setup/sms/verify
 * @desc    Verify SMS setup with code
 * @access  Private (requires authentication)
 */
router.post(
  "/setup/sms/verify",
  authenticateToken,
  [
    body("code")
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage("Code must be a 6-digit number")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      await mfaController.verifySMSSetup(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error verifying SMS setup",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
);

// ============================================================================
// MFA VERIFICATION ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/auth/mfa/verify
 * @desc    Verify MFA code during login
 * @access  Public (used during login flow)
 */
router.post(
  "/verify",
  [
    body("user_id")
      .isMongoId()
      .withMessage("Valid user ID is required"),
    body("code")
      .optional()
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage("Code must be a 6-digit number"),
    body("backup_code")
      .optional()
      .isLength({ min: 8, max: 32 })
      .withMessage("Invalid backup code format")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      await mfaController.verifyMFA(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error verifying MFA",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/v1/auth/mfa/send-sms
 * @desc    Send SMS code for MFA verification
 * @access  Public (used during login flow)
 */
router.post(
  "/send-sms",
  [
    body("user_id")
      .isMongoId()
      .withMessage("Valid user ID is required")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { user_id } = req.body;
      
      // Find user and verify SMS MFA is enabled
      const User = (await import("../models/user-modal.js")).default;
      const user = await User.findById(user_id);
      
      if (!user || !user.two_factor_enabled || user.two_factor_method !== 'sms') {
        return res.status(400).json({
          success: false,
          message: "SMS MFA is not enabled for this account"
        });
      }

      // Generate and store SMS code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.two_factor_temp_code = verificationCode;
      user.two_factor_temp_code_expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      
      await user.save();

      // Log the SMS code for development
      const logger = (await import("../utils/logger.js")).default;
      logger.info("SMS MFA code (development only):", {
        phone: user.two_factor_phone,
        code: verificationCode,
        userId: user._id
      });

      res.status(200).json({
        success: true,
        message: "SMS verification code sent successfully",
        data: {
          phone_number: `***-***-${user.two_factor_phone.slice(-4)}`,
          expires_in_minutes: 5,
          // For development only - remove in production
          dev_code: process.env.NODE_ENV === "development" ? verificationCode : undefined
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error sending SMS code",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
);

// ============================================================================
// MFA MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/auth/mfa/status
 * @desc    Get MFA status for authenticated user
 * @access  Private (requires authentication)
 */
router.get(
  "/status",
  authenticateToken,
  async (req, res) => {
    try {
      await mfaController.getMFAStatus(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error retrieving MFA status",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/v1/auth/mfa/disable
 * @desc    Disable MFA for authenticated user
 * @access  Private (requires authentication)
 */
router.post(
  "/disable",
  authenticateToken,
  [
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password is required"),
    body("code")
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage("MFA code is required")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      await mfaController.disableMFA(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error disabling MFA",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/v1/auth/mfa/backup-codes/regenerate
 * @desc    Regenerate backup codes
 * @access  Private (requires authentication)
 */
router.post(
  "/backup-codes/regenerate",
  authenticateToken,
  [
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password is required")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      await mfaController.regenerateBackupCodes(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error regenerating backup codes",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/v1/auth/mfa/backup-codes/count
 * @desc    Get remaining backup codes count
 * @access  Private (requires authentication)
 */
router.get(
  "/backup-codes/count",
  authenticateToken,
  async (req, res) => {
    try {
      const User = (await import("../models/user-modal.js")).default;
      const user = await User.findById(req.user.id).select('backup_codes two_factor_enabled');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Backup codes count retrieved successfully",
        data: {
          count: user.backup_codes ? user.backup_codes.length : 0,
          mfa_enabled: user.two_factor_enabled || false,
          warning: user.backup_codes && user.backup_codes.length <= 2 ? 
            "You have few backup codes remaining. Consider regenerating them." : null
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error retrieving backup codes count",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
);

// ============================================================================
// MFA RECOVERY ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/auth/mfa/recovery/request
 * @desc    Request MFA recovery (when user loses access to MFA device)
 * @access  Public
 */
router.post(
  "/recovery/request",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("reason")
      .isLength({ min: 10, max: 500 })
      .withMessage("Please provide a detailed reason (10-500 characters)")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, reason } = req.body;
      
      const User = (await import("../models/user-modal.js")).default;
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        // Don't reveal if user exists or not
        return res.status(200).json({
          success: true,
          message: "If an account with this email exists and has MFA enabled, recovery instructions will be sent."
        });
      }

      if (!user.two_factor_enabled) {
        return res.status(200).json({
          success: true,
          message: "If an account with this email exists and has MFA enabled, recovery instructions will be sent."
        });
      }

      // Generate recovery token
      const recoveryToken = crypto.randomBytes(32).toString('hex');
      user.mfa_recovery_token = recoveryToken;
      user.mfa_recovery_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      user.mfa_recovery_reason = reason;
      
      await user.save();

      // Log recovery request
      await user.logActivity("mfa_recovery_requested", null, {
        request_time: new Date(),
        reason: reason,
        recovery_token: recoveryToken
      }, {
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        security_event: true
      });

      // TODO: Send recovery email with instructions
      const logger = (await import("../utils/logger.js")).default;
      logger.info("MFA recovery requested (development only):", {
        email: user.email,
        recovery_token: recoveryToken,
        reason: reason
      });

      res.status(200).json({
        success: true,
        message: "MFA recovery request submitted. Check your email for further instructions.",
        data: {
          // For development only - remove in production
          dev_recovery_token: process.env.NODE_ENV === "development" ? recoveryToken : undefined
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error processing recovery request",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
);

export default router; 