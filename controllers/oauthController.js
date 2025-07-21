import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/user-modal.js";
import logger from "../utils/logger.js";
import { validationResult } from "express-validator";
import { calculateProfileCompletion } from "../utils/profileCompletion.js";

/**
 * OAuth Controller for Social Login Integration
 * Supports: Google, Facebook, GitHub, LinkedIn, Microsoft, Apple
 */

/**
 * @desc    Get available OAuth providers
 * @route   GET /api/v1/auth/oauth/providers
 * @access  Public
 */
const getOAuthProviders = async (req, res) => {
  try {
    const providers = [];

    // Check which OAuth providers are configured
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      providers.push({
        provider: "google",
        name: "Google",
        color: "#db4437",
        icon: "fab fa-google",
        auth_url: "/api/v1/auth/oauth/google",
        enabled: true,
      });
    }

    if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
      providers.push({
        provider: "facebook",
        name: "Facebook",
        color: "#3b5998",
        icon: "fab fa-facebook-f",
        auth_url: "/api/v1/auth/oauth/facebook",
        enabled: true,
      });
    }

    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      providers.push({
        provider: "github",
        name: "GitHub",
        color: "#333",
        icon: "fab fa-github",
        auth_url: "/api/v1/auth/oauth/github",
        enabled: true,
      });
    }

    if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
      providers.push({
        provider: "linkedin",
        name: "LinkedIn",
        color: "#0077b5",
        icon: "fab fa-linkedin-in",
        auth_url: "/api/v1/auth/oauth/linkedin",
        enabled: true,
      });
    }

    if (
      process.env.MICROSOFT_CLIENT_ID &&
      process.env.MICROSOFT_CLIENT_SECRET
    ) {
      providers.push({
        provider: "microsoft",
        name: "Microsoft",
        color: "#00a1f1",
        icon: "fab fa-microsoft",
        auth_url: "/api/v1/auth/oauth/microsoft",
        enabled: true,
      });
    }

    if (
      process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID
    ) {
      providers.push({
        provider: "apple",
        name: "Apple",
        color: "#000",
        icon: "fab fa-apple",
        auth_url: "/api/v1/auth/oauth/apple",
        enabled: true,
      });
    }

    res.status(200).json({
      success: true,
      message: "Available OAuth providers retrieved successfully",
      data: {
        providers,
        total_providers: providers.length,
        supported_providers: [
          "google",
          "facebook",
          "github",
          "linkedin",
          "microsoft",
          "apple",
        ],
      },
    });
  } catch (error) {
    logger.error("Get OAuth providers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve OAuth providers",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * @desc    Handle OAuth callback success
 * @route   GET /api/v1/auth/oauth/success
 * @access  Private
 */
const handleOAuthSuccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed - no user data",
      });
    }

    const user = req.user;

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        account_type: user.account_type,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    // Update user's last login and online status
    user.last_login = new Date();
    user.is_online = true;
    await user.save();

    // Log successful OAuth login
    logger.info(`OAuth login successful for user: ${user.email}`);

    // Get connected OAuth providers
    const connectedProviders = Object.keys(user.oauth || {});

    res.status(200).json({
      success: true,
      message: "OAuth authentication successful",
      data: {
        token,
        user: {
          id: user._id,
          full_name: user.full_name,
          email: user.email,
          username: user.username,
          user_image: user.user_image,
          account_type: user.account_type,
          email_verified: user.email_verified,
          is_online: user.is_online,
          last_login: user.last_login,
          connected_oauth_providers: connectedProviders,
          profile_completion: calculateProfileCompletion(user),
        },
        oauth: {
          connected_providers: connectedProviders,
          total_connected: connectedProviders.length,
        },
      },
    });
  } catch (error) {
    logger.error("OAuth success handler error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete OAuth authentication",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * @desc    Handle OAuth callback failure
 * @route   GET /api/v1/auth/oauth/failure
 * @access  Public
 */
const handleOAuthFailure = async (req, res) => {
  try {
    const { error, error_description } = req.query;

    logger.warn("OAuth authentication failed:", { error, error_description });

    res.status(401).json({
      success: false,
      message: "OAuth authentication failed",
      error:
        error_description || error || "Authentication was cancelled or failed",
      data: {
        available_providers: "/api/v1/auth/oauth/providers",
        retry_login: true,
      },
    });
  } catch (error) {
    logger.error("OAuth failure handler error:", error);
    res.status(500).json({
      success: false,
      message: "OAuth authentication failed",
      error: "Authentication error occurred",
    });
  }
};

/**
 * @desc    Get user's connected OAuth providers
 * @route   GET /api/v1/auth/oauth/connected
 * @access  Private
 */
const getConnectedProviders = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const connectedProviders = [];

    if (user.oauth) {
      Object.keys(user.oauth).forEach((provider) => {
        const providerData = user.oauth[provider];
        connectedProviders.push({
          provider,
          name: getProviderDisplayName(provider),
          connected_at: providerData.connected_at,
          last_login: providerData.last_login,
          profile_id: providerData.id,
        });
      });
    }

    res.status(200).json({
      success: true,
      message: "Connected OAuth providers retrieved successfully",
      data: {
        connected_providers: connectedProviders,
        total_connected: connectedProviders.length,
        user_id: user._id,
      },
    });
  } catch (error) {
    logger.error("Get connected providers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve connected providers",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * @desc    Disconnect OAuth provider
 * @route   DELETE /api/v1/auth/oauth/disconnect/:provider
 * @access  Private
 */
const disconnectProvider = async (req, res) => {
  try {
    const { provider } = req.params;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.oauth || !user.oauth[provider]) {
      return res.status(400).json({
        success: false,
        message: `${provider} is not connected to this account`,
      });
    }

    // Check if user has password or other OAuth providers before disconnecting
    const connectedProviders = Object.keys(user.oauth);
    if (connectedProviders.length === 1 && !user.password) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot disconnect the only authentication method. Please set a password first.",
      });
    }

    // Remove OAuth provider data
    delete user.oauth[provider];

    // Update statistics
    if (user.statistics.social.oauth_providers) {
      user.statistics.social.oauth_providers =
        user.statistics.social.oauth_providers.filter((p) => p !== provider);
    }

    // Log disconnection activity
    await user.logActivity("oauth_disconnect", null, {
      provider,
      disconnected_at: new Date(),
    });

    await user.save();

    logger.info(
      `OAuth provider ${provider} disconnected for user: ${user.email}`,
    );

    res.status(200).json({
      success: true,
      message: `${getProviderDisplayName(provider)} disconnected successfully`,
      data: {
        disconnected_provider: provider,
        remaining_providers: Object.keys(user.oauth || {}),
      },
    });
  } catch (error) {
    logger.error("Disconnect OAuth provider error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to disconnect OAuth provider",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * @desc    Link additional OAuth provider to existing account
 * @route   POST /api/v1/auth/oauth/link/:provider
 * @access  Private
 */
const linkProvider = async (req, res) => {
  try {
    const { provider } = req.params;

    // Store user ID in session for linking after OAuth callback
    req.session.linkingUserId = req.user.userId;
    req.session.linkingProvider = provider;

    res.status(200).json({
      success: true,
      message: `Proceed to link ${getProviderDisplayName(provider)} account`,
      data: {
        auth_url: `/api/v1/auth/oauth/${provider}?link=true`,
        provider,
        linking: true,
      },
    });
  } catch (error) {
    logger.error("Link OAuth provider error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate OAuth provider linking",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Helper function to get provider display name
 */
const getProviderDisplayName = (provider) => {
  const names = {
    google: "Google",
    facebook: "Facebook",
    github: "GitHub",
    linkedin: "LinkedIn",
    microsoft: "Microsoft",
    apple: "Apple",
  };
  return names[provider] || provider;
};

/**
 * @desc    Get OAuth statistics for admin
 * @route   GET /api/v1/auth/oauth/stats
 * @access  Private (Admin only)
 */
const getOAuthStats = async (req, res) => {
  try {
    // Check if user is admin
    if (
      req.user.account_type !== "admin" &&
      req.user.account_type !== "super-admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const stats = await User.aggregate([
      {
        $match: {
          oauth: { $exists: true, $ne: {} },
        },
      },
      {
        $project: {
          oauth_providers: { $objectToArray: "$oauth" },
          created_at: "$createdAt",
          last_login: "$last_login",
        },
      },
      {
        $unwind: "$oauth_providers",
      },
      {
        $group: {
          _id: "$oauth_providers.k",
          total_users: { $sum: 1 },
          recent_logins: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    "$last_login",
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { total_users: -1 },
      },
    ]);

    const totalOAuthUsers = await User.countDocuments({
      oauth: { $exists: true, $ne: {} },
    });

    const totalUsers = await User.countDocuments();

    res.status(200).json({
      success: true,
      message: "OAuth statistics retrieved successfully",
      data: {
        provider_stats: stats,
        summary: {
          total_oauth_users: totalOAuthUsers,
          total_users: totalUsers,
          oauth_adoption_rate:
            ((totalOAuthUsers / totalUsers) * 100).toFixed(2) + "%",
        },
        generated_at: new Date(),
      },
    });
  } catch (error) {
    logger.error("Get OAuth stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve OAuth statistics",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

export {
  getOAuthProviders,
  handleOAuthSuccess,
  handleOAuthFailure,
  getConnectedProviders,
  disconnectProvider,
  linkProvider,
  getOAuthStats,
};
