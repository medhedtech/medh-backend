import mongoose from "mongoose";
const { Schema } = mongoose;

// Import course models for enrollment creation
import Course from "./course-model.js";
import Batch from "./course-model.js";

// Enhanced Payment schema with membership support
const paymentSchema = new Schema({
  amount: {
    type: Number,
    required: [true, "Payment amount is required"],
    min: [0, "Payment amount cannot be negative"]
  },
  currency: {
    type: String,
    required: [true, "Currency is required"],
    enum: ["USD", "EUR", "INR", "GBP", "AUD", "CAD"],
    default: "INR"
  },
  payment_date: {
    type: Date,
    default: Date.now
  },
  payment_method: {
    type: String,
    enum: ["credit_card", "debit_card", "upi", "net_banking", "wallet", "bank_transfer", "cash", "other"],
    required: [true, "Payment method is required"]
  },
  transaction_id: {
    type: String,
    trim: true
  },
  payment_status: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded", "partially_refunded"],
    default: "pending"
  },
  payment_type: {
    type: String,
    enum: ["course", "membership", "upgrade", "renewal", "addon"],
    default: "course"
  },
      membership_info: {
      membership_type: {
        type: String,
        enum: ["silver", "gold"]
      },
          billing_cycle: {
        type: String,
        enum: ["monthly", "quarterly", "half_yearly", "annual", "one_time"]
      },
    next_billing_date: Date,
    renewal_amount: Number
  },
  receipt_url: {
    type: String,
    trim: true
  },
  refund_info: {
    refund_amount: Number,
    refund_date: Date,
    refund_reason: String,
    refund_transaction_id: String
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  }
});

// Progress tracking schema
const progressSchema = new Schema({
  lesson_id: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed"],
    default: "not_started"
  },
  progress_percentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  last_accessed: {
    type: Date
  },
  time_spent_seconds: {
    type: Number,
    default: 0
  }
});

// Assessment score schema
const assessmentScoreSchema = new Schema({
  assessment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true
  },
  score: {
    type: Number,
    min: 0
  },
  max_possible_score: {
    type: Number,
    min: 0
  },
  passed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0
  },
  last_attempt_date: {
    type: Date
  }
});

const enrollmentSchema = new Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required"]
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"]
    },
    // Batch is optional - null for individual enrollments
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null
    },
    enrollment_date: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "on_hold", "expired"],
      default: "active"
    },
    access_expiry_date: {
      type: Date,
      required: [true, "Access expiry date is required"]
    },
    // Enhanced enrollment type to distinguish individual vs batch
    enrollment_type: {
      type: String,
      enum: ["individual", "batch", "corporate", "group", "scholarship", "trial", "membership"],
      default: "individual",
      required: [true, "Enrollment type is required"]
    },
    // Membership specific information
    membership_info: {
      membership_type: {
        type: String,
        enum: ["silver", "gold"],
        sparse: true // Only for membership enrollments
      },
      membership_duration_months: {
        type: Number,
        min: 1,
        sparse: true
      },
      membership_start_date: {
        type: Date,
        sparse: true
      },
      membership_end_date: {
        type: Date,
        sparse: true
      },
      auto_renewal: {
        type: Boolean,
        default: false
      },
      membership_benefits: [{
        benefit_type: {
          type: String,
          enum: ["course_access", "discount_percentage", "priority_support", "exclusive_content", "certification_priority"]
        },
        benefit_value: String,
        description: String
      }],
      previous_membership_type: String,
      upgrade_date: Date,
      downgrade_date: Date
    },
    enrollment_source: {
      type: String,
      enum: ["website", "referral", "direct", "sales_team", "partner"],
      default: "website"
    },
    // Pricing information at time of enrollment
    pricing_snapshot: {
      original_price: {
        type: Number,
        required: [true, "Original price is required"]
      },
      final_price: {
        type: Number,
        required: [true, "Final price is required"]
      },
      currency: {
        type: String,
        required: [true, "Currency is required"],
        enum: ["USD", "EUR", "INR", "GBP", "AUD", "CAD"]
      },
      pricing_type: {
        type: String,
        enum: ["individual", "batch", "early_bird", "group_discount"],
        required: [true, "Pricing type is required"]
      },
      discount_applied: {
        type: Number,
        default: 0,
        min: 0
      },
      discount_code: {
        type: String
      }
    },
    // Batch-specific information
    batch_info: {
      batch_size: {
        type: Number,
        default: 1,
        min: 1
      },
      is_batch_leader: {
        type: Boolean,
        default: false
      },
      batch_members: [{
        student_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        joined_date: {
          type: Date,
          default: Date.now
        }
      }]
    },
    progress: {
      overall_percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      lessons_completed: {
        type: Number,
        default: 0,
        min: 0
      },
      last_activity_date: {
        type: Date
      },
      detailed_progress: [progressSchema]
    },
    assessments: [assessmentScoreSchema],
    payments: [paymentSchema],
    total_amount_paid: {
      type: Number,
      default: 0,
      min: 0
    },
    payment_plan: {
      type: String,
      enum: ["full", "installment", "subscription", "free", "scholarship"],
      default: "full"
    },
    installments_count: {
      type: Number,
      default: 1,
      min: 1
    },
    next_payment_date: {
      type: Date
    },
    certificate_issued: {
      type: Boolean,
      default: false
    },
    certificate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Certificate"
    },
    feedback_submitted: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient querying
enrollmentSchema.index({ student: 1, course: 1, batch: 1 }, { unique: true });
enrollmentSchema.index({ student: 1, course: 1, enrollment_type: 1 });
enrollmentSchema.index({ status: 1 });
enrollmentSchema.index({ enrollment_date: 1 });
enrollmentSchema.index({ access_expiry_date: 1 });
enrollmentSchema.index({ "payments.payment_status": 1 });
enrollmentSchema.index({ "payments.payment_date": 1 });
enrollmentSchema.index({ "payments.payment_type": 1 });
enrollmentSchema.index({ enrollment_type: 1 });
enrollmentSchema.index({ batch: 1 });
// Membership-specific indexes
enrollmentSchema.index({ 
  student: 1, 
  enrollment_type: 1, 
  status: 1 
}, { 
  partialFilterExpression: { enrollment_type: 'membership' } 
});
// membership_info indexes are handled by sparse: true in field definitions
enrollmentSchema.index({ 
  "membership_info.membership_end_date": 1, 
  status: 1 
}, { 
  partialFilterExpression: { enrollment_type: 'membership' } 
});

// Virtual properties
enrollmentSchema.virtual('isActive').get(function() {
  return this.status === 'active' && new Date() < this.access_expiry_date;
});

enrollmentSchema.virtual('remainingDays').get(function() {
  if (new Date() > this.access_expiry_date) return 0;
  
  const diffTime = this.access_expiry_date - new Date();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

enrollmentSchema.virtual('isBatchEnrollment').get(function() {
  return this.enrollment_type === 'batch' && this.batch !== null;
});

enrollmentSchema.virtual('isIndividualEnrollment').get(function() {
  return this.enrollment_type === 'individual' && this.batch === null;
});

// Pre-save middleware for validation
enrollmentSchema.pre('save', async function(next) {
  // Validate batch enrollment requirements
  if (this.enrollment_type === 'batch') {
    if (!this.batch) {
      return next(new Error('Batch reference is required for batch enrollments'));
    }
    
    // Get batch details to check batch_type
    const Batch = mongoose.model('Batch');
    const batch = await Batch.findById(this.batch);
    
    if (!batch) {
      return next(new Error('Referenced batch not found'));
    }
    
    // For individual batches, allow batch_size = 1
    // For group batches, require batch_size >= 2
    if (batch.batch_type === 'individual') {
      if (this.batch_info.batch_size !== 1) {
        return next(new Error('Individual batch enrollments must have batch_size = 1'));
      }
    } else if (batch.batch_type === 'group') {
      if (this.batch_info.batch_size < 2) {
        return next(new Error('Group batch enrollments must have batch_size >= 2'));
      }
    }
  }
  
  // Validate individual enrollment requirements
  if (this.enrollment_type === 'individual') {
    // Allow batch reference for 1:1 sessions (individual sessions with batch)
    if (this.batch) {
      // Check if this is a 1:1 session batch
      const Batch = mongoose.model('Batch');
      Batch.findById(this.batch).then(batch => {
        if (batch && batch.is_individual_session) {
          // This is a 1:1 session, allow batch reference
          this.batch_info.batch_size = 1;
          this.batch_info.is_batch_leader = false;
          this.batch_info.batch_members = [];
          next();
        } else {
          // Regular individual enrollment without batch
          return next(new Error('Individual enrollments cannot have batch reference unless it\'s a 1:1 session'));
        }
      }).catch(err => {
        return next(new Error('Invalid batch reference for individual enrollment'));
      });
      return; // Don't call next() here, it will be called in the promise
    } else {
      // No batch reference, regular individual enrollment
      this.batch_info.batch_size = 1;
      this.batch_info.is_batch_leader = false;
      this.batch_info.batch_members = [];
      next();
    }
  } else {
    next();
  }
  
  next();
});

// Methods
enrollmentSchema.methods.updateProgress = async function(lessonId, progressData) {
  let lesson = this.progress.detailed_progress.find(item => item.lesson_id === lessonId);
  
  if (!lesson) {
    this.progress.detailed_progress.push({
      lesson_id: lessonId,
      ...progressData
    });
  } else {
    Object.assign(lesson, progressData);
  }
  
  // Recalculate overall progress
  const Course = mongoose.model('Course');
  const course = await Course.findById(this.course);
  const totalLessons = course?.curriculum?.length || 1;
  
  this.progress.lessons_completed = this.progress.detailed_progress.filter(
    lesson => lesson.status === 'completed'
  ).length;
  
  this.progress.overall_percentage = Math.round(
    (this.progress.lessons_completed / totalLessons) * 100
  );
  
  this.progress.last_activity_date = new Date();
  
  // Sync with enhanced progress tracking
  try {
    await this.syncToEnhancedProgress(lessonId, progressData);
  } catch (syncError) {
    console.warn('Failed to sync to enhanced progress:', syncError.message);
  }
  
  return this.save();
};

enrollmentSchema.methods.recordPayment = async function(paymentData) {
  this.payments.push(paymentData);
  
  // Update total amount paid
  this.total_amount_paid = this.payments
    .filter(payment => payment.payment_status === 'completed')
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  return this.save();
};

enrollmentSchema.methods.updateAssessmentScore = async function(assessmentId, scoreData) {
  let assessment = this.assessments.find(a => a.assessment_id.equals(assessmentId));
  
  if (!assessment) {
    this.assessments.push({
      assessment_id: assessmentId,
      ...scoreData
    });
  } else {
    Object.assign(assessment, scoreData);
  }
  
  // Sync with enhanced progress tracking
  try {
    await this.syncAssessmentToEnhancedProgress(assessmentId, scoreData);
  } catch (syncError) {
    console.warn('Failed to sync assessment to enhanced progress:', syncError.message);
  }
  
  return this.save();
};

// Method to add batch member (for batch enrollments)
enrollmentSchema.methods.addBatchMember = async function(studentId) {
  if (this.enrollment_type !== 'batch') {
    throw new Error('Can only add members to batch enrollments');
  }
  
  const existingMember = this.batch_info.batch_members.find(
    member => member.student_id.equals(studentId)
  );
  
  if (existingMember) {
    throw new Error('Student is already a batch member');
  }
  
  this.batch_info.batch_members.push({
    student_id: studentId,
    joined_date: new Date()
  });
  
  this.batch_info.batch_size = this.batch_info.batch_members.length + 1; // +1 for the main enrollee
  
  return this.save();
};

// Method to remove batch member
enrollmentSchema.methods.removeBatchMember = async function(studentId) {
  if (this.enrollment_type !== 'batch') {
    throw new Error('Can only remove members from batch enrollments');
  }
  
  this.batch_info.batch_members = this.batch_info.batch_members.filter(
    member => !member.student_id.equals(studentId)
  );
  
  this.batch_info.batch_size = this.batch_info.batch_members.length + 1;
  
  return this.save();
};

// Method to sync enrollment progress to enhanced progress tracking
enrollmentSchema.methods.syncToEnhancedProgress = async function(lessonId = null, progressData = null) {
  try {
    // Dynamic import to avoid circular dependency
    const { default: EnhancedProgress } = await import('./enhanced-progress.model.js');
    
    // Sync overall course progress
    const courseProgressEntry = {
      userId: this.student,
      courseId: this.course,
      contentType: 'course',
      contentId: this.course,
      progressPercentage: this.progress.overall_percentage || 0,
      status: this.status === 'completed' ? 'completed' : 
              this.progress.overall_percentage > 0 ? 'in_progress' : 'not_started',
      timeSpent: this.progress.detailed_progress.reduce((sum, lesson) => 
        sum + (lesson.time_spent_seconds || 0), 0),
      lastAccessed: this.progress.last_activity_date || new Date(),
      metadata: {
        enrollment_id: this._id,
        enrollment_type: this.enrollment_type,
        batch_id: this.batch,
        enrollment_date: this.enrollment_date,
        access_expiry_date: this.access_expiry_date,
        synced_from: 'enrollment_course'
      }
    };

    // Upsert course-level progress
    await EnhancedProgress.findOneAndUpdate(
      {
        userId: this.student,
        courseId: this.course,
        contentType: 'course',
        contentId: this.course
      },
      courseProgressEntry,
      { upsert: true, new: true }
    );

    // Sync individual lesson progress if lessonId is provided
    if (lessonId && progressData) {
      const lessonProgressEntry = {
        userId: this.student,
        courseId: this.course,
        contentType: 'lesson',
        contentId: lessonId,
        progressPercentage: progressData.progress_percentage || 0,
        status: progressData.status || 'not_started',
        timeSpent: progressData.time_spent_seconds || 0,
        lastAccessed: new Date(),
        metadata: {
          enrollment_id: this._id,
          lesson_id: lessonId,
          enrollment_type: this.enrollment_type,
          batch_id: this.batch,
          synced_from: 'enrollment_lesson'
        }
      };

      // Upsert lesson-level progress
      await EnhancedProgress.findOneAndUpdate(
        {
          userId: this.student,
          courseId: this.course,
          contentType: 'lesson',
          contentId: lessonId
        },
        lessonProgressEntry,
        { upsert: true, new: true }
      );
    }

    return true;
  } catch (error) {
    console.error('Error syncing to enhanced progress:', error);
    return false;
  }
};

// Method to sync assessment scores to enhanced progress
enrollmentSchema.methods.syncAssessmentToEnhancedProgress = async function(assessmentId, scoreData) {
  try {
    const { default: EnhancedProgress } = await import('./enhanced-progress.model.js');
    
    const assessmentProgressEntry = {
      userId: this.student,
      courseId: this.course,
      contentType: 'quiz',
      contentId: assessmentId,
      progressPercentage: scoreData.passed ? 100 : 0,
      status: scoreData.passed ? 'completed' : 'failed',
      score: scoreData.score || 0,
      attempts: scoreData.attempts || 1,
      lastAccessed: scoreData.last_attempt_date || new Date(),
      metadata: {
        enrollment_id: this._id,
        assessment_id: assessmentId,
        max_possible_score: scoreData.max_possible_score,
        passed: scoreData.passed,
        enrollment_type: this.enrollment_type,
        batch_id: this.batch,
        synced_from: 'enrollment_assessment'
      }
    };

    await EnhancedProgress.findOneAndUpdate(
      {
        userId: this.student,
        courseId: this.course,
        contentType: 'quiz',
        contentId: assessmentId
      },
      assessmentProgressEntry,
      { upsert: true, new: true }
    );

    return true;
  } catch (error) {
    console.error('Error syncing assessment to enhanced progress:', error);
    return false;
  }
};

// Membership-specific methods
enrollmentSchema.methods.createMembershipEnrollment = async function(membershipData) {
  if (this.enrollment_type !== 'membership') {
    throw new Error('This method is only for membership enrollments');
  }

  const { membership_type, duration_months, auto_renewal } = membershipData;
  
  // Set membership info
  this.membership_info = {
    membership_type,
    membership_duration_months: duration_months,
    membership_start_date: new Date(),
    membership_end_date: new Date(Date.now() + (duration_months * 30 * 24 * 60 * 60 * 1000)),
    auto_renewal: auto_renewal || false,
    membership_benefits: this.getMembershipBenefits(membership_type)
  };

  // Update user's membership type
  const User = mongoose.model('User');
  await User.findByIdAndUpdate(this.student, { 
    membership_type,
    updated_at: new Date()
  });

  return this.save();
};

enrollmentSchema.methods.upgradeMembership = async function(newMembershipType) {
  if (this.enrollment_type !== 'membership') {
    throw new Error('Can only upgrade membership enrollments');
  }

  const currentType = this.membership_info.membership_type;
  const membershipHierarchy = { 'general': 1, 'silver': 2, 'gold': 3 };
  
  if (membershipHierarchy[newMembershipType] <= membershipHierarchy[currentType]) {
    throw new Error('New membership type must be higher than current type');
  }

  // Store previous membership info
  this.membership_info.previous_membership_type = currentType;
  this.membership_info.upgrade_date = new Date();
  this.membership_info.membership_type = newMembershipType;
  this.membership_info.membership_benefits = this.getMembershipBenefits(newMembershipType);

  // Update user's membership type
  const User = mongoose.model('User');
  await User.findByIdAndUpdate(this.student, { 
    membership_type: newMembershipType,
    updated_at: new Date()
  });

  return this.save();
};

enrollmentSchema.methods.renewMembership = async function(renewalData) {
  if (this.enrollment_type !== 'membership') {
    throw new Error('Can only renew membership enrollments');
  }

  const { duration_months, payment_info } = renewalData;
  
  // Extend membership end date
  const currentEndDate = this.membership_info.membership_end_date;
  const newEndDate = new Date(currentEndDate.getTime() + (duration_months * 30 * 24 * 60 * 60 * 1000));
  
  this.membership_info.membership_end_date = newEndDate;
  this.membership_info.membership_duration_months += duration_months;

  // Record renewal payment
  if (payment_info) {
    await this.recordMembershipPayment({
      ...payment_info,
      payment_type: 'renewal'
    });
  }

  return this.save();
};

enrollmentSchema.methods.getMembershipBenefits = function(membershipType) {
  const benefits = {
    silver: [
      { benefit_type: 'course_access', benefit_value: 'single_category', description: 'Access to all self-paced blended courses within any Single-Category of your preference' },
      { benefit_type: 'live_qa_sessions', benefit_value: 'included', description: 'Access to LIVE Q&A Doubt Clearing Sessions' },
      { benefit_type: 'discount_percentage', benefit_value: 'special', description: 'Special discount on all live courses' },
      { benefit_type: 'community_access', benefit_value: 'included', description: 'Community access' },
      { benefit_type: 'free_courses', benefit_value: 'included', description: 'Access to free courses' },
      { benefit_type: 'placement_assistance', benefit_value: 'included', description: 'Placement Assistance' }
    ],
    gold: [
      { benefit_type: 'course_access', benefit_value: 'three_categories', description: 'Access to all self-paced blended courses within any 03-Categories of your preference' },
      { benefit_type: 'live_qa_sessions', benefit_value: 'included', description: 'Access to LIVE Q&A Doubt Clearing Sessions' },
      { benefit_type: 'discount_percentage', benefit_value: '15', description: 'Minimum 15% discount on all live courses' },
      { benefit_type: 'community_access', benefit_value: 'included', description: 'Community access' },
      { benefit_type: 'free_courses', benefit_value: 'included', description: 'Access to free courses' },
      { benefit_type: 'career_counselling', benefit_value: 'included', description: 'Career Counselling' },
      { benefit_type: 'placement_assistance', benefit_value: 'included', description: 'Placement Assistance' }
    ]
  };

  return benefits[membershipType] || benefits.silver;
};

enrollmentSchema.methods.recordMembershipPayment = async function(paymentData) {
  const membershipPayment = {
    ...paymentData,
    payment_type: paymentData.payment_type || 'membership',
    membership_info: {
      membership_type: this.membership_info.membership_type,
      billing_cycle: paymentData.billing_cycle || 'monthly',
      next_billing_date: paymentData.next_billing_date,
      renewal_amount: paymentData.renewal_amount
    }
  };

  this.payments.push(membershipPayment);
  
  // Update total amount paid
  this.total_amount_paid = this.payments
    .filter(payment => payment.payment_status === 'completed')
    .reduce((sum, payment) => sum + payment.amount, 0);

  return this.save();
};

enrollmentSchema.methods.isMembershipActive = function() {
  if (this.enrollment_type !== 'membership') return false;
  
  const now = new Date();
  return this.status === 'active' && 
         this.membership_info.membership_end_date > now;
};

enrollmentSchema.methods.getMembershipStatus = function() {
  if (this.enrollment_type !== 'membership') {
    return { status: 'not_membership', message: 'Not a membership enrollment' };
  }

  const now = new Date();
  const endDate = this.membership_info.membership_end_date;
  const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

  if (daysRemaining > 30) {
    return { status: 'active', daysRemaining, message: 'Membership is active' };
  } else if (daysRemaining > 0) {
    return { status: 'expiring_soon', daysRemaining, message: `Membership expires in ${daysRemaining} days` };
  } else {
    return { status: 'expired', daysRemaining: 0, message: 'Membership has expired' };
  }
};

// Static methods
enrollmentSchema.statics.findActiveEnrollments = function(studentId = null) {
  const query = { 
    status: 'active',
    access_expiry_date: { $gte: new Date() }
  };
  
  if (studentId) {
    query.student = studentId;
  }
  
  return this.find(query)
    .populate('course', 'course_title course_image slug')
    .populate('batch', 'batch_name start_date end_date schedule');
};

enrollmentSchema.statics.findStudentsInBatch = function(batchId) {
  return this.find({ batch: batchId, status: 'active' })
    .populate('student', 'full_name email user_image')
    .select('student enrollment_date progress.overall_percentage');
};

// Enhanced method to create enrollment with proper business logic
enrollmentSchema.statics.createEnrollment = async function(enrollmentData) {
  
  // Validate course exists
  const course = await Course.findById(enrollmentData.course);
  if (!course) {
    throw new Error('Course not found');
  }
  
  // Get course pricing
  const coursePricing = course.prices.find(p => p.currency === enrollmentData.currency) || course.prices[0];
  if (!coursePricing) {
    throw new Error('No pricing available for this course');
  }
  
  let finalPrice, pricingType;
  
  if (enrollmentData.enrollment_type === 'individual') {
    finalPrice = coursePricing.individual;
    pricingType = 'individual';
    
    // Apply early bird discount if applicable
    if (coursePricing.early_bird_discount > 0) {
      const discount = (coursePricing.individual * coursePricing.early_bird_discount) / 100;
      finalPrice = coursePricing.individual - discount;
      pricingType = 'early_bird';
    }
  } else if (enrollmentData.enrollment_type === 'batch') {
    // Validate batch exists and has capacity
    if (!enrollmentData.batch) {
      throw new Error('Batch reference is required for batch enrollments');
    }
    
    const batch = await Batch.findById(enrollmentData.batch);
    if (!batch) {
      throw new Error('Batch not found');
    }
    
    if (batch.enrolled_students >= batch.capacity) {
      throw new Error('Batch has reached maximum capacity');
    }
    
    finalPrice = coursePricing.batch;
    pricingType = 'batch';
    
    // Apply group discount if batch size meets minimum requirement
    if (enrollmentData.batch_size >= coursePricing.min_batch_size && coursePricing.group_discount > 0) {
      const discount = (coursePricing.batch * coursePricing.group_discount) / 100;
      finalPrice = coursePricing.batch - discount;
      pricingType = 'group_discount';
    }
  }
  
  // Apply additional discount if provided
  let discountApplied = 0;
  if (enrollmentData.discount_code && enrollmentData.discount_amount) {
    discountApplied = enrollmentData.discount_amount;
    finalPrice = Math.max(0, finalPrice - discountApplied);
  }
  
  // Create enrollment with pricing snapshot
  const enrollment = new this({
    ...enrollmentData,
    pricing_snapshot: {
      original_price: enrollmentData.enrollment_type === 'individual' ? coursePricing.individual : coursePricing.batch,
      final_price: finalPrice,
      currency: coursePricing.currency,
      pricing_type: pricingType,
      discount_applied: discountApplied,
      discount_code: enrollmentData.discount_code
    }
  });
  
  return enrollment;
};

enrollmentSchema.statics.getDashboardStats = async function() {
  return {
    totalActive: await this.countDocuments({ 
      status: 'active',
      access_expiry_date: { $gte: new Date() }
    }),
    totalCompleted: await this.countDocuments({ status: 'completed' }),
    individualEnrollments: await this.countDocuments({ enrollment_type: 'individual' }),
    batchEnrollments: await this.countDocuments({ enrollment_type: 'batch' }),
    membershipEnrollments: await this.countDocuments({ enrollment_type: 'membership' }),
    recentEnrollments: await this.find()
      .sort({ enrollment_date: -1 })
      .limit(10)
      .populate('student', 'first_name last_name email')
      .populate('course', 'course_title')
      .populate('batch', 'batch_name')
      .select('enrollment_date payment_plan total_amount_paid enrollment_type'),
    paymentStats: await this.aggregate([
      {
        $unwind: '$payments'
      },
      {
        $match: {
          'payments.payment_status': 'completed',
          'payments.payment_date': {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$payments.payment_date' }
          },
          totalAmount: { $sum: '$payments.amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])
  };
};

// Membership-specific static methods
enrollmentSchema.statics.findActiveMemberships = function(studentId = null) {
  const query = { 
    enrollment_type: 'membership',
    status: 'active',
    'membership_info.membership_end_date': { $gte: new Date() }
  };
  
  if (studentId) {
    query.student = studentId;
  }
  
  return this.find(query)
    .populate('student', 'full_name email membership_type')
    .select('membership_info payments enrollment_date total_amount_paid');
};

enrollmentSchema.statics.findExpiringMemberships = function(daysAhead = 30) {
  const futureDate = new Date(Date.now() + (daysAhead * 24 * 60 * 60 * 1000));
  
  return this.find({
    enrollment_type: 'membership',
    status: 'active',
    'membership_info.membership_end_date': { 
      $gte: new Date(),
      $lte: futureDate 
    }
  })
  .populate('student', 'full_name email')
  .select('membership_info enrollment_date');
};

enrollmentSchema.statics.getMembershipStats = async function() {
  const stats = await this.aggregate([
    {
      $match: { enrollment_type: 'membership' }
    },
    {
      $group: {
        _id: '$membership_info.membership_type',
        count: { $sum: 1 },
        total_revenue: { $sum: '$total_amount_paid' },
        active_count: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'active'] },
                  { $gte: ['$membership_info.membership_end_date', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  return {
    membershipBreakdown: stats,
    totalMemberships: stats.reduce((sum, stat) => sum + stat.count, 0),
    totalRevenue: stats.reduce((sum, stat) => sum + stat.total_revenue, 0),
    totalActive: stats.reduce((sum, stat) => sum + stat.active_count, 0)
  };
};

enrollmentSchema.statics.createMembershipEnrollment = async function(enrollmentData) {
  const { student_id, membership_type, duration_months, payment_info } = enrollmentData;
  
  // Validate membership type
  const validTypes = ['silver', 'gold'];
  if (!validTypes.includes(membership_type)) {
    throw new Error('Invalid membership type');
  }

  // Check if user already has an active membership
  const existingMembership = await this.findOne({
    student: student_id,
    enrollment_type: 'membership',
    status: 'active',
    'membership_info.membership_end_date': { $gte: new Date() }
  });

  if (existingMembership) {
    throw new Error('User already has an active membership');
  }

  // Define membership pricing (INR)
  const membershipPricing = {
    silver: { 
      monthly: 999, 
      quarterly: 2499, 
      half_yearly: 3999, 
      annual: 4999 
    },
    gold: { 
      monthly: 1999, 
      quarterly: 3999, 
      half_yearly: 5999, 
      annual: 6999 
    }
  };

  const billing_cycle = duration_months === 1 ? 'monthly' : 
                       duration_months === 3 ? 'quarterly' : 
                       duration_months === 6 ? 'half_yearly' :
                       duration_months === 12 ? 'annual' : 'one_time';
  
  const amount = membershipPricing[membership_type][billing_cycle] || 
                membershipPricing[membership_type].monthly * duration_months;

  // Create enrollment
  const enrollment = new this({
    student: student_id,
    course: null, // No specific course for membership
    enrollment_type: 'membership',
    enrollment_date: new Date(),
    access_expiry_date: new Date(Date.now() + (duration_months * 30 * 24 * 60 * 60 * 1000)),
    status: 'active',
    membership_info: {
      membership_type,
      membership_duration_months: duration_months,
      membership_start_date: new Date(),
      membership_end_date: new Date(Date.now() + (duration_months * 30 * 24 * 60 * 60 * 1000)),
      auto_renewal: enrollmentData.auto_renewal || false
    },
    pricing_snapshot: {
      original_price: amount,
      final_price: payment_info?.amount || amount,
      currency: payment_info?.currency || 'INR',
      pricing_type: 'membership'
    }
  });

  // Set membership benefits
  enrollment.membership_info.membership_benefits = enrollment.getMembershipBenefits(membership_type);

  // Record payment if provided
  if (payment_info) {
    await enrollment.recordMembershipPayment({
      ...payment_info,
      amount: payment_info.amount || amount,
      billing_cycle,
      next_billing_date: enrollmentData.auto_renewal ? 
        new Date(Date.now() + (duration_months * 30 * 24 * 60 * 60 * 1000)) : null
    });
  }

  return enrollment.save();
};

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

export default Enrollment;
