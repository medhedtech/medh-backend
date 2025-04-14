import mongoose from "mongoose";
const { Schema } = mongoose;

// Sub-schemas for better organization
const paymentDetailsSchema = new Schema({
  amount: {
    type: Number,
    required: [true, "Payment amount is required"],
    min: [0, "Amount cannot be negative"],
  },
  currency: {
    type: String,
    default: "USD",
    uppercase: true,
  },
  transactionId: {
    type: String,
    sparse: true,
  },
  paymentMethod: {
    type: String,
    required: [true, "Payment method is required"],
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  refundDetails: {
    refundId: String,
    refundAmount: Number,
    refundDate: Date,
    refundReason: String,
  },
});

const progressSchema = new Schema({
  overall: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  lessons: {
    completed: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },
    ],
    lastAccessed: Date,
  },
  assignments: {
    completed: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Assignment",
      },
    ],
    lastAccessed: Date,
  },
  quizzes: {
    completed: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quiz",
      },
    ],
    lastAccessed: Date,
  },
});

const certificateSchema = new Schema({
  issued: {
    type: Boolean,
    default: false,
  },
  issuedAt: Date,
  certificateUrl: String,
  certificateId: {
    type: String,
    unique: true,
    sparse: true,
  },
  grade: {
    type: String,
    enum: ["A", "B", "C", "D", "F"],
    default: null,
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
});

const enrollmentSchema = new Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course ID is required"],
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student ID is required"],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "completed", "dropped", "suspended", "expired"],
        message: "{VALUE} is not a valid enrollment status",
      },
      default: "active",
      required: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    lastAccessed: {
      type: Date,
      default: Date.now,
      required: true,
    },
    progress: progressSchema,
    certificate: certificateSchema,
    paymentStatus: {
      type: String,
      enum: {
        values: ["pending", "completed", "failed", "refunded", "partial"],
        message: "{VALUE} is not a valid payment status",
      },
      default: "pending",
      required: true,
    },
    paymentDetails: paymentDetailsSchema,
    accessExpiresAt: {
      type: Date,
      required: function () {
        return this.course && this.course.duration && this.enrollmentType !== 'saved'; // Not required for saved courses
      },
    },
    enrollmentType: {
      type: String,
      enum: ["individual", "batch", "corporate", "saved"],
      default: "individual",
      required: true,
    },
    savedDetails: {
      savedAt: {
        type: Date,
        default: Date.now,
      },
      notes: String,
      reminder: {
        enabled: {
          type: Boolean,
          default: false,
        },
        date: Date,
      }
    },
    batchDetails: {
      batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
        sparse: true,
      },
      batchName: String,
      startDate: Date,
      endDate: Date,
    },
    corporateDetails: {
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        sparse: true,
      },
      department: String,
      employeeId: String,
    },
    notes: [
      {
        content: String,
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    metadata: {
      deviceInfo: String,
      browserInfo: String,
      ipAddress: String,
      enrollmentSource: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for better query performance
enrollmentSchema.index({ course: 1, student: 1, enrollmentType: 1 }, { unique: true });
enrollmentSchema.index({ status: 1 });
enrollmentSchema.index({ paymentStatus: 1 });
enrollmentSchema.index({ lastAccessed: 1 });
enrollmentSchema.index({ "progress.overall": 1 });
enrollmentSchema.index({ accessExpiresAt: 1 });
enrollmentSchema.index({ "certificate.issued": 1 });
enrollmentSchema.index({ enrolledAt: 1 });
enrollmentSchema.index({ enrollmentType: 1, student: 1 });

// Virtual for remaining time
enrollmentSchema.virtual("remainingTime").get(function () {
  if (!this.accessExpiresAt) return null;
  return this.accessExpiresAt - new Date();
});

// Method to update enrollment status
enrollmentSchema.methods.updateStatus = async function (newStatus) {
  if (
    !["active", "completed", "dropped", "suspended", "expired"].includes(
      newStatus,
    )
  ) {
    throw new Error("Invalid status");
  }

  this.status = newStatus;
  if (newStatus === "completed") {
    this.completedAt = new Date();
  }
  this.lastAccessed = new Date();
  await this.save();
  return this;
};

// Method to update progress
enrollmentSchema.methods.updateProgress = async function (progressData) {
  const { type, itemId } = progressData;

  if (!["lessons", "assignments", "quizzes"].includes(type)) {
    throw new Error("Invalid progress type");
  }

  if (!this.progress[type].completed.includes(itemId)) {
    this.progress[type].completed.push(itemId);
    this.progress[type].lastAccessed = new Date();

    // Calculate overall progress
    const totalItems = await this.calculateTotalItems();
    const completedItems =
      this.progress.lessons.completed.length +
      this.progress.assignments.completed.length +
      this.progress.quizzes.completed.length;

    this.progress.overall = Math.round((completedItems / totalItems) * 100);

    // Check completion
    if (this.progress.overall === 100 && this.status === "active") {
      this.status = "completed";
      this.completedAt = new Date();
    }
  }

  this.lastAccessed = new Date();
  await this.save();
  return this;
};

// Method to calculate total items
enrollmentSchema.methods.calculateTotalItems = async function () {
  const course = await this.model("Course").findById(this.course);
  if (!course) return 0;

  return (
    course.lessons.length + course.assignments.length + course.quizzes.length
  );
};

// Method to issue certificate
enrollmentSchema.methods.issueCertificate = async function (certificateData) {
  const { certificateUrl, certificateId, grade, score } = certificateData;

  this.certificate = {
    issued: true,
    issuedAt: new Date(),
    certificateUrl,
    certificateId,
    grade,
    score,
  };

  this.lastAccessed = new Date();
  await this.save();
  return this;
};

// Method to update payment status
enrollmentSchema.methods.updatePaymentStatus = async function (
  status,
  details = {},
) {
  if (
    !["pending", "completed", "failed", "refunded", "partial"].includes(status)
  ) {
    throw new Error("Invalid payment status");
  }

  this.paymentStatus = status;
  if (details) {
    this.paymentDetails = {
      ...this.paymentDetails,
      ...details,
      paymentDate: new Date(),
    };
  }
  this.lastAccessed = new Date();
  await this.save();
  return this;
};

// Static method to get student's active enrollments
enrollmentSchema.statics.getActiveEnrollments = async function (studentId) {
  return await this.find({
    student: studentId,
    status: "active",
  }).populate("course", "title description thumbnail duration");
};

// Static method to get course enrollments
enrollmentSchema.statics.getCourseEnrollments = async function (courseId) {
  return await this.find({
    course: courseId,
  }).populate("student", "name email role");
};

// Static method to get expired enrollments
enrollmentSchema.statics.getExpiredEnrollments = async function () {
  return await this.find({
    status: "active",
    accessExpiresAt: { $lt: new Date() },
  });
};

// Static method to get saved courses for a student
enrollmentSchema.statics.getSavedCourses = async function (studentId) {
  return await this.find({
    student: studentId,
    enrollmentType: "saved"
  }).populate("course", "course_title course_category course_image course_duration prices status").lean();
};

// Static method to check if a course is saved by a student
enrollmentSchema.statics.isSavedCourse = async function (studentId, courseId) {
  const savedCourse = await this.findOne({
    student: studentId,
    course: courseId,
    enrollmentType: "saved"
  });
  return !!savedCourse;
};

// Instance method to convert a saved course to an active enrollment
enrollmentSchema.methods.convertToEnrollment = async function (enrollmentData) {
  if (this.enrollmentType !== "saved") {
    throw new Error("Only saved courses can be converted to enrollments");
  }
  
  // Update enrollment details
  this.enrollmentType = enrollmentData.enrollmentType || "individual";
  this.status = "active";
  this.enrolledAt = new Date();
  this.lastAccessed = new Date();
  this.paymentStatus = enrollmentData.paymentStatus || "pending";
  
  if (enrollmentData.paymentDetails) {
    this.paymentDetails = enrollmentData.paymentDetails;
  }
  
  if (enrollmentData.accessExpiresAt) {
    this.accessExpiresAt = enrollmentData.accessExpiresAt;
  } else if (this.course && this.course.duration) {
    // Calculate expiry based on course duration
    const durationMatch = this.course.duration.match(/(\d+)\s+(\w+)/);
    if (durationMatch) {
      const [, value, unit] = durationMatch;
      const expiryDate = new Date();
      
      if (unit.includes('month')) {
        expiryDate.setMonth(expiryDate.getMonth() + parseInt(value));
      } else if (unit.includes('week')) {
        expiryDate.setDate(expiryDate.getDate() + (parseInt(value) * 7));
      } else if (unit.includes('day')) {
        expiryDate.setDate(expiryDate.getDate() + parseInt(value));
      } else if (unit.includes('year')) {
        expiryDate.setFullYear(expiryDate.getFullYear() + parseInt(value));
      }
      
      this.accessExpiresAt = expiryDate;
    }
  }
  
  // Initialize progress
  this.progress = {
    overall: 0,
    lessons: { completed: [], lastAccessed: null },
    assignments: { completed: [], lastAccessed: null },
    quizzes: { completed: [], lastAccessed: null }
  };
  
  await this.save();
  return this;
};

// Static method to get enrollment statistics
enrollmentSchema.statics.getEnrollmentStats = async function (courseId) {
  const stats = await this.aggregate([
    { $match: { course: courseId, enrollmentType: { $ne: "saved" } } },
    {
      $group: {
        _id: null,
        totalEnrollments: { $sum: 1 },
        activeEnrollments: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        completedEnrollments: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        averageProgress: { $avg: "$progress.overall" },
        totalRevenue: { $sum: "$paymentDetails.amount" },
      },
    },
  ]);

  return (
    stats[0] || {
      totalEnrollments: 0,
      activeEnrollments: 0,
      completedEnrollments: 0,
      averageProgress: 0,
      totalRevenue: 0,
    }
  );
};

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
export default Enrollment;
