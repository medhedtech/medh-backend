/**
 * @file Certificate Mongoose Model
 * @module models/certificate-model
 * @description Mongoose schema and model for course completion certificates, including methods for validation, revocation, and verification.
 *
 * @typedef {Object} CertificateMetadata
 * @property {string} issuedBy - Name of the issuer
 * @property {string} issuerTitle - Title of the issuer
 * @property {string} issuerSignature - URL to issuer's signature image
 * @property {string} institutionLogo - URL to institution logo
 * @property {string} certificateTemplate - URL to certificate template
 *
 * @typedef {Object} CertificateDocument
 * @property {string} id - Unique certificate ID
 * @property {mongoose.Types.ObjectId} course - Reference to Course
 * @property {mongoose.Types.ObjectId} student - Reference to User
 * @property {string} student_name - Name of the student at time of issuance (denormalized)
 * @property {mongoose.Types.ObjectId} [enrollment] - Reference to Enrollment
 * @property {string} certificateNumber - Unique certificate number
 * @property {Date} issueDate - Date of issue
 * @property {Date} [expiryDate] - Expiry date (optional)
 * @property {"active"|"revoked"|"expired"} status - Certificate status
 * @property {"A+"|"A"|"A-"|"B+"|"B"|"B-"|"C+"|"C"|"C-"|"D"|"F"} grade - Grade awarded
 * @property {number} finalScore - Final score (0-100)
 * @property {Date} completionDate - Date of course completion
 * @property {string} certificateUrl - URL to certificate PDF/image
 * @property {string} verificationUrl - URL for certificate verification
 * @property {CertificateMetadata} metadata - Issuer and template metadata
 * @property {string} [revocationReason] - Reason for revocation
 * @property {Date} [revocationDate] - Date of revocation
 * @property {mongoose.Types.ObjectId} [revokedBy] - Reference to User who revoked
 * @property {Object} meta - Metadata (e.g., lastUpdated)
 * @property {Date} meta.lastUpdated - Last update timestamp
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Update timestamp
 *
 * @typedef {Object} CertificateModel
 * @property {function(): boolean} isValid - Checks if certificate is valid
 * @property {function(string, mongoose.Types.ObjectId): Promise<void>} revoke - Revokes the certificate
 */

import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    /** @type {string} Unique certificate ID */
    id: {
      type: String,
      required: [true, "Certificate ID is required"],
      unique: true,
    },
    /** @type {mongoose.Types.ObjectId} Reference to Course */
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
    },
    /** @type {mongoose.Types.ObjectId} Reference to User */
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required"],
    },
    /**
     * @type {string} Name of the student at time of issuance (denormalized)
     * This is stored for historical accuracy, so the certificate always shows the name as it was when issued.
     */
    student_name: {
      type: String,
      required: [true, "Student name is required"],
      minlength: 2,
      maxlength: 100,
      trim: true,
    },
    /** @type {mongoose.Types.ObjectId} Reference to Enrollment (optional) */
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      required: false,
    },
    /** @type {string} Unique certificate number */
    certificateNumber: {
      type: String,
      required: [true, "Certificate number is required"],
      unique: true,
    },
    /** @type {Date} Issue date */
    issueDate: {
      type: Date,
      required: [true, "Issue date is required"],
      default: Date.now,
    },
    /** @type {Date} Expiry date (optional) */
    expiryDate: {
      type: Date,
    },
    /** @type {"active"|"revoked"|"expired"} Status */
    status: {
      type: String,
      enum: ["active", "revoked", "expired"],
      default: "active",
    },
    /** @type {"A+"|"A"|"A-"|"B+"|"B"|"B-"|"C+"|"C"|"C-"|"D"|"F"} Grade */
    grade: {
      type: String,
      enum: ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"],
      required: [true, "Grade is required"],
    },
    /** @type {number} Final score (0-100) */
    finalScore: {
      type: Number,
      required: [true, "Final score is required"],
      min: [0, "Score cannot be negative"],
      max: [100, "Score cannot exceed 100"],
    },
    /** @type {Date} Completion date */
    completionDate: {
      type: Date,
      required: [true, "Completion date is required"],
    },
    /** @type {string} Certificate file URL */
    certificateUrl: {
      type: String,
      required: [true, "Certificate URL is required"],
    },
    /** @type {string} Verification URL */
    verificationUrl: {
      type: String,
      required: [true, "Verification URL is required"],
    },
    /** @type {CertificateMetadata} Issuer and template metadata */
    metadata: {
      /** @type {string} Issuer name */
      issuedBy: {
        type: String,
        required: [true, "Issuer name is required"],
      },
      /** @type {string} Issuer title */
      issuerTitle: {
        type: String,
        required: [true, "Issuer title is required"],
      },
      /** @type {string} Issuer signature URL */
      issuerSignature: {
        type: String,
        required: [true, "Issuer signature URL is required"],
      },
      /** @type {string} Institution logo URL */
      institutionLogo: {
        type: String,
        required: [true, "Institution logo URL is required"],
      },
      /** @type {string} Certificate template URL */
      certificateTemplate: {
        type: String,
        required: [true, "Certificate template URL is required"],
      },
      /** @type {string} Instructor name for certificate */
      instructorName: {
        type: String,
        trim: true,
      },
      /** @type {string} Coordinator name for certificate */
      coordinatorName: {
        type: String,
        trim: true,
      },
      /** @type {string} Session date for certificate */
      sessionDate: {
        type: String,
        trim: true,
      },
      /** @type {string} Issued date for certificate */
      issuedDate: {
        type: String,
        trim: true,
      },
      /** @type {string} Session type for certificate */
      sessionType: {
        type: String,
        trim: true,
        default: "Demo Session Attendance",
      },
      /** @type {string} QR code data URL */
      qrCodeDataUrl: {
        type: String,
        trim: true,
      },
    },
    /** @type {string} Reason for revocation (optional) */
    revocationReason: {
      type: String,
      trim: true,
    },
    /** @type {Date} Revocation date (optional) */
    revocationDate: {
      type: Date,
    },
    /** @type {mongoose.Types.ObjectId} User who revoked (optional) */
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    /** @type {Object} Meta information */
    meta: {
      /** @type {Date} Last updated timestamp */
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
  },
  { timestamps: true },
);

// Indexes for better query performance
certificateSchema.index({ course: 1, student: 1 });
// Note: certificateNumber index is already created via unique: true in schema
certificateSchema.index({ status: 1 });
certificateSchema.index({ issueDate: 1 });

/**
 * Checks if the certificate is valid (active and not expired)
 * @function
 * @returns {boolean} True if valid, false otherwise
 */
certificateSchema.methods.isValid = function () {
  if (this.status !== "active") return false;
  if (this.expiryDate && this.expiryDate < new Date()) return false;
  return true;
};

/**
 * Revokes the certificate with a reason and user
 * @function
 * @param {string} reason - Reason for revocation
 * @param {mongoose.Types.ObjectId} revokedBy - User who revoked
 * @returns {Promise<void>} Promise that resolves when saved
 */
certificateSchema.methods.revoke = async function (reason, revokedBy) {
  this.status = "revoked";
  this.revocationReason = reason;
  this.revocationDate = new Date();
  this.revokedBy = revokedBy;
  await this.save();
};

/**
 * Get all certificates for a student
 * @function
 * @param {mongoose.Types.ObjectId} studentId - Student user ID
 * @returns {Promise<CertificateDocument[]>} List of certificates
 */
certificateSchema.statics.getCertificatesByStudent = async function (
  studentId,
) {
  return this.find({ student: studentId }).sort({ issueDate: -1 });
};

/**
 * Get all certificates for a course
 * @function
 * @param {mongoose.Types.ObjectId} courseId - Course ID
 * @returns {Promise<CertificateDocument[]>} List of certificates
 */
certificateSchema.statics.getCertificatesByCourse = async function (courseId) {
  return this.find({ course: courseId }).sort({ issueDate: -1 });
};

/**
 * Verify a certificate by its number
 * @function
 * @param {string} certificateNumber - Certificate number
 * @returns {Promise<null|Object>} Verification result or null if not found
 */
certificateSchema.statics.verifyCertificate = async function (
  certificateNumber,
) {
  const certificate = await this.findOne({ certificateNumber });
  if (!certificate) return null;

  return {
    isValid: certificate.isValid(),
    student: certificate.student,
    course: certificate.course,
    issueDate: certificate.issueDate,
    grade: certificate.grade,
    finalScore: certificate.finalScore,
  };
};

// Prevent model overwrite error during development
const Certificate =
  mongoose.models.Certificate ||
  mongoose.model("Certificate", certificateSchema);
export default Certificate;
