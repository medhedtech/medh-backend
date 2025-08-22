import express from 'express';
const router = express.Router();
import { 
  getStudents, 
  getGrades, 
  getDashboards, 
  getInstructors, 
  uploadFile, 
  generateUploadUrl,
  createSession, 
  getPreviousSession, 
  getSessions, 
  getSession, 
  updateSession, 
  deleteSession, 
  getCourseStats, 
  getCourseCategories,
  uploadVideos,
  getStudentBatchInfo,
  getBatchesForStudents,
  getAllBatches,
  getStudentLatestSession,
  testS3Connection,
  verifyS3Videos,
  testBatchStudentOrg
} from '../controllers/liveClassesController.js';
import { authenticateToken as auth } from '../middleware/auth.js';
import { upload, uploadVideos as uploadVideosMiddleware } from '../middleware/upload.js';

// Live Classes Routes
router.get('/students', getStudents);
router.get('/grades', getGrades);
router.get('/dashboards', getDashboards);
router.get('/instructors', getInstructors);
router.get('/batches', getAllBatches);
router.get('/students/:studentId/latest-session', getStudentLatestSession);

// File upload
router.post('/files/upload', upload.single('file'), (req, res, next) => {
  console.log('🔍 Route: uploadFile called');
  console.log('📝 Request files:', req.files);
  console.log('📝 Request body:', req.body);
  uploadFile(req, res, next);
});
router.post('/generate-upload-url', (req, res, next) => {
  console.log('🔍 Route: generateUploadUrl called');
  console.log('📝 Request body:', req.body);
  generateUploadUrl(req, res, next);
});

// Sessions
router.post('/sessions', auth, (req, res, next) => {
  console.log('🔍 Route: createSession called');
  console.log('📝 Request body:', req.body);
  console.log('👤 User:', req.user);
  createSession(req, res, next);
});
router.get('/sessions/previous', getPreviousSession);
router.get('/sessions', getSessions);
router.get('/sessions/:id', getSession);
router.put('/sessions/:id', updateSession);
router.delete('/sessions/:id', deleteSession);

// Course statistics
router.get('/courses/:category/stats', getCourseStats);

// Course categories
router.get('/course-categories', getCourseCategories);

// Video upload route
router.post('/upload-videos', uploadVideosMiddleware.array('videos', 10), uploadVideos);

// Student batch information route
router.get('/student-batch-info', getStudentBatchInfo);

// Get batches for selected students
router.get('/batches-for-students', getBatchesForStudents);

// Test endpoints (for development/testing only)
router.get('/test-s3-connection', testS3Connection);
router.post('/verify-s3-videos', verifyS3Videos);
router.get('/test-batch-student-org', testBatchStudentOrg);

export default router;
