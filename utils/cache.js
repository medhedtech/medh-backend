import { createClient, createCluster } from "redis";
import logger from "./logger.js";

// Utility function to standardize Redis enabled checking across the application
export function isRedisEnabled() {
  // Get the raw value and trim any trailing comments
  const redisEnabledRaw = (process.env.REDIS_ENABLED || "").toLowerCase();

  // Split by any comment character and take only the first part
  const redisEnabled = redisEnabledRaw.split("#")[0].trim();

  return (
    redisEnabled === "true" || redisEnabled === "yes" || redisEnabled === "1"
  );
}

/**
 * Advanced Redis Cache Implementation with Connection Pooling and Clustering
 * Follows 2025 best practices for high-performance Redis operations
 */
class Cache {
  constructor() {
    this.client = null;
    this.cluster = null;
    this.connected = false;
    this.isCluster = false;
    this.connectionPool = [];
    this.poolSize = parseInt(process.env.REDIS_POOL_SIZE, 10) || 5;
    this.healthCheckInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts =
      parseInt(process.env.REDIS_MAX_RECONNECT_ATTEMPTS, 10) || 10;
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      operations: 0,
      connectionErrors: 0,
      lastError: null,
      uptime: Date.now(),
    };
    this.init();
  }

  async init() {
    try {
      // Debug the Redis enabled value
      const redisEnabledRaw = process.env.REDIS_ENABLED;
      logger.redis.debug("Redis enabled raw value:", {
        value: redisEnabledRaw,
        type: typeof redisEnabledRaw,
        length: redisEnabledRaw?.length,
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

      // Determine if we should use cluster mode
      this.isCluster = process.env.REDIS_CLUSTER_ENABLED === "true";

      if (this.isCluster) {
        await this.initCluster();
      } else {
        await this.initSingleNode();
      }

      // Setup periodic health check and cleanup
      this.setupHealthCheck();
      this.setupPeriodicCleanup();
    } catch (error) {
      this.handleInitError(error);
    }
  }

  /**
   * Initialize Redis cluster connection
   */
  async initCluster() {
    const clusterNodes = this.getClusterNodes();

    logger.redis.info(
      `Initializing Redis cluster with ${clusterNodes.length} nodes`,
    );

    this.cluster = createCluster({
      rootNodes: clusterNodes,
      useReplicas: true,
      defaults: {
        socket: {
          connectTimeout:
            parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 10000,
          commandTimeout:
            parseInt(process.env.REDIS_COMMAND_TIMEOUT, 10) || 5000,
          keepAlive: true,
          noDelay: true,
        },
        password: process.env.REDIS_PASSWORD || undefined,
        username: process.env.REDIS_USERNAME || undefined,
      },
      // Advanced cluster options for performance
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      scaleReads: "slave", // Use replicas for read operations
    });

    await this.setupClusterEventHandlers();
    await this.cluster.connect();
    this.connected = true;

    logger.redis.info("Redis cluster connection established successfully");
  }

  /**
   * Initialize single Redis node with connection pooling
   */
  async initSingleNode() {
    const redisHost = process.env.REDIS_HOST || "localhost";
    const redisPort = parseInt(process.env.REDIS_PORT, 10) || 6379;

    logger.redis.info(
      `Initializing Redis connection pool to ${redisHost}:${redisPort} with ${this.poolSize} connections`,
    );

    // Create connection pool for better performance
    const connectionPromises = [];

    for (let i = 0; i < this.poolSize; i++) {
      const client = createClient({
        socket: {
          host: redisHost,
          port: redisPort,
          connectTimeout:
            parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 30000,
          commandTimeout:
            parseInt(process.env.REDIS_COMMAND_TIMEOUT, 10) || 10000,
          lazyConnect: false, // Connect immediately for pool
          keepAlive: true,
          noDelay: true,
          // TCP_KEEPALIVE settings for better connection stability
          keepAliveInitialDelay: 10000,
        },
        password: process.env.REDIS_PASSWORD || undefined,
        username: process.env.REDIS_USERNAME || undefined,
        database: parseInt(process.env.REDIS_DATABASE, 10) || 0,

        // Advanced client options for performance
        pingInterval: parseInt(process.env.REDIS_PING_INTERVAL, 10) || 30000,
        enableAutoPipelining: true, // Automatic command pipelining for better performance

        // Connection retry strategy with exponential backoff
        retry: {
          retries: this.maxReconnectAttempts,
          factor: 2,
          minTimeout: 1000,
          maxTimeout: 30000,
          randomize: true,
        },
      });

      this.setupClientEventHandlers(client, i);
      connectionPromises.push(client.connect());
      this.connectionPool.push(client);
    }

    try {
      await Promise.all(connectionPromises);
      this.client = this.connectionPool[0]; // Primary client for simple operations
      this.connected = true;

      logger.redis.info(
        `Redis connection pool established successfully with ${this.poolSize} connections`,
      );
    } catch (connError) {
      this.handleConnectionError(connError);
    }
  }

  /**
   * Get cluster nodes from environment variables
   */
  getClusterNodes() {
    const nodesEnv = process.env.REDIS_CLUSTER_NODES;
    if (!nodesEnv) {
      throw new Error(
        "REDIS_CLUSTER_NODES environment variable is required for cluster mode",
      );
    }

    return nodesEnv.split(",").map((node) => {
      const [host, port] = node.trim().split(":");
      return {
        host: host || "localhost",
        port: parseInt(port, 10) || 6379,
      };
    });
  }

  /**
   * Setup event handlers for cluster
   */
  async setupClusterEventHandlers() {
    this.cluster.on("error", (err) => {
      this.stats.connectionErrors++;
      this.stats.lastError = err && err.message ? err.message : "Unknown error";
      this.handleConnectionError(err);
      this.connected = false;
    });

    this.cluster.on("connect", () => {
      logger.redis.info("Redis cluster connected successfully");
      this.connected = true;
      this.reconnectAttempts = 0;
    });

    this.cluster.on("ready", () => {
      logger.redis.info("Redis cluster ready for operations");
    });

    this.cluster.on("close", () => {
      logger.redis.warn("Redis cluster connection closed");
      this.connected = false;
    });

    this.cluster.on("reconnecting", () => {
      this.reconnectAttempts++;
      logger.redis.info(
        `Redis cluster reconnecting (attempt ${this.reconnectAttempts})`,
      );
    });

    this.cluster.on("node error", (err, node) => {
      logger.redis.error(
        `Redis cluster node error on ${node.host}:${node.port}`,
        { error: err && err.message ? err.message : "Unknown error" },
      );
    });
  }

  /**
   * Setup event handlers for individual client connections
   */
  setupClientEventHandlers(client, index) {
    client.on("error", (err) => {
      this.stats.connectionErrors++;
      this.stats.lastError = err && err.message ? err.message : "Unknown error";
      try {
        const errorMessage = err && err.message ? err.message : "Unknown error";
        logger.redis.error(`Redis client ${index} error: ${errorMessage}`, {
          stack: err && err.stack ? err.stack : "No stack trace available",
          code: err && err.code ? err.code : "Unknown code",
        });
      } catch (logError) {
        console.error("Error logging Redis error:", logError);
      }
      this.connected = false;
    });

    client.on("connect", () => {
      logger.redis.info(`Redis client ${index} connected successfully`);
      this.connected = true;
      this.reconnectAttempts = 0;
    });

    client.on("ready", () => {
      logger.redis.debug(`Redis client ${index} ready for operations`);
    });

    client.on("reconnecting", () => {
      this.reconnectAttempts++;
      logger.redis.info(
        `Redis client ${index} reconnecting (attempt ${this.reconnectAttempts})`,
      );
    });

    client.on("end", () => {
      logger.redis.warn(`Redis client ${index} connection ended`);
      this.connected = false;
    });
  }

  /**
   * Handle connection errors with intelligent retry logic
   */
  handleConnectionError(error) {
    const errorMessage =
      error && error.message ? error.message : "Unknown connection error";

    logger.redis.error(`Redis connection error: ${errorMessage}`, {
      stack: error && error.stack ? error.stack : "No stack trace",
      code: error && error.code ? error.code : "Unknown code",
      attempts: this.reconnectAttempts,
    });

    // Specific error handling
    if (errorMessage.includes("WRONGPASS") || errorMessage.includes("AUTH")) {
      logger.redis.error(
        "Redis authentication failed - Please check credentials in .env file",
      );
    } else if (errorMessage.includes("ECONNREFUSED")) {
      logger.redis.error("Redis connection refused - Is Redis server running?");
    } else if (errorMessage.includes("ETIMEDOUT")) {
      logger.redis.error(
        "Redis connection timeout - Check network connectivity",
      );
    }

    this.connected = false;

    // Don't throw error - allow application to continue without Redis
    logger.redis.warn(
      "Redis connection failed - application will continue without caching",
    );
  }

  /**
   * Handle initialization errors
   */
  handleInitError(error) {
    const errorMessage =
      error && error.message ? error.message : "Unknown initialization error";

    logger.redis.error(`Redis initialization failed: ${errorMessage}`, {
      stack: error && error.stack ? error.stack : "No stack trace",
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
    });

    this.connected = false;
    logger.redis.warn(
      "Redis initialization failed - application will continue without caching",
    );
  }

  /**
   * Get an available client from the pool (round-robin)
   */
  getClient() {
    if (this.isCluster && this.cluster) {
      return this.cluster;
    }

    if (!this.connected || this.connectionPool.length === 0) {
      return null;
    }

    // Simple round-robin selection
    const index = this.stats.operations % this.connectionPool.length;
    return this.connectionPool[index];
  }

  /**
   * Setup periodic health check with intelligent monitoring
   */
  setupHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Check Redis connection every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        if (!this.connected) {
          logger.redis.debug(
            "Health Check: Not connected, attempting reconnection",
          );
          await this.attemptReconnection();
          return;
        }

        const client = this.getClient();
        if (!client) {
          logger.redis.warn("Health Check: No available clients");
          return;
        }

        // Perform health check with timeout
        const pingPromise = client.ping();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Health check timeout")), 5000),
        );

        const pingResult = await Promise.race([pingPromise, timeoutPromise]);

        if (pingResult === "PONG") {
          logger.redis.debug("Health Check: Connection healthy");

          // Reset reconnect attempts on successful health check
          this.reconnectAttempts = 0;
        } else {
          logger.redis.warn("Health Check: Unexpected ping response", {
            response: pingResult,
          });
        }
      } catch (error) {
        this.stats.errors++;
        this.stats.lastError = error.message;
        logger.redis.error(`Health Check Failed: ${error.message}`);
        this.connected = false;

        // Attempt reconnection if we haven't exceeded max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          await this.attemptReconnection();
        }
      }
    }, 30000); // 30 seconds
  }

  /**
   * Setup periodic cleanup of expired keys and maintenance
   */
  setupPeriodicCleanup() {
    // Run cleanup every hour
    setInterval(async () => {
      try {
        if (!this.connected) return;

        const client = this.getClient();
        if (!client) return;

        // Get memory usage info
        const info = await client.info("memory");
        const memoryUsage = this.parseMemoryInfo(info);

        logger.redis.debug("Periodic cleanup - Memory usage:", memoryUsage);

        // If memory usage is high, trigger cleanup
        if (memoryUsage.usedMemoryRss > 100 * 1024 * 1024) {
          // 100MB threshold
          logger.redis.info("High memory usage detected, running cleanup");

          // For single node, we can run FLUSHDB on expired keys
          // For cluster, this needs to be more careful
          if (!this.isCluster) {
            await client.eval(
              `
              local keys = redis.call('keys', '*')
              local expired = 0
              for i=1,#keys do
                local ttl = redis.call('ttl', keys[i])
                if ttl == -1 then
                  -- Key exists but has no expiration, check if it's old
                  local keyType = redis.call('type', keys[i])
                  if keyType.ok == 'string' then
                    local len = redis.call('strlen', keys[i])
                    if len > 1000000 then -- 1MB threshold for cleanup
                      redis.call('expire', keys[i], 3600) -- Set 1 hour expiry
                      expired = expired + 1
                    end
                  end
                end
              end
              return expired
            `,
              0,
            );
          }
        }
      } catch (error) {
        logger.redis.error("Periodic cleanup error:", { error: error.message });
      }
    }, 3600000); // 1 hour
  }

  /**
   * Parse Redis memory info
   */
  parseMemoryInfo(info) {
    const lines = info.split("\r\n");
    const memInfo = {};

    lines.forEach((line) => {
      if (line.startsWith("used_memory:")) {
        memInfo.usedMemory = parseInt(line.split(":")[1]);
      } else if (line.startsWith("used_memory_rss:")) {
        memInfo.usedMemoryRss = parseInt(line.split(":")[1]);
      } else if (line.startsWith("maxmemory:")) {
        memInfo.maxMemory = parseInt(line.split(":")[1]);
      }
    });

    return memInfo;
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  async attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.redis.error("Max reconnection attempts reached, giving up");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    logger.redis.info(
      `Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    setTimeout(async () => {
      try {
        if (this.isCluster) {
          await this.cluster.connect();
        } else {
          const reconnectPromises = this.connectionPool.map((client) => {
            if (!client.isOpen) {
              return client.connect();
            }
            return Promise.resolve();
          });
          await Promise.all(reconnectPromises);
        }

        this.connected = true;
        logger.redis.info("Reconnection successful");
      } catch (error) {
        logger.redis.error("Reconnection failed:", { error: error.message });
        // Will retry on next health check
      }
    }, delay);
  }

  // Get the current Redis connection status with detailed info
  getConnectionStatus() {
    const uptime = Date.now() - this.stats.uptime;
    const hitRate =
      this.stats.operations > 0
        ? ((this.stats.hits / this.stats.operations) * 100).toFixed(2)
        : 0;

    const status = {
      connected: this.connected,
      enabled: isRedisEnabled(),
      isCluster: this.isCluster,
      poolSize: this.isCluster ? "N/A" : this.connectionPool.length,
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
      uptime: Math.floor(uptime / 1000), // seconds
      reconnectAttempts: this.reconnectAttempts,
      stats: {
        ...this.stats,
        hitRate: `${hitRate}%`,
        uptime: `${Math.floor(uptime / 1000)}s`,
      },
      lastChecked: new Date().toISOString(),
    };

    // Use the new connection status formatter
    logger.connection.status("Redis", status.connected, {
      enabled: status.enabled ? "Yes" : "No",
      mode: status.isCluster ? "Cluster" : "Single Node",
      host: status.host,
      port: status.port,
      poolSize: status.poolSize,
      hitRate: status.stats.hitRate,
    });

    return status;
  }

  /**
   * Advanced get with automatic retry and fallback
   */
  async get(key) {
    this.stats.operations++;

    try {
      if (!this.connected) {
        this.stats.misses++;
        return null;
      }

      const client = this.getClient();
      if (!client) {
        this.stats.misses++;
        return null;
      }

      const value = await client.get(key);

      if (value) {
        this.stats.hits++;
        try {
          return JSON.parse(value);
        } catch (parseError) {
          // If JSON parsing fails, return the raw value
          logger.redis.warn(`JSON parse error for key ${key}:`, {
            error: parseError.message,
          });
          return value;
        }
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      logger.redis.error(`Get error for key ${key}:`, { error: error.message });
      return null;
    }
  }

  /**
   * Advanced set with automatic retry and pipelining support
   */
  async set(key, value, expireTime = 3600) {
    this.stats.operations++;

    try {
      if (!this.connected) return false;

      const client = this.getClient();
      if (!client) return false;

      let serializedValue;
      try {
        serializedValue =
          typeof value === "string" ? value : JSON.stringify(value);
      } catch (serializeError) {
        logger.redis.error(`Serialization error for key ${key}:`, {
          error: serializeError.message,
        });
        return false;
      }

      // Use SETEX for better performance (atomic set with expiration)
      await client.setEx(key, expireTime, serializedValue);
      return true;
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      logger.redis.error(`Set error for key ${key}:`, { error: error.message });
      return false;
    }
  }

  /**
   * Advanced multi-get with pipelining
   */
  async mget(keys) {
    this.stats.operations += keys.length;

    try {
      if (!this.connected || keys.length === 0) {
        this.stats.misses += keys.length;
        return {};
      }

      const client = this.getClient();
      if (!client) {
        this.stats.misses += keys.length;
        return {};
      }

      const values = await client.mGet(keys);
      const result = {};

      keys.forEach((key, index) => {
        const value = values[index];
        if (value) {
          this.stats.hits++;
          try {
            result[key] = JSON.parse(value);
          } catch (parseError) {
            result[key] = value;
          }
        } else {
          this.stats.misses++;
          result[key] = null;
        }
      });

      return result;
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      logger.redis.error(`Multi-get error:`, { error: error.message, keys });
      return {};
    }
  }

  /**
   * Advanced multi-set with pipelining
   */
  async mset(keyValuePairs, expireTime = 3600) {
    const keys = Object.keys(keyValuePairs);
    this.stats.operations += keys.length;

    try {
      if (!this.connected || keys.length === 0) return false;

      const client = this.getClient();
      if (!client) return false;

      // Prepare data for MSET
      const msetData = [];
      keys.forEach((key) => {
        const value = keyValuePairs[key];
        const serializedValue =
          typeof value === "string" ? value : JSON.stringify(value);
        msetData.push(key, serializedValue);
      });

      // Use pipeline for better performance
      const pipeline = client.multi();
      pipeline.mSet(msetData);

      // Set expiration for each key
      keys.forEach((key) => {
        pipeline.expire(key, expireTime);
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      logger.redis.error(`Multi-set error:`, { error: error.message, keys });
      return false;
    }
  }

  async del(key) {
    this.stats.operations++;

    try {
      if (!this.connected) return false;

      const client = this.getClient();
      if (!client) return false;

      await client.del(key);
      return true;
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      logger.redis.error(`Delete error for key ${key}:`, {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Advanced flush with safety checks
   */
  async flush() {
    try {
      if (!this.connected) return false;

      const client = this.getClient();
      if (!client) return false;

      if (this.isCluster) {
        // For cluster, we need to flush all nodes
        await client.flushAll();
      } else {
        // For single node, use FLUSHDB to only flush current database
        await client.flushDb();
      }

      // Reset stats
      this.stats.hits = 0;
      this.stats.misses = 0;
      this.stats.operations = 0;

      return true;
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      logger.redis.error(`Flush error:`, { error: error.message });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.uptime;
    const hitRate =
      this.stats.operations > 0
        ? ((this.stats.hits / this.stats.operations) * 100).toFixed(2)
        : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      uptime: Math.floor(uptime / 1000), // seconds
      connected: this.connected,
      poolSize: this.isCluster ? "cluster" : this.connectionPool.length,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.redis.info("Shutting down Redis cache...");

    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    try {
      if (this.isCluster && this.cluster) {
        await this.cluster.quit();
      } else {
        // Close all connections in the pool
        await Promise.all(this.connectionPool.map((client) => client.quit()));
      }

      this.connected = false;
      logger.redis.info("Redis cache shutdown completed");
    } catch (error) {
      logger.redis.error("Error during Redis shutdown:", {
        error: error.message,
      });
    }
  }
}

export default new Cache();
