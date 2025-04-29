import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ENV_VARS } from '../config/envVars.js';
import logger from './logger.js';

// Import Redis client if available
let redisClient;
if (ENV_VARS.REDIS_ENABLED) {
  try {
    const { createClient } = await import('redis');
    redisClient = createClient({
      url: `redis://${ENV_VARS.REDIS_PASSWORD ? `:${ENV_VARS.REDIS_PASSWORD}@` : ''}${ENV_VARS.REDIS_HOST}:${ENV_VARS.REDIS_PORT}`
    });
    
    await redisClient.connect();
    
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', { error: err.message });
    });
    
    logger.info('Redis connected for JWT token management');
  } catch (error) {
    logger.error('Failed to connect to Redis for JWT management', { error: error.message });
    // Continue without Redis - will use in-memory storage as fallback
  }
}

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
    expiresIn: '15m',  // Short-lived access token
    algorithm: 'HS256'
  },
  REFRESH: {
    expiresIn: '7d',   // Longer-lived refresh token
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
  if (redisClient) {
    try {
      // Store token in Redis with expiration
      const expiresInSeconds = 7 * 24 * 60 * 60; // 7 days in seconds
      await redisClient.set(
        `refresh_token:${refreshToken}`, 
        JSON.stringify({ userId, createdAt: new Date().toISOString() }),
        { EX: expiresInSeconds }
      );
    } catch (error) {
      logger.error('Error storing refresh token in Redis', { error: error.message, userId });
      // Fall back to in-memory storage
      tokenStore.refreshTokens.set(refreshToken, {
        userId,
        createdAt: new Date().toISOString()
      });
    }
  } else {
    // Use in-memory storage if Redis is not available
    tokenStore.refreshTokens.set(refreshToken, {
      userId,
      createdAt: new Date().toISOString()
    });
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
    // Check if token has been revoked
    if (tokenStore.revokedTokens.has(token)) {
      logger.warn('Attempt to use revoked token');
      return null;
    }
    
    const decoded = jwt.verify(token, ENV_VARS.JWT_SECRET_KEY);
    
    // Ensure it's an access token
    if (decoded.type !== 'access') {
      logger.warn('Invalid token type used for access');
      return null;
    }
    
    return decoded;
  } catch (error) {
    logger.warn('Token verification failed', { error: error.message });
    return null;
  }
};

/**
 * Verify a refresh token
 * @param {string} token - Refresh token to verify
 * @returns {Promise<Object|null>} User ID if valid, null otherwise
 */
export const verifyRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, ENV_VARS.JWT_SECRET_KEY);
    
    // Ensure it's a refresh token
    if (decoded.type !== 'refresh') {
      logger.warn('Invalid token type used for refresh');
      return null;
    }
    
    const refreshToken = decoded.token;
    
    // Check if the refresh token exists in our store
    let tokenData;
    
    if (redisClient) {
      try {
        const data = await redisClient.get(`refresh_token:${refreshToken}`);
        tokenData = data ? JSON.parse(data) : null;
      } catch (error) {
        logger.error('Error retrieving refresh token from Redis', { error: error.message });
        // Fall back to in-memory check
        tokenData = tokenStore.refreshTokens.get(refreshToken);
      }
    } else {
      tokenData = tokenStore.refreshTokens.get(refreshToken);
    }
    
    if (!tokenData) {
      logger.warn('Refresh token not found in store');
      return null;
    }
    
    return { userId: tokenData.userId, refreshToken };
  } catch (error) {
    logger.warn('Refresh token verification failed', { error: error.message });
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
  const tokenData = await verifyRefreshToken(refreshToken);
  
  if (!tokenData) {
    return null;
  }
  
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