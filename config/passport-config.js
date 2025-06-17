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
 */
const handleOAuthCallback = async (provider, accessToken, refreshToken, profile, done) => {
  try {
    logger.info(`${provider} OAuth callback for profile:`, profile.id);

    // Extract user information from profile
    const userInfo = extractUserInfo(provider, profile);
    
    // Check if user already exists with this OAuth provider
    let user = await User.findOne({
      $or: [
        { [`oauth.${provider}.id`]: profile.id },
        { email: userInfo.email }
      ]
    });

    if (user) {
      // Update existing user with OAuth info
      user = await updateExistingUser(user, provider, profile, accessToken, refreshToken);
    } else {
      // Create new user
      user = await createNewUser(provider, profile, userInfo, accessToken, refreshToken);
    }

    // Log OAuth login activity
    await user.logActivity("oauth_login", null, {
      provider,
      login_method: `oauth_${provider}`,
      profile_id: profile.id,
    }, {
      ip_address: "oauth_login",
      user_agent: "oauth_login",
      device_type: "web",
    });

    return done(null, user);
  } catch (error) {
    logger.error(`${provider} OAuth error:`, error);
    return done(error, null);
  }
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
      userInfo.username = profile.username || profile.emails?.[0]?.value?.split("@")[0];
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
      userInfo.full_name = profile.name ? `${profile.name.firstName} ${profile.name.lastName}` : null;
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

/**
 * Update existing user with OAuth information
 */
const updateExistingUser = async (user, provider, profile, accessToken, refreshToken) => {
  // Update OAuth information
  if (!user.oauth) user.oauth = {};
  
  user.oauth[provider] = {
    id: profile.id,
    access_token: accessToken,
    refresh_token: refreshToken,
    profile: profile,
    connected_at: new Date(),
    last_login: new Date(),
  };

  // Update profile information if not already set
  const userInfo = extractUserInfo(provider, profile);
  
  if (!user.full_name && userInfo.full_name) {
    user.full_name = userInfo.full_name;
  }
  
  if (!user.user_image && userInfo.profile_picture) {
    user.user_image = userInfo.profile_picture;
  }

  // Update social links
  if (provider === "google" && userInfo.email && !user.email) {
    user.email = userInfo.email;
    user.email_verified = true; // OAuth emails are pre-verified
  }

  if (provider === "facebook" && !user.facebook_link) {
    user.facebook_link = `https://facebook.com/${profile.id}`;
  }

  if (provider === "github" && !user.github_link) {
    user.github_link = profile.profileUrl;
  }

  if (provider === "linkedin" && !user.linkedin_link) {
    user.linkedin_link = profile.profileUrl;
  }

  user.last_login = new Date();
  user.is_online = true;

  await user.save();
  return user;
};

/**
 * Create new user from OAuth profile
 */
const createNewUser = async (provider, profile, userInfo, accessToken, refreshToken) => {
  const userData = {
    full_name: userInfo.full_name || `${provider} User`,
    email: userInfo.email,
    username: userInfo.username || `${provider}_${profile.id}`,
    user_image: userInfo.profile_picture,
    email_verified: !!userInfo.email, // OAuth emails are pre-verified
    account_type: "student", // Default account type
    oauth: {
      [provider]: {
        id: profile.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        profile: profile,
        connected_at: new Date(),
        last_login: new Date(),
      }
    },
    statistics: {
      engagement: {
        total_logins: 1,
        total_session_time: 0,
        last_active_date: new Date(),
      },
      learning: {
        current_streak: 0,
        longest_streak: 0,
      },
      social: {
        oauth_providers: [provider],
      },
    },
    preferences: {
      theme: "auto",
      language: "en",
      timezone: "UTC",
    },
    meta: {
      registration_method: `oauth_${provider}`,
      referral_source: provider,
    },
    is_online: true,
    last_login: new Date(),
  };

  // Set social links based on provider
  if (provider === "facebook") {
    userData.facebook_link = `https://facebook.com/${profile.id}`;
  } else if (provider === "github") {
    userData.github_link = profile.profileUrl;
  } else if (provider === "linkedin") {
    userData.linkedin_link = profile.profileUrl;
  }

  const user = new User(userData);
  await user.save();

  return user;
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
      }
    )
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
        handleOAuthCallback("facebook", accessToken, refreshToken, profile, done);
      }
    )
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
      }
    )
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
        handleOAuthCallback("linkedin", accessToken, refreshToken, profile, done);
      }
    )
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
        handleOAuthCallback("microsoft", accessToken, refreshToken, profile, done);
      }
    )
  );
  logger.info("Microsoft OAuth strategy initialized");
}

// ============================================================================
// APPLE OAUTH STRATEGY
// ============================================================================

if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID) {
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
      }
    )
  );
  logger.info("Apple OAuth strategy initialized");
}

// ============================================================================
// EXPORT CONFIGURATION
// ============================================================================

export default passport; 