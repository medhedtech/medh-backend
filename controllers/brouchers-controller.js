import nodemailer from "nodemailer";

import Broucher from "../models/broucker-model.js";
import Course from "../models/course-model.js";
import { validateObjectId } from "../utils/validation-helpers.js";

// Nodemailer Transporter Setup with AWS SES
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "email-smtp.us-east-1.amazonaws.com",
  port: process.env.EMAIL_PORT || 465,
  secure: process.env.EMAIL_SECURE === "true" || true, // true for 465, false for other ports like 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Add error handling for transporter
transporter.verify(function (error, success) {
  if (error) {
    console.error("Email configuration error:", error);
    // Log more details about the error
    if (error.code === "EAUTH") {
      console.error("Authentication failed. Please check your credentials.");
      console.error("If using Gmail, make sure to:");
      console.error("1. Enable 2-Step Verification in your Google Account");
      console.error("2. Generate an App Password from Google Account settings");
      console.error("3. Use the App Password instead of your regular password");
    } else if (error.code === "EDNS") {
      console.error(
        "DNS lookup failed. Please check your internet connection and SMTP server settings.",
      );
    }
  } else {
    console.log("Email server is ready to send messages");
  }
});

// Helper function to send emails with better error handling
const sendEmail = async (mailOptions) => {
  try {
    // Ensure from address is set correctly
    if (!mailOptions.from) {
      mailOptions.from = process.env.EMAIL_FROM || "noreply@medh.co";
    }

    const info = await transporter.sendMail(mailOptions);
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

    // Fetch course details by course_title
    const course = await Course.findOne({ course_title }).populate(
      "course_videos",
      "brouchers",
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found!",
      });
    }

    // Validate brochures for the course
    if (!course.brochures || course.brochures.length === 0) {
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
      selected_brochure: course.brochures[0],
    });

    await newBroucher.save();

    const attachments = course.brochures.map((b) => {
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
      text: `Hello ${full_name},\n\nThank you for your interest in our course "${course_title}". Please find the brochure attached.\n\nCourse Details:\nTitle: ${course.course_title}\nCategory: ${course.course_category}\nDuration: ${course.course_duration}\nFee: $${course.course_fee}\n\nBest regards,\nTeam Medh`,
      attachments: attachments,
    };

    // Send the email with the brochure
    await sendEmail(mailOptions);

    res.status(201).json({
      success: true,
      message: "Brochure created and email sent successfully",
      data: newBroucher,
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

    // If course title provided, verify course exists
    let courseData = {};
    if (course_title) {
      const course = await Course.findOne({ course_title });
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found!",
        });
      }

      courseData = {
        course: course._id,
        course_title,
        selected_brochure:
          course.brochures && course.brochures.length > 0
            ? course.brochures[0]
            : null,
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

    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found. Please select a valid course",
      });
    }

    // Check if course has brochures
    if (!course.brochures || course.brochures.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No brochures available for the course "${course.course_title}". Please contact support.`,
      });
    }

    // For GET requests, directly download the file
    if (req.method === "GET") {
      // Get the first brochure URL
      const brochureUrl = course.brochures[0];

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

    // Get the first brochure URL (assuming it's the main brochure)
    const brochureUrl = course.brochures[0];

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
            <li><strong>Duration:</strong> ${course.course_duration || "Not specified"}</li>
            <li><strong>Fee:</strong> ${course.course_fee || "Not specified"}</li>
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

export {
  createBrouchers,
  getAllBrouchers,
  getBroucherById,
  updateBroucher,
  deleteBroucher,
  downloadBrochure,
  getBroucherAnalytics,
};
