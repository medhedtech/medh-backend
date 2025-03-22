const winston = require('winston');
const path = require('path');
const fs = require('fs');
// Add DailyRotateFile transport
require('winston-daily-rotate-file');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Custom log format with proper timestamp formatting
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label']
  }),
  winston.format.json()
);

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: {
    service: 'medh-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // File transport for all logs using daily rotation
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: logFormat,
      maxSize: '10m',
      maxFiles: '14d',
      level: 'info'
    }),

    // Separate file for error logs using daily rotation
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: logFormat,
      maxSize: '10m',
      maxFiles: '14d',
      level: 'error'
    }),

    // Separate file for UI activity logs
    new winston.transports.File({
      filename: path.join(logsDir, 'ui-activity.log'),
      format: logFormat,
      maxsize: 10000000, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Add console transport in development mode
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, metadata }) => {
        const meta = metadata ? JSON.stringify(metadata) : '';
        return `${timestamp} ${level}: ${message} ${meta !== '{}' ? meta : ''}`;
      })
    )
  }));
}

// Add request context middleware
logger.addRequestContext = (req) => {
  return {
    requestId: req.requestId,
    sessionId: req.sessionID,
    userId: req.user ? req.user._id : null,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };
};

// Custom logging methods for UI activities
logger.uiActivity = (type, data) => {
  logger.info(type, {
    ...data,
    activityType: type,
    category: 'UI_ACTIVITY'
  });
};

logger.uiError = (error, context = {}) => {
  logger.error('UI Error', {
    error: {
      message: error.message,
      stack: error.stack,
      ...error
    },
    ...context,
    category: 'UI_ERROR'
  });
};

logger.performance = (metric, value, context = {}) => {
  logger.info('Performance Metric', {
    metric,
    value,
    ...context,
    category: 'PERFORMANCE'
  });
};

// Add custom log levels for UI tracking
logger.levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
  ui: 7
};

// Add request tracking helper
logger.trackRequest = (req, res, duration) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    duration,
    ...logger.addRequestContext(req)
  };

  if (res.statusCode >= 500) {
    logger.error('Request Failed', logData);
  } else if (res.statusCode >= 400) {
    logger.warn('Request Error', logData);
  } else {
    logger.info('Request Completed', logData);
  }
};

// Add session tracking helper
logger.trackSession = (action, sessionData) => {
  logger.info(`Session ${action}`, {
    ...sessionData,
    category: 'SESSION',
    action
  });
};

// Production error handling
if (process.env.NODE_ENV === 'production') {
  // Add any production-specific error reporting services here
  // For example, Sentry, LogRocket, etc.
}

// Export the logger instance
module.exports = logger; 