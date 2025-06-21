import { sessionReminderService } from '../cronjob/session-reminder-cron.js';
import logger from '../utils/logger.js';
import catchAsync from '../utils/catchAsync.js';
import { Course, Batch } from '../models/course-model.js';
import Enrollment from '../models/enrollment-model.js';
import User from '../models/user-modal.js';
import moment from 'moment';

/**
 * Session Reminder Management Controller
 * Provides endpoints for monitoring and managing session reminders
 */

class SessionReminderController {
  /**
   * Get session reminder statistics
   * GET /api/v1/session-reminders/stats
   */
  static getStats = catchAsync(async (req, res) => {
    const stats = await sessionReminderService.getReminderStats();
    
    // Get additional system stats
    const systemStats = await SessionReminderController.getSystemStats();
    
    res.status(200).json({
      success: true,
      message: 'Session reminder statistics retrieved successfully',
      data: {
        ...stats,
        system: systemStats,
        intervals: sessionReminderService.reminderIntervals,
        timestamp: new Date().toISOString()
      }
    });
  });

  /**
   * Get upcoming sessions that will receive reminders
   * GET /api/v1/session-reminders/upcoming
   */
  static getUpcomingSessions = catchAsync(async (req, res) => {
    const { days_ahead = 7, limit = 50 } = req.query;
    
    const now = moment().utc();
    const endDate = moment().add(parseInt(days_ahead), 'days').utc();
    
    // Find all active batches with sessions in the time range
    const batches = await Batch.find({
      status: { $in: ['active', 'Active', 'Upcoming'] },
      'schedule.0': { $exists: true }
    })
    .populate('assigned_instructor', 'full_name email')
    .lean();

    const upcomingSessions = [];
    
    for (const batch of batches) {
      if (!batch.schedule) continue;
      
      for (const session of batch.schedule) {
        if (!session.date) continue;
        
        const sessionDateTime = moment(session.date).utc();
        const [hours, minutes] = session.start_time.split(':').map(Number);
        sessionDateTime.hours(hours).minutes(minutes).seconds(0).milliseconds(0);
        
        if (sessionDateTime.isAfter(now) && sessionDateTime.isBefore(endDate)) {
          // Get enrollment count
          const enrollmentCount = await Enrollment.countDocuments({
            batch: batch._id,
            status: 'active'
          });
          
          // Calculate which reminders will be sent
          const remindersToSend = [];
          for (const interval of sessionReminderService.reminderIntervals) {
            const reminderTime = sessionDateTime.clone().subtract(interval.minutes, 'minutes');
            if (reminderTime.isAfter(now)) {
              remindersToSend.push({
                interval: interval.label,
                send_at: reminderTime.toISOString()
              });
            }
          }
          
          upcomingSessions.push({
            session_id: session._id,
            batch_id: batch._id,
            batch_name: batch.batch_name,
            batch_code: batch.batch_code,
            session_title: session.title || `${batch.batch_name} Session`,
            session_date: sessionDateTime.toISOString(),
            session_time: session.start_time,
            session_end_time: session.end_time,
            instructor: batch.assigned_instructor,
            enrolled_students: enrollmentCount,
            has_meeting_link: !!session.zoom_meeting?.join_url,
            time_until_session: sessionDateTime.from(now),
            reminders_to_send: remindersToSend
          });
        }
      }
    }
    
    // Sort by session date
    upcomingSessions.sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
    
    const limitedSessions = upcomingSessions.slice(0, parseInt(limit));
    
    res.status(200).json({
      success: true,
      message: 'Upcoming sessions retrieved successfully',
      data: {
        sessions: limitedSessions,
        count: limitedSessions.length,
        total_upcoming: upcomingSessions.length,
        search_period: {
          from: now.toISOString(),
          to: endDate.toISOString(),
          days_ahead: parseInt(days_ahead)
        }
      }
    });
  });

  /**
   * Manually trigger reminders for a specific session
   * POST /api/v1/session-reminders/trigger
   */
  static triggerReminder = catchAsync(async (req, res) => {
    const { batch_id, session_id, reminder_interval } = req.body;
    
    if (!batch_id || !session_id || !reminder_interval) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: batch_id, session_id, reminder_interval'
      });
    }
    
    // Find the batch and session
    const batch = await Batch.findById(batch_id)
      .populate('assigned_instructor', 'full_name email')
      .lean();
      
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }
    
    const session = batch.schedule.find(s => s._id.toString() === session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Find the interval
    const interval = sessionReminderService.reminderIntervals.find(i => i.name === reminder_interval);
    if (!interval) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reminder interval',
        valid_intervals: sessionReminderService.reminderIntervals.map(i => i.name)
      });
    }
    
    // Get enrolled students
    const enrollments = await Enrollment.find({
      batch: batch._id,
      status: 'active'
    })
    .populate('student', 'full_name email preferences.timezone preferences.email_notifications')
    .lean();
    
    if (enrollments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active enrollments found for this batch'
      });
    }
    
    try {
      // Send reminders manually
      await sessionReminderService.sendSessionReminders(batch, session, enrollments, interval);
      
      res.status(200).json({
        success: true,
        message: `Manual reminder sent successfully`,
        data: {
          batch_name: batch.batch_name,
          session_title: session.title || `${batch.batch_name} Session`,
          reminder_interval: interval.label,
          recipients_count: enrollments.length,
          triggered_by: req.user?.full_name || 'Admin',
          triggered_at: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to send manual reminder:', {
        error: error.message,
        batch_id,
        session_id,
        reminder_interval
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to send manual reminder',
        error: error.message
      });
    }
  });

  /**
   * Get system statistics for the reminder service
   */
  static async getSystemStats() {
    try {
      const now = moment().utc();
      const nextWeek = moment().add(7, 'days').utc();
      
      // Count active batches with sessions
      const activeBatchesWithSessions = await Batch.countDocuments({
        status: { $in: ['active', 'Active', 'Upcoming'] },
        'schedule.0': { $exists: true }
      });
      
      // Count upcoming sessions in the next week
      const batches = await Batch.find({
        status: { $in: ['active', 'Active', 'Upcoming'] },
        'schedule.0': { $exists: true }
      }).lean();
      
      let upcomingSessionsCount = 0;
      let studentsToNotify = 0;
      
      for (const batch of batches) {
        if (!batch.schedule) continue;
        
        for (const session of batch.schedule) {
          if (!session.date) continue;
          
          const sessionDateTime = moment(session.date).utc();
          const [hours, minutes] = session.start_time.split(':').map(Number);
          sessionDateTime.hours(hours).minutes(minutes);
          
          if (sessionDateTime.isAfter(now) && sessionDateTime.isBefore(nextWeek)) {
            upcomingSessionsCount++;
            
            // Count active enrollments for this batch
            const enrollmentCount = await Enrollment.countDocuments({
              batch: batch._id,
              status: 'active'
            });
            studentsToNotify += enrollmentCount;
          }
        }
      }
      
      return {
        active_batches_with_sessions: activeBatchesWithSessions,
        upcoming_sessions_next_week: upcomingSessionsCount,
        students_to_notify: studentsToNotify,
        cron_jobs_running: 4, // Number of cron schedules we have
        last_stats_update: now.toISOString()
      };
    } catch (error) {
      logger.error('Error getting system stats:', error);
      return {
        error: 'Failed to retrieve system stats',
        error_message: error.message
      };
    }
  }

  /**
   * Health check for the reminder service
   * GET /api/v1/session-reminders/health
   */
  static healthCheck = catchAsync(async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'session-reminder',
      version: '1.0.0',
      checks: {
        database: 'unknown',
        email_service: 'unknown',
        cron_jobs: 'running'
      }
    };
    
    try {
      // Check database connectivity
      const testQuery = await Batch.findOne().lean();
      health.checks.database = testQuery ? 'connected' : 'empty';
    } catch (error) {
      health.checks.database = 'error';
      health.status = 'degraded';
    }
    
    try {
      // Check email service
      const emailService = (await import('../services/emailService.js')).default;
      const queueStats = await emailService.getQueueStats();
      health.checks.email_service = queueStats.enabled ? 'enabled' : 'disabled';
    } catch (error) {
      health.checks.email_service = 'error';
      health.status = 'degraded';
    }
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status === 'healthy',
      message: `Session reminder service is ${health.status}`,
      data: health
    });
  });
}

export default SessionReminderController; 