import logger from './logger.js';
import { ENV_VARS } from '../config/envVars.js';

// Simple tracing utility without OpenTelemetry to avoid dependency conflicts
// This maintains the same interface but provides minimal/no-op implementation

// Initialize tracing (no-op version)
const initTracing = () => {
  try {
    // Log that tracing is disabled/simplified
    if (ENV_VARS.NODE_ENV === 'development') {
      logger.info('Simplified tracing initialized (OpenTelemetry disabled to resolve dependency conflicts)');
    }
    
    // Handle shutdown gracefully (no-op)
    const shutdownTracing = async () => {
      if (ENV_VARS.NODE_ENV === 'development') {
        logger.info('Tracing shutdown completed');
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', shutdownTracing);
    process.on('SIGINT', shutdownTracing);
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize tracing', { 
      error: error.message,
      stack: error.stack 
    });
    return false;
  }
};

// Manual span creation utility (simplified version)
const createCustomSpan = (tracer, name, fn, attributes = {}) => {
  // No-op implementation that just runs the function
  // In a real tracing setup, this would create spans and track timing
  return Promise.resolve().then(async () => {
    try {
      if (ENV_VARS.NODE_ENV === 'development') {
        const startTime = Date.now();
        const result = await fn();
        const duration = Date.now() - startTime;
        
        // Simple logging instead of tracing
        logger.debug('Span completed', {
          name,
          duration: `${duration}ms`,
          attributes
        });
        
        return result;
      } else {
        // In production, just run the function without extra logging
        return await fn();
      }
    } catch (error) {
      // Log error but don't interfere with normal error handling
      logger.error('Span error', {
        name,
        error: error.message,
        attributes
      });
      throw error;
    }
  });
};

// Export compatibility functions
export {
  initTracing,
  createCustomSpan
}; 