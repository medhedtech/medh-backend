import emailService from "../services/emailService.js";
import logger from "../utils/logger.js";

class EmailManagementController {
  /**
   * Get email service health status
   */
  async getHealthStatus(req, res) {
    try {
      const health = await emailService.getHealthCheck();

      res.status(health.status === "healthy" ? 200 : 503).json({
        success: health.status !== "unhealthy",
        data: health,
      });
    } catch (error) {
      logger.error("Failed to get email service health", { error });
      res.status(500).json({
        success: false,
        message: "Failed to get email service health",
        error: error.message,
      });
    }
  }

  /**
   * Get email queue statistics
   */
  async getQueueStats(req, res) {
    try {
      const stats = await emailService.getQueueStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Failed to get queue stats", { error });
      res.status(500).json({
        success: false,
        message: "Failed to get queue statistics",
        error: error.message,
      });
    }
  }

  /**
   * Send test emails
   */
  async sendTestEmails(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Test email address is required",
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      const results = await emailService.runEmailTests(email);

      res.json({
        success: true,
        message: `Email tests completed. ${results.successful}/${results.total} passed.`,
        data: results,
      });
    } catch (error) {
      logger.error("Failed to send test emails", { error });
      res.status(500).json({
        success: false,
        message: "Failed to send test emails",
        error: error.message,
      });
    }
  }

  /**
   * Send marketing email campaign
   */
  async sendMarketingCampaign(req, res) {
    try {
      const { recipients, templateName, subject, globalData, options } =
        req.body;

      if (
        !recipients ||
        !Array.isArray(recipients) ||
        recipients.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Recipients list is required and must be a non-empty array",
        });
      }

      if (!templateName || !subject) {
        return res.status(400).json({
          success: false,
          message: "Template name and subject are required",
        });
      }

      // Validate recipients format
      const invalidRecipients = recipients.filter(
        (r) => !r.email || typeof r.email !== "string",
      );
      if (invalidRecipients.length > 0) {
        return res.status(400).json({
          success: false,
          message: "All recipients must have a valid email address",
        });
      }

      const results = await emailService.sendMarketingEmail(
        recipients,
        templateName,
        subject,
        globalData || {},
        options || {},
      );

      res.json({
        success: true,
        message: `Marketing campaign sent. ${results.queued} emails queued, ${results.failed} failed.`,
        data: results,
      });
    } catch (error) {
      logger.error("Failed to send marketing campaign", { error });
      res.status(500).json({
        success: false,
        message: "Failed to send marketing campaign",
        error: error.message,
      });
    }
  }

  /**
   * Send announcement email
   */
  async sendAnnouncement(req, res) {
    try {
      const { subject, announcementData, options } = req.body;

      if (!subject) {
        return res.status(400).json({
          success: false,
          message: "Subject is required",
        });
      }

      if (!announcementData) {
        return res.status(400).json({
          success: false,
          message: "Announcement data is required",
        });
      }

      const results = await emailService.sendAnnouncementEmail(
        subject,
        announcementData,
        options || {},
      );

      res.json({
        success: true,
        message: `Announcement sent. ${results.queued} emails queued, ${results.failed} failed.`,
        data: results,
      });
    } catch (error) {
      logger.error("Failed to send announcement", { error });
      res.status(500).json({
        success: false,
        message: "Failed to send announcement",
        error: error.message,
      });
    }
  }

  /**
   * Send individual templated email
   */
  async sendTemplatedEmail(req, res) {
    try {
      const { email, templateName, subject, templateData, options } = req.body;

      if (!email || !templateName || !subject) {
        return res.status(400).json({
          success: false,
          message: "Email, template name, and subject are required",
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      const result = await emailService.sendTemplatedEmail(
        email,
        templateName,
        subject,
        templateData || {},
        options || {},
      );

      res.json({
        success: true,
        message: "Templated email sent successfully",
        data: result,
      });
    } catch (error) {
      logger.error("Failed to send templated email", { error });
      res.status(500).json({
        success: false,
        message: "Failed to send templated email",
        error: error.message,
      });
    }
  }

  /**
   * Send form confirmation email
   */
  async sendFormConfirmation(req, res) {
    try {
      const { email, formData } = req.body;

      if (!email || !formData) {
        return res.status(400).json({
          success: false,
          message: "Email and form data are required",
        });
      }

      const result = await emailService.sendFormConfirmationEmail(
        email,
        formData,
      );

      res.json({
        success: true,
        message: "Form confirmation email sent successfully",
        data: result,
      });
    } catch (error) {
      logger.error("Failed to send form confirmation email", { error });
      res.status(500).json({
        success: false,
        message: "Failed to send form confirmation email",
        error: error.message,
      });
    }
  }

  /**
   * Send demo confirmation email
   */
  async sendDemoConfirmation(req, res) {
    try {
      const { email, demoData, isParent } = req.body;

      if (!email || !demoData) {
        return res.status(400).json({
          success: false,
          message: "Email and demo data are required",
        });
      }

      const result = isParent
        ? await emailService.sendParentDemoConfirmationEmail(email, demoData)
        : await emailService.sendStudentDemoConfirmationEmail(email, demoData);

      res.json({
        success: true,
        message: "Demo confirmation email sent successfully",
        data: result,
      });
    } catch (error) {
      logger.error("Failed to send demo confirmation email", { error });
      res.status(500).json({
        success: false,
        message: "Failed to send demo confirmation email",
        error: error.message,
      });
    }
  }

  /**
   * Send receipt email
   */
  async sendReceipt(req, res) {
    try {
      const { email, receiptData } = req.body;

      if (!email || !receiptData) {
        return res.status(400).json({
          success: false,
          message: "Email and receipt data are required",
        });
      }

      const result = await emailService.sendReceiptEmail(email, receiptData);

      res.json({
        success: true,
        message: "Receipt email sent successfully",
        data: result,
      });
    } catch (error) {
      logger.error("Failed to send receipt email", { error });
      res.status(500).json({
        success: false,
        message: "Failed to send receipt email",
        error: error.message,
      });
    }
  }

  /**
   * Get email templates list
   */
  async getTemplatesList(req, res) {
    try {
      // This would ideally scan the templates directory
      const templates = [
        {
          name: "welcome",
          description: "Welcome email for new users",
          category: "user_onboarding",
        },
        {
          name: "email-verification",
          description: "Email verification with OTP",
          category: "authentication",
        },
        {
          name: "reset-password",
          description: "Password reset email",
          category: "authentication",
        },
        {
          name: "login-notification",
          description: "New login notification",
          category: "security",
        },
        {
          name: "logout-all-devices",
          description: "Logout from all devices notification",
          category: "security",
        },
        {
          name: "session-reminder",
          description: "Session reminder email",
          category: "education",
        },
        {
          name: "form-confirmation",
          description: "Form submission confirmation",
          category: "general",
        },
        {
          name: "parent-demo-confirmation",
          description: "Parent demo session confirmation",
          category: "demo",
        },
        {
          name: "student-demo-confirmation",
          description: "Student demo session confirmation",
          category: "demo",
        },
        {
          name: "receipt",
          description: "Payment receipt email",
          category: "billing",
        },
        {
          name: "notification",
          description: "General notification email",
          category: "general",
        },
      ];

      res.json({
        success: true,
        data: {
          templates,
          total: templates.length,
        },
      });
    } catch (error) {
      logger.error("Failed to get templates list", { error });
      res.status(500).json({
        success: false,
        message: "Failed to get templates list",
        error: error.message,
      });
    }
  }
}

export default new EmailManagementController();
