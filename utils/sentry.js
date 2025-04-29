import * as Sentry from '@sentry/node';
import { ENV_VARS } from '../config/envVars.js';
import logger from './logger.js';

/**
 * Initialize Sentry for error tracking
 */
export const initSentry = () => {
  if (ENV_VARS.SENTRY_DSN) {
    Sentry.init({
      dsn: ENV_VARS.SENTRY_DSN,
      environment: ENV_VARS.SENTRY_ENVIRONMENT,
      
      // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
      // We recommend adjusting this value in production
      tracesSampleRate: ENV_VARS.SENTRY_TRACES_SAMPLE_RATE,
      
      // Enable Sentry debug mode in development
      debug: ENV_VARS.NODE_ENV === 'development',
      
      // Set the maximum breadcrumbs to capture
      maxBreadcrumbs: 50,
      
      // Ensure to not collect personal identifiable information
      beforeSend(event) {
        // Only sensitive data sanitization in production
        if (ENV_VARS.NODE_ENV === 'production') {
          // Sanitize user email and personal data
          if (event.user && event.user.email) {
            // Hash the email to maintain analytics without storing PII
            event.user.email = hashPII(event.user.email);
          }
          
          // Sanitize IP addresses
          if (event.request && event.request.headers) {
            const headers = event.request.headers;
            if (headers['x-forwarded-for']) {
              headers['x-forwarded-for'] = 'REDACTED';
            }
          }
          
          // Sanitize query parameters
          if (event.request && event.request.query_string) {
            // Check if there are sensitive parameters to redact
            const sensitiveParams = ['token', 'password', 'secret', 'auth'];
            let queryString = event.request.query_string;
            sensitiveParams.forEach(param => {
              const regex = new RegExp(`${param}=([^&]*)`, 'g');
              queryString = queryString.replace(regex, `${param}=REDACTED`);
            });
            event.request.query_string = queryString;
          }
        }
        
        return event;
      },
      
      // Configure Sentry based on environment
      integrations: [
        // Enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express tracing in production only to avoid overhead in development
        ENV_VARS.NODE_ENV === 'production' ? new Sentry.Integrations.Express() : null,
      ].filter(Boolean),
    });
    
    logger.info('Sentry initialized for error tracking', {
      environment: ENV_VARS.SENTRY_ENVIRONMENT
    });
  } else {
    logger.warn('Sentry DSN not provided, error tracking disabled');
  }
};

/**
 * Hash sensitive PII data
 * @param {string} data - Data to hash
 * @returns {string} Hashed data
 */
function hashPII(data) {
  // Create a SHA-256 hash of the data to avoid storing PII
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Sentry middleware to track Express request handlers
 * @param {Object} app - Express app instance
 */
export const setupSentryRequestHandler = (app) => {
  if (ENV_VARS.SENTRY_DSN) {
    // The request handler must be the first middleware on the app
    app.use(Sentry.Handlers.requestHandler({
      // By including user IP as part of the request data, issues can be tracked 
      // across different users. This helps with debugging geographic-specific issues.
      // In production, IP addresses should be anonymized.
      ip: true,
      // Extract user information from the request
      user: ['id', 'username', 'role'],
      // Add request data to transaction
      request: true,
    }));
    
    // TracingHandler creates a trace for every incoming request
    if (ENV_VARS.NODE_ENV === 'production') {
      app.use(Sentry.Handlers.tracingHandler());
    }
  }
};

/**
 * Sentry middleware to handle errors
 * @param {Object} app - Express app instance
 */
export const setupSentryErrorHandler = (app) => {
  if (ENV_VARS.SENTRY_DSN) {
    // The error handler must be before any other error middleware and after all controllers
    app.use(Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Only report 500-level errors to Sentry
        return error.status === undefined || error.status >= 500;
      },
    }));
  }
};

/**
 * Capture an exception in Sentry
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
export const captureException = (error, context = {}) => {
  if (ENV_VARS.SENTRY_DSN) {
    Sentry.withScope(scope => {
      // Add any context tags
      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      
      // Add additional context data
      if (context.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      
      // Set user context if available
      if (context.user) {
        scope.setUser(context.user);
      }
      
      // Capture the exception
      Sentry.captureException(error);
    });
  }
  
  // Also log the error locally
  logger.error('Error captured by Sentry', {
    error: error.message,
    stack: error.stack,
    ...context
  });
};

export default {
  initSentry,
  setupSentryRequestHandler,
  setupSentryErrorHandler,
  captureException
}; 