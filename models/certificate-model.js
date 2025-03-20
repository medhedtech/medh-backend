const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Certificate ID is required'],
    unique: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required']
  },
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: [true, 'Enrollment reference is required']
  },
  certificateNumber: {
    type: String,
    required: [true, 'Certificate number is required'],
    unique: true
  },
  issueDate: {
    type: Date,
    required: [true, 'Issue date is required'],
    default: Date.now
  },
  expiryDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'revoked', 'expired'],
    default: 'active'
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'],
    required: [true, 'Grade is required']
  },
  finalScore: {
    type: Number,
    required: [true, 'Final score is required'],
    min: [0, 'Score cannot be negative'],
    max: [100, 'Score cannot exceed 100']
  },
  completionDate: {
    type: Date,
    required: [true, 'Completion date is required']
  },
  certificateUrl: {
    type: String,
    required: [true, 'Certificate URL is required']
  },
  verificationUrl: {
    type: String,
    required: [true, 'Verification URL is required']
  },
  metadata: {
    issuedBy: {
      type: String,
      required: [true, 'Issuer name is required']
    },
    issuerTitle: {
      type: String,
      required: [true, 'Issuer title is required']
    },
    issuerSignature: {
      type: String,
      required: [true, 'Issuer signature URL is required']
    },
    institutionLogo: {
      type: String,
      required: [true, 'Institution logo URL is required']
    },
    certificateTemplate: {
      type: String,
      required: [true, 'Certificate template URL is required']
    }
  },
  revocationReason: {
    type: String,
    trim: true
  },
  revocationDate: {
    type: Date
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  meta: {
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, { timestamps: true });

// Indexes for better query performance
certificateSchema.index({ course: 1, student: 1 });
certificateSchema.index({ certificateNumber: 1 });
certificateSchema.index({ status: 1 });
certificateSchema.index({ issueDate: 1 });

// Method to check if certificate is valid
certificateSchema.methods.isValid = function() {
  if (this.status !== 'active') return false;
  if (this.expiryDate && this.expiryDate < new Date()) return false;
  return true;
};

// Method to revoke certificate
certificateSchema.methods.revoke = async function(reason, revokedBy) {
  this.status = 'revoked';
  this.revocationReason = reason;
  this.revocationDate = new Date();
  this.revokedBy = revokedBy;
  await this.save();
};

// Static method to get certificates by student
certificateSchema.statics.getCertificatesByStudent = async function(studentId) {
  return this.find({ student: studentId }).sort({ issueDate: -1 });
};

// Static method to get certificates by course
certificateSchema.statics.getCertificatesByCourse = async function(courseId) {
  return this.find({ course: courseId }).sort({ issueDate: -1 });
};

// Static method to verify certificate
certificateSchema.statics.verifyCertificate = async function(certificateNumber) {
  const certificate = await this.findOne({ certificateNumber });
  if (!certificate) return null;
  
  return {
    isValid: certificate.isValid(),
    student: certificate.student,
    course: certificate.course,
    issueDate: certificate.issueDate,
    grade: certificate.grade,
    finalScore: certificate.finalScore
  };
};

const Certificate = mongoose.model("Certificate", certificateSchema);
module.exports = Certificate; 