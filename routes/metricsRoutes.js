const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { apiLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting to all metrics routes
router.use(apiLimiter);

// API Metrics
router.get('/api/metrics', metricsController.getMetrics);

// Error Tracking
router.get('/errors/stats', metricsController.getErrorStats);
router.get('/errors/summary', metricsController.getErrorSummary);

// System Health
router.get('/health', metricsController.getSystemHealth);

module.exports = router; 