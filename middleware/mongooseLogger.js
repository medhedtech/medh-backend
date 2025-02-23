const mongoose = require('mongoose');
const logger = require('../utils/logger');

const mongooseLogger = () => {
  // Log all MongoDB operations
  mongoose.set('debug', (collectionName, method, query, doc) => {
    const startTime = Date.now();
    
    // Create a callback that will be called after the operation
    const logOperation = () => {
      const duration = Date.now() - startTime;
      
      logger.logDatabase(method, collectionName, duration, {
        query: JSON.stringify(query),
        document: doc ? JSON.stringify(doc) : undefined
      });

      // Log slow queries (over 100ms)
      if (duration > 100) {
        logger.logPerformance('Slow Database Query', duration, {
          operation: method,
          collection: collectionName,
          query: JSON.stringify(query)
        });
      }
    };

    // Call the callback after the operation
    process.nextTick(logOperation);
  });

  // Log connection events
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', {
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      }
    });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully');
  });
};

// Add middleware to log query execution times
const queryLogger = (schema) => {
  ['find', 'findOne', 'update', 'updateOne', 'updateMany', 'delete', 'deleteOne', 'deleteMany'].forEach((method) => {
    schema.pre(method, function() {
      this._startTime = Date.now();
    });

    schema.post(method, function(doc) {
      const duration = Date.now() - this._startTime;
      
      logger.logDatabase(method, this.model.collection.name, duration, {
        query: JSON.stringify(this.getQuery()),
        document: doc ? JSON.stringify(doc) : undefined
      });

      if (duration > 100) {
        logger.logPerformance('Slow Database Operation', duration, {
          operation: method,
          collection: this.model.collection.name,
          query: JSON.stringify(this.getQuery())
        });
      }
    });
  });
};

module.exports = {
  mongooseLogger,
  queryLogger
}; 