import { createClient } from "redis";

import logger from "./logger.js";

class Cache {
  constructor() {
    this.client = null;
    this.connected = false;
    this.healthCheckInterval = null;
    this.init();
  }

  async init() {
    try {
      // Check if Redis is enabled
      if (process.env.REDIS_ENABLED !== "true") {
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

      // Create Redis client with proper authentication
      this.client = createClient({
        socket: {
          host: redisHost,
          port: redisPort,
        },
        password: process.env.REDIS_PASSWORD,
      });

      this.client.on("error", (err) => {
        logger.connection.error("Redis", err, {
          host: redisHost,
          port: redisPort,
        });
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

      await this.client.connect();

      // Setup periodic health check if Redis is enabled and connected
      if (process.env.REDIS_ENABLED === "true") {
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
      enabled: process.env.REDIS_ENABLED === "true",
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
