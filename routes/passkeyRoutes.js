import express from "express";
import { body, param } from "express-validator";
import passkeyController from "../controllers/passkeyController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * Passkey Authentication Routes
 * Handles WebAuthn-based passwordless authentication
 */

/**
 * @route   POST /api/v1/passkeys/register/options
 * @desc    Generate registration options for passkey setup
 * @access  Private (JWT required)
 */
router.post(
  "/register/options",
  authenticateToken,
  passkeyController.generateRegistrationOptions,
);

/**
 * @route   POST /api/v1/passkeys/register/verify
 * @desc    Verify registration response and store passkey
 * @access  Private (JWT required)
 */
router.post(
  "/register/verify",
  authenticateToken,
  [
    body("credential").isObject().withMessage("Credential object is required"),
    body("passkey_name")
      .optional()
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage("Passkey name must be between 1 and 50 characters"),
  ],
  passkeyController.verifyRegistration,
);

/**
 * @route   POST /api/v1/passkeys/authenticate/options
 * @desc    Generate authentication options for passkey login
 * @access  Public
 */
router.post(
  "/authenticate/options",
  [
    body("email")
      .optional()
      .isEmail()
      .withMessage("Valid email is required if provided"),
  ],
  passkeyController.generateAuthenticationOptions,
);

/**
 * @route   POST /api/v1/passkeys/authenticate/verify
 * @desc    Verify authentication response and authenticate user
 * @access  Public
 */
router.post(
  "/authenticate/verify",
  [
    body("credential").isObject().withMessage("Credential object is required"),
    body("challenge_key")
      .isString()
      .notEmpty()
      .withMessage("Challenge key is required"),
  ],
  passkeyController.verifyAuthentication,
);

/**
 * @route   GET /api/v1/passkeys
 * @desc    Get user's passkeys
 * @access  Private (JWT required)
 */
router.get("/", authenticateToken, passkeyController.getUserPasskeys);

/**
 * @route   DELETE /api/v1/passkeys/:passkey_id
 * @desc    Delete a passkey
 * @access  Private (JWT required)
 */
router.delete(
  "/:passkey_id",
  authenticateToken,
  [
    param("passkey_id").isUUID().withMessage("Valid passkey ID is required"),
    body("password")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Password is required"),
  ],
  passkeyController.deletePasskey,
);

/**
 * @route   PUT /api/v1/passkeys/:passkey_id/name
 * @desc    Update passkey name
 * @access  Private (JWT required)
 */
router.put(
  "/:passkey_id/name",
  authenticateToken,
  [
    param("passkey_id").isUUID().withMessage("Valid passkey ID is required"),
    body("name")
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage("Name must be between 1 and 50 characters"),
  ],
  passkeyController.updatePasskeyName,
);

export default router;
