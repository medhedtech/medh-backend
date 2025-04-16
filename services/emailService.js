import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

import Handlebars from "handlebars";
import nodemailer from "nodemailer";

import logger from "../utils/logger.js";
import registerTemplateHelpers from "../utils/templateHelpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readFileAsync = promisify(fs.readFile);

/**
 * Email Service
 * Simplified implementation for handling email operations
 */
class EmailService {
  constructor() {
    // Get configured credentials or use defaults
    const emailHost = process.env.EMAIL_HOST || "email-smtp.us-east-1.amazonaws.com";
    const emailPort = process.env.EMAIL_PORT || 465;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    // Log what we're using
    console.log("EmailService: Using email configuration:", { 
      host: emailHost,
      port: emailPort,
      user: emailUser ? "SET" : "NOT SET", 
      pass: emailPass ? "SET" : "NOT SET",
      secure: true
    });
    
    // Initialize transporter - only if credentials are actually provided
    if (emailUser && emailPass) {
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: true, // true for 465
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
    } else {
      console.warn("EmailService: No email credentials provided. Using console transport.");
      // Create a "fake" transporter that just logs emails instead of sending them
      this.transporter = {
        sendMail: async (mailOptions) => {
          console.log("EMAIL WOULD BE SENT:", {
            to: mailOptions.to,
            from: mailOptions.from,
            subject: mailOptions.subject,
            text: mailOptions.text?.substring(0, 150) + "...",
          });
          return { messageId: "fake-message-id-" + Date.now() };
        },
        verify: (callback) => callback(null, true)
      };
    }

    // Initialize template cache
    this.templateCache = new Map();

    // Register template helpers
    registerTemplateHelpers();

    // Verify connection
    this.verifyConnection();
  }

  /**
   * Verify the email service connection
   */
  verifyConnection() {
    this.transporter.verify((error, _success) => {
      if (error) {
        logger.email.error("Email configuration error:", { error });
        this.handleConnectionError(error);
      } else {
        logger.email.info("Email server is ready to send messages");
      }
    });
  }

  /**
   * Handle specific email connection errors
   * @param {Error} error - Connection error
   */
  handleConnectionError(error) {
    if (error.code === "EAUTH") {
      logger.email.error("Authentication failed", {
        error,
        troubleshooting: [
          "Please check your credentials",
          "If using Gmail, make sure to:",
          "1. Enable 2-Step Verification in your Google Account",
          "2. Generate an App Password from Google Account settings",
          "3. Use the App Password instead of your regular password",
        ],
      });
    } else if (error.code === "EDNS") {
      logger.email.error("DNS lookup failed", {
        error,
        troubleshooting: [
          "Please check your internet connection",
          "Verify SMTP server settings are correct",
        ],
      });
    } else if (error.code === "ESOCKET") {
      logger.email.error("Socket connection error", {
        error,
        troubleshooting: [
          "Check firewall settings",
          "Verify SMTP port is open",
          "Ensure SMTP server is accessible",
        ],
      });
    } else {
      logger.email.error("Unknown email connection error", { error });
    }
  }

  /**
   * Load and compile an email template
   * @param {string} templateName - Template file name without extension
   * @returns {Promise<Function>} Compiled template function
   */
  async loadTemplate(templateName) {
    // Check if template is cached
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    try {
      // Load template from file
      const templatePath = path.join(
        __dirname,
        "../templates",
        `${templateName}.hbs`,
      );
      const templateSource = await readFileAsync(templatePath, "utf8");

      // Compile template
      const template = Handlebars.compile(templateSource);

      // Cache template
      this.templateCache.set(templateName, template);

      return template;
    } catch (error) {
      logger.email.error(`Failed to load email template: ${templateName}`, {
        error,
      });
      throw new Error(`Email template not found: ${templateName}`);
    }
  }

  /**
   * Render email content using template and data
   * @param {string} templateName - Template name
   * @param {Object} data - Template data
   * @returns {Promise<string>} Rendered HTML
   */
  async renderTemplate(templateName, data) {
    try {
      const template = await this.loadTemplate(templateName);
      return template(data);
    } catch (error) {
      logger.email.error(`Failed to render email template: ${templateName}`, {
        error,
        data,
      });
      throw error;
    }
  }

  /**
   * Send an email directly
   * @param {Object} mailOptions - Email options (from, to, subject, html)
   * @returns {Promise} Email sending result
   */
  async sendEmail(mailOptions) {
    // Force a valid FROM address regardless of what was provided
    mailOptions.from = '"Medh No-Reply" <noreply@medh.co>';

    // Add text version if only HTML is provided
    if (mailOptions.html && !mailOptions.text) {
      // Simple HTML to text conversion
      mailOptions.text = mailOptions.html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    const recipient =
      typeof mailOptions.to === "string"
        ? mailOptions.to
        : Array.isArray(mailOptions.to)
          ? mailOptions.to.join(", ")
          : "unknown";

    try {
      logger.email.debug(`Sending email to ${recipient}`, {
        subject: mailOptions.subject,
      });

      const info = await this.transporter.sendMail(mailOptions);

      logger.email.info(`Email sent successfully to ${recipient}`, {
        messageId: info.messageId,
        subject: mailOptions.subject,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      logger.email.error(`Failed to send email to ${recipient}`, {
        error,
        subject: mailOptions.subject,
      });

      if (error.code === "EAUTH") {
        throw new Error(
          "Email authentication failed. Please check your email credentials."
        );
      } else if (error.code === "ESOCKET") {
        throw new Error(
          "Email connection failed. Please check your internet connection."
        );
      } else {
        throw new Error(`Failed to send email: ${error.message}`);
      }
    }
  }

  /**
   * Send a welcome email to new user
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {Object} userData - Additional user data
   * @returns {Promise} Email sending result
   */
  async sendWelcomeEmail(email, name, userData = {}) {
    try {
      const html = await this.renderTemplate("welcome", {
        name,
        email,
        ...userData,
      });

      const mailOptions = {
        to: email,
        subject: "Welcome to Medh Learning Platform",
        html,
      };

      return this.sendEmail(mailOptions);
    } catch (error) {
      logger.email.error("Failed to send welcome email", { error, email });
      throw error;
    }
  }

  /**
   * Send a password reset email
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {string} tempPassword - Temporary password
   * @returns {Promise} Email sending result
   */
  async sendPasswordResetEmail(email, name, tempPassword) {
    try {
      const html = await this.renderTemplate("password-reset", {
        name,
        email,
        tempPassword,
        expiryTime: "1 hour",
      });

      const mailOptions = {
        to: email,
        subject: "Password Reset - Temporary Password",
        html,
      };

      return this.sendEmail(mailOptions);
    } catch (error) {
      logger.email.error("Failed to send password reset email", {
        error,
        email,
      });
      throw error;
    }
  }

  /**
   * Send an OTP verification email
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {string} otp - One-time password
   * @returns {Promise} Email sending result
   */
  async sendOTPVerificationEmail(email, name, otp) {
    try {
      const html = await this.renderTemplate("email-verification", {
        name,
        email,
        otp,
        expiryTime: "15 minutes",
      });

      const mailOptions = {
        to: email,
        subject: "Email Verification - Medh Learning Platform",
        html,
      };

      return this.sendEmail(mailOptions);
    } catch (error) {
      logger.email.error("Failed to send OTP verification email", {
        error,
        email,
      });
      throw error;
    }
  }

  /**
   * Send a notification email
   * @param {string} email - Recipient email
   * @param {string} subject - Email subject
   * @param {string} message - Email message (HTML string or template name)
   * @param {Object} data - Template data (if message is template name)
   * @returns {Promise} Email sending result
   */
  async sendNotificationEmail(email, subject, message, data = {}) {
    try {
      let html = message;

      // If message looks like a template name (no HTML tags), try to render it
      if (!message.includes("<") && !message.includes(">")) {
        try {
          html = await this.renderTemplate(message, data);
        } catch (templateError) {
          // If template not found, use message as-is
          logger.email.warn(
            `Template not found: ${message}, using message as HTML`,
            {
              templateError,
            },
          );
        }
      }

      const mailOptions = {
        to: email,
        subject,
        html,
      };

      return this.sendEmail(mailOptions);
    } catch (error) {
      logger.email.error("Failed to send notification email", {
        error,
        email,
        subject,
      });
      throw error;
    }
  }

  /**
   * Send a bulk email to multiple recipients
   * @param {Array<string>} emails - List of recipient emails
   * @param {string} subject - Email subject
   * @param {string} templateName - Template name
   * @param {Object} templateData - Template data
   * @returns {Promise<Array>} Results of all email jobs
   */
  async sendBulkEmail(
    emails,
    subject,
    templateName,
    templateData = {}
  ) {
    if (!Array.isArray(emails) || emails.length === 0) {
      throw new Error("Emails must be a non-empty array");
    }

    try {
      const html = await this.renderTemplate(templateName, templateData);

      const results = await Promise.allSettled(
        emails.map((email) => {
          const mailOptions = {
            to: email,
            subject,
            html,
          };

          return this.sendEmail(mailOptions);
        })
      );

      // Count successes and failures
      const summary = results.reduce(
        (acc, result) => {
          if (result.status === "fulfilled") {
            acc.success++;
          } else {
            acc.failed++;
          }
          return acc;
        },
        { success: 0, failed: 0, total: emails.length },
      );

      logger.email.info("Bulk email processed", { summary });

      return {
        success: true,
        summary,
        results,
      };
    } catch (error) {
      logger.email.error("Failed to process bulk email", {
        error,
        recipientCount: emails.length,
        subject,
      });
      throw error;
    }
  }

  // Alias for backward compatibility
  async sendEmailDirectly(mailOptions) {
    return this.sendEmail(mailOptions);
  }

  // Alias for backward compatibility
  async queueEmail(mailOptions, options = {}) {
    logger.email.warn("queueEmail is deprecated, using direct send instead", {
      options,
    });
    return this.sendEmail(mailOptions);
  }
}

export default EmailService;
