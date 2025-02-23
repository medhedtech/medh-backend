const logger = require('../utils/logger');
const { performance } = require('perf_hooks');

class APIMetrics {
  constructor() {
    this.metrics = new Map();
  }

  recordMetric(endpoint, method, duration, statusCode) {
    const key = `${method}:${endpoint}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        totalDuration: 0,
        errors: 0,
        lastAccessed: null,
        statusCodes: new Map()
      });
    }

    const metric = this.metrics.get(key);
    metric.count++;
    metric.totalDuration += duration;
    metric.lastAccessed = new Date();
    
    const statusCodeCount = metric.statusCodes.get(statusCode) || 0;
    metric.statusCodes.set(statusCode, statusCodeCount + 1);

    if (statusCode >= 400) {
      metric.errors++;
    }
  }

  getMetrics() {
    const result = [];
    this.metrics.forEach((value, key) => {
      const [method, endpoint] = key.split(':');
      result.push({
        endpoint,
        method,
        totalCalls: value.count,
        averageDuration: value.totalDuration / value.count,
        errorRate: (value.errors / value.count) * 100,
        lastAccessed: value.lastAccessed,
        statusCodeDistribution: Object.fromEntries(value.statusCodes)
      });
    });
    return result;
  }
}

const apiMetrics = new APIMetrics();

const apiMonitor = (req, res, next) => {
  // Add request ID and timestamp
  req.id = require('crypto').randomUUID();
  req.timestamp = new Date();
  req.startTime = performance.now();

  // Normalize the endpoint path (replace IDs with placeholders)
  req.normalizedPath = req.path.replace(/\/[0-9a-fA-F]{24}\b/g, '/:id');

  // Log the incoming request
  logger.info('API Request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    normalizedPath: req.normalizedPath,
    query: req.query,
    body: sanitizeRequestBody(req.body),
    headers: sanitizeHeaders(req.headers),
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: req.timestamp
  });

  // Override res.json to capture response
  const originalJson = res.json;
  res.json = function(body) {
    const duration = performance.now() - req.startTime;
    const responseBody = sanitizeResponseBody(body);

    // Record metrics
    apiMetrics.recordMetric(
      req.normalizedPath,
      req.method,
      duration,
      res.statusCode
    );

    // Log the response
    logger.info('API Response', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      normalizedPath: req.normalizedPath,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      responseSize: JSON.stringify(responseBody).length,
      timestamp: new Date()
    });

    // Log slow responses
    if (duration > 1000) {
      logger.warn('Slow API Response', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date()
      });
    }

    return originalJson.call(this, body);
  };

  // Handle errors
  const errorHandler = (error) => {
    logger.error('API Error', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      normalizedPath: req.normalizedPath,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      timestamp: new Date()
    });
  };

  res.on('error', errorHandler);

  // Monitor response finish
  res.on('finish', () => {
    const duration = performance.now() - req.startTime;

    // Log non-200 responses
    if (res.statusCode >= 400) {
      logger.warn('Non-200 Response', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date()
      });
    }
  });

  next();
};

// Utility functions to sanitize sensitive data
const sanitizeRequestBody = (body) => {
  if (!body) return body;
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

const sanitizeResponseBody = (body) => {
  if (!body) return body;
  const sanitized = { ...body };
  const sensitiveFields = ['token', 'secret', 'apiKey'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

const sanitizeHeaders = (headers) => {
  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

// API Metrics endpoint
const getAPIMetrics = (req, res) => {
  res.json({
    timestamp: new Date(),
    metrics: apiMetrics.getMetrics()
  });
};

module.exports = {
  apiMonitor,
  getAPIMetrics
}; 