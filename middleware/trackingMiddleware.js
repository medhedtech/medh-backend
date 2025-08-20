import uiTracker from "../services/uiTracker.js";
import logger from "../utils/logger.js";

const trackingMiddleware = {
  // Track all incoming requests
  requestTracker: (req, res, next) => {
    req.startTime = Date.now();

    // Log request start
    logger.info("Request Started", {
      ...logger.addRequestContext(req),
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body,
    });

    // Track response
    res.on("finish", () => {
      const duration = Date.now() - req.startTime;
      logger.trackRequest(req, res, duration);
    });

    next();
  },

  // Track UI activities
  uiActivityTracker: (req, res, next) => {
    // Only track UI activities for specific endpoints
    if (req.path.startsWith("/api/ui-activity")) {
      const { type, data } = req.body;

      switch (type) {
        case "PAGE_VIEW":
          uiTracker.trackPageView({
            ...data,
            sessionId: req.sessionID,
            userId: req.user?._id,
          });
          break;

        case "PAGE_LEAVE":
          uiTracker.trackPageLeave(data.activityId, {
            ...data,
            sessionId: req.sessionID,
            userId: req.user?._id,
          });
          break;

        case "USER_INTERACTION":
          uiTracker.trackUserInteraction({
            ...data,
            sessionId: req.sessionID,
            userId: req.user?._id,
          });
          break;

        case "FORM_SUBMISSION":
          uiTracker.trackFormSubmission({
            ...data,
            sessionId: req.sessionID,
            userId: req.user?._id,
          });
          break;

        case "ERROR":
          uiTracker.trackError({
            ...data,
            sessionId: req.sessionID,
            userId: req.user?._id,
          });
          break;

        case "PERFORMANCE":
          uiTracker.trackPerformance({
            ...data,
            sessionId: req.sessionID,
            userId: req.user?._id,
          });
          break;

        default:
          logger.warn("Unknown UI activity type", {
            type,
            data,
            sessionId: req.sessionID,
          });
      }
    }

    next();
  },

  // Track user sessions
  sessionTracker: (req, res, next) => {
    if (!req.sessionID) {
      next();
      return;
    }

    // Start new session if it doesn't exist
    if (!req.session.tracked) {
      const sessionId = uiTracker.startSession(req.user?._id, {
        userAgent: req.get("user-agent"),
        ip: req.ip,
      });
      req.session.tracked = true;
      req.session.trackingId = sessionId;
    } else {
      // Update existing session
      uiTracker.updateSession(req.session.trackingId, {
        lastPath: req.path,
        lastActivity: new Date(),
      });
    }

    // Handle session end
    req.session.on("destroy", () => {
      if (req.session.trackingId) {
        uiTracker.endSession(req.session.trackingId);
      }
    });

    next();
  },

  // Error tracking middleware
  errorTracker: (err, req, res, next) => {
    logger.error("Application Error", {
      error: {
        message: err.message,
        stack: err.stack,
        ...err,
      },
      ...logger.addRequestContext(req),
    });

    // Track UI error if it's a client-side error
    if (req.path.startsWith("/api/ui-activity")) {
      uiTracker.trackError({
        error: err.message,
        stack: err.stack,
        sessionId: req.sessionID,
        userId: req.user?._id,
        path: req.path,
      });
    }

    next(err);
  },
};

export default trackingMiddleware;
