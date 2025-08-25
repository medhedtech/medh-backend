import CertificateTemplate from "../models/certificateTemplate.js";
import GeneratedCertificate from "../models/generatedCertificate.js";
import User from "../models/user-modal.js";
import { ENV_VARS } from "../config/envVars.js";
import logger from "../utils/logger.js";
import { uploadToS3, generateSignedUrl, uploadCertificateTemplate, createCertificateFolderStructure } from "../utils/s3Utils.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CertificateController {
  constructor() {
    // Bind methods to preserve 'this' context
    this.generateCertificate = this.generateCertificate.bind(this);
    this.generateCertificateFile = this.generateCertificateFile.bind(this);
    this.uploadTemplate = this.uploadTemplate.bind(this);
    this.getAllTemplates = this.getAllTemplates.bind(this);
    this.getTemplateById = this.getTemplateById.bind(this);
    this.getCertificateById = this.getCertificateById.bind(this);
    this.getAllCertificates = this.getAllCertificates.bind(this);
    this.downloadCertificate = this.downloadCertificate.bind(this);
    this.deleteTemplate = this.deleteTemplate.bind(this);
    this.getCertificateStats = this.getCertificateStats.bind(this);
    this.setupCertificateStructure = this.setupCertificateStructure.bind(this);
  }

  /**
   * Upload certificate template
   * POST /api/v1/certificates/templates
   */
  async uploadTemplate(req, res) {
    try {
      const { templateName, description, fields, templateType = "custom" } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "Template file is required",
        });
      }

      if (!templateName || !fields || !Array.isArray(fields)) {
        return res.status(400).json({
          success: false,
          message: "Template name and fields array are required",
        });
      }

      // Validate file type
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf", "text/html"];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "Only PNG, JPEG, PDF, and HTML files are allowed",
        });
      }

      let fileUrl;
      
      // Try to upload to S3 if configured, otherwise use a placeholder URL
      try {
        if (templateType === "custom") {
          const uploadResult = await uploadToS3(
            file.buffer,
            `certificate-templates/${Date.now()}-${file.originalname}`,
            file.mimetype
          );
          fileUrl = uploadResult.Location;
        } else {
          // Upload to specific template type folder
          const uploadResult = await uploadCertificateTemplate(
            file.buffer,
            templateType,
            file.originalname,
            file.mimetype
          );
          fileUrl = uploadResult.Location;
        }
      } catch (s3Error) {
        logger.warn("S3 upload failed, using placeholder URL:", s3Error.message);
        // Use a placeholder URL for development/testing
        fileUrl = `https://placeholder.com/certificate-templates/${Date.now()}-${file.originalname}`;
      }

      // Create template record
      const template = new CertificateTemplate({
        templateName,
        description,
        fields,
        fileUrl: fileUrl,
        fileType: file.mimetype.includes("pdf") ? "pdf" : 
                  file.mimetype.includes("png") ? "png" : 
                  file.mimetype.includes("jpeg") || file.mimetype.includes("jpg") ? "jpg" : "html",
        templateType: templateType,
        fileSize: file.size,
        createdBy: req.user.id,
      });

      await template.save();

      logger.info("Certificate template uploaded successfully", {
        templateId: template.templateId,
        templateName,
        templateType,
        createdBy: req.user.id,
      });

      return res.status(201).json({
        success: true,
        message: "Certificate template uploaded successfully",
        data: {
          templateId: template.templateId,
          templateName: template.templateName,
          templateType: template.templateType,
          fields: template.fields,
          fileUrl: template.fileUrl,
          fileType: template.fileType,
        },
      });
    } catch (error) {
      logger.error("Error uploading certificate template:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to upload certificate template",
        error: error.message,
      });
    }
  }

  /**
   * Get all certificate templates
   * GET /api/v1/certificates/templates
   */
  async getAllTemplates(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const skip = (page - 1) * limit;

      let query = { isActive: true };
      if (search) {
        query.templateName = { $regex: search, $options: "i" };
      }

      const templates = await CertificateTemplate.find(query)
        .populate("createdBy", "full_name email")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await CertificateTemplate.countDocuments(query);

      return res.status(200).json({
        success: true,
        message: "Templates retrieved successfully",
        data: {
          templates,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching certificate templates:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch templates",
        error: error.message,
      });
    }
  }

  /**
   * Get template by ID
   * GET /api/v1/certificates/templates/:id
   */
  async getTemplateById(req, res) {
    try {
      const { id } = req.params;

      const template = await CertificateTemplate.findById(id).populate(
        "createdBy",
        "full_name email"
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Template retrieved successfully",
        data: template,
      });
    } catch (error) {
      logger.error("Error fetching template:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch template",
        error: error.message,
      });
    }
  }

  /**
   * Generate certificate for student
   * POST /api/v1/certificates/generate
   * POST /api/v1/certificates/demo-enrollment
   */
  async generateCertificate(req, res) {
    try {
      // Handle both data structures
      const { 
        // Original structure
        studentId, 
        courseId, 
        instructorId, 
        completionDate, 
        certificateType = 'Demo Certificate',
        issuedDate,
        studentName,
        courseName,
        instructorName,
        enrollmentId,
        certificateId,
        qrCode,
        // Demo enrollment structure
        studentEmail,
        courseTitle,
        courseDuration,
        finalScore
      } = req.body;

      // Determine which data structure we're dealing with
      const isDemoEnrollment = studentEmail && courseTitle && !studentId;

      if (isDemoEnrollment) {
        // Handle demo enrollment data structure
        if (!studentEmail || !courseTitle || !completionDate) {
          return res.status(400).json({
            success: false,
            message: "Student Email, Course Title, and Completion Date are required",
          });
        }

        // For demo enrollment, we'll create a simple certificate
        const processedStudentData = {
          'Name': studentName || 'Student Name',
          'Course Name': courseTitle || 'Course Name',
          'Date of Completion': completionDate ? new Date(completionDate).toLocaleDateString() : new Date().toLocaleDateString(),
          'Issued Date': new Date().toISOString().split('T')[0],
          'Instructor name': 'Instructor Name',
          'QR CODE': `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          'Enrollment id': `MED-${Date.now()}`,
          'Certificate id': `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          'Course Duration': courseDuration || 'N/A',
          'Final Score': finalScore ? `${finalScore}%` : 'N/A',
        };

        // Find demo template
        const template = await CertificateTemplate.findOne({ templateType: 'demo', isActive: true });
        
        if (!template) {
          return res.status(404).json({
            success: false,
            message: "Demo certificate template not found",
          });
        }

        // Generate certificate
        const generatedFileUrl = await this.generateCertificateFile(
          template,
          processedStudentData
        );

        // Create certificate record (without studentId since it's demo)
        const certificate = new GeneratedCertificate({
          studentId: null, // Demo enrollment doesn't have a student ID
          templateId: template._id,
          studentData: processedStudentData,
          generatedFileUrl,
          issuedBy: req.user.id,
          courseId: null, // Demo enrollment doesn't have a course ID
          batchId: null,
        });

        await certificate.save();

        // Update template usage count
        template.usageCount += 1;
        template.lastUsed = new Date();
        await template.save();

        logger.info("Demo certificate generated successfully", {
          certificateId: certificate.certificateId,
          studentEmail,
          courseTitle,
          issuedBy: req.user.id,
        });

        return res.status(201).json({
          success: true,
          message: "Demo certificate generated successfully",
          data: {
            certificateId: certificate.certificateId,
            certificateNumber: certificate.certificateNumber,
            generatedFileUrl: certificate.generatedFileUrl,
            issuedAt: certificate.issuedAt,
          },
        });

      } else {
        // Handle original data structure
        if (!studentId || !courseId || !completionDate) {
          return res.status(400).json({
            success: false,
            message: "Student ID, Course ID, and Completion Date are required",
          });
        }

        // Check if student exists
        const student = await User.findById(studentId);
        if (!student) {
          return res.status(404).json({
            success: false,
            message: "Student not found",
          });
        }

        // Find the appropriate template based on certificate type
        let template;
        if (certificateType === 'Demo Certificate') {
          template = await CertificateTemplate.findOne({ templateType: 'demo', isActive: true });
        } else if (certificateType === 'Blended Certificate') {
          template = await CertificateTemplate.findOne({ templateType: 'blended', isActive: true });
        } else if (certificateType === 'Live Interaction Certificate') {
          template = await CertificateTemplate.findOne({ templateType: 'live-interaction', isActive: true });
        } else {
          template = await CertificateTemplate.findOne({ templateType: 'demo', isActive: true }); // Default
        }

        if (!template) {
          return res.status(404).json({
            success: false,
            message: `Template not found for certificate type: ${certificateType}`,
          });
        }

        // Prepare student data for certificate generation
        const processedStudentData = {
          'Name': studentName || student.full_name || 'Student Name',
          'Course Name': courseName || 'Course Name',
          'Date of Completion': completionDate || new Date().toLocaleDateString(),
          'Issued Date': issuedDate || new Date().toISOString().split('T')[0],
          'Instructor name': instructorName || 'Instructor Name',
          'QR CODE': qrCode || `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          'Enrollment id': enrollmentId || student.student_id || `MED-${Date.now()}`,
          'Certificate id': certificateId || `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };

        // Generate certificate
        const generatedFileUrl = await this.generateCertificateFile(
          template,
          processedStudentData
        );

        // Create certificate record
        const certificate = new GeneratedCertificate({
          studentId,
          templateId: template._id,
          studentData: processedStudentData,
          generatedFileUrl,
          issuedBy: req.user.id,
          courseId,
          batchId: null, // Will be set if needed
        });

        await certificate.save();

        // Update template usage count
        template.usageCount += 1;
        template.lastUsed = new Date();
        await template.save();

        logger.info("Certificate generated successfully", {
          certificateId: certificate.certificateId,
          studentId,
          templateId: template._id,
          issuedBy: req.user.id,
          certificateType,
        });

        return res.status(201).json({
          success: true,
          message: "Certificate generated successfully",
          data: {
            certificateId: certificate.certificateId,
            certificateNumber: certificate.certificateNumber,
            generatedFileUrl: certificate.generatedFileUrl,
            issuedAt: certificate.issuedAt,
          },
        });
      }
    } catch (error) {
      logger.error("Error generating certificate:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate certificate",
        error: error.message,
      });
    }
  }

  /**
   * Get generated certificate by ID
   * GET /api/v1/certificates/:id
   */
  async getCertificateById(req, res) {
    try {
      const { id } = req.params;

      const certificate = await GeneratedCertificate.findById(id)
        .populate("studentId", "full_name email student_id")
        .populate("templateId", "templateName fields")
        .populate("issuedBy", "full_name email")
        .populate("courseId", "title")
        .populate("batchId", "name");

      if (!certificate) {
        return res.status(404).json({
          success: false,
          message: "Certificate not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Certificate retrieved successfully",
        data: certificate,
      });
    } catch (error) {
      logger.error("Error fetching certificate:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch certificate",
        error: error.message,
      });
    }
  }

  /**
   * Get all generated certificates
   * GET /api/v1/certificates
   */
  async getAllCertificates(req, res) {
    try {
      const { page = 1, limit = 10, studentId, status } = req.query;
      const skip = (page - 1) * limit;

      let query = {};
      if (studentId) query.studentId = studentId;
      if (status) query.status = status;

      const certificates = await GeneratedCertificate.find(query)
        .populate("studentId", "full_name email student_id")
        .populate("templateId", "templateName")
        .populate("issuedBy", "full_name email")
        .sort({ issuedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await GeneratedCertificate.countDocuments(query);

      return res.status(200).json({
        success: true,
        message: "Certificates retrieved successfully",
        data: {
          certificates,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching certificates:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch certificates",
        error: error.message,
      });
    }
  }

  /**
   * Download certificate
   * GET /api/v1/certificates/:id/download
   */
  async downloadCertificate(req, res) {
    try {
      const { id } = req.params;

      const certificate = await GeneratedCertificate.findById(id);
      if (!certificate) {
        return res.status(404).json({
          success: false,
          message: "Certificate not found",
        });
      }

      // Try to generate signed URL, fallback to original URL if S3 is not configured
      let downloadUrl;
      try {
        downloadUrl = await generateSignedUrl(certificate.generatedFileUrl, 3600);
      } catch (s3Error) {
        logger.warn("S3 signed URL generation failed, using original URL:", s3Error.message);
        downloadUrl = certificate.generatedFileUrl;
      }

      return res.status(200).json({
        success: true,
        message: "Download URL generated successfully",
        data: {
          downloadUrl: downloadUrl,
          certificateNumber: certificate.certificateNumber,
        },
      });
    } catch (error) {
      logger.error("Error generating download URL:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate download URL",
        error: error.message,
      });
    }
  }

  /**
   * Generate certificate file (PDF or Image)
   * @param {Object} template - Certificate template
   * @param {Object} studentData - Student data for placeholders
   * @returns {string} - Generated file URL
   */
  async generateCertificateFile(template, studentData) {
    try {
      // If template is PNG/JPG, we'll create a PDF with the data for now
      // In a real implementation, you'd use image processing to replace placeholders
      
      if (template.fileType === "png" || template.fileType === "jpg" || template.fileType === "jpeg") {
        // For image templates, create a PDF with the data
        // TODO: Implement image processing to replace placeholders in PNG/JPG templates
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([800, 600]);
        const { width, height } = page.getSize();
        
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 20;
        
        // Add title
        page.drawText("Certificate of Completion", {
          x: width / 2 - 150,
          y: height - 100,
          size: 30,
          font,
          color: rgb(0, 0, 0),
        });

        // Add student data with proper field mapping
        let yPosition = height - 200;
        
        // Map common certificate fields
        const fieldMappings = {
          'Name': studentData.name || studentData.Name || 'Student Name',
          'Course Name': studentData.courseName || studentData['Course Name'] || 'Course',
          'Date of Completion': studentData.dateOfCompletion || studentData['Date of Completion'] || new Date().toLocaleDateString(),
          'Issued Date': studentData.issuedDate || studentData['Issued Date'] || new Date().toLocaleDateString(),
          'Instructor name': studentData.instructorName || studentData['Instructor name'] || 'Instructor',
          'Enrollment id': studentData.enrollmentId || studentData['Enrollment id'] || 'ENR-' + Date.now(),
          'Certificate id': studentData.certificateId || studentData['Certificate id'] || 'CERT-' + Date.now(),
        };

        // Add all student data
        for (const [field, value] of Object.entries(studentData)) {
          const displayValue = fieldMappings[field] || value;
          page.drawText(`${field}: ${displayValue}`, {
            x: 100,
            y: yPosition,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          yPosition -= 40;
        }

        // Add QR Code placeholder
        page.drawText(`QR Code: ${studentData.qrCode || 'QR-' + Date.now()}`, {
          x: 100,
          y: yPosition - 40,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });

        const pdfBytes = await pdfDoc.save();

        // Try to upload to S3, fallback to placeholder URL if S3 is not configured
        try {
          const fileName = `certificates/generated/${Date.now()}-certificate.pdf`;
          const uploadResult = await uploadToS3(
            Buffer.from(pdfBytes),
            fileName,
            "application/pdf"
          );
          return uploadResult.Location;
        } catch (s3Error) {
          logger.warn("S3 upload failed for certificate, using placeholder URL:", s3Error.message);
          // Return a placeholder URL for development/testing
          return `https://placeholder.com/certificates/generated/${Date.now()}-certificate.pdf`;
        }
      } else {
        // For PDF/HTML templates, create a simple PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([800, 600]);
        const { width, height } = page.getSize();
        
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 20;
        
        // Add title
        page.drawText("Certificate of Completion", {
          x: width / 2 - 150,
          y: height - 100,
          size: 30,
          font,
          color: rgb(0, 0, 0),
        });

        // Add student data
        let yPosition = height - 200;
        for (const [field, value] of Object.entries(studentData)) {
          page.drawText(`${field}: ${value}`, {
            x: 100,
            y: yPosition,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          yPosition -= 40;
        }

        // Add certificate number
        page.drawText(`Certificate #: ${Date.now()}`, {
          x: 100,
          y: yPosition - 40,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });

        const pdfBytes = await pdfDoc.save();

        // Try to upload to S3, fallback to placeholder URL if S3 is not configured
        try {
          const fileName = `certificates/generated/${Date.now()}-certificate.pdf`;
          const uploadResult = await uploadToS3(
            Buffer.from(pdfBytes),
            fileName,
            "application/pdf"
          );
          return uploadResult.Location;
        } catch (s3Error) {
          logger.warn("S3 upload failed for certificate, using placeholder URL:", s3Error.message);
          // Return a placeholder URL for development/testing
          return `https://placeholder.com/certificates/generated/${Date.now()}-certificate.pdf`;
        }
      }
    } catch (error) {
      logger.error("Error generating certificate file:", error);
      throw error;
    }
  }

  /**
   * Delete template
   * DELETE /api/v1/certificates/templates/:id
   */
  async deleteTemplate(req, res) {
    try {
      const { id } = req.params;

      const template = await CertificateTemplate.findById(id);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      // Check if template is being used
      const usageCount = await GeneratedCertificate.countDocuments({
        templateId: id,
      });

      if (usageCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete template. It has been used ${usageCount} times.`,
        });
      }

      await CertificateTemplate.findByIdAndDelete(id);

      logger.info("Certificate template deleted", {
        templateId: template.templateId,
        deletedBy: req.user.id,
      });

      return res.status(200).json({
        success: true,
        message: "Template deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting template:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete template",
        error: error.message,
      });
    }
  }

  /**
   * Get certificate statistics
   * GET /api/v1/certificates/stats
   */
  async getCertificateStats(req, res) {
    try {
      const totalTemplates = await CertificateTemplate.countDocuments({
        isActive: true,
      });
      const totalCertificates = await GeneratedCertificate.countDocuments();
      const certificatesThisMonth = await GeneratedCertificate.countDocuments({
        issuedAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      });

      const topTemplates = await CertificateTemplate.aggregate([
        { $match: { isActive: true } },
        { $sort: { usageCount: -1 } },
        { $limit: 5 },
        {
          $project: {
            templateName: 1,
            usageCount: 1,
            templateId: 1,
          },
        },
      ]);

      return res.status(200).json({
        success: true,
        message: "Certificate statistics retrieved successfully",
        data: {
          totalTemplates,
          totalCertificates,
          certificatesThisMonth,
          topTemplates,
        },
      });
    } catch (error) {
      logger.error("Error fetching certificate statistics:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch certificate statistics",
        error: error.message,
      });
    }
  }

  /**
   * Setup certificate folder structure in S3
   * POST /api/v1/certificates/setup
   */
  async setupCertificateStructure(req, res) {
    try {
      // Create folder structure in S3
      await createCertificateFolderStructure();

      // Create default template records
      const defaultTemplates = [
        {
          templateName: "Demo Certificate",
          description: "Certificate for demo session attendance",
          templateType: "demo",
          fields: ["Name", "Course Name", "Date of Completion", "Issued Date", "Instructor name", "QR CODE", "Enrollment id", "Certificate id"],
          fileUrl: `https://${ENV_VARS.AWS_S3_BUCKET_NAME}.s3.${ENV_VARS.AWS_REGION}.amazonaws.com/certificates/templates/demo/demo-certificate.png`,
          fileType: "png",
          isActive: true,
          createdBy: req.user.id,
        },
        {
          templateName: "Blended Certificate",
          description: "Certificate for blended course completion",
          templateType: "blended",
          fields: ["Name", "Course Name", "Date of Completion", "Issued Date", "Instructor name", "QR CODE", "Enrollment id", "Certificate id"],
          fileUrl: `https://${ENV_VARS.AWS_S3_BUCKET_NAME}.s3.${ENV_VARS.AWS_REGION}.amazonaws.com/certificates/templates/blended/blended-certificate.png`,
          fileType: "png",
          isActive: true,
          createdBy: req.user.id,
        },
        {
          templateName: "Live Interaction Certificate",
          description: "Certificate for live interactive sessions",
          templateType: "live-interaction",
          fields: ["Name", "Course Name", "Date of Completion", "Issued Date", "Instructor name", "QR CODE", "Enrollment id", "Certificate id"],
          fileUrl: `https://${ENV_VARS.AWS_S3_BUCKET_NAME}.s3.${ENV_VARS.AWS_REGION}.amazonaws.com/certificates/templates/live-interaction/live-interaction-certificate.png`,
          fileType: "png",
          isActive: true,
          createdBy: req.user.id,
        },
      ];

      for (const templateData of defaultTemplates) {
        const existingTemplate = await CertificateTemplate.findOne({
          templateType: templateData.templateType,
        });

        if (!existingTemplate) {
          const template = new CertificateTemplate(templateData);
          await template.save();
          logger.info(`Created default template: ${templateData.templateName}`);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Certificate structure setup completed successfully",
        data: {
          foldersCreated: true,
          templatesCreated: defaultTemplates.length,
        },
      });
    } catch (error) {
      logger.error("Error setting up certificate structure:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to setup certificate structure",
        error: error.message,
      });
    }
  }
}

export default new CertificateController();
