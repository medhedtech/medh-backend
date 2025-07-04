import cron from 'node-cron';
import axios from 'axios';
import logger from '../utils/logger.js';
import ENV_VARS from '../config/env.js';

/**
 * Cron job to execute scheduled course publishing
 * Runs every 5 minutes to check for courses that need to be published
 */
const schedulePublishCron = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      logger.info('Running scheduled publish cron job...');
      
      const baseUrl = ENV_VARS.BASE_URL || 'http://localhost:3000';
      const endpoint = `${baseUrl}/api/courses/execute-scheduled-publishes`;
      
      // Make request to execute scheduled publishes
      const response = await axios.post(endpoint, {}, {
        headers: {
          'Content-Type': 'application/json',
          // Add admin token if required
          'Authorization': `Bearer ${ENV_VARS.ADMIN_TOKEN || ''}`,
        },
        timeout: 30000, // 30 second timeout
      });
      
      if (response.data.success) {
        const { publishedCount, failedCount } = response.data.data;
        
        if (publishedCount > 0 || failedCount > 0) {
          logger.info(`Scheduled publish cron completed: ${publishedCount} published, ${failedCount} failed`);
        } else {
          logger.debug('Scheduled publish cron completed: No courses ready for publishing');
        }
      } else {
        logger.warn('Scheduled publish cron returned unsuccessful response:', response.data);
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        logger.warn('Scheduled publish cron: Server not available');
      } else if (error.response) {
        logger.error('Scheduled publish cron failed:', {
          status: error.response.status,
          message: error.response.data?.message || error.message,
        });
      } else {
        logger.error('Scheduled publish cron error:', error.message);
      }
    }
  });
  
  logger.info('Scheduled publish cron job initialized - runs every 5 minutes');
};

/**
 * Alternative direct database approach (if API approach is not preferred)
 */
const schedulePublishCronDirect = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      logger.info('Running scheduled publish cron job (direct DB)...');
      
      // Import Course model dynamically to avoid circular dependencies
      const { default: Course } = await import('../models/course-model.js');
      
      const now = new Date();
      
      // Find courses that are scheduled to be published and past their publish date
      const coursesToPublish = await Course.find({
        scheduledPublishDate: { $lte: now },
        status: { $ne: 'Published' }
      });

      if (coursesToPublish.length === 0) {
        logger.debug('Scheduled publish cron: No courses ready for publishing');
        return;
      }

      const publishResults = [];
      
      for (const course of coursesToPublish) {
        try {
          // Update course status to Published and remove scheduling fields
          await Course.findByIdAndUpdate(
            course._id,
            {
              $set: {
                status: 'Published',
                'meta.lastUpdated': new Date()
              },
              $unset: {
                scheduledPublishDate: 1,
                scheduledPublishTimezone: 1
              }
            },
            { new: true, runValidators: true }
          );

          publishResults.push({
            courseId: course._id,
            title: course.course_title,
            success: true
          });

          logger.info(`Course ${course._id} (${course.course_title}) published successfully via scheduled publishing`);
        } catch (error) {
          publishResults.push({
            courseId: course._id,
            title: course.course_title,
            error: error.message,
            success: false
          });

          logger.error(`Failed to publish course ${course._id}: ${error.message}`);
        }
      }

      const successCount = publishResults.filter(result => result.success).length;
      const failureCount = publishResults.filter(result => !result.success).length;

      logger.info(`Scheduled publish cron completed: ${successCount} published, ${failureCount} failed`);
      
    } catch (error) {
      logger.error('Scheduled publish cron error (direct DB):', error.message);
    }
  });
  
  logger.info('Scheduled publish cron job (direct DB) initialized - runs every 5 minutes');
};

export { schedulePublishCron, schedulePublishCronDirect };
export default schedulePublishCron; 