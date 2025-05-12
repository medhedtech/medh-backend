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
      ref: "Student",
      required: [true, "Student reference is required"]
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"]
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: [true, "Batch reference is required"]
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
    enrollment_type: {
      type: String,
      enum: ["individual", "corporate", "group", "scholarship", "trial"],
      default: "individual"
    },
    enrollment_source: {
      type: String,
      enum: ["website", "referral", "direct", "sales_team", "partner"],
      default: "website"
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
    discount_applied: {
      type: Number,
      default: 0,
      min: 0
    },
    discount_code: {
      type: String
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
enrollmentSchema.index({ status: 1 });
enrollmentSchema.index({ enrollment_date: 1 });
enrollmentSchema.index({ access_expiry_date: 1 });
enrollmentSchema.index({ "payments.payment_status": 1 });
enrollmentSchema.index({ "payments.payment_date": 1 });
enrollmentSchema.index({ enrollment_type: 1 });

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
  const totalLessons = await mongoose.model('Course').countLessons(this.course);
  this.progress.lessons_completed = this.progress.detailed_progress.filter(
    lesson => lesson.status === 'completed'
  ).length;
  
  this.progress.overall_percentage = Math.round(
    (this.progress.lessons_completed / totalLessons) * 100
  );
  
  this.progress.last_activity_date = new Date();
  
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
  
  return this.save();
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
    .populate('student', 'first_name last_name email profile_picture')
    .select('student enrollment_date progress.overall_percentage');
};

enrollmentSchema.statics.getDashboardStats = async function() {
  return {
    totalActive: await this.countDocuments({ 
      status: 'active',
      access_expiry_date: { $gte: new Date() }
    }),
    totalCompleted: await this.countDocuments({ status: 'completed' }),
    recentEnrollments: await this.find()
      .sort({ enrollment_date: -1 })
      .limit(10)
      .populate('student', 'first_name last_name email')
      .populate('course', 'course_title')
      .populate('batch', 'batch_name')
      .select('enrollment_date payment_plan total_amount_paid'),
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
