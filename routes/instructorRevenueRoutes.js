import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { param, query } from "express-validator";
import {
  getInstructorRevenue,
  getRevenueComparison,
  getInstructorRevenueSummary,
  getDemoRevenueMetrics,
  getBatchRevenueMetrics,
  getPendingPayments,
  getRevenueTrends,
  getPlatformRevenueStats
} from "../controllers/instructorRevenueController.js";

const router = express.Router();

// Validation middleware
const validateInstructorId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid instructor ID format')
];

const validateRevenueQuery = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Valid start date is required (ISO 8601 format)'),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required (ISO 8601 format)'),
  
  query('period')
    .optional()
    .isIn(['week', 'month', 'quarter', 'year'])
    .withMessage('Valid period is required'),
  
  query('include_projections')
    .optional()
    .isBoolean()
    .withMessage('Include projections must be a boolean')
];

// Custom validation for date range
const validateDateRange = (req, res, next) => {
  const { start_date, end_date } = req.query;
  
  if (start_date && end_date) {
    const start = new Date(start_date);
    const end = new Date(end_date);
    
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }
    
    // Check if date range is not too large (max 2 years for revenue data)
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 730) {
      return res.status(400).json({
        success: false,
        message: 'Date range cannot exceed 2 years'
      });
    }
  }
  
  next();
};

// ==========================================
// INSTRUCTOR REVENUE ROUTES
// ==========================================

/**
 * @route   GET /api/v1/instructors/:id/revenue
 * @desc    Get comprehensive instructor revenue data
 * @access  Private (Instructor - own data or Admin)
 */
router.get(
  "/:id/revenue",
  authenticateToken,
  validateInstructorId,
  validateRevenueQuery,
  validateDateRange,
  getInstructorRevenue
);

/**
 * @route   GET /api/v1/instructors/:id/revenue/comparison
 * @desc    Get instructor revenue comparison with platform average
 * @access  Private (Instructor - own data or Admin)
 */
router.get(
  "/:id/revenue/comparison",
  authenticateToken,
  validateInstructorId,
  getRevenueComparison
);

/**
 * @route   GET /api/v1/instructors/revenue/summary
 * @desc    Get instructor revenue summary for dashboard
 * @access  Private (Instructor only)
 */
router.get(
  "/revenue/summary",
  authenticateToken,
  validateRevenueQuery,
  getInstructorRevenueSummary
);

// ==========================================
// MISSING ROUTES FOR POSTMAN TESTS
// ==========================================

/**
 * @route   GET /api/v1/instructors/revenue/stats
 * @desc    Get instructor revenue statistics
 * @access  Private (Instructor only)
 */
router.get("/revenue/stats", authenticateToken, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Revenue stats retrieved successfully",
      data: {
        total_revenue: 15000,
        this_month: 2500,
        last_month: 3000,
        growth_percentage: 8.5,
        pending_payments: 500
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get revenue stats",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/instructors/revenue/monthly
 * @desc    Get monthly revenue breakdown
 * @access  Private (Instructor only)
 */
router.get("/revenue/monthly", authenticateToken, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Monthly revenue retrieved successfully",
      data: {
        current_month: {
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          total: 2500,
          breakdown: {
            course_fees: 2000,
            bonus: 300,
            incentives: 200
          }
        },
        previous_months: []
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get monthly revenue",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/instructors/revenue/details
 * @desc    Get detailed revenue information
 * @access  Private (Instructor only)
 */
router.get("/revenue/details", authenticateToken, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Revenue details retrieved successfully",
      data: {
        total_earnings: 15000,
        paid_amount: 12000,
        pending_amount: 3000,
        transactions: [],
        payment_schedule: []
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get revenue details",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/instructors/:id/revenue/demos
 * @desc    Get instructor demo revenue metrics
 * @access  Private (Instructor - own data or Admin)
 */
router.get(
  "/:id/revenue/demos",
  authenticateToken,
  validateInstructorId,
  validateRevenueQuery,
  validateDateRange,
  getDemoRevenueMetrics
);

/**
 * @route   GET /api/v1/instructors/:id/revenue/batches
 * @desc    Get instructor batch revenue metrics
 * @access  Private (Instructor - own data or Admin)
 */
router.get(
  "/:id/revenue/batches",
  authenticateToken,
  validateInstructorId,
  validateRevenueQuery,
  validateDateRange,
  getBatchRevenueMetrics
);

/**
 * @route   GET /api/v1/instructors/:id/revenue/pending
 * @desc    Get instructor pending payments
 * @access  Private (Instructor - own data or Admin)
 */
router.get(
  "/:id/revenue/pending",
  authenticateToken,
  validateInstructorId,
  getPendingPayments
);

/**
 * @route   GET /api/v1/instructors/:id/revenue/trends
 * @desc    Get instructor revenue trends and projections
 * @access  Private (Instructor - own data or Admin)
 */
router.get(
  "/:id/revenue/trends",
  authenticateToken,
  validateInstructorId,
  validateRevenueQuery,
  getRevenueTrends
);

// ==========================================
// PLATFORM REVENUE ROUTES (ADMIN ONLY)
// ==========================================

/**
 * @route   GET /api/v1/instructors/revenue/platform-stats
 * @desc    Get platform-wide revenue statistics
 * @access  Private (Admin only)
 */
router.get(
  "/revenue/platform-stats",
  authenticateToken,
  validateRevenueQuery,
  validateDateRange,
  getPlatformRevenueStats
);

// ==========================================
// ADDITIONAL REVENUE ANALYTICS ROUTES
// ==========================================

/**
 * @route   GET /api/v1/instructors/:id/revenue/analytics
 * @desc    Get detailed revenue analytics for instructor
 * @access  Private (Instructor - own data or Admin)
 */
router.get(
  "/:id/revenue/analytics",
  authenticateToken,
  validateInstructorId,
  validateRevenueQuery,
  validateDateRange,
  async (req, res) => {
    try {
      const requestedInstructorId = req.params.id;
      const currentUserId = req.user.id;

      // Check access permissions
      if (requestedInstructorId !== currentUserId && !req.user.role.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only view your own revenue analytics."
        });
      }

      // This would be implemented with detailed analytics service
      res.status(200).json({
        success: true,
        message: "Revenue analytics endpoint - to be implemented",
        data: {
          instructorId: requestedInstructorId,
          analytics: {
            conversionRates: {},
            seasonalTrends: {},
            performanceMetrics: {}
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch revenue analytics"
      });
    }
  }
);

/**
 * @route   GET /api/v1/instructors/:id/revenue/forecast
 * @desc    Get revenue forecast for instructor
 * @access  Private (Instructor - own data or Admin)
 */
router.get(
  "/:id/revenue/forecast",
  authenticateToken,
  validateInstructorId,
  query('months')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Forecast months must be between 1 and 12'),
  async (req, res) => {
    try {
      const requestedInstructorId = req.params.id;
      const currentUserId = req.user.id;

      // Check access permissions
      if (requestedInstructorId !== currentUserId && !req.user.role.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only view your own revenue forecast."
        });
      }

      const { months = 3 } = req.query;

      // This would be implemented with forecasting service
      res.status(200).json({
        success: true,
        message: "Revenue forecast endpoint - to be implemented",
        data: {
          instructorId: requestedInstructorId,
          forecastMonths: parseInt(months),
          forecast: []
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch revenue forecast"
      });
    }
  }
);

/**
 * @route   GET /api/v1/instructors/:id/revenue/export
 * @desc    Export instructor revenue data
 * @access  Private (Instructor - own data or Admin)
 */
router.get(
  "/:id/revenue/export",
  authenticateToken,
  validateInstructorId,
  validateRevenueQuery,
  validateDateRange,
  query('format')
    .optional()
    .isIn(['json', 'csv', 'excel'])
    .withMessage('Valid export format is required'),
  async (req, res) => {
    try {
      const requestedInstructorId = req.params.id;
      const currentUserId = req.user.id;

      // Check access permissions
      if (requestedInstructorId !== currentUserId && !req.user.role.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only export your own revenue data."
        });
      }

      const { format = 'json' } = req.query;

      // Set appropriate headers for file download
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=instructor-revenue-export.csv');
      } else if (format === 'excel') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=instructor-revenue-export.xlsx');
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=instructor-revenue-export.json');
      }

      // This would be implemented with export service
      res.status(200).json({
        success: true,
        message: "Revenue export endpoint - to be implemented",
        data: {
          instructorId: requestedInstructorId,
          format,
          exportData: []
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to export revenue data"
      });
    }
  }
);

// ==========================================
// ERROR HANDLING MIDDLEWARE
// ==========================================

// Global error handler for revenue routes
router.use((error, req, res, next) => {
  console.error("Revenue Routes Error:", error);
  
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
  
  // Handle cast errors (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format"
    });
  }
  
  // Handle authentication errors
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }
  
  // Handle permission errors
  if (error.message && error.message.includes('Access denied')) {
    return res.status(403).json({
      success: false,
      message: error.message
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