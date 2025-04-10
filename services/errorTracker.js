import logger from '../utils/logger.js';

class ErrorTracker {
  constructor() {
    this.errors = new Map();
    this.errorCounts = new Map();
  }

  track(error, context = {}) {
    const errorKey = this.getErrorKey(error);
    const timestamp = new Date();

    // Update error counts
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);

    // Store error details
    if (!this.errors.has(errorKey)) {
      this.errors.set(errorKey, {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        firstOccurrence: timestamp,
        lastOccurrence: timestamp,
        occurrences: [],
        contexts: new Set()
      });
    }

    const errorEntry = this.errors.get(errorKey);
    errorEntry.lastOccurrence = timestamp;
    errorEntry.contexts.add(JSON.stringify(context));

    // Keep last 10 occurrences with context
    errorEntry.occurrences.unshift({
      timestamp,
      context
    });
    if (errorEntry.occurrences.length > 10) {
      errorEntry.occurrences.pop();
    }

    // Log the error
    logger.error('Error Tracked', {
      errorKey,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context,
      occurrenceCount: this.errorCounts.get(errorKey)
    });

    // Alert if error frequency is high
    this.checkErrorFrequency(errorKey);
  }

  getErrorKey(error) {
    // Create a unique key based on error properties
    return `${error.name}:${error.message}:${error.code || 'no_code'}`;
  }

  checkErrorFrequency(errorKey) {
    const count = this.errorCounts.get(errorKey);
    const errorEntry = this.errors.get(errorKey);
    const timeWindow = 5 * 60 * 1000; // 5 minutes

    // Alert if more than 10 occurrences in 5 minutes
    if (count > 10 && 
        (Date.now() - errorEntry.firstOccurrence.getTime()) <= timeWindow) {
      logger.warn('High Error Frequency Detected', {
        errorKey,
        count,
        timeWindow: '5 minutes',
        error: {
          name: errorEntry.name,
          message: errorEntry.message,
          code: errorEntry.code
        }
      });
    }
  }

  getErrorSummary() {
    const summary = [];
    this.errors.forEach((error, key) => {
      summary.push({
        key,
        name: error.name,
        message: error.message,
        code: error.code,
        count: this.errorCounts.get(key),
        firstOccurrence: error.firstOccurrence,
        lastOccurrence: error.lastOccurrence,
        uniqueContexts: error.contexts.size,
        recentOccurrences: error.occurrences
      });
    });

    return summary.sort((a, b) => b.count - a.count);
  }

  getErrorStats() {
    const now = Date.now();
    const stats = {
      total: 0,
      last24Hours: 0,
      lastHour: 0,
      byType: {},
      byCode: {}
    };

    this.errors.forEach((error, key) => {
      const count = this.errorCounts.get(key);
      stats.total += count;

      // Count by error type
      stats.byType[error.name] = (stats.byType[error.name] || 0) + count;

      // Count by error code
      if (error.code) {
        stats.byCode[error.code] = (stats.byCode[error.code] || 0) + count;
      }

      // Count recent errors
      error.occurrences.forEach(occurrence => {
        const timeDiff = now - occurrence.timestamp.getTime();
        if (timeDiff <= 24 * 60 * 60 * 1000) { // 24 hours
          stats.last24Hours++;
        }
        if (timeDiff <= 60 * 60 * 1000) { // 1 hour
          stats.lastHour++;
        }
      });
    });

    return stats;
  }

  clearOldErrors() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    
    this.errors.forEach((error, key) => {
      if (error.lastOccurrence < cutoff) {
        this.errors.delete(key);
        this.errorCounts.delete(key);
      }
    });
  }
}

// Create singleton instance
const errorTracker = new ErrorTracker();

// Clean up old errors every day
setInterval(() => {
  errorTracker.clearOldErrors();
}, 24 * 60 * 60 * 1000);

export default errorTracker; 