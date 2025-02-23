const { createClient } = require('redis');
const logger = require('./logger');

class Cache {
  constructor() {
    this.client = null;
    this.connected = false;
    this.init();
  }

  async init() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        this.connected = true;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Redis Connection Error:', error);
      this.connected = false;
    }
  }

  async get(key) {
    try {
      if (!this.connected) return null;
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis Get Error:', error);
      return null;
    }
  }

  async set(key, value, expireTime = 3600) {
    try {
      if (!this.connected) return false;
      await this.client.setEx(key, expireTime, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis Set Error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.connected) return false;
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis Delete Error:', error);
      return false;
    }
  }

  async flush() {
    try {
      if (!this.connected) return false;
      await this.client.flushAll();
      return true;
    } catch (error) {
      logger.error('Redis Flush Error:', error);
      return false;
    }
  }
}

module.exports = new Cache(); 