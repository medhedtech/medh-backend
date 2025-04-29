/**
 * Circuit Breaker Pattern Implementation
 * 
 * This module implements the circuit breaker pattern to prevent 
 * cascading failures when external services are unavailable.
 */

import logger from './logger.js';

/**
 * Circuit breaker states
 */
const STATES = {
  CLOSED: 'CLOSED',  // Normal operation, requests flow through
  OPEN: 'OPEN',      // Circuit is open, no requests are attempted
  HALF_OPEN: 'HALF_OPEN' // Testing if service has recovered
};

/**
 * Circuit Breaker class
 */
class CircuitBreaker {
  /**
   * Create a new circuit breaker
   * @param {Function} service - The function to wrap with circuit breaker
   * @param {Object} options - Circuit breaker options
   */
  constructor(service, options = {}) {
    this.service = service;
    this.state = STATES.CLOSED;
    this.failureThreshold = options.failureThreshold || 5;
    this.failureCount = 0;
    this.resetTimeout = options.resetTimeout || 30000; // Default 30 seconds
    this.monitorTimeout = options.monitorTimeout || 10000; // Default 10 seconds
    this.lastFailureTime = null;
    this.serviceName = options.serviceName || 'service';
    this.fallback = options.fallback;
    
    // Bind methods
    this.exec = this.exec.bind(this);
    this.recordSuccess = this.recordSuccess.bind(this);
    this.recordFailure = this.recordFailure.bind(this);
  }
  
  /**
   * Execute the service function protected by the circuit breaker
   * @param {...any} args - Arguments to pass to the service function
   * @returns {Promise<any>} - Result of the service function
   */
  async exec(...args) {
    if (this.state === STATES.OPEN) {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = STATES.HALF_OPEN;
        logger.debug(`Circuit breaker for ${this.serviceName} entering half-open state`);
      } else {
        logger.debug(`Circuit breaker for ${this.serviceName} is open, rejecting request`);
        if (this.fallback) {
          return this.fallback(...args);
        }
        throw new Error(`Service ${this.serviceName} is unavailable`);
      }
    }
    
    try {
      const result = await this.service(...args);
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      
      // If the circuit is half-open, immediately open it again on failure
      if (this.state === STATES.HALF_OPEN) {
        this.state = STATES.OPEN;
        this.lastFailureTime = Date.now();
        logger.warn(`Circuit breaker for ${this.serviceName} back to open state after failed test`);
      }
      
      // Check if we need to open the circuit
      if (this.state === STATES.CLOSED && this.failureCount >= this.failureThreshold) {
        this.state = STATES.OPEN;
        this.lastFailureTime = Date.now();
        logger.warn(`Circuit breaker for ${this.serviceName} tripped to open state`);
        
        // Set a timer to try again later (monitor state)
        setTimeout(() => {
          if (this.state === STATES.OPEN) {
            this.state = STATES.HALF_OPEN;
            logger.debug(`Circuit breaker for ${this.serviceName} entering half-open state from monitor`);
          }
        }, this.monitorTimeout);
      }
      
      if (this.fallback) {
        return this.fallback(...args);
      }
      throw error;
    }
  }
  
  /**
   * Record a successful operation
   */
  recordSuccess() {
    this.failureCount = 0;
    if (this.state === STATES.HALF_OPEN) {
      this.state = STATES.CLOSED;
      logger.info(`Circuit breaker for ${this.serviceName} reset to closed state`);
    }
  }
  
  /**
   * Record a failed operation
   */
  recordFailure() {
    this.failureCount += 1;
    logger.debug(`Circuit breaker for ${this.serviceName} recorded failure ${this.failureCount}/${this.failureThreshold}`);
  }
  
  /**
   * Reset the circuit breaker to closed state
   */
  reset() {
    this.failureCount = 0;
    this.state = STATES.CLOSED;
    logger.debug(`Circuit breaker for ${this.serviceName} manually reset`);
  }
  
  /**
   * Get the current state of the circuit breaker
   * @returns {Object} Circuit breaker status information
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      serviceName: this.serviceName,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Factory function to create a circuit breaker wrapped service
 * @param {Function} service - Service function to protect
 * @param {Object} options - Circuit breaker options
 * @returns {Function} Function that executes the service through the circuit breaker
 */
const circuitBreaker = (service, options = {}) => {
  const breaker = new CircuitBreaker(service, options);
  return (...args) => breaker.exec(...args);
};

/**
 * Pre-configured circuit breakers for common services
 */
export const serviceCircuitBreakers = {
  /**
   * Circuit breaker for email service
   * @param {Function} emailService - Email sending function
   * @param {Function} fallback - Fallback function when email service is down
   * @returns {Function} Email function with circuit breaker protection
   */
  email: (emailService, fallback) => circuitBreaker(emailService, {
    serviceName: 'email',
    failureThreshold: 3,
    resetTimeout: 60000, // 1 minute
    monitorTimeout: 30000, // 30 seconds
    fallback
  }),
  
  /**
   * Circuit breaker for database operations
   * @param {Function} dbOperation - Database operation function
   * @param {Function} fallback - Fallback function when database is down
   * @returns {Function} Database function with circuit breaker protection
   */
  database: (dbOperation, fallback) => circuitBreaker(dbOperation, {
    serviceName: 'database',
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
    fallback
  }),
  
  /**
   * Circuit breaker for external API calls
   * @param {Function} apiCall - API call function
   * @param {Function} fallback - Fallback function when API is down
   * @returns {Function} API function with circuit breaker protection
   */
  api: (apiCall, fallback) => circuitBreaker(apiCall, {
    serviceName: 'external-api',
    failureThreshold: 3,
    resetTimeout: 60000, // 1 minute
    fallback
  })
};

export default circuitBreaker; 