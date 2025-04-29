import { getAPIMetrics } from "../middleware/apiMonitor.js";
import errorTracker from "../services/errorTracker.js";
import logger from "../utils/logger.js";
import metrics from "../utils/metrics.js";

export const getMetrics = (req, res) => {
  try {
    const metrics = getAPIMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error("Error fetching API metrics", {
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
    res.status(500).json({
      status: "error",
      message: "Error fetching API metrics",
    });
  }
};

export const getErrorStats = (req, res) => {
  try {
    const stats = errorTracker.getErrorStats();
    res.json({
      timestamp: new Date(),
      stats,
    });
  } catch (error) {
    logger.error("Error fetching error statistics", {
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
    res.status(500).json({
      status: "error",
      message: "Error fetching error statistics",
    });
  }
};

export const getErrorSummary = (req, res) => {
  try {
    const summary = errorTracker.getErrorSummary();
    res.json({
      timestamp: new Date(),
      totalErrors: summary.length,
      errors: summary,
    });
  } catch (error) {
    logger.error("Error fetching error summary", {
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
    res.status(500).json({
      status: "error",
      message: "Error fetching error summary",
    });
  }
};

export const getSystemHealth = (req, res) => {
  try {
    const metrics = getAPIMetrics();
    const errorStats = errorTracker.getErrorStats();

    // Calculate error rate and average response time
    let totalRequests = 0;
    let totalErrors = 0;
    let totalDuration = 0;

    metrics.metrics.forEach((metric) => {
      totalRequests += metric.totalCalls;
      totalErrors += (metric.errorRate * metric.totalCalls) / 100;
      totalDuration += metric.averageDuration * metric.totalCalls;
    });

    const health = {
      timestamp: new Date(),
      status: "healthy", // Will be updated based on checks
      checks: {
        errorRate: {
          status: "healthy",
          value: totalRequests ? (totalErrors / totalRequests) * 100 : 0,
          threshold: 5, // 5% error rate threshold
        },
        responseTime: {
          status: "healthy",
          value: totalRequests ? totalDuration / totalRequests : 0,
          threshold: 1000, // 1 second threshold
        },
        recentErrors: {
          status: "healthy",
          value: errorStats.lastHour,
          threshold: 50, // 50 errors per hour threshold
        },
      },
    };

    // Update check statuses
    if (health.checks.errorRate.value > health.checks.errorRate.threshold) {
      health.checks.errorRate.status = "unhealthy";
      health.status = "unhealthy";
    }

    if (
      health.checks.responseTime.value > health.checks.responseTime.threshold
    ) {
      health.checks.responseTime.status = "degraded";
      if (health.status === "healthy") health.status = "degraded";
    }

    if (
      health.checks.recentErrors.value > health.checks.recentErrors.threshold
    ) {
      health.checks.recentErrors.status = "unhealthy";
      health.status = "unhealthy";
    }

    res.json(health);
  } catch (error) {
    logger.error("Error fetching system health", {
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
    res.status(500).json({
      status: "error",
      message: "Error fetching system health",
    });
  }
};

/**
 * Get deployment metrics
 * @route GET /api/metrics/deployment
 * @access Private
 */
export const getDeploymentMetrics = (req, res) => {
  try {
    const deploymentStats = {
      timestamp: new Date(),
      metrics: {
        deployments: {
          total: metrics.deploymentCount.get(),
          failures: metrics.deploymentFailures.get(),
          successRate: calculateSuccessRate(
            metrics.deploymentCount.get(),
            metrics.deploymentFailures.get()
          )
        },
        cicd: {
          pipelineRuns: metrics.ciPipelineRuns.get(),
          failures: metrics.ciPipelineFailures.get(),
          successRate: calculateSuccessRate(
            metrics.ciPipelineRuns.get(),
            metrics.ciPipelineFailures.get()
          )
        },
        infrastructure: {
          containerRestarts: metrics.containerRestarts.get(),
          configErrors: metrics.configErrors.get(),
          envVarIssues: metrics.environmentVariableIssues.get()
        },
        serviceAvailability: {
          percentage: metrics.serviceAvailability.get(),
          status: getAvailabilityStatus(metrics.serviceAvailability.get())
        }
      }
    };

    res.json(deploymentStats);
  } catch (error) {
    logger.error("Error fetching deployment metrics", {
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
    res.status(500).json({
      status: "error",
      message: "Error fetching deployment metrics",
    });
  }
};

/**
 * Calculates success rate as a percentage
 * @param {number} total - Total count
 * @param {number} failures - Failure count
 * @returns {number} Success rate percentage
 */
function calculateSuccessRate(total, failures) {
  if (total === 0) return 100; // No deployments means no failures
  return Math.round(((total - failures) / total) * 100);
}

/**
 * Gets availability status based on percentage
 * @param {number} percentage - Availability percentage
 * @returns {string} Status description
 */
function getAvailabilityStatus(percentage) {
  if (percentage >= 99.9) return "excellent";
  if (percentage >= 99) return "good";
  if (percentage >= 95) return "fair";
  return "poor";
}

export default {
  getMetrics,
  getErrorStats,
  getErrorSummary,
  getSystemHealth,
  getDeploymentMetrics
};
