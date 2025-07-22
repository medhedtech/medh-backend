import express from "express";
import { body, query } from "express-validator";
import emailManagementController from "../controllers/emailManagementController.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireAdminRole } from "../middleware/roleCheck.js";

const router = express.Router();

// Admin authentication middleware for all email management routes
router.use(authenticateToken);
router.use(requireAdminRole);

/**
 * @route   GET /api/v1/email-management/health
 * @desc    Get email service health status
 * @access  Admin only
 */
router.get("/health", emailManagementController.getHealthStatus);

/**
 * @route   GET /api/v1/email-management/queue/stats
 * @desc    Get email queue statistics
 * @access  Admin only
 */
router.get("/queue/stats", emailManagementController.getQueueStats);

/**
 * @route   GET /api/v1/email-management/templates
 * @desc    Get list of available email templates
 * @access  Admin only
 */
router.get("/templates", emailManagementController.getTemplatesList);

/**
 * @route   POST /api/v1/email-management/test
 * @desc    Send test emails to verify email functionality
 * @access  Admin only
 */
router.post(
  "/test",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email address is required"),
  ],
  emailManagementController.sendTestEmails,
);

/**
 * @route   POST /api/v1/email-management/send/templated
 * @desc    Send individual templated email
 * @access  Admin only
 */
router.post(
  "/send/templated",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email address is required"),
    body("templateName")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Template name is required"),
    body("subject")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Subject is required"),
    body("templateData")
      .optional()
      .isObject()
      .withMessage("Template data must be an object"),
    body("options")
      .optional()
      .isObject()
      .withMessage("Options must be an object"),
  ],
  emailManagementController.sendTemplatedEmail,
);

/**
 * @route   POST /api/v1/email-management/send/form-confirmation
 * @desc    Send form confirmation email
 * @access  Admin only
 */
router.post(
  "/send/form-confirmation",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email address is required"),
    body("formData").isObject().withMessage("Form data is required"),
  ],
  emailManagementController.sendFormConfirmation,
);

/**
 * @route   POST /api/v1/email-management/send/demo-confirmation
 * @desc    Send demo confirmation email (parent or student)
 * @access  Admin only
 */
router.post(
  "/send/demo-confirmation",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email address is required"),
    body("demoData").isObject().withMessage("Demo data is required"),
    body("isParent")
      .optional()
      .isBoolean()
      .withMessage("isParent must be a boolean"),
  ],
  emailManagementController.sendDemoConfirmation,
);

/**
 * @route   POST /api/v1/email-management/send/receipt
 * @desc    Send receipt email
 * @access  Admin only
 */
router.post(
  "/send/receipt",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email address is required"),
    body("receiptData").isObject().withMessage("Receipt data is required"),
  ],
  emailManagementController.sendReceipt,
);

/**
 * @route   POST /api/v1/email-management/campaigns/marketing
 * @desc    Send marketing email campaign
 * @access  Admin only
 */
router.post(
  "/campaigns/marketing",
  [
    body("recipients")
      .isArray({ min: 1 })
      .withMessage("Recipients must be a non-empty array"),
    body("recipients.*.email")
      .isEmail()
      .withMessage("All recipients must have valid email addresses"),
    body("templateName")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Template name is required"),
    body("subject")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Subject is required"),
    body("globalData")
      .optional()
      .isObject()
      .withMessage("Global data must be an object"),
    body("options")
      .optional()
      .isObject()
      .withMessage("Options must be an object"),
    body("options.campaign")
      .optional()
      .isString()
      .withMessage("Campaign name must be a string"),
    body("options.priority")
      .optional()
      .isIn(["low", "normal", "high"])
      .withMessage("Priority must be low, normal, or high"),
  ],
  emailManagementController.sendMarketingCampaign,
);

/**
 * @route   POST /api/v1/email-management/campaigns/announcement
 * @desc    Send announcement email to all users
 * @access  Admin only
 */
router.post(
  "/campaigns/announcement",
  [
    body("subject")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Subject is required"),
    body("announcementData")
      .isObject()
      .withMessage("Announcement data is required"),
    body("options")
      .optional()
      .isObject()
      .withMessage("Options must be an object"),
    body("options.urgent")
      .optional()
      .isBoolean()
      .withMessage("Urgent flag must be a boolean"),
  ],
  emailManagementController.sendAnnouncement,
);

export default router;
