import { body, query, param, validationResult } from "express-validator";
import mongoose from "mongoose";
import moment from "moment-timezone";

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.param,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

/**
 * Validation for creating a demo booking
 */
export const validateCreateBooking = [
  body("userId")
    .optional()
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address")
    .isLength({ max: 255 })
    .withMessage("Email cannot exceed 255 characters"),

  body("fullName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(
      "Full name can only contain letters, spaces, hyphens, and apostrophes",
    ),

  body("phoneNumber")
    .optional()
    .trim()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage("Please provide a valid phone number")
    .isLength({ min: 10, max: 20 })
    .withMessage("Phone number must be between 10 and 20 characters"),

  body("timeSlot")
    .optional()
    .isISO8601()
    .withMessage("Time slot must be a valid ISO 8601 date string")
    .custom((value) => {
      if (!value) return true;
      const bookingDate = new Date(value);
      const now = new Date();
      const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
      const maxBookingTime = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

      if (bookingDate <= minBookingTime) {
        throw new Error("Demo must be scheduled at least 2 hours in advance");
      }

      if (bookingDate > maxBookingTime) {
        throw new Error(
          "Demo cannot be scheduled more than 90 days in advance",
        );
      }

      // Check if it's during business hours (9 AM to 6 PM UTC)
      const hour = bookingDate.getUTCHours();
      const dayOfWeek = bookingDate.getUTCDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        throw new Error("Demos can only be scheduled on weekdays");
      }

      if (hour < 9 || hour >= 18) {
        throw new Error(
          "Demos can only be scheduled between 9 AM and 6 PM UTC",
        );
      }

      return true;
    }),

  body("timezone")
    .optional()
    .custom((value) => {
      if (value && !moment.tz.names().includes(value)) {
        throw new Error(
          "Invalid timezone. Please provide a valid IANA timezone identifier",
        );
      }
      return true;
    }),

  body("demoType")
    .optional()
    .isIn([
      "course_demo",
      "consultation",
      "product_walkthrough",
      "general_inquiry",
    ])
    .withMessage(
      "Demo type must be one of: course_demo, consultation, product_walkthrough, general_inquiry",
    ),

  body("courseInterest")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Course interest cannot exceed 200 characters"),

  body("experienceLevel")
    .optional()
    .isIn(["beginner", "intermediate", "advanced", "expert"])
    .withMessage(
      "Experience level must be one of: beginner, intermediate, advanced, expert",
    ),

  body("companyName")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Company name cannot exceed 100 characters"),

  body("jobTitle")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Job title cannot exceed 100 characters"),

  body("requirements")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Requirements cannot exceed 1000 characters"),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),

  body("source")
    .optional()
    .isIn(["website", "social_media", "referral", "advertisement", "other"])
    .withMessage(
      "Source must be one of: website, social_media, referral, advertisement, other",
    ),

  body("utmParameters")
    .optional()
    .isObject()
    .withMessage("UTM parameters must be an object"),

  body("utmParameters.source")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("UTM source cannot exceed 100 characters"),

  body("utmParameters.medium")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("UTM medium cannot exceed 100 characters"),

  body("utmParameters.campaign")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("UTM campaign cannot exceed 100 characters"),

  body("utmParameters.term")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("UTM term cannot exceed 100 characters"),

  body("utmParameters.content")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("UTM content cannot exceed 100 characters"),

  // Zoom meeting settings validation
  body("autoGenerateZoomMeeting")
    .optional()
    .isBoolean()
    .withMessage("autoGenerateZoomMeeting must be a boolean"),

  body("zoomMeetingSettings")
    .optional()
    .isObject()
    .withMessage("zoomMeetingSettings must be an object"),

  body("zoomMeetingSettings.duration")
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage("Meeting duration must be between 15 and 480 minutes"),

  body("zoomMeetingSettings.auto_recording")
    .optional()
    .isIn(["local", "cloud", "none"])
    .withMessage("auto_recording must be one of: local, cloud, none"),

  body("zoomMeetingSettings.waiting_room")
    .optional()
    .isBoolean()
    .withMessage("waiting_room must be a boolean"),

  body("zoomMeetingSettings.host_video")
    .optional()
    .isBoolean()
    .withMessage("host_video must be a boolean"),

  body("zoomMeetingSettings.participant_video")
    .optional()
    .isBoolean()
    .withMessage("participant_video must be a boolean"),

  body("zoomMeetingSettings.mute_upon_entry")
    .optional()
    .isBoolean()
    .withMessage("mute_upon_entry must be a boolean"),

  body("zoomMeetingSettings.join_before_host")
    .optional()
    .isBoolean()
    .withMessage("join_before_host must be a boolean"),

  body("zoomMeetingSettings.meeting_authentication")
    .optional()
    .isBoolean()
    .withMessage("meeting_authentication must be a boolean"),

  body("zoomMeetingSettings.registrants_confirmation_email")
    .optional()
    .isBoolean()
    .withMessage("registrants_confirmation_email must be a boolean"),

  body("zoomMeetingSettings.registrants_email_notification")
    .optional()
    .isBoolean()
    .withMessage("registrants_email_notification must be a boolean"),

  handleValidationErrors,
];

/**
 * Validation for getting user bookings
 */
export const validateGetUserBookings = [
  query("userId")
    .optional()
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),

  query("status")
    .optional()
    .isIn([
      "pending",
      "confirmed",
      "cancelled",
      "rescheduled",
      "completed",
      "no-show",
    ])
    .withMessage(
      "Status must be one of: pending, confirmed, cancelled, rescheduled, completed, no-show",
    ),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date string"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date string")
    .custom((value, { req }) => {
      if (value && req.query.startDate) {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error("End date must be after start date");
        }
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * Validation for updating a booking
 */
export const validateUpdateBooking = [
  body("bookingId")
    .isMongoId()
    .withMessage("Booking ID must be a valid MongoDB ObjectId"),

  body("action")
    .isIn(["cancel", "reschedule", "confirm", "complete"])
    .withMessage(
      "Action must be one of: cancel, reschedule, confirm, complete",
    ),

  body("newTimeSlot")
    .if(body("action").equals("reschedule"))
    .isISO8601()
    .withMessage("New time slot must be a valid ISO 8601 date string")
    .custom((value) => {
      const bookingDate = new Date(value);
      const now = new Date();
      const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      if (bookingDate <= minBookingTime) {
        throw new Error("Rescheduled demo must be at least 2 hours in advance");
      }

      return true;
    }),

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters"),

  body("rating")
    .if(body("action").equals("complete"))
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("feedback")
    .if(body("action").equals("complete"))
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Feedback cannot exceed 1000 characters"),

  body("completionNotes")
    .if(body("action").equals("complete"))
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Completion notes cannot exceed 1000 characters"),

  handleValidationErrors,
];

/**
 * Validation for booking ID parameter
 */
export const validateBookingId = [
  param("bookingId")
    .isMongoId()
    .withMessage("Booking ID must be a valid MongoDB ObjectId"),

  handleValidationErrors,
];

/**
 * Custom validation to check for duplicate bookings
 */
export const checkDuplicateBooking = async (req, res, next) => {
  try {
    const { email, timeSlot } = req.body;
    if (!timeSlot) return next(); // Skip if no timeSlot
    const bookingTime = new Date(timeSlot);

    // Check for bookings within 1 hour of the requested time
    const hourBefore = new Date(bookingTime.getTime() - 60 * 60 * 1000);
    const hourAfter = new Date(bookingTime.getTime() + 60 * 60 * 1000);

    const DemoBooking = (await import("../models/demo-booking.model.js"))
      .default;

    const existingBooking = await DemoBooking.findOne({
      email: email.toLowerCase(),
      scheduledDateTime: {
        $gte: hourBefore,
        $lte: hourAfter,
      },
      status: { $in: ["pending", "confirmed", "rescheduled"] },
      isActive: true,
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: "You already have a demo booking within one hour of this time",
        error_code: "DUPLICATE_BOOKING",
        existing_booking: {
          id: existingBooking._id,
          scheduledDateTime: existingBooking.scheduledDateTime,
          status: existingBooking.status,
        },
      });
    }

    next();
  } catch (error) {
    console.error("Error checking duplicate booking:", error);
    return res.status(500).json({
      success: false,
      message: "Error validating booking availability",
      error_code: "VALIDATION_ERROR",
    });
  }
};

/**
 * Custom validation to check time slot availability
 */
export const checkTimeSlotAvailability = async (req, res, next) => {
  try {
    const { timeSlot } = req.body;
    if (!timeSlot) return next(); // Skip if no timeSlot
    const bookingTime = new Date(timeSlot);

    // Import DemoBooking model dynamically to avoid circular dependency
    const DemoBooking = (await import("../models/demo-booking.model.js"))
      .default;

    // Check if there are too many bookings at the same time (max 3 concurrent demos)
    const concurrentBookings = await DemoBooking.countDocuments({
      scheduledDateTime: bookingTime,
      status: { $in: ["pending", "confirmed", "rescheduled"] },
      isActive: true,
    });

    if (concurrentBookings >= 3) {
      return res.status(409).json({
        success: false,
        message:
          "This time slot is fully booked. Please choose a different time.",
        error_code: "TIME_SLOT_UNAVAILABLE",
      });
    }

    next();
  } catch (error) {
    console.error("Error checking time slot availability:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking time slot availability",
      error_code: "AVAILABILITY_CHECK_ERROR",
    });
  }
};

/**
 * Validation for Zoom meeting settings when creating/updating meetings
 */
export const validateZoomMeetingSettings = [
  body("zoomMeetingSettings")
    .optional()
    .isObject()
    .withMessage("zoomMeetingSettings must be an object"),

  body("zoomMeetingSettings.duration")
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage("Meeting duration must be between 15 and 480 minutes"),

  body("zoomMeetingSettings.auto_recording")
    .optional()
    .isIn(["local", "cloud", "none"])
    .withMessage("auto_recording must be one of: local, cloud, none"),

  body("zoomMeetingSettings.waiting_room")
    .optional()
    .isBoolean()
    .withMessage("waiting_room must be a boolean"),

  body("zoomMeetingSettings.host_video")
    .optional()
    .isBoolean()
    .withMessage("host_video must be a boolean"),

  body("zoomMeetingSettings.participant_video")
    .optional()
    .isBoolean()
    .withMessage("participant_video must be a boolean"),

  body("zoomMeetingSettings.mute_upon_entry")
    .optional()
    .isBoolean()
    .withMessage("mute_upon_entry must be a boolean"),

  body("zoomMeetingSettings.join_before_host")
    .optional()
    .isBoolean()
    .withMessage("join_before_host must be a boolean"),

  body("zoomMeetingSettings.meeting_authentication")
    .optional()
    .isBoolean()
    .withMessage("meeting_authentication must be a boolean"),

  body("zoomMeetingSettings.registrants_confirmation_email")
    .optional()
    .isBoolean()
    .withMessage("registrants_confirmation_email must be a boolean"),

  body("zoomMeetingSettings.registrants_email_notification")
    .optional()
    .isBoolean()
    .withMessage("registrants_email_notification must be a boolean"),

  handleValidationErrors,
];

/**
 * Sanitize and normalize input data
 */
export const sanitizeBookingData = (req, res, next) => {
  try {
    // Capture client information
    req.body.ipAddress = req.ip || req.connection.remoteAddress;
    req.body.userAgent = req.headers["user-agent"];

    // Normalize timezone
    if (!req.body.timezone && req.headers["timezone"]) {
      req.body.timezone = req.headers["timezone"];
    }

    // Set default timezone if not provided
    if (!req.body.timezone) {
      req.body.timezone = "UTC";
    }

    // Convert timeSlot to scheduledDateTime
    if (req.body.timeSlot) {
      req.body.scheduledDateTime = new Date(req.body.timeSlot);
    }

    next();
  } catch (error) {
    console.error("Error sanitizing booking data:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing booking data",
      error_code: "DATA_SANITIZATION_ERROR",
    });
  }
};
