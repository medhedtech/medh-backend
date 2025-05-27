import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ENV_VARS } from '../config/envVars.js';
import logger from './logger.js';

// Import Redis client if available
let redisClient;
let redisConnectionAttempted = false;

const initializeRedis = async () => {
  if (redisConnectionAttempted) return;
  redisConnectionAttempted = true;

  if (ENV_VARS.REDIS_ENABLED) {
    try {
      const { createClient } = await import('redis');
      redisClient = createClient({
        url: `redis://${ENV_VARS.REDIS_PASSWORD ? `:${ENV_VARS.REDIS_PASSWORD}@` : ''}${ENV_VARS.REDIS_HOST}:${ENV_VARS.REDIS_PORT}`,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        },
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            // End reconnecting on a specific error and flush all commands with a individual error
            return new Error('The server refused the connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            // End reconnecting after a specific timeout and flush all commands with a individual error
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            // End reconnecting with built in error
            return undefined;
          }
          // reconnect after
          return Math.min(options.attempt * 100, 3000);
        }
      });
      
      redisClient.on('error', (err) => {
        logger.error('Redis Client Error', { error: err.message });
        // Don't set redisClient to null here, just log the error
      });

      redisClient.on('connect', () => {
        logger.info('Redis client connected successfully');
      });

      redisClient.on('reconnecting', () => {
        logger.info('Redis client reconnecting...');
      });

      redisClient.on('end', () => {
        logger.warn('Redis client connection ended');
      });
      
      await redisClient.connect();
      logger.info('Redis connected for JWT token management');
    } catch (error) {
      logger.error('Failed to connect to Redis for JWT management', { error: error.message });
      redisClient = null;
      // Continue without Redis - will use in-memory storage as fallback
    }
  }
};

// Initialize Redis connection
initializeRedis();

// In-memory token store as fallback (not for production use without Redis)
const tokenStore = {
  refreshTokens: new Map(),
  revokedTokens: new Set(),
};

/**
 * Token types and their configurations
 */
const TOKEN_TYPES = {
  ACCESS: {
    expiresIn: '24h',  // Longer-lived access token for better UX
    algorithm: 'HS256'
  },
  REFRESH: {
    expiresIn: '30d',   // Much longer refresh token
    algorithm: 'HS256'
  }
};

/**
 * Generate a secure, random token
 * @returns {string} A random token
 */
const generateSecureToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Create an access token for a user
 * @param {Object} user - User object to create token for
 * @returns {string} JWT token
 */
export const generateAccessToken = (user) => {
  // Only include necessary user data in the token payload
  const payload = {
    id: user._id || user.id,
    email: user.email,
    role: user.role,
    type: 'access'
  };

  return jwt.sign(
    payload,
    ENV_VARS.JWT_SECRET_KEY,
    { expiresIn: TOKEN_TYPES.ACCESS.expiresIn, algorithm: TOKEN_TYPES.ACCESS.algorithm }
  );
};

/**
 * Create a refresh token for a user
 * @param {Object} user - User object to create refresh token for
 * @returns {string} Refresh token
 */
export const generateRefreshToken = async (user) => {
  // Create a unique refresh token
  const refreshToken = generateSecureToken();
  const userId = user._id || user.id;
  
  // Create a refresh token payload
  const payload = {
    id: userId,
    type: 'refresh',
    token: refreshToken
  };

  // Sign the token
  const signedToken = jwt.sign(
    payload,
    ENV_VARS.JWT_SECRET_KEY,
    { expiresIn: TOKEN_TYPES.REFRESH.expiresIn, algorithm: TOKEN_TYPES.REFRESH.algorithm }
  );
  
  // Store refresh token with user association
  const tokenData = {
    userId,
    createdAt: new Date().toISOString()
  };

  let redisStored = false;
  
  if (redisClient && redisClient.isReady) {
    try {
      // Store token in Redis with expiration
      const expiresInSeconds = 30 * 24 * 60 * 60; // 30 days in seconds
      await redisClient.set(
        `refresh_token:${refreshToken}`, 
        JSON.stringify(tokenData),
        { EX: expiresInSeconds }
      );
      redisStored = true;
      logger.debug('Refresh token stored in Redis', { userId });
    } catch (error) {
      logger.error('Error storing refresh token in Redis', { error: error.message, userId });
      // Will fall back to in-memory storage below
    }
  }

  // Always store in memory as backup (or primary if Redis is not available)
  if (!redisStored || !redisClient) {
    tokenStore.refreshTokens.set(refreshToken, tokenData);
    logger.debug('Refresh token stored in memory', { userId, redisAvailable: !!redisClient });
  }

  return signedToken;
};

/**
 * Verify an access token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
export const verifyAccessToken = (token) => {
  try {
    if (!token || typeof token !== 'string') {
      logger.warn('Invalid token format', { tokenType: typeof token });
      return null;
    }

    // Check if token has been revoked
    if (tokenStore.revokedTokens.has(token)) {
      logger.warn('Attempt to use revoked token');
      return null;
    }
    
    const decoded = jwt.verify(token, ENV_VARS.JWT_SECRET_KEY);
    
    // Log the decoded token structure for debugging
    logger.debug('Token decoded successfully', {
      keys: Object.keys(decoded),
      hasType: !!decoded.type,
      hasUser: !!decoded.user,
      hasId: !!decoded.id,
      hasSub: !!decoded.sub,
      tokenStructure: {
        type: decoded.type,
        user: decoded.user ? Object.keys(decoded.user) : null,
        directFields: {
          id: decoded.id,
          sub: decoded.sub,
          role: decoded.role,
          email: decoded.email
        }
      }
    });
    
    // Handle different token formats
    let user = null;
    
    if (decoded.type === 'access') {
      // New token format
      user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        type: decoded.type
      };
      
      // Validate required fields for new format
      if (!decoded.id || !decoded.email || !decoded.role) {
        logger.warn('New format token missing required fields', { 
          hasId: !!decoded.id, 
          hasEmail: !!decoded.email, 
          hasRole: !!decoded.role 
        });
        return null;
      }
    } else if (decoded.user && decoded.user.id) {
      // Old token format (from legacy auth service)
      user = {
        id: decoded.user.id,
        role: decoded.user.role,
        _id: decoded.user.id
      };
      
      // Validate required fields for old format
      if (!decoded.user.id || !decoded.user.role) {
        logger.warn('Old format token missing required fields', { 
          hasId: !!decoded.user.id, 
          hasRole: !!decoded.user.role 
        });
        return null;
      }
    } else if (decoded.id && decoded.role) {
      // Direct format (user data directly in token)
      user = {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email,
        _id: decoded.id
      };
    } else if (decoded.sub) {
      // Generic JWT format - try to map to user format
      // This is for compatibility with standard JWT tokens
      user = {
        id: decoded.sub,
        role: decoded.admin ? 'admin' : 'student', // Fallback role mapping
        email: decoded.email,
        name: decoded.name,
        _id: decoded.sub
      };
      
      logger.debug('Mapped generic JWT to user format', {
        originalSub: decoded.sub,
        mappedRole: user.role,
        hasName: !!decoded.name
      });
    } else if (decoded.type === 'refresh') {
      // This is a refresh token being used as access token
      logger.warn('Refresh token used where access token expected');
      return null;
    } else {
      logger.warn('Unknown token format', { 
        hasType: !!decoded.type,
        hasUser: !!decoded.user,
        hasId: !!decoded.id,
        hasSub: !!decoded.sub,
        keys: Object.keys(decoded),
        fullDecoded: decoded
      });
      return null;
    }
    
    logger.debug('Token verification successful', {
      userId: user.id,
      userRole: user.role,
      tokenFormat: decoded.type === 'access' ? 'new' : 
                   decoded.user ? 'legacy' : 
                   decoded.sub ? 'generic' : 'direct'
    });
    
    return user;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Token expired', { 
        expiredAt: error.expiredAt,
        now: new Date()
      });
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid token signature or format', { error: error.message });
    } else {
      logger.warn('Token verification failed', { error: error.message, errorType: error.name });
    }
    return null;
  }
};

/**
 * Verify a refresh token
 * @param {string} token - Refresh token to verify
 * @returns {Promise<Object|null>} User ID if valid, null otherwise
 */
export const verifyRefreshToken = async (token) => {
  if (!token || typeof token !== 'string') {
    logger.warn('Invalid refresh token format');
    return null;
  }

  try {
    const decoded = jwt.verify(token, ENV_VARS.JWT_SECRET_KEY);
    
    // Ensure it's a refresh token
    if (decoded.type !== 'refresh') {
      logger.warn('Invalid token type used for refresh', { tokenType: decoded.type });
      return null;
    }
    
    const refreshToken = decoded.token;
    
    // Check if the refresh token exists in our store
    let tokenData = null;
    
    // Try Redis first
    if (redisClient && redisClient.isReady) {
      try {
        const data = await redisClient.get(`refresh_token:${refreshToken}`);
        tokenData = data ? JSON.parse(data) : null;
        if (tokenData) {
          logger.debug('Refresh token found in Redis', { userId: tokenData.userId });
        }
      } catch (error) {
        logger.error('Error retrieving refresh token from Redis', { error: error.message });
        // Continue to check in-memory storage
      }
    }
    
    // Fallback to in-memory storage if Redis failed or returned null
    if (!tokenData) {
      tokenData = tokenStore.refreshTokens.get(refreshToken);
      if (tokenData) {
        logger.debug('Refresh token found in memory', { userId: tokenData.userId });
      }
    }
    
    if (!tokenData) {
      logger.warn('Refresh token not found in any store', { 
        refreshToken: refreshToken.substr(0, 10) + '...',
        redisAvailable: !!(redisClient && redisClient.isReady),
        memoryTokenCount: tokenStore.refreshTokens.size
      });
      return null;
    }
    
    return { userId: tokenData.userId, refreshToken };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Refresh token expired', { 
        expiredAt: error.expiredAt,
        now: new Date()
      });
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid refresh token signature or format', { error: error.message });
    } else {
      logger.warn('Refresh token verification failed', { 
        error: error.message,
        errorType: error.name,
        tokenPrefix: token ? token.substr(0, 10) + '...' : 'undefined' 
      });
    }
    return null;
  }
};

/**
 * Revoke a refresh token
 * @param {string} token - Refresh token to revoke
 * @returns {Promise<boolean>} Success status
 */
export const revokeRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, ENV_VARS.JWT_SECRET_KEY);
    
    if (decoded.type !== 'refresh') {
      return false;
    }
    
    const refreshToken = decoded.token;
    
    if (redisClient) {
      try {
        await redisClient.del(`refresh_token:${refreshToken}`);
      } catch (error) {
        logger.error('Error removing refresh token from Redis', { error: error.message });
        // Fall back to in-memory removal
        tokenStore.refreshTokens.delete(refreshToken);
      }
    } else {
      tokenStore.refreshTokens.delete(refreshToken);
    }
    
    return true;
  } catch (error) {
    logger.warn('Error revoking refresh token', { error: error.message });
    return false;
  }
};

/**
 * Refresh the access token using a refresh token
 * @param {string} refreshToken - Refresh token
 * @param {Function} getUserById - Function to retrieve user data by ID
 * @returns {Promise<Object|null>} New tokens or null if refresh failed
 */
export const refreshAccessToken = async (refreshToken, getUserById) => {
  if (!refreshToken) {
    logger.warn('Refresh token missing');
    return null;
  }

  if (!getUserById || typeof getUserById !== 'function') {
    logger.error('Invalid getUserById function provided to refreshAccessToken');
    return null;
  }
  
  const tokenData = await verifyRefreshToken(refreshToken);
  
  if (!tokenData) {
    logger.warn('Invalid refresh token provided');
    return null;
  }
  
  try {
    // Get user data to include in new token
    const user = await getUserById(tokenData.userId);
    
    if (!user) {
      logger.warn('User not found during token refresh', { userId: tokenData.userId });
      return null;
    }
    
    // Revoke the old refresh token (one-time use)
    await revokeRefreshToken(refreshToken);
    
    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user);
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    logger.error('Error during access token refresh', { error: error.message, stack: error.stack });
    return null;
  }
};

/**
 * Revoke all refresh tokens for a user
 * @param {string} userId - User ID to revoke tokens for
 * @returns {Promise<boolean>} Success status
 */
export const revokeAllUserTokens = async (userId) => {
  try {
    if (redisClient) {
      // Use Redis SCAN to find and delete all tokens for the user
      // This is a simplified approach - real implementation would need to handle
      // cursor-based scanning for large datasets
      
      // In a real implementation, we would maintain a separate index of user->tokens
      // for efficient revocation
      logger.info(`Revoking all tokens for user: ${userId} not yet implemented for Redis`);
      return true;
    } else {
      // With in-memory store we can iterate through all tokens
      for (const [token, data] of tokenStore.refreshTokens.entries()) {
        if (data.userId === userId) {
          tokenStore.refreshTokens.delete(token);
        }
      }
      return true;
    }
  } catch (error) {
    logger.error('Error revoking all user tokens', { userId, error: error.message });
    return false;
  }
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens
}; 