import { validationResult } from "express-validator";
import UniversalForm from "../models/universal-form.model.js";
import User from "../models/user-modal.js"; // Import User model
import { LiveCourse } from "../models/course-types/index.js"; // Import LiveCourse model
import emailService from "../services/emailService.js";
import logger from "../utils/logger.js";
import catchAsync from "../utils/catchAsync.js";
import { AppError } from "../utils/errorHandler.js";
import passwordSecurity from "../utils/passwordSecurity.js";

/**
 * @desc    Submit a new form
 * @route   POST /api/v1/forms/submit
 * @access  Public
 */
export const submitForm = catchAsync(async (req, res, next) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  // Extract IP and device information
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent");

  // Parse device info from user agent (basic parsing)
  const deviceInfo = parseUserAgent(userAgent);

  // Extract UTM parameters
  const utmParams = extractUtmParams(req.query);

  // Create form data
  const formData = {
    ...req.body,
    ip_address: ipAddress,
    user_agent: userAgent,
    device_info: deviceInfo,
    ...utmParams,
    source: req.body.source || "website",
    submitted_at: new Date(),
  };

  // If user is authenticated, add user_id
  if (req.user) {
    formData.user_id = req.user._id;
  }

  // Create the form
  const form = new UniversalForm(formData);
  await form.save();

  // Handle post-submission actions based on form_type
  if (form.form_type === "book_a_free_demo_session") {
    let userEmail = "";
    let userName = "";
    let temporaryPassword = "";
    let createdUser = null;

    if (form.is_student_under_16) {
      userEmail = form.parent_details.email;
      userName = form.parent_details.name;
    } else {
      userEmail = form.student_details.email;
      userName = form.student_details.name;
    }

    try {
      createdUser = await createTemporaryUser({
        email: userEmail,
        full_name: userName,
        role: form.is_student_under_16
          ? "parent_demo_user"
          : "student_demo_user",
      });
      temporaryPassword = createdUser.temporaryPassword;
      // Optionally update form with created user ID
      form.user_id = createdUser.user._id;
      await form.save(); // Save again to link user_id
    } catch (userCreateError) {
      logger.error(
        "Failed to create temporary user for demo session:",
        userCreateError,
      );
      // Don't fail the request if user creation fails, but log it.
    }

    // Send demo confirmation email
    try {
      await sendDemoConfirmationEmail(
        form,
        temporaryPassword,
        createdUser ? createdUser.user.email : userEmail,
        createdUser ? createdUser.user.full_name : userName,
      );
    } catch (emailError) {
      logger.error("Failed to send demo confirmation email:", emailError);
    }

    // Send WhatsApp confirmation (placeholder)
    try {
      await sendWhatsAppConfirmation(form, temporaryPassword);
    } catch (waError) {
      logger.error("Failed to send WhatsApp confirmation:", waError);
    }

    // Integrate with CRM (placeholder)
    try {
      await integrateWithCRM(form);
    } catch (crmError) {
      logger.error("Failed to integrate with CRM:", crmError);
    }

    // Create calendar invite (placeholder)
    try {
      await createCalendarInvite(form);
    } catch (calendarError) {
      logger.error("Failed to create calendar invite:", calendarError);
    }

    // Send notification email to admin about new demo booking
    try {
      await sendFormNotificationEmail(form);
    } catch (emailError) {
      logger.error("Failed to send notification email to admin:", emailError);
    }

    logger.info(`Demo Session Form submitted: ${form.form_id}`, {
      formId: form._id,
      email: userEmail,
      isStudentUnder16: form.is_student_under_16,
    });
  } else {
    // Original logic for other form types
    // Send confirmation email to user
    try {
      await sendFormConfirmationEmail(form);
    } catch (emailError) {
      logger.error("Failed to send confirmation email:", emailError);
    }

    // Send notification email to admin
    try {
      await sendFormNotificationEmail(form);
    } catch (emailError) {
      logger.error("Failed to send notification email:", emailError);
    }

    logger.info(`Form submitted: ${form.form_type} - ${form.form_id}`, {
      formId: form._id,
      formType: form.form_type,
      email: form.contact_info.email,
    });
  }

  res.status(201).json({
    success: true,
    message: "Form submitted successfully",
    data: {
      form_id: form.form_id,
      status: form.status,
      submitted_at: form.submitted_at,
    },
  });
});

/**
 * @desc    Get all forms with filtering and pagination
 * @route   GET /api/v1/forms
 * @access  Private (Admin)
 */
export const getAllForms = catchAsync(async (req, res, next) => {
  const {
    form_type,
    status,
    priority,
    page = 1,
    limit = 20,
    sort = "-submitted_at",
    search,
    assigned_to,
    date_from,
    date_to,
  } = req.query;

  // Build filter query
  const filter = { is_deleted: false };

  if (form_type) filter.form_type = form_type;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assigned_to) filter.assigned_to = assigned_to;

  // Date range filter
  if (date_from || date_to) {
    filter.submitted_at = {};
    if (date_from) filter.submitted_at.$gte = new Date(date_from);
    if (date_to) filter.submitted_at.$lte = new Date(date_to);
  }

  // Search functionality
  if (search) {
    filter.$or = [
      { "contact_info.full_name": { $regex: search, $options: "i" } },
      { "contact_info.email": { $regex: search, $options: "i" } },
      { "professional_info.company_name": { $regex: search, $options: "i" } },
      { message: { $regex: search, $options: "i" } },
      { form_id: { $regex: search, $options: "i" } },
    ];
  }

  // Pagination
  const skip = (page - 1) * limit;
  const totalCount = await UniversalForm.countDocuments(filter);

  // Execute query
  const forms = await UniversalForm.find(filter)
    .populate("user_id", "full_name email role")
    .populate("assigned_to", "full_name email")
    .populate("handled_by", "full_name email")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.status(200).json({
    success: true,
    data: forms,
    pagination: {
      current_page: parseInt(page),
      total_pages: totalPages,
      total_count: totalCount,
      has_next_page: hasNextPage,
      has_prev_page: hasPrevPage,
      limit: parseInt(limit),
    },
  });
});

/**
 * @desc    Get form by ID
 * @route   GET /api/v1/forms/:id
 * @access  Private (Admin) or Public (if form belongs to user)
 */
export const getFormById = catchAsync(async (req, res, next) => {
  const form = await UniversalForm.findById(req.params.id)
    .populate("user_id", "full_name email role")
    .populate("assigned_to", "full_name email")
    .populate("handled_by", "full_name email")
    .populate("internal_notes.added_by", "full_name email");

  if (!form || form.is_deleted) {
    return next(new AppError("Form not found", 404));
  }

  // Check permissions
  if (
    !req.user.role.includes("admin") &&
    (!form.user_id || form.user_id._id.toString() !== req.user._id.toString())
  ) {
    return next(new AppError("Access denied", 403));
  }

  res.status(200).json({
    success: true,
    data: form,
  });
});

/**
 * @desc    Get form by form_id (public identifier)
 * @route   GET /api/v1/forms/lookup/:formId
 * @access  Public
 */
export const getFormByFormId = catchAsync(async (req, res, next) => {
  const form = await UniversalForm.findOne({
    form_id: req.params.formId,
    is_deleted: false,
  }).select(
    "form_id form_type status submitted_at processed_at contact_info.full_name",
  );

  if (!form) {
    return next(new AppError("Form not found", 404));
  }

  res.status(200).json({
    success: true,
    data: form,
  });
});

/**
 * @desc    Update form status and details
 * @route   PUT /api/v1/forms/:id
 * @access  Private (Admin)
 */
export const updateForm = catchAsync(async (req, res, next) => {
  const {
    status,
    priority,
    assigned_to,
    internal_note,
    follow_up_required,
    follow_up_date,
  } = req.body;

  const form = await UniversalForm.findById(req.params.id);
  if (!form || form.is_deleted) {
    return next(new AppError("Form not found", 404));
  }

  // Update fields
  if (status) form.status = status;
  if (priority) form.priority = priority;
  if (assigned_to) form.assigned_to = assigned_to;
  if (follow_up_required !== undefined)
    form.follow_up_required = follow_up_required;
  if (follow_up_date) form.follow_up_date = follow_up_date;

  // Set handled_by to current user
  form.handled_by = req.user._id;

  // Add internal note if provided
  if (internal_note) {
    form.internal_notes.push({
      note: internal_note,
      added_by: req.user._id,
      added_at: new Date(),
    });
  }

  await form.save();

  // Populate for response
  await form.populate([
    { path: "assigned_to", select: "full_name email" },
    { path: "handled_by", select: "full_name email" },
  ]);

  // Send notification email if status changed to important states
  if (status && ["approved", "rejected", "completed"].includes(status)) {
    try {
      await sendStatusUpdateEmail(form);
    } catch (emailError) {
      logger.error("Failed to send status update email:", emailError);
    }
  }

  res.status(200).json({
    success: true,
    message: "Form updated successfully",
    data: form,
  });
});

/**
 * @desc    Assign form to user
 * @route   PUT /api/v1/forms/:id/assign
 * @access  Private (Admin)
 */
export const assignForm = catchAsync(async (req, res, next) => {
  const { assigned_to } = req.body;

  const form = await UniversalForm.findById(req.params.id);
  if (!form || form.is_deleted) {
    return next(new AppError("Form not found", 404));
  }

  await form.assignTo(assigned_to);
  await form.populate("assigned_to", "full_name email");

  res.status(200).json({
    success: true,
    message: "Form assigned successfully",
    data: {
      form_id: form.form_id,
      assigned_to: form.assigned_to,
      status: form.status,
    },
  });
});

/**
 * @desc    Add internal note to form
 * @route   POST /api/v1/forms/:id/notes
 * @access  Private (Admin)
 */
export const addInternalNote = catchAsync(async (req, res, next) => {
  const { note } = req.body;

  const form = await UniversalForm.findById(req.params.id);
  if (!form || form.is_deleted) {
    return next(new AppError("Form not found", 404));
  }

  await form.addInternalNote(note, req.user._id);

  res.status(200).json({
    success: true,
    message: "Internal note added successfully",
  });
});

/**
 * @desc    Delete form (soft delete)
 * @route   DELETE /api/v1/forms/:id
 * @access  Private (Admin)
 */
export const deleteForm = catchAsync(async (req, res, next) => {
  const form = await UniversalForm.findById(req.params.id);
  if (!form || form.is_deleted) {
    return next(new AppError("Form not found", 404));
  }

  form.is_deleted = true;
  form.deleted_at = new Date();
  form.deleted_by = req.user._id;
  await form.save();

  res.status(200).json({
    success: true,
    message: "Form deleted successfully",
  });
});

/**
 * @desc    Get forms by type
 * @route   GET /api/v1/forms/type/:formType
 * @access  Private (Admin)
 */
export const getFormsByType = catchAsync(async (req, res, next) => {
  const { formType } = req.params;
  const { page = 1, limit = 20, status, priority } = req.query;

  const filter = { form_type: formType, is_deleted: false };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const skip = (page - 1) * limit;
  const totalCount = await UniversalForm.countDocuments(filter);

  const forms = await UniversalForm.findByFormType(formType, {
    skip,
    limit: parseInt(limit),
    sort: { submitted_at: -1 },
  }).populate("assigned_to", "full_name email");

  res.status(200).json({
    success: true,
    data: forms,
    pagination: {
      current_page: parseInt(page),
      total_count: totalCount,
      total_pages: Math.ceil(totalCount / limit),
    },
  });
});

/**
 * @desc    Get pending forms
 * @route   GET /api/v1/forms/pending
 * @access  Private (Admin)
 */
export const getPendingForms = catchAsync(async (req, res, next) => {
  const { form_type } = req.query;

  const forms = await UniversalForm.findPending(form_type)
    .populate("assigned_to", "full_name email")
    .limit(50);

  res.status(200).json({
    success: true,
    data: forms,
    count: forms.length,
  });
});

/**
 * @desc    Get form analytics and statistics
 * @route   GET /api/v1/forms/analytics
 * @access  Private (Admin)
 */
export const getFormAnalytics = catchAsync(async (req, res, next) => {
  const { form_type, date_from, date_to } = req.query;

  // Build date filter
  const dateFilter = {};
  if (date_from || date_to) {
    dateFilter.submitted_at = {};
    if (date_from) dateFilter.submitted_at.$gte = new Date(date_from);
    if (date_to) dateFilter.submitted_at.$lte = new Date(date_to);
  }

  // Get basic stats
  const stats = await UniversalForm.getFormStats(form_type);

  // Get submission trends (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const trendData = await UniversalForm.aggregate([
    {
      $match: {
        submitted_at: { $gte: thirtyDaysAgo },
        is_deleted: false,
        ...(form_type && { form_type }),
      },
    },
    {
      $group: {
        _id: {
          date: {
            $dateToString: { format: "%Y-%m-%d", date: "$submitted_at" },
          },
          form_type: "$form_type",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1 } },
  ]);

  // Get top form types
  const topFormTypes = await UniversalForm.aggregate([
    {
      $match: {
        is_deleted: false,
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: "$form_type",
        count: { $sum: 1 },
        pending: {
          $sum: {
            $cond: [
              {
                $in: ["$status", ["submitted", "under_review", "in_progress"]],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Get average processing time by form type
  const processingTimes = await UniversalForm.aggregate([
    {
      $match: {
        processed_at: { $exists: true },
        submitted_at: { $exists: true },
        is_deleted: false,
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: "$form_type",
        avgProcessingHours: {
          $avg: {
            $divide: [
              { $subtract: ["$processed_at", "$submitted_at"] },
              1000 * 60 * 60,
            ],
          },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      stats,
      trends: trendData,
      top_form_types: topFormTypes,
      processing_times: processingTimes,
    },
  });
});

/**
 * @desc    Export forms to CSV
 * @route   GET /api/v1/forms/export
 * @access  Private (Admin)
 */
export const exportForms = catchAsync(async (req, res, next) => {
  const { form_type, status, date_from, date_to } = req.query;

  const filter = { is_deleted: false };
  if (form_type) filter.form_type = form_type;
  if (status) filter.status = status;

  if (date_from || date_to) {
    filter.submitted_at = {};
    if (date_from) filter.submitted_at.$gte = new Date(date_from);
    if (date_to) filter.submitted_at.$lte = new Date(date_to);
  }

  const forms = await UniversalForm.find(filter)
    .populate("assigned_to", "full_name")
    .sort({ submitted_at: -1 })
    .lean();

  // Convert to CSV format
  const csvData = convertToCSV(forms);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=forms-export-${Date.now()}.csv`,
  );
  res.status(200).send(csvData);
});

// Helper functions
function parseUserAgent(userAgent) {
  // Basic user agent parsing (in production, use a proper library like 'useragent')
  if (!userAgent) return {};

  const deviceInfo = {};

  if (userAgent.includes("Mobile")) deviceInfo.type = "mobile";
  else if (userAgent.includes("Tablet")) deviceInfo.type = "tablet";
  else deviceInfo.type = "desktop";

  if (userAgent.includes("Windows")) deviceInfo.os = "Windows";
  else if (userAgent.includes("Mac")) deviceInfo.os = "macOS";
  else if (userAgent.includes("Linux")) deviceInfo.os = "Linux";
  else if (userAgent.includes("Android")) deviceInfo.os = "Android";
  else if (userAgent.includes("iOS")) deviceInfo.os = "iOS";

  if (userAgent.includes("Chrome")) deviceInfo.browser = "Chrome";
  else if (userAgent.includes("Firefox")) deviceInfo.browser = "Firefox";
  else if (userAgent.includes("Safari")) deviceInfo.browser = "Safari";
  else if (userAgent.includes("Edge")) deviceInfo.browser = "Edge";

  return deviceInfo;
}

function extractUtmParams(query) {
  return {
    utm_source: query.utm_source || null,
    utm_medium: query.utm_medium || null,
    utm_campaign: query.utm_campaign || null,
    referrer: query.ref || null,
  };
}

async function sendFormConfirmationEmail(form) {
  if (!emailService) return;

  const emailData = {
    to: form.contact_info.email,
    subject: `Form Submission Confirmation - ${form.form_id}`,
    template: "form-confirmation",
    data: {
      name: form.contact_info.full_name,
      form_type: form.form_type.replace("_", " ").toUpperCase(),
      form_id: form.form_id,
      message:
        form.message.substring(0, 200) +
        (form.message.length > 200 ? "..." : ""),
    },
  };

  await emailService.sendEmail(emailData);
}

async function sendFormNotificationEmail(form) {
  if (!emailService) return;

  const adminEmail = process.env.ADMIN_EMAIL || "admin@medh.com";

  const emailData = {
    to: adminEmail,
    subject: `New ${form.form_type.replace("_", " ")} Submission`,
    template: "form-notification",
    data: {
      form_type: form.form_type.replace("_", " ").toUpperCase(),
      form_id: form.form_id,
      name: form.contact_info.full_name,
      email: form.contact_info.email,
      company: form.professional_info?.company_name || "N/A",
      message: form.message.substring(0, 300),
      submitted_at: form.submitted_at.toLocaleString(),
    },
  };

  await emailService.sendEmail(emailData);
}

async function sendStatusUpdateEmail(form) {
  if (!emailService || !form.contact_info.email) return;

  const emailData = {
    to: form.contact_info.email,
    subject: `Update on Your ${form.form_type.replace("_", " ")} - ${form.form_id}`,
    template: "status-update",
    data: {
      name: form.contact_info.full_name,
      form_type: form.form_type.replace("_", " ").toUpperCase(),
      form_id: form.form_id,
      status: form.status.toUpperCase(),
      message: getStatusMessage(form.status),
    },
  };

  await emailService.sendEmail(emailData);
}

function getStatusMessage(status) {
  const messages = {
    approved: "Great news! Your submission has been approved.",
    rejected:
      "Thank you for your submission. Unfortunately, we cannot proceed at this time.",
    completed: "Your request has been completed successfully.",
  };

  return messages[status] || "Your submission status has been updated.";
}

function convertToCSV(forms) {
  if (!forms.length) return "";

  const headers = [
    "Form ID",
    "Form Type",
    "Status",
    "Priority",
    "Name",
    "Email",
    "Phone",
    "Company",
    "Message",
    "Submitted At",
    "Processed At",
    "Assigned To",
  ];

  const rows = forms.map((form) => [
    form.form_id,
    form.form_type,
    form.status,
    form.priority,
    form.contact_info.full_name,
    form.contact_info.email,
    form.contact_info.phone_number || "",
    form.professional_info?.company_name || "",
    `"${form.message.replace(/"/g, '""')}"`,
    form.submitted_at.toISOString(),
    form.processed_at ? form.processed_at.toISOString() : "",
    form.assigned_to?.full_name || "",
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

// New helper functions for Demo Session Form
async function createTemporaryUser(userData) {
  const temporaryPassword = passwordSecurity.generateSecurePassword(12);
  const hashedPassword = await passwordSecurity.hashPassword(temporaryPassword);

  const newUser = new User({
    email: userData.email,
    password: hashedPassword,
    full_name: userData.full_name,
    // Use role from userData, default to a general student role if not provided
    role: userData.role || "student",
    is_temporary_account: true,
    status: "active",
    // Set a temporary password expiry if needed
    password_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  await newUser.save();
  logger.info(
    `Temporary user created: ${newUser.email} with role ${newUser.role}`,
  );
  return { user: newUser, temporaryPassword };
}

async function sendDemoConfirmationEmail(
  form,
  temporaryPassword,
  recipientEmail,
  recipientName,
) {
  const isUnder16 = form.is_student_under_16;
  let subject = "";
  let template = "";
  let emailData = {};

  const demoDate = form.demo_session_details?.preferred_date
    ? new Date(form.demo_session_details.preferred_date).toLocaleDateString(
        "en-US",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" },
      )
    : "N/A";
  const demoTime = form.demo_session_details?.preferred_time_slot || "N/A";
  const selectedCourses =
    form.student_details?.preferred_course?.join(", ") || "N/A";
  const studentName = form.student_details?.name || "N/A";
  const studentGrade = form.student_details?.grade || "N/A";

  if (isUnder16) {
    subject = "Your Child's Medh Demo Session is Confirmed!";
    template = "parent-demo-confirmation"; // New template for parents
    emailData = {
      parent_name: recipientName,
      student_name: studentName,
      demo_date: demoDate,
      demo_time: demoTime,
      course: selectedCourses,
      grade_level: studentGrade,
      parent_email: recipientEmail,
      temporary_password: temporaryPassword,
    };
  } else {
    subject = "Your Medh Demo Session is Confirmed!";
    template = "student-demo-confirmation"; // New template for students 16+
    emailData = {
      name: recipientName,
      demo_date: demoDate,
      demo_time: demoTime,
      course: selectedCourses,
      email: recipientEmail,
      temporary_password: temporaryPassword,
    };
  }

  await emailService.sendEmail({
    to: recipientEmail,
    from: "demo@medh.co", // As per requirement
    subject: subject,
    template: template,
    data: emailData,
  });
  logger.info(
    `Demo confirmation email sent to ${recipientEmail} for form ${form.form_id}`,
  );
}

// Placeholder for WhatsApp confirmation
async function sendWhatsAppConfirmation(form, temporaryPassword) {
  logger.info(
    `Placeholder: Sending WhatsApp confirmation for form ${form.form_id}`,
  );
  // Implement actual WhatsApp sending logic here (e.g., using a WhatsApp API service)
  // Example data to send:
  // const recipientPhone = form.is_student_under_16 ? form.parent_details.mobile_no : form.student_details.mobile_no;
  // const firstName = form.is_student_under_16 ? form.parent_details.name.split(' ')[0] : form.student_details.name.split(' ')[0];
  // const demoDate = form.demo_session_details?.preferred_date ? new Date(form.demo_session_details.preferred_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "[Date]";
  // const demoTime = form.demo_session_details?.preferred_time_slot || "[Time]";
  // const courseName = form.student_details?.preferred_course?.join(', ') || "[Course Name(s)]";
  // const message = `🎉 *Medh Demo Confirmed!* 🎉\n\nHello ${firstName},\n\nYour free demo session is all set:\n📅 ${demoDate}\n⏰ ${demoTime}\n📚 ${courseName}\n\n*Login to your portal:*\n🔗 https://medh.co/login\n👤 Username: ${recipientEmail}\n🔑 Password: ${temporaryPassword}\n\nYour Zoom link is waiting in your dashboard, along with free learning resources!\n\nNeed to reschedule? Reply "RESCHEDULE" or reschedule in your portal.\n\nWe can't wait to welcome you to the Medh Learners Family! Have questions before your demo? Just reply to this message.\n\nTeam Medh 📚`;
  // Call WhatsApp API here with recipientPhone and message
}

// Placeholder for CRM integration
async function integrateWithCRM(form) {
  logger.info(`Placeholder: Integrating form ${form.form_id} with CRM.`);
  // Implement actual CRM integration logic here (e.g., sending data to Salesforce, HubSpot, etc.)
}

// Placeholder for Calendar Invite creation
async function createCalendarInvite(form) {
  logger.info(
    `Placeholder: Creating calendar invite for form ${form.form_id}.`,
  );
  // Implement actual calendar invite creation logic here (e.g., using Google Calendar API, Outlook Calendar API)
}

/**
 * @desc    Get all live courses
 * @route   GET /api/v1/courses/live
 * @access  Public
 */
export const getLiveCourses = catchAsync(async (req, res, next) => {
  const liveCourses = await LiveCourse.find({ status: "published" }).select(
    "title description",
  );
  res.status(200).json({
    success: true,
    data: liveCourses,
  });
});
