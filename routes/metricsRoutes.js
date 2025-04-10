import express from 'express';
const router = express.Router();
import * as metricsController from '../controllers/metricsController';
import { apiLimiter } from '../middleware/rateLimiter';

// Apply rate limiting to all metrics routes
router.use(apiLimiter);

// API Metrics
router.get('/api/metrics', metricsController.getMetrics);

// Error Tracking
router.get('/errors/stats', metricsController.getErrorStats);
router.get('/errors/summary', metricsController.getErrorSummary);

// System Health
router.get('/health', metricsController.getSystemHealth);

export default router; 