import mongoose from "mongoose";
import Enrollment from "../models/enrollment-model.js";
import { Course, Batch } from "../models/course-model.js";
import User from "../models/user-modal.js";
import logger from "../utils/logger.js";

/**
 * Enrollment Service
 * Handles business logic for individual vs batch course enrollments
 */
class EnrollmentService {
  
  /**
   * Calculate pricing for enrollment based on type and course pricing
   * @param {Object} course - Course object with pricing information
   * @param {String} enrollmentType - 'individual' or 'batch'
   * @param {Object} options - Additional options like batch size, discount codes
   * @returns {Object} Pricing calculation result
   */
  static calculatePricing(course, enrollmentType, options = {}) {
    const {
      currency = 'INR',
      batchSize = 1,
      discountCode = null,
      customDiscount = 0
    } = options;

    // Find course pricing for the specified currency
    const coursePricing = course.prices.find(p => p.currency === currency) || course.prices[0];
    if (!coursePricing) {
      throw new Error(`No pricing available for currency: ${currency}`);
    }

    let basePrice, pricingType, discountApplied = 0;

    if (enrollmentType === 'individual') {
      basePrice = coursePricing.individual;
      pricingType = 'individual';

      // Apply early bird discount if available
      if (coursePricing.early_bird_discount > 0) {
        discountApplied = (basePrice * coursePricing.early_bird_discount) / 100;
        pricingType = 'early_bird';
      }
    } else if (enrollmentType === 'batch') {
      basePrice = coursePricing.batch;
      pricingType = 'batch';

      // Apply group discount if batch size meets minimum requirement
      if (batchSize >= coursePricing.min_batch_size && coursePricing.group_discount > 0) {
        discountApplied = (basePrice * coursePricing.group_discount) / 100;
        pricingType = 'group_discount';
      }
    } else {
      throw new Error(`Invalid enrollment type: ${enrollmentType}`);
    }

    // Apply custom discount if provided
    if (customDiscount > 0) {
      discountApplied += customDiscount;
    }

    const finalPrice = Math.max(0, basePrice - discountApplied);

    return {
      originalPrice: basePrice,
      finalPrice,
      discountApplied,
      currency: coursePricing.currency,
      pricingType,
      discountCode,
      coursePricing
    };
  }

  /**
   * Validate enrollment prerequisites
   * @param {String} studentId - Student ID
   * @param {String} courseId - Course ID
   * @param {String} enrollmentType - 'individual' or 'batch'
   * @param {String} batchId - Batch ID (required for batch enrollments)
   * @returns {Object} Validation result with student, course, and batch data
   */
  static async validateEnrollmentPrerequisites(studentId, courseId, enrollmentType, batchId = null) {
    // Validate student exists
    const student = await User.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    // Check if student is already enrolled in this course
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (existingEnrollment) {
      throw new Error('Student is already enrolled in this course');
    }

    let batch = null;
    if (enrollmentType === 'batch') {
      if (!batchId) {
        throw new Error('Batch ID is required for batch enrollments');
      }

      batch = await Batch.findById(batchId);
      if (!batch) {
        throw new Error('Batch not found');
      }

      // Validate batch belongs to the course
      if (!batch.course.equals(courseId)) {
        throw new Error('Batch does not belong to the specified course');
      }

      // Check batch capacity
      if (batch.enrolled_students >= batch.capacity) {
        throw new Error('Batch has reached maximum capacity');
      }

      // Check if batch is active or upcoming
      if (!['Active', 'Upcoming'].includes(batch.status)) {
        throw new Error('Batch is not available for enrollment');
      }
    }

    return { student, course, batch };
  }

  /**
   * Create individual enrollment
   * @param {Object} enrollmentData - Enrollment data
   * @returns {Object} Created enrollment
   */
  static async createIndividualEnrollment(enrollmentData) {
    const {
      studentId,
      courseId,
      currency = 'INR',
      discountCode = null,
      customDiscount = 0,
      paymentPlan = 'full',
      accessDuration = null // in days, null for course default
    } = enrollmentData;

    // Validate prerequisites
    const { student, course } = await this.validateEnrollmentPrerequisites(
      studentId, 
      courseId, 
      'individual'
    );

    // Calculate pricing
    const pricing = this.calculatePricing(course, 'individual', {
      currency,
      discountCode,
      customDiscount
    });

    // Calculate access expiry date
    let accessExpiryDate;
    if (accessDuration) {
      accessExpiryDate = new Date();
      accessExpiryDate.setDate(accessExpiryDate.getDate() + accessDuration);
    } else {
      // Default: 1 year access for individual enrollments
      accessExpiryDate = new Date();
      accessExpiryDate.setFullYear(accessExpiryDate.getFullYear() + 1);
    }

    // Create enrollment
    const enrollment = new Enrollment({
      student: studentId,
      course: courseId,
      batch: null, // No batch for individual enrollments
      enrollment_type: 'individual',
      enrollment_source: enrollmentData.source || 'website',
      access_expiry_date: accessExpiryDate,
      payment_plan: paymentPlan,
      pricing_snapshot: {
        original_price: pricing.originalPrice,
        final_price: pricing.finalPrice,
        currency: pricing.currency,
        pricing_type: pricing.pricingType,
        discount_applied: pricing.discountApplied,
        discount_code: pricing.discountCode
      },
      batch_info: {
        batch_size: 1,
        is_batch_leader: false,
        batch_members: []
      },
      created_by: enrollmentData.createdBy || studentId
    });

    await enrollment.save();

    logger.info('Individual enrollment created', {
      enrollmentId: enrollment._id,
      studentId,
      courseId,
      finalPrice: pricing.finalPrice
    });

    return enrollment;
  }

  /**
   * Create batch enrollment
   * @param {Object} enrollmentData - Enrollment data
   * @returns {Object} Created enrollment
   */
  static async createBatchEnrollment(enrollmentData) {
    const {
      studentId,
      courseId,
      batchId,
      batchSize = 2,
      currency = 'INR',
      discountCode = null,
      customDiscount = 0,
      paymentPlan = 'full',
      batchMembers = [] // Array of student IDs for batch members
    } = enrollmentData;

    // Validate prerequisites
    const { student, course, batch } = await this.validateEnrollmentPrerequisites(
      studentId, 
      courseId, 
      'batch', 
      batchId
    );

    // Validate batch size
    if (batchSize < 2) {
      throw new Error('Batch size must be at least 2');
    }

    const coursePricing = course.prices.find(p => p.currency === currency) || course.prices[0];
    if (batchSize > coursePricing.max_batch_size) {
      throw new Error(`Batch size cannot exceed ${coursePricing.max_batch_size}`);
    }

    // Calculate pricing
    const pricing = this.calculatePricing(course, 'batch', {
      currency,
      batchSize,
      discountCode,
      customDiscount
    });

    // Calculate access expiry date based on batch end date
    const accessExpiryDate = new Date(batch.end_date);
    accessExpiryDate.setDate(accessExpiryDate.getDate() + 30); // 30 days grace period after batch ends

    // Prepare batch members data
    const batchMembersData = batchMembers.map(memberId => ({
      student_id: memberId,
      joined_date: new Date()
    }));

    // Create enrollment
    const enrollment = new Enrollment({
      student: studentId,
      course: courseId,
      batch: batchId,
      enrollment_type: 'batch',
      enrollment_source: enrollmentData.source || 'website',
      access_expiry_date: accessExpiryDate,
      payment_plan: paymentPlan,
      pricing_snapshot: {
        original_price: pricing.originalPrice,
        final_price: pricing.finalPrice,
        currency: pricing.currency,
        pricing_type: pricing.pricingType,
        discount_applied: pricing.discountApplied,
        discount_code: pricing.discountCode
      },
      batch_info: {
        batch_size: batchSize,
        is_batch_leader: true, // The person creating the enrollment is the batch leader
        batch_members: batchMembersData
      },
      created_by: enrollmentData.createdBy || studentId
    });

    await enrollment.save();

    // Update batch enrolled students count
    batch.enrolled_students += batchSize;
    await batch.save();

    logger.info('Batch enrollment created', {
      enrollmentId: enrollment._id,
      studentId,
      courseId,
      batchId,
      batchSize,
      finalPrice: pricing.finalPrice
    });

    return enrollment;
  }

  /**
   * Process enrollment payment
   * @param {String} enrollmentId - Enrollment ID
   * @param {Object} paymentData - Payment information
   * @returns {Object} Updated enrollment with payment
   */
  static async processEnrollmentPayment(enrollmentId, paymentData) {
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const {
      amount,
      currency,
      paymentMethod,
      transactionId,
      paymentStatus = 'completed',
      receiptUrl = null,
      metadata = {}
    } = paymentData;

    // Validate payment amount matches enrollment price
    if (amount !== enrollment.pricing_snapshot.final_price) {
      throw new Error('Payment amount does not match enrollment price');
    }

    // Record payment
    await enrollment.recordPayment({
      amount,
      currency: currency || enrollment.pricing_snapshot.currency,
      payment_method: paymentMethod,
      transaction_id: transactionId,
      payment_status: paymentStatus,
      receipt_url: receiptUrl,
      metadata
    });

    // Update enrollment status if payment is completed
    if (paymentStatus === 'completed') {
      enrollment.status = 'active';
      await enrollment.save();
    }

    logger.info('Enrollment payment processed', {
      enrollmentId,
      amount,
      paymentStatus,
      transactionId
    });

    return enrollment;
  }

  /**
   * Get enrollment pricing for frontend
   * @param {String} courseId - Course ID
   * @param {String} enrollmentType - 'individual' or 'batch'
   * @param {Object} options - Pricing options
   * @returns {Object} Pricing information
   */
  static async getEnrollmentPricing(courseId, enrollmentType, options = {}) {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const pricing = this.calculatePricing(course, enrollmentType, options);
    
    return {
      courseId,
      enrollmentType,
      pricing: {
        originalPrice: pricing.originalPrice,
        finalPrice: pricing.finalPrice,
        discountApplied: pricing.discountApplied,
        currency: pricing.currency,
        pricingType: pricing.pricingType,
        savings: pricing.originalPrice - pricing.finalPrice
      },
      coursePricing: {
        minBatchSize: pricing.coursePricing.min_batch_size,
        maxBatchSize: pricing.coursePricing.max_batch_size,
        earlyBirdDiscount: pricing.coursePricing.early_bird_discount,
        groupDiscount: pricing.coursePricing.group_discount
      }
    };
  }

  /**
   * Get available batches for a course
   * @param {String} courseId - Course ID
   * @returns {Array} Available batches
   */
  static async getAvailableBatches(courseId) {
    const batches = await Batch.find({
      course: courseId,
      status: { $in: ['Active', 'Upcoming'] },
      $expr: { $lt: ['$enrolled_students', '$capacity'] } // Has available capacity
    })
    .populate('assigned_instructor', 'full_name email')
    .sort({ start_date: 1 });

    return batches.map(batch => ({
      _id: batch._id,
      batch_name: batch.batch_name,
      batch_code: batch.batch_code,
      start_date: batch.start_date,
      end_date: batch.end_date,
      capacity: batch.capacity,
      enrolled_students: batch.enrolled_students,
      available_spots: batch.capacity - batch.enrolled_students,
      schedule: batch.schedule,
      instructor: batch.assigned_instructor,
      status: batch.status
    }));
  }

  /**
   * Transfer student from individual to batch enrollment
   * @param {String} enrollmentId - Current individual enrollment ID
   * @param {String} batchId - Target batch ID
   * @returns {Object} New batch enrollment
   */
  static async transferToBatchEnrollment(enrollmentId, batchId) {
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.enrollment_type !== 'individual') {
      throw new Error('Can only transfer individual enrollments to batch');
    }

    // Validate batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    if (!batch.course.equals(enrollment.course)) {
      throw new Error('Batch does not belong to the same course');
    }

    if (batch.enrolled_students >= batch.capacity) {
      throw new Error('Batch has reached maximum capacity');
    }

    // Create new batch enrollment
    const batchEnrollmentData = {
      studentId: enrollment.student,
      courseId: enrollment.course,
      batchId: batchId,
      batchSize: 1,
      currency: enrollment.pricing_snapshot.currency,
      paymentPlan: enrollment.payment_plan,
      source: 'transfer'
    };

    const newEnrollment = await this.createBatchEnrollment(batchEnrollmentData);

    // Transfer payments from old enrollment
    for (const payment of enrollment.payments) {
      await newEnrollment.recordPayment(payment.toObject());
    }

    // Transfer progress
    newEnrollment.progress = enrollment.progress;
    await newEnrollment.save();

    // Cancel old enrollment
    enrollment.status = 'cancelled';
    enrollment.notes = `Transferred to batch enrollment: ${newEnrollment._id}`;
    await enrollment.save();

    logger.info('Enrollment transferred to batch', {
      oldEnrollmentId: enrollmentId,
      newEnrollmentId: newEnrollment._id,
      batchId
    });

    return newEnrollment;
  }
}

export default EnrollmentService; 