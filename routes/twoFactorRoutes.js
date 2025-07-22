import express from "express";
import { body, param } from "express-validator";
import twoFactorController from "../controllers/twoFactorController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * Two-Factor Authentication Routes
 * Handles TOTP-based 2FA setup, verification, and management
 */

/**
 * @route   POST /api/v1/2fa/setup
 * @desc    Initiate 2FA setup (generate secret and QR code)
 * @access  Private (JWT required)
 */
router.post("/setup", authenticateToken, twoFactorController.setup2FA);

/**
 * @route   POST /api/v1/2fa/verify-setup
 * @desc    Verify 2FA setup and enable 2FA
 * @access  Private (JWT required)
 */
router.post(
  "/verify-setup",
  authenticateToken,
  [
    body("token")
      .isString()
      .isLength({ min: 6, max: 6 })
      .withMessage("Token must be a 6-digit string"),
  ],
  twoFactorController.verify2FASetup,
);

/**
 * @route   POST /api/v1/2fa/verify
 * @desc    Verify 2FA token during login
 * @access  Public (used during login process)
 */
router.post(
  "/verify",
  [
    body("user_id").isString().notEmpty().withMessage("User ID is required"),
    body("token")
      .optional()
      .isString()
      .isLength({ min: 6, max: 6 })
      .withMessage("Token must be a 6-digit string"),
    body("backup_code")
      .optional()
      .isString()
      .isLength({ min: 8, max: 8 })
      .withMessage("Backup code must be an 8-character string"),
  ],
  (req, res, next) => {
    // Ensure either token or backup_code is provided
    if (!req.body.token && !req.body.backup_code) {
      return res.status(400).json({
        success: false,
        message: "Either token or backup_code is required",
      });
    }
    next();
  },
  twoFactorController.verify2FA,
);

/**
 * @route   POST /api/v1/2fa/disable
 * @desc    Disable 2FA for user
 * @access  Private (JWT required)
 */
router.post(
  "/disable",
  authenticateToken,
  [
    body("password")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Password is required"),
    body("token")
      .isString()
      .isLength({ min: 6, max: 6 })
      .withMessage("Current 2FA token is required"),
  ],
  twoFactorController.disable2FA,
);

/**
 * @route   POST /api/v1/2fa/regenerate-backup-codes
 * @desc    Generate new backup codes
 * @access  Private (JWT required)
 */
router.post(
  "/regenerate-backup-codes",
  authenticateToken,
  [
    body("password")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Password is required"),
  ],
  twoFactorController.regenerateBackupCodes,
);

/**
 * @route   GET /api/v1/2fa/status
 * @desc    Get 2FA status for user
 * @access  Private (JWT required)
 */
router.get("/status", authenticateToken, twoFactorController.get2FAStatus);

export default router;
