const router = require("express").Router();
const { ENV_VARS } = require("../config/envVars");
const authRoutes = require("./authRoutes");
const categoryRoutes = require("./categoryRoutes");
const courseRoutes = require("./courseRoutes");
const freqRoutes = require("./freqRoutes");
const faqRoutes = require("./faqRoutes");
const studentRoutes = require("./studentRoutes");
const instructorRoutes = require("./instructorRoutes");
const certificateRoutes = require("./certificateRoutes");
const onlineMeetingRoutes = require("./online_meetingRoutes");
const enrolledRoutes = require("./enrolledRoutes");
const recordedSessionRoutes = require("./recorded-sessionRoutes");
const uploadRoutes = require("./uploadRoutes");
const contactRoutes = require("./contactRoutes");
const blogRoutes = require("./blogRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const assignedInstructor = require("./assignInstructorRoute");
const membership = require("./membershipRoutes");
const resources = require("./resourcesRoutes");
const quizes = require("./quizRoutes");
const feedback = require("./feedbackRoutes");
const assignment = require("./assignmentRoutes");
const placements = require("./placementRoutes");
const complaint = require("./complaintRoute");
const grievance = require("./grievanceRoute");
const enrollForm = require("./enroll-formRoute");
const addJobPost = require("./add-job-postRoutes");
const jobPost = require("./jobRoutes");
const subscriptionRoute = require("./subscription-Routes");
const broucherRoute = require("./broucherRoutes");
const newsLetterRoute = require("./newsletterRoutes");
const quizResponseRoutes = require("./quizResponseRoutes");
const trackSessionRoute = require("./track-sessionsRoutes");
const assignCoorporateCourse = require("./assign-course-coorporateRoutes");
const corporateRoute = require("./corporate-traing-Routes");
const paymentRoutes = require("./paymentRoutes");

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
  }
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

// Add a test endpoint for diagnosing CORS issues
router.get('/cors-test', (req, res) => {
  // Record the origin of the request
  const origin = req.headers.origin || 'No origin header';
  
  console.log('CORS Test Request Headers:', req.headers);
  console.log('Origin:', origin);
  
  // Log response headers for debugging
  console.log('CORS Test Response Headers:', res.getHeaders());
  
  return res.status(200).json({
    message: 'CORS test successful',
    origin: origin,
    // Include the current CORS configuration
    allowedOrigins: ENV_VARS.ALLOWED_ORIGINS.length > 0 
      ? ENV_VARS.ALLOWED_ORIGINS 
      : ['Using default origins - check index.js'],
    environment: ENV_VARS.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
