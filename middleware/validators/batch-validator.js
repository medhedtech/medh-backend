import { body, param } from "express-validator";
import mongoose from "mongoose";
import { validationResult } from "express-validator";

// Validate course ID parameter
export const validateCourseId = [
  param("courseId")
    .isMongoId()
    .withMessage("Invalid course ID format"),
];

// Validate batch ID parameter
export const validateBatchId = [
  param("batchId")
    .isMongoId()
    .withMessage("Invalid batch ID format"),
];

// Validate instructor ID parameter
export const validateInstructorId = [
  param("instructorId")
    .isMongoId()
    .withMessage("Invalid instructor ID format"),
];

// Validate batch creation
export const validateBatchCreate = [
  body("batch_name")
    .trim()
    .notEmpty()
    .withMessage("Batch name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Batch name must be between 3 and 100 characters"),
  
  body("batch_code")
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Batch code must be between 3 and 20 characters")
    .matches(/^[A-Za-z0-9\-_]+$/)
    .withMessage("Batch code can only contain alphanumeric characters, hyphens, and underscores"),
  
  body("batch_type")
    .optional()
    .isIn(["group", "individual"])
    .withMessage("Batch type must be either 'group' or 'individual'"),
  
  body("start_date")
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601()
    .withMessage("Start date must be a valid date in ISO 8601 format"),
  
  body("end_date")
    .notEmpty()
    .withMessage("End date is required")
    .isISO8601()
    .withMessage("End date must be a valid date in ISO 8601 format")
    .custom((value, { req }) => {
      const startDate = new Date(req.body.start_date);
      const endDate = new Date(value);
      if (endDate <= startDate) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),
  
  body("capacity")
    .notEmpty()
    .withMessage("Capacity is required")
    .isInt({ min: 1 })
    .withMessage("Capacity must be a positive integer")
    .custom((value, { req }) => {
      // If batch_type is individual, capacity should be 1
      if (req.body.batch_type === 'individual' && value > 1) {
        throw new Error("Individual batch type can only have capacity of 1");
      }
      return true;
    }),
  
  body("assigned_instructor")
    .notEmpty()
    .withMessage("Assigned instructor is required")
    .isMongoId()
    .withMessage("Invalid instructor ID format"),
  
  body("student_id")
    .optional()
    .isMongoId()
    .withMessage("Invalid student ID format")
    .custom((value, { req }) => {
      // If student_id is provided, batch_type should be individual
      if (value && req.body.batch_type !== 'individual') {
        throw new Error("student_id can only be provided for individual batch type");
      }
      return true;
    }),
  
  body("status")
    .optional()
    .isIn(["Active", "Upcoming", "Completed", "Cancelled"])
    .withMessage("Invalid batch status"),
  
  body("schedule")
    .isArray()
    .withMessage("Schedule must be an array")
    .notEmpty()
    .withMessage("Schedule is required"),
  
  body("schedule.*.day")
    .isIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])
    .withMessage("Invalid day in schedule"),
  
  body("schedule.*.start_time")
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Start time must be in HH:MM format (24-hour)"),
  
  body("schedule.*.end_time")
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("End time must be in HH:MM format (24-hour)")
    .custom((value, { req }) => {
      const scheduleIndex = req.body.schedule.findIndex(item => item.end_time === value);
      if (scheduleIndex === -1) return true;
      
      const startTime = req.body.schedule[scheduleIndex].start_time;
      if (!startTime) return true;
      
      const startParts = startTime.split(':').map(Number);
      const endParts = value.split(':').map(Number);
      const startMins = startParts[0] * 60 + startParts[1];
      const endMins = endParts[0] * 60 + endParts[1];
      
      if (endMins <= startMins) {
        throw new Error("End time must be after start time");
      }
      return true;
    }),
    
  body("batch_notes")
    .optional()
    .trim(),
];

// Validate batch update
export const validateBatchUpdate = [
  body("batch_name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Batch name cannot be empty")
    .isLength({ min: 3, max: 100 })
    .withMessage("Batch name must be between 3 and 100 characters"),
  
  body("batch_type")
    .optional()
    .isIn(["group", "individual"])
    .withMessage("Batch type must be either 'group' or 'individual'"),
  
  body("status")
    .optional()
    .isIn(["Active", "Upcoming", "Completed", "Cancelled"])
    .withMessage("Invalid batch status"),
  
  body("start_date")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date in ISO 8601 format"),
  
  body("end_date")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date in ISO 8601 format")
    .custom((value, { req }) => {
      if (req.body.start_date) {
        const startDate = new Date(req.body.start_date);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error("End date must be after start date");
        }
      }
      return true;
    }),
  
  body("capacity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Capacity must be a positive integer")
    .custom((value, { req }) => {
      // If batch_type is individual, capacity should be 1
      if (req.body.batch_type === 'individual' && value > 1) {
        throw new Error("Individual batch type can only have capacity of 1");
      }
      return true;
    }),
  
  body("assigned_instructor")
    .optional()
    .isMongoId()
    .withMessage("Invalid instructor ID format"),
  
  body("schedule")
    .optional()
    .isArray()
    .withMessage("Schedule must be an array"),
  
  body("schedule.*.day")
    .optional()
    .isIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])
    .withMessage("Invalid day in schedule"),
  
  body("schedule.*.start_time")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Start time must be in HH:MM format (24-hour)"),
  
  body("schedule.*.end_time")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("End time must be in HH:MM format (24-hour)"),
  
  body("batch_notes")
    .optional()
    .trim(),
];

/**
 * Validate student ID parameter
 */
export const validateStudentId = [
  param("studentId")
    .isMongoId()
    .withMessage("Invalid student ID format"),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validate add student to batch request
 */
export const validateAddStudentToBatch = [
  body("studentId")
    .isMongoId()
    .withMessage("Valid student ID is required"),
  
  body("paymentPlan")
    .optional()
    .isIn(["full_payment", "installments"])
    .withMessage("Payment plan must be either 'full_payment' or 'installments'"),
  
  body("notes")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes must be a string with maximum 500 characters"),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validate transfer student request
 */
export const validateTransferStudent = [
  body("targetBatchId")
    .isMongoId()
    .withMessage("Valid target batch ID is required"),
  
  body("reason")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Reason must be a string with maximum 200 characters"),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validate update student status request
 */
export const validateUpdateStudentStatus = [
  body("status")
    .isIn(["active", "completed", "on_hold", "cancelled"])
    .withMessage("Status must be one of: active, completed, on_hold, cancelled"),
  
  body("reason")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Reason must be a string with maximum 200 characters"),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validate batch status update
 */
export const validateBatchStatusUpdate = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["Active", "Upcoming", "Completed", "Cancelled"])
    .withMessage("Invalid batch status. Must be one of: Active, Upcoming, Completed, Cancelled"),
  
  body("reason")
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage("Reason must be between 5 and 500 characters if provided"),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array()
      });
    }
    next();
  }
];

// Validate recorded lesson addition
export const validateRecordedLesson = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Recorded lesson title is required"),
  body("url")
    .trim()
    .notEmpty()
    .withMessage("Recorded lesson URL is required")
    .isURL()
    .withMessage("Recorded lesson URL must be a valid URL"),
  body("recorded_date")
    .optional()
    .isISO8601()
    .withMessage("Recorded date must be a valid ISO 8601 date"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array()
      });
    }
    next();
  }
];

// Validate scheduled session ID parameter
export const validateScheduleSessionId = [
  param("sessionId")
    .isMongoId()
    .withMessage("Invalid scheduled session ID format"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    next();
  }
];

// Validate scheduling a new session for a batch
export const validateScheduledSession = [
  body("day")
    .isIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])
    .withMessage("Invalid day for scheduled session"),
  body("start_time")
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Start time must be in HH:MM format (24-hour)"),
  body("end_time")
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("End time must be in HH:MM format (24-hour)")
    .custom((value, { req }) => {
      const startParts = req.body.start_time.split(':').map(Number);
      const endParts = value.split(':').map(Number);
      const startMins = startParts[0] * 60 + startParts[1];
      const endMins = endParts[0] * 60 + endParts[1];
      if (endMins <= startMins) {
        throw new Error("End time must be after start time");
      }
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    next();
  }
];

// Validate Zoom meeting data for scheduled session
export const validateZoomMeeting = [
  body("topic")
    .trim()
    .notEmpty()
    .withMessage("Meeting topic is required"),
  body("start_time")
    .notEmpty()
    .withMessage("Meeting start_time is required")
    .isISO8601()
    .withMessage("start_time must be a valid ISO 8601 date"),
  body("duration")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Duration must be a positive integer"),
  body("timezone")
    .optional()
    .isString(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    next();
  }
]; 