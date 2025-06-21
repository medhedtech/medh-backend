import express from 'express';
import SessionReminderController from '../controllers/sessionReminderController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Session Reminder Management Routes
 * All routes require authentication and admin/instructor permissions
 */

// Health check endpoint (no auth required)
router.get('/health', SessionReminderController.healthCheck);

// Get reminder statistics
router.get('/stats', 
  authenticateToken,
  authorize(['admin', 'super-admin', 'instructor']),
  SessionReminderController.getStats
);

// Get upcoming sessions that will receive reminders
router.get('/upcoming',
  authenticateToken,
  authorize(['admin', 'super-admin', 'instructor']),
  SessionReminderController.getUpcomingSessions
);

// Manually trigger reminder for a specific session
router.post('/trigger',
  authenticateToken,
  authorize(['admin', 'super-admin']),
  SessionReminderController.triggerReminder
);

export default router; 