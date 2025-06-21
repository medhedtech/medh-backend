import cron from 'node-cron';
import moment from 'moment';
import mongoose from 'mongoose';

import logger from '../utils/logger.js';
import emailService from '../services/emailService.js';
import { Course, Batch } from '../models/course-model.js';
import Enrollment from '../models/enrollment-model.js';
import User from '../models/user-modal.js';

/**
 * Session Reminder Cron Job
 * Sends email reminders for upcoming sessions at different intervals:
 * - 1 week before
 * - 1 day before  
 * - 2 hours before
 * - 30 minutes before
 */

class SessionReminderService {
  constructor() {
    this.reminderIntervals = [
      { name: '1_week', minutes: 10080, label: '1 week' },      // 7 * 24 * 60
      { name: '1_day', minutes: 1440, label: '1 day' },        // 24 * 60
      { name: '2_hours', minutes: 120, label: '2 hours' },     // 2 * 60
      { name: '30_minutes', minutes: 30, label: '30 minutes' }
    ];
    
    // Track sent reminders to avoid duplicates
    this.sentReminders = new Set();
  }

  /**
   * Initialize cron jobs for different reminder intervals
   */
  initializeReminderCrons() {
    // Run every 15 minutes for 1 week and 1 day reminders
    cron.schedule('*/15 * * * *', () => {
      this.processReminders(['1_week', '1_day']);
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    // Run every 5 minutes for 2 hours reminder
    cron.schedule('*/5 * * * *', () => {
      this.processReminders(['2_hours']);
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    // Run every minute for 30 minutes reminder
    cron.schedule('* * * * *', () => {
      this.processReminders(['30_minutes']);
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    logger.info('Session reminder cron jobs initialized');
  }

  /**
   * Process reminders for specified intervals
   */
  async processReminders(intervalNames) {
    try {
      const now = moment().utc();
      
      for (const intervalName of intervalNames) {
        const interval = this.reminderIntervals.find(i => i.name === intervalName);
        if (!interval) continue;

        const targetTime = moment(now).add(interval.minutes, 'minutes');
        
        await this.sendRemindersForInterval(interval, targetTime);
      }
    } catch (error) {
      logger.error('Error processing session reminders:', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Send reminders for a specific interval
   */
  async sendRemindersForInterval(interval, targetTime) {
    try {
      // Find all active batches with upcoming sessions
      const batches = await Batch.find({
        status: { $in: ['active', 'Active', 'Upcoming'] },
        'schedule.0': { $exists: true } // Has at least one scheduled session
      })
      .populate('assigned_instructor', 'full_name email')
      .lean();

      for (const batch of batches) {
        await this.processBatchSessions(batch, interval, targetTime);
      }

      logger.debug(`Processed ${interval.label} reminders for ${batches.length} batches`);
    } catch (error) {
      logger.error(`Error processing ${interval.label} reminders:`, {
        error: error.message
      });
    }
  }

  /**
   * Process sessions for a specific batch
   */
  async processBatchSessions(batch, interval, targetTime) {
    if (!batch.schedule || batch.schedule.length === 0) return;

    // Filter sessions that match our target time window
    const upcomingSessions = batch.schedule.filter(session => {
      if (!session.date) return false;

      const sessionDateTime = moment(session.date).utc();
      const [hours, minutes] = session.start_time.split(':').map(Number);
      sessionDateTime.hours(hours).minutes(minutes).seconds(0).milliseconds(0);

      // Check if session is within our reminder window (±5 minutes for flexibility)
      const timeDiff = sessionDateTime.diff(targetTime, 'minutes');
      return Math.abs(timeDiff) <= 5 && sessionDateTime.isAfter(moment().utc());
    });

    if (upcomingSessions.length === 0) return;

    // Get enrolled students for this batch
    const enrollments = await Enrollment.find({
      batch: batch._id,
      status: 'active'
    })
    .populate('student', 'full_name email preferences.timezone preferences.email_notifications')
    .lean();

    // Send reminders for each upcoming session
    for (const session of upcomingSessions) {
      await this.sendSessionReminders(batch, session, enrollments, interval);
    }
  }

  /**
   * Send reminder emails for a specific session
   */
  async sendSessionReminders(batch, session, enrollments, interval) {
    const sessionDateTime = moment(session.date).utc();
    const [hours, minutes] = session.start_time.split(':').map(Number);
    sessionDateTime.hours(hours).minutes(minutes).seconds(0).milliseconds(0);

    const reminderKey = `${batch._id}_${session._id}_${interval.name}_${sessionDateTime.format('YYYY-MM-DD-HH-mm')}`;
    
    // Prevent duplicate reminders
    if (this.sentReminders.has(reminderKey)) {
      return;
    }

    const emailPromises = enrollments
      .filter(enrollment => enrollment.student && enrollment.student.email)
      .filter(enrollment => {
        // Check if user has email notifications enabled
        const emailNotifications = enrollment.student.preferences?.email_notifications;
        return emailNotifications !== false; // Default to true if not set
      })
      .map(enrollment => 
        this.sendReminderEmail(
          enrollment.student,
          batch,
          session,
          sessionDateTime,
          interval
        )
      );

    const results = await Promise.allSettled(emailPromises);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    if (successCount > 0) {
      this.sentReminders.add(reminderKey);
      
      logger.info(`Session reminder sent: ${interval.label}`, {
        batchId: batch._id,
        batchName: batch.batch_name,
        sessionDate: sessionDateTime.format('YYYY-MM-DD HH:mm'),
        successCount,
        failureCount,
        interval: interval.label
      });
    }

    if (failureCount > 0) {
      logger.warn(`Some session reminders failed`, {
        batchId: batch._id,
        failureCount,
        interval: interval.label
      });
    }
  }

  /**
   * Send individual reminder email
   */
  async sendReminderEmail(student, batch, session, sessionDateTime, interval) {
    try {
      const userTimezone = student.preferences?.timezone || 'UTC';
      const localSessionTime = sessionDateTime.clone().tz(userTimezone);
      
      const sessionEndDateTime = localSessionTime.clone();
      const [endHours, endMinutes] = session.end_time.split(':').map(Number);
      sessionEndDateTime.hours(endHours).minutes(endMinutes);

      const emailData = {
        student_name: student.full_name,
        email: student.email,
        
        // Session details
        session_title: session.title || `${batch.batch_name} Session`,
        session_description: session.description || '',
        session_date: localSessionTime.format('dddd, MMMM Do, YYYY'),
        session_time: localSessionTime.format('h:mm A'),
        session_end_time: sessionEndDateTime.format('h:mm A'),
        session_duration: sessionEndDateTime.diff(localSessionTime, 'minutes'),
        timezone: userTimezone,
        
        // Batch details
        batch_name: batch.batch_name,
        batch_code: batch.batch_code,
        instructor_name: batch.assigned_instructor?.full_name || 'TBD',
        instructor_email: batch.assigned_instructor?.email,
        
        // Meeting details
        meeting_url: session.zoom_meeting?.join_url,
        meeting_id: session.zoom_meeting?.meeting_id,
        meeting_password: session.zoom_meeting?.password,
        
        // Reminder details
        reminder_interval: interval.label,
        is_urgent: interval.name === '30_minutes' || interval.name === '2_hours',
        time_until_session: this.formatTimeUntilSession(sessionDateTime),
        
        // Action URLs
        join_url: session.zoom_meeting?.join_url || `${process.env.FRONTEND_URL}/dashboard/sessions`,
        calendar_url: this.generateCalendarUrl(session, batch, sessionDateTime),
        dashboard_url: `${process.env.FRONTEND_URL}/dashboard`,
        
        // Additional context
        current_year: new Date().getFullYear(),
        support_email: process.env.SUPPORT_EMAIL || 'support@medh.co'
      };

      const subject = this.generateSubject(interval, batch.batch_name, localSessionTime);

      await emailService.sendTemplatedEmail(
        student.email,
        'session-reminder',
        subject,
        emailData
      );

      return { success: true, studentEmail: student.email };
    } catch (error) {
      logger.error('Failed to send session reminder email:', {
        error: error.message,
        studentId: student._id,
        studentEmail: student.email,
        batchId: batch._id,
        sessionId: session._id
      });
      throw error;
    }
  }

  /**
   * Generate email subject based on reminder interval
   */
  generateSubject(interval, batchName, sessionDateTime) {
    const timeStr = sessionDateTime.format('MMM Do [at] h:mm A');
    
    switch (interval.name) {
      case '1_week':
        return `📅 Upcoming Session Next Week - ${batchName} on ${timeStr}`;
      case '1_day':
        return `⏰ Session Tomorrow - ${batchName} on ${timeStr}`;
      case '2_hours':
        return `🚀 Session Starting Soon - ${batchName} in 2 Hours`;
      case '30_minutes':
        return `🔔 Join Now - ${batchName} Session Starting in 30 Minutes`;
      default:
        return `📚 Session Reminder - ${batchName} on ${timeStr}`;
    }
  }

  /**
   * Format time until session in human readable format
   */
  formatTimeUntilSession(sessionDateTime) {
    const now = moment().utc();
    const duration = moment.duration(sessionDateTime.diff(now));
    
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Generate calendar URL for adding session to calendar
   */
  generateCalendarUrl(session, batch, sessionDateTime) {
    const title = encodeURIComponent(`${batch.batch_name} Session`);
    const details = encodeURIComponent(
      `Join your ${batch.batch_name} session.\n\n` +
      `Meeting URL: ${session.zoom_meeting?.join_url || 'TBD'}\n` +
      `Meeting ID: ${session.zoom_meeting?.meeting_id || 'TBD'}\n` +
      `Password: ${session.zoom_meeting?.password || 'TBD'}`
    );
    
    const startTime = sessionDateTime.format('YYYYMMDDTHHmmss') + 'Z';
    const endDateTime = sessionDateTime.clone();
    const [endHours, endMinutes] = session.end_time.split(':').map(Number);
    endDateTime.hours(endHours).minutes(endMinutes);
    const endTime = endDateTime.format('YYYYMMDDTHHmmss') + 'Z';
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}`;
  }

  /**
   * Cleanup old sent reminder keys (run daily)
   */
  cleanupSentReminders() {
    cron.schedule('0 2 * * *', () => {
      // Clear reminders older than 7 days
      this.sentReminders.clear();
      logger.info('Cleaned up old session reminder keys');
    });
  }

  /**
   * Get reminder statistics
   */
  async getReminderStats(days = 7) {
    try {
      const startDate = moment().subtract(days, 'days').startOf('day');
      const endDate = moment().endOf('day');

      // This would require a separate collection to track sent reminders
      // For now, return basic info
      return {
        active_reminders_in_memory: this.sentReminders.size,
        period: `${days} days`,
        cron_jobs_active: 4,
        next_cleanup: moment().add(1, 'day').hour(2).minute(0).format()
      };
    } catch (error) {
      logger.error('Error getting reminder stats:', error);
      throw error;
    }
  }
}

// Create service instance
const sessionReminderService = new SessionReminderService();

// Initialize cron jobs
const initializeSessionReminderCrons = () => {
  try {
    sessionReminderService.initializeReminderCrons();
    sessionReminderService.cleanupSentReminders();
    
    logger.info('✅ Session reminder cron jobs initialized successfully');
    logger.info('📅 Reminder intervals:', sessionReminderService.reminderIntervals.map(i => i.label).join(', '));
  } catch (error) {
    logger.error('❌ Failed to initialize session reminder crons:', error);
  }
};

export { sessionReminderService, initializeSessionReminderCrons };
export default initializeSessionReminderCrons; 