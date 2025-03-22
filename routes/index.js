const router = require("express").Router();
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
const uploadFilesRoutes = require("./uploadPdfRoutes");
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
    path: "/course-faqs",
    route: freqRoutes,
  },
  {
    path: "/faqs",
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
    path: "/online-meeting",
    route: onlineMeetingRoutes,
  },
  {
    path: "/enroll",
    route: enrolledRoutes,
  },
  {
    path: "/recorded-sessions",
    route: recordedSessionRoutes,
  },
  {
    path: "/upload",
    route: uploadFilesRoutes,
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
    path: "/assigned-instrutors",
    route: assignedInstructor,
  },
  {
    path: "/assignments",
    route: assignment,
  },
  {
    path: "/memberships",
    route: membership,
  },
  {
    path: "/quizes",
    route: quizes,
  },
  {
    path: "/resources",
    route: resources,
  },
  {
    path: "/feedback",
    route: feedback,
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
    path: "/job-post",
    route: jobPost,
  },
  {
    path: "/add-job-post",
    route: addJobPost,
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
    path: "/quizResponses",
    route: quizResponseRoutes,
  },
  {
    path: "/track-sessions",
    route: trackSessionRoute,
  },
  {
    path: "/enroll-coorporate",
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

<<<<<<< Updated upstream
=======
// Add a test endpoint for diagnosing CORS issues
router.get('/cors-test', (req, res) => {
  // Log request headers for debugging
  console.log('CORS Test Request Headers:', req.headers);
  
  // Log response headers that will be sent
  console.log('CORS Test Response Headers:', res.getHeaders());
  
  // Return environment info to verify settings
  return res.json({
    message: 'CORS test successful',
    nodeEnv: process.env.NODE_ENV,
    allowedOrigins: process.env.ALLOWED_ORIGINS,
    requestOrigin: req.headers.origin,
    corsHeaders: {
      allowOrigin: res.getHeader('Access-Control-Allow-Origin'),
      allowMethods: res.getHeader('Access-Control-Allow-Methods'),
      allowHeaders: res.getHeader('Access-Control-Allow-Headers'),
      allowCredentials: res.getHeader('Access-Control-Allow-Credentials')
    }
  });
});

// Add an OPTIONS test endpoint
router.options('/cors-test', (req, res) => {
  // This route should never be reached if our CORS middleware is working correctly
  // as OPTIONS requests should be handled by our middleware
  console.log('OPTIONS request reached the route handler - this should not happen');
  return res.status(204).end();
});

>>>>>>> Stashed changes
module.exports = router;
