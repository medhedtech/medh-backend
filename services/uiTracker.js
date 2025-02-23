const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class UITracker {
  constructor() {
    this.activities = new Map();
    this.sessions = new Map();
  }

  trackPageView(data) {
    const activityId = uuidv4();
    const timestamp = new Date().toISOString();

    const pageView = {
      type: 'PAGE_VIEW',
      activityId,
      timestamp,
      ...data,
      duration: 0 // Will be updated on page leave
    };

    this.activities.set(activityId, pageView);

    logger.info('Page View', {
      ...pageView,
      sessionId: data.sessionId
    });

    return activityId;
  }

  trackPageLeave(activityId, data) {
    if (!this.activities.has(activityId)) return;

    const pageView = this.activities.get(activityId);
    const duration = Date.now() - new Date(pageView.timestamp).getTime();

    const updatedPageView = {
      ...pageView,
      duration,
      leaveTimestamp: new Date().toISOString(),
      ...data
    };

    this.activities.set(activityId, updatedPageView);

    logger.info('Page Leave', {
      ...updatedPageView,
      sessionId: data.sessionId
    });
  }

  trackUserInteraction(data) {
    const activityId = uuidv4();
    const timestamp = new Date().toISOString();

    const interaction = {
      type: 'USER_INTERACTION',
      activityId,
      timestamp,
      ...data
    };

    this.activities.set(activityId, interaction);

    logger.info('User Interaction', {
      ...interaction,
      sessionId: data.sessionId
    });

    return activityId;
  }

  trackFormSubmission(data) {
    const activityId = uuidv4();
    const timestamp = new Date().toISOString();

    const submission = {
      type: 'FORM_SUBMISSION',
      activityId,
      timestamp,
      ...data
    };

    // Sanitize form data before logging
    const sanitizedData = {
      ...submission,
      formData: this.sanitizeFormData(submission.formData)
    };

    this.activities.set(activityId, sanitizedData);

    logger.info('Form Submission', {
      ...sanitizedData,
      sessionId: data.sessionId
    });

    return activityId;
  }

  trackError(data) {
    const activityId = uuidv4();
    const timestamp = new Date().toISOString();

    const error = {
      type: 'UI_ERROR',
      activityId,
      timestamp,
      ...data
    };

    this.activities.set(activityId, error);

    logger.error('UI Error', {
      ...error,
      sessionId: data.sessionId
    });

    return activityId;
  }

  trackPerformance(data) {
    const activityId = uuidv4();
    const timestamp = new Date().toISOString();

    const performance = {
      type: 'PERFORMANCE',
      activityId,
      timestamp,
      ...data
    };

    this.activities.set(activityId, performance);

    logger.info('UI Performance', {
      ...performance,
      sessionId: data.sessionId
    });

    return activityId;
  }

  startSession(userId, metadata = {}) {
    const sessionId = uuidv4();
    const timestamp = new Date().toISOString();

    const session = {
      sessionId,
      userId,
      startTime: timestamp,
      lastActivity: timestamp,
      metadata
    };

    this.sessions.set(sessionId, session);

    logger.info('Session Started', session);

    return sessionId;
  }

  updateSession(sessionId, metadata = {}) {
    if (!this.sessions.has(sessionId)) return;

    const session = this.sessions.get(sessionId);
    const updatedSession = {
      ...session,
      lastActivity: new Date().toISOString(),
      metadata: { ...session.metadata, ...metadata }
    };

    this.sessions.set(sessionId, updatedSession);

    logger.info('Session Updated', updatedSession);
  }

  endSession(sessionId, metadata = {}) {
    if (!this.sessions.has(sessionId)) return;

    const session = this.sessions.get(sessionId);
    const endTime = new Date().toISOString();
    const duration = new Date(endTime) - new Date(session.startTime);

    const endedSession = {
      ...session,
      endTime,
      duration,
      metadata: { ...session.metadata, ...metadata }
    };

    this.sessions.delete(sessionId);

    logger.info('Session Ended', endedSession);
  }

  sanitizeFormData(formData) {
    if (!formData) return formData;
    
    const sanitized = { ...formData };
    const sensitiveFields = [
      'password',
      'token',
      'apiKey',
      'secret',
      'creditCard',
      'ssn',
      'cvv',
      'pin'
    ];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  getSessionActivities(sessionId) {
    const activities = [];
    this.activities.forEach(activity => {
      if (activity.sessionId === sessionId) {
        activities.push(activity);
      }
    });
    return activities.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  }

  getSessionStats(sessionId) {
    const activities = this.getSessionActivities(sessionId);
    return {
      totalActivities: activities.length,
      pageViews: activities.filter(a => a.type === 'PAGE_VIEW').length,
      interactions: activities.filter(a => a.type === 'USER_INTERACTION').length,
      formSubmissions: activities.filter(a => a.type === 'FORM_SUBMISSION').length,
      errors: activities.filter(a => a.type === 'UI_ERROR').length
    };
  }
}

module.exports = new UITracker(); 