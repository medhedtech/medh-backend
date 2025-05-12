import { body, param } from "express-validator";
import mongoose from "mongoose";

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
    .withMessage("Capacity must be a positive integer"),
  
  body("assigned_instructor")
    .notEmpty()
    .withMessage("Assigned instructor is required")
    .isMongoId()
    .withMessage("Invalid instructor ID format"),
  
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
    .withMessage("Capacity must be a positive integer"),
  
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