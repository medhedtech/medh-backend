import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  validateCreateFeedback,
  validateUpdateFeedback,
  validateAdminResponse,
  validateGetFeedback,
  validateFeedbackId,
  checkDemoBookingEligibility,
  checkDuplicateFeedback,
  sanitizeFeedbackData,
  validateFeedbackOwnership
} from '../validations/demoFeedbackValidation.js';
import {
  createDemoFeedback,
  getUserFeedback,
  getFeedbackById,
  updateDemoFeedback,
  getAllFeedback,
  addAdminResponse,
  getFeedbackStats,
  getAvailableDemosForFeedback
} from '../controllers/demo-feedback.controller.js';

const router = express.Router();

/**
 * @route   POST /api/demo-feedback
 * @desc    Create new demo feedback
 * @access  Private
 * @body    { demoBookingId, overallRating, contentQuality, instructorPerformance, wouldRecommend, additionalComments?, specificFeedback?, likedMost?, improvementAreas?, followUpInterest? }
 */
router.post(
  '/',
  authenticateToken,
  sanitizeFeedbackData,
  validateCreateFeedback,
  checkDemoBookingEligibility,
  checkDuplicateFeedback,
  createDemoFeedback
);

/**
 * @route   GET /api/demo-feedback/my-feedback
 * @desc    Get current user's feedback
 * @access  Private
 * @query   { page?, limit?, sortBy?, sortOrder? }
 */
router.get(
  '/my-feedback',
  authenticateToken,
  getUserFeedback
);

/**
 * @route   GET /api/demo-feedback/available-demos
 * @desc    Get available demo sessions for feedback (completed demos without feedback)
 * @access  Private
 */
router.get(
  '/available-demos',
  authenticateToken,
  getAvailableDemosForFeedback
);

/**
 * @route   GET /api/demo-feedback/stats
 * @desc    Get feedback statistics and analytics
 * @access  Private (Admin/Instructor)
 * @query   { startDate?, endDate?, instructorId?, period? }
 */
router.get(
  '/stats',
  authenticateToken,
  getFeedbackStats
);

/**
 * @route   GET /api/demo-feedback
 * @desc    Get all feedback with filtering (Admin/Instructor)
 * @access  Private (Admin/Instructor)
 * @query   { demoBookingId?, userId?, overallRating?, contentQuality?, instructorPerformance?, wouldRecommend?, status?, priority?, startDate?, endDate?, page?, limit?, sortBy?, sortOrder? }
 */
router.get(
  '/',
  authenticateToken,
  validateGetFeedback,
  getAllFeedback
);

/**
 * @route   PUT /api/demo-feedback/:feedbackId
 * @desc    Update demo feedback (within 24 hours of submission)
 * @access  Private (Owner only)
 * @params  { feedbackId }
 * @body    { overallRating?, contentQuality?, instructorPerformance?, wouldRecommend?, additionalComments?, specificFeedback?, likedMost?, improvementAreas?, followUpInterest? }
 */
router.put(
  '/:feedbackId',
  authenticateToken,
  validateFeedbackId,
  validateFeedbackOwnership,
  validateUpdateFeedback,
  updateDemoFeedback
);

/**
 * @route   GET /api/demo-feedback/:feedbackId
 * @desc    Get specific feedback by ID
 * @access  Private (Owner, Instructor, Admin)
 * @params  { feedbackId }
 */
router.get(
  '/:feedbackId',
  authenticateToken,
  validateFeedbackId,
  getFeedbackById
);

/**
 * @route   POST /api/demo-feedback/:feedbackId/response
 * @desc    Add admin/instructor response to feedback
 * @access  Private (Admin/Instructor)
 * @params  { feedbackId }
 * @body    { responseText, isPublic?, internalNotes?, priority?, tags? }
 */
router.post(
  '/:feedbackId/response',
  authenticateToken,
  validateFeedbackId,
  validateAdminResponse,
  addAdminResponse
);

export default router; 