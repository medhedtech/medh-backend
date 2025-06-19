import express from "express";

import { ENV_VARS } from "../config/envVars.js";
import cache from "../utils/cache.js";
import logger from "../utils/logger.js";

// Import routes
import addJobPost from "./add-job-postRoutes.js";
import assignCoorporateCourse from "./assign-course-coorporateRoutes.js";
import assignedInstructor from "./assignInstructorRoute.js";
import assignment from "./assignmentRoutes.js";
import authRoutes from "./authRoutes.js";
import batchRoutes from "./batch-routes.js";
import blogRoutes from "./blogRoutes.js";
import broucherRoute from "./broucherRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import certificateRoutes from "./certificateRoutes.js";
import complaint from "./complaintRoute.js";
import contactRoutes from "./contactRoutes.js";
import corporateRoute from "./corporate-traing-Routes.js";
import courseRoutes from "./courseRoutes.js";
import courseTypesRoutes from "./course-types-routes.js";
import currencyRoutes from "./currencyRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import enrollForm from "./enroll-formRoute.js";
import enrolledRoutes from "./enrolledRoutes.js";
import enrollmentRoutes from "./enrollment-routes.js";
import faqRoutes from "./faqRoutes.js";
import feedback from "./feedbackRoutes.js";
import freqRoutes from "./freqRoutes.js";
import grievance from "./grievanceRoute.js";
import healthRoutes from "./healthRoutes.js";
import homeDisplayRoutes from "./homeDisplayRoutes.js";
import instructorRoutes from "./instructorRoutes.js";
import jobPost from "./jobRoutes.js";
import membership from "./membershipRoutes.js";
import newsLetterRoute from "./newsletterRoutes.js";
import onlineMeetingRoutes from "./online_meetingRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import placements from "./placementRoutes.js";
import quizResponseRoutes from "./quizResponseRoutes.js";
import quizes from "./quizRoutes.js";
import recordedSessionRoutes from "./recorded-sessionRoutes.js";
import resources from "./resourcesRoutes.js";
import studentRoutes from "./studentRoutes.js";
import subscriptionRoute from "./subscription-Routes.js";
import trackSessionRoute from "./track-sessionsRoutes.js";
import uploadRoutes from "./uploadRoutes.js";
import zoomRoutes from "./zoom.js";
import enhancedPaymentRoutes from "./enhanced-payment-routes.js";
import aiRoutes from "./aiRoutes.js";
import announcementRoutes from "./announcementRoutes.js";
import profileRoutes from "./profileRoutes.js";
import universalFormRoutes from "./universalFormRoutes.js";
import demoBookingRoutes from "./demo-bookingRoutes.js";
import demoFeedbackRoutes from "./demo-feedbackRoutes.js";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/health",
    route: healthRoutes,
  },
  {
    path: "/categories",
    route: categoryRoutes,
  },
  {
    path: "/courses",
    route: courseRoutes,
  },
  {
    path: "/tcourse",
    route: courseTypesRoutes,
  },
  {
    path: "/freq",
    route: freqRoutes,
  },
  {
    path: "/faq",
    route: faqRoutes,
  },
  {
    path: "/students",
    route: studentRoutes,
  },
  {
    path: "/instructors",
    route: instructorRoutes,
  },
  {
    path: "/certificates",
    route: certificateRoutes,
  },
  {
    path: "/online-meetings",
    route: onlineMeetingRoutes,
  },
  {
    path: "/enrolled",
    route: enrolledRoutes,
  },
  {
    path: "/recorded-sessions",
    route: recordedSessionRoutes,
  },
  {
    path: "/upload",
    route: uploadRoutes,
  },
  {
    path: "/contact",
    route: contactRoutes,
  },
  {
    path: "/blogs",
    route: blogRoutes,
  },
  {
    path: "/dashboard",
    route: dashboardRoutes,
  },
  {
    path: "/assign-instructor",
    route: assignedInstructor,
  },
  {
    path: "/membership",
    route: membership,
  },
  {
    path: "/resources",
    route: resources,
  },
  {
    path: "/quizes",
    route: quizes,
  },
  {
    path: "/feedback",
    route: feedback,
  },
  {
    path: "/assignment",
    route: assignment,
  },
  {
    path: "/placements",
    route: placements,
  },
  {
    path: "/complaint",
    route: complaint,
  },
  {
    path: "/grievance",
    route: grievance,
  },
  {
    path: "/enroll-form",
    route: enrollForm,
  },
  {
    path: "/add-job-post",
    route: addJobPost,
  },
  {
    path: "/job-post",
    route: jobPost,
  },
  {
    path: "/subscription",
    route: subscriptionRoute,
  },
  {
    path: "/broucher",
    route: broucherRoute,
  },
  {
    path: "/newsletter",
    route: newsLetterRoute,
  },
  {
    path: "/quiz-response",
    route: quizResponseRoutes,
  },
  {
    path: "/track-sessions",
    route: trackSessionRoute,
  },
  {
    path: "/assign-corporate-course",
    route: assignCoorporateCourse,
  },
  {
    path: "/corporate-training",
    route: corporateRoute,
  },
  {
    path: "/payments",
    route: paymentRoutes,
  },
  {
    path: "/currencies",
    route: currencyRoutes,
  },
  {
    path: "/home-display",
    route: homeDisplayRoutes,
  },
  {
    path: "/zoom",
    route: zoomRoutes,
  },
  {
    path: "/batches",
    route: batchRoutes,
  },
  {
    path: "/enrollments",
    route: enrollmentRoutes,
  },
  {
    path: "/enhanced-payments",
    route: enhancedPaymentRoutes,
  },
  {
    path: "/ai",
    route: aiRoutes,
  },
  {
    path: "/announcements",
    route: announcementRoutes,
  },
  {
    path: "/profile",
    route: profileRoutes,
  },
  {
    path: "/forms",
    route: universalFormRoutes,
  },
  {
    path: "/demo-booking",
    route: demoBookingRoutes,
  },
  {
    path: "/demo-feedback",
    route: demoFeedbackRoutes,
  }
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

// Add monitoring endpoints
router.get("/system/health", (req, res) => {
  try {
    // Get Redis status
    const redisStatus = cache.getConnectionStatus();

    // Log the health check
    logger.info("Health check performed", {
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    });

    // Prepare response
    const healthStatus = {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        redis: {
          enabled: redisStatus.enabled,
          connected: redisStatus.connected,
          status: redisStatus.connected
            ? "healthy"
            : redisStatus.enabled
              ? "unhealthy"
              : "disabled",
        },
      },
      environment: ENV_VARS.NODE_ENV,
    };

    // Send appropriate status code
    const statusCode =
      redisStatus.enabled && !redisStatus.connected ? 503 : 200;
    return res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error("Health check failed", { error: error.message });
    return res.status(500).json({
      status: "error",
      message: "Health check failed",
      error:
        ENV_VARS.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
});

// API dashboard route - displays API metrics in the console and returns data as JSON
router.get("/system/api-metrics", (req, res) => {
  try {
    const metrics = logger.apiDashboard.metrics;

    // Display dashboard in console for admins
    logger.apiDashboard.show();

    // Return metrics data
    const apiMetrics = {
      totalRequests: metrics.totalRequests,
      totalErrors: metrics.totalErrors,
      slowResponses: metrics.slowResponses,
      uptime: Date.now() - metrics.lastReset,
      topEndpoints: Array.from(metrics.requests.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([key, stat]) => {
          const [method, endpoint] = key.split(":");
          return {
            endpoint,
            method,
            calls: stat.count,
            avgResponseTime: (stat.totalDuration / stat.count).toFixed(2),
            errors: stat.errors,
            slowResponses: stat.slow,
            errorRate: ((stat.errors / stat.count) * 100).toFixed(2) + "%",
          };
        }),
    };

    return res.status(200).json({
      status: "success",
      data: apiMetrics,
    });
  } catch (error) {
    logger.error("API metrics failed", { error: error.message });
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve API metrics",
      error:
        ENV_VARS.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
});

// Reset API metrics
router.post("/system/reset-metrics", (req, res) => {
  try {
    logger.apiDashboard.reset();
    return res.status(200).json({
      status: "success",
      message: "API metrics reset successfully",
    });
  } catch (error) {
    logger.error("Failed to reset API metrics", { error: error.message });
    return res.status(500).json({
      status: "error",
      message: "Failed to reset API metrics",
      error:
        ENV_VARS.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
});

// Add a test endpoint for diagnosing authentication issues
router.get("/auth-test", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    const authStatus = {
      hasAuthHeader: !!authHeader,
      hasToken: !!token,
      tokenPrefix: token ? token.substr(0, 20) + '...' : null,
      tokenLength: token ? token.length : 0,
      timestamp: new Date().toISOString(),
      environment: ENV_VARS.NODE_ENV,
      jwtSecretExists: !!ENV_VARS.JWT_SECRET_KEY,
      redisEnabled: ENV_VARS.REDIS_ENABLED
    };

    // Try to verify token if present
    if (token) {
      try {
        const { verifyAccessToken } = await import('../utils/jwt.js');
        const decoded = verifyAccessToken(token);
        authStatus.tokenValid = !!decoded;
        authStatus.tokenData = decoded ? {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          type: decoded.type,
          exp: decoded.exp,
          iat: decoded.iat
        } : null;
        authStatus.tokenExpired = decoded ? (decoded.exp * 1000 < Date.now()) : null;
      } catch (error) {
        authStatus.tokenVerificationError = error.message;
      }
    }

    logger.info("Auth Test Request", {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      authStatus
    });

    return res.status(200).json({
      message: "Authentication test completed",
      status: authStatus
    });
  } catch (error) {
    logger.error("Auth test failed", { error: error.message });
    return res.status(500).json({
      message: "Auth test failed",
      error: ENV_VARS.NODE_ENV === "production" ? "Internal server error" : error.message
    });
  }
});

// Add a test endpoint for diagnosing CORS issues
router.get("/cors-test", (req, res) => {
  // Record the origin of the request
  const origin = req.headers.origin || "No origin header";

  // Log all headers for debugging
  const headersObj = {};
  Object.keys(req.headers).forEach((key) => {
    headersObj[key] = req.headers[key];
  });

  logger.info("CORS Test Request Headers:", headersObj);
  logger.info("Origin:", origin);

  // Log response headers for debugging
  const responseHeaders = res.getHeaders();
  logger.info("CORS Test Response Headers:", responseHeaders);

  return res.status(200).json({
    message: "CORS test successful",
    origin: origin,
    // Include the current CORS configuration
    allowedOrigins:
      ENV_VARS.ALLOWED_ORIGINS.length > 0
        ? ENV_VARS.ALLOWED_ORIGINS
        : [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://medh.co",
            "https://www.medh.co",
          ],
    environment: ENV_VARS.NODE_ENV,
    requestHeaders: headersObj,
    responseHeaders: responseHeaders,
    timestamp: new Date().toISOString(),
  });
});

export default router;
