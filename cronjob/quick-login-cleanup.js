import cron from 'node-cron';
import User from '../models/user-modal.js';
import logger from '../utils/logger.js';

/**
 * Quick Login Cleanup Cron Job
 * Removes expired quick login keys to keep the database clean
 * Runs every 5 minutes to clean up keys that have expired
 */

class QuickLoginCleanupService {
  constructor() {
    this.lastCleanupTime = null;
    this.totalCleaned = 0;
    this.cleanupRuns = 0;
  }

  /**
   * Initialize the cleanup cron job
   */
  initializeCleanupCron() {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.cleanupExpiredKeys();
      } catch (error) {
        logger.error('Quick login cleanup cron error:', error);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    logger.info('✅ Quick login cleanup cron job initialized - runs every 5 minutes');
  }

  /**
   * Clean up expired quick login keys
   */
  async cleanupExpiredKeys() {
    try {
      const startTime = Date.now();
      logger.debug('🔄 Starting quick login cleanup...');

      // Find users with expired quick login keys
      const users = await User.find({
        'quick_login_keys.expires_at': { $lt: new Date() }
      });

      if (users.length === 0) {
        logger.debug('Quick login cleanup: No expired keys found');
        return;
      }

      let totalCleaned = 0;
      let processedUsers = 0;

      for (const user of users) {
        try {
          const originalLength = user.quick_login_keys.length;
          user.cleanupExpiredQuickLoginKeys();
          
          if (user.quick_login_keys.length !== originalLength) {
            await user.save();
            totalCleaned += originalLength - user.quick_login_keys.length;
            processedUsers++;
          }
        } catch (userError) {
          logger.error(`Error cleaning up keys for user ${user.email}:`, userError);
        }
      }

      const duration = Date.now() - startTime;
      this.totalCleaned += totalCleaned;
      this.cleanupRuns++;
      this.lastCleanupTime = new Date();

      if (totalCleaned > 0) {
        logger.info(`✅ Quick login cleanup completed: ${totalCleaned} keys removed from ${processedUsers} users (${duration}ms)`);
      } else {
        logger.debug(`Quick login cleanup completed: No keys to remove (${duration}ms)`);
      }

    } catch (error) {
      logger.error('Quick login cleanup error:', error);
      throw error;
    }
  }

  /**
   * Get cleanup statistics
   */
  getStats() {
    return {
      lastCleanupTime: this.lastCleanupTime,
      totalCleaned: this.totalCleaned,
      cleanupRuns: this.cleanupRuns,
      averageCleanedPerRun: this.cleanupRuns > 0 ? Math.round(this.totalCleaned / this.cleanupRuns) : 0
    };
  }

  /**
   * Manual cleanup trigger
   */
  async manualCleanup() {
    logger.info('🔄 Manual quick login cleanup triggered...');
    await this.cleanupExpiredKeys();
    return this.getStats();
  }
}

// Create service instance
const quickLoginCleanupService = new QuickLoginCleanupService();

// Initialize cron job
const initializeQuickLoginCleanupCron = () => {
  try {
    quickLoginCleanupService.initializeCleanupCron();
    logger.info('✅ Quick login cleanup cron job initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize quick login cleanup cron:', error);
  }
};

export { quickLoginCleanupService, initializeQuickLoginCleanupCron };

