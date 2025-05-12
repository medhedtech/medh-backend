import CircuitBreaker from 'opossum';
import logger from './logger.js';

// Default circuit breaker configuration
const DEFAULT_OPTIONS = {
  timeout: 30000, // Time in ms before a request is considered failed
  errorThresholdPercentage: 50, // Error % at which to open circuit
  resetTimeout: 30000, // Time in ms to wait before testing circuit again
  volumeThreshold: 10, // Minimum number of requests before tripping
  rollingCountTimeout: 60000, // Time window for counting failures in ms
  rollingCountBuckets: 10, // Number of buckets for rolling count
  name: 'default', // Default name for the circuit
};

/**
 * Circuit breaker factory for wrapping any function with circuit breaker pattern
 * @param {Function} fn - The function to wrap with a circuit breaker
 * @param {Object} options - Circuit breaker configuration options
 * @returns {CircuitBreaker} A circuit breaker instance
 */
const createCircuitBreaker = (fn, options = {}) => {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  const circuit = new CircuitBreaker(fn, finalOptions);

  // Add event listeners for circuit state changes
  circuit.on('open', () => {
    logger.warn(`Circuit ${finalOptions.name} is open`, {
      circuit: finalOptions.name,
      state: 'open',
    });
  });

  circuit.on('halfOpen', () => {
    logger.info(`Circuit ${finalOptions.name} is half-open`, {
      circuit: finalOptions.name,
      state: 'halfOpen',
    });
  });

  circuit.on('close', () => {
    logger.info(`Circuit ${finalOptions.name} is closed`, {
      circuit: finalOptions.name,
      state: 'closed',
    });
  });

  circuit.on('fallback', (result) => {
    logger.info(`Circuit ${finalOptions.name} executed fallback`, {
      circuit: finalOptions.name,
      state: circuit.status.state,
    });
  });

  circuit.on('timeout', (err) => {
    logger.warn(`Circuit ${finalOptions.name} timeout`, {
      circuit: finalOptions.name,
      error: err.message,
      timeout: finalOptions.timeout,
    });
  });

  circuit.on('reject', () => {
    logger.warn(`Circuit ${finalOptions.name} rejected request`, {
      circuit: finalOptions.name,
      state: circuit.status.state,
    });
  });

  circuit.on('success', () => {
    // Only log periodically to avoid excessive logging
    if (circuit.stats.successes % 100 === 0) {
      logger.debug(`Circuit ${finalOptions.name} successful request`, {
        circuit: finalOptions.name,
        stats: circuit.stats,
      });
    }
  });

  circuit.on('failure', (err) => {
    logger.warn(`Circuit ${finalOptions.name} failed request`, {
      circuit: finalOptions.name,
      error: err.message,
    });
  });

  return circuit;
};

/**
 * Creates circuit breakers for common external services with appropriate defaults
 */
const createServiceCircuitBreakers = () => {
  // Define service-specific circuit breaker options
  const services = {
    // External payment processing
    payment: {
      timeout: 15000, // Payment gateways should respond quickly
      errorThresholdPercentage: 30, // Lower threshold for critical services
      resetTimeout: 60000, // Longer timeout before retrying critical service
    },
    
    // Email sending
    email: {
      timeout: 10000,
      errorThresholdPercentage: 40,
      resetTimeout: 30000,
    },
    
    // External file storage (e.g., S3)
    storage: {
      timeout: 20000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    },
    
    // Video streaming services
    video: {
      timeout: 30000,
      errorThresholdPercentage: 40,
      resetTimeout: 45000,
    },
    
    // SMS services
    sms: {
      timeout: 5000,
      errorThresholdPercentage: 40,
      resetTimeout: 30000,
    },
    
    // External API calls
    api: {
      timeout: 8000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    }
  };
  
  // Initialize each service's circuit breaker with a placeholder function
  // (will be replaced with actual service functions when used)
  const circuitBreakers = {};
  
  for (const [service, options] of Object.entries(services)) {
    // Create a placeholder - this will be replaced with actual service functions
    circuitBreakers[service] = (fn) => createCircuitBreaker(fn, {
      ...options,
      name: service
    });
  }
  
  return circuitBreakers;
};

// Singleton instance of service circuit breakers
const serviceCircuitBreakers = createServiceCircuitBreakers();

export {
  createCircuitBreaker,
  serviceCircuitBreakers
}; 