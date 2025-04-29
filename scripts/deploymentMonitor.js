#!/usr/bin/env node
/**
 * Deployment Monitoring Script
 * 
 * Part of Sprint 3: DevOps Essentials
 * This script can be used in CI/CD pipelines to record deployment events
 * and maintain deployment metrics
 * 
 * Usage:
 *   node deploymentMonitor.js --event=deploy --environment=production --version=1.2.3
 *   node deploymentMonitor.js --event=pipeline --success=true --pipelineId=ci-123
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import minimist from 'minimist';
import deploymentTracker from '../middleware/deploymentTracker.js';
import logger from '../utils/logger.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Parse command line arguments
const argv = minimist(process.argv.slice(2));

// Get event type and other parameters
const eventType = argv.event || 'unknown';
const environment = argv.environment || process.env.NODE_ENV || 'development';
const version = argv.version || process.env.npm_package_version || '0.0.0';
const success = argv.success !== 'false'; // Default to true unless explicitly set to false
const reason = argv.reason || '';
const pipelineId = argv.pipelineId || '';
const commitId = argv.commitId || '';
const containerId = argv.containerId || '';
const service = argv.service || 'medh-backend';
const triggeredBy = argv.triggeredBy || 'system';
const configParam = argv.parameter || '';

// Log start
logger.info('Deployment monitor script started', { 
  eventType, 
  environment,
  version
});

// Process different event types
try {
  switch (eventType) {
    case 'deploy':
      // Record deployment event
      if (success) {
        deploymentTracker.recordDeployment({
          version,
          environment,
          triggeredBy
        });
        logger.info('Deployment recorded successfully');
      } else {
        deploymentTracker.recordDeploymentFailure({
          version,
          environment,
          triggeredBy,
          reason
        });
        logger.info('Deployment failure recorded');
      }
      break;
      
    case 'pipeline':
      // Record CI/CD pipeline run
      deploymentTracker.recordPipelineRun({
        pipelineId,
        commitId,
        success
      });
      logger.info('Pipeline run recorded');
      break;
      
    case 'container':
      // Record container restart
      deploymentTracker.recordContainerRestart({
        containerId,
        service,
        reason
      });
      logger.info('Container restart recorded');
      break;
      
    case 'config':
      // Record configuration error
      deploymentTracker.recordConfigError({
        service,
        parameter: configParam,
        message: reason
      });
      logger.info('Configuration error recorded');
      break;
      
    case 'availability':
      // Update service availability
      const percentage = parseFloat(argv.percentage);
      if (!isNaN(percentage)) {
        deploymentTracker.updateServiceAvailability(percentage);
        logger.info(`Service availability updated to ${percentage}%`);
      } else {
        throw new Error('Invalid availability percentage');
      }
      break;
      
    default:
      logger.warn(`Unknown event type: ${eventType}`);
      break;
  }
  
  logger.info('Deployment monitor script completed successfully');
  process.exit(0);
} catch (error) {
  logger.error('Error in deployment monitor script', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
} 