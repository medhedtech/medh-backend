import express from "express";
import passport from "passport";
import { param } from "express-validator";
import { authenticateToken } from "../middleware/auth.js";
import {
  getOAuthProviders,
  handleOAuthSuccess,
  handleOAuthFailure,
  getConnectedProviders,
  disconnectProvider,
  linkProvider,
  getOAuthStats,
} from "../controllers/oauthController.js";
import crypto from "crypto";

const router = express.Router();

// ============================================================================
// OAUTH CONFIGURATION & INITIALIZATION
// ============================================================================

// Initialize Passport strategies
import "../config/passport-config.js";

// ============================================================================
// PUBLIC OAUTH ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/auth/oauth/providers
 * @desc    Get available OAuth providers
 * @access  Public
 */
router.get("/providers", getOAuthProviders);

/**
 * @route   GET /api/v1/auth/oauth/success
 * @desc    Handle OAuth success callback
 * @access  Private
 */
router.get("/success", handleOAuthSuccess);

/**
 * @route   GET /api/v1/auth/oauth/failure
 * @desc    Handle OAuth failure callback
 * @access  Public
 */
router.get("/failure", handleOAuthFailure);

// ============================================================================
// GOOGLE OAUTH ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/auth/oauth/google
 * @desc    Initiate Google OAuth
 * @access  Public
 */
router.get(
  "/google",
  (req, res, next) => {
    // Store state for CSRF protection
    req.session.oauthState = crypto.randomBytes(32).toString("hex");
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: true,
  })
);

/**
 * @route   GET /api/v1/auth/oauth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    successRedirect: "/api/v1/auth/oauth/success",
    failureRedirect: "/api/v1/auth/oauth/failure",
  })
);

// ============================================================================
// FACEBOOK OAUTH ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/auth/oauth/facebook
 * @desc    Initiate Facebook OAuth
 * @access  Public
 */
router.get(
  "/facebook",
  (req, res, next) => {
    req.session.oauthState = crypto.randomBytes(32).toString("hex");
    next();
  },
  passport.authenticate("facebook", {
    scope: ["email", "public_profile"],
  })
);

/**
 * @route   GET /api/v1/auth/oauth/facebook/callback
 * @desc    Facebook OAuth callback
 * @access  Public
 */
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    successRedirect: "/api/v1/auth/oauth/success",
    failureRedirect: "/api/v1/auth/oauth/failure",
  })
);

// ============================================================================
// GITHUB OAUTH ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/auth/oauth/github
 * @desc    Initiate GitHub OAuth
 * @access  Public
 */
router.get(
  "/github",
  (req, res, next) => {
    req.session.oauthState = crypto.randomBytes(32).toString("hex");
    next();
  },
  passport.authenticate("github", {
    scope: ["user:email"],
  })
);

/**
 * @route   GET /api/v1/auth/oauth/github/callback
 * @desc    GitHub OAuth callback
 * @access  Public
 */
router.get(
  "/github/callback",
  passport.authenticate("github", {
    successRedirect: "/api/v1/auth/oauth/success",
    failureRedirect: "/api/v1/auth/oauth/failure",
  })
);

// ============================================================================
// LINKEDIN OAUTH ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/auth/oauth/linkedin
 * @desc    Initiate LinkedIn OAuth
 * @access  Public
 */
router.get(
  "/linkedin",
  (req, res, next) => {
    req.session.oauthState = crypto.randomBytes(32).toString("hex");
    next();
  },
  passport.authenticate("linkedin", {
    scope: ["r_emailaddress", "r_liteprofile"],
  })
);

/**
 * @route   GET /api/v1/auth/oauth/linkedin/callback
 * @desc    LinkedIn OAuth callback
 * @access  Public
 */
router.get(
  "/linkedin/callback",
  passport.authenticate("linkedin", {
    successRedirect: "/api/v1/auth/oauth/success",
    failureRedirect: "/api/v1/auth/oauth/failure",
  })
);

// ============================================================================
// MICROSOFT OAUTH ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/auth/oauth/microsoft
 * @desc    Initiate Microsoft OAuth
 * @access  Public
 */
router.get(
  "/microsoft",
  (req, res, next) => {
    req.session.oauthState = crypto.randomBytes(32).toString("hex");
    next();
  },
  passport.authenticate("microsoft", {
    scope: ["user.read"],
  })
);

/**
 * @route   GET /api/v1/auth/oauth/microsoft/callback
 * @desc    Microsoft OAuth callback
 * @access  Public
 */
router.get(
  "/microsoft/callback",
  passport.authenticate("microsoft", {
    successRedirect: "/api/v1/auth/oauth/success",
    failureRedirect: "/api/v1/auth/oauth/failure",
  })
);

// ============================================================================
// APPLE OAUTH ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/auth/oauth/apple
 * @desc    Initiate Apple OAuth
 * @access  Public
 */
router.get(
  "/apple",
  (req, res, next) => {
    req.session.oauthState = crypto.randomBytes(32).toString("hex");
    next();
  },
  passport.authenticate("apple", {
    scope: ["name", "email"],
  })
);

/**
 * @route   POST /api/v1/auth/oauth/apple/callback
 * @desc    Apple OAuth callback (Apple uses POST)
 * @access  Public
 */
router.post(
  "/apple/callback",
  passport.authenticate("apple", {
    successRedirect: "/api/v1/auth/oauth/success",
    failureRedirect: "/api/v1/auth/oauth/failure",
  })
);

// ============================================================================
// AUTHENTICATED OAUTH MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/auth/oauth/connected
 * @desc    Get user's connected OAuth providers
 * @access  Private
 */
router.get("/connected", authenticateToken, getConnectedProviders);

/**
 * @route   DELETE /api/v1/auth/oauth/disconnect/:provider
 * @desc    Disconnect OAuth provider from account
 * @access  Private
 */
router.delete(
  "/disconnect/:provider",
  [
    authenticateToken,
    param("provider")
      .isIn(["google", "facebook", "github", "linkedin", "microsoft", "apple"])
      .withMessage("Invalid OAuth provider"),
  ],
  disconnectProvider
);

/**
 * @route   POST /api/v1/auth/oauth/link/:provider
 * @desc    Link additional OAuth provider to existing account
 * @access  Private
 */
router.post(
  "/link/:provider",
  [
    authenticateToken,
    param("provider")
      .isIn(["google", "facebook", "github", "linkedin", "microsoft", "apple"])
      .withMessage("Invalid OAuth provider"),
  ],
  linkProvider
);

/**
 * @route   GET /api/v1/auth/oauth/stats
 * @desc    Get OAuth statistics (Admin only)
 * @access  Private (Admin)
 */
router.get("/stats", authenticateToken, getOAuthStats);

// ============================================================================
// OAUTH MIDDLEWARE FOR LINKING ACCOUNTS
// ============================================================================

/**
 * Middleware to handle account linking during OAuth flow
 */
router.use((req, res, next) => {
  // Check if this is a linking request
  if (req.session.linkingUserId && req.user) {
    // This is an account linking flow
    req.isLinking = true;
    req.linkingUserId = req.session.linkingUserId;
    
    // Clear session data
    delete req.session.linkingUserId;
    delete req.session.linkingProvider;
  }
  next();
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * OAuth-specific error handling
 */
router.use((error, req, res, next) => {
  console.error("OAuth Route Error:", error);

  // Handle specific OAuth errors
  if (error.name === "TokenError") {
    return res.status(401).json({
      success: false,
      message: "OAuth token error",
      error: "Invalid or expired OAuth token",
    });
  }

  if (error.name === "InternalOAuthError") {
    return res.status(500).json({
      success: false,
      message: "OAuth provider error",
      error: "Failed to authenticate with OAuth provider",
    });
  }

  // Generic OAuth error
  res.status(500).json({
    success: false,
    message: "OAuth authentication failed",
    error: process.env.NODE_ENV === "development" ? error.message : "Authentication error",
  });
});

// ============================================================================
// ROUTE DOCUMENTATION
// ============================================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     OAuthProvider:
 *       type: object
 *       properties:
 *         provider:
 *           type: string
 *           enum: [google, facebook, github, linkedin, microsoft, apple]
 *         name:
 *           type: string
 *         color:
 *           type: string
 *         icon:
 *           type: string
 *         auth_url:
 *           type: string
 *         enabled:
 *           type: boolean
 *     
 *     ConnectedProvider:
 *       type: object
 *       properties:
 *         provider:
 *           type: string
 *         name:
 *           type: string
 *         connected_at:
 *           type: string
 *           format: date-time
 *         last_login:
 *           type: string
 *           format: date-time
 *         profile_id:
 *           type: string
 * 
 * /api/v1/auth/oauth/providers:
 *   get:
 *     summary: Get available OAuth providers
 *     tags: [OAuth]
 *     responses:
 *       200:
 *         description: Available OAuth providers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     providers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/OAuthProvider'
 * 
 * /api/v1/auth/oauth/{provider}:
 *   get:
 *     summary: Initiate OAuth authentication
 *     tags: [OAuth]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, facebook, github, linkedin, microsoft, apple]
 *     responses:
 *       302:
 *         description: Redirect to OAuth provider
 * 
 * /api/v1/auth/oauth/connected:
 *   get:
 *     summary: Get connected OAuth providers
 *     tags: [OAuth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connected OAuth providers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     connected_providers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ConnectedProvider'
 */

export default router; 