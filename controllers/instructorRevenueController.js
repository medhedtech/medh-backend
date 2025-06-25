import instructorRevenueService from "../services/instructorRevenueService.js";
import { validationResult } from "express-validator";

/**
 * @desc    Get instructor revenue overview
 * @route   GET /api/v1/instructors/:id/revenue
 * @access  Private (Instructor - own data or Admin)
 */
export const getInstructorRevenue = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const requestedInstructorId = req.params.id;
    const currentUserId = req.user.id;

    // Check if user is requesting their own data or is an admin
    if (requestedInstructorId !== currentUserId && !req.user.role.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own revenue data."
      });
    }

    const { 
      start_date, 
      end_date, 
      period, 
      include_projections 
    } = req.query;

    const options = {
      start_date,
      end_date,
      period: period || 'month',
      include_projections: include_projections === 'true'
    };

    const result = await instructorRevenueService.getInstructorRevenue(requestedInstructorId, options);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getInstructorRevenue:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch instructor revenue",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Get instructor revenue comparison with platform
 * @route   GET /api/v1/instructors/:id/revenue/comparison
 * @access  Private (Instructor - own data or Admin)
 */
export const getRevenueComparison = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const requestedInstructorId = req.params.id;
    const currentUserId = req.user.id;

    // Check if user is requesting their own data or is an admin
    if (requestedInstructorId !== currentUserId && !req.user.role.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own revenue comparison."
      });
    }

    const result = await instructorRevenueService.getRevenueComparison(requestedInstructorId);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getRevenueComparison:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch revenue comparison",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Get instructor revenue summary (for dashboard)
 * @route   GET /api/v1/instructors/revenue/summary
 * @access  Private (Instructor only)
 */
export const getInstructorRevenueSummary = async (req, res) => {
  try {
    const instructorId = req.user.id;

    // Verify user is an instructor
    if (!req.user.role.includes('instructor')) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Instructor role required."
      });
    }

    const { period = 'month' } = req.query;

    const options = {
      period,
      include_projections: true
    };

    const result = await instructorRevenueService.getInstructorRevenue(instructorId, options);

    // Return simplified summary for dashboard
    const summary = {
      success: true,
      data: {
        totalRevenue: result.data.summary.totalRevenue,
        monthlyRevenue: result.data.summary.monthlyRevenue,
        pendingAmount: result.data.summary.pendingAmount,
        averageRevenuePerStudent: result.data.summary.averageRevenuePerStudent,
        recentTrends: result.data.monthlyTrends.slice(-3),
        projections: result.data.projections || null
      }
    };

    res.status(200).json(summary);
  } catch (error) {
    console.error("Error in getInstructorRevenueSummary:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch revenue summary",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Get instructor demo revenue metrics
 * @route   GET /api/v1/instructors/:id/revenue/demos
 * @access  Private (Instructor - own data or Admin)
 */
export const getDemoRevenueMetrics = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const requestedInstructorId = req.params.id;
    const currentUserId = req.user.id;

    // Check if user is requesting their own data or is an admin
    if (requestedInstructorId !== currentUserId && !req.user.role.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own demo metrics."
      });
    }

    const { start_date, end_date } = req.query;

    const result = await instructorRevenueService.getInstructorRevenue(requestedInstructorId, {
      start_date,
      end_date
    });

    res.status(200).json({
      success: true,
      data: {
        demoRevenue: result.data.summary.demoRevenue,
        metrics: result.data.demoMetrics
      }
    });
  } catch (error) {
    console.error("Error in getDemoRevenueMetrics:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch demo revenue metrics",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Get instructor batch revenue metrics
 * @route   GET /api/v1/instructors/:id/revenue/batches
 * @access  Private (Instructor - own data or Admin)
 */
export const getBatchRevenueMetrics = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const requestedInstructorId = req.params.id;
    const currentUserId = req.user.id;

    // Check if user is requesting their own data or is an admin
    if (requestedInstructorId !== currentUserId && !req.user.role.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own batch metrics."
      });
    }

    const { start_date, end_date } = req.query;

    const result = await instructorRevenueService.getInstructorRevenue(requestedInstructorId, {
      start_date,
      end_date
    });

    res.status(200).json({
      success: true,
      data: {
        batchRevenue: result.data.summary.batchRevenue,
        metrics: result.data.batchMetrics
      }
    });
  } catch (error) {
    console.error("Error in getBatchRevenueMetrics:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch batch revenue metrics",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Get instructor pending payments
 * @route   GET /api/v1/instructors/:id/revenue/pending
 * @access  Private (Instructor - own data or Admin)
 */
export const getPendingPayments = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const requestedInstructorId = req.params.id;
    const currentUserId = req.user.id;

    // Check if user is requesting their own data or is an admin
    if (requestedInstructorId !== currentUserId && !req.user.role.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own pending payments."
      });
    }

    const result = await instructorRevenueService.getInstructorRevenue(requestedInstructorId);

    res.status(200).json({
      success: true,
      data: {
        totalPending: result.data.summary.pendingAmount,
        pendingPayments: result.data.pendingPayments
      }
    });
  } catch (error) {
    console.error("Error in getPendingPayments:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch pending payments",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Get instructor revenue trends
 * @route   GET /api/v1/instructors/:id/revenue/trends
 * @access  Private (Instructor - own data or Admin)
 */
export const getRevenueTrends = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const requestedInstructorId = req.params.id;
    const currentUserId = req.user.id;

    // Check if user is requesting their own data or is an admin
    if (requestedInstructorId !== currentUserId && !req.user.role.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own revenue trends."
      });
    }

    const { period = 'month' } = req.query;

    const result = await instructorRevenueService.getInstructorRevenue(requestedInstructorId, {
      period,
      include_projections: true
    });

    res.status(200).json({
      success: true,
      data: {
        breakdown: result.data.breakdown,
        monthlyTrends: result.data.monthlyTrends,
        projections: result.data.projections
      }
    });
  } catch (error) {
    console.error("Error in getRevenueTrends:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch revenue trends",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Get platform revenue statistics (Admin only)
 * @route   GET /api/v1/instructors/revenue/platform-stats
 * @access  Private (Admin only)
 */
export const getPlatformRevenueStats = async (req, res) => {
  try {
    // Check admin access
    if (!req.user.role.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required."
      });
    }

    // This would require a separate service method for platform-wide statistics
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      message: "Platform revenue statistics endpoint - to be implemented",
      data: {
        totalPlatformRevenue: 0,
        averageInstructorRevenue: 0,
        topPerformingInstructors: [],
        revenueGrowth: 0
      }
    });
  } catch (error) {
    console.error("Error in getPlatformRevenueStats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch platform revenue statistics",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
}; 