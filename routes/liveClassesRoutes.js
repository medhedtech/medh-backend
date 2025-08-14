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
  getCourseCategories 
} from '../controllers/liveClassesController.js';
import { authenticateToken as auth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

// Live Classes Routes
router.get('/students', getStudents);
router.get('/grades', getGrades);
router.get('/dashboards', getDashboards);
router.get('/instructors', getInstructors);

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
router.post('/sessions', (req, res, next) => {
  console.log('🔍 Route: createSession called');
  console.log('📝 Request body:', req.body);
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

export default router;
