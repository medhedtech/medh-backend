import { createClient } from "redis";

import logger from "./logger.js";

// Utility function to standardize Redis enabled checking across the application
export function isRedisEnabled() {
  // Get the raw value and trim any trailing comments
  const redisEnabledRaw = (process.env.REDIS_ENABLED || "").toLowerCase();
  
  // Split by any comment character and take only the first part
  const redisEnabled = redisEnabledRaw.split('#')[0].trim();
  
  return redisEnabled === "true" || redisEnabled === "yes" || redisEnabled === "1";
}

class Cache {
  constructor() {
    this.client = null;
    this.connected = false;
    this.healthCheckInterval = null;
    this.init();
  }

  async init() {
    try {
      // Debug the Redis enabled value
      const redisEnabledRaw = process.env.REDIS_ENABLED;
      logger.redis.debug("Redis enabled raw value:", { 
        value: redisEnabledRaw,
        type: typeof redisEnabledRaw,
        length: redisEnabledRaw?.length
      });
      
      // Use the standardized function to check if Redis is enabled
      const enabled = isRedisEnabled();
      logger.redis.debug("Redis enabled processed value:", { enabled });
      
      if (!enabled) {
        logger.redis.warn(
          "Redis is disabled in configuration. Skipping connection.",
        );
        return;
      }

      // Log Redis connection attempt with config details
      const redisHost = process.env.REDIS_HOST || "localhost";
      const redisPort = process.env.REDIS_PORT || 6379;

      logger.redis.info(
        `Attempting to connect to Redis at ${redisHost}:${redisPort}`,
      );

      // Create Redis client with proper authentication - using the same approach that works in redis-test.js
      this.client = createClient({
        socket: {
          host: redisHost,
          port: redisPort,
        },
        password: process.env.REDIS_PASSWORD || undefined, // Only set if defined
        // Add a longer connection timeout for reliability
        socket_keepalive: true,
        retry_strategy: (options) => {
          if (options.error && options.error.code === "ECONNREFUSED") {
            // End reconnecting on a specific error
            logger.redis.error("Connection refused. Redis server may not be running.");
            return new Error("Redis server refused connection");
          }
          if (options.total_retry_time > 1000 * 60 * 5) {
            // End reconnecting after 5 minutes
            logger.redis.error("Retry time exhausted");
            return new Error("Retry time exhausted");
          }
          if (options.attempt > 10) {
            // End reconnecting with built in error
            logger.redis.error("Maximum retry attempts reached");
            return undefined;
          }
          // Reconnect after increasing delay
          return Math.min(options.attempt * 100, 3000);
        }
      });

      // Set event handlers for diagnostic logging
      this.client.on("error", (err) => {
        logger.connection.error("Redis", err, {
          host: redisHost,
          port: redisPort,
        });
        logger.redis.error(`Redis error: ${err.message}`, { stack: err.stack });
        this.connected = false;
      });

      this.client.on("connect", () => {
        logger.connection.success("Redis", {
          host: redisHost,
          port: redisPort,
        });
        this.connected = true;
      });

      this.client.on("ready", () => {
        logger.redis.info("Authentication Successful - Client Ready");
      });

      this.client.on("reconnecting", () => {
        logger.redis.warn("Client Reconnecting...");
      });

      this.client.on("end", () => {
        logger.connection.closed("Redis", {
          host: redisHost,
          port: redisPort,
        });
        this.connected = false;
      });

      try {
        // Add more detailed error handling for the connect call
        logger.redis.info("Initiating Redis connection");
        await this.client.connect();
        logger.redis.info("Redis connection established successfully");
      } catch (connError) {
        logger.redis.error(`Redis connection error: ${connError.message}`, { 
          stack: connError.stack,
          code: connError.code 
        });
        throw connError;
      }

      // Setup periodic health check if Redis is enabled and connected
      if (isRedisEnabled()) {
        this.setupHealthCheck();
      }
    } catch (error) {
      logger.connection.error("Redis", error, {
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
      });

      if (
        error.message.includes("WRONGPASS") ||
        error.message.includes("AUTH")
      ) {
        logger.redis.error(
          "Authentication Failed - Please check credentials in .env file",
        );
      }
      this.connected = false;
    }
  }

  // Setup periodic Redis health check
  setupHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Check Redis connection every 5 minutes
    this.healthCheckInterval = setInterval(
      async () => {
        try {
          if (!this.client || !this.connected) {
            logger.redis.warn("Health Check: Not connected");
            return;
          }

          // Perform a simple ping
          const pingResult = await this.client.ping();
          if (pingResult === "PONG") {
            logger.redis.debug("Health Check: Connection healthy");
          } else {
            logger.redis.warn("Health Check: Unexpected response");
          }
        } catch (error) {
          logger.redis.error(`Health Check Failed: ${error.message}`);
          this.connected = false;
        }
      },
      5 * 60 * 1000,
    ); // 5 minutes
  }

  // Get the current Redis connection status with detailed info
  getConnectionStatus() {
    const status = {
      connected: this.connected,
      enabled: isRedisEnabled(),
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
      lastChecked: new Date().toISOString(),
    };

    // Use the new connection status formatter
    logger.connection.status("Redis", status.connected, {
      enabled: status.enabled ? "Yes" : "No",
      host: status.host,
      port: status.port,
    });

    return status;
  }

  async get(key) {
    try {
      if (!this.connected) return null;
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.redis.error(`Get Error: ${error.message}`);
      return null;
    }
  }

  async set(key, value, expireTime = 3600) {
    try {
      if (!this.connected) return false;
      await this.client.setEx(key, expireTime, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.redis.error(`Set Error: ${error.message}`);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.connected) return false;
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.redis.error(`Delete Error: ${error.message}`);
      return false;
    }
  }

  async flush() {
    try {
      if (!this.connected) return false;
      await this.client.flushAll();
      return true;
    } catch (error) {
      logger.redis.error(`Flush Error: ${error.message}`);
      return false;
    }
  }
}

export default new Cache();
