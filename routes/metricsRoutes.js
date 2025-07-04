import express from "express";

const router = express.Router();
import metricsController from "../controllers/metricsController.js";
import rateLimiter from "../middleware/rateLimiter.js";

// Apply rate limiting to all metrics routes
router.use(rateLimiter);

// API Metrics
router.get("/api/metrics", metricsController.getMetrics);

// Error Tracking
router.get("/errors/stats", metricsController.getErrorStats);
router.get("/errors/summary", metricsController.getErrorSummary);

// System Health
router.get("/health", metricsController.getSystemHealth);

// Deployment Metrics (Sprint 3: DevOps Essentials)
router.get("/deployment", metricsController.getDeploymentMetrics);

export default router;
