import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

import Queue from "bull";
import Handlebars from "handlebars";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";

import logger from "../utils/logger.js";
import registerTemplateHelpers from "../utils/templateHelpers.js";

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds
const EMAIL_QUEUE_NAME = "email-queue";
const EMAIL_CONCURRENCY = 5;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readFileAsync = promisify(fs.readFile);

/**
 * Email Service
 * Industry-standard implementation for handling email operations
 */
class EmailService {
  constructor() {
    // Initialize transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === "true" || true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      pool: true, // Use pooled connections
      maxConnections: 5, // Maximum number of connections to use
      rateDelta: 1000, // Define how many messages to send in rateDelta time
      rateLimit: 5, // Max number of messages per rateDelta
    });

    // Initialize template cache
    this.templateCache = new Map();

    // Register template helpers
    registerTemplateHelpers();

    // Initialize email queue
    this.emailQueue = new Queue(EMAIL_QUEUE_NAME, {
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        attempts: MAX_RETRIES,
        backoff: {
          type: "exponential",
          delay: RETRY_DELAY,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    // Process queue
    this.emailQueue.process(EMAIL_CONCURRENCY, async (job) => {
      return this.processEmailJob(job);
    });

    // Define queue event handlers
    this.setupQueueEvents();

    // Verify connection
    this.verifyConnection();
  }

  /**
   * Setup email queue event handlers
   */
  setupQueueEvents() {
    this.emailQueue.on("completed", (job) => {
      logger.email.info("Email job completed", {
        jobId: job.id,
        emailId: job.data.emailId,
        recipient: job.data.mailOptions.to,
      });
    });

    this.emailQueue.on("failed", (job, error) => {
      logger.email.error("Email job failed", {
        jobId: job.id,
        emailId: job.data.emailId,
        recipient: job.data.mailOptions.to,
        error: error.message,
        attempts: job.attemptsMade,
      });
    });

    this.emailQueue.on("error", (error) => {
      logger.email.error("Email queue error", { error });
    });
  }

  /**
   * Verify the email service connection
   */
  verifyConnection() {
    this.transporter.verify((error, _success) => {
      if (error) {
        logger.email.error("Configuration error", { error });
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
   * Process email job from queue
   * @param {Object} job - Queue job
   * @returns {Promise} Email sending result
   */
  async processEmailJob(job) {
    const { mailOptions, attemptsMade } = job.data;

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      // Log detailed error information
      logger.email.error("Failed to send email in job processor", {
        error,
        attemptsMade,
        maxRetries: MAX_RETRIES,
        recipient: mailOptions.to,
        subject: mailOptions.subject,
      });

      // If max retries reached, send a notification to admin
      if (attemptsMade >= MAX_RETRIES - 1) {
        this.notifyAdminOfFailure(mailOptions, error);
      }

      // Re-throw error to trigger retry mechanism
      throw error;
    }
  }

  /**
   * Notify admin about persistent email failures
   * @param {Object} mailOptions - Original mail options
   * @param {Error} error - Error object
   */
  async notifyAdminOfFailure(mailOptions, error) {
    try {
      // Only if admin email is different from the recipient
      if (
        process.env.ADMIN_EMAIL &&
        process.env.ADMIN_EMAIL !== mailOptions.to
      ) {
        const adminNotification = {
          from: process.env.EMAIL_USER,
          to: process.env.ADMIN_EMAIL,
          subject: `[ALERT] Failed email to ${mailOptions.to}`,
          html: `
            <h2>Email Delivery Failure</h2>
            <p><strong>Recipient:</strong> ${mailOptions.to}</p>
            <p><strong>Subject:</strong> ${mailOptions.subject}</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          `,
        };

        await this.transporter.sendMail(adminNotification);
        logger.email.info("Admin notification sent for email failure", {
          admin: process.env.ADMIN_EMAIL,
          originalRecipient: mailOptions.to,
        });
      }
    } catch (notifyError) {
      logger.email.error("Failed to notify admin of email failure", {
        error: notifyError,
      });
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
   * Queue an email for sending
   * @param {Object} mailOptions - Email options (from, to, subject, html)
   * @param {Object} options - Additional options (priority, delay)
   * @returns {Promise<Object>} Job details
   */
  async queueEmail(mailOptions, options = {}) {
    const defaultSender = process.env.EMAIL_USER;
    const emailId = uuidv4();

    // Set default sender if not provided
    if (!mailOptions.from) {
      mailOptions.from = defaultSender;
    }

    // Add text version if only HTML is provided
    if (mailOptions.html && !mailOptions.text) {
      // Simple HTML to text conversion
      mailOptions.text = mailOptions.html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Add default headers for tracking
    mailOptions.headers = {
      ...mailOptions.headers,
      "X-Email-ID": emailId,
      "X-Mailer": "Medh-Platform",
    };

    const recipient =
      typeof mailOptions.to === "string"
        ? mailOptions.to
        : Array.isArray(mailOptions.to)
          ? mailOptions.to.join(", ")
          : "unknown";

    try {
      const jobOptions = {
        priority: options.priority || "normal",
        delay: options.delay || 0,
        attempts: options.attempts || MAX_RETRIES,
      };

      logger.email.debug(`Queueing email to ${recipient}`, {
        emailId,
        subject: mailOptions.subject,
        recipientCount: Array.isArray(mailOptions.to)
          ? mailOptions.to.length
          : 1,
      });

      const job = await this.emailQueue.add(
        {
          mailOptions,
          emailId,
          timestamp: Date.now(),
          attemptsMade: 0,
        },
        jobOptions,
      );

      return {
        success: true,
        jobId: job.id,
        emailId,
      };
    } catch (error) {
      logger.email.error(`Failed to queue email to ${recipient}`, {
        error,
        emailId,
        subject: mailOptions.subject,
      });
      throw new Error(`Failed to queue email: ${error.message}`);
    }
  }

  /**
   * Send an email immediately (bypassing queue)
   * @param {Object} mailOptions - Email options (from, to, subject, html)
   * @returns {Promise} Email sending result
   */
  async sendEmailDirectly(mailOptions) {
    const recipient =
      typeof mailOptions.to === "string"
        ? mailOptions.to
        : Array.isArray(mailOptions.to)
          ? mailOptions.to.join(", ")
          : "unknown";

    try {
      logger.email.debug(`Sending email directly to ${recipient}`, {
        subject: mailOptions.subject,
        recipientCount: Array.isArray(mailOptions.to)
          ? mailOptions.to.length
          : 1,
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
          "Email authentication failed. Please check your email credentials.",
        );
      } else if (error.code === "ESOCKET") {
        throw new Error(
          "Email connection failed. Please check your internet connection.",
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

      return this.queueEmail(mailOptions, { priority: "high" });
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

      return this.queueEmail(mailOptions, { priority: "high" });
    } catch (error) {
      logger.email.error("Failed to send password reset email", {
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

      return this.queueEmail(mailOptions);
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
   * @param {Object} options - Additional options (priority, delay)
   * @returns {Promise<Array>} Results of all email jobs
   */
  async sendBulkEmail(
    emails,
    subject,
    templateName,
    templateData = {},
    options = {},
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

          return this.queueEmail(mailOptions, options);
        }),
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

  /**
   * Get the status of the email queue
   * @returns {Promise<Object>} Queue status
   */
  async getQueueStatus() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.emailQueue.getWaitingCount(),
        this.emailQueue.getActiveCount(),
        this.emailQueue.getCompletedCount(),
        this.emailQueue.getFailedCount(),
        this.emailQueue.getDelayedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    } catch (error) {
      logger.email.error("Failed to get queue status", { error });
      throw error;
    }
  }
}

export default EmailService;
