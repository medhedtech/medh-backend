import { body, param, query } from "express-validator";

// Validation for marking attendance
export const validateMarkAttendance = [
  body('batch_id')
    .isMongoId()
    .withMessage('Valid batch ID is required'),
  
  body('session_date')
    .isISO8601()
    .withMessage('Valid session date is required'),
  
  body('session_type')
    .isIn(['live_class', 'demo', 'workshop', 'lab', 'exam', 'presentation'])
    .withMessage('Valid session type is required'),
  
  body('session_title')
    .notEmpty()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Session title must be between 3 and 200 characters'),
  
  body('session_duration_minutes')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('Session duration must be between 15 and 480 minutes'),
  
  body('attendance_records')
    .isArray({ min: 1 })
    .withMessage('At least one attendance record is required'),
  
  body('attendance_records.*.student_id')
    .isMongoId()
    .withMessage('Valid student ID is required for each record'),
  
  body('attendance_records.*.status')
    .isIn(['present', 'absent', 'late', 'excused'])
    .withMessage('Valid attendance status is required'),
  
  body('attendance_records.*.join_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s?(AM|PM))?$/i)
    .withMessage('Valid join time format is required (HH:MM or HH:MM AM/PM)'),
  
  body('attendance_records.*.leave_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s?(AM|PM))?$/i)
    .withMessage('Valid leave time format is required (HH:MM or HH:MM AM/PM)'),
  
  body('attendance_records.*.duration_minutes')
    .optional()
    .isInt({ min: 0, max: 480 })
    .withMessage('Duration must be between 0 and 480 minutes'),
  
  body('attendance_records.*.notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
  
  body('session_notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Session notes must not exceed 1000 characters'),
  
  body('meeting_link')
    .optional()
    .isURL()
    .withMessage('Valid meeting link URL is required'),
  
  body('recording_link')
    .optional()
    .isURL()
    .withMessage('Valid recording link URL is required'),
  
  body('materials_shared')
    .optional()
    .isArray()
    .withMessage('Materials shared must be an array'),
  
  body('materials_shared.*.name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Material name must be between 1 and 100 characters'),
  
  body('materials_shared.*.url')
    .optional()
    .isURL()
    .withMessage('Valid material URL is required'),
  
  body('materials_shared.*.type')
    .optional()
    .isIn(['document', 'video', 'presentation', 'code', 'other'])
    .withMessage('Valid material type is required')
];

// Validation for bulk marking attendance
export const validateBulkMarkAttendance = [
  body('attendance_id')
    .isMongoId()
    .withMessage('Valid attendance ID is required'),
  
  body('attendance_records')
    .isArray({ min: 1 })
    .withMessage('At least one attendance record is required'),
  
  body('attendance_records.*.student_id')
    .isMongoId()
    .withMessage('Valid student ID is required for each record'),
  
  body('attendance_records.*.status')
    .isIn(['present', 'absent', 'late', 'excused'])
    .withMessage('Valid attendance status is required'),
  
  body('attendance_records.*.join_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s?(AM|PM))?$/i)
    .withMessage('Valid join time format is required'),
  
  body('attendance_records.*.leave_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s?(AM|PM))?$/i)
    .withMessage('Valid leave time format is required'),
  
  body('attendance_records.*.duration_minutes')
    .optional()
    .isInt({ min: 0, max: 480 })
    .withMessage('Duration must be between 0 and 480 minutes'),
  
  body('attendance_records.*.notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
];

// Validation for updating attendance record
export const validateUpdateAttendanceRecord = [
  param('id')
    .isMongoId()
    .withMessage('Valid attendance ID is required'),
  
  body('student_id')
    .isMongoId()
    .withMessage('Valid student ID is required'),
  
  body('status')
    .isIn(['present', 'absent', 'late', 'excused'])
    .withMessage('Valid attendance status is required'),
  
  body('join_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s?(AM|PM))?$/i)
    .withMessage('Valid join time format is required'),
  
  body('leave_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s?(AM|PM))?$/i)
    .withMessage('Valid leave time format is required'),
  
  body('duration_minutes')
    .optional()
    .isInt({ min: 0, max: 480 })
    .withMessage('Duration must be between 0 and 480 minutes'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
];

// Validation for attendance ID parameter
export const validateAttendanceId = [
  param('id')
    .isMongoId()
    .withMessage('Valid attendance ID is required')
];

// Validation for batch ID parameter
export const validateBatchId = [
  param('id')
    .isMongoId()
    .withMessage('Valid batch ID is required')
];

// Validation for instructor ID parameter
export const validateInstructorId = [
  param('id')
    .isMongoId()
    .withMessage('Valid instructor ID is required')
];

// Validation for student and batch ID parameters
export const validateStudentBatchIds = [
  param('studentId')
    .isMongoId()
    .withMessage('Valid student ID is required'),
  
  param('batchId')
    .isMongoId()
    .withMessage('Valid batch ID is required')
];

// Validation for attendance query parameters
export const validateAttendanceQuery = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Valid start date is required (ISO 8601 format)'),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required (ISO 8601 format)'),
  
  query('session_type')
    .optional()
    .isIn(['live_class', 'demo', 'workshop', 'lab', 'exam', 'presentation'])
    .withMessage('Valid session type is required'),
  
  query('batch_id')
    .optional()
    .isMongoId()
    .withMessage('Valid batch ID is required'),
  
  query('instructor_id')
    .optional()
    .isMongoId()
    .withMessage('Valid instructor ID is required'),
  
  query('period')
    .optional()
    .isIn(['week', 'month', 'quarter', 'year'])
    .withMessage('Valid period is required'),
  
  query('format')
    .optional()
    .isIn(['json', 'csv', 'excel'])
    .withMessage('Valid export format is required'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sort')
    .optional()
    .isIn(['session_date', 'attendance_percentage', 'session_type', 'batch_name'])
    .withMessage('Valid sort field is required'),
  
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Valid sort order is required (asc or desc)')
];

// Custom validation to check if end_date is after start_date
export const validateDateRange = (req, res, next) => {
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
    
    // Check if date range is not too large (max 1 year)
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 365) {
      return res.status(400).json({
        success: false,
        message: 'Date range cannot exceed 365 days'
      });
    }
  }
  
  next();
};

// Validation for export query parameters
export const validateExportQuery = [
  query('instructor_id')
    .optional()
    .isMongoId()
    .withMessage('Valid instructor ID is required'),
  
  query('batch_id')
    .optional()
    .isMongoId()
    .withMessage('Valid batch ID is required'),
  
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Valid start date is required'),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required'),
  
  query('format')
    .optional()
    .isIn(['json', 'csv', 'excel'])
    .withMessage('Valid export format is required'),
  
  query('include_student_details')
    .optional()
    .isBoolean()
    .withMessage('Include student details must be a boolean'),
  
  query('session_types')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        const types = value.split(',');
        const validTypes = ['live_class', 'demo', 'workshop', 'lab', 'exam', 'presentation'];
        return types.every(type => validTypes.includes(type.trim()));
      }
      return true;
    })
    .withMessage('Valid session types are required (comma-separated)')
];

// Validation for finalize attendance
export const validateFinalizeAttendance = [
  param('id')
    .isMongoId()
    .withMessage('Valid attendance ID is required'),
  
  body('confirmation')
    .optional()
    .isBoolean()
    .withMessage('Confirmation must be a boolean'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
];

// Validation for attendance analytics
export const validateAnalyticsQuery = [
  param('id')
    .isMongoId()
    .withMessage('Valid instructor ID is required'),
  
  query('period')
    .optional()
    .isIn(['week', 'month', 'quarter', 'year'])
    .withMessage('Valid period is required'),
  
  query('include_trends')
    .optional()
    .isBoolean()
    .withMessage('Include trends must be a boolean'),
  
  query('group_by')
    .optional()
    .isIn(['day', 'week', 'month', 'session_type', 'batch'])
    .withMessage('Valid group by option is required')
];

// Combined validation for common attendance operations
export const validateCommonAttendanceOperation = [
  ...validateAttendanceQuery,
  validateDateRange
];

// Validation middleware for checking if user can access attendance data
export const validateAttendanceAccess = async (req, res, next) => {
  try {
    const { user } = req;
    const { id, batchId, instructorId } = req.params;
    
    // Admin can access all data
    if (user.role.includes('admin')) {
      return next();
    }
    
    // Instructor can only access their own data
    if (user.role.includes('instructor')) {
      if (instructorId && instructorId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own attendance data.'
        });
      }
      
      // TODO: Add batch ownership validation
      // if (batchId) {
      //   const batch = await Batch.findById(batchId);
      //   if (!batch || batch.instructor_id.toString() !== user.id) {
      //     return res.status(403).json({
      //       success: false,
      //       message: 'Access denied. You can only access your own batch data.'
      //     });
      //   }
      // }
    }
    
    next();
  } catch (error) {
    console.error('Error in validateAttendanceAccess:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating attendance access'
    });
  }
}; 