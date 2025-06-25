import attendanceService from "../services/attendanceService.js";
import { validationResult } from "express-validator";

/**
 * Helper function to check if user has instructor access
 * @param {string|string[]} userRole - User's role(s)
 * @returns {boolean} - Whether user has instructor access
 */
const hasInstructorAccess = (userRole) => {
  const userRoles = Array.isArray(userRole) ? userRole : [userRole];
  return userRoles.includes('instructor') || userRoles.includes('admin') || userRoles.includes('super-admin');
};

/**
 * @desc    Mark attendance for a session
 * @route   POST /api/v1/attendance/mark
 * @access  Private (Instructor only)
 */
export const markAttendance = async (req, res) => {
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

    // Verify user is an instructor
    if (!hasInstructorAccess(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Instructor role required."
      });
    }

    const attendanceData = {
      ...req.body,
      instructor_id: req.user.id,
      marked_by: req.user.id
    };

    const result = await attendanceService.markAttendance(attendanceData);

    res.status(201).json(result);
  } catch (error) {
    console.error("Error in markAttendance:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to mark attendance",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Bulk mark attendance for multiple students
 * @route   POST /api/v1/attendance/bulk-mark
 * @access  Private (Instructor only)
 */
export const bulkMarkAttendance = async (req, res) => {
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

    // Verify user is an instructor
    if (!hasInstructorAccess(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Instructor role required."
      });
    }

    const bulkData = {
      ...req.body,
      updated_by: req.user.id
    };

    const result = await attendanceService.bulkMarkAttendance(bulkData);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in bulkMarkAttendance:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to bulk mark attendance",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Update single attendance record
 * @route   PUT /api/v1/attendance/:id/update
 * @access  Private (Instructor only)
 */
export const updateAttendanceRecord = async (req, res) => {
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

    // Verify user is an instructor
    if (!hasInstructorAccess(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Instructor role required."
      });
    }

    const { id } = req.params;
    const { student_id, ...updateData } = req.body;

    const result = await attendanceService.updateAttendanceRecord(id, student_id, updateData);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in updateAttendanceRecord:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update attendance record",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Get attendance by ID
 * @route   GET /api/v1/attendance/:id
 * @access  Private (Instructor/Admin)
 */
export const getAttendanceById = async (req, res) => {
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

    const { id } = req.params;

    const result = await attendanceService.getAttendanceById(id);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getAttendanceById:", error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found"
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch attendance",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Get batch attendance summary
 * @route   GET /api/v1/attendance/batch/:id/summary
 * @access  Private (Instructor/Admin)
 */
export const getBatchAttendanceSummary = async (req, res) => {
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

    const { id } = req.params;
    const { start_date, end_date, session_type } = req.query;

    const options = {};
    if (start_date) options.start_date = start_date;
    if (end_date) options.end_date = end_date;
    if (session_type) options.session_type = session_type;

    const result = await attendanceService.getBatchAttendanceSummary(id, options);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getBatchAttendanceSummary:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch batch attendance summary",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Get instructor attendance reports
 * @route   GET /api/v1/attendance/reports/instructor/:id
 * @access  Private (Instructor - own data or Admin)
 */
export const getInstructorAttendanceReports = async (req, res) => {
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
        message: "Access denied. You can only view your own reports."
      });
    }

    const { start_date, end_date, batch_id } = req.query;

    const options = {};
    if (start_date) options.start_date = start_date;
    if (end_date) options.end_date = end_date;
    if (batch_id) options.batch_id = batch_id;

    const result = await attendanceService.getInstructorAttendanceReports(requestedInstructorId, options);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getInstructorAttendanceReports:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch instructor attendance reports",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Finalize attendance (lock from edits)
 * @route   PUT /api/v1/attendance/:id/finalize
 * @access  Private (Instructor only)
 */
export const finalizeAttendance = async (req, res) => {
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

    // Verify user is an instructor
    if (!req.user.role.includes('instructor')) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Instructor role required."
      });
    }

    const { id } = req.params;

    const result = await attendanceService.finalizeAttendance(id, req.user.id);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in finalizeAttendance:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to finalize attendance",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Get attendance analytics
 * @route   GET /api/v1/attendance/analytics/instructor/:id
 * @access  Private (Instructor - own data or Admin)
 */
export const getAttendanceAnalytics = async (req, res) => {
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
        message: "Access denied. You can only view your own analytics."
      });
    }

    const { period } = req.query;

    const options = {};
    if (period) options.period = period;

    const result = await attendanceService.getAttendanceAnalytics(requestedInstructorId, options);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getAttendanceAnalytics:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch attendance analytics",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Export attendance data
 * @route   GET /api/v1/attendance/export
 * @access  Private (Instructor/Admin)
 */
export const exportAttendanceData = async (req, res) => {
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

    const { instructor_id, batch_id, start_date, end_date, format } = req.query;

    // If instructor_id is specified and user is not admin, ensure they can only export their own data
    if (instructor_id && instructor_id !== req.user.id && !req.user.role.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only export your own data."
      });
    }

    const filters = {
      instructor_id: instructor_id || (req.user.role.includes('instructor') ? req.user.id : undefined),
      batch_id,
      start_date,
      end_date,
      format: format || 'json'
    };

    const result = await attendanceService.exportAttendanceData(filters);

    // Set appropriate headers for file download
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance-export.csv');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance-export.json');
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in exportAttendanceData:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to export attendance data",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Get instructor's attendance summary (for dashboard)
 * @route   GET /api/v1/attendance/instructor/summary
 * @access  Private (Instructor only)
 */
export const getInstructorAttendanceSummary = async (req, res) => {
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

    const result = await attendanceService.getAttendanceAnalytics(instructorId, { period });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getInstructorAttendanceSummary:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch attendance summary",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
};

/**
 * @desc    Get student attendance for instructor's batches
 * @route   GET /api/v1/attendance/student/:studentId/batch/:batchId
 * @access  Private (Instructor/Admin)
 */
export const getStudentAttendance = async (req, res) => {
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

    const { studentId, batchId } = req.params;
    const { start_date, end_date } = req.query;

    // TODO: Add authorization check to ensure instructor can access this batch's data

    const studentAttendance = await attendanceService.getStudentAttendanceSummary(batchId, start_date, end_date);
    
    // Filter for specific student
    const specificStudent = studentAttendance.find(
      student => student.student._id.toString() === studentId
    );

    if (!specificStudent) {
      return res.status(404).json({
        success: false,
        message: "Student attendance not found"
      });
    }

    res.status(200).json({
      success: true,
      data: specificStudent
    });
  } catch (error) {
    console.error("Error in getStudentAttendance:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch student attendance",
      error: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
}; 