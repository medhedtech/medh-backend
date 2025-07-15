import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ENV_VARS } from "../config/envVars.js";

/**
 * Industry-standard password security utility
 * Implements OWASP best practices for password handling
 */
class PasswordSecurity {
  constructor() {
    // Industry standard bcrypt work factor (cost factor)
    // OWASP 2024 recommendation: 12 minimum, 15+ preferred
    this.BCRYPT_WORK_FACTOR = parseInt(process.env.BCRYPT_WORK_FACTOR) || 12;
    
    // Password pepper (additional secret key for defense in depth)
    this.PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || "";
    
    // Maximum password length to prevent DoS attacks
    this.MAX_PASSWORD_LENGTH = 128;
    
    // Bcrypt has 72-byte limit, but we'll validate before hashing
    this.BCRYPT_MAX_LENGTH = 72;
    
    // Timing attack protection - constant time delays
    this.TIMING_SAFE_DELAY = 100; // milliseconds
  }

  /**
   * Validates password with basic requirements only
   * @param {string} password - The password to validate
   * @returns {Object} - Validation result with errors
   */
  validatePasswordStrength(password) {
    const errors = [];
    
    if (!password || typeof password !== 'string') {
      errors.push('Password is required');
      return { isValid: false, errors };
    }
    
    // Only enforce maximum length to prevent DoS attacks
    if (password.length > this.MAX_PASSWORD_LENGTH) {
      errors.push(`Password must not exceed ${this.MAX_PASSWORD_LENGTH} characters`);
    }
    
    // Minimum length check (relaxed)
    if (password.length < 1) {
      errors.push('Password cannot be empty');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  /**
   * Calculates password strength score
   * @param {string} password - The password to analyze
   * @returns {Object} - Strength score and level
   */
  calculatePasswordStrength(password) {
    let score = 0;
    
    // Length scoring
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    
    // Character variety scoring
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    
    // Complexity scoring
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    
    const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const level = Math.min(Math.floor(score / 1.5), levels.length - 1);
    
    return {
      score: Math.min(score, 10),
      level: levels[level],
      percentage: Math.min((score / 8) * 100, 100)
    };
  }

  /**
   * Peppers the password for additional security
   * @param {string} password - The password to pepper
   * @returns {string} - Peppered password
   */
  pepperPassword(password) {
    if (!this.PASSWORD_PEPPER) {
      return password;
    }
    
    // Use HMAC-SHA256 for consistent peppering
    return crypto
      .createHmac('sha256', this.PASSWORD_PEPPER)
      .update(password)
      .digest('hex');
  }

  /**
   * Hashes a password using industry-standard bcrypt with proper work factor
   * @param {string} password - The password to hash
   * @returns {Promise<string>} - The hashed password
   */
  async hashPassword(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    
    // Validate password length to prevent DoS
    if (password.length > this.MAX_PASSWORD_LENGTH) {
      throw new Error(`Password exceeds maximum length of ${this.MAX_PASSWORD_LENGTH} characters`);
    }
    
    // Truncate to bcrypt's 72-byte limit if necessary
    const truncatedPassword = password.substring(0, this.BCRYPT_MAX_LENGTH);
    
    // Apply pepper if configured
    const pepperedPassword = this.pepperPassword(truncatedPassword);
    
    try {
      // Generate salt with appropriate work factor
      const salt = await bcrypt.genSalt(this.BCRYPT_WORK_FACTOR);
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(pepperedPassword, salt);
      
      return hashedPassword;
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  /**
   * Timing-safe password comparison to prevent timing attacks
   * @param {string} candidatePassword - The password to verify
   * @param {string} hashedPassword - The stored hash
   * @returns {Promise<boolean>} - True if password matches
   */
  async comparePassword(candidatePassword, hashedPassword) {
    if (!candidatePassword || !hashedPassword) {
      // Always perform a dummy hash operation for timing consistency
      await this.performDummyOperation();
      return false;
    }
    
    try {
      // Truncate to bcrypt's 72-byte limit if necessary
      const truncatedPassword = candidatePassword.substring(0, this.BCRYPT_MAX_LENGTH);
      
      // Apply pepper if configured
      const pepperedPassword = this.pepperPassword(truncatedPassword);
      
      // Perform bcrypt comparison
      const isMatch = await bcrypt.compare(pepperedPassword, hashedPassword);
      
      // Add minimal timing protection
      await this.addTimingProtection();
      
      return isMatch;
    } catch (error) {
      // Always perform timing protection even on error
      await this.addTimingProtection();
      return false;
    }
  }

  /**
   * Performs a dummy bcrypt operation for timing consistency
   * @private
   */
  async performDummyOperation() {
    try {
      // Perform a dummy bcrypt operation with a fake hash
      await bcrypt.compare(
        'dummy_password',
        '$2a$12$dummy.hash.for.timing.consistency.only.xyz'
      );
    } catch (error) {
      // Ignore errors in dummy operation
    }
  }

  /**
   * Adds minimal timing protection
   * @private
   */
  async addTimingProtection() {
    // Add a small random delay to make timing attacks more difficult
    const randomDelay = Math.random() * this.TIMING_SAFE_DELAY;
    await new Promise(resolve => setTimeout(resolve, randomDelay));
  }

  /**
   * Generates a secure random password
   * @param {number} length - Password length (default: 16)
   * @returns {string} - Generated password
   */
  generateSecurePassword(length = 16) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Checks if password needs rehashing (due to work factor changes)
   * @param {string} hashedPassword - The stored hash
   * @returns {boolean} - True if rehashing is needed
   */
  needsRehashing(hashedPassword) {
    if (!hashedPassword || !hashedPassword.startsWith('$2a$') && !hashedPassword.startsWith('$2b$')) {
      return true;
    }
    
    try {
      // Extract work factor from hash
      const workFactor = parseInt(hashedPassword.split('$')[2]);
      return workFactor < this.BCRYPT_WORK_FACTOR;
    } catch (error) {
      return true;
    }
  }

  /**
   * Validates and normalizes password input
   * @param {string} password - The password to normalize
   * @returns {Object} - Normalized password and validation result
   */
  normalizePassword(password) {
    if (!password || typeof password !== 'string') {
      return { 
        normalized: '', 
        isValid: false, 
        error: 'Password must be a non-empty string' 
      };
    }
    
    // Trim whitespace
    const trimmed = password.trim();
    
    // Check for empty password after trimming
    if (!trimmed) {
      return { 
        normalized: '', 
        isValid: false, 
        error: 'Password cannot be empty or only whitespace' 
      };
    }
    
    return {
      normalized: trimmed,
      isValid: true,
      error: null
    };
  }
}

// Export singleton instance
const passwordSecurity = new PasswordSecurity();
export default passwordSecurity;