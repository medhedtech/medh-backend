import emailService from "../services/emailService.js";

import Broucher from "../models/broucker-model.js";
import Course from "../models/course-model.js";
import {
  BlendedCourse,
  LiveCourse,
  FreeCourse,
} from "../models/course-types/index.js";
import { validateObjectId } from "../utils/validation-helpers.js";
import {
  uploadBase64FileOptimized,
  uploadBase64FileChunked,
  UploadError,
} from "../utils/uploadFile.js";
import { getBucketForMimeType } from "../utils/s3BucketManager.js";
import { ENV_VARS } from "../config/envVars.js";

// Nodemailer Transporter Setup with AWS SES
// Email service is imported and ready to use

// Email service handles verification automatically

/**
 * Helper function to search for a course across all course types
 * @param {string} searchTerm - Course title to search for
 * @param {string} searchField - Field to search by (default: 'course_title')
 * @returns {Object|null} - Found course with source information
 */
const findCourseAcrossTypes = async (
  searchTerm,
  searchField = "course_title",
) => {
  if (!searchTerm) return null;

  // Create search filter
  const searchFilter = { [searchField]: searchTerm };

  try {
    // Search in new course type models first
    const [blendedCourse, liveCourse, freeCourse] = await Promise.all([
      BlendedCourse.findOne(searchFilter).lean(),
      LiveCourse.findOne(searchFilter).lean(),
      FreeCourse.findOne(searchFilter).lean(),
    ]);

    // Check which new model returned a course
    if (blendedCourse) {
      return {
        ...blendedCourse,
        course_type: "blended",
        _source: "new_model",
        _model: "BlendedCourse",
      };
    }

    if (liveCourse) {
      return {
        ...liveCourse,
        course_type: "live",
        _source: "new_model",
        _model: "LiveCourse",
      };
    }

    if (freeCourse) {
      return {
        ...freeCourse,
        course_type: "free",
        _source: "new_model",
        _model: "FreeCourse",
      };
    }

    // Fall back to legacy Course model
    const legacyCourse = await Course.findOne(searchFilter).lean();
    if (legacyCourse) {
      return {
        ...legacyCourse,
        course_type: determineCourseTypeFromLegacy(legacyCourse),
        _source: "legacy_model",
        _model: "Course",
      };
    }

    return null;
  } catch (error) {
    console.error("Error searching across course types:", error);
    throw new Error("Failed to search for course");
  }
};

/**
 * Helper function to find a course by ID across all course types
 * @param {string} courseId - Course ID to search for
 * @returns {Object|null} - Found course with source information
 */
const findCourseByIdAcrossTypes = async (courseId) => {
  if (!validateObjectId(courseId)) return null;

  try {
    // Search in new course type models first
    const [blendedCourse, liveCourse, freeCourse] = await Promise.all([
      BlendedCourse.findById(courseId).lean(),
      LiveCourse.findById(courseId).lean(),
      FreeCourse.findById(courseId).lean(),
    ]);

    // Check which new model returned a course
    if (blendedCourse) {
      return {
        ...blendedCourse,
        course_type: "blended",
        _source: "new_model",
        _model: "BlendedCourse",
      };
    }

    if (liveCourse) {
      return {
        ...liveCourse,
        course_type: "live",
        _source: "new_model",
        _model: "LiveCourse",
      };
    }

    if (freeCourse) {
      return {
        ...freeCourse,
        course_type: "free",
        _source: "new_model",
        _model: "FreeCourse",
      };
    }

    // Fall back to legacy Course model
    const legacyCourse = await Course.findById(courseId).lean();
    if (legacyCourse) {
      return {
        ...legacyCourse,
        course_type: determineCourseTypeFromLegacy(legacyCourse),
        _source: "legacy_model",
        _model: "Course",
      };
    }

    return null;
  } catch (error) {
    console.error("Error searching course by ID across types:", error);
    throw new Error("Failed to find course by ID");
  }
};

/**
 * Helper function to determine course type from legacy course data
 * @param {Object} course - Legacy course object
 * @returns {string} - Determined course type
 */
const determineCourseTypeFromLegacy = (course) => {
  if (!course) return "free";

  const classType = (course.class_type || "").toLowerCase();
  const categoryType = (course.category_type || "").toLowerCase();

  // Determine type based on various indicators
  if (classType.includes("live") || categoryType.includes("live")) {
    return "live";
  }

  if (classType.includes("blend") || categoryType.includes("blend")) {
    return "blended";
  }

  if (
    course.isFree ||
    classType.includes("self") ||
    classType.includes("record")
  ) {
    return "free";
  }

  return "free"; // Default fallback
};

/**
 * Helper function to get brochures from a course object
 * @param {Object} course - Course object from any model
 * @returns {Array} - Array of brochure URLs
 */
const getBrochuresFromCourse = (course) => {
  if (!course) return [];

  // New course types use 'brochures' field
  if (course.brochures && Array.isArray(course.brochures)) {
    return course.brochures;
  }

  // Legacy courses might use 'brochures' field as well
  // Some legacy courses might have it in different format
  return [];
};

// Helper function to send emails with better error handling
const sendEmail = async (mailOptions) => {
  try {
    // Ensure from address is set correctly
    if (!mailOptions.from) {
      mailOptions.from = process.env.EMAIL_FROM || "noreply@medh.co";
    }

    const info = await emailService.sendEmail(mailOptions, {
      priority: "normal",
    });
    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);

    // Handle specific email errors
    if (error.code === "EAUTH") {
      throw new Error(
        "Email authentication failed. Please check your email credentials.",
      );
    } else if (error.code === "ESOCKET") {
      throw new Error(
        "Email connection failed. Please check your internet connection.",
      );
    } else {
      throw new Error("Failed to send email. Please try again later.");
    }
  }
};

/**
 * @desc    Create a new brochure record and send via email
 * @route   POST /api/v1/broucher/create
 * @access  Public
 */
const createBrouchers = async (req, res) => {
  try {
    const { full_name, email, phone_number, course_title } = req.body;

    // Validate required fields
    if (!full_name || !email || !phone_number || !course_title) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required information",
      });
    }

    // Validate phone number with country code
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(phone_number.replace(/[-\s]/g, ""))) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid phone number with country code (e.g., +12345678901)",
      });
    }

    // Fetch course details by course_title from all course types
    const course = await findCourseAcrossTypes(course_title);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found!",
      });
    }

    // Get brochures from the course
    const brochures = getBrochuresFromCourse(course);

    // Validate brochures for the course
    if (!brochures || brochures.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No brochures available for the course "${course_title}"`,
      });
    }

    // Create new brochure record in the database
    const newBroucher = new Broucher({
      full_name,
      email,
      phone_number,
      course: course._id,
      course_title,
      selected_brochure: brochures[0],
    });

    await newBroucher.save();

    const attachments = brochures.map((b) => {
      return {
        filename: `${course_title}-brochure.pdf`,
        path: b,
      };
    });

    // Email options with the brochure as an attachment
    const mailOptions = {
      from: process.env.EMAIL_FROM || "noreply@medh.co",
      to: email,
      subject: `Brochure for ${course_title}`,
      text: `Hello ${full_name},\n\nThank you for your interest in our course "${course_title}". Please find the brochure attached.\n\nCourse Details:\nTitle: ${course.course_title}\nCategory: ${course.course_category}\nType: ${course.course_type || "Standard"}\nDuration: ${course.course_duration || course.estimated_duration || "Not specified"}\nFee: ${course.course_fee ? "$" + course.course_fee : course.prices && course.prices.length > 0 ? "Multiple pricing options available" : "Contact for pricing"}\nSource: ${course._source || "legacy"}\n\nBest regards,\nTeam Medh`,
      attachments: attachments,
    };

    // Send the email with the brochure
    await sendEmail(mailOptions);

    res.status(201).json({
      success: true,
      message: "Brochure created and email sent successfully",
      data: {
        ...newBroucher.toObject(),
        course_type: course.course_type,
        course_source: course._source,
        course_model: course._model,
      },
    });
  } catch (error) {
    console.error("Error in createBroucher:", error);
    res.status(500).json({
      success: false,
      message: "Error creating brochure",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all brochures
 * @route   GET /api/v1/broucher
 * @access  Private/Admin
 */
const getAllBrouchers = async (req, res) => {
  try {
    // Add pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Add filtering options similar to course controller
    const filter = {};
    const { email, course_title, date_from, date_to } = req.query;

    if (email) {
      filter.email = { $regex: email, $options: "i" };
    }

    if (course_title) {
      filter.course_title = { $regex: course_title, $options: "i" };
    }

    if (date_from || date_to) {
      filter.createdAt = {};
      if (date_from) {
        filter.createdAt.$gte = new Date(date_from);
      }
      if (date_to) {
        filter.createdAt.$lte = new Date(date_to);
      }
    }

    const brouchers = await Broucher.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalBrouchers = await Broucher.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Brochures fetched successfully",
      data: {
        brouchers,
        totalBrouchers,
        totalPages: Math.ceil(totalBrouchers / limit),
        currentPage: page,
      },
    });
  } catch (error) {
    console.error("Error fetching brochures:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching brochures",
      error: error.message,
    });
  }
};

/**
 * @desc    Get brochure by ID
 * @route   GET /api/v1/broucher/:id
 * @access  Private/Admin
 */
const getBroucherById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brochure ID format",
      });
    }

    const broucher = await Broucher.findById(id);

    if (!broucher) {
      return res.status(404).json({
        success: false,
        message: "Brochure not found",
      });
    }

    res.status(200).json({
      success: true,
      data: broucher,
    });
  } catch (error) {
    console.error("Error fetching brochure:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching brochure",
      error: error.message,
    });
  }
};

/**
 * @desc    Update brochure by ID
 * @route   PUT /api/v1/broucher/:id
 * @access  Private/Admin
 */
const updateBroucher = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brochure ID format",
      });
    }

    const { full_name, email, phone_number, course_title } = req.body;

    // Validate required fields
    if (!full_name || !email || !phone_number) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required information",
      });
    }

    // Validate phone number with country code
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(phone_number.replace(/[-\s]/g, ""))) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid phone number with country code (e.g., +12345678901)",
      });
    }

    // If course title provided, verify course exists
    let courseData = {};
    if (course_title) {
      const course = await findCourseAcrossTypes(course_title);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found!",
        });
      }

      const brochures = getBrochuresFromCourse(course);
      courseData = {
        course: course._id,
        course_title,
        selected_brochure:
          brochures && brochures.length > 0 ? brochures[0] : null,
      };
    }

    const updatedBroucher = await Broucher.findByIdAndUpdate(
      id,
      {
        full_name,
        email,
        phone_number,
        ...courseData,
      },
      { new: true, runValidators: true },
    );

    if (!updatedBroucher) {
      return res.status(404).json({
        success: false,
        message: "Brochure not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Brochure updated successfully",
      data: updatedBroucher,
    });
  } catch (error) {
    console.error("Error updating brochure:", error);
    res.status(500).json({
      success: false,
      message: "Error updating brochure",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete brochure by ID
 * @route   DELETE /api/v1/broucher/:id
 * @access  Private/Admin
 */
const deleteBroucher = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brochure ID format",
      });
    }

    const deletedBroucher = await Broucher.findByIdAndDelete(id);
    if (!deletedBroucher) {
      return res.status(404).json({
        success: false,
        message: "Brochure not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Brochure deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting brochure:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting brochure",
      error: error.message,
    });
  }
};

/**
 * @desc    Download brochure for a specific course
 * @route   POST /api/v1/broucher/download/:courseId
 * @route   GET /api/v1/broucher/download/:courseId
 * @access  Public
 */
const downloadBrochure = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Validate courseId format
    if (!validateObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid course",
      });
    }

    // Find the course across all course types
    const course = await findCourseByIdAcrossTypes(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found. Please select a valid course",
      });
    }

    // Get brochures from the course
    const brochures = getBrochuresFromCourse(course);

    // Check if course has brochures
    if (!brochures || brochures.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No brochures available for the course "${course.course_title}". Please contact support.`,
      });
    }

    // For GET requests, directly download the file
    if (req.method === "GET") {
      // Get the first brochure URL
      const brochureUrl = brochures[0];

      // Set headers for file download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${course.course_title}-brochure.pdf"`,
      );

      // Redirect to the S3 URL for direct download
      return res.redirect(brochureUrl);
    }

    // For POST requests, continue with full functionality including email
    // Validate required fields
    const { full_name, email, phone_number } = req.body;
    if (!full_name || !email || !phone_number) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide all required information (name, email, and phone number)",
      });
    }

    // Validate phone number with country code
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(phone_number.replace(/[-\s]/g, ""))) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid phone number with country code (e.g., +12345678901)",
      });
    }

    // Get the first brochure URL (assuming it's the main brochure)
    const brochureUrl = brochures[0];

    // Create a record of the brochure download
    const broucherRecord = new Broucher({
      full_name,
      email,
      phone_number,
      course: courseId,
      course_title: course.course_title,
      selected_brochure: brochureUrl,
    });

    await broucherRecord.save();

    // Create HTML email content with download link instead of attachment
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Thank You for Your Interest!</h2>
        <p>Hello <strong>${full_name}</strong>,</p>
        <p>Thank you for your interest in our course <strong>"${course.course_title}"</strong>.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #444;">Course Details:</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li><strong>Title:</strong> ${course.course_title}</li>
            <li><strong>Category:</strong> ${course.course_category || "Not specified"}</li>
            <li><strong>Type:</strong> ${course.course_type || "Standard"}</li>
            <li><strong>Duration:</strong> ${course.course_duration || course.estimated_duration || "Not specified"}</li>
            <li><strong>Fee:</strong> ${course.course_fee ? "$" + course.course_fee : course.prices && course.prices.length > 0 ? "Multiple pricing options available" : "Contact for pricing"}</li>
          </ul>
        </div>
        
        <p>Click the button below to download your course brochure:</p>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${brochureUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Download Brochure</a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all;"><a href="${brochureUrl}">${brochureUrl}</a></p>
        
        <p>If you have any questions about this course or would like to enroll, please don't hesitate to contact us.</p>
        <p>Best regards,<br>Team Medh</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || "noreply@medh.co",
      to: email,
      subject: `Brochure for ${course.course_title}`,
      html: htmlContent,
      // No attachments - using a download link instead
    };

    // Send the email with the brochure link using the helper function
    try {
      await sendEmail(mailOptions);
      console.log("Brochure email sent successfully to:", email);
    } catch (emailError) {
      console.error("Error sending brochure email:", emailError);
      // Continue with the response even if email fails
    }

    // Return success response with download URL
    res.status(200).json({
      success: true,
      message: "Brochure download initiated successfully",
      data: {
        brochureUrl,
        course_title: course.course_title,
        course_type: course.course_type,
        course_source: course._source,
        course_model: course._model,
        recordId: broucherRecord._id,
      },
    });
  } catch (error) {
    console.error("Error downloading brochure:", error);
    res.status(500).json({
      success: false,
      message: "Error processing your request. Please try again.",
      error: error.message,
    });
  }
};

/**
 * @desc    Get brochure download analytics
 * @route   GET /api/v1/broucher/analytics
 * @access  Private/Admin
 */
const getBroucherAnalytics = async (req, res) => {
  try {
    // Get counts by course
    const courseAnalytics = await Broucher.aggregate([
      {
        $group: {
          _id: "$course_title",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get total count
    const totalDownloads = await Broucher.countDocuments();

    // Get counts by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyDownloads = await Broucher.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalDownloads,
        courseAnalytics,
        dailyDownloads,
      },
    });
  } catch (error) {
    console.error("Error getting brochure analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching brochure analytics",
      error: error.message,
    });
  }
};

/**
 * @desc    Upload brochure file with real filename
 * @route   POST /api/v1/broucher/upload
 * @access  Private
 */
const uploadBrochure = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No brochure file uploaded",
      });
    }

    // Validate file type (only PDFs for brochures)
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({
        success: false,
        message: "Only PDF files are allowed for brochures",
      });
    }

    // Validate file size (max 50MB for brochures)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: "Brochure file size must be less than 50MB",
      });
    }

    // Generate key with original filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const originalFilename = req.file.originalname;

    // Clean the original filename (remove special characters, spaces, etc.)
    const cleanFilename = originalFilename
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_|_$/g, "");

    // Ensure the filename has the correct extension
    const filenameWithoutExt = cleanFilename.replace(/\.[^/.]+$/, "");
    const key = `brochures/${timestamp}-${randomStr}-${filenameWithoutExt}.pdf`;

    // Determine the appropriate bucket (documents bucket for PDFs)
    const bucketName = getBucketForMimeType("application/pdf");

    const uploadParams = {
      key,
      file: req.file.buffer,
      contentType: req.file.mimetype,
      fileSize: req.file.size,
      originalFilename: originalFilename,
    };

    // Use the uploadFile function from utils
    const { uploadFile } = await import("../utils/uploadFile.js");
    const result = await uploadFile(uploadParams);

    res.status(200).json({
      success: true,
      message: "Brochure uploaded successfully with real filename",
      data: {
        ...result.data,
        brochureType: "PDF",
        uploadMethod: "file",
      },
    });
  } catch (error) {
    console.error("Error uploading brochure:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading brochure",
      error: error.message,
    });
  }
};

/**
 * @desc    Upload brochure via base64 with real filename
 * @route   POST /api/v1/broucher/upload/base64
 * @access  Private
 */
const uploadBrochureBase64 = async (req, res) => {
  try {
    const { base64String, originalFilename, fileName } = req.body;

    // Validate required fields
    if (!base64String) {
      return res.status(400).json({
        success: false,
        message: "Base64 string is required",
      });
    }

    // Support both 'originalFilename' and 'fileName' field names
    const finalOriginalFilename = originalFilename || fileName;

    // Validate file type (only PDFs for brochures)
    const mimeType = "application/pdf";

    // Parse base64 data
    let base64Data;
    if (base64String.startsWith("data:application/pdf;base64,")) {
      base64Data = base64String.replace("data:application/pdf;base64,", "");
    } else if (base64String.startsWith("data:")) {
      return res.status(400).json({
        success: false,
        message: "Only PDF files are allowed for brochures",
      });
    } else {
      // Assume it's raw base64 PDF data
      base64Data = base64String;
    }

    // Quick size estimation (base64 is ~33% larger than binary)
    const estimatedSize = (base64Data.length * 3) / 4;
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (estimatedSize > maxSize) {
      return res.status(400).json({
        success: false,
        message: "Brochure file size must be less than 50MB",
      });
    }

    // Choose processing method based on file size
    const folder = "brochures";
    const CHUNKED_THRESHOLD = 25 * 1024 * 1024; // 25MB threshold for chunked processing

    let result;
    if (estimatedSize > CHUNKED_THRESHOLD) {
      // Use chunked processing for large files
      result = await uploadBase64FileChunked(
        base64Data,
        mimeType,
        folder,
        finalOriginalFilename,
      );
    } else {
      // Use optimized processing for smaller files
      result = await uploadBase64FileOptimized(
        base64Data,
        mimeType,
        folder,
        finalOriginalFilename,
      );
    }

    res.status(200).json({
      success: true,
      message: "Brochure uploaded successfully with real filename",
      data: {
        ...result.data,
        brochureType: "PDF",
        uploadMethod: "base64",
      },
    });
  } catch (error) {
    console.error("Error uploading brochure via base64:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading brochure",
      error: error.message,
    });
  }
};

export {
  createBrouchers,
  getAllBrouchers,
  getBroucherById,
  updateBroucher,
  deleteBroucher,
  downloadBrochure,
  getBroucherAnalytics,
  uploadBrochure,
  uploadBrochureBase64,
};
