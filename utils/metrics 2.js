import client from 'prom-client';
import promBundle from 'express-prom-bundle';
import logger from './logger.js';

// Create a Registry to register the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'medh-backend'
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Create custom metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [1, 5, 15, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
});

const dbQueryDurationMicroseconds = new client.Histogram({
  name: 'db_query_duration_ms',
  help: 'Duration of database queries in ms',
  labelNames: ['operation', 'collection'],
  buckets: [1, 5, 15, 50, 100, 200, 500, 1000, 2000, 5000]
});

const redisOperationDurationMicroseconds = new client.Histogram({
  name: 'redis_operation_duration_ms',
  help: 'Duration of Redis operations in ms',
  labelNames: ['operation'],
  buckets: [1, 5, 15, 50, 100, 200, 500]
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const jwtOperations = new client.Counter({
  name: 'jwt_operations_total',
  help: 'Count of JWT operations',
  labelNames: ['operation']
});

const apiErrorCounter = new client.Counter({
  name: 'api_errors_total',
  help: 'Count of API errors',
  labelNames: ['route', 'method', 'status_code']
});

// Register the metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(dbQueryDurationMicroseconds);
register.registerMetric(redisOperationDurationMicroseconds);
register.registerMetric(activeConnections);
register.registerMetric(jwtOperations);
register.registerMetric(apiErrorCounter);

// Create middleware for Express
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { app: 'medh-backend' },
  promClient: { collectDefaultMetrics: {} }
});

// Export metrics endpoint for Prometheus to scrape
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Error generating metrics', { error: error.message });
    res.status(500).end();
  }
};

export {
  register,
  metricsMiddleware,
  metricsEndpoint,
  httpRequestDurationMicroseconds,
  dbQueryDurationMicroseconds,
  redisOperationDurationMicroseconds,
  activeConnections,
  jwtOperations,
  apiErrorCounter
}; 