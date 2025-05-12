import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { Resource } from '@opentelemetry/resources';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import logger from './logger.js';
import { ENV_VARS } from '../config/envVars.js';

// Configure service name to use in telemetry data
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'medh-backend',
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: ENV_VARS.NODE_ENV || 'development'
});

// Configure trace exporter
const traceExporter = new OTLPTraceExporter({
  // Typically this would be a collector like Jaeger
  // For development, we can use a simple endpoint
  url: ENV_VARS.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
});

// Create span processor for batching spans before export
const spanProcessor = new BatchSpanProcessor(traceExporter);

// Configure SDK with auto-instrumentation
const sdk = new NodeSDK({
  resource,
  spanProcessor,
  // Auto-instrument popular libraries and frameworks
  instrumentations: [
    getNodeAutoInstrumentations({
      // Enable all auto-instrumentations with custom config
      '@opentelemetry/instrumentation-fs': { enabled: false }, // Disable file system instrumentation (noisy)
      '@opentelemetry/instrumentation-express': {
        enabled: true,
        ignoreLayers: ['/health', '/metrics'] // Don't trace health checks and metrics
      },
      '@opentelemetry/instrumentation-mongodb': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingPaths: ['/health', '/metrics']
      },
    })
  ]
});

// Initialize OpenTelemetry
const initTracing = () => {
  try {
    // Start SDK
    sdk.start();
    logger.info('OpenTelemetry tracing initialized successfully');
    
    // Handle shutdown gracefully
    const shutdownTracing = async () => {
      try {
        await sdk.shutdown();
        logger.info('OpenTelemetry tracing shut down successfully');
      } catch (error) {
        logger.error('Error shutting down OpenTelemetry', { error: error.message });
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', shutdownTracing);
    process.on('SIGINT', shutdownTracing);
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry tracing', { 
      error: error.message,
      stack: error.stack 
    });
    return false;
  }
};

// Manual span creation utility
const createCustomSpan = (tracer, name, fn, attributes = {}) => {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      // Add attributes to span
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
      
      // Run the function inside the span
      const result = await fn();
      
      // End the span
      span.end();
      
      return result;
    } catch (error) {
      // Record error and end span
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message }); // Error status
      span.end();
      throw error;
    }
  });
};

export {
  initTracing,
  createCustomSpan
}; 