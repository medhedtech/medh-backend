import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { format } from 'winston';
import util from 'util';

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Custom log format with proper timestamp formatting
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label']
  }),
  format.json()
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
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: logFormat,
      maxsize: 10000000, // 10MB
      maxFiles: 5
    }),

    // Separate file for error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      format: logFormat,
      level: 'error',
      maxsize: 10000000, // 10MB
      maxFiles: 5
    }),

    // Separate file for UI activity logs
    new winston.transports.File({
      filename: path.join(logsDir, 'ui-activity.log'),
      format: logFormat,
      maxsize: 10000000, // 10MB
      maxFiles: 5
    })
  ]
});

// Try to add daily rotate file if the dependency exists
try {
  // Add DailyRotateFile transport conditionally
  const { default: DailyRotateFile } = await import('winston-daily-rotate-file');
  
  // Add daily rotate file transports if successfully imported
  logger.add(new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: logFormat,
    maxSize: '10m',
    maxFiles: '14d',
    level: 'info'
  }));

  logger.add(new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: logFormat,
    maxSize: '10m',
    maxFiles: '14d',
    level: 'error'
  }));
  
  logger.info('Winston daily rotate file transport enabled');
} catch (err) {
  logger.error('Failed to initialize winston-daily-rotate-file, falling back to standard file transport', err);
}

// Add console transport in development mode
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: format.combine(
      format.colorize(),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      format.printf(({ level, message, timestamp, metadata }) => {
        let metaString = '';
        const filteredMeta = { ...metadata };
        delete filteredMeta.service;
        delete filteredMeta.environment;
        
        if (filteredMeta && Object.keys(filteredMeta).length > 0) {
          metaString = util.inspect(filteredMeta, { colors: true, depth: null });
        }
        return `${timestamp} ${level}: ${message}${metaString ? ' \n' + metaString : ''}`;
      })
    )
  }));
} else {
  // Add console transport with minimal output in production
  logger.add(new winston.transports.Console({
    format: format.combine(
      format.colorize(),
      format.printf(({ level, message }) => {
        return `${level}: ${message}`;
      })
    ),
    level: 'error' // Only log errors to console in production
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

// Export the logger instance
export default logger; 