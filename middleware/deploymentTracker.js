/**
 * Deployment Tracker Middleware
 * 
 * Part of Sprint 3: DevOps Essentials
 * Tracks deployment and CI/CD pipeline events for monitoring
 */

import metrics from '../utils/metrics.js';
import logger from '../utils/logger.js';

/**
 * Records a successful deployment event
 * @param {Object} deploymentInfo - Information about the deployment
 * @param {string} deploymentInfo.version - Deployed version
 * @param {string} deploymentInfo.environment - Target environment (dev, staging, prod)
 * @param {string} deploymentInfo.triggeredBy - Who or what triggered the deployment
 */
export const recordDeployment = (deploymentInfo) => {
  try {
    metrics.deploymentCount.increment();
    
    logger.info('Deployment successful', {
      type: 'deployment',
      success: true,
      ...deploymentInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to record deployment', {
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Records a failed deployment event
 * @param {Object} deploymentInfo - Information about the deployment
 * @param {string} deploymentInfo.version - Attempted version
 * @param {string} deploymentInfo.environment - Target environment (dev, staging, prod)
 * @param {string} deploymentInfo.triggeredBy - Who or what triggered the deployment
 * @param {string} deploymentInfo.reason - Reason for failure
 */
export const recordDeploymentFailure = (deploymentInfo) => {
  try {
    metrics.deploymentCount.increment();
    metrics.deploymentFailures.increment();
    
    logger.error('Deployment failed', {
      type: 'deployment',
      success: false,
      ...deploymentInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to record deployment failure', {
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Records a CI/CD pipeline run
 * @param {Object} pipelineInfo - Information about the pipeline run
 * @param {string} pipelineInfo.pipelineId - Pipeline identifier
 * @param {string} pipelineInfo.commitId - Associated commit ID
 * @param {boolean} pipelineInfo.success - Whether the pipeline succeeded
 */
export const recordPipelineRun = (pipelineInfo) => {
  try {
    metrics.ciPipelineRuns.increment();
    
    if (!pipelineInfo.success) {
      metrics.ciPipelineFailures.increment();
    }
    
    logger.info('CI/CD pipeline run', {
      type: 'pipeline',
      ...pipelineInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to record pipeline run', {
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Records a container restart event
 * @param {Object} containerInfo - Information about the container restart
 * @param {string} containerInfo.containerId - Container identifier
 * @param {string} containerInfo.service - Service name
 * @param {string} containerInfo.reason - Reason for restart
 */
export const recordContainerRestart = (containerInfo) => {
  try {
    metrics.containerRestarts.increment();
    
    logger.warn('Container restart', {
      type: 'container',
      ...containerInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to record container restart', {
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Records a configuration error
 * @param {Object} configInfo - Information about the configuration error
 * @param {string} configInfo.service - Affected service
 * @param {string} configInfo.parameter - Configuration parameter with issue
 * @param {string} configInfo.message - Error message
 */
export const recordConfigError = (configInfo) => {
  try {
    metrics.configErrors.increment();
    
    logger.error('Configuration error', {
      type: 'config',
      ...configInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to record config error', {
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Updates service availability
 * @param {number} percentage - Availability percentage (0-100)
 */
export const updateServiceAvailability = (percentage) => {
  try {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Availability percentage must be between 0 and 100');
    }
    
    metrics.serviceAvailability.set(percentage);
    
    logger.info('Service availability updated', {
      type: 'availability',
      percentage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to update service availability', {
      error: error.message,
      stack: error.stack
    });
  }
};

export default {
  recordDeployment,
  recordDeploymentFailure,
  recordPipelineRun,
  recordContainerRestart,
  recordConfigError,
  updateServiceAvailability
}; 