const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const logger = require('../utils/logger');
const { ENV_VARS } = require('../config/envVars');

// XSS Protection utility
const xssProtection = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

const sanitizeObject = (obj) => {
  const clean = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        clean[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        clean[key] = sanitizeObject(obj[key]);
      } else {
        clean[key] = obj[key];
      }
    }
  }
  return clean;
};

const sanitizeString = (str) => {
  return str
    .replace(/[&<>"']/g, (match) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    })[match])
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:/gi, '')
    .trim();
};

const securityMiddleware = (app) => {
  // Set security HTTP headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.medh.co", "https://www.medh.co", "https://medh.co"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  }));

  // Data sanitization against NoSQL query injection
  app.use(mongoSanitize());

  // Custom XSS protection
  app.use(xssProtection);

  // Compress all responses
  app.use(compression());

  // CORS configuration
  app.use((req, res, next) => {
    // Define local development origins
    const localhostOrigins = [
      'http://localhost:3000',  // Common React dev server
      'http://localhost:8000',  // Common Node/Express dev server
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8000'
    ];
    
    // Combine configured origins with predefined ones
    const allowedOrigins = [
      ...(process.env.ALLOWED_ORIGINS || '').split(',').filter(origin => origin.trim() !== ''),
      ...(process.env.NODE_ENV !== 'production' ? localhostOrigins : [])
    ];
    
    const origin = req.headers.origin;
    
    // Log CORS diagnostic info using the proper logger
    if (process.env.NODE_ENV === 'production') {
      logger.info('CORS: Production mode - restricted to allowed origins');
      if (allowedOrigins.length > 0) {
        logger.info(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
      } else {
        logger.warn('No CORS allowed origins configured in production');
      }
      logger.debug('CORS Headers Configuration', {
        origin,
        allowedOrigins,
        mode: 'production'
      });
    } else {
      logger.info('CORS: Development mode - allowing all origins');
      logger.debug('CORS Headers Configuration', {
        origin,
        mode: 'development'
      });
    }
    
    // Special case for localhost development in any environment
    const isLocalhost = origin && (
      origin.startsWith('http://localhost:') || 
      origin.startsWith('https://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('https://127.0.0.1:')
    );
    
    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      // Always set CORS headers
      if (origin) {
        // In production, check against allowed origins, but allow localhost for development
        if (process.env.NODE_ENV === 'production' && allowedOrigins.length > 0) {
          if (allowedOrigins.includes(origin) || isLocalhost) {
            res.setHeader('Access-Control-Allow-Origin', origin);
          }
        } else {
          // In development or if no allowed origins configured, be permissive
          res.setHeader('Access-Control-Allow-Origin', origin);
        }
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      
      // Return 204 for preflight requests
      return res.status(204).end();
    }
    
    // For non-OPTIONS requests
    if (origin) {
      // In production, check against allowed origins, but allow localhost for development
      if (process.env.NODE_ENV === 'production' && allowedOrigins.length > 0) {
        if (allowedOrigins.includes(origin) || isLocalhost) {
          res.setHeader('Access-Control-Allow-Origin', origin);
        }
      } else {
        // In development or if no allowed origins configured, be permissive
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    next();
  });

  // Additional security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    next();
  });

  // Verify CORS via referrer check
  app.use((req, res, next) => {
    // Skip in development mode for easier testing
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    const referrer = req.get('Referer') || '';
    
    // Check if referrer is from localhost (for local development)
    const isLocalhostReferrer = referrer && (
      referrer.startsWith('http://localhost:') || 
      referrer.startsWith('https://localhost:') ||
      referrer.startsWith('http://127.0.0.1:') ||
      referrer.startsWith('https://127.0.0.1:')
    );
    
    // Allow localhost referrers for local development
    if (isLocalhostReferrer) {
      return next();
    }
    
    // List of allowed domains
    const allowedDomains = [
      'http://api.medh.co', 
      'https://api.medh.co',
      'http://www.medh.co',
      'https://www.medh.co',
      'http://medh.co',
      'https://medh.co'
    ];

    // Add configured origins from env vars
    const configuredOrigins = (ENV_VARS.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    allowedDomains.push(...configuredOrigins);

    // Skip referrer check for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return next();
    }

    // Skip check for routes that need public access
    const publicPaths = [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/public'
    ];

    if (publicPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Skip check if no referrer (direct access, API tools, etc.)
    if (!referrer) {
      // For API-specific endpoints, allow direct access
      if (req.path.startsWith('/api/v1')) {
        return next();
      }
      
      // For non-API/browser expected endpoints, log a warning
      if (req.xhr || (req.get('Accept') && req.get('Accept').includes('application/json'))) {
        logger.warn('Missing referrer for XHR/JSON request', {
          path: req.path,
          ip: req.ip,
          method: req.method
        });
      }
      return next();
    }

    // Check if referrer is from an allowed domain
    const isAllowed = allowedDomains.some(domain => 
      referrer.startsWith(domain) || 
      referrer.startsWith(domain.replace('http://', 'https://'))
    );

    if (isAllowed) {
      return next();
    }

    // Log unauthorized referrer attempts
    logger.warn('Blocked request with unauthorized referrer', {
      referrer,
      path: req.path,
      ip: req.ip,
      method: req.method
    });

    // Only block unsafe methods, allow GET requests for better compatibility
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Invalid referrer.'
      });
    }

    // Allow GET requests to pass through with a warning
    next();
  });
};

module.exports = securityMiddleware; 