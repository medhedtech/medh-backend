/**
 * Metrics utilities for application monitoring
 * 
 * This module provides metrics tracking for various application metrics
 * Currently implemented as basic counters but could be expanded to use
 * a proper metrics library like Prometheus client in the future.
 */

// Simple metrics implementation
class Metric {
  constructor(initialValue = 0) {
    this.value = initialValue;
  }

  set(value) {
    this.value = value;
    return this.value;
  }

  increment(by = 1) {
    this.value += by;
    return this.value;
  }

  decrement(by = 1) {
    this.value -= by;
    if (this.value < 0) this.value = 0;
    return this.value;
  }

  get() {
    return this.value;
  }
}

// Application metrics
export const activeConnections = new Metric(0);
export const requestCount = new Metric(0);
export const errorCount = new Metric(0);
export const databaseOperations = new Metric(0);

// DevOps and Deployment metrics (Sprint 3)
export const deploymentCount = new Metric(0);
export const deploymentFailures = new Metric(0);
export const ciPipelineRuns = new Metric(0);
export const ciPipelineFailures = new Metric(0);
export const containerRestarts = new Metric(0);
export const configErrors = new Metric(0);
export const environmentVariableIssues = new Metric(0);
export const serviceAvailability = new Metric(100); // Percentage

/**
 * Reset all metrics to zero
 * Useful for testing or when restarting metrics collection
 */
export const resetMetrics = () => {
  activeConnections.set(0);
  requestCount.set(0);
  errorCount.set(0);
  databaseOperations.set(0);
  
  // Reset DevOps metrics
  deploymentCount.set(0);
  deploymentFailures.set(0);
  ciPipelineRuns.set(0);
  ciPipelineFailures.set(0);
  containerRestarts.set(0);
  configErrors.set(0);
  environmentVariableIssues.set(0);
  serviceAvailability.set(100);
};

export default {
  // Core application metrics
  activeConnections,
  requestCount,
  errorCount,
  databaseOperations,
  
  // DevOps metrics
  deploymentCount,
  deploymentFailures,
  ciPipelineRuns,
  ciPipelineFailures,
  containerRestarts,
  configErrors,
  environmentVariableIssues,
  serviceAvailability,
  
  resetMetrics
}; 