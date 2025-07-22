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
    browser_info: deviceInfo,
    ...utmParams,
    source: req.body.source || "website",
    submitted_at: new Date(),
  };

  // If user is authenticated, add user_id for auto-fill
  if (req.user) {
    formData.user_id = req.user._id;
  }

  // Create the form with auto-fill if user is logged in
  const form = await UniversalForm.createWithAutoFill(formData, req.user?._id);

  // Handle post-submission actions based on form_type
  switch (form.form_type) {
    case "candidate_application":
      await handleCandidateApplication(form);
      break;
    case "school_partnership":
      await handleSchoolPartnership(form);
      break;
    case "educator_application":
      await handleEducatorApplication(form);
      break;
    case "general_contact":
      await handleGeneralContact(form);
      break;
    // Enhanced contact form types
    case "corporate_training_inquiry":
      await handleCorporateTrainingInquiry(form);
      break;
    case "membership_inquiry":
      await handleMembershipInquiry(form);
      break;
    case "hire_from_medh_inquiry":
      await handleHireFromMedhInquiry(form);
      break;
    case "course_inquiry":
      await handleCourseInquiry(form);
      break;
    case "support_request":
      await handleSupportRequest(form);
      break;
    case "partnership_inquiry":
      await handlePartnershipInquiry(form);
      break;
    case "media_inquiry":
      await handleMediaInquiry(form);
      break;
    case "technical_support":
      await handleTechnicalSupport(form);
      break;
    case "billing_inquiry":
      await handleBillingInquiry(form);
      break;
    case "feedback_submission":
      await handleFeedbackSubmission(form);
      break;
    case "book_a_free_demo_session":
      // Keep existing demo session logic
      await handleDemoSession(form);
      break;
    default:
      // Handle other form types with original logic
      await handleGenericForm(form);
      break;
  }

  // Prepare response data
  const responseData = {
    application_id: form.application_id,
    form_type: form.form_type,
    status: form.status,
    submitted_at: form.submitted_at,
    acknowledgment_sent: form.acknowledgment_sent,
  };

  // Add auto-fill information if applicable
  if (form.auto_filled) {
    responseData.auto_filled = true;
    responseData.auto_fill_source = form.auto_fill_source;
    responseData.auto_filled_fields = form.auto_filled_fields;
  }

  res.status(201).json({
    success: true,
    message: getSuccessMessage(form.form_type),
    data: responseData,
  });
});

/**
 * @desc    Get auto-fill data for logged-in users
 * @route   GET /api/v1/forms/auto-fill
 * @access  Private
 */
export const getAutoFillData = catchAsync(async (req, res, next) => {
  if (!req.user?.id) {
    return res.status(401).json({
      success: false,
      message: "Authentication required for auto-fill",
    });
  }

  const autoFillData = await UniversalForm.getAutoFillData(req.user.id);

  if (!autoFillData) {
    return res.status(404).json({
      success: false,
      message: "User profile not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Auto-fill data retrieved successfully",
    data: autoFillData,
  });
});

/**
 * @desc    Get countries list with phone codes and enhanced data
 * @route   GET /api/v1/forms/countries
 * @access  Public
 */
export const getCountries = catchAsync(async (req, res, next) => {
  const {
    format = "full",
    search,
    continent,
    popular,
    phone_codes_only,
  } = req.query;

  let countries;

  try {
    // Import the country service
    const countryService = (await import("../utils/countryService.js")).default;

    switch (format) {
      case "dropdown":
        countries = countryService.getCountriesForDropdown();
        break;
      case "phone":
        countries = countryService.getCountriesWithPhoneCodes();
        break;
      case "popular":
        countries = countryService.getPopularCountries();
        break;
      default:
        countries = countryService.getAllCountries();
    }

    // Apply filters
    if (search) {
      countries = countryService.searchCountries(search);
    }

    if (continent) {
      countries = countryService.getCountriesByContinent(continent);
    }

    if (popular === "true") {
      countries = countries.filter((country) => country.priority >= 25);
    }

    if (phone_codes_only === "true") {
      countries = countries.filter((country) => country.phone);
    }

    // Limit results for performance (max 250 countries)
    const limitedCountries = countries.slice(0, 250);

    res.status(200).json({
      success: true,
      data: limitedCountries,
      meta: {
        total: countries.length,
        returned: limitedCountries.length,
        format: format,
        filters: {
          search: search || null,
          continent: continent || null,
          popular: popular === "true",
          phone_codes_only: phone_codes_only === "true",
        },
      },
    });
  } catch (error) {
    // Fallback to basic countries list if service fails
    console.warn(
      "Country service failed, falling back to basic list:",
      error.message,
    );

    const { countries: basicCountries } = await import("countries-list");
    const countryList = Object.entries(basicCountries).map(
      ([code, country]) => ({
        code: code,
        name: country.name,
        phone: country.phone ? `+${country.phone}` : null,
        emoji: country.emoji,
        flag: country.emoji,
      }),
    );

    res.status(200).json({
      success: true,
      data: countryList,
      meta: {
        total: countryList.length,
        returned: countryList.length,
        format: "fallback",
        note: "Using fallback country data",
      },
    });
  }
});

/**
 * @desc    Get live courses for demo session booking
 * @route   GET /api/v1/forms/live-courses
 * @access  Public
 */
export const getLiveCourses = catchAsync(async (req, res, next) => {
  const liveCourses = await LiveCourse.find({
    status: "published",
    is_active: true,
  }).select("title description course_type category");

  res.status(200).json({
    success: true,
    data: liveCourses,
  });
});

// Handler for candidate applications
const handleCandidateApplication = async (form) => {
  try {
    // Send acknowledgment email using existing email service
    await emailService.sendCareerApplicationAcknowledgment(
      form.contact_info.email,
      {
        applicant_name: form.contact_info.full_name,
        reference_id: form.application_id,
        position: form.post_applying_for || "General Application",
        application_date: form.submitted_at.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        email: form.contact_info.email,
        phone:
          form.contact_info.mobile_number?.formatted ||
          form.contact_info.mobile_number?.number,
        experience: form.employment_info?.has_work_experience ? "Yes" : "No",
        work_preference:
          form.employment_info?.preferred_work_mode || "Not specified",
      },
    );

    // Send admin notification
    await sendAdminNotification(form, "New Career Application Received");

    // Mark acknowledgment as sent
    await form.markAcknowledged();

    logger.info(`Career application submitted: ${form.application_id}`, {
      formId: form._id,
      email: form.contact_info.email,
      position: form.post_applying_for,
    });
  } catch (error) {
    logger.error("Error handling candidate application:", error);
  }
};

// Handler for school partnerships
const handleSchoolPartnership = async (form) => {
  try {
    // Send acknowledgment email using existing email service
    await emailService.sendPartnershipInquiryAcknowledgment(
      form.contact_info.email,
      {
        representative_name: form.contact_info.full_name,
        reference_id: form.application_id,
        institution_name: form.institution_info?.name || "Not specified",
        institution_type: form.institution_info?.type || "Not specified",
        location: form.contact_info.city || "Not specified",
        services_interested:
          form.partnership_details?.program_interests?.join(", ") ||
          "Not specified",
        inquiry_date: form.submitted_at.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        email: form.contact_info.email,
        phone:
          form.contact_info.mobile_number?.formatted ||
          form.contact_info.mobile_number?.number,
      },
    );

    // Send admin notification
    await sendAdminNotification(form, "New Partnership Inquiry Received");

    // Mark acknowledgment as sent
    await form.markAcknowledged();

    logger.info(`Partnership inquiry submitted: ${form.application_id}`, {
      formId: form._id,
      email: form.contact_info.email,
      institution: form.institution_info?.name,
    });
  } catch (error) {
    logger.error("Error handling school partnership:", error);
  }
};

// Handler for educator applications
const handleEducatorApplication = async (form) => {
  try {
    // Send acknowledgment email using existing email service
    await emailService.sendEducatorApplicationAcknowledgment(
      form.contact_info.email,
      {
        educator_name: form.contact_info.full_name,
        reference_id: form.application_id,
        teaching_subjects:
          form.teaching_info?.subject_areas?.join(", ") || "Not specified",
        grade_levels:
          form.teaching_info?.grade_levels?.join(", ") || "Not specified",
        teaching_mode:
          form.teaching_info?.preferred_teaching_mode || "Not specified",
        availability:
          form.teaching_info?.availability?.weekly_hours || "Not specified",
        application_date: form.submitted_at.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        email: form.contact_info.email,
        phone:
          form.contact_info.mobile_number?.formatted ||
          form.contact_info.mobile_number?.number,
        experience: form.education_info?.years_of_experience || "Not specified",
      },
    );

    // Send admin notification
    await sendAdminNotification(form, "New Educator Application Received");

    // Mark acknowledgment as sent
    await form.markAcknowledged();

    logger.info(`Educator application submitted: ${form.application_id}`, {
      formId: form._id,
      email: form.contact_info.email,
      subjects: form.teaching_info?.subject_areas,
    });
  } catch (error) {
    logger.error("Error handling educator application:", error);
  }
};

// Handler for general contact
const handleGeneralContact = async (form) => {
  try {
    // Send acknowledgment email using existing email service
    await emailService.sendContactFormAcknowledgment(form.contact_info.email, {
      name: form.contact_info.full_name,
      reference_id: form.application_id,
      subject: form.subject || "General Inquiry",
      inquiry_date: form.submitted_at.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      email: form.contact_info.email,
      phone:
        form.contact_info.mobile_number?.formatted ||
        form.contact_info.mobile_number?.number,
      message_preview:
        form.message.substring(0, 150) +
        (form.message.length > 150 ? "..." : ""),
    });

    // Send admin notification
    await sendAdminNotification(form, "New Contact Form Submission");

    // Mark acknowledgment as sent
    await form.markAcknowledged();

    logger.info(`Contact form submitted: ${form.application_id}`, {
      formId: form._id,
      email: form.contact_info.email,
      subject: form.subject,
    });
  } catch (error) {
    logger.error("Error handling general contact:", error);
  }
};

// Enhanced contact form handlers

// Handler for corporate training inquiries
const handleCorporateTrainingInquiry = async (form) => {
  try {
    await emailService.sendCorporateTrainingInquiryAcknowledgment(
      form.contact_info.email,
      {
        contact_name: form.contact_info.full_name,
        reference_id: form.application_id,
        designation: form.professional_info?.designation || "Not specified",
        company_name: form.professional_info?.company_name || "Not specified",
        company_website:
          form.professional_info?.company_website || "Not provided",
        company_size:
          form.professional_info?.company_size ||
          form.inquiry_details?.company_size ||
          "Not specified",
        industry: form.professional_info?.industry || "Not specified",
        training_type:
          form.training_requirements?.training_type || "Not specified",
        training_mode: form.training_requirements?.training_mode || "Flexible",
        participants_count:
          form.training_requirements?.participants_count || "Not specified",
        duration_preference:
          form.training_requirements?.duration_preference || "Not specified",
        budget_range:
          form.training_requirements?.budget_range ||
          form.inquiry_details?.budget_range ||
          "Not disclosed",
        timeline:
          form.training_requirements?.timeline ||
          form.inquiry_details?.timeline ||
          "Flexible",
        specific_skills:
          form.training_requirements?.specific_skills?.join(", ") ||
          "Not specified",
        custom_requirements:
          form.training_requirements?.custom_requirements ||
          form.message ||
          "Not specified",
        inquiry_date: form.submitted_at.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        email: form.contact_info.email,
        phone:
          form.contact_info.mobile_number?.formatted ||
          form.contact_info.mobile_number?.number,
      },
    );

    await sendAdminNotification(form, "New Corporate Training Inquiry");
    await form.markAcknowledged();

    logger.info(
      `Corporate training inquiry submitted: ${form.application_id}`,
      {
        formId: form._id,
        email: form.contact_info.email,
        company: form.professional_info?.company_name,
        designation: form.professional_info?.designation,
        trainingType: form.training_requirements?.training_type,
        participantsCount: form.training_requirements?.participants_count,
      },
    );
  } catch (error) {
    logger.error("Error handling corporate training inquiry:", error);
  }
};

// Handler for membership inquiries
const handleMembershipInquiry = async (form) => {
  try {
    await emailService.sendMembershipInquiryAcknowledgment(
      form.contact_info.email,
      {
        member_name: form.contact_info.full_name,
        reference_id: form.application_id,
        inquiry_type: form.inquiry_details?.inquiry_type || "membership_plans",
        preferred_contact:
          form.inquiry_details?.preferred_contact_method || "email",
        inquiry_date: form.submitted_at.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        email: form.contact_info.email,
        phone:
          form.contact_info.mobile_number?.formatted ||
          form.contact_info.mobile_number?.number,
      },
    );

    await sendAdminNotification(form, "New Membership Inquiry");
    await form.markAcknowledged();

    logger.info(`Membership inquiry submitted: ${form.application_id}`, {
      formId: form._id,
      email: form.contact_info.email,
    });
  } catch (error) {
    logger.error("Error handling membership inquiry:", error);
  }
};

// Handler for hire from Medh inquiries
const handleHireFromMedhInquiry = async (form) => {
  try {
    await emailService.sendHireFromMedhInquiryAcknowledgment(
      form.contact_info.email,
      {
        hr_name: form.contact_info.full_name,
        reference_id: form.application_id,
        company_size: form.inquiry_details?.company_size || "Not specified",
        timeline: form.inquiry_details?.timeline || "Not specified",
        additional_requirements:
          form.inquiry_details?.additional_requirements || "None specified",
        inquiry_date: form.submitted_at.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        email: form.contact_info.email,
        phone:
          form.contact_info.mobile_number?.formatted ||
          form.contact_info.mobile_number?.number,
      },
    );

    await sendAdminNotification(form, "New Hire from Medh Inquiry");
    await form.markAcknowledged();

    logger.info(`Hire from Medh inquiry submitted: ${form.application_id}`, {
      formId: form._id,
      email: form.contact_info.email,
    });
  } catch (error) {
    logger.error("Error handling hire from Medh inquiry:", error);
  }
};

// Handler for course inquiries
const handleCourseInquiry = async (form) => {
  try {
    await emailService.sendCourseInquiryAcknowledgment(
      form.contact_info.email,
      {
        student_name: form.contact_info.full_name,
        reference_id: form.application_id,
        course_interests:
          form.inquiry_details?.course_interest?.join(", ") ||
          "General inquiry",
        preferred_contact:
          form.inquiry_details?.preferred_contact_method || "email",
        timeline: form.inquiry_details?.timeline || "Not specified",
        inquiry_date: form.submitted_at.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        email: form.contact_info.email,
        phone:
          form.contact_info.mobile_number?.formatted ||
          form.contact_info.mobile_number?.number,
      },
    );

    await sendAdminNotification(form, "New Course Inquiry");
    await form.markAcknowledged();

    logger.info(`Course inquiry submitted: ${form.application_id}`, {
      formId: form._id,
      email: form.contact_info.email,
      courses: form.inquiry_details?.course_interest,
    });
  } catch (error) {
    logger.error("Error handling course inquiry:", error);
  }
};

// Handler for support requests
const handleSupportRequest = async (form) => {
  try {
    await emailService.sendSupportRequestAcknowledgment(
      form.contact_info.email,
      {
        user_name: form.contact_info.full_name,
        reference_id: form.application_id,
        inquiry_type: form.inquiry_details?.inquiry_type || "general_inquiry",
        urgency_level: form.inquiry_details?.urgency_level || "medium",
        subject: form.subject || "Support Request",
        inquiry_date: form.submitted_at.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        email: form.contact_info.email,
        phone:
          form.contact_info.mobile_number?.formatted ||
          form.contact_info.mobile_number?.number,
      },
    );

    await sendAdminNotification(form, "New Support Request");
    await form.markAcknowledged();

    logger.info(`Support request submitted: ${form.application_id}`, {
      formId: form._id,
      email: form.contact_info.email,
      urgency: form.inquiry_details?.urgency_level,
    });
  } catch (error) {
    logger.error("Error handling support request:", error);
  }
};

// Handler for partnership inquiries (different from school partnerships)
const handlePartnershipInquiry = async (form) => {
  try {
    await emailService.sendBusinessPartnershipInquiryAcknowledgment(
      form.contact_info.email,
      {
        partner_name: form.contact_info.full_name,
        reference_id: form.application_id,
        inquiry_type:
          form.inquiry_details?.inquiry_type || "partnership_opportunities",
        company_size: form.inquiry_details?.company_size || "Not specified",
        timeline: form.inquiry_details?.timeline || "Not specified",
        inquiry_date: form.submitted_at.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        email: form.contact_info.email,
        phone:
          form.contact_info.mobile_number?.formatted ||
          form.contact_info.mobile_number?.number,
      },
    );

    await sendAdminNotification(form, "New Business Partnership Inquiry");
    await form.markAcknowledged();

    logger.info(`Partnership inquiry submitted: ${form.application_id}`, {
      formId: form._id,
      email: form.contact_info.email,
    });
  } catch (error) {
    logger.error("Error handling partnership inquiry:", error);
  }
};

// Handler for media inquiries
const handleMediaInquiry = async (form) => {
  try {
    await emailService.sendMediaInquiryAcknowledgment(form.contact_info.email, {
      journalist_name: form.contact_info.full_name,
      reference_id: form.application_id,
      inquiry_type: form.inquiry_details?.inquiry_type || "media_press",
      subject: form.subject || "Media Inquiry",
      inquiry_date: form.submitted_at.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      email: form.contact_info.email,
      phone:
        form.contact_info.mobile_number?.formatted ||
        form.contact_info.mobile_number?.number,
    });

    await sendAdminNotification(form, "New Media Inquiry");
    await form.markAcknowledged();

    logger.info(`Media inquiry submitted: ${form.application_id}`, {
      formId: form._id,
      email: form.contact_info.email,
    });
  } catch (error) {
    logger.error("Error handling media inquiry:", error);
  }
};

// Handler for technical support
const handleTechnicalSupport = async (form) => {
  try {
    await emailService.sendTechnicalSupportAcknowledgment(
      form.contact_info.email,
      {
        user_name: form.contact_info.full_name,
        reference_id: form.application_id,
        urgency_level: form.inquiry_details?.urgency_level || "medium",
        subject: form.subject || "Technical Support Request",
        inquiry_date: form.submitted_at.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        email: form.contact_info.email,
        phone:
          form.contact_info.mobile_number?.formatted ||
          form.contact_info.mobile_number?.number,
      },
    );

    await sendAdminNotification(form, "New Technical Support Request");
    await form.markAcknowledged();

    logger.info(`Technical support request submitted: ${form.application_id}`, {
      formId: form._id,
      email: form.contact_info.email,
      urgency: form.inquiry_details?.urgency_level,
    });
  } catch (error) {
    logger.error("Error handling technical support:", error);
  }
};

// Handler for billing inquiries
const handleBillingInquiry = async (form) => {
  try {
    await emailService.sendBillingInquiryAcknowledgment(
      form.contact_info.email,
      {
        customer_name: form.contact_info.full_name,
        reference_id: form.application_id,
        inquiry_type: form.inquiry_details?.inquiry_type || "billing_payment",
        urgency_level: form.inquiry_details?.urgency_level || "medium",
        subject: form.subject || "Billing Inquiry",
        inquiry_date: form.submitted_at.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        email: form.contact_info.email,
        phone:
          form.contact_info.mobile_number?.formatted ||
          form.contact_info.mobile_number?.number,
      },
    );

    await sendAdminNotification(form, "New Billing Inquiry");
    await form.markAcknowledged();

    logger.info(`Billing inquiry submitted: ${form.application_id}`, {
      formId: form._id,
      email: form.contact_info.email,
    });
  } catch (error) {
    logger.error("Error handling billing inquiry:", error);
  }
};

// Handler for feedback submissions
const handleFeedbackSubmission = async (form) => {
  try {
    await emailService.sendFeedbackSubmissionAcknowledgment(
      form.contact_info.email,
      {
        user_name: form.contact_info.full_name,
        reference_id: form.application_id,
        feedback_type:
          form.inquiry_details?.inquiry_type || "feedback_complaint",
        subject: form.subject || "Feedback Submission",
        inquiry_date: form.submitted_at.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        email: form.contact_info.email,
        phone:
          form.contact_info.mobile_number?.formatted ||
          form.contact_info.mobile_number?.number,
      },
    );

    await sendAdminNotification(form, "New Feedback Submission");
    await form.markAcknowledged();

    logger.info(`Feedback submission submitted: ${form.application_id}`, {
      formId: form._id,
      email: form.contact_info.email,
    });
  } catch (error) {
    logger.error("Error handling feedback submission:", error);
  }
};

// Handler for demo sessions (keep existing logic)
const handleDemoSession = async (form) => {
  let userEmail = "";
  let userName = "";
  let temporaryPassword = "";
  let createdUser = null;

  // Use the main contact_info for email and name (DRY approach)
  userEmail = form.contact_info.email;
  userName = form.contact_info.full_name;

  try {
    createdUser = await createTemporaryUser({
      email: userEmail,
      full_name: userName,
      role: form.is_student_under_16 ? "parent_demo_user" : "student_demo_user",
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
      userEmail,
      userName,
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

  logger.info(`Demo Session Form submitted: ${form.application_id}`, {
    formId: form._id,
    email: userEmail,
    isStudentUnder16: form.is_student_under_16,
  });
};

// Handler for generic forms (keep existing logic)
const handleGenericForm = async (form) => {
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

  logger.info(`Form submitted: ${form.form_type} - ${form.application_id}`, {
    formId: form._id,
    formType: form.form_type,
    email: form.contact_info.email,
  });
};

// Helper function to get success message
const getSuccessMessage = (formType) => {
  const messages = {
    candidate_application:
      "Your job application has been submitted successfully. We'll review your application and get back to you soon.",
    educator_application:
      "Your educator application has been submitted successfully. Our academic team will review your qualifications and contact you within 2-3 business days.",
    school_partnership:
      "Your partnership inquiry has been submitted successfully. Our partnerships team will reach out to discuss collaboration opportunities.",
    general_contact:
      "Your message has been sent successfully. We'll respond to your inquiry within 24-48 hours.",
    book_a_free_demo_session:
      "Your demo session has been booked successfully. Check your email for login credentials and session details.",
    // Enhanced contact form messages
    corporate_training_inquiry:
      "Thank you for your interest in our corporate training programs. Our sales team will contact you within 24 hours to discuss your requirements.",
    membership_inquiry:
      "Thank you for your interest in Medh Membership. Our team will reach out with detailed information and pricing within 24 hours.",
    hire_from_medh_inquiry:
      "Thank you for considering Medh for your hiring needs. Our partnerships team will contact you to discuss how we can help you find the right talent.",
    course_inquiry:
      "Thank you for your interest in our courses. Our admissions team will provide you with detailed course information and enrollment assistance.",
    support_request:
      "Your support request has been received. Our support team will assist you within 24 hours during business days.",
    partnership_inquiry:
      "Thank you for your partnership inquiry. Our business development team will review your proposal and respond within 2-3 business days.",
    media_inquiry:
      "Thank you for your media inquiry. Our communications team will respond with the requested information within 24-48 hours.",
    technical_support:
      "Your technical support request has been logged. Our technical team will investigate and respond within 4-6 hours during business hours.",
    billing_inquiry:
      "Your billing inquiry has been received. Our billing team will review your account and respond within 24 hours.",
    feedback_submission:
      "Thank you for your valuable feedback. We appreciate your input and will use it to improve our services.",
  };

  return messages[formType] || "Form submitted successfully.";
};

/**
 * @desc    Submit Career Application Form
 * @route   POST /api/v1/forms/career-application
 * @access  Public
 */
export const submitCareerApplication = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  // Generate unique reference ID
  const referenceId = `CAR-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, "0")}${new Date().getDate().toString().padStart(2, "0")}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

  const formData = {
    ...req.body,
    form_type: "career_application",
    form_id: referenceId,
    status: "submitted",
    priority: "medium",
    submitted_at: new Date(),
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get("User-Agent"),
  };

  const form = new UniversalForm(formData);
  await form.save();

  // Send acknowledgment email
  try {
    await sendCareerApplicationAcknowledgment(form);
    logger.info(`Career application acknowledgment sent for ${referenceId}`);
  } catch (emailError) {
    logger.error(
      "Failed to send career application acknowledgment:",
      emailError,
    );
  }

  // Send admin notification
  try {
    await sendAdminNotification(form, "New Career Application Received");
  } catch (emailError) {
    logger.error("Failed to send admin notification:", emailError);
  }

  res.status(201).json({
    success: true,
    message: "Career application submitted successfully",
    data: {
      reference_id: referenceId,
      status: form.status,
      submitted_at: form.submitted_at,
    },
  });
});

/**
 * @desc    Submit Partnership Inquiry Form
 * @route   POST /api/v1/forms/partnership-inquiry
 * @access  Public
 */
export const submitPartnershipInquiry = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  // Generate unique reference ID
  const referenceId = `PART-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, "0")}${new Date().getDate().toString().padStart(2, "0")}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

  const formData = {
    ...req.body,
    form_type: "school_institute_partnership_inquiry",
    form_id: referenceId,
    status: "submitted",
    priority: "high",
    submitted_at: new Date(),
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get("User-Agent"),
  };

  const form = new UniversalForm(formData);
  await form.save();

  // Send acknowledgment email
  try {
    await sendPartnershipInquiryAcknowledgment(form);
    logger.info(`Partnership inquiry acknowledgment sent for ${referenceId}`);
  } catch (emailError) {
    logger.error(
      "Failed to send partnership inquiry acknowledgment:",
      emailError,
    );
  }

  // Send admin notification
  try {
    await sendAdminNotification(form, "New Partnership Inquiry Received");
  } catch (emailError) {
    logger.error("Failed to send admin notification:", emailError);
  }

  res.status(201).json({
    success: true,
    message: "Partnership inquiry submitted successfully",
    data: {
      reference_id: referenceId,
      status: form.status,
      submitted_at: form.submitted_at,
    },
  });
});

/**
 * @desc    Submit Educator Application Form
 * @route   POST /api/v1/forms/educator-application
 * @access  Public
 */
export const submitEducatorApplication = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  // Generate unique reference ID
  const referenceId = `EDU-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, "0")}${new Date().getDate().toString().padStart(2, "0")}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

  const formData = {
    ...req.body,
    form_type: "educator_application",
    form_id: referenceId,
    status: "submitted",
    priority: "high",
    submitted_at: new Date(),
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get("User-Agent"),
  };

  const form = new UniversalForm(formData);
  await form.save();

  // Send acknowledgment email
  try {
    await sendEducatorApplicationAcknowledgment(form);
    logger.info(`Educator application acknowledgment sent for ${referenceId}`);
  } catch (emailError) {
    logger.error(
      "Failed to send educator application acknowledgment:",
      emailError,
    );
  }

  // Send admin notification
  try {
    await sendAdminNotification(form, "New Educator Application Received");
  } catch (emailError) {
    logger.error("Failed to send admin notification:", emailError);
  }

  res.status(201).json({
    success: true,
    message: "Educator application submitted successfully",
    data: {
      reference_id: referenceId,
      status: form.status,
      submitted_at: form.submitted_at,
    },
  });
});

/**
 * @desc    Submit Contact Us Form
 * @route   POST /api/v1/forms/contact-us
 * @access  Public
 */
export const submitContactForm = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  // Generate unique reference ID
  const referenceId = `CONT-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, "0")}${new Date().getDate().toString().padStart(2, "0")}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

  const formData = {
    ...req.body,
    form_type: "contact_us",
    form_id: referenceId,
    status: "submitted",
    priority: "medium",
    submitted_at: new Date(),
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get("User-Agent"),
  };

  const form = new UniversalForm(formData);
  await form.save();

  // Send acknowledgment email
  try {
    await sendContactFormAcknowledgment(form);
    logger.info(`Contact form acknowledgment sent for ${referenceId}`);
  } catch (emailError) {
    logger.error("Failed to send contact form acknowledgment:", emailError);
  }

  // Send admin notification
  try {
    await sendAdminNotification(form, "New Contact Form Submission");
  } catch (emailError) {
    logger.error("Failed to send admin notification:", emailError);
  }

  res.status(201).json({
    success: true,
    message: "Contact form submitted successfully",
    data: {
      reference_id: referenceId,
      status: form.status,
      submitted_at: form.submitted_at,
    },
  });
});

/**
 * @desc    Submit Corporate Training Inquiry Form (Dedicated endpoint)
 * @route   POST /api/v1/forms/corporate-training
 * @access  Public
 */
export const submitCorporateTraining = catchAsync(async (req, res, next) => {
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
  const deviceInfo = parseUserAgent(userAgent);

  // Transform frontend data to match Universal Form Model
  const {
    full_name,
    email,
    country,
    phone_number,
    designation,
    company_name,
    company_website,
    training_requirements,
    terms_accepted,
    // Optional additional fields
    company_size,
    industry,
    training_type,
    training_mode,
    participants_count,
    duration_preference,
    budget_range,
    timeline,
    specific_skills,
  } = req.body;

  // Parse phone number if it's a string format
  let formattedPhone = phone_number;
  if (typeof phone_number === "string") {
    // Assume it's already formatted like "+919876543210"
    formattedPhone = {
      country_code: phone_number.substring(0, phone_number.length - 10),
      number: phone_number.substring(phone_number.length - 10),
    };
  }

  // Create form data structure matching Universal Form Model
  const formData = {
    form_type: "corporate_training_inquiry",

    // Contact information
    contact_info: {
      first_name: full_name.split(" ")[0] || "",
      last_name: full_name.split(" ").slice(1).join(" ") || "",
      full_name: full_name,
      email: email.toLowerCase().trim(),
      mobile_number: formattedPhone,
      city: "", // Not provided in frontend form
      country: country || "IN",
    },

    // Professional information
    professional_info: {
      designation: designation.trim(),
      company_name: company_name.trim(),
      company_website: company_website?.trim() || null,
      industry: industry || null,
      company_size: company_size || null,
    },

    // Training requirements (store main message + structured data)
    training_requirements: {
      training_type: training_type || "other",
      training_mode: training_mode || "flexible",
      participants_count: participants_count || null,
      duration_preference: duration_preference || null,
      budget_range: budget_range || "not_disclosed",
      timeline: timeline || "flexible",
      specific_skills: specific_skills || [],
      custom_requirements: training_requirements.trim(),
    },

    // For backward compatibility, also store in message field
    subject: "Corporate Training Inquiry",
    message: training_requirements.trim(),

    // Consent and metadata
    consent: {
      terms_and_privacy: terms_accepted === true,
      data_collection_consent: terms_accepted === true,
      marketing_consent: false,
    },

    // System metadata
    ip_address: ipAddress,
    user_agent: userAgent,
    browser_info: deviceInfo,
    source: "website_form",
    submitted_at: new Date(),
  };

  // If user is authenticated, add user_id for auto-fill
  if (req.user) {
    formData.user_id = req.user._id;
  }

  // Create the form
  const form = await UniversalForm.createWithAutoFill(formData, req.user?._id);

  // Handle corporate training specific processing
  await handleCorporateTrainingInquiry(form);

  // Prepare response
  const responseData = {
    success: true,
    message:
      "Corporate training inquiry submitted successfully. Our partnerships team will contact you within 24 hours.",
    data: {
      form_id: form.application_id,
      submission_date: form.submitted_at,
      status: form.status,
      priority: form.priority,
    },
  };

  // Add auto-fill information if applicable
  if (form.auto_filled) {
    responseData.data.auto_filled = true;
    responseData.data.auto_fill_source = form.auto_fill_source;
  }

  res.status(201).json(responseData);
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

  const formData = {
    name: form.contact_info.full_name,
    form_type: form.form_type.replace("_", " ").toUpperCase(),
    form_id: form.form_id,
    message:
      form.message.substring(0, 200) + (form.message.length > 200 ? "..." : ""),
    submitted_at: form.submitted_at || new Date(),
  };

  await emailService.sendFormConfirmationEmail(
    form.contact_info.email,
    formData,
  );
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
    await emailService.sendParentDemoConfirmationEmail(
      recipientEmail,
      emailData,
    );
  } else {
    emailData = {
      name: recipientName,
      demo_date: demoDate,
      demo_time: demoTime,
      course: selectedCourses,
      email: recipientEmail,
      temporary_password: temporaryPassword,
    };
    await emailService.sendStudentDemoConfirmationEmail(
      recipientEmail,
      emailData,
    );
  }
  logger.info(
    `Demo confirmation email sent to ${recipientEmail} for form ${form.application_id}`,
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

// Email service functions for new form types
async function sendCareerApplicationAcknowledgment(form) {
  if (!emailService) return;

  const emailData = {
    applicant_name: form.contact_info.full_name,
    reference_id: form.form_id,
    position: form.post_applying_for || "General Application",
    application_date: form.submitted_at.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    email: form.contact_info.email,
    phone: form.contact_info.phone_number,
    experience: form.employment_info?.has_work_experience ? "Yes" : "No",
    work_preference:
      form.employment_info?.work_location_preference || "Not specified",
  };

  await emailService.sendCareerApplicationAcknowledgment(
    form.contact_info.email,
    emailData,
  );
}

async function sendPartnershipInquiryAcknowledgment(form) {
  if (!emailService) return;

  const emailData = {
    representative_name: form.contact_info.full_name,
    reference_id: form.form_id,
    institution_name:
      form.school_info?.school_name ||
      form.professional_info?.company_name ||
      "Not specified",
    institution_type: form.school_info?.school_type || "Not specified",
    location:
      form.school_info?.city_state || form.contact_info.city || "Not specified",
    student_count: form.school_info?.student_count || "Not specified",
    services_interested:
      form.partnership_info?.services_of_interest?.join(", ") ||
      "Not specified",
    inquiry_date: form.submitted_at.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    email: form.contact_info.email,
    phone: form.contact_info.phone_number,
  };

  await emailService.sendPartnershipInquiryAcknowledgment(
    form.contact_info.email,
    emailData,
  );
}

async function sendEducatorApplicationAcknowledgment(form) {
  if (!emailService) return;

  const emailData = {
    educator_name: form.contact_info.full_name,
    reference_id: form.form_id,
    teaching_subjects:
      form.subject_areas?.primary_subjects?.join(", ") || "Not specified",
    grade_levels:
      form.subject_areas?.grade_levels?.join(", ") || "Not specified",
    teaching_mode: form.preferred_teaching_mode || "Not specified",
    availability: form.availability?.hours_per_week || "Not specified",
    application_date: form.submitted_at.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    email: form.contact_info.email,
    phone: form.contact_info.phone_number,
    experience: form.professional_info?.experience_level || "Not specified",
  };

  await emailService.sendEducatorApplicationAcknowledgment(
    form.contact_info.email,
    emailData,
  );
}

async function sendContactFormAcknowledgment(form) {
  if (!emailService) return;

  const emailData = {
    name: form.contact_info.full_name,
    reference_id: form.form_id,
    subject: form.subject || "General Inquiry",
    inquiry_date: form.submitted_at.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    email: form.contact_info.email,
    phone: form.contact_info.phone_number,
    message_preview:
      form.message.substring(0, 150) + (form.message.length > 150 ? "..." : ""),
  };

  await emailService.sendContactFormAcknowledgment(
    form.contact_info.email,
    emailData,
  );
}

async function sendAdminNotification(form, subject) {
  if (!emailService) return;

  const adminEmail = process.env.ADMIN_EMAIL || "admin@medh.com";

  const emailData = {
    to: adminEmail,
    subject: `${subject} - ${form.form_id}`,
    template: "admin-notification",
    data: {
      form_type: form.form_type.replace(/_/g, " ").toUpperCase(),
      reference_id: form.form_id,
      applicant_name: form.contact_info.full_name,
      email: form.contact_info.email,
      phone: form.contact_info.phone_number || "Not provided",
      submitted_date: form.submitted_at.toLocaleString(),
      message_preview: form.message
        ? form.message.substring(0, 200) +
          (form.message.length > 200 ? "..." : "")
        : "No message provided",
      priority: form.priority,
      status: form.status,
    },
  };

  await emailService.sendEmail(emailData);
}
