import crypto from "crypto";
import Certificate from "../models/certificate-model.js";

/**
 * Generate a unique certificate ID with format: MEDH-CERT-YYYY-XXXXXXXX
 * @param {string} courseId - The course ID
 * @param {string} studentId - The student ID
 * @param {string} completionDate - The completion date
 * @returns {Promise<string>} - Unique certificate ID
 */
export const generateCertificateId = async (
  courseId,
  studentId,
  completionDate,
) => {
  try {
    const year = new Date(completionDate).getFullYear();
    let isUnique = false;
    let certificateId = "";
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // Generate random 8-character alphanumeric string
      const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
      certificateId = `MEDH-CERT-${year}-${randomPart}`;

      // Check if this ID already exists
      const existingCert = await Certificate.findOne({ id: certificateId });
      if (!existingCert) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error(
        "Failed to generate unique certificate ID after maximum attempts",
      );
    }

    return certificateId;
  } catch (error) {
    throw new Error(`Certificate ID generation failed: ${error.message}`);
  }
};

/**
 * Generate a unique certificate number with format: CERT-YYYYMMDD-XXXXXXXX
 * @param {string} completionDate - The completion date
 * @returns {Promise<string>} - Unique certificate number
 */
export const generateCertificateNumber = async (completionDate) => {
  try {
    const date = new Date(completionDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;

    let isUnique = false;
    let certificateNumber = "";
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // Generate random 8-character alphanumeric string
      const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
      certificateNumber = `CERT-${dateStr}-${randomPart}`;

      // Check if this number already exists
      const existingCert = await Certificate.findOne({ certificateNumber });
      if (!existingCert) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error(
        "Failed to generate unique certificate number after maximum attempts",
      );
    }

    return certificateNumber;
  } catch (error) {
    throw new Error(`Certificate number generation failed: ${error.message}`);
  }
};

/**
 * Generate verification URL for certificate
 * @param {string} certificateNumber - The certificate number
 * @returns {string} - Verification URL
 */
export const generateVerificationUrl = (certificateNumber) => {
  const baseUrl = process.env.FRONTEND_URL || "https://medh.edu.in";
  return `${baseUrl}/verify-certificate/${certificateNumber}`;
};

/**
 * Calculate grade based on final score
 * @param {number} finalScore - The final score (0-100)
 * @returns {string} - Grade (A+, A, A-, B+, B, B-, C+, C, C-, D, F)
 */
export const calculateGrade = (finalScore) => {
  if (finalScore >= 97) return "A+";
  if (finalScore >= 93) return "A";
  if (finalScore >= 90) return "A-";
  if (finalScore >= 87) return "B+";
  if (finalScore >= 83) return "B";
  if (finalScore >= 80) return "B-";
  if (finalScore >= 77) return "C+";
  if (finalScore >= 73) return "C";
  if (finalScore >= 70) return "C-";
  if (finalScore >= 60) return "D";
  return "F";
};

/**
 * Validate certificate generation requirements
 * @param {Object} enrollmentData - Enrollment data
 * @param {number} finalScore - Final score
 * @returns {Object} - Validation result
 */
export const validateCertificateRequirements = (enrollmentData, finalScore) => {
  const errors = [];

  // Check if enrollment is completed
  if (enrollmentData.status !== "completed") {
    errors.push("Course must be completed to generate certificate");
  }

  // Check minimum score requirement (70%)
  if (finalScore < 70) {
    errors.push("Minimum score of 70% required for certificate");
  }

  // Check if certificate already issued
  if (enrollmentData.certificate_issued) {
    errors.push("Certificate already issued for this enrollment");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Generate certificate metadata
 * @param {Object} course - Course data
 * @param {Object} student - Student data
 * @returns {Object} - Certificate metadata
 */
export const generateCertificateMetadata = (course, student) => {
  return {
    issuedBy: course.assigned_instructor?.full_name || "MEDH Administration",
    issuerTitle: "Course Instructor",
    issuerSignature:
      process.env.DEFAULT_SIGNATURE_URL ||
      "/assets/signatures/default-signature.png",
    institutionLogo:
      process.env.INSTITUTION_LOGO_URL || "/assets/logos/medh-logo.png",
    certificateTemplate:
      process.env.CERTIFICATE_TEMPLATE_URL ||
      "/assets/templates/default-certificate.png",
  };
};
