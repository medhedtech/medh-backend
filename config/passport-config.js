import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import AppleStrategy from "passport-apple";
import User from "../models/user-modal.js";
import logger from "../utils/logger.js";
import { ENV_VARS } from "./envVars.js";

/**
 * Passport OAuth Configuration
 * Sets up all OAuth strategies for social login
 */

// ============================================================================
// PASSPORT SERIALIZATION
// ============================================================================

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// ============================================================================
// OAUTH CALLBACK HANDLER
// ============================================================================

/**
 * Universal OAuth callback handler for all providers
 * Enhanced with better email synchronization and account merging
 */
const handleOAuthCallback = async (
  provider,
  accessToken,
  refreshToken,
  profile,
  done,
) => {
  try {
    logger.info(`${provider} OAuth callback for profile:`, profile.id);

    // Extract user information from profile
    const userInfo = extractUserInfo(provider, profile);

    if (!userInfo.email) {
      logger.error(`${provider} OAuth: No email provided in profile`);
      return done(
        new Error(`${provider} account must have a verified email address`),
        null,
      );
    }

    // Enhanced user lookup strategy
    let user = await findExistingUser(provider, profile.id, userInfo.email);

    if (user) {
      // Update existing user with OAuth info and sync profile data
      user = await updateExistingUserEnhanced(
        user,
        provider,
        profile,
        userInfo,
        accessToken,
        refreshToken,
      );
    } else {
      // Create new user with comprehensive profile data
      user = await createNewUserEnhanced(
        provider,
        profile,
        userInfo,
        accessToken,
        refreshToken,
      );
    }

    // Log OAuth login activity with enhanced tracking
    await user.logActivity(
      "oauth_login",
      null,
      {
        provider,
        login_method: `oauth_${provider}`,
        profile_id: profile.id,
        email_verified: true,
        account_merged: !!user.oauth_account_merged,
        profile_updated: !!user.oauth_profile_updated,
      },
      {
        ip_address: "oauth_login",
        user_agent: "oauth_login",
        device_type: "web",
      },
    );

    return done(null, user);
  } catch (error) {
    logger.error(`${provider} OAuth error:`, error);
    return done(error, null);
  }
};

/**
 * Enhanced user lookup with multiple strategies
 */
const findExistingUser = async (provider, providerId, email) => {
  // Strategy 1: Find by OAuth provider ID (exact match)
  let user = await User.findOne({ [`oauth.${provider}.id`]: providerId });

  if (user) {
    logger.info(`Found user by ${provider} OAuth ID: ${providerId}`);
    return user;
  }

  // Strategy 2: Find by email address (for account merging)
  user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    logger.info(`Found user by email for OAuth linking: ${email}`);
    // Mark for account merging
    user.oauth_account_merged = true;
    return user;
  }

  // Strategy 3: Find by any OAuth provider with same email (cross-provider linking)
  user = await User.findOne({
    $and: [{ email: email.toLowerCase() }, { oauth: { $exists: true } }],
  });

  if (user) {
    logger.info(`Found user with existing OAuth and same email: ${email}`);
    return user;
  }

  return null;
};

// ============================================================================
// USER INFO EXTRACTION
// ============================================================================

/**
 * Extract user information from OAuth profile
 */
const extractUserInfo = (provider, profile) => {
  const userInfo = {
    provider_id: profile.id,
    provider,
    email: null,
    full_name: null,
    first_name: null,
    last_name: null,
    profile_picture: null,
    username: null,
  };

  switch (provider) {
    case "google":
      userInfo.email = profile.emails?.[0]?.value;
      userInfo.full_name = profile.displayName;
      userInfo.first_name = profile.name?.givenName;
      userInfo.last_name = profile.name?.familyName;
      userInfo.profile_picture = profile.photos?.[0]?.value;
      userInfo.username = profile.emails?.[0]?.value?.split("@")[0];
      break;

    case "facebook":
      userInfo.email = profile.emails?.[0]?.value;
      userInfo.full_name = profile.displayName;
      userInfo.first_name = profile.name?.givenName;
      userInfo.last_name = profile.name?.familyName;
      userInfo.profile_picture = profile.photos?.[0]?.value;
      userInfo.username =
        profile.username || profile.emails?.[0]?.value?.split("@")[0];
      break;

    case "github":
      userInfo.email = profile.emails?.[0]?.value;
      userInfo.full_name = profile.displayName;
      userInfo.username = profile.username;
      userInfo.profile_picture = profile.photos?.[0]?.value;
      break;

    case "linkedin":
      userInfo.email = profile.emails?.[0]?.value;
      userInfo.full_name = profile.displayName;
      userInfo.first_name = profile.name?.givenName;
      userInfo.last_name = profile.name?.familyName;
      userInfo.profile_picture = profile.photos?.[0]?.value;
      userInfo.username = profile.emails?.[0]?.value?.split("@")[0];
      break;

    case "microsoft":
      userInfo.email = profile.emails?.[0]?.value;
      userInfo.full_name = profile.displayName;
      userInfo.first_name = profile.name?.givenName;
      userInfo.last_name = profile.name?.familyName;
      userInfo.profile_picture = profile.photos?.[0]?.value;
      userInfo.username = profile.emails?.[0]?.value?.split("@")[0];
      break;

    case "apple":
      userInfo.email = profile.email;
      userInfo.full_name = profile.name
        ? `${profile.name.firstName} ${profile.name.lastName}`
        : null;
      userInfo.first_name = profile.name?.firstName;
      userInfo.last_name = profile.name?.lastName;
      userInfo.username = profile.email?.split("@")[0];
      break;
  }

  return userInfo;
};

// ============================================================================
// USER MANAGEMENT FUNCTIONS
// ============================================================================

// This function is now replaced by updateExistingUserEnhanced above

// This function is now replaced by createNewUserEnhanced above

/**
 * Enhanced update of existing user with OAuth information and profile data syncing
 */
const updateExistingUserEnhanced = async (
  user,
  provider,
  profile,
  userInfo,
  accessToken,
  refreshToken,
) => {
  try {
    // Initialize OAuth object if it doesn't exist
    if (!user.oauth) user.oauth = {};

    // Store previous OAuth info for comparison
    const hadOAuthBefore = !!user.oauth[provider];

    // Update OAuth information
    user.oauth[provider] = {
      id: profile.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      profile: profile,
      connected_at: hadOAuthBefore
        ? user.oauth[provider].connected_at
        : new Date(),
      last_login: new Date(),
      last_refresh: new Date(),
    };

    // Enhanced profile data synchronization
    let profileUpdated = false;

    // Sync full name (prioritize OAuth data if current name is empty or generic)
    if (
      userInfo.full_name &&
      (!user.full_name ||
        typeof user.full_name !== "string" ||
        user.full_name === "User" ||
        user.full_name.includes("user"))
    ) {
      user.full_name = userInfo.full_name;
      profileUpdated = true;
      logger.info(
        `Updated full_name from ${provider} OAuth: ${userInfo.full_name}`,
      );
    }

    // Sync profile picture (prioritize OAuth if current image is empty or default)
    if (
      userInfo.profile_picture &&
      (!user.user_image ||
        !user.user_image.url ||
        user.user_image.url.includes("default") ||
        user.user_image.url.includes("placeholder"))
    ) {
      user.user_image = {
        url: userInfo.profile_picture,
        public_id: null, // OAuth images don't have Cloudinary public_id
        alt_text: `${user.full_name || "User"} profile picture from ${provider}`,
        upload_date: new Date(),
      };
      profileUpdated = true;
      logger.info(`Updated profile picture from ${provider} OAuth`);
    }

    // Enhanced email synchronization for Google OAuth
    if (provider === "google" && userInfo.email) {
      // If user email is empty, use Google email
      if (!user.email) {
        user.email = userInfo.email.toLowerCase();
        user.email_verified = true;
        profileUpdated = true;
        logger.info(`Set email from Google OAuth: ${userInfo.email}`);
      }
      // If emails don't match, check if this is an account merge scenario
      else if (user.email.toLowerCase() !== userInfo.email.toLowerCase()) {
        // Log potential email mismatch for admin review
        logger.warn(
          `Email mismatch in Google OAuth - User: ${user.email}, Google: ${userInfo.email}`,
        );

        // Store Google email as alternative email for verification
        if (!user.alternative_emails) user.alternative_emails = [];
        if (!user.alternative_emails.includes(userInfo.email.toLowerCase())) {
          user.alternative_emails.push(userInfo.email.toLowerCase());
          profileUpdated = true;
        }
      }
      // If emails match but user email wasn't verified, mark as verified
      else if (
        user.email.toLowerCase() === userInfo.email.toLowerCase() &&
        !user.email_verified
      ) {
        user.email_verified = true;
        profileUpdated = true;
        logger.info(`Verified email through Google OAuth: ${user.email}`);
      }
    }

    // Sync username if not set
    if (!user.username && userInfo.username) {
      // Check if username is available
      const existingUser = await User.findOne({ username: userInfo.username });
      if (!existingUser) {
        user.username = userInfo.username;
        profileUpdated = true;
        logger.info(
          `Set username from ${provider} OAuth: ${userInfo.username}`,
        );
      }
    }

    // Update social links based on provider
    if (provider === "google" && !user.google_link && userInfo.email) {
      user.google_link = `https://plus.google.com/+${userInfo.email}`;
      profileUpdated = true;
    }

    if (provider === "facebook" && !user.facebook_link) {
      user.facebook_link = `https://facebook.com/${profile.id}`;
      profileUpdated = true;
    }

    if (provider === "github" && !user.github_link && profile.profileUrl) {
      user.github_link = profile.profileUrl;
      profileUpdated = true;
    }

    if (provider === "linkedin" && !user.linkedin_link && profile.profileUrl) {
      user.linkedin_link = profile.profileUrl;
      profileUpdated = true;
    }

    // Update account status and activity
    user.last_login = new Date();
    user.is_online = true;

    // If this was a direct registration account without OAuth, activate it
    if (!hadOAuthBefore && !user.is_active) {
      user.is_active = true;
      user.email_verified = true;
      profileUpdated = true;
      logger.info(`Activated account through ${provider} OAuth: ${user.email}`);
    }

    // Update statistics
    if (!user.statistics)
      user.statistics = { engagement: {}, learning: {}, social: {} };
    if (!user.statistics.social) user.statistics.social = {};
    if (!user.statistics.social.oauth_providers)
      user.statistics.social.oauth_providers = [];

    if (!user.statistics.social.oauth_providers.includes(provider)) {
      user.statistics.social.oauth_providers.push(provider);
      profileUpdated = true;
    }

    // Mark flags for logging
    user.oauth_profile_updated = profileUpdated;
    user.oauth_account_merged = user.oauth_account_merged || false;

    await user.save();
    logger.info(
      `Successfully updated user ${user.email} with ${provider} OAuth data`,
    );

    return user;
  } catch (error) {
    logger.error(`Error updating user with ${provider} OAuth:`, error);
    throw error;
  }
};

/**
 * Enhanced creation of new user from OAuth profile with comprehensive data
 */
const createNewUserEnhanced = async (
  provider,
  profile,
  userInfo,
  accessToken,
  refreshToken,
) => {
  try {
    // Generate unique username
    let username = userInfo.username || `${provider}_${profile.id}`;

    // Ensure username is unique
    let counter = 1;
    let originalUsername = username;
    while (await User.findOne({ username })) {
      username = `${originalUsername}_${counter}`;
      counter++;
      if (counter > 999) {
        username = `${provider}_${Date.now()}`;
        break;
      }
    }

    // Generate student ID for new OAuth users
    let studentId = null;
    try {
      studentId = await User.generateStudentId();
    } catch (error) {
      logger.error("Error generating student ID for OAuth user:", error);
    }

    const userData = {
      full_name:
        userInfo.full_name ||
        `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
      email: userInfo.email.toLowerCase(),
      username: username,
      user_image: userInfo.profile_picture
        ? {
            url: userInfo.profile_picture,
            public_id: null,
            alt_text: `${userInfo.full_name || "User"} profile picture from ${provider}`,
            upload_date: new Date(),
          }
        : undefined,
      email_verified: true, // OAuth emails are pre-verified
      status: "Active", // OAuth users are immediately active
      account_type: "free", // Default account type for OAuth users
      role: ["student"], // Default role
      student_id: studentId,
      password_set: false, // OAuth users don't have passwords initially

      // OAuth information
      oauth: {
        [provider]: {
          id: profile.id,
          access_token: accessToken,
          refresh_token: refreshToken,
          profile: profile,
          connected_at: new Date(),
          last_login: new Date(),
          last_refresh: new Date(),
        },
      },

      // Enhanced statistics
      statistics: {
        engagement: {
          total_logins: 1,
          total_session_time: 0,
          last_active_date: new Date(),
          registration_date: new Date(),
        },
        learning: {
          current_streak: 0,
          longest_streak: 0,
          courses_enrolled: 0,
          certificates_earned: 0,
        },
        social: {
          oauth_providers: [provider],
          profile_completion: 60, // OAuth provides basic profile data
        },
      },

      // User preferences
      preferences: {
        theme: "auto",
        language: "en",
        timezone: "UTC",
        notifications: {
          email: {
            marketing: false,
            course_updates: true,
            system_alerts: true,
            weekly_summary: true,
            achievement_unlocked: true,
          },
          push: {
            enabled: false,
            marketing: false,
            course_reminders: true,
            live_sessions: true,
            community_activity: false,
          },
          sms: {
            enabled: false,
            course_reminders: false,
            emergency_alerts: true,
          },
        },
      },

      // Metadata
      meta: {
        registration_method: `oauth_${provider}`,
        referral_source: "social", // OAuth logins are social referrals
        oauth_first_login: new Date(),
        profile_source: provider,
      },

      // Activity status
      is_online: true,
      last_login: new Date(),
      last_seen: new Date(),
    };

    // Set provider-specific social links
    switch (provider) {
      case "google":
        if (userInfo.email) {
          userData.google_link = `https://plus.google.com/+${userInfo.email}`;
        }
        break;
      case "facebook":
        userData.facebook_link = `https://facebook.com/${profile.id}`;
        break;
      case "github":
        if (profile.profileUrl) {
          userData.github_link = profile.profileUrl;
        }
        if (userInfo.username) {
          userData.github_username = userInfo.username;
        }
        break;
      case "linkedin":
        if (profile.profileUrl) {
          userData.linkedin_link = profile.profileUrl;
        }
        break;
    }

    // Extract additional profile data from provider
    if (userInfo.first_name) userData.first_name = userInfo.first_name;
    if (userInfo.last_name) userData.last_name = userInfo.last_name;

    const user = new User(userData);
    await user.save();

    logger.info(
      `Successfully created new user from ${provider} OAuth: ${userInfo.email}`,
    );

    return user;
  } catch (error) {
    logger.error(`Error creating new user from ${provider} OAuth:`, error);
    throw error;
  }
};

// ============================================================================
// GOOGLE OAUTH STRATEGY
// ============================================================================

if (ENV_VARS.GOOGLE_CLIENT_ID && ENV_VARS.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: ENV_VARS.GOOGLE_CLIENT_ID,
        clientSecret: ENV_VARS.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/v1/auth/oauth/google/callback",
        scope: ["profile", "email"],
      },
      (accessToken, refreshToken, profile, done) => {
        handleOAuthCallback("google", accessToken, refreshToken, profile, done);
      },
    ),
  );
  logger.info("Google OAuth strategy initialized");
}

// ============================================================================
// FACEBOOK OAUTH STRATEGY
// ============================================================================

if (ENV_VARS.FACEBOOK_CLIENT_ID && ENV_VARS.FACEBOOK_CLIENT_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: ENV_VARS.FACEBOOK_CLIENT_ID,
        clientSecret: ENV_VARS.FACEBOOK_CLIENT_SECRET,
        callbackURL: "/api/v1/auth/oauth/facebook/callback",
        profileFields: ["id", "displayName", "photos", "email", "name"],
      },
      (accessToken, refreshToken, profile, done) => {
        handleOAuthCallback(
          "facebook",
          accessToken,
          refreshToken,
          profile,
          done,
        );
      },
    ),
  );
  logger.info("Facebook OAuth strategy initialized");
}

// ============================================================================
// GITHUB OAUTH STRATEGY
// ============================================================================

if (ENV_VARS.GITHUB_CLIENT_ID && ENV_VARS.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: ENV_VARS.GITHUB_CLIENT_ID,
        clientSecret: ENV_VARS.GITHUB_CLIENT_SECRET,
        callbackURL: "/api/v1/auth/oauth/github/callback",
        scope: ["user:email"],
      },
      (accessToken, refreshToken, profile, done) => {
        handleOAuthCallback("github", accessToken, refreshToken, profile, done);
      },
    ),
  );
  logger.info("GitHub OAuth strategy initialized");
}

// ============================================================================
// LINKEDIN OAUTH STRATEGY
// ============================================================================

if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use(
    new LinkedInStrategy(
      {
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: "/api/v1/auth/oauth/linkedin/callback",
        scope: ["r_emailaddress", "r_liteprofile"],
      },
      (accessToken, refreshToken, profile, done) => {
        handleOAuthCallback(
          "linkedin",
          accessToken,
          refreshToken,
          profile,
          done,
        );
      },
    ),
  );
  logger.info("LinkedIn OAuth strategy initialized");
}

// ============================================================================
// MICROSOFT OAUTH STRATEGY
// ============================================================================

if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(
    new MicrosoftStrategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: "/api/v1/auth/oauth/microsoft/callback",
        scope: ["user.read"],
      },
      (accessToken, refreshToken, profile, done) => {
        handleOAuthCallback(
          "microsoft",
          accessToken,
          refreshToken,
          profile,
          done,
        );
      },
    ),
  );
  logger.info("Microsoft OAuth strategy initialized");
}

// ============================================================================
// APPLE OAUTH STRATEGY
// ============================================================================

if (
  process.env.APPLE_CLIENT_ID &&
  process.env.APPLE_TEAM_ID &&
  process.env.APPLE_KEY_ID
) {
  passport.use(
    new AppleStrategy(
      {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        callbackURL: "/api/v1/auth/oauth/apple/callback",
        keyID: process.env.APPLE_KEY_ID,
        privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH,
        scope: ["name", "email"],
      },
      (accessToken, refreshToken, profile, done) => {
        handleOAuthCallback("apple", accessToken, refreshToken, profile, done);
      },
    ),
  );
  logger.info("Apple OAuth strategy initialized");
}

// ============================================================================
// EXPORT CONFIGURATION
// ============================================================================

export default passport;
export { handleOAuthCallback };
