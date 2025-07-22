import speakeasy from "speakeasy";
import qrcode from "qrcode";
import crypto from "crypto";
import User from "../models/user-modal.js";
import logger from "../utils/logger.js";
import emailService from "../services/emailService.js";
import { validationResult } from "express-validator";

/**
 * Two-Factor Authentication Controller
 * Handles TOTP-based 2FA setup, verification, and management
 */
class TwoFactorController {
  /**
   * Generate 2FA secret and QR code for user setup
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async setup2FA(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if 2FA is already enabled
      if (user.two_factor_enabled) {
        return res.status(409).json({
          success: false,
          message: "2FA is already enabled for this account",
          data: {
            enabled: true,
            enabled_at: user.two_factor_enabled_at,
          },
        });
      }

      // Generate secret key
      const secret = speakeasy.generateSecret({
        length: 32,
        name: `${user.email} (Medh Learning Platform)`,
        issuer: "Medh Learning Platform",
      });

      // Store temporary secret (not yet confirmed)
      user.two_factor_temp_secret = secret.base32;
      await user.save();

      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

      // Log 2FA setup initiation
      await user.logActivity(
        "2fa_setup_initiated",
        null,
        {
          setup_method: "totp",
          issuer: "Medh Learning Platform",
        },
        {
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
          device_type: "web",
        },
      );

      logger.info(`2FA setup initiated for user: ${user.email}`);

      res.status(200).json({
        success: true,
        message:
          "2FA setup initiated. Scan the QR code with your authenticator app.",
        data: {
          qr_code: qrCodeUrl,
          secret: secret.base32,
          backup_codes: null, // Will be generated after verification
          manual_entry_key: secret.base32,
          issuer: "Medh Learning Platform",
          account_name: user.email,
        },
      });
    } catch (error) {
      logger.error("2FA setup error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to setup 2FA",
        error: error.message,
      });
    }
  }

  /**
   * Verify 2FA setup and enable 2FA for user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verify2FASetup(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { token } = req.body;
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (!user.two_factor_temp_secret) {
        return res.status(400).json({
          success: false,
          message: "2FA setup not initiated. Please start setup first.",
        });
      }

      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: user.two_factor_temp_secret,
        encoding: "base32",
        token: token,
        window: 2, // Allow 2 time steps tolerance
      });

      if (!verified) {
        return res.status(401).json({
          success: false,
          message: "Invalid 2FA token. Please try again.",
        });
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = backupCodes.map((code) => ({
        code: crypto.createHash("sha256").update(code).digest("hex"),
        used: false,
        created_at: new Date(),
      }));

      // Enable 2FA
      user.two_factor_enabled = true;
      user.two_factor_secret = user.two_factor_temp_secret;
      user.two_factor_temp_secret = undefined;
      user.two_factor_method = "totp";
      user.two_factor_enabled_at = new Date();
      user.two_factor_backup_codes = hashedBackupCodes;

      await user.save();

      // Log 2FA enablement
      await user.logActivity(
        "2fa_enabled",
        null,
        {
          method: "totp",
          backup_codes_generated: backupCodes.length,
        },
        {
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
          device_type: "web",
        },
      );

      // Send confirmation email
      try {
        await emailService.sendNotificationEmail(
          user.email,
          "🔐 Two-Factor Authentication Enabled",
          "Two-factor authentication has been successfully enabled on your Medh Learning Platform account.",
          {
            user_name: user.full_name,
            details: {
              "Enabled At": new Date().toLocaleString(),
              Method: "Authenticator App (TOTP)",
              "Backup Codes": `${backupCodes.length} codes generated`,
              Device: req.headers["user-agent"] || "Unknown",
            },
            actionUrl: `${process.env.FRONTEND_URL || "https://app.medh.co"}/settings/security`,
            actionText: "Manage 2FA Settings",
          },
        );
      } catch (emailError) {
        logger.error(
          "Failed to send 2FA enabled confirmation email:",
          emailError,
        );
      }

      logger.info(`2FA enabled successfully for user: ${user.email}`);

      res.status(200).json({
        success: true,
        message: "2FA enabled successfully",
        data: {
          enabled: true,
          method: "totp",
          backup_codes: backupCodes, // Show once, then never again
          enabled_at: user.two_factor_enabled_at,
          warning:
            "Please save these backup codes in a secure location. They will not be shown again.",
        },
      });
    } catch (error) {
      logger.error("2FA verification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to verify 2FA setup",
        error: error.message,
      });
    }
  }

  /**
   * Verify 2FA token during login
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verify2FA(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { token, user_id, backup_code } = req.body;
      const user = await User.findById(user_id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (!user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: "2FA is not enabled for this account",
        });
      }

      let verified = false;
      let usedBackupCode = false;

      // Try backup code first if provided
      if (backup_code) {
        const hashedBackupCode = crypto
          .createHash("sha256")
          .update(backup_code)
          .digest("hex");
        const backupCodeEntry = user.two_factor_backup_codes.find(
          (code) => code.code === hashedBackupCode && !code.used,
        );

        if (backupCodeEntry) {
          backupCodeEntry.used = true;
          backupCodeEntry.used_at = new Date();
          verified = true;
          usedBackupCode = true;
        }
      } else if (token) {
        // Verify TOTP token
        verified = speakeasy.totp.verify({
          secret: user.two_factor_secret,
          encoding: "base32",
          token: token,
          window: 2,
        });
      }

      if (!verified) {
        return res.status(401).json({
          success: false,
          message: "Invalid 2FA token or backup code",
        });
      }

      if (usedBackupCode) {
        await user.save();
      }

      // Log successful 2FA verification
      await user.logActivity(
        "2fa_verified",
        null,
        {
          method: usedBackupCode ? "backup_code" : "totp",
          backup_code_used: usedBackupCode,
        },
        {
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
          device_type: "web",
        },
      );

      logger.info(`2FA verification successful for user: ${user.email}`);

      res.status(200).json({
        success: true,
        message: "2FA verification successful",
        data: {
          verified: true,
          method_used: usedBackupCode ? "backup_code" : "totp",
          backup_codes_remaining: usedBackupCode
            ? user.two_factor_backup_codes.filter((code) => !code.used).length
            : null,
        },
      });
    } catch (error) {
      logger.error("2FA verification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to verify 2FA",
        error: error.message,
      });
    }
  }

  /**
   * Disable 2FA for user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async disable2FA(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { password, token } = req.body;
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (!user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: "2FA is not enabled for this account",
        });
      }

      // Verify password
      const passwordValid = await user.comparePassword(password);
      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid password",
        });
      }

      // Verify current 2FA token
      const tokenValid = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: "base32",
        token: token,
        window: 2,
      });

      if (!tokenValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid 2FA token",
        });
      }

      // Disable 2FA
      user.two_factor_enabled = false;
      user.two_factor_secret = undefined;
      user.two_factor_method = undefined;
      user.two_factor_enabled_at = undefined;
      user.two_factor_backup_codes = [];

      await user.save();

      // Log 2FA disabling
      await user.logActivity(
        "2fa_disabled",
        null,
        {
          disabled_at: new Date(),
          method_was: "totp",
        },
        {
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
          device_type: "web",
        },
      );

      // Send notification email
      try {
        await emailService.sendNotificationEmail(
          user.email,
          "⚠️ Two-Factor Authentication Disabled",
          "Two-factor authentication has been disabled on your Medh Learning Platform account.",
          {
            user_name: user.full_name,
            details: {
              "Disabled At": new Date().toLocaleString(),
              Device: req.headers["user-agent"] || "Unknown",
              "IP Address": req.ip,
            },
            actionUrl: `${process.env.FRONTEND_URL || "https://app.medh.co"}/settings/security`,
            actionText: "Review Security Settings",
          },
        );
      } catch (emailError) {
        logger.error(
          "Failed to send 2FA disabled notification email:",
          emailError,
        );
      }

      logger.info(`2FA disabled for user: ${user.email}`);

      res.status(200).json({
        success: true,
        message: "2FA disabled successfully",
        data: {
          enabled: false,
          disabled_at: new Date(),
        },
      });
    } catch (error) {
      logger.error("2FA disable error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to disable 2FA",
        error: error.message,
      });
    }
  }

  /**
   * Generate new backup codes
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async regenerateBackupCodes(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { password } = req.body;
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (!user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: "2FA is not enabled for this account",
        });
      }

      // Verify password
      const passwordValid = await user.comparePassword(password);
      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid password",
        });
      }

      // Generate new backup codes
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = backupCodes.map((code) => ({
        code: crypto.createHash("sha256").update(code).digest("hex"),
        used: false,
        created_at: new Date(),
      }));

      user.two_factor_backup_codes = hashedBackupCodes;
      await user.save();

      // Log backup code regeneration
      await user.logActivity(
        "2fa_backup_codes_regenerated",
        null,
        {
          codes_generated: backupCodes.length,
          regenerated_at: new Date(),
        },
        {
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
          device_type: "web",
        },
      );

      logger.info(`2FA backup codes regenerated for user: ${user.email}`);

      res.status(200).json({
        success: true,
        message: "Backup codes regenerated successfully",
        data: {
          backup_codes: backupCodes,
          generated_at: new Date(),
          warning:
            "Please save these backup codes in a secure location. Your old backup codes are no longer valid.",
        },
      });
    } catch (error) {
      logger.error("2FA backup code regeneration error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to regenerate backup codes",
        error: error.message,
      });
    }
  }

  /**
   * Get 2FA status for user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async get2FAStatus(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const backupCodesRemaining = user.two_factor_enabled
        ? user.two_factor_backup_codes.filter((code) => !code.used).length
        : 0;

      res.status(200).json({
        success: true,
        data: {
          enabled: user.two_factor_enabled || false,
          method: user.two_factor_method || null,
          enabled_at: user.two_factor_enabled_at || null,
          backup_codes_remaining: backupCodesRemaining,
          setup_in_progress: !!user.two_factor_temp_secret,
        },
      });
    } catch (error) {
      logger.error("Get 2FA status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get 2FA status",
        error: error.message,
      });
    }
  }

  /**
   * Generate backup codes
   * @private
   * @returns {Array} Array of backup codes
   */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      // Generate 8-digit backup codes
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}

export default new TwoFactorController();
