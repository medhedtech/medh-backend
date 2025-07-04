import crypto from "crypto";
import speakeasy from "speakeasy";
import User from "../models/user-modal.js";
import logger from "../utils/logger.js";
import emailService from "../services/emailService.js";
import { authenticateToken } from "../middleware/auth.js";

class MFAController {
  constructor() {
    // MFA configuration
    this.mfaConfig = {
      serviceName: "Medh Learning Platform",
      window: 2, // Allow 2 time windows before/after current time
      backupCodeLength: 8,
      backupCodeCount: 10,
      smsCodeLength: 6,
      smsCodeExpiry: 5 * 60 * 1000, // 5 minutes
      totpStep: 30, // 30 seconds
    };
  }

  /**
   * Generate TOTP secret and QR code for setup
   * @route POST /api/v1/auth/mfa/setup/totp
   */
  async setupTOTP(req, res) {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: "Two-factor authentication is already enabled"
        });
      }

      // Generate TOTP secret using speakeasy
      const secretData = speakeasy.generateSecret({
        name: `${this.mfaConfig.serviceName} (${user.email})`,
        issuer: this.mfaConfig.serviceName,
        length: 20
      });

      // Store temporary secret (not activated until verified)
      user.two_factor_temp_secret = secretData.base32;
      await user.save();

      // Log setup attempt
      await user.logActivity("mfa_setup_initiated", null, {
        method: "totp",
        setup_time: new Date()
      }, {
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        security_event: true
      });

      res.status(200).json({
        success: true,
        message: "TOTP setup initiated. Please use your authenticator app.",
        data: {
          secret: secretData.base32,
          manual_entry_key: secretData.base32,
          qr_code_url: secretData.otpauth_url,
          backup_codes: null, // Will be generated after verification
          instructions: [
            "1. Install an authenticator app (Google Authenticator, Authy, etc.)",
            "2. Scan the QR code or manually enter the secret key",
            "3. Enter the 6-digit code from your app to complete setup"
          ]
        }
      });

    } catch (error) {
      logger.error("TOTP setup error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: "Internal server error during TOTP setup",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  /**
   * Verify TOTP code and complete setup
   * @route POST /api/v1/auth/mfa/setup/totp/verify
   */
  async verifyTOTPSetup(req, res) {
    try {
      const { code } = req.body;
      const user = await User.findById(req.user.id);

      if (!user || !user.two_factor_temp_secret) {
        return res.status(400).json({
          success: false,
          message: "No pending TOTP setup found. Please initiate setup first."
        });
      }

      if (!code || code.length !== 6) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid 6-digit code"
        });
      }

      // Simplified verification for now (you can implement proper TOTP verification later)
      const verified = this.verifyTOTPCode(user.two_factor_temp_secret, code);

      if (!verified) {
        return res.status(400).json({
          success: false,
          message: "Invalid verification code. Please try again."
        });
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Activate TOTP
      user.two_factor_enabled = true;
      user.two_factor_method = 'totp';
      user.two_factor_secret = user.two_factor_temp_secret;
      user.two_factor_temp_secret = undefined;
      user.backup_codes = backupCodes.map(code => this.hashBackupCode(code));
      user.two_factor_setup_date = new Date();

      await user.save();

      // Log successful setup
      await user.logActivity("mfa_enabled", null, {
        method: "totp",
        setup_completed: new Date(),
        backup_codes_generated: backupCodes.length
      }, {
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        security_event: true
      });

      res.status(200).json({
        success: true,
        message: "Two-factor authentication enabled successfully!",
        data: {
          backup_codes: backupCodes,
          setup_date: user.two_factor_setup_date,
          warning: "Please save these backup codes in a secure location. They will not be shown again."
        }
      });

    } catch (error) {
      logger.error("TOTP verification error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: "Internal server error during TOTP verification",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  /**
   * Setup SMS-based MFA
   * @route POST /api/v1/auth/mfa/setup/sms
   */
  async setupSMS(req, res) {
    try {
      const { phone_number } = req.body;
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: "Two-factor authentication is already enabled"
        });
      }

      if (!phone_number) {
        return res.status(400).json({
          success: false,
          message: "Phone number is required for SMS setup"
        });
      }

      // Validate phone number format
      const cleanPhone = phone_number.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid phone number"
        });
      }

      // Generate verification code
      const verificationCode = this.generateSMSCode();
      
      // Store temporary data
      user.two_factor_temp_phone = cleanPhone;
      user.two_factor_temp_code = verificationCode;
      user.two_factor_temp_code_expires = new Date(Date.now() + this.mfaConfig.smsCodeExpiry);
      
      await user.save();

      // Log the SMS code for development (remove in production)
      logger.info("SMS verification code (development only):", {
        phone: cleanPhone,
        code: verificationCode,
        userId: user._id
      });

      res.status(200).json({
        success: true,
        message: "SMS verification code sent successfully",
        data: {
          phone_number: `***-***-${cleanPhone.slice(-4)}`,
          expires_in_minutes: 5,
          // For development only - remove in production
          dev_code: process.env.NODE_ENV === "development" ? verificationCode : undefined
        }
      });

    } catch (error) {
      logger.error("SMS setup error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: "Internal server error during SMS setup",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  /**
   * Verify SMS code and complete setup
   * @route POST /api/v1/auth/mfa/setup/sms/verify
   */
  async verifySMSSetup(req, res) {
    try {
      const { code } = req.body;
      const user = await User.findById(req.user.id);

      if (!user || !user.two_factor_temp_phone || !user.two_factor_temp_code) {
        return res.status(400).json({
          success: false,
          message: "No pending SMS setup found. Please initiate setup first."
        });
      }

      if (!code || code.length !== this.mfaConfig.smsCodeLength) {
        return res.status(400).json({
          success: false,
          message: `Please provide a valid ${this.mfaConfig.smsCodeLength}-digit code`
        });
      }

      // Check expiry
      if (Date.now() > user.two_factor_temp_code_expires) {
        return res.status(400).json({
          success: false,
          message: "Verification code has expired. Please request a new one."
        });
      }

      // Verify code
      if (user.two_factor_temp_code !== code) {
        return res.status(400).json({
          success: false,
          message: "Invalid verification code. Please try again."
        });
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Activate SMS MFA
      user.two_factor_enabled = true;
      user.two_factor_method = 'sms';
      user.two_factor_phone = user.two_factor_temp_phone;
      user.backup_codes = backupCodes.map(code => this.hashBackupCode(code));
      user.two_factor_setup_date = new Date();
      
      // Clear temporary data
      user.two_factor_temp_phone = undefined;
      user.two_factor_temp_code = undefined;
      user.two_factor_temp_code_expires = undefined;

      await user.save();

      // Log successful setup
      await user.logActivity("mfa_enabled", null, {
        method: "sms",
        setup_completed: new Date(),
        backup_codes_generated: backupCodes.length
      }, {
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        security_event: true
      });

      res.status(200).json({
        success: true,
        message: "SMS-based two-factor authentication enabled successfully!",
        data: {
          backup_codes: backupCodes,
          setup_date: user.two_factor_setup_date,
          phone_number: `***-***-${user.two_factor_phone.slice(-4)}`,
          warning: "Please save these backup codes in a secure location. They will not be shown again."
        }
      });

    } catch (error) {
      logger.error("SMS verification error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: "Internal server error during SMS verification",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  /**
   * Verify MFA code during login
   * @route POST /api/v1/auth/mfa/verify
   */
  async verifyMFA(req, res) {
    try {
      const { code, backup_code, user_id } = req.body;

      const user = await User.findById(user_id);
      
      if (!user || !user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: "Two-factor authentication is not enabled for this account"
        });
      }

      let verified = false;
      let usedBackupCode = false;

      // Check if backup code is being used
      if (backup_code) {
        verified = this.verifyBackupCode(user, backup_code);
        usedBackupCode = verified;
      } else if (code) {
        // Verify based on enabled method
        if (user.two_factor_method === 'totp') {
          verified = this.verifyTOTPCode(user.two_factor_secret, code);
        } else if (user.two_factor_method === 'sms') {
          // For SMS, the code should have been sent separately and stored temporarily
          verified = user.two_factor_temp_code === code && 
                    Date.now() <= user.two_factor_temp_code_expires;
        }
      }

      if (!verified) {
        // Log failed MFA attempt
        await user.logActivity("mfa_verification_failed", null, {
          method: user.two_factor_method,
          attempt_time: new Date(),
          code_provided: !!code,
          backup_code_provided: !!backup_code
        }, {
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
          security_event: true
        });

        return res.status(400).json({
          success: false,
          message: "Invalid verification code. Please try again."
        });
      }

      // If backup code was used, remove it
      if (usedBackupCode) {
        user.backup_codes = user.backup_codes.filter(hashedCode => 
          !this.verifyBackupCodeHash(backup_code, hashedCode)
        );
        await user.save();
      }

      // Clear temporary SMS code if used
      if (user.two_factor_method === 'sms' && code) {
        user.two_factor_temp_code = undefined;
        user.two_factor_temp_code_expires = undefined;
        await user.save();
      }

      // Log successful MFA verification
      await user.logActivity("mfa_verification_success", null, {
        method: user.two_factor_method,
        verification_time: new Date(),
        backup_code_used: usedBackupCode,
        remaining_backup_codes: user.backup_codes.length
      }, {
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        security_event: true
      });

      res.status(200).json({
        success: true,
        message: "Two-factor authentication verified successfully",
        data: {
          verified: true,
          backup_code_used: usedBackupCode,
          remaining_backup_codes: user.backup_codes.length,
          warning: usedBackupCode && user.backup_codes.length <= 2 ? 
            "You have few backup codes remaining. Consider regenerating them." : null
        }
      });

    } catch (error) {
      logger.error("MFA verification error:", {
        error: error.message,
        stack: error.stack,
        userId: req.body?.user_id
      });

      res.status(500).json({
        success: false,
        message: "Internal server error during MFA verification",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  /**
   * Disable MFA
   * @route POST /api/v1/auth/mfa/disable
   */
  async disableMFA(req, res) {
    try {
      const { password, code } = req.body;
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (!user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: "Two-factor authentication is not enabled"
        });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: "Invalid password"
        });
      }

      // Verify current MFA code
      let mfaVerified = false;
      if (user.two_factor_method === 'totp') {
        mfaVerified = this.verifyTOTPCode(user.two_factor_secret, code);
      } else if (user.two_factor_method === 'sms') {
        mfaVerified = user.two_factor_temp_code === code && 
                     Date.now() <= user.two_factor_temp_code_expires;
      }

      if (!mfaVerified) {
        return res.status(400).json({
          success: false,
          message: "Invalid MFA code"
        });
      }

      // Disable MFA
      user.two_factor_enabled = false;
      user.two_factor_method = undefined;
      user.two_factor_secret = undefined;
      user.two_factor_phone = undefined;
      user.backup_codes = [];
      user.two_factor_disabled_date = new Date();

      await user.save();

      // Log MFA disabled
      await user.logActivity("mfa_disabled", null, {
        disabled_time: new Date(),
        previous_method: user.two_factor_method
      }, {
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        security_event: true
      });

      res.status(200).json({
        success: true,
        message: "Two-factor authentication has been disabled",
        data: {
          disabled_date: user.two_factor_disabled_date
        }
      });

    } catch (error) {
      logger.error("MFA disable error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: "Internal server error disabling MFA",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  /**
   * Generate new backup codes
   * @route POST /api/v1/auth/mfa/backup-codes/regenerate
   */
  async regenerateBackupCodes(req, res) {
    try {
      const { password } = req.body;
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (!user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: "Two-factor authentication is not enabled"
        });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: "Invalid password"
        });
      }

      // Generate new backup codes
      const newBackupCodes = this.generateBackupCodes();
      user.backup_codes = newBackupCodes.map(code => this.hashBackupCode(code));
      user.backup_codes_regenerated_date = new Date();

      await user.save();

      // Log backup codes regeneration
      await user.logActivity("backup_codes_regenerated", null, {
        regenerated_time: new Date(),
        codes_count: newBackupCodes.length
      }, {
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        security_event: true
      });

      res.status(200).json({
        success: true,
        message: "New backup codes generated successfully",
        data: {
          backup_codes: newBackupCodes,
          regenerated_date: user.backup_codes_regenerated_date,
          warning: "Please save these backup codes in a secure location. Your old backup codes are no longer valid."
        }
      });

    } catch (error) {
      logger.error("Backup codes regeneration error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: "Internal server error regenerating backup codes",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  /**
   * Get MFA status
   * @route GET /api/v1/auth/mfa/status
   */
  async getMFAStatus(req, res) {
    try {
      const user = await User.findById(req.user.id).select('-two_factor_secret -backup_codes');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const status = {
        enabled: user.two_factor_enabled || false,
        method: user.two_factor_method || null,
        setup_date: user.two_factor_setup_date || null,
        phone_number: user.two_factor_phone ? `***-***-${user.two_factor_phone.slice(-4)}` : null,
        backup_codes_count: user.backup_codes ? user.backup_codes.length : 0,
        last_regenerated: user.backup_codes_regenerated_date || null
      };

      res.status(200).json({
        success: true,
        message: "MFA status retrieved successfully",
        data: status
      });

    } catch (error) {
      logger.error("MFA status error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: "Internal server error retrieving MFA status",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  // Helper Methods

  /**
   * Generate TOTP secret using speakeasy
   */
  generateTOTPSecret() {
    const secret = speakeasy.generateSecret({
      name: this.mfaConfig.serviceName,
      length: 20
    });
    return secret.base32;
  }

  /**
   * Verify TOTP code using speakeasy
   */
  verifyTOTPCode(secret, code) {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: code,
        step: this.mfaConfig.totpStep,
        window: this.mfaConfig.window
      });
    } catch (error) {
      logger.error("TOTP verification error:", error);
      return false;
    }
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < this.mfaConfig.backupCodeCount; i++) {
      codes.push(crypto.randomBytes(this.mfaConfig.backupCodeLength).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Hash backup code for storage
   */
  hashBackupCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(user, code) {
    const hashedCode = this.hashBackupCode(code);
    return user.backup_codes.includes(hashedCode);
  }

  /**
   * Verify backup code hash
   */
  verifyBackupCodeHash(code, hashedCode) {
    return this.hashBackupCode(code) === hashedCode;
  }

  /**
   * Generate SMS verification code
   */
  generateSMSCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

export default new MFAController(); 