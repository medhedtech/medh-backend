import PDF from "html-pdf-chrome";

import LegacyCertificate from "../models/cetificates-model.js";
import Certificate from "../models/certificate-model.js";
import Enrollment from "../models/enrollment-model.js";
import Course from "../models/course-model.js";
import EnrolledCourse from "../models/enrolled-courses-model.js";
import User from "../models/user-modal.js";
import { chromeService } from "../utils/chromeService.js";
import { generatePdfContentForCertificate } from "../utils/htmlTemplate.js";
import logger from "../utils/logger.js";
import { uploadFile } from "../utils/uploadFile.js";
import {
  generateCertificateId,
  generateCertificateNumber,
  generateVerificationUrl,
  calculateGrade,
  validateCertificateRequirements,
  generateCertificateMetadata,
} from "../utils/certificateIdGenerator.js";
import {
  generateQRCode,
  generateQRCodeBuffer,
  generateCertificateQRCode,
  validateQRCodeParams,
  getQRCodeOptions,
} from "../utils/qrCodeGenerator.js";

const pdfOptions = {
  port: 9222, // Chrome debug port
  printOptions: {
    landscape: true,
    format: "A4",
    printBackground: true,
    margin: {
      top: "1cm",
      bottom: "1cm",
      left: "1cm",
      right: "1cm",
    },
  },
};

export const getAllCertificates = async (req, res) => {
  try {
    const certificates = await EnrolledCourse.find({
      is_completed: true,
      $or: [
        {
          is_certifiled: false,
        },
        {
          is_certifiled: {
            $exists: false,
          },
        },
      ],
    })
      .populate("student_id", "full_name")
      .populate("course_id", "course_title assigned_instructor course_image")
      .exec();

    res.status(200).json(certificates);
  } catch (error) {
    logger.error("Error fetching certificates", {
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
    res.status(500).json({ message: "Failed to fetch certificates" });
  }
};

export const createCertificate = async (req, res) => {
  const { student_id, course_id, completion_date, student_name, course_name } =
    req.body;

  try {
    // Ensure student has completed the course
    const enrollment = await EnrolledCourse.findOne({
      student_id: student_id,
      course_id: course_id,
      is_completed: true,
      is_certifiled: false,
    });

    if (!enrollment) {
      return res
        .status(400)
        .json({ message: "Student has not completed this course" });
    }

    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Generate certificate HTML
    const htmlContent = generatePdfContentForCertificate({
      student_name: student_name,
      course_name: course_name,
    });

    try {
      // Ensure Chrome is running
      await chromeService.ensureRunning();

      // Generate PDF using html-pdf-chrome
      const pdf = await PDF.create(htmlContent, pdfOptions);
      const pdfBuffer = await pdf.toBuffer();

      const pdfKey = `certificates/${student_name}/${Date.now().toString()}.pdf`;
      const uploadParams = {
        key: pdfKey,
        file: pdfBuffer,
        contentType: "application/pdf",
      };

      // Upload to S3
      uploadFile(
        uploadParams,
        async (url) => {
          try {
            const certificate = new LegacyCertificate({
              student_id: student_id,
              student_name: student_name,
              course_id: course_id,
              course_name: course_name,
              completion_date: completion_date,
              certificateUrl: url,
            });

            await certificate.save();
            await EnrolledCourse.updateOne(
              { _id: enrollment._id },
              { $set: { is_certifiled: true } },
            );

            res.status(201).json({
              message:
                "Certificate created and enrollment updated successfully",
              certificate,
            });
          } catch (dbError) {
            logger.error("Database error while saving certificate", {
              error: {
                message: dbError.message,
                stack: dbError.stack,
              },
            });
            res
              .status(500)
              .json({ message: "Failed to save certificate details" });
          }
        },
        (uploadError) => {
          logger.error("Error uploading PDF to S3", {
            error: {
              message: uploadError.message,
              stack: uploadError.stack,
            },
          });
          res.status(500).json({ message: "Failed to upload certificate" });
        },
      );
    } catch (pdfError) {
      logger.error("Error generating PDF", {
        error: {
          message: pdfError.message,
          stack: pdfError.stack,
        },
      });
      res.status(500).json({ message: "Failed to generate certificate PDF" });
    }
  } catch (error) {
    logger.error("Error in certificate creation process", {
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
    res.status(500).json({ message: "Failed to create certificate" });
  }
};

export const getCertificatesByStudentId = async (req, res) => {
  const { student_id } = req.params;

  try {
    const certificates = await LegacyCertificate.find({ student_id })
      .populate("student_id", "full_name")
      .populate(
        "course_id",
        "course_title assigned_instructor course_image certificateUrl",
      )
      .exec();

    if (!certificates || certificates.length === 0) {
      return res.status(404).json({
        message: "No certificates found for the given student ID",
      });
    }

    res.status(200).json(certificates);
  } catch (error) {
    logger.error("Error fetching student certificates", {
      error: {
        message: error.message,
        stack: error.stack,
      },
      studentId: student_id,
    });
    res.status(500).json({ message: "Failed to fetch student certificates" });
  }
};

/**
 * Generate Certificate ID API
 * POST /api/v1/certificates/generate-id
 */
export const generateCertificateIdAPI = async (req, res) => {
  try {
    const { studentId, courseId, enrollmentId, finalScore } = req.body;

    // Validate required fields
    if (!studentId || !courseId || !finalScore) {
      return res.status(400).json({
        success: false,
        message: "Student ID, Course ID, and Final Score are required",
      });
    }

    // Validate final score
    if (typeof finalScore !== "number" || finalScore < 0 || finalScore > 100) {
      return res.status(400).json({
        success: false,
        message: "Final score must be a number between 0 and 100",
      });
    }

    // Find enrollment
    let enrollment;
    if (enrollmentId) {
      enrollment = await Enrollment.findById(enrollmentId)
        .populate("student")
        .populate("course");
    } else {
      enrollment = await Enrollment.findOne({
        student: studentId,
        course: courseId,
      })
        .populate("student")
        .populate("course");
    }

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found for the given student and course",
      });
    }

    // Validate certificate requirements
    const validation = validateCertificateRequirements(enrollment, finalScore);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Certificate requirements not met",
        errors: validation.errors,
      });
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({
      student: studentId,
      course: courseId,
      enrollment: enrollmentId,
    });

    if (existingCertificate) {
      return res.status(409).json({
        success: false,
        message: "Certificate already exists for this enrollment",
        certificate: {
          id: existingCertificate.id,
          certificateNumber: existingCertificate.certificateNumber,
          verificationUrl: existingCertificate.verificationUrl,
        },
      });
    }

    // Generate certificate ID and number
    const completionDate = enrollment.completionDate || new Date();
    const certificateId = await generateCertificateId(
      courseId,
      studentId,
      completionDate,
    );
    const certificateNumber = await generateCertificateNumber(completionDate);
    const verificationUrl = generateVerificationUrl(certificateNumber);
    const grade = calculateGrade(finalScore);

    // Get course and student data
    const course = await Course.findById(courseId).populate(
      "assigned_instructor",
    );
    const student = await User.findById(studentId);

    if (!course || !student) {
      return res.status(404).json({
        success: false,
        message: "Course or student not found",
      });
    }

    // Generate certificate metadata
    const metadata = generateCertificateMetadata(course, student);

    // Create certificate record
    const certificate = new Certificate({
      id: certificateId,
      course: courseId,
      student: studentId,
      enrollment: enrollmentId,
      certificateNumber,
      issueDate: new Date(),
      status: "active",
      grade,
      finalScore,
      completionDate,
      certificateUrl: `${process.env.FRONTEND_URL || "https://medh.edu.in"}/certificates/${certificateId}`,
      verificationUrl,
      metadata,
    });

    await certificate.save();

    // Update enrollment to mark certificate as issued
    if (enrollment) {
      enrollment.certificate_issued = true;
      enrollment.certificate_id = certificate._id;
      await enrollment.save();
    }

    logger.info("Certificate ID generated successfully", {
      certificateId,
      certificateNumber,
      studentId,
      courseId,
      enrollmentId,
    });

    res.status(201).json({
      success: true,
      message: "Certificate ID generated successfully",
      data: {
        certificateId,
        certificateNumber,
        verificationUrl,
        grade,
        finalScore,
        issueDate: certificate.issueDate,
        student: {
          id: student._id,
          name: student.full_name,
          email: student.email,
        },
        course: {
          id: course._id,
          title: course.course_title,
          instructor: course.assigned_instructor?.full_name,
        },
      },
    });
  } catch (error) {
    logger.error("Error generating certificate ID", {
      error: {
        message: error.message,
        stack: error.stack,
      },
      requestBody: req.body,
    });

    res.status(500).json({
      success: false,
      message: "Failed to generate certificate ID",
      error: error.message,
    });
  }
};

/**
 * Create Demo Student Enrollment API
 * POST /api/v1/certificates/demo-enrollment
 */
export const createDemoEnrollment = async (req, res) => {
  try {
    const {
      studentData,
      courseId,
      enrollmentType = "individual",
      paymentData,
      demoMode = true,
    } = req.body;

    // Validate required fields
    if (!studentData || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Student data and Course ID are required",
      });
    }

    // Validate student data
    const requiredStudentFields = ["full_name", "email", "phone_number"];
    const missingFields = requiredStudentFields.filter(
      (field) => !studentData[field],
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required student fields: ${missingFields.join(", ")}`,
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Create or find demo student
    let student = await User.findOne({ email: studentData.email });

    if (!student) {
      // Create new demo student
      student = new User({
        full_name: studentData.full_name,
        email: studentData.email,
        phone_number: studentData.phone_number,
        role: ["student"],
        status: "active",
        is_demo: demoMode,
        username: `demo_${Date.now()}`,
        password: "demo123", // This will be hashed by the model pre-save hook
        age_group: studentData.age_group || "25-34",
        gender: studentData.gender || "prefer-not-to-say",
        meta: {
          demo_created_at: new Date(),
          demo_purpose: "certificate_generation_demo",
        },
      });

      await student.save();
      logger.info("Demo student created", {
        studentId: student._id,
        email: student.email,
      });
    } else {
      logger.info("Using existing student for demo enrollment", {
        studentId: student._id,
        email: student.email,
      });
    }

    // Check if enrollment already exists
    const existingEnrollment = await Enrollment.findOne({
      student: student._id,
      course: courseId,
    });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message: "Student is already enrolled in this course",
        enrollment: {
          id: existingEnrollment._id,
          status: existingEnrollment.status,
          enrollmentDate: existingEnrollment.enrollment_date,
        },
      });
    }

    // Calculate access expiry date (default 6 months from now)
    const accessExpiryDate = new Date();
    accessExpiryDate.setMonth(accessExpiryDate.getMonth() + 6);

    // Create enrollment
    const enrollment = new Enrollment({
      student: student._id,
      course: courseId,
      enrollment_date: new Date(),
      status: "active",
      access_expiry_date: accessExpiryDate,
      enrollment_type: enrollmentType,
      enrollment_source: "demo",
      pricing_snapshot: {
        original_price: course.price || 0,
        final_price: demoMode ? 0 : course.price || 0,
        currency: course.currency || "INR",
        pricing_type: "individual",
        discount_applied: demoMode ? 100 : 0,
        discount_code: demoMode ? "DEMO100" : undefined,
      },
      progress: {
        overall_percentage: Math.floor(Math.random() * 31) + 70, // Random between 70-100% for demo
        lessons_completed: 0,
        last_activity_date: new Date(),
      },
      total_amount_paid: demoMode ? 0 : course.price || 0,
      payment_plan: demoMode ? "free" : "full",
      created_by: req.user?.id || null,
    });

    // Add demo payment if provided
    if (paymentData || demoMode) {
      const payment = {
        amount: demoMode ? 0 : paymentData?.amount || course.price || 0,
        currency: course.currency || "INR",
        payment_date: new Date(),
        payment_method: paymentData?.payment_method || "demo",
        transaction_id: demoMode
          ? `DEMO_${Date.now()}`
          : paymentData?.transaction_id,
        payment_status: "completed",
        payment_type: "course",
        metadata: {
          demo_payment: demoMode,
          created_for: "certificate_demo",
        },
      };

      enrollment.payments.push(payment);
    }

    await enrollment.save();

    // Populate the enrollment for response
    await enrollment.populate([
      { path: "student", select: "full_name email phone_number" },
      {
        path: "course",
        select: "course_title course_description price currency",
      },
    ]);

    logger.info("Demo enrollment created successfully", {
      enrollmentId: enrollment._id,
      studentId: student._id,
      courseId: courseId,
      demoMode,
    });

    res.status(201).json({
      success: true,
      message: "Demo enrollment created successfully",
      data: {
        enrollment: {
          id: enrollment._id,
          status: enrollment.status,
          enrollmentDate: enrollment.enrollment_date,
          accessExpiryDate: enrollment.access_expiry_date,
          enrollmentType: enrollment.enrollment_type,
          progress: enrollment.progress,
        },
        student: {
          id: student._id,
          name: student.full_name,
          email: student.email,
          phone: student.phone_number,
          isDemo: student.is_demo,
        },
        course: {
          id: course._id,
          title: course.course_title,
          description: course.course_description,
          price: course.price,
          currency: course.currency,
        },
        nextSteps: {
          message: "You can now generate a certificate ID for this enrollment",
          generateCertificateEndpoint: "/api/v1/certificates/generate-id",
          requiredFields: [
            "studentId",
            "courseId",
            "enrollmentId",
            "finalScore",
          ],
        },
      },
    });
  } catch (error) {
    logger.error("Error creating demo enrollment", {
      error: {
        message: error.message,
        stack: error.stack,
      },
      requestBody: req.body,
    });

    res.status(500).json({
      success: false,
      message: "Failed to create demo enrollment",
      error: error.message,
    });
  }
};

/**
 * Verify Certificate API
 * GET /api/v1/certificates/verify/:certificateNumber
 */
export const verifyCertificate = async (req, res) => {
  try {
    const { certificateNumber } = req.params;

    // Validate certificate number format
    if (!certificateNumber || typeof certificateNumber !== "string") {
      return res.status(400).json({
        success: false,
        message: "Certificate number is required",
      });
    }

    // Find certificate by certificate number
    const certificate = await Certificate.findOne({
      certificateNumber: certificateNumber.toUpperCase(),
    })
      .populate("student", "full_name email student_id")
      .populate("course", "course_title course_description assigned_instructor")
      .populate("enrollment", "enrollment_date status");

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
        isValid: false,
      });
    }

    // Check certificate validity
    const isValid = certificate.isValid();
    const currentDate = new Date();

    // Prepare verification response
    const verificationData = {
      isValid,
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        issueDate: certificate.issueDate,
        expiryDate: certificate.expiryDate,
        status: certificate.status,
        grade: certificate.grade,
        finalScore: certificate.finalScore,
        completionDate: certificate.completionDate,
      },
      student: {
        id: certificate.student._id,
        name: certificate.student.full_name,
        email: certificate.student.email,
        studentId: certificate.student.student_id,
      },
      course: {
        id: certificate.course._id,
        title: certificate.course.course_title,
        description: certificate.course.course_description,
        instructor: certificate.course.assigned_instructor?.full_name,
      },
      enrollment: certificate.enrollment
        ? {
            enrollmentDate: certificate.enrollment.enrollment_date,
            status: certificate.enrollment.status,
          }
        : null,
      metadata: {
        issuedBy: certificate.metadata.issuedBy,
        issuerTitle: certificate.metadata.issuerTitle,
        verificationDate: currentDate,
      },
    };

    // Add validation details if certificate is invalid
    if (!isValid) {
      const validationIssues = [];

      if (certificate.status !== "active") {
        validationIssues.push(`Certificate status is ${certificate.status}`);
      }

      if (certificate.expiryDate && certificate.expiryDate < currentDate) {
        validationIssues.push("Certificate has expired");
      }

      verificationData.validationIssues = validationIssues;
    }

    logger.info("Certificate verification completed", {
      certificateNumber,
      isValid,
      studentId: certificate.student._id,
      courseId: certificate.course._id,
    });

    res.status(200).json({
      success: true,
      message: isValid ? "Certificate is valid" : "Certificate is not valid",
      data: verificationData,
    });
  } catch (error) {
    logger.error("Error verifying certificate", {
      error: {
        message: error.message,
        stack: error.stack,
      },
      certificateNumber: req.params.certificateNumber,
    });

    res.status(500).json({
      success: false,
      message: "Failed to verify certificate",
      error: error.message,
    });
  }
};

/**
 * Generate QR Code for Certificate API
 * GET /api/v1/certificates/:certificateId/qr-code
 * POST /api/v1/certificates/generate-qr-code
 */
export const generateCertificateQRCodeAPI = async (req, res) => {
  try {
    let certificateId, certificateNumber, verificationUrl;

    // Handle both GET and POST requests
    if (req.method === "GET") {
      certificateId = req.params.certificateId;
    } else {
      const {
        certificateId: bodyId,
        certificateNumber: bodyNumber,
        verificationUrl: bodyUrl,
      } = req.body;
      certificateId = bodyId;
      certificateNumber = bodyNumber;
      verificationUrl = bodyUrl;
    }

    // If we have a direct verification URL, use it
    if (verificationUrl) {
      // Validate QR code parameters
      const validation = validateQRCodeParams(
        verificationUrl,
        req.body.options || {},
      );
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid QR code parameters",
          errors: validation.errors,
        });
      }

      // Generate QR code
      const qrCodeDataURL = await generateCertificateQRCode(
        verificationUrl,
        certificateNumber || "unknown",
      );

      return res.status(200).json({
        success: true,
        message: "QR code generated successfully",
        data: {
          qrCode: qrCodeDataURL,
          verificationUrl,
          certificateNumber: certificateNumber || null,
          format: "data:image/png;base64",
        },
      });
    }

    // Find certificate by ID or certificate number
    let certificate;
    if (certificateId) {
      certificate = await Certificate.findOne({
        $or: [
          { _id: certificateId },
          { id: certificateId },
          { certificateNumber: certificateId.toUpperCase() },
        ],
      });
    } else if (certificateNumber) {
      certificate = await Certificate.findOne({
        certificateNumber: certificateNumber.toUpperCase(),
      });
    }

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    // Check if certificate is valid for QR generation
    if (certificate.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Cannot generate QR code for inactive certificate",
        certificateStatus: certificate.status,
      });
    }

    // Generate QR code for certificate verification URL
    const qrCodeDataURL = await generateCertificateQRCode(
      certificate.verificationUrl,
      certificate.certificateNumber,
    );

    logger.info("Certificate QR code generated", {
      certificateId: certificate.id,
      certificateNumber: certificate.certificateNumber,
      verificationUrl: certificate.verificationUrl,
    });

    res.status(200).json({
      success: true,
      message: "QR code generated successfully",
      data: {
        qrCode: qrCodeDataURL,
        verificationUrl: certificate.verificationUrl,
        certificateId: certificate.id,
        certificateNumber: certificate.certificateNumber,
        format: "data:image/png;base64",
        certificate: {
          issueDate: certificate.issueDate,
          grade: certificate.grade,
          finalScore: certificate.finalScore,
        },
      },
    });
  } catch (error) {
    logger.error("Error generating certificate QR code", {
      error: {
        message: error.message,
        stack: error.stack,
      },
      requestParams: req.params,
      requestBody: req.body,
    });

    res.status(500).json({
      success: false,
      message: "Failed to generate QR code",
      error: error.message,
    });
  }
};

/**
 * Generate QR Code as Image Buffer API
 * GET /api/v1/certificates/:certificateId/qr-code/download
 */
export const downloadCertificateQRCode = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const { format = "png", width = 300 } = req.query;

    // Find certificate
    const certificate = await Certificate.findOne({
      $or: [
        { _id: certificateId },
        { id: certificateId },
        { certificateNumber: certificateId.toUpperCase() },
      ],
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    // Check if certificate is valid
    if (certificate.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Cannot generate QR code for inactive certificate",
      });
    }

    // Generate QR code options
    const options = getQRCodeOptions("certificate");
    options.width = parseInt(width) || 300;
    options.type = format;

    // Generate QR code as buffer
    const qrCodeBuffer = await generateQRCodeBuffer(
      certificate.verificationUrl,
      options,
    );

    // Set response headers for file download
    res.setHeader("Content-Type", `image/${format}`);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificate-${certificate.certificateNumber}-qr.${format}"`,
    );
    res.setHeader("Content-Length", qrCodeBuffer.length);

    logger.info("Certificate QR code downloaded", {
      certificateNumber: certificate.certificateNumber,
      format,
      width,
      bufferSize: qrCodeBuffer.length,
    });

    res.send(qrCodeBuffer);
  } catch (error) {
    logger.error("Error downloading certificate QR code", {
      error: {
        message: error.message,
        stack: error.stack,
      },
      certificateId: req.params.certificateId,
    });

    res.status(500).json({
      success: false,
      message: "Failed to download QR code",
      error: error.message,
    });
  }
};

/**
 * Bulk Certificate Verification API
 * POST /api/v1/certificates/verify-bulk
 */
export const verifyBulkCertificates = async (req, res) => {
  try {
    const { certificateNumbers } = req.body;

    // Validate input
    if (!Array.isArray(certificateNumbers) || certificateNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Certificate numbers array is required",
      });
    }

    if (certificateNumbers.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Maximum 50 certificates can be verified at once",
      });
    }

    // Find all certificates
    const certificates = await Certificate.find({
      certificateNumber: {
        $in: certificateNumbers.map((num) => num.toUpperCase()),
      },
    })
      .populate("student", "full_name email")
      .populate("course", "course_title")
      .select(
        "id certificateNumber issueDate expiryDate status grade finalScore student course",
      );

    // Create verification results
    const results = certificateNumbers.map((certNumber) => {
      const certificate = certificates.find(
        (cert) => cert.certificateNumber === certNumber.toUpperCase(),
      );

      if (!certificate) {
        return {
          certificateNumber: certNumber,
          isValid: false,
          status: "not_found",
          message: "Certificate not found",
        };
      }

      const isValid = certificate.isValid();
      return {
        certificateNumber: certificate.certificateNumber,
        isValid,
        status: certificate.status,
        message: isValid ? "Valid certificate" : "Invalid certificate",
        data: isValid
          ? {
              issueDate: certificate.issueDate,
              grade: certificate.grade,
              finalScore: certificate.finalScore,
              student: certificate.student?.full_name,
              course: certificate.course?.course_title,
            }
          : null,
      };
    });

    const validCount = results.filter((r) => r.isValid).length;
    const invalidCount = results.length - validCount;

    logger.info("Bulk certificate verification completed", {
      totalCertificates: certificateNumbers.length,
      validCount,
      invalidCount,
    });

    res.status(200).json({
      success: true,
      message: `Verified ${certificateNumbers.length} certificates`,
      data: {
        summary: {
          total: certificateNumbers.length,
          valid: validCount,
          invalid: invalidCount,
        },
        results,
      },
    });
  } catch (error) {
    logger.error("Error in bulk certificate verification", {
      error: {
        message: error.message,
        stack: error.stack,
      },
      requestBody: req.body,
    });

    res.status(500).json({
      success: false,
      message: "Failed to verify certificates",
      error: error.message,
    });
  }
};

/**
 * Create Demo Student Enrollment API
 * POST /api/v1/certificates/demo-enrollment
 */
export const createDemoEnrollmentAPI = async (req, res) => {
  try {
    const {
      studentName = "Demo Student",
      studentEmail = "demo@medh.co",
      courseTitle = "Demo Course",
      courseDuration = "30 days",
      finalScore = 85,
      completionDate = new Date(),
    } = req.body;

    // Create or find demo student
    let demoStudent = await User.findOne({
      email: studentEmail,
      is_demo: true,
    });

    if (!demoStudent) {
      demoStudent = new User({
        full_name: studentName,
        email: studentEmail,
        username: studentEmail.split("@")[0] + "_demo",
        password: "demo_password_hash", // This should be hashed in production
        role: "student",
        is_demo: true,
        student_id: `DEMO_${Date.now()}`,
        email_verified: true,
        status: "active",
      });

      await demoStudent.save();
      logger.info("Demo student created", { studentId: demoStudent._id });
    }

    // Create or find demo course
    let demoCourse = await Course.findOne({
      course_title: courseTitle,
      status: "Published",
    });

    if (!demoCourse) {
      demoCourse = new Course({
        course_title: courseTitle,
        course_description:
          "This is a demo course for testing certificate generation",
        course_duration: courseDuration,
        course_category: "Demo",
        status: "Published",
        prices: [
          {
            currency: "USD",
            amount: 0,
            discount_percentage: 0,
          },
        ],
        assigned_instructor: demoStudent._id, // Use demo student as instructor for simplicity
        created_by: req.user?.id || demoStudent._id,
      });

      await demoCourse.save();
      logger.info("Demo course created", { courseId: demoCourse._id });
    }

    // Create demo enrollment
    const demoEnrollment = new Enrollment({
      student: demoStudent._id,
      course: demoCourse._id,
      enrollment_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      status: "completed",
      completion_date: new Date(completionDate),
      final_score: finalScore,
      progress: 100,
      certificate_generated: false,
      payment_status: "completed",
      payment_method: "demo",
    });

    await demoEnrollment.save();

    logger.info("Demo enrollment created successfully", {
      enrollmentId: demoEnrollment._id,
      studentId: demoStudent._id,
      courseId: demoCourse._id,
      finalScore,
    });

    res.status(201).json({
      success: true,
      message: "Demo enrollment created successfully",
      data: {
        enrollment: {
          id: demoEnrollment._id,
          enrollmentDate: demoEnrollment.enrollment_date,
          completionDate: demoEnrollment.completion_date,
          finalScore: demoEnrollment.final_score,
          status: demoEnrollment.status,
        },
        student: {
          id: demoStudent._id,
          name: demoStudent.full_name,
          email: demoStudent.email,
          studentId: demoStudent.student_id,
        },
        course: {
          id: demoCourse._id,
          title: demoCourse.course_title,
          description: demoCourse.course_description,
          duration: demoCourse.course_duration,
        },
        certificateEligible: finalScore >= 70,
        nextSteps: {
          generateCertificateId: `/api/v1/certificates/generate-id`,
          generateQRCode: `/api/v1/certificates/generate-qr-code`,
        },
      },
    });
  } catch (error) {
    logger.error("Error creating demo enrollment", {
      error: {
        message: error.message,
        stack: error.stack,
      },
      requestBody: req.body,
    });

    res.status(500).json({
      success: false,
      message: "Failed to create demo enrollment",
      error: error.message,
    });
  }
};
