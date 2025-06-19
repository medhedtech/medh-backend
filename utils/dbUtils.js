import mongoose from 'mongoose';
import logger from './logger.js';

/**
 * Database utility functions with retry logic and timeout handling
 */
class DatabaseUtils {
  constructor() {
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second base delay
    this.maxDelay = 10000; // 10 seconds max delay
  }

  /**
   * Execute a database operation with retry logic
   * @param {Function} operation - The database operation to execute
   * @param {Object} options - Options for retry logic
   * @returns {Promise} - Result of the database operation
   */
  async executeWithRetry(operation, options = {}) {
    const {
      maxRetries = this.maxRetries,
      baseDelay = this.baseDelay,
      maxDelay = this.maxDelay,
      operationName = 'Database Operation'
    } = options;

    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check connection state before operation
        if (mongoose.connection.readyState !== 1) {
          throw new Error('Database connection not ready');
        }

        // Execute the operation with a timeout
        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise(30000, `${operationName} timed out`)
        ]);

        // Log successful operation after retry
        if (attempt > 1) {
          logger.info(`${operationName} succeeded on attempt ${attempt}`);
        }

        return result;
      } catch (error) {
        lastError = error;
        
        // Log the error
        logger.warn(`${operationName} failed on attempt ${attempt}`, {
          error: error.message,
          attempt,
          maxRetries,
          isTimeout: error.message.includes('timeout') || error.message.includes('timed out'),
          isConnectionError: error.message.includes('connection') || error.message.includes('ECONNRESET'),
          errorType: error.constructor.name
        });

        // Don't retry on certain types of errors
        if (this.isNonRetryableError(error)) {
          logger.error(`Non-retryable error encountered: ${error.message}`);
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          logger.error(`${operationName} failed after ${maxRetries} attempts`, {
            finalError: error.message,
            errorStack: error.stack
          });
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        
        logger.info(`Retrying ${operationName} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Create a timeout promise that rejects after the specified time
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} message - Error message for timeout
   * @returns {Promise} - Promise that rejects after timeout
   */
  createTimeoutPromise(timeoutMs, message) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(message));
      }, timeoutMs);
    });
  }

  /**
   * Check if an error should not be retried
   * @param {Error} error - The error to check
   * @returns {boolean} - True if error should not be retried
   */
  isNonRetryableError(error) {
    const nonRetryableErrors = [
      'ValidationError',
      'CastError',
      'DocumentNotFoundError',
      'OverwriteModelError',
      'ParallelSaveError',
      'StrictModeError',
      'VersionError'
    ];

    // Check by error constructor name
    if (nonRetryableErrors.includes(error.constructor.name)) {
      return true;
    }

    // Check by error message patterns
    const nonRetryablePatterns = [
      /duplicate key error/i,
      /validation failed/i,
      /cast to objectid failed/i,
      /path .* is required/i,
      /unique constraint/i
    ];

    return nonRetryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Sleep for the specified number of milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} - Promise that resolves after the delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Find one document with retry logic
   * @param {Model} model - Mongoose model
   * @param {Object} query - Query object
   * @param {Object} options - Query options
   * @returns {Promise} - Document or null
   */
  async findOne(model, query, options = {}) {
    return this.executeWithRetry(
      () => model.findOne(query, options.select, options),
      { operationName: `${model.modelName}.findOne` }
    );
  }

  /**
   * Find by ID with retry logic
   * @param {Model} model - Mongoose model
   * @param {string} id - Document ID
   * @param {Object} options - Query options
   * @returns {Promise} - Document or null
   */
  async findById(model, id, options = {}) {
    return this.executeWithRetry(
      () => model.findById(id, options.select, options),
      { operationName: `${model.modelName}.findById` }
    );
  }

  /**
   * Find documents with retry logic
   * @param {Model} model - Mongoose model
   * @param {Object} query - Query object
   * @param {Object} options - Query options
   * @returns {Promise} - Array of documents
   */
  async find(model, query, options = {}) {
    return this.executeWithRetry(
      () => model.find(query, options.select, options),
      { operationName: `${model.modelName}.find` }
    );
  }

  /**
   * Save document with retry logic
   * @param {Document} doc - Mongoose document
   * @returns {Promise} - Saved document
   */
  async save(doc) {
    return this.executeWithRetry(
      () => doc.save(),
      { operationName: `${doc.constructor.modelName}.save` }
    );
  }

  /**
   * Update document with retry logic
   * @param {Model} model - Mongoose model
   * @param {Object} query - Query object
   * @param {Object} update - Update object
   * @param {Object} options - Update options
   * @returns {Promise} - Update result
   */
  async updateOne(model, query, update, options = {}) {
    return this.executeWithRetry(
      () => model.updateOne(query, update, options),
      { operationName: `${model.modelName}.updateOne` }
    );
  }

  /**
   * Find one and update with retry logic
   * @param {Model} model - Mongoose model
   * @param {Object} query - Query object
   * @param {Object} update - Update object
   * @param {Object} options - Update options
   * @returns {Promise} - Updated document
   */
  async findOneAndUpdate(model, query, update, options = {}) {
    return this.executeWithRetry(
      () => model.findOneAndUpdate(query, update, options),
      { operationName: `${model.modelName}.findOneAndUpdate` }
    );
  }

  /**
   * Delete document with retry logic
   * @param {Model} model - Mongoose model
   * @param {Object} query - Query object
   * @returns {Promise} - Delete result
   */
  async deleteOne(model, query) {
    return this.executeWithRetry(
      () => model.deleteOne(query),
      { operationName: `${model.modelName}.deleteOne` }
    );
  }

  /**
   * Count documents with retry logic
   * @param {Model} model - Mongoose model
   * @param {Object} query - Query object
   * @returns {Promise} - Count
   */
  async countDocuments(model, query) {
    return this.executeWithRetry(
      () => model.countDocuments(query),
      { operationName: `${model.modelName}.countDocuments` }
    );
  }

  /**
   * Aggregate with retry logic
   * @param {Model} model - Mongoose model
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Promise} - Aggregation result
   */
  async aggregate(model, pipeline) {
    return this.executeWithRetry(
      () => model.aggregate(pipeline),
      { operationName: `${model.modelName}.aggregate` }
    );
  }

  /**
   * Check database connection health
   * @returns {Promise<Object>} - Connection health status
   */
  async checkConnectionHealth() {
    try {
      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      const isHealthy = state === 1;
      
      if (isHealthy) {
        // Try a simple ping operation
        await mongoose.connection.db.admin().ping();
      }

      return {
        healthy: isHealthy,
        state: states[state] || 'unknown',
        stateCode: state,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
const dbUtils = new DatabaseUtils();
export default dbUtils; 