import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import crypto from "crypto";
import User from "../models/user-modal.js";
import logger from "../utils/logger.js";
import emailService from "../services/emailService.js";
import { validationResult } from "express-validator";

/**
 * Passkey Controller
 * Handles WebAuthn-based passwordless authentication
 */
class PasskeyController {
  constructor() {
    // WebAuthn configuration
    this.rpName = "Medh Learning Platform";
    this.rpID = process.env.WEBAUTHN_RP_ID || "localhost";
    this.origin = process.env.WEBAUTHN_ORIGIN || "http://localhost:8080";
    this.expectedOrigins = [this.origin];

    // Store challenges temporarily (in production, use Redis or similar)
    this.challenges = new Map();
  }

  /**
   * Generate registration options for passkey setup
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateRegistrationOptions(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Get existing passkeys for exclusion
      const existingPasskeys = user.passkeys || [];
      const excludeCredentials = existingPasskeys.map((passkey) => ({
        id: Buffer.from(passkey.credential_id, "base64"),
        type: "public-key",
        transports: passkey.transports || ["internal", "hybrid"],
      }));

      const options = await generateRegistrationOptions({
        rpName: this.rpName,
        rpID: this.rpID,
        userID: Buffer.from(user._id.toString()),
        userName: user.email,
        userDisplayName: user.full_name || user.email,
        timeout: 60000,
        attestationType: "none",
        excludeCredentials,
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "preferred",
          residentKey: "preferred",
          requireResidentKey: false,
        },
        supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
      });

      // Store challenge temporarily
      this.challenges.set(user._id.toString(), {
        challenge: options.challenge,
        type: "registration",
        timestamp: Date.now(),
      });

      // Log passkey registration initiation
      await user.logActivity(
        "passkey_registration_initiated",
        null,
        {
          rp_id: this.rpID,
          user_verification: "preferred",
          existing_passkeys: existingPasskeys.length,
        },
        {
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
          device_type: "web",
        },
      );

      logger.info(
        `Passkey registration options generated for user: ${user.email}`,
      );

      res.status(200).json({
        success: true,
        message: "Registration options generated successfully",
        data: options,
      });
    } catch (error) {
      logger.error("Passkey registration options generation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate registration options",
        error: error.message,
      });
    }
  }

  /**
   * Verify registration response and store passkey
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyRegistration(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { credential, passkey_name } = req.body;
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Get stored challenge
      const challengeData = this.challenges.get(user._id.toString());
      if (!challengeData || challengeData.type !== "registration") {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired challenge",
        });
      }

      // Verify registration response
      const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: this.expectedOrigins,
        expectedRPID: this.rpID,
        requireUserVerification: false,
      });

      const { verified, registrationInfo } = verification;

      if (!verified || !registrationInfo) {
        return res.status(400).json({
          success: false,
          message: "Passkey registration verification failed",
        });
      }

      // Create passkey object
      const newPasskey = {
        id: crypto.randomUUID(),
        name: passkey_name || `Passkey ${(user.passkeys || []).length + 1}`,
        credential_id: Buffer.from(registrationInfo.credentialID).toString(
          "base64",
        ),
        public_key: Buffer.from(registrationInfo.credentialPublicKey).toString(
          "base64",
        ),
        counter: registrationInfo.counter,
        device_type: registrationInfo.credentialDeviceType,
        backed_up: registrationInfo.credentialBackedUp,
        transports: credential.response?.transports || ["internal", "hybrid"],
        created_at: new Date(),
        last_used: null,
        aaguid: registrationInfo.aaguid
          ? Buffer.from(registrationInfo.aaguid).toString("hex")
          : null,
      };

      // Add passkey to user
      if (!user.passkeys) {
        user.passkeys = [];
      }
      user.passkeys.push(newPasskey);

      // Enable passkey authentication if this is the first passkey
      if (user.passkeys.length === 1) {
        user.passkey_enabled = true;
        user.passkey_enabled_at = new Date();
      }

      await user.save();

      // Clean up challenge
      this.challenges.delete(user._id.toString());

      // Log successful passkey registration
      await user.logActivity(
        "passkey_registered",
        null,
        {
          passkey_id: newPasskey.id,
          passkey_name: newPasskey.name,
          device_type: newPasskey.device_type,
          backed_up: newPasskey.backed_up,
          total_passkeys: user.passkeys.length,
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
          "🔑 New Passkey Added to Your Account",
          "A new passkey has been successfully added to your Medh Learning Platform account.",
          {
            user_name: user.full_name,
            details: {
              "Passkey Name": newPasskey.name,
              "Added At": new Date().toLocaleString(),
              "Device Type": newPasskey.device_type,
              "Total Passkeys": user.passkeys.length,
              Device: req.headers["user-agent"] || "Unknown",
            },
            actionUrl: `${process.env.FRONTEND_URL || "https://app.medh.co"}/settings/security`,
            actionText: "Manage Passkeys",
          },
        );
      } catch (emailError) {
        logger.error(
          "Failed to send passkey registration confirmation email:",
          emailError,
        );
      }

      logger.info(`Passkey registered successfully for user: ${user.email}`);

      res.status(200).json({
        success: true,
        message: "Passkey registered successfully",
        data: {
          passkey_id: newPasskey.id,
          name: newPasskey.name,
          created_at: newPasskey.created_at,
          device_type: newPasskey.device_type,
          total_passkeys: user.passkeys.length,
          passkey_enabled: user.passkey_enabled,
        },
      });
    } catch (error) {
      logger.error("Passkey registration verification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to verify passkey registration",
        error: error.message,
      });
    }
  }

  /**
   * Generate authentication options for passkey login
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateAuthenticationOptions(req, res) {
    try {
      const { email } = req.body;

      // Find user by email (optional for resident keys)
      let allowCredentials = [];
      let user = null;

      if (email) {
        user = await User.findOne({ email: email.toLowerCase() });
        if (user && user.passkeys && user.passkeys.length > 0) {
          allowCredentials = user.passkeys.map((passkey) => ({
            id: Buffer.from(passkey.credential_id, "base64"),
            type: "public-key",
            transports: passkey.transports || ["internal", "hybrid"],
          }));
        }
      }

      const options = await generateAuthenticationOptions({
        timeout: 60000,
        allowCredentials:
          allowCredentials.length > 0 ? allowCredentials : undefined,
        userVerification: "preferred",
        rpID: this.rpID,
      });

      // Store challenge temporarily
      const challengeKey = email
        ? `auth_${email.toLowerCase()}`
        : `auth_${Date.now()}`;
      this.challenges.set(challengeKey, {
        challenge: options.challenge,
        type: "authentication",
        timestamp: Date.now(),
        email: email?.toLowerCase(),
      });

      logger.info(
        `Passkey authentication options generated${email ? ` for email: ${email}` : ""}`,
      );

      res.status(200).json({
        success: true,
        message: "Authentication options generated successfully",
        data: {
          ...options,
          challenge_key: challengeKey,
        },
      });
    } catch (error) {
      logger.error("Passkey authentication options generation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate authentication options",
        error: error.message,
      });
    }
  }

  /**
   * Verify authentication response and authenticate user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyAuthentication(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { credential, challenge_key } = req.body;

      // Get stored challenge
      const challengeData = this.challenges.get(challenge_key);
      if (!challengeData || challengeData.type !== "authentication") {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired challenge",
        });
      }

      // Find user by credential ID
      const credentialIdBase64 = Buffer.from(
        credential.rawId,
        "base64",
      ).toString("base64");
      const user = await User.findOne({
        "passkeys.credential_id": credentialIdBase64,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found or passkey not registered",
        });
      }

      // Find the specific passkey
      const passkey = user.passkeys.find(
        (p) => p.credential_id === credentialIdBase64,
      );
      if (!passkey) {
        return res.status(404).json({
          success: false,
          message: "Passkey not found",
        });
      }

      // Prepare authenticator data for verification
      const authenticator = {
        credentialID: Buffer.from(passkey.credential_id, "base64"),
        credentialPublicKey: Buffer.from(passkey.public_key, "base64"),
        counter: passkey.counter,
        transports: passkey.transports,
      };

      // Verify authentication response
      const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: this.expectedOrigins,
        expectedRPID: this.rpID,
        authenticator,
        requireUserVerification: false,
      });

      const { verified, authenticationInfo } = verification;

      if (!verified) {
        return res.status(401).json({
          success: false,
          message: "Passkey authentication verification failed",
        });
      }

      // Update passkey counter and last used
      passkey.counter = authenticationInfo.newCounter;
      passkey.last_used = new Date();
      await user.save();

      // Clean up challenge
      this.challenges.delete(challenge_key);

      // Update user login information
      user.last_login = new Date();
      user.is_online = true;
      await user.save();

      // Log successful passkey authentication
      await user.logActivity(
        "passkey_login",
        null,
        {
          passkey_id: passkey.id,
          passkey_name: passkey.name,
          device_type: passkey.device_type,
          counter: passkey.counter,
        },
        {
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
          device_type: "web",
        },
      );

      logger.info(`Passkey authentication successful for user: ${user.email}`);

      res.status(200).json({
        success: true,
        message: "Passkey authentication successful",
        data: {
          user: {
            id: user._id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
          },
          passkey: {
            id: passkey.id,
            name: passkey.name,
            last_used: passkey.last_used,
          },
          authentication_method: "passkey",
        },
      });
    } catch (error) {
      logger.error("Passkey authentication verification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to verify passkey authentication",
        error: error.message,
      });
    }
  }

  /**
   * Get user's passkeys
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserPasskeys(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const passkeys = (user.passkeys || []).map((passkey) => ({
        id: passkey.id,
        name: passkey.name,
        device_type: passkey.device_type,
        created_at: passkey.created_at,
        last_used: passkey.last_used,
        backed_up: passkey.backed_up,
        transports: passkey.transports,
      }));

      res.status(200).json({
        success: true,
        data: {
          passkey_enabled: user.passkey_enabled || false,
          passkey_enabled_at: user.passkey_enabled_at,
          passkeys,
          total_passkeys: passkeys.length,
        },
      });
    } catch (error) {
      logger.error("Get user passkeys error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get user passkeys",
        error: error.message,
      });
    }
  }

  /**
   * Delete a passkey
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deletePasskey(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { passkey_id } = req.params;
      const { password } = req.body;
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
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

      // Find and remove passkey
      const passkeyIndex = user.passkeys.findIndex((p) => p.id === passkey_id);
      if (passkeyIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Passkey not found",
        });
      }

      const deletedPasskey = user.passkeys[passkeyIndex];
      user.passkeys.splice(passkeyIndex, 1);

      // Disable passkey authentication if no passkeys left
      if (user.passkeys.length === 0) {
        user.passkey_enabled = false;
        user.passkey_enabled_at = undefined;
      }

      await user.save();

      // Log passkey deletion
      await user.logActivity(
        "passkey_deleted",
        null,
        {
          passkey_id: deletedPasskey.id,
          passkey_name: deletedPasskey.name,
          remaining_passkeys: user.passkeys.length,
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
          "🗑️ Passkey Removed from Your Account",
          "A passkey has been removed from your Medh Learning Platform account.",
          {
            user_name: user.full_name,
            details: {
              "Passkey Name": deletedPasskey.name,
              "Removed At": new Date().toLocaleString(),
              "Remaining Passkeys": user.passkeys.length,
              Device: req.headers["user-agent"] || "Unknown",
            },
            actionUrl: `${process.env.FRONTEND_URL || "https://app.medh.co"}/settings/security`,
            actionText: "Manage Security Settings",
          },
        );
      } catch (emailError) {
        logger.error(
          "Failed to send passkey deletion notification email:",
          emailError,
        );
      }

      logger.info(
        `Passkey deleted for user: ${user.email}, passkey: ${deletedPasskey.name}`,
      );

      res.status(200).json({
        success: true,
        message: "Passkey deleted successfully",
        data: {
          deleted_passkey: {
            id: deletedPasskey.id,
            name: deletedPasskey.name,
          },
          remaining_passkeys: user.passkeys.length,
          passkey_enabled: user.passkey_enabled,
        },
      });
    } catch (error) {
      logger.error("Passkey deletion error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete passkey",
        error: error.message,
      });
    }
  }

  /**
   * Update passkey name
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updatePasskeyName(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { passkey_id } = req.params;
      const { name } = req.body;
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Find and update passkey
      const passkey = user.passkeys.find((p) => p.id === passkey_id);
      if (!passkey) {
        return res.status(404).json({
          success: false,
          message: "Passkey not found",
        });
      }

      const oldName = passkey.name;
      passkey.name = name;
      await user.save();

      // Log passkey name update
      await user.logActivity(
        "passkey_name_updated",
        null,
        {
          passkey_id: passkey.id,
          old_name: oldName,
          new_name: name,
        },
        {
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
          device_type: "web",
        },
      );

      logger.info(
        `Passkey name updated for user: ${user.email}, passkey: ${passkey_id}`,
      );

      res.status(200).json({
        success: true,
        message: "Passkey name updated successfully",
        data: {
          passkey_id: passkey.id,
          old_name: oldName,
          new_name: name,
          updated_at: new Date(),
        },
      });
    } catch (error) {
      logger.error("Passkey name update error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update passkey name",
        error: error.message,
      });
    }
  }
}

export default new PasskeyController();
