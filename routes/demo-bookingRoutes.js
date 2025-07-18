import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  validateCreateBooking,
  validateGetUserBookings,
  validateUpdateBooking,
  validateBookingId,
  checkDuplicateBooking,
  checkTimeSlotAvailability,
  sanitizeBookingData,
  validateZoomMeetingSettings,
} from "../validations/demoBookingValidation.js";
import {
  createDemoBooking,
  getUserBookings,
  updateDemoBooking,
  getDemoBookingById,
  getAvailableTimeSlots,
  getBookingStats,
  createZoomMeetingForDemo,
  getZoomMeetingDetails,
  getSupportedTimezones,
  addBookingNote, // Import the new controller function
} from "../controllers/demo-booking.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: DemoBooking
 *   description: Demo booking management
 */

/**
 * @route   POST /api/demo-booking
 * @desc    Create a new demo booking. Supports both direct scheduling (with timeSlot) and manual requests (without timeSlot).
 * @access  Public/Private (flexible - works with or without auth)
 * @body    { userId?, email, fullName, phoneNumber?, timeSlot?, timezone?, demoType?, courseInterest?, experienceLevel?, companyName?, jobTitle?, requirements?, notes?, source?, utmParameters? }
 * @response 201: Demo booking created successfully. Message changes based on whether a time slot was provided.
 * @response 400: Invalid input or time slot not available.
 */
router.post(
  "/",
  authenticateToken, // Optional auth - will work without token; if token, req.user is set
  sanitizeBookingData,
  validateCreateBooking,
  checkDuplicateBooking,
  checkTimeSlotAvailability,
  createDemoBooking,
);

/**
 * @route   GET /api/demo-booking
 * @desc    Get user bookings with optional filtering and pagination. Support team can filter by status=awaiting_schedule to fetch manual requests.
 * @access  Private (User's own bookings, or Admin/Instructor for general search)
 * @query   { userId?, status?, page?, limit?, startDate?, endDate? }
 * @response 200: List of demo bookings with pagination metadata.
 * @response 400: User ID is required if not admin/instructor.
 * @response 401: Unauthorized if authentication is required.
 */
router.get("/", authenticateToken, validateGetUserBookings, getUserBookings);

/**
 * @route   PUT /api/demo-booking
 * @desc    Update a demo booking (cancel, reschedule, confirm, complete, assign_time_slot)
 * @access  Private (User's own bookings, or Admin/Instructor for certain actions)
 * @body    { bookingId, action, newTimeSlot?, reason?, rating?, feedback?, completionNotes? }
 * @response 200: Demo booking updated successfully.
 * @response 400: Invalid input, action, or business rule violation.
 * @response 401: Unauthorized.
 * @response 403: Forbidden if user lacks permissions.
 * @response 404: Booking not found.
 */
router.put("/", authenticateToken, validateUpdateBooking, updateDemoBooking);

/**
 * @route   PUT /api/demo-booking/note
 * @desc    Add an internal note to a demo booking (for support/admin)
 * @access  Private (Admin/Instructor/Owner only)
 * @body    { bookingId, note }
 * @response 200: Note added successfully.
 * @response 400: Note content empty.
 * @response 401: Unauthorized.
 * @response 403: Forbidden if user lacks permissions.
 * @response 404: Booking not found.
 */
router.put("/note", authenticateToken, addBookingNote);

/**
 * @route   GET /api/demo-booking/timezones
 * @desc    Get supported timezones for demo booking
 * @access  Public
 * @response 200: List of supported timezones.
 */
router.get("/timezones", getSupportedTimezones);

/**
 * @route   GET /api/demo-booking/available-slots
 * @desc    Get available time slots for multiple days (7+ days)
 * @access  Public
 * @query   { startDate?, timezone?, days?, singleDay? }
 * @response 200: List of available time slots.
 */
router.get("/available-slots", getAvailableTimeSlots);

/**
 * @route   GET /api/demo-booking/stats
 * @desc    Get booking statistics for admin dashboard
 * @access  Private (Admin/Instructor only)
 * @query   { startDate?, endDate?, period? }
 * @response 200: Booking statistics.
 * @response 401: Unauthorized.
 * @response 403: Forbidden if user lacks admin/instructor privileges.
 */
router.get("/stats", authenticateToken, getBookingStats);

/**
 * @route   GET /api/demo-booking/:bookingId
 * @desc    Get a specific demo booking by ID, including full audit history.
 * @access  Private (User's own booking, or Admin/Instructor for any booking)
 * @params  { bookingId }
 * @response 200: Demo booking details.
 * @response 401: Unauthorized.
 * @response 403: Forbidden if user lacks permissions.
 * @response 404: Booking not found.
 */
router.get(
  "/:bookingId",
  authenticateToken,
  validateBookingId,
  getDemoBookingById,
);

/**
 * @route   POST /api/demo-booking/:bookingId/zoom-meeting
 * @desc    Create or regenerate Zoom meeting for existing demo booking
 * @access  Private (Admin/Instructor/Owner only)
 * @params  { bookingId }
 * @body    { zoomMeetingSettings? }
 * @response 201: Zoom meeting created/regenerated successfully.
 * @response 400: Invalid input or past booking.
 * @response 401: Unauthorized.
 * @response 403: Forbidden if user lacks permissions.
 * @response 404: Booking not found.
 */
router.post(
  "/:bookingId/zoom-meeting",
  authenticateToken,
  validateBookingId,
  validateZoomMeetingSettings,
  createZoomMeetingForDemo,
);

/**
 * @route   GET /api/demo-booking/:bookingId/zoom-meeting
 * @desc    Get Zoom meeting details for a demo booking
 * @access  Private (Admin/Instructor/Owner only)
 * @params  { bookingId }
 * @response 200: Zoom meeting details.
 * @response 401: Unauthorized.
 * @response 403: Forbidden if user lacks permissions.
 * @response 404: Booking or Zoom meeting not found.
 */
router.get(
  "/:bookingId/zoom-meeting",
  authenticateToken,
  validateBookingId,
  getZoomMeetingDetails,
);

export default router;

// Swagger Schemas (can be moved to a separate file if many schemas exist)
/**
 * @swagger
 * components:
 *   schemas:
 *     DemoBooking:
 *       type: object
 *       required:
 *         - email
 *         - fullName
 *         - timeSlot
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the booking
 *         userId:
 *           type: string
 *           description: The ID of the user who made the booking (if authenticated)
 *         email:
 *           type: string
 *           format: email
 *           description: The email of the person booking
 *         fullName:
 *           type: string
 *           description: The full name of the person booking
 *         phoneNumber:
 *           type: string
 *           description: The phone number of the person booking
 *         timeSlot:
 *           type: string
 *           format: date-time
 *           description: The scheduled time slot for the demo
 *         timezone:
 *           type: string
 *           description: The timezone of the booking
 *         demoType:
 *           type: string
 *           description: The type of demo (e.g., 'product_walkthrough', 'technical_discussion')
 *         courseInterest:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of courses the user is interested in
 *         experienceLevel:
 *           type: string
 *           description: User's experience level
 *         companyName:
 *           type: string
 *           description: User's company name
 *         jobTitle:
 *           type: string
 *           description: User's job title
 *         requirements:
 *           type: string
 *           description: Specific requirements for the demo
 *         notes:
 *           type: string
 *           description: Additional notes for the booking
 *         status:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, awaiting_schedule]
 *           default: pending
 *           description: Current status of the demo booking
 *         zoomMeetingId:
 *           type: string
 *           description: Zoom meeting ID if generated
 *         zoomMeetingLink:
 *           type: string
 *           description: Zoom meeting join link
 *         cancellationReason:
 *           type: string
 *           description: Reason for cancellation
 *         rescheduleHistory:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               oldTimeSlot:
 *                 type: string
 *                 format: date-time
 *               newTimeSlot:
 *                 type: string
 *                 format: date-time
 *               reason:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *           description: History of reschedules
 *         rating:
 *           type: number
 *           description: Rating given after demo completion
 *         feedback:
 *           type: string
 *           description: Feedback provided after demo completion
 *         completionNotes:
 *           type: string
 *           description: Internal notes on demo completion
 *         source:
 *           type: string
 *           description: Where the booking originated from (e.g., 'website', 'referral')
 *         utmParameters:
 *           type: object
 *           description: UTM parameters captured during booking
 *         ipAddress:
 *           type: string
 *           description: IP address from which the booking was made
 *         userAgent:
 *           type: string
 *           description: User agent string of the client
 *         autoGenerateZoomMeeting:
 *           type: boolean
 *           description: Whether a Zoom meeting should be automatically generated
 *         zoomMeetingSettings:
 *           type: object
 *           description: Custom settings for Zoom meeting creation
 *         age:
 *           type: integer
 *           description: User's age
 *         gender:
 *           type: string
 *           description: User's gender
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: User's date of birth
 *         educationLevel:
 *           type: string
 *           description: User's education level
 *         fieldOfStudy:
 *           type: string
 *           description: User's field of study
 *         currentOccupation:
 *           type: string
 *           description: User's current occupation
 *         studentStatus:
 *           type: string
 *           description: User's student status
 *         programmingExperience:
 *           type: string
 *           description: User's programming experience level
 *         preferredLearningStyle:
 *           type: string
 *           description: User's preferred learning style
 *         learningGoals:
 *           type: string
 *           description: User's learning goals
 *         careerObjectives:
 *           type: string
 *           description: User's career objectives
 *         currentSkills:
 *           type: array
 *           items:
 *             type: string
 *           description: User's current skills
 *         interestedTechnologies:
 *           type: array
 *           items:
 *             type: string
 *           description: Technologies user is interested in
 *         availableTimePerWeek:
 *           type: number
 *           description: Hours available for learning per week
 *         preferredContactMethod:
 *           type: string
 *           description: Preferred contact method
 *         socialMediaProfiles:
 *           type: object
 *           description: Social media profiles (e.g., LinkedIn, GitHub)
 *         howDidYouHearAboutUs:
 *           type: string
 *           description: How the user heard about the service
 *         referralCode:
 *           type: string
 *           description: Referral code used by the user
 *         emergencyContact:
 *           type: string
 *           description: Emergency contact information
 *         specialRequirements:
 *           type: string
 *           description: Special requirements or accessibility needs
 *         budgetRange:
 *           type: string
 *           description: User's budget range for courses
 *         timelineExpectations:
 *           type: string
 *           description: User's timeline expectations for learning
 *         hasLaptop:
 *           type: boolean
 *           description: Indicates if the user has a laptop
 *         internetSpeed:
 *           type: string
 *           description: User's internet speed
 *         previousOnlineLearningExperience:
 *           type: string
 *           description: Description of previous online learning experience
 *         grade:
 *           type: string
 *           description: User's academic grade (if applicable)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the booking was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the booking was last updated
 */
