import express from 'express';
import { ENV_VARS } from '../config/envVars.js';
import logger from '../utils/logger.js';

// Import routes
import authRoutes from './authRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import courseRoutes from './courseRoutes.js';
import freqRoutes from './freqRoutes.js';
import faqRoutes from './faqRoutes.js';
import studentRoutes from './studentRoutes.js';
import instructorRoutes from './instructorRoutes.js';
import certificateRoutes from './certificateRoutes.js';
import onlineMeetingRoutes from './online_meetingRoutes.js';
import enrolledRoutes from './enrolledRoutes.js';
import recordedSessionRoutes from './recorded-sessionRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import contactRoutes from './contactRoutes.js';
import blogRoutes from './blogRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import assignedInstructor from './assignInstructorRoute.js';
import membership from './membershipRoutes.js';
import resources from './resourcesRoutes.js';
import quizes from './quizRoutes.js';
import feedback from './feedbackRoutes.js';
import assignment from './assignmentRoutes.js';
import placements from './placementRoutes.js';
import complaint from './complaintRoute.js';
import grievance from './grievanceRoute.js';
import enrollForm from './enroll-formRoute.js';
import addJobPost from './add-job-postRoutes.js';
import jobPost from './jobRoutes.js';
import subscriptionRoute from './subscription-Routes.js';
import broucherRoute from './broucherRoutes.js';
import newsLetterRoute from './newsletterRoutes.js';
import quizResponseRoutes from './quizResponseRoutes.js';
import trackSessionRoute from './track-sessionsRoutes.js';
import assignCoorporateCourse from './assign-course-coorporateRoutes.js';
import corporateRoute from './corporate-traing-Routes.js';
import paymentRoutes from './paymentRoutes.js';
import currencyRoutes from './currencyRoutes.js';
import homeDisplayRoutes from './homeDisplayRoutes.js';
import zoomRoutes from './zoom.js';

const router = express.Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: authRoutes,
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
  }
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

// Add a test endpoint for diagnosing CORS issues
router.get('/cors-test', (req, res) => {
  // Record the origin of the request
  const origin = req.headers.origin || 'No origin header';
  
  // Log all headers for debugging
  const headersObj = {};
  Object.keys(req.headers).forEach(key => {
    headersObj[key] = req.headers[key];
  });
  
  logger.info('CORS Test Request Headers:', headersObj);
  logger.info('Origin:', origin);
  
  // Log response headers for debugging
  const responseHeaders = res.getHeaders();
  logger.info('CORS Test Response Headers:', responseHeaders);
  
  return res.status(200).json({
    message: 'CORS test successful',
    origin: origin,
    // Include the current CORS configuration
    allowedOrigins: ENV_VARS.ALLOWED_ORIGINS.length > 0 
      ? ENV_VARS.ALLOWED_ORIGINS 
      : ['http://localhost:3000', 'http://localhost:3001', 'https://medh.co', 'https://www.medh.co'],
    environment: ENV_VARS.NODE_ENV,
    requestHeaders: headersObj,
    responseHeaders: responseHeaders,
    timestamp: new Date().toISOString()
  });
});

export default router;
