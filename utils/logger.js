import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import util from "util";

import chalk from "chalk";
import { format } from "winston";
import winston from "winston";
import "winston-daily-rotate-file";

// Try to import additional industry standard logging tools
let Sentry;
try {
  Sentry = await import("@sentry/node");
} catch (err) {
  // Sentry not available, will not be used
}

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define custom log levels with colors
const customLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    http: 4,
    verbose: 5,
    debug: 6,
    trace: 7,
  },
  colors: {
    fatal: "bgRed white bold",
    error: "red bold",
    warn: "yellow bold",
    info: "green",
    http: "magenta",
    verbose: "cyan",
    debug: "blue",
    trace: "gray",
  },
};

// Add colors to winston
winston.addColors(customLevels.colors);

// Define padding lengths for consistent spacing
const LEVEL_PADDING = 9;
const TIMESTAMP_PADDING = 26;
const COMPONENT_WIDTH = 20;

// Create pretty console formatter
const prettyPrint = format((info) => {
  // Modern custom icons for log levels using emoji and symbols
  const icons = {
    fatal: "💀 ",
    error: "❌ ",
    warn: "⚠️ ",
    info: "📌 ",
    http: "🌐 ",
    verbose: "🔊 ",
    debug: "🐞 ",
    trace: "🔍 ",
  };

  // Add icon to level
  info.levelIcon = icons[info.level] || "";

  // Add request ID if available
  const requestId = info.metadata?.requestId || "";
  const requestIdStr = requestId ? chalk.dim(`[${requestId}] `) : "";

  // Extract component name if available or use default
  const component =
    info.metadata?.component || info.metadata?.category || "system";
  info.component = component;

  // Format the message
  info.formattedMessage = `${requestIdStr}${info.message}`;

  return info;
});

// Format for structured JSON logging (files)
const structuredLogFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  format.errors({ stack: true }),
  format.metadata({
    fillExcept: ["message", "level", "timestamp", "label"],
  }),
  format.json(),
);

// Add a configuration object to control logger display options
const loggerConfig = {
  showMetadata: false, // Set to false to hide metadata in console output
  compactMode: true, // Use more compact format for console output
  colorful: true, // Use colorful output
};

// Format for console output (pretty, colorized)
const consoleLogFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  format.errors({ stack: true }),
  format.metadata({
    fillExcept: [
      "message",
      "level",
      "timestamp",
      "label",
      "levelIcon",
      "formattedMessage",
      "component",
    ],
  }),
  prettyPrint(),
  format.colorize({ all: true }),
  format.printf(
    ({
      level,
      timestamp,
      levelIcon,
      formattedMessage,
      component,
      metadata,
    }) => {
      // Modern box drawing characters
      const box = {
        topLeft: "╭",
        topRight: "╮",
        bottomLeft: "╰",
        bottomRight: "╯",
        horizontal: "─",
        vertical: "│",
        verticalRight: "├",
        horizontalDown: "┬",
        horizontalUp: "┴",
        verticalLeft: "┤",
      };

      // Pad level for consistent alignment
      const paddedLevel = level.padEnd(LEVEL_PADDING);

      // Format timestamp with modern styling
      const timestampStr = chalk.gray(`[${timestamp}]`);

      // Format component with colorized box
      let componentStr = "";
      if (component) {
        const upperComponent = component.toUpperCase();
        const componentColor = getComponentColor(upperComponent);
        componentStr = chalk[componentColor].bold(`[${upperComponent}]`);
      }

      // Base log line with consistent formatting and more vibrant colors
      let logLine = `${timestampStr} ${levelIcon}${paddedLevel} ${componentStr}    ${formattedMessage}`;

      // Add metadata if present with modern box drawing (only if enabled)
      if (
        loggerConfig.showMetadata &&
        metadata &&
        Object.keys(metadata).length > 0
      ) {
        // Filter out some common keys
        const filteredMeta = { ...metadata };
        delete filteredMeta.service;
        delete filteredMeta.environment;
        delete filteredMeta.component;
        delete filteredMeta.category;

        if (Object.keys(filteredMeta).length > 0) {
          // Format metadata as indented JSON with colors
          const metaStr = util.inspect(filteredMeta, {
            colors: true,
            depth: 5,
            breakLength: 80,
            compact: false,
          });

          // Add indented metadata with nice box drawing for better separation
          if (metaStr.includes("\n")) {
            // For multiline metadata, add a modern box
            const boxWidth = 80;
            const title = " metadata ";
            const titlePadding = Math.floor((boxWidth - title.length) / 2);

            // Top border with title
            logLine +=
              "\n" +
              chalk.cyan(
                box.topLeft +
                  box.horizontal.repeat(titlePadding) +
                  title +
                  box.horizontal.repeat(
                    boxWidth - titlePadding - title.length,
                  ) +
                  box.topRight,
              );

            // Content with left border
            logLine +=
              "\n" +
              metaStr
                .split("\n")
                .map((line) => chalk.cyan(box.vertical) + " " + line)
                .join("\n");

            // Bottom border
            logLine +=
              "\n" +
              chalk.cyan(
                box.bottomLeft +
                  box.horizontal.repeat(boxWidth) +
                  box.bottomRight,
              );
          } else {
            // For single line metadata, add it with an arrow
            logLine += chalk.cyan(" ❯ ") + metaStr;
          }
        }
      }

      return logLine;
    },
  ),
);

// Helper function to get component color based on component name
function getComponentColor(component) {
  const componentColors = {
    API: "blue",
    AUTH: "yellow",
    DATABASE: "magenta",
    EMAIL: "cyan",
    REDIS: "red",
    SYSTEM: "green",
    STARTUP: "blueBright",
    SECURITY: "redBright",
  };

  return componentColors[component] || "white";
}

// Create the logger instance
const logger = winston.createLogger({
  levels: customLevels.levels,
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug"),
  defaultMeta: {
    service: "medh-backend",
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "unknown",
    hostname: os.hostname(),
  },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: structuredLogFormat,
      maxsize: 10000000, // 10MB
      maxFiles: 5,
    }),

    // Separate file for error logs
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      format: structuredLogFormat,
      level: "error",
      maxsize: 10000000, // 10MB
      maxFiles: 5,
    }),

    // Daily rotate file for all logs
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      format: structuredLogFormat,
      maxSize: "20m",
      maxFiles: "14d",
    }),

    // Daily rotate file for error logs
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      format: structuredLogFormat,
      maxSize: "20m",
      maxFiles: "30d",
      level: "error",
    }),
  ],
  // Log rejected promises and other uncaught exceptions
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "rejections.log"),
      format: structuredLogFormat,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "exceptions.log"),
      format: structuredLogFormat,
    }),
  ],
});

// Add console transport based on environment
if (process.env.NODE_ENV !== "production") {
  // Development console transport - full detail with colors
  logger.add(
    new winston.transports.Console({
      format: consoleLogFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
  );
} else {
  // Production console transport - logs warnings and errors only
  logger.add(
    new winston.transports.Console({
      format: consoleLogFormat,
      level: "warn", // Only log warnings and errors to console in production
      handleExceptions: true,
      handleRejections: true,
    }),
  );

  // Sentry integration temporarily disabled to prevent crashes
  logger.info("Sentry integration disabled to prevent logger crashes");
}

// Enhanced request context middleware
logger.addRequestContext = (req) => {
  return {
    requestId: req.requestId || req.headers["x-request-id"],
    sessionId: req.sessionID,
    userId: req.user ? req.user._id : null,
    ip:
      req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress,
    userAgent: req.get("user-agent"),
    referer: req.get("referer"),
    route: req.route ? req.route.path : null,
    method: req.method,
    url: req.originalUrl || req.url,
  };
};

// Enhanced UI activity logging
logger.uiActivity = (type, data = {}) => {
  logger.info(`UI Activity: ${type}`, {
    ...data,
    activityType: type,
    category: "UI_ACTIVITY",
    timestamp: new Date().toISOString(),
  });
};

// Enhanced error logging
logger.uiError = (error, context = {}) => {
  const errorObj =
    error instanceof Error
      ? {
          message: error.message,
          name: error.name,
          stack: error.stack,
        }
      : error;

  logger.error(`UI Error: ${errorObj.message || "Unknown error"}`, {
    error: errorObj,
    ...context,
    category: "UI_ERROR",
    timestamp: new Date().toISOString(),
  });

  // If Sentry is available, send the error
  // Sentry error reporting disabled to prevent crashes
};

// Enhanced performance tracking
logger.performance = (metric, value, context = {}) => {
  logger.info(`Performance: ${metric}`, {
    metric,
    value,
    ...context,
    category: "PERFORMANCE",
    timestamp: new Date().toISOString(),
  });
};

// Enhanced request tracking
logger.trackRequest = (req, res, duration) => {
  // Add response time header
  res.set("X-Response-Time", `${duration}ms`);

  // Use our new enhanced API response logging
  logger.api.response(req, res, duration, {
    ...logger.addRequestContext(req),
    contentLength: res.get("content-length"),
    contentType: res.get("content-type"),
  });
};

// Enhanced database logging
logger.logDatabase = (operation, collection, duration, details = {}) => {
  logger.db.verbose(`${operation} on ${collection} (${duration}ms)`, {
    operation,
    collection,
    duration: `${duration}ms`,
    ...details,
  });
};

// Enhanced HTTP API logging
logger.logAPIRequest = (req, details = {}) => {
  logger.api.request(req, details);
};

logger.logAPIResponse = (req, res, duration, details = {}) => {
  logger.api.response(req, res, duration, details);
};

// Add error logging method
logger.logError = (error, context = {}) => {
  const errorObj =
    error instanceof Error
      ? {
          message: error.message,
          name: error.name,
          stack: error.stack,
        }
      : error;

  logger.error(`Error: ${errorObj.message || "Unknown error"}`, {
    error: errorObj,
    ...context,
    timestamp: new Date().toISOString(),
  });

  // If Sentry is available, send the error
  // Sentry error reporting disabled to prevent crashes
};

// Add system and security logging
logger.logSecurity = (event, details = {}) => {
  logger.warn(`Security: ${event}`, {
    event,
    ...details,
    category: "SECURITY",
    timestamp: new Date().toISOString(),
  });
};

logger.logSystem = (event, details = {}) => {
  logger.info(`System: ${event}`, {
    event,
    ...details,
    category: "SYSTEM",
    timestamp: new Date().toISOString(),
  });
};

// Add methods for fatal log level
logger.fatal = (message, meta = {}) => {
  logger.log("fatal", message, meta);

  // Always sent to Sentry regardless of environment
  if (Sentry && process.env.SENTRY_DSN && process.env.SENTRY_DSN.startsWith('https://')) {
    // Sentry.captureMessage disabled to prevent crashes
  }
};

// Add convenience method for application startup
logger.startup = () => {
  const memoryUsage = process.memoryUsage();
  logger.info(`Application started`, {
    component: "STARTUP",
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    memoryUsage: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
    },
    environment: process.env.NODE_ENV,
  });

  // Print modern server banner in development mode
  if (process.env.NODE_ENV !== "production") {
    const version = process.env.npm_package_version || "1.0.0";
    const env = process.env.NODE_ENV || "development";

    console.log("\n");
    console.log(
      chalk.blueBright.bold(
        "    __  ___________________    ___    ____  ____ ",
      ),
    );
    console.log(
      chalk.blueBright.bold(
        "   /  |/  / ____/ ____/ __ \\  /   |  / __ \\/  _/ ",
      ),
    );
    console.log(
      chalk.cyanBright.bold(
        "  / /|_/ / __/ / /   / / / / / /| | / /_/ // /   ",
      ),
    );
    console.log(
      chalk.cyanBright.bold(
        " / /  / / /___/ /___/ /_/ / / ___ |/ ____// /    ",
      ),
    );
    console.log(
      chalk.greenBright.bold(
        "/_/  /_/_____/\\____/_____/ /_/  |_/_/   /___/    ",
      ),
    );
    console.log("\n");

    // Info box
    const box = {
      topLeft: "╭",
      topRight: "╮",
      bottomLeft: "╰",
      bottomRight: "╯",
      horizontal: "─",
      vertical: "│",
    };

    const boxWidth = 60;
    console.log(
      chalk.cyan(box.topLeft + box.horizontal.repeat(boxWidth) + box.topRight),
    );

    console.log(
      chalk.cyan(box.vertical) +
        chalk.white.bold(
          " MEDH API Server                                          ",
        ) +
        chalk.cyan(box.vertical),
    );
    console.log(
      chalk.cyan(box.vertical) +
        chalk.white(` Version: ${version.padEnd(boxWidth - 11)}`) +
        chalk.cyan(box.vertical),
    );
    console.log(
      chalk.cyan(box.vertical) +
        chalk.white(` Environment: ${env.padEnd(boxWidth - 15)}`) +
        chalk.cyan(box.vertical),
    );
    console.log(
      chalk.cyan(box.vertical) +
        chalk.white(` Node: ${process.version.padEnd(boxWidth - 8)}`) +
        chalk.cyan(box.vertical),
    );
    console.log(
      chalk.cyan(box.vertical) +
        chalk.white(
          ` Date: ${new Date().toLocaleString().padEnd(boxWidth - 8)}`,
        ) +
        chalk.cyan(box.vertical),
    );

    console.log(
      chalk.cyan(
        box.bottomLeft + box.horizontal.repeat(boxWidth) + box.bottomRight,
      ),
    );
    console.log("\n");
  }
};

// Export a function to normalize logs for external services
logger.normalizeLog = (logObject) => {
  const { level, message, timestamp, ...rest } = logObject;
  return {
    level,
    message,
    timestamp: timestamp || new Date().toISOString(),
    ...rest,
  };
};

// Add enhanced logging helpers
logger.logWithComponent = (level, component, message, meta = {}) => {
  logger.log(level, message, {
    ...meta,
    component,
  });
};

// Component-specific loggers
logger.api = {
  info: (message, meta = {}) =>
    logger.logWithComponent("info", "API", message, meta),
  error: (message, meta = {}) =>
    logger.logWithComponent("error", "API", message, meta),
  warn: (message, meta = {}) =>
    logger.logWithComponent("warn", "API", message, meta),
  debug: (message, meta = {}) =>
    logger.logWithComponent("debug", "API", message, meta),

  // Enhanced request logging with visual formatting
  request: (req, details = {}) => {
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip =
      req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    // Choose color by method
    const methodColors = {
      GET: "green",
      POST: "blue",
      PUT: "cyan",
      PATCH: "magenta",
      DELETE: "red",
      OPTIONS: "gray",
    };
    const color = methodColors[method] || "white";

    // Fixed box width for consistency
    const boxWidth = 100;

    // Intelligent URL truncation
    let displayUrl = url;
    const maxUrlLength = boxWidth - method.length - 10; // 10 for padding and formatting

    if (url.length > maxUrlLength) {
      // Handle query parameters intelligently
      if (url.includes("?")) {
        const [basePath, queryString] = url.split("?");
        const params = queryString.split("&");

        // Show base path and first few params
        let shortUrl = basePath + "?";
        let paramCount = 0;
        let currentLength = shortUrl.length;

        for (const param of params) {
          if (currentLength + param.length + 3 < maxUrlLength - 3) {
            shortUrl += (paramCount > 0 ? "&" : "") + param;
            currentLength += (paramCount > 0 ? 1 : 0) + param.length;
            paramCount++;
          } else {
            shortUrl += "...";
            break;
          }
        }
        displayUrl = shortUrl;
      } else {
        // Simple truncation for paths without query params
        const halfLength = Math.floor(maxUrlLength / 2) - 2;
        displayUrl =
          url.substring(0, halfLength) +
          "..." +
          url.substring(url.length - halfLength);
      }
    }

    // Create boxed output
    const border = chalk[color]("┌" + "─".repeat(boxWidth) + "┐");
    const footer = chalk[color]("└" + "─".repeat(boxWidth) + "┘");

    // Method and endpoint line with better formatting
    const methodStr = chalk[color].bold(` ${method.padEnd(7)}`);
    const urlStr = chalk.white(displayUrl);

    // Create a badge for the method
    const methodBadge = chalk.bgGreen.black.bold(` ${method} `);
    const urlWithPadding = " " + urlStr;

    const requestLine =
      chalk[color]("│") +
      methodStr +
      urlWithPadding +
      " ".repeat(
        Math.max(1, boxWidth - method.length - displayUrl.length - 10),
      ) +
      chalk[color]("│");

    // Source line
    const sourceStr = chalk.dim(` From: ${ip}`);
    const sourceLine =
      chalk[color]("│") +
      sourceStr +
      " ".repeat(Math.max(1, boxWidth - sourceStr.length - 2)) +
      chalk[color]("│");

    // Build and display the box
    console.log("\n" + border);
    console.log(requestLine);
    console.log(sourceLine);

    // Show headers if debug mode
    if (process.env.LOG_LEVEL === "debug") {
      // First header line
      const headersLine =
        chalk[color]("│") +
        chalk.dim(" Headers: ") +
        " ".repeat(boxWidth - 11) +
        chalk[color]("│");
      console.log(headersLine);

      // Format a few important headers for better readability
      const importantHeaders = [
        "user-agent",
        "referer",
        "content-type",
        "accept",
        "authorization",
      ];
      importantHeaders.forEach((header) => {
        if (req.headers[header]) {
          const headerValue =
            req.headers[header].length > 70
              ? req.headers[header].substring(0, 67) + "..."
              : req.headers[header];
          const headerLine =
            chalk[color]("│") +
            chalk.cyan(` • ${header}: `) +
            chalk.white(headerValue) +
            " ".repeat(
              Math.max(
                1,
                boxWidth - 6 - header.length - headerValue.length - 2,
              ),
            ) +
            chalk[color]("│");
          console.log(headerLine);
        }
      });
    }

    console.log(footer);

    // Log with component
    logger.logWithComponent("http", "API", `${method} ${url}`, {
      ip,
      method,
      url,
      ...details,
    });
  },

  // Enhanced response logging with status code colors and timing
  response: (req, res, duration, details = {}) => {
    const method = req.method;
    const url = req.originalUrl || req.url;
    const statusCode = res.statusCode;

    // Choose color by status code
    let color = "green";
    if (statusCode >= 500) color = "red";
    else if (statusCode >= 400) color = "yellow";
    else if (statusCode >= 300) color = "cyan";

    // Fixed box width for consistency
    const boxWidth = 100;

    // Format URL with intelligent truncation for display
    let displayUrl = url;
    const maxUrlLength =
      boxWidth -
      method.length -
      statusCode.toString().length -
      duration.toFixed(2).length -
      20; // 20 for padding and formatting

    if (url.length > maxUrlLength) {
      // Complex URL handling for query params
      if (url.includes("?")) {
        const [basePath, queryString] = url.split("?");
        const params = queryString.split("&");

        // Show base path and first few params
        let shortUrl = basePath + "?";
        let paramCount = 0;
        let currentLength = shortUrl.length;

        for (const param of params) {
          if (currentLength + param.length + 3 < maxUrlLength - 3) {
            shortUrl += (paramCount > 0 ? "&" : "") + param;
            currentLength += (paramCount > 0 ? 1 : 0) + param.length;
            paramCount++;
          } else {
            shortUrl += "...";
            break;
          }
        }
        displayUrl = shortUrl;
      } else {
        // Simple truncation for paths without query params
        const halfLength = Math.floor(maxUrlLength / 2) - 2;
        displayUrl =
          url.substring(0, halfLength) +
          "..." +
          url.substring(url.length - halfLength);
      }
    }

    // Create single-line simplified response log
    const border = chalk[color]("┌" + "─".repeat(boxWidth) + "┐");
    const footer = chalk[color]("└" + "─".repeat(boxWidth) + "┘");

    // Method and URL with status code and duration on the same line
    const methodStr = chalk[color].bold(method.padEnd(7));
    const urlStr = chalk.white(displayUrl);

    // Format status code with appropriate color
    const statusStr = chalk[color].bold(` ${statusCode} `);

    // Format duration with appropriate color based on response time
    const durationStr =
      duration > 1000
        ? chalk.yellow.bold(`${duration.toFixed(2)}ms`)
        : chalk.gray(`${duration.toFixed(2)}ms`);

    // Calculate actual content length for status and duration (accounting for all characters)
    const statusLength = statusCode.toString().length + 2; // +2 for spaces around status code
    const durationLength = duration.toFixed(2).length + 3; // +2 for "ms" and 1 for space after status
    const statusDurationContent = statusLength + durationLength;

    // Calculate spaces needed for proper alignment
    const leftContentWidth = method.length + displayUrl.length + 2; // +2 for spaces

    // Ensure a minimum padding of 5 spaces between URL and status code for readability
    const minPadding = 5;
    const spacesNeeded = Math.max(
      minPadding,
      boxWidth - leftContentWidth - statusDurationContent - 5,
    ); // -3 for borders and buffer

    // Create a clean one-line response format with fixed alignment
    const responseLine =
      chalk[color]("│") +
      ` ${methodStr} ${urlStr}` +
      " ".repeat(spacesNeeded) +
      statusStr +
      " " +
      durationStr +
      " " + // Add a buffer space before the right border
      chalk[color]("│");

    // Build and display the box
    console.log("\n" + border);
    console.log(responseLine);

    // Add a warning line for slow responses
    if (duration > 1000) {
      const warningLine =
        chalk[color]("│") +
        chalk.yellow(" ⚠️  Slow response") +
        " ".repeat(boxWidth - 18) +
        chalk[color]("│");
      console.log(warningLine);
    }

    // Add error info for non-2xx responses
    if (statusCode >= 400) {
      const errorText = statusCode >= 500 ? "Server error" : "Client error";
      const errorLine =
        chalk[color]("│") +
        chalk.red(` ❌ ${errorText}`) +
        " ".repeat(boxWidth - errorText.length - 6) +
        chalk[color]("│");
      console.log(errorLine);
    }

    console.log(footer);

    // Log with component
    logger.logWithComponent(
      statusCode >= 400 ? (statusCode >= 500 ? "error" : "warn") : "http",
      "API",
      `${method} ${url} [${statusCode}] ${duration.toFixed(2)}ms`,
      {
        statusCode,
        duration: `${duration.toFixed(2)}ms`,
        ...details,
      },
    );
  },
};

logger.db = {
  info: (message, meta = {}) =>
    logger.logWithComponent("info", "DATABASE", message, meta),
  error: (message, meta = {}) =>
    logger.logWithComponent("error", "DATABASE", message, meta),
  warn: (message, meta = {}) =>
    logger.logWithComponent("warn", "DATABASE", message, meta),
  debug: (message, meta = {}) =>
    logger.logWithComponent("debug", "DATABASE", message, meta),
};

logger.auth = {
  info: (message, meta = {}) =>
    logger.logWithComponent("info", "AUTH", message, meta),
  error: (message, meta = {}) =>
    logger.logWithComponent("error", "AUTH", message, meta),
  warn: (message, meta = {}) =>
    logger.logWithComponent("warn", "AUTH", message, meta),
  debug: (message, meta = {}) =>
    logger.logWithComponent("debug", "AUTH", message, meta),
};

logger.email = {
  info: (message, meta = {}) =>
    logger.logWithComponent("info", "EMAIL", message, meta),
  error: (message, meta = {}) =>
    logger.logWithComponent("error", "EMAIL", message, meta),
  warn: (message, meta = {}) =>
    logger.logWithComponent("warn", "EMAIL", message, meta),
  debug: (message, meta = {}) =>
    logger.logWithComponent("debug", "EMAIL", message, meta),
};

// Add custom Redis logger with specialized formatting
logger.redis = {
  info: (message, meta = {}) => {
    const redisPrefix = chalk.red("⚡Redis⚡ ");
    logger.logWithComponent("info", "REDIS", redisPrefix + message, meta);
  },
  error: (message, meta = {}) => {
    const redisPrefix = chalk.red("⚡Redis⚡ ");
    logger.logWithComponent("error", "REDIS", redisPrefix + message, meta);
  },
  warn: (message, meta = {}) => {
    const redisPrefix = chalk.red("⚡Redis⚡ ");
    logger.logWithComponent("warn", "REDIS", redisPrefix + message, meta);
  },
  debug: (message, meta = {}) => {
    const redisPrefix = chalk.red("⚡Redis⚡ ");
    logger.logWithComponent("debug", "REDIS", redisPrefix + message, meta);
  },
  connected: () => {
    const border = chalk.red("┏" + "━".repeat(50) + "┓");
    const message =
      chalk.red("┃ ") +
      chalk.greenBright("✅ REDIS CONNECTION ESTABLISHED") +
      " ".repeat(20) +
      chalk.red(" ┃");
    const footer = chalk.red("┗" + "━".repeat(50) + "┛");

    console.log("\n" + border);
    console.log(message);
    console.log(footer + "\n");

    logger.logWithComponent(
      "info",
      "REDIS",
      "Redis connection established successfully",
      {
        status: "connected",
        timestamp: new Date().toISOString(),
      },
    );
  },
  disconnected: () => {
    const border = chalk.red("┏" + "━".repeat(50) + "┓");
    const message =
      chalk.red("┃ ") +
      chalk.yellow("⚠️  REDIS CONNECTION CLOSED") +
      " ".repeat(23) +
      chalk.red(" ┃");
    const footer = chalk.red("┗" + "━".repeat(50) + "┛");

    console.log("\n" + border);
    console.log(message);
    console.log(footer + "\n");

    logger.logWithComponent("warn", "REDIS", "Redis connection closed", {
      status: "disconnected",
      timestamp: new Date().toISOString(),
    });
  },
  error: (err) => {
    const border = chalk.red("┏" + "━".repeat(50) + "┓");
    const message =
      chalk.red("┃ ") +
      chalk.red("❌ REDIS CONNECTION ERROR") +
      " ".repeat(24) +
      chalk.red(" ┃");
    const errorMsg =
      chalk.red("┃ ") +
      chalk.yellow(err.message) +
      " ".repeat(Math.max(0, 47 - err.message.length)) +
      chalk.red(" ┃");
    const footer = chalk.red("┗" + "━".repeat(50) + "┛");

    console.log("\n" + border);
    console.log(message);
    console.log(errorMsg);
    console.log(footer + "\n");

    logger.logWithComponent(
      "error",
      "REDIS",
      `Redis connection error: ${err.message}`,
      {
        error: err,
        timestamp: new Date().toISOString(),
      },
    );
  },
};

// Add unified connection status logging for all services
logger.connection = {
  // Called when a service successfully connects
  success: (service, details = {}) => {
    const serviceName = service.toUpperCase();
    const border = chalk.cyan("┏" + "━".repeat(58) + "┓");
    const message =
      chalk.cyan("┃ ") +
      chalk.green.bold(`✅ ${serviceName} CONNECTED`) +
      " ".repeat(Math.max(1, 44 - serviceName.length)) +
      chalk.cyan("┃");

    console.log("\n" + border);
    console.log(message);

    // Add details line if provided
    if (details.host || details.url) {
      const connection = details.host
        ? `${details.host}:${details.port || "?"}`
        : details.url;
      const detailsLine =
        chalk.cyan("┃ ") +
        chalk.white(`${connection}`) +
        " ".repeat(Math.max(1, 57 - connection.length)) +
        chalk.cyan("┃");
      console.log(detailsLine);
    }

    const footer = chalk.cyan("┗" + "━".repeat(58) + "┛");
    console.log(footer + "\n");

    logger.logWithComponent(
      "info",
      serviceName,
      `${serviceName} connection established`,
      {
        status: "connected",
        ...details,
        timestamp: new Date().toISOString(),
      },
    );
  },

  // Called when a service gracefully disconnects
  closed: (service, details = {}) => {
    const serviceName = service.toUpperCase();
    const border = chalk.yellow("┏" + "━".repeat(58) + "┓");
    const message =
      chalk.yellow("┃ ") +
      chalk.yellow.bold(`⚠️ ${serviceName} DISCONNECTED`) +
      " ".repeat(Math.max(1, 39 - serviceName.length)) +
      chalk.yellow("┃");
    const footer = chalk.yellow("┗" + "━".repeat(58) + "┛");

    console.log("\n" + border);
    console.log(message);
    console.log(footer + "\n");

    logger.logWithComponent(
      "warn",
      serviceName,
      `${serviceName} connection closed`,
      {
        status: "disconnected",
        ...details,
        timestamp: new Date().toISOString(),
      },
    );
  },

  // Called when there's a connection error
  error: (service, error, details = {}) => {
    const serviceName = service.toUpperCase();
    const border = chalk.red("┏" + "━".repeat(58) + "┓");
    const message =
      chalk.red("┃ ") +
      chalk.red.bold(`❌ ${serviceName} CONNECTION ERROR`) +
      " ".repeat(Math.max(1, 35 - serviceName.length)) +
      chalk.red("┃");

    // Extract error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorMsgLine =
      chalk.red("┃ ") +
      chalk.yellow(errorMessage.substring(0, 55)) +
      " ".repeat(Math.max(1, 55 - errorMessage.length)) +
      chalk.red("┃");

    const footer = chalk.red("┗" + "━".repeat(58) + "┛");

    console.log("\n" + border);
    console.log(message);
    console.log(errorMsgLine);
    console.log(footer + "\n");

    logger.logWithComponent(
      "error",
      serviceName,
      `${serviceName} connection error: ${errorMessage}`,
      {
        error: error instanceof Error ? error : { message: errorMessage },
        ...details,
        timestamp: new Date().toISOString(),
      },
    );
  },

  // Displays status check results
  status: (service, isConnected, details = {}) => {
    const serviceName = service.toUpperCase();
    const color = isConnected ? chalk.green : chalk.yellow;
    const icon = isConnected ? "✅" : "⚠️";
    const status = isConnected ? "CONNECTED" : "DISCONNECTED";

    const border = color("┏" + "━".repeat(58) + "┓");
    const message =
      color("┃ ") +
      color.bold(`${icon} ${serviceName} STATUS: ${status}`) +
      " ".repeat(Math.max(1, 35 - serviceName.length - status.length)) +
      color("┃");

    console.log("\n" + border);
    console.log(message);

    // Add details if provided
    if (Object.keys(details).length > 0) {
      Object.entries(details).forEach(([key, value]) => {
        const detailStr = `${key}: ${value}`.substring(0, 55);
        const detailLine =
          color("┃ ") +
          chalk.white(detailStr) +
          " ".repeat(Math.max(1, 55 - detailStr.length)) +
          color("┃");
        console.log(detailLine);
      });
    }

    const footer = color("┗" + "━".repeat(58) + "┛");
    console.log(footer + "\n");

    logger.logWithComponent(
      "info",
      serviceName,
      `${serviceName} status check: ${status.toLowerCase()}`,
      {
        status: isConnected ? "connected" : "disconnected",
        ...details,
        timestamp: new Date().toISOString(),
      },
    );
  },
};

// Add API traffic monitoring and dashboard
logger.apiDashboard = {
  // Store API metrics
  metrics: {
    requests: new Map(),
    lastReset: Date.now(),
    totalRequests: 0,
    totalErrors: 0,
    slowResponses: 0,
    queryParams: new Map(), // Track query parameters usage
    filterPatterns: new Map(), // Track common filter patterns
  },

  // Record a new API request
  recordRequest: (method, url, statusCode, duration, req = null) => {
    const metrics = logger.apiDashboard.metrics;

    // Get endpoint without query params for grouping
    const urlObj = new URL(url, "http://localhost");
    const endpoint = urlObj.pathname;
    const key = `${method}:${endpoint}`;

    // Initialize if new
    if (!metrics.requests.has(key)) {
      metrics.requests.set(key, {
        count: 0,
        errors: 0,
        totalDuration: 0,
        min: Number.MAX_VALUE,
        max: 0,
        slow: 0,
        lastCalled: null,
        queryParams: new Map(),
      });
    }

    // Update metrics
    const stat = metrics.requests.get(key);
    stat.count++;
    stat.totalDuration += duration;
    stat.min = Math.min(stat.min, duration);
    stat.max = Math.max(stat.max, duration);
    stat.lastCalled = new Date();

    // Track query parameters
    const params = Array.from(urlObj.searchParams.entries());
    if (params.length > 0) {
      params.forEach(([param, value]) => {
        // Update endpoint-specific param stats
        if (!stat.queryParams.has(param)) {
          stat.queryParams.set(param, { count: 0, values: new Map() });
        }
        const paramStat = stat.queryParams.get(param);
        paramStat.count++;

        // Track common values for this parameter
        if (!paramStat.values.has(value)) {
          paramStat.values.set(value, 0);
        }
        paramStat.values.set(value, paramStat.values.get(value) + 1);

        // Update global param stats
        if (!metrics.queryParams.has(param)) {
          metrics.queryParams.set(param, { count: 0, endpoints: new Set() });
        }
        const globalParamStat = metrics.queryParams.get(param);
        globalParamStat.count++;
        globalParamStat.endpoints.add(endpoint);
      });
    }

    // Track request body filters if available
    if (req && req.body && typeof req.body === "object") {
      // Look for common filter patterns
      const filterKeys = Object.keys(req.body).filter(
        (key) =>
          key.includes("filter") ||
          key.includes("query") ||
          key.includes("search") ||
          key.includes("sort") ||
          key.includes("order"),
      );

      if (filterKeys.length > 0) {
        // Generate a filter pattern signature
        const filterPattern = JSON.stringify(filterKeys.sort());

        if (!metrics.filterPatterns.has(filterPattern)) {
          metrics.filterPatterns.set(filterPattern, {
            count: 0,
            keys: filterKeys,
            examples: [],
          });
        }

        const patternStat = metrics.filterPatterns.get(filterPattern);
        patternStat.count++;

        // Store a few examples of actual filter values
        if (patternStat.examples.length < 3) {
          const filterExample = {};
          filterKeys.forEach((key) => {
            filterExample[key] = req.body[key];
          });
          patternStat.examples.push(filterExample);
        }
      }
    }

    // Track errors and slow responses
    if (statusCode >= 400) {
      stat.errors++;
      metrics.totalErrors++;
    }

    if (duration > 1000) {
      stat.slow++;
      metrics.slowResponses++;
    }

    metrics.totalRequests++;
  },

  // Display dashboard
  show: () => {
    const metrics = logger.apiDashboard.metrics;

    // Calculate timeframe
    const uptime = Date.now() - metrics.lastReset;
    const uptimeStr = formatUptime(uptime);

    // Use standard terminal width
    const termWidth = process.stdout.columns || 100;

    // Title and header
    console.log("\n");
    console.log(
      chalk.cyan.bold(
        "━━━━━━━━━━━━━━━━━━━━━━━━━ 📊 API TRAFFIC DASHBOARD ━━━━━━━━━━━━━━━━━━━━━━━━━",
      ),
    );
    console.log(
      chalk.white(
        `Uptime: ${chalk.bold(uptimeStr)}   Total Requests: ${chalk.bold(metrics.totalRequests)}   Errors: ${chalk.red.bold(metrics.totalErrors)}   Slow: ${chalk.yellow.bold(metrics.slowResponses)}`,
      ),
    );
    console.log(chalk.cyan("─".repeat(termWidth)));

    // Top 5 endpoints by traffic
    console.log(chalk.white.bold("🔝 TOP ENDPOINTS"));

    // Get top 5 endpoints by traffic
    const sorted = Array.from(metrics.requests.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    // Table header
    console.log(
      chalk.dim("ENDPOINT".padEnd(40)) +
        chalk.dim("METHOD".padEnd(8)) +
        chalk.dim("CALLS".padEnd(8)) +
        chalk.dim("AVG (ms)".padEnd(10)) +
        chalk.dim("ERRORS".padEnd(8)) +
        chalk.dim("SLOW".padEnd(8)),
    );

    // Display each top endpoint as a table row
    sorted.forEach(([key, stat]) => {
      const [method, endpoint] = key.split(":");
      const avg = stat.totalDuration / stat.count;

      // Truncate endpoint if needed
      const displayEndpoint =
        endpoint.length > 37
          ? endpoint.substring(0, 34) + "..."
          : endpoint.padEnd(37);

      // Choose color based on error rate
      const errorRate = stat.errors / stat.count;
      let rowColor = chalk.white;
      if (errorRate > 0.5) rowColor = chalk.red;
      else if (errorRate > 0.1) rowColor = chalk.yellow;

      console.log(
        rowColor(displayEndpoint + " ") +
          rowColor(method.padEnd(8)) +
          rowColor(stat.count.toString().padEnd(8)) +
          rowColor(avg.toFixed(2).padEnd(10)) +
          (stat.errors > 0
            ? chalk.red(stat.errors.toString().padEnd(8))
            : "0".padEnd(8)) +
          (stat.slow > 0
            ? chalk.yellow(stat.slow.toString().padEnd(8))
            : "0".padEnd(8)),
      );

      // Show top query parameters for this endpoint if any
      if (stat.queryParams.size > 0) {
        const topParams = Array.from(stat.queryParams.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 3);

        console.log(
          chalk.dim(
            `  ┗━ Params: ${topParams
              .map(([param, paramStat]) => {
                // Show param name and count
                const paramText = `${param}(${paramStat.count})`;

                // Show top values for this param
                const topValues = Array.from(paramStat.values.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 2)
                  .map(([val, count]) => `${val}(${count})`)
                  .join(", ");

                return `${paramText}=${topValues}`;
              })
              .join(", ")}`,
          ),
        );
      }
    });

    // Show common filter patterns
    if (metrics.filterPatterns.size > 0) {
      console.log("\n" + chalk.cyan("─".repeat(termWidth)));
      console.log(chalk.white.bold("🔍 COMMON FILTER PATTERNS"));

      const topPatterns = Array.from(metrics.filterPatterns.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3);

      topPatterns.forEach(([pattern, patternStat], index) => {
        console.log(
          chalk.white.bold(`Pattern ${index + 1}: `) +
            chalk.cyan(`[${patternStat.keys.join(", ")}]`) +
            chalk.white(` used ${patternStat.count} times`),
        );

        // Show example of actual filter
        if (patternStat.examples.length > 0) {
          const example = patternStat.examples[0];
          console.log(chalk.dim("  Example:"));

          Object.entries(example).forEach(([key, value]) => {
            // Format value nicely based on type
            let formattedValue;
            if (typeof value === "object" && value !== null) {
              formattedValue = JSON.stringify(value, null, 2)
                .split("\n")
                .map((line, i) => (i === 0 ? line : "  " + line))
                .join("\n");
            } else {
              formattedValue = String(value);
            }

            console.log(chalk.dim(`    ${key}: ${formattedValue}`));
          });
        }
      });
    }

    // Show common query parameters across endpoints
    if (metrics.queryParams.size > 0) {
      console.log("\n" + chalk.cyan("─".repeat(termWidth)));
      console.log(chalk.white.bold("📝 COMMON QUERY PARAMETERS"));

      const topParams = Array.from(metrics.queryParams.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);

      topParams.forEach(([param, paramStat]) => {
        console.log(
          chalk.white.bold(`${param}: `) +
            chalk.cyan(
              `${paramStat.count} uses across ${paramStat.endpoints.size} endpoints`,
            ),
        );
      });
    }

    console.log("\n" + chalk.cyan("━".repeat(termWidth)));

    // Helper for formatting uptime
    function formatUptime(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      } else {
        return `${seconds}s`;
      }
    }
  },

  // Reset dashboard metrics
  reset: () => {
    logger.apiDashboard.metrics = {
      requests: new Map(),
      lastReset: Date.now(),
      totalRequests: 0,
      totalErrors: 0,
      slowResponses: 0,
      queryParams: new Map(),
      filterPatterns: new Map(),
    };
    console.log(chalk.green("✅ API Dashboard metrics reset successfully"));
  },
};

// Update existing API logger methods to record metrics
const originalApiResponse = logger.api.response;
logger.api.response = (req, res, duration, details = {}) => {
  // Record metrics
  const method = req.method;
  const url = req.originalUrl || req.url;
  const statusCode = res.statusCode;

  // Update dashboard with full request object
  logger.apiDashboard.recordRequest(method, url, statusCode, duration, req);

  // Call original implementation
  return originalApiResponse(req, res, duration, details);
};

// Add configuration methods for the logger
logger.config = {
  // Show or hide metadata in console output
  showMetadata: (show = true) => {
    loggerConfig.showMetadata = show;
    return logger;
  },

  // Enable or disable compact mode
  setCompactMode: (compact = true) => {
    loggerConfig.compactMode = compact;
    return logger;
  },

  // Get current configuration
  getConfig: () => {
    return { ...loggerConfig };
  },
};

// Export the logger instance
export default logger;
