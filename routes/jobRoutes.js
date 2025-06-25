import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  validateJobApplication,
  validateJobPosting,
  validateJobUpdate,
  validateJobId,
  validateJobQuery,
  validateBulkJobUpdate,
  validateApplicationStatusUpdate
} from "../validations/jobValidation.js";
import { upload, handleUploadError } from "../middleware/upload.js";
import {
  createJobForm,
  getAllJobForms,
  getJobFormById,
  updateJobForm,
  deleteJobForm,
  createJobPosting,
  getActiveJobs,
  searchJobs,
  getJobStats,
  bulkUpdateJobs,
  updateApplicationStatus,
  getJobApplications,
  exportJobData,
  duplicateJob,
  getJobsByUser
} from "../controllers/jobController.js";

const router = express.Router();

// ==========================================
// PUBLIC ROUTES (No Authentication Required)
// ==========================================

/**
 * @route   GET /api/v1/jobs/active
 * @desc    Get all active job postings (public view)
 * @access  Public
 */
router.get("/active", validateJobQuery, getActiveJobs);

/**
 * @route   GET /api/v1/jobs/search
 * @desc    Search and filter jobs with pagination
 * @access  Public
 */
router.get("/search", validateJobQuery, searchJobs);

/**
 * @route   GET /api/v1/jobs/public/:id
 * @desc    Get a single active job posting (public view)
 * @access  Public
 */
router.get("/public/:id", validateJobId, getJobFormById);

/**
 * @route   POST /api/v1/jobs/apply
 * @desc    Submit job application (legacy endpoint for job applications)
 * @access  Public
 */
router.post("/apply", validateJobApplication, createJobForm);

/**
 * @route   POST /api/v1/jobs/careers/apply
 * @desc    Submit general career application form with file upload support
 * @access  Public
 */
router.post("/careers/apply", 
  upload.single('resume'), 
  handleUploadError,
  validateJobApplication, 
  createJobForm
);

// ==========================================
// AUTHENTICATED ROUTES
// ==========================================

/**
 * @route   POST /api/v1/jobs/create
 * @desc    Create a new job application (legacy)
 * @access  Private
 */
router.post("/create", authenticateToken, validateJobApplication, createJobForm);

/**
 * @route   POST /api/v1/jobs/posting/create
 * @desc    Create a comprehensive job posting
 * @access  Private (Admin/HR roles)
 */
router.post("/posting/create", 
  authenticateToken, 
  validateJobPosting, 
  createJobPosting
);

/**
 * @route   GET /api/v1/jobs/getAll
 * @desc    Get all job forms/applications with filtering
 * @access  Private (Admin/HR roles)
 */
router.get("/getAll", 
  authenticateToken, 
  validateJobQuery, 
  getAllJobForms
);

/**
 * @route   GET /api/v1/jobs/my-applications
 * @desc    Get current user's job applications
 * @access  Private
 */
router.get("/my-applications", 
  authenticateToken, 
  validateJobQuery, 
  getJobsByUser
);

/**
 * @route   GET /api/v1/jobs/stats
 * @desc    Get job statistics and analytics
 * @access  Private (Admin/HR roles)
 */
router.get("/stats", 
  authenticateToken, 
  getJobStats
);

/**
 * @route   GET /api/v1/jobs/get/:id
 * @desc    Get a single job form/application by ID
 * @access  Private
 */
router.get("/get/:id", 
  authenticateToken, 
  validateJobId, 
  getJobFormById
);

/**
 * @route   GET /api/v1/jobs/:id/applications
 * @desc    Get all applications for a specific job posting
 * @access  Private (Admin/HR roles)
 */
router.get("/:id/applications", 
  authenticateToken, 
  validateJobId,
  validateJobQuery,
  getJobApplications
);

/**
 * @route   PUT /api/v1/jobs/update/:id
 * @desc    Update a job form/posting by ID
 * @access  Private
 */
router.put("/update/:id", 
  authenticateToken, 
  validateJobId, 
  validateJobUpdate, 
  updateJobForm
);

/**
 * @route   PUT /api/v1/jobs/:id/status
 * @desc    Update application status for a job
 * @access  Private (Admin/HR roles)
 */
router.put("/:id/status", 
  authenticateToken, 
  validateJobId,
  validateApplicationStatusUpdate,
  updateApplicationStatus
);

/**
 * @route   POST /api/v1/jobs/bulk-update
 * @desc    Bulk update multiple jobs
 * @access  Private (Admin/HR roles)
 */
router.post("/bulk-update", 
  authenticateToken, 
  validateBulkJobUpdate, 
  bulkUpdateJobs
);

/**
 * @route   POST /api/v1/jobs/:id/duplicate
 * @desc    Duplicate a job posting
 * @access  Private (Admin/HR roles)
 */
router.post("/:id/duplicate", 
  authenticateToken, 
  validateJobId,
  duplicateJob
);

/**
 * @route   GET /api/v1/jobs/export
 * @desc    Export job data (CSV/Excel)
 * @access  Private (Admin/HR roles)
 */
router.get("/export", 
  authenticateToken, 
  validateJobQuery,
  exportJobData
);

/**
 * @route   DELETE /api/v1/jobs/delete/:id
 * @desc    Delete a job form/posting by ID
 * @access  Private (Admin/HR roles)
 */
router.delete("/delete/:id", 
  authenticateToken, 
  validateJobId, 
  deleteJobForm
);

// ==========================================
// ADVANCED FILTERING & SEARCH ROUTES
// ==========================================

/**
 * @route   GET /api/v1/jobs/filter/by-market/:market
 * @desc    Get jobs filtered by market
 * @access  Public
 */
router.get("/filter/by-market/:market", 
  validateJobQuery,
  (req, res, next) => {
    req.query.market = req.params.market;
    next();
  },
  searchJobs
);

/**
 * @route   GET /api/v1/jobs/filter/by-work-mode/:work_mode
 * @desc    Get jobs filtered by work mode
 * @access  Public
 */
router.get("/filter/by-work-mode/:work_mode", 
  validateJobQuery,
  (req, res, next) => {
    req.query.work_mode = req.params.work_mode;
    next();
  },
  searchJobs
);

/**
 * @route   GET /api/v1/jobs/filter/by-employment-type/:employment_type
 * @desc    Get jobs filtered by employment type
 * @access  Public
 */
router.get("/filter/by-employment-type/:employment_type", 
  validateJobQuery,
  (req, res, next) => {
    req.query.employment_type = req.params.employment_type;
    next();
  },
  searchJobs
);

/**
 * @route   GET /api/v1/jobs/filter/by-department/:department
 * @desc    Get jobs filtered by department
 * @access  Public
 */
router.get("/filter/by-department/:department", 
  validateJobQuery,
  (req, res, next) => {
    req.query.department = req.params.department;
    next();
  },
  searchJobs
);

// ==========================================
// ERROR HANDLING MIDDLEWARE
// ==========================================

// Global error handler for job routes
router.use((error, req, res, next) => {
  console.error("Job Routes Error:", error);
  
  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }
  
  // Handle duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `Duplicate ${field}. This ${field} already exists.`
    });
  }
  
  // Handle cast errors (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format"
    });
  }
  
  // Generic server error
  res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

export default router;
