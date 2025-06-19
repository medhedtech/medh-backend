import express from 'express';
import mongoose from 'mongoose';
import os from 'os';
import logger from '../utils/logger.js';
import { activeConnections } from '../utils/metrics.js';
import dbUtils from '../utils/dbUtils.js';

import { ENV_VARS } from '../config/envVars.js';

const router = express.Router();

/**
 * @route GET /health
 * @desc Basic health check endpoint
 * @access Public
 */
router.get('/', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Service is running'
  });
});

/**
 * @route GET /health/ready
 * @desc Readiness probe - checks if the application is ready to receive traffic
 * @access Public
 */
router.get('/ready', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check if Redis client is ready (if applicable)
    let redisStatus = 'unknown';
    try {
      // This would need to be adjusted based on your actual Redis client implementation
      const redisClient = req.app.get('redisClient');
      redisStatus = redisClient && redisClient.status === 'ready' ? 'connected' : 'disconnected';
    } catch (error) {
      redisStatus = 'disconnected';
      logger.warn('Redis health check failed', { error: error.message });
    }
    
    // Determine overall readiness based on critical dependencies
    const isReady = dbStatus === 'connected';
    
    // Return appropriate status code based on readiness
    return res.status(isReady ? 200 : 503).json({
      status: isReady ? 'success' : 'error',
      message: isReady ? 'Service is ready' : 'Service is not ready',
      dependencies: {
        database: dbStatus,
        redis: redisStatus
      }
    });
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    return res.status(500).json({
      status: 'error',
      message: 'Readiness check failed',
      error: error.message
    });
  }
});

/**
 * @route GET /health/live
 * @desc Liveness probe - checks if the application is running without errors
 * @access Public
 */
router.get('/live', (req, res) => {
  // Check if application has any fatal errors
  // This is a simple check for demo purposes
  try {
    // Update active connections metric
    activeConnections.set(req.app.locals.activeConnections || 0);
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memoryUsage.rss / 1024 / 1024);
    const memoryLimit = 1024; // Example: 1GB limit
    
    // Check if memory usage is within acceptable limits
    const isMemoryOk = memoryUsageMB < memoryLimit;
    
    return res.status(isMemoryOk ? 200 : 500).json({
      status: isMemoryOk ? 'success' : 'error',
      message: isMemoryOk ? 'Service is live' : 'Service is experiencing issues',
      memoryUsage: {
        rss: `${memoryUsageMB} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      }
    });
  } catch (error) {
    logger.error('Liveness check failed', { error: error.message });
    return res.status(500).json({
      status: 'error',
      message: 'Liveness check failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    };

    res.status(200).json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/health/database
 * @desc    Database connectivity health check
 * @access  Public
 */
router.get('/database', async (req, res) => {
  try {
    const dbHealth = await dbUtils.checkConnectionHealth();
    
    const statusCode = dbHealth.healthy ? 200 : 503;
    
    res.status(statusCode).json({
      success: dbHealth.healthy,
      data: {
        database: dbHealth,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    res.status(503).json({
      success: false,
      message: 'Database health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/health/detailed
 * @desc    Detailed system health check
 * @access  Public
 */
router.get('/detailed', async (req, res) => {
  try {
    const [dbHealth] = await Promise.allSettled([
      dbUtils.checkConnectionHealth()
    ]);

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        external: Math.round(process.memoryUsage().external / 1024 / 1024) + ' MB'
      },
      database: dbHealth.status === 'fulfilled' ? dbHealth.value : {
        healthy: false,
        error: dbHealth.reason?.message || 'Unknown error'
      }
    };

    // Determine overall health status
    const overallHealthy = health.database.healthy;
    health.status = overallHealthy ? 'ok' : 'degraded';

    const statusCode = overallHealthy ? 200 : 503;

    res.status(statusCode).json({
      success: overallHealthy,
      data: health
    });
  } catch (error) {
    logger.error('Detailed health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Detailed health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Convert MongoDB connection state code to readable string
 * @param {number} state - MongoDB connection state code
 * @returns {string} Human-readable connection state
 */
function getMongoConnectionState(state) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  return states[state] || 'unknown';
}

export default router; 