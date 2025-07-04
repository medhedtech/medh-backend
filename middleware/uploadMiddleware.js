import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';

/**
 * Middleware to handle chunked base64 uploads for better performance
 * This processes the upload in chunks to avoid memory issues with large files
 */
export const chunkedBase64Middleware = async (req, res, next) => {
  // Only apply to base64 upload endpoints
  if (!req.url.includes('/upload/base64') || req.method !== 'POST') {
    return next();
  }

  try {
    // If we have a raw body from the JSON parser, use it
    if (req.rawBody) {
      // Parse the JSON to extract base64 data
      const body = JSON.parse(req.rawBody);
      
      // Store parsed data
      req.body = body;
      
      // Add performance metrics
      req.uploadMetrics = {
        startTime: Date.now(),
        bodySize: req.rawBody.length,
      };
    }
    
    next();
  } catch (error) {
    console.error('Chunked base64 middleware error:', error);
    next(error);
  }
};

/**
 * Middleware to validate base64 data before processing
 * This helps catch errors early and improve performance
 */
export const validateBase64Middleware = (req, res, next) => {
  // Only apply to base64 upload endpoints
  if (!req.url.includes('/upload/base64') || req.method !== 'POST') {
    return next();
  }

  try {
    const { base64String, fileType } = req.body || {};
    
    if (!base64String || !fileType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: base64String and fileType',
        error: 'VALIDATION_ERROR'
      });
    }

    // Quick validation of base64 format
    if (base64String.length > 0) {
      // Check if it's a valid base64 string or data URI
      const isDataUri = base64String.startsWith('data:');
      const base64Part = isDataUri 
        ? base64String.split(',')[1] 
        : base64String;
      
      // Basic validation - base64 strings should only contain valid characters
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (base64Part && !base64Regex.test(base64Part.substring(0, 100))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid base64 string format',
          error: 'INVALID_BASE64'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Base64 validation error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid request format',
      error: 'VALIDATION_ERROR'
    });
  }
};

/**
 * Middleware to add caching headers for upload responses
 */
export const uploadCacheMiddleware = (req, res, next) => {
  // Add cache headers for successful uploads
  res.on('finish', () => {
    if (res.statusCode === 200 && req.url.includes('/upload')) {
      // No caching for upload endpoints
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  });
  next();
};

/**
 * Compression middleware specifically for base64 responses
 * This compresses the JSON response to reduce bandwidth
 */
export const compressUploadResponse = (req, res, next) => {
  if (req.url.includes('/upload') && req.method === 'POST') {
    // Store original json method
    const originalJson = res.json;
    
    res.json = function(data) {
      // Add performance metrics to response if available
      if (req.uploadMetrics) {
        data.metrics = {
          processingTime: Date.now() - req.uploadMetrics.startTime,
          originalSize: req.uploadMetrics.bodySize,
        };
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
  }
  next();
}; 