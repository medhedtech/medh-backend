import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  validateCreateBooking,
  validateGetUserBookings,
  validateUpdateBooking,
  validateBookingId,
  checkDuplicateBooking,
  checkTimeSlotAvailability,
  sanitizeBookingData,
  validateZoomMeetingSettings
} from '../validations/demoBookingValidation.js';
import {
  createDemoBooking,
  getUserBookings,
  updateDemoBooking,
  getDemoBookingById,
  getAvailableTimeSlots,
  getBookingStats,
  createZoomMeetingForDemo,
  getZoomMeetingDetails,
  getSupportedTimezones
} from '../controllers/demo-booking.controller.js';

const router = express.Router();

/**
 * @route   POST /api/demo-booking
 * @desc    Create a new demo booking
 * @access  Public/Private (flexible - works with or without auth)
 * @body    { userId?, email, fullName, phoneNumber?, timeSlot, timezone?, demoType?, courseInterest?, experienceLevel?, companyName?, jobTitle?, requirements?, notes?, source?, utmParameters? }
 */
router.post(
  '/',
  authenticateToken, // Optional auth - will work without token
  sanitizeBookingData,
  validateCreateBooking,
  checkDuplicateBooking,
  checkTimeSlotAvailability,
  createDemoBooking
);

/**
 * @route   GET /api/demo-booking
 * @desc    Get user bookings with optional filtering and pagination
 * @access  Private
 * @query   { userId?, status?, page?, limit?, startDate?, endDate? }
 */
router.get(
  '/',
  authenticateToken,
  validateGetUserBookings,
  getUserBookings
);

/**
 * @route   PUT /api/demo-booking
 * @desc    Update a demo booking (cancel, reschedule, confirm, complete)
 * @access  Private
 * @body    { bookingId, action, newTimeSlot?, reason?, rating?, feedback?, completionNotes? }
 */
router.put(
  '/',
  authenticateToken,
  validateUpdateBooking,
  updateDemoBooking
);

/**
 * @route   GET /api/demo-booking/timezones
 * @desc    Get supported timezones for demo booking
 * @access  Public
 */
router.get(
  '/timezones',
  getSupportedTimezones
);

/**
 * @route   GET /api/demo-booking/available-slots
 * @desc    Get available time slots for multiple days (7+ days)
 * @access  Public
 * @query   { startDate?, timezone?, days?, singleDay? }
 */
router.get(
  '/available-slots',
  getAvailableTimeSlots
);

/**
 * @route   GET /api/demo-booking/stats
 * @desc    Get booking statistics for admin dashboard
 * @access  Private (Admin/Instructor only)
 * @query   { startDate?, endDate?, period? }
 */
router.get(
  '/stats',
  authenticateToken,
  getBookingStats
);

/**
 * @route   GET /api/demo-booking/:bookingId
 * @desc    Get a specific demo booking by ID
 * @access  Private
 * @params  { bookingId }
 */
router.get(
  '/:bookingId',
  authenticateToken,
  validateBookingId,
  getDemoBookingById
);

/**
 * @route   POST /api/demo-booking/:bookingId/zoom-meeting
 * @desc    Create or regenerate Zoom meeting for existing demo booking
 * @access  Private (Admin/Instructor/Owner only)
 * @params  { bookingId }
 * @body    { zoomMeetingSettings? }
 */
router.post(
  '/:bookingId/zoom-meeting',
  authenticateToken,
  validateBookingId,
  validateZoomMeetingSettings,
  createZoomMeetingForDemo
);

/**
 * @route   GET /api/demo-booking/:bookingId/zoom-meeting
 * @desc    Get Zoom meeting details for a demo booking
 * @access  Private (Admin/Instructor/Owner only)
 * @params  { bookingId }
 */
router.get(
  '/:bookingId/zoom-meeting',
  authenticateToken,
  validateBookingId,
  getZoomMeetingDetails
);

export default router; 