import Enrollment from '../models/enrollment-model.js';
import User from '../models/user-modal.js';
import catchAsync from '../utils/catchAsync.js';
import { AppError } from '../utils/errorHandler.js';
import { validationResult } from 'express-validator';

/**
 * Create a new membership enrollment
 * @route POST /api/v1/memberships/enroll
 * @access Private (Student)
 */
export const createMembershipEnrollment = catchAsync(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, errors.array()));
  }

  const { membership_type, duration_months, auto_renewal, payment_info } = req.body;
  const student_id = req.user._id;

  try {
    // Validate membership type
    const validTypes = ['silver', 'gold'];
    if (!validTypes.includes(membership_type)) {
      return next(new AppError('Invalid membership type. Must be silver or gold', 400));
    }

    // Validate duration
    const validDurations = [1, 3, 6, 12];
    if (!validDurations.includes(duration_months)) {
      return next(new AppError('Invalid duration. Must be 1, 3, 6, or 12 months', 400));
    }

    // Create membership enrollment
    const enrollment = await Enrollment.createMembershipEnrollment({
      student_id,
      membership_type,
      duration_months,
      auto_renewal: auto_renewal || false,
      payment_info
    });

    // Update user's membership type
    await User.findByIdAndUpdate(student_id, {
      membership_type,
      updated_at: new Date()
    });

    // Populate enrollment details
    await enrollment.populate('student', 'full_name email membership_type');

    res.status(201).json({
      success: true,
      message: 'Membership enrollment created successfully',
      data: {
        enrollment,
        membership_benefits: enrollment.getMembershipBenefits(membership_type),
        membership_status: enrollment.getMembershipStatus()
      }
    });

  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * Upgrade membership
 * @route PATCH /api/v1/memberships/:enrollmentId/upgrade
 * @access Private (Student)
 */
export const upgradeMembership = catchAsync(async (req, res, next) => {
  const { enrollmentId } = req.params;
  const { new_membership_type, payment_info } = req.body;
  const student_id = req.user._id;

  try {
    // Find enrollment
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      student: student_id,
      enrollment_type: 'membership'
    });

    if (!enrollment) {
      return next(new AppError('Membership enrollment not found', 404));
    }

    // Check if membership is active
    if (!enrollment.isMembershipActive()) {
      return next(new AppError('Membership is not active', 400));
    }

    // Perform upgrade
    await enrollment.upgradeMembership(new_membership_type);

    // Record upgrade payment
    if (payment_info) {
      await enrollment.recordMembershipPayment({
        ...payment_info,
        payment_type: 'upgrade'
      });
    }

    await enrollment.populate('student', 'full_name email membership_type');

    res.status(200).json({
      success: true,
      message: 'Membership upgraded successfully',
      data: {
        enrollment,
        membership_benefits: enrollment.getMembershipBenefits(new_membership_type),
        membership_status: enrollment.getMembershipStatus()
      }
    });

  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * Renew membership
 * @route PATCH /api/v1/memberships/:enrollmentId/renew
 * @access Private (Student)
 */
export const renewMembership = catchAsync(async (req, res, next) => {
  const { enrollmentId } = req.params;
  const { duration_months, payment_info } = req.body;
  const student_id = req.user._id;

  try {
    // Find enrollment
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      student: student_id,
      enrollment_type: 'membership'
    });

    if (!enrollment) {
      return next(new AppError('Membership enrollment not found', 404));
    }

    // Validate duration
    const validDurations = [1, 3, 6, 12];
    if (!validDurations.includes(duration_months)) {
      return next(new AppError('Invalid duration. Must be 1, 3, 6, or 12 months', 400));
    }

    // Perform renewal
    await enrollment.renewMembership({
      duration_months,
      payment_info
    });

    await enrollment.populate('student', 'full_name email membership_type');

    res.status(200).json({
      success: true,
      message: 'Membership renewed successfully',
      data: {
        enrollment,
        membership_status: enrollment.getMembershipStatus()
      }
    });

  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * Get user's membership status
 * @route GET /api/v1/memberships/status
 * @access Private (Student)
 */
export const getMembershipStatus = catchAsync(async (req, res, next) => {
  const student_id = req.user._id;

  try {
    // Find active membership
    const enrollment = await Enrollment.findOne({
      student: student_id,
      enrollment_type: 'membership',
      status: 'active'
    }).populate('student', 'full_name email membership_type');

    if (!enrollment) {
      return res.status(200).json({
        success: true,
        message: 'No active membership found',
        data: {
          has_membership: false,
          membership_type: null
        }
      });
    }

    const membershipStatus = enrollment.getMembershipStatus();
    const membershipBenefits = enrollment.getMembershipBenefits(enrollment.membership_info.membership_type);

    res.status(200).json({
      success: true,
      message: 'Membership status retrieved successfully',
      data: {
        has_membership: true,
        enrollment,
        membership_status: membershipStatus,
        membership_benefits: membershipBenefits,
        payment_history: enrollment.payments.filter(p => p.payment_type === 'membership' || p.payment_type === 'upgrade' || p.payment_type === 'renewal')
      }
    });

  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

/**
 * Get membership payment history
 * @route GET /api/v1/memberships/:enrollmentId/payments
 * @access Private (Student)
 */
export const getMembershipPayments = catchAsync(async (req, res, next) => {
  const { enrollmentId } = req.params;
  const student_id = req.user._id;

  try {
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      student: student_id,
      enrollment_type: 'membership'
    }).select('payments membership_info enrollment_date');

    if (!enrollment) {
      return next(new AppError('Membership enrollment not found', 404));
    }

    // Filter membership-related payments
    const membershipPayments = enrollment.payments.filter(payment => 
      ['membership', 'upgrade', 'renewal'].includes(payment.payment_type)
    );

    res.status(200).json({
      success: true,
      message: 'Membership payments retrieved successfully',
      data: {
        membership_type: enrollment.membership_info.membership_type,
        total_payments: membershipPayments.length,
        total_amount_paid: membershipPayments.reduce((sum, payment) => 
          payment.payment_status === 'completed' ? sum + payment.amount : sum, 0
        ),
        payments: membershipPayments
      }
    });

  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

/**
 * Cancel membership
 * @route DELETE /api/v1/memberships/:enrollmentId/cancel
 * @access Private (Student)
 */
export const cancelMembership = catchAsync(async (req, res, next) => {
  const { enrollmentId } = req.params;
  const { reason } = req.body;
  const student_id = req.user._id;

  try {
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      student: student_id,
      enrollment_type: 'membership'
    });

    if (!enrollment) {
      return next(new AppError('Membership enrollment not found', 404));
    }

    // Update enrollment status
    enrollment.status = 'cancelled';
    enrollment.membership_info.auto_renewal = false;
    
    // Add cancellation note
    enrollment.notes = `Membership cancelled by user. Reason: ${reason || 'Not specified'}`;
    
    await enrollment.save();

    // Revert user's membership type to null (no membership)
    await User.findByIdAndUpdate(student_id, {
      membership_type: 'general',
      updated_at: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Membership cancelled successfully',
      data: {
        enrollment,
        cancelled_at: new Date()
      }
    });

  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

/**
 * Get membership benefits
 * @route GET /api/v1/memberships/benefits/:membershipType
 * @access Public
 */
export const getMembershipBenefits = catchAsync(async (req, res, next) => {
  const { membershipType } = req.params;

  try {
    const validTypes = ['silver', 'gold'];
    if (!validTypes.includes(membershipType)) {
      return next(new AppError('Invalid membership type. Must be silver or gold', 400));
    }

    // Create a temporary enrollment to get benefits
    const tempEnrollment = new Enrollment();
    const benefits = tempEnrollment.getMembershipBenefits(membershipType);

    res.status(200).json({
      success: true,
      message: 'Membership benefits retrieved successfully',
      data: {
        membership_type: membershipType,
        benefits
      }
    });

  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

/**
 * Get membership pricing
 * @route GET /api/v1/memberships/pricing
 * @access Public
 */
export const getMembershipPricing = catchAsync(async (req, res, next) => {
  try {
    const pricing = {
      silver: {
        monthly: { 
          amount: 999, 
          currency: 'INR',
          duration: '1 month',
          features: [
            'Access to all self-paced blended courses within any Single-Category',
            'Access to LIVE Q&A Doubt Clearing Sessions',
            'Special discount on all live courses',
            'Community access',
            'Access to free courses',
            'Placement Assistance'
          ]
        },
        quarterly: { 
          amount: 2499, 
          currency: 'INR',
          duration: '3 months',
          features: [
            'Access to all self-paced blended courses within any Single-Category',
            'Access to LIVE Q&A Doubt Clearing Sessions',
            'Special discount on all live courses',
            'Community access',
            'Access to free courses',
            'Placement Assistance'
          ]
        },
        half_yearly: { 
          amount: 3999, 
          currency: 'INR',
          duration: '6 months',
          features: [
            'Access to all self-paced blended courses within any Single-Category',
            'Access to LIVE Q&A Doubt Clearing Sessions',
            'Special discount on all live courses',
            'Community access',
            'Access to free courses',
            'Placement Assistance'
          ]
        },
        annual: { 
          amount: 4999, 
          currency: 'INR',
          duration: '12 months',
          features: [
            'Access to all self-paced blended courses within any Single-Category',
            'Access to LIVE Q&A Doubt Clearing Sessions',
            'Special discount on all live courses',
            'Community access',
            'Access to free courses',
            'Placement Assistance'
          ]
        }
      },
      gold: {
        monthly: { 
          amount: 1999, 
          currency: 'INR',
          duration: '1 month',
          features: [
            'Access to all self-paced blended courses within any 03-Categories',
            'Access to LIVE Q&A Doubt Clearing Sessions',
            'Minimum 15% discount on all live courses',
            'Community access',
            'Access to free courses',
            'Career Counselling',
            'Placement Assistance'
          ]
        },
        quarterly: { 
          amount: 3999, 
          currency: 'INR',
          duration: '3 months',
          features: [
            'Access to all self-paced blended courses within any 03-Categories',
            'Access to LIVE Q&A Doubt Clearing Sessions',
            'Minimum 15% discount on all live courses',
            'Community access',
            'Access to free courses',
            'Career Counselling',
            'Placement Assistance'
          ]
        },
        half_yearly: { 
          amount: 5999, 
          currency: 'INR',
          duration: '6 months',
          features: [
            'Access to all self-paced blended courses within any 03-Categories',
            'Access to LIVE Q&A Doubt Clearing Sessions',
            'Minimum 15% discount on all live courses',
            'Community access',
            'Access to free courses',
            'Career Counselling',
            'Placement Assistance'
          ]
        },
        annual: { 
          amount: 6999, 
          currency: 'INR',
          duration: '12 months',
          features: [
            'Access to all self-paced blended courses within any 03-Categories',
            'Access to LIVE Q&A Doubt Clearing Sessions',
            'Minimum 15% discount on all live courses',
            'Community access',
            'Access to free courses',
            'Career Counselling',
            'Placement Assistance'
          ]
        }
      }
    };

    res.status(200).json({
      success: true,
      message: 'Membership pricing retrieved successfully',
      data: { pricing }
    });

  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

// Admin Controllers

/**
 * Get all memberships (Admin)
 * @route GET /api/v1/admin/memberships
 * @access Private (Admin)
 */
export const getAllMemberships = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, membership_type, status } = req.query;
  
  try {
    const query = { enrollment_type: 'membership' };
    
    if (membership_type) {
      query['membership_info.membership_type'] = membership_type;
    }
    
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const memberships = await Enrollment.find(query)
      .populate('student', 'full_name email membership_type')
      .sort({ enrollment_date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Enrollment.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Memberships retrieved successfully',
      data: {
        memberships,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total,
          has_next: page * limit < total,
          has_prev: page > 1
        }
      }
    });

  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

/**
 * Get membership statistics (Admin)
 * @route GET /api/v1/admin/memberships/stats
 * @access Private (Admin)
 */
export const getMembershipStats = catchAsync(async (req, res, next) => {
  try {
    const stats = await Enrollment.getMembershipStats();
    const expiringMemberships = await Enrollment.findExpiringMemberships(30);

    res.status(200).json({
      success: true,
      message: 'Membership statistics retrieved successfully',
      data: {
        ...stats,
        expiring_soon: {
          count: expiringMemberships.length,
          memberships: expiringMemberships
        }
      }
    });

  } catch (error) {
    return next(new AppError(error.message, 500));
  }
}); 