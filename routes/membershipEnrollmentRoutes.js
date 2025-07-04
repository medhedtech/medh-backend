import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken, authorize } from '../middleware/auth.js';
import {
  createMembershipEnrollment,
  upgradeMembership,
  renewMembership,
  getMembershipStatus,
  getMembershipPayments,
  cancelMembership,
  getMembershipBenefits,
  getMembershipPricing,
  getAllMemberships,
  getMembershipStats
} from '../controllers/membershipEnrollmentController.js';

const router = express.Router();

// Validation middleware for membership enrollment
const membershipEnrollmentValidation = [
  body('membership_type')
    .isIn(['silver', 'gold'])
    .withMessage('Invalid membership type. Must be silver or gold'),
  body('duration_months')
    .isIn([1, 3, 6, 12])
    .withMessage('Duration must be 1, 3, 6, or 12 months'),
  body('auto_renewal')
    .optional()
    .isBoolean()
    .withMessage('Auto renewal must be a boolean'),
  body('payment_info.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Payment amount must be a positive number'),
  body('payment_info.currency')
    .optional()
    .isIn(['USD', 'EUR', 'INR', 'GBP', 'AUD', 'CAD'])
    .withMessage('Invalid currency'),
  body('payment_info.payment_method')
    .optional()
    .isIn(['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'bank_transfer', 'cash', 'other'])
    .withMessage('Invalid payment method')
];

// Validation middleware for membership upgrade
const membershipUpgradeValidation = [
  param('enrollmentId')
    .isMongoId()
    .withMessage('Invalid enrollment ID'),
  body('new_membership_type')
    .isIn(['silver', 'gold'])
    .withMessage('Can only upgrade to silver or gold membership'),
  body('payment_info.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Payment amount must be a positive number')
];

// Validation middleware for membership renewal
const membershipRenewalValidation = [
  param('enrollmentId')
    .isMongoId()
    .withMessage('Invalid enrollment ID'),
  body('duration_months')
    .isIn([1, 3, 6, 12])
    .withMessage('Duration must be 1, 3, 6, or 12 months'),
  body('payment_info.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Payment amount must be a positive number')
];

// Public routes
router.get('/benefits/:membershipType', getMembershipBenefits);
router.get('/pricing', getMembershipPricing);

// Student routes (requires authentication)
router.use(authenticateToken);

// Create membership enrollment
router.post('/enroll', membershipEnrollmentValidation, createMembershipEnrollment);

// Get user's membership status
router.get('/status', getMembershipStatus);

// Upgrade membership
router.patch('/:enrollmentId/upgrade', membershipUpgradeValidation, upgradeMembership);

// Renew membership
router.patch('/:enrollmentId/renew', membershipRenewalValidation, renewMembership);

// Get membership payment history
router.get('/:enrollmentId/payments', [
  param('enrollmentId').isMongoId().withMessage('Invalid enrollment ID')
], getMembershipPayments);

// Cancel membership
router.delete('/:enrollmentId/cancel', [
  param('enrollmentId').isMongoId().withMessage('Invalid enrollment ID'),
  body('reason').optional().isString().trim().isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters')
], cancelMembership);

// Admin routes (requires admin role)
router.use(authorize(['admin', 'super-admin']));

// Get all memberships (Admin only)
router.get('/admin/all', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('membership_type').optional().isIn(['silver', 'gold']).withMessage('Invalid membership type'),
  query('status').optional().isIn(['active', 'completed', 'cancelled', 'on_hold', 'expired']).withMessage('Invalid status')
], getAllMemberships);

// Get membership statistics (Admin only)
router.get('/admin/stats', getMembershipStats);

export default router; 