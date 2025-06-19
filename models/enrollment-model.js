import mongoose from "mongoose";
const { Schema } = mongoose;

// Payment schema embedded in enrollment
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
  receipt_url: {
    type: String,
    trim: true
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
      enum: ["individual", "batch", "corporate", "group", "scholarship", "trial"],
      default: "individual",
      required: [true, "Enrollment type is required"]
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
enrollmentSchema.index({ enrollment_type: 1 });
enrollmentSchema.index({ batch: 1 });

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
    if (this.batch) {
      return next(new Error('Individual enrollments cannot have batch reference'));
    }
    this.batch_info.batch_size = 1;
    this.batch_info.is_batch_leader = false;
    this.batch_info.batch_members = [];
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
  const { Course, Batch } = require('./course-model.js');
  
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

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

export default Enrollment;
