import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

import Bull from "bull";
import Handlebars from "handlebars";
import nodemailer from "nodemailer";
import { createClient } from 'redis';

import logger from "../utils/logger.js";
import cache from "../utils/cache.js";
import registerTemplateHelpers from "../utils/templateHelpers.js";
import { isRedisEnabled } from "../utils/cache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readFileAsync = promisify(fs.readFile);

// Constants for email queue configuration
const EMAIL_QUEUE_NAME = "email-queue";
const EMAIL_QUEUE_CONCURRENCY = parseInt(process.env.EMAIL_QUEUE_CONCURRENCY, 10) || 5;
const EMAIL_RETRY_ATTEMPTS = parseInt(process.env.EMAIL_RETRY_ATTEMPTS, 10) || 3;
const EMAIL_RETRY_DELAY = parseInt(process.env.EMAIL_RETRY_DELAY, 10) || 60 * 1000; // 1 minute in ms
const EMAIL_JOB_TIMEOUT = parseInt(process.env.EMAIL_JOB_TIMEOUT, 10) || 30 * 1000; // 30 seconds

/**
 * Email Service
 * Robust implementation for handling email operations with Redis-based queuing
 */
class EmailService {
  constructor() {
    // Initialize AWS SES or standard SMTP transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "email-smtp.us-east-1.amazonaws.com",
      port: process.env.EMAIL_PORT || 465,
      secure: process.env.EMAIL_SECURE === "true" || true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Set connection pool settings for better performance
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      // Set timeouts
      connectionTimeout: 10000, // 10 seconds
      socketTimeout: 30000, // 30 seconds
      // Enable debug if needed
      debug: process.env.EMAIL_DEBUG === "true" || false,
    });

    // Initialize template cache
    this.templateCache = new Map();

    // Register template helpers
    registerTemplateHelpers();

    // Initialize the email queue if Redis is available
    this.initializeQueue();

    // Verify connection
    this.verifyConnection();
  }

  /**
   * Initialize email queue with Bull and Redis
   */
  initializeQueue() {
    try {
      // Force Redis to be enabled for email service
      const redisIsEnabled = true; // Override any environment variable issues
      console.log('Email service forcing Redis enabled:', redisIsEnabled);
      
      if (redisIsEnabled) {
        // Configure direct Redis client (bypassing cache module)
        const redisOptions = {
          host: process.env.REDIS_HOST || "localhost",
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD
        };
        
        logger.email.info("Initializing email queue with Redis", {
          host: redisOptions.host,
          port: redisOptions.port
        });
        
        // Configure Bull queue with direct Redis options
        this.queue = new Bull(EMAIL_QUEUE_NAME, {
          redis: redisOptions,
          defaultJobOptions: {
            attempts: EMAIL_RETRY_ATTEMPTS,
            backoff: {
              type: "exponential",
              delay: EMAIL_RETRY_DELAY,
            },
            timeout: EMAIL_JOB_TIMEOUT,
            removeOnComplete: true,
            removeOnFail: process.env.EMAIL_KEEP_FAILED_JOBS !== "true",
          },
        });

        // Process emails from the queue
        this.queue.process(EMAIL_QUEUE_CONCURRENCY, async (job) => {
          const { mailOptions } = job.data;
          return this.sendEmailDirectly(mailOptions);
        });

        // Add event listeners to queue for monitoring
        this.setupQueueListeners();

        logger.email.info("Email queue initialized successfully");
      } else {
        logger.email.warn("Redis not enabled - Using direct email sending without queuing");
      }
    } catch (error) {
      logger.email.error("Failed to initialize email queue", { error });
    }
  }

  /**
   * Setup queue event listeners for monitoring and logging
   */
  setupQueueListeners() {
    if (!this.queue) return;

    this.queue.on("error", (error) => {
      logger.email.error("Email queue error", { error });
    });

    this.queue.on("failed", (job, error) => {
      const { to, subject } = job.data.mailOptions;
      logger.email.error(`Failed to send email to ${to}`, { 
        error, 
        subject,
        attemptsMade: job.attemptsMade,
        jobId: job.id
      });
    });

    this.queue.on("completed", (job) => {
      const { to, subject } = job.data.mailOptions;
      logger.email.info(`Successfully sent queued email to ${to}`, { 
        subject,
        jobId: job.id
      });
    });

    // Monitor queue health periodically
    setInterval(async () => {
      try {
        const jobCounts = await this.queue.getJobCounts();
        logger.email.debug("Email queue status", { jobCounts });
      } catch (error) {
        logger.email.error("Failed to get queue statistics", { error });
      }
    }, 5 * 60 * 1000); // Every 5 minutes
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
   * Send an email through the queue or directly
   * @param {Object} mailOptions - Email options (from, to, subject, html)
   * @param {Object} options - Additional options
   * @returns {Promise} Email sending result
   */
  async sendEmail(mailOptions, options = {}) {
    // Ensure we have a valid FROM address
    if (!mailOptions.from) {
      // If EMAIL_FROM is set, use it
      if (process.env.EMAIL_FROM) {
        mailOptions.from = process.env.EMAIL_FROM;
      } 
      // If EMAIL_USER is set, use it with a friendly name
      else if (process.env.EMAIL_USER) {
        mailOptions.from = `"Medh Platform" <${process.env.EMAIL_USER}>`;
      }
      // Fallback to a default
      else {
        mailOptions.from = '"Medh Platform" <noreply@medh.co>';
      }
    }

    // Add text version if only HTML is provided
    if (mailOptions.html && !mailOptions.text) {
      // Simple HTML to text conversion
      mailOptions.text = mailOptions.html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Check if this is a high-priority email
    const priority = options.priority || "normal";
    
    // Always use the queue if it exists
    const useQueue = options.useQueue !== false && this.queue;

    try {
      if (useQueue) {
        return await this.queueEmail(mailOptions, {
          priority,
          attempts: options.attempts || EMAIL_RETRY_ATTEMPTS,
          delay: options.delay || 0,
        });
      } else {
        // Fallback to direct sending if queue is not available
        return await this.sendEmailDirectly(mailOptions);
      }
    } catch (error) {
      // Log the error but don't throw it to the caller unless specified
      logger.email.error(`Email dispatch error for ${mailOptions.to}`, {
        error,
        subject: mailOptions.subject,
      });
      
      if (options.throwErrors) {
        throw error;
      }
      
      return {
        success: false,
        error: error.message,
      };
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

      return this.sendEmail(mailOptions, { priority: "high" });
    } catch (error) {
      logger.email.error("Failed to send welcome email", { error, email });
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {string} tempPassword - Temporary password
   * @returns {Promise} Email sending result
   */
  async sendPasswordResetEmail(email, name, tempPassword) {
    try {
      const html = await this.renderTemplate("reset-password", {
        name,
        email,
        tempPassword,
        expiryHours: process.env.PASSWORD_RESET_EXPIRY_HOURS || 24,
      });

      const mailOptions = {
        to: email,
        subject: "Password Reset - Medh Learning Platform",
        html,
      };

      return this.sendEmail(mailOptions, { priority: "high" });
    } catch (error) {
      logger.email.error("Failed to send password reset email", {
        error,
        email,
      });
      throw error;
    }
  }

  /**
   * Send OTP verification email
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
        expiryMinutes: process.env.OTP_EXPIRY_MINUTES || 10,
      });

      const mailOptions = {
        to: email,
        subject: "Verify Your Email - Medh Learning Platform",
        html,
      };

      return this.sendEmail(mailOptions, { priority: "high" });
    } catch (error) {
      logger.email.error("Failed to send OTP verification email", {
        error,
        email,
      });
      throw error;
    }
  }

  /**
   * Send notification email
   * @param {string} email - Recipient email
   * @param {string} subject - Email subject
   * @param {string} message - Email message
   * @param {Object} data - Additional data
   * @returns {Promise} Email sending result
   */
  async sendNotificationEmail(email, subject, message, data = {}) {
    try {
      const html = await this.renderTemplate("notification", {
        message,
        ...data,
      });

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
   * Send bulk emails (with rate limiting)
   * @param {Array<string>} emails - List of recipient emails
   * @param {string} subject - Email subject
   * @param {string} templateName - Template name
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>} Results summary
   */
  async sendBulkEmail(
    emails,
    subject,
    templateName,
    templateData = {}
  ) {
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      throw new Error("Invalid email recipients");
    }

    try {
      // Render template once for all emails (if same content for all)
      const html = await this.renderTemplate(templateName, templateData);

      const results = {
        total: emails.length,
        queued: 0,
        failed: 0,
        errors: [],
      };

      // Rate limit - using batch processing
      const batchSize = parseInt(process.env.EMAIL_BATCH_SIZE, 10) || 50;
      const batchDelay = parseInt(process.env.EMAIL_BATCH_DELAY, 10) || 1000; // 1 second

      // Process in batches
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        // Process each email in the batch
        const batchPromises = batch.map(async (email, index) => {
          try {
            const mailOptions = {
              to: email,
              subject,
              html,
            };

            // Add small delay between emails in batch to avoid rate limiting
            const delay = index * (batchDelay / batchSize);
            
            await this.sendEmail(mailOptions, { 
              delay,
              priority: "low", // Bulk emails are lower priority
            });
            
            results.queued++;
            return { email, success: true };
          } catch (error) {
            results.failed++;
            results.errors.push({ email, error: error.message });
            return { email, success: false, error: error.message };
          }
        });

        // Wait for batch to complete
        await Promise.all(batchPromises);
        
        // Add delay between batches
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
      }

      logger.email.info(`Bulk email sending complete`, {
        subject,
        total: results.total,
        queued: results.queued,
        failed: results.failed,
      });

      return results;
    } catch (error) {
      logger.email.error("Bulk email sending failed", {
        error,
        subject,
        recipientsCount: emails.length,
      });
      throw error;
    }
  }

  /**
   * Send an email directly (bypassing the queue)
   * @param {Object} mailOptions - Email options
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
      logger.email.error(`Failed to send email directly to ${recipient}`, {
        error,
        subject: mailOptions.subject,
      });

      // Provide specific error messages for common issues
      if (error.code === "EAUTH") {
        throw new Error(
          "Email authentication failed. Please check your email credentials."
        );
      } else if (error.code === "ESOCKET") {
        throw new Error(
          "Email connection failed. Please check your internet connection."
        );
      } else if (error.code === "EENVELOPE") {
        throw new Error(
          "Invalid envelope parameters (possibly invalid recipient email)."
        );
      } else {
        throw new Error(`Failed to send email: ${error.message}`);
      }
    }
  }

  /**
   * Queue an email for sending
   * @param {Object} mailOptions - Email options
   * @param {Object} options - Queue options
   * @returns {Promise} Queue result
   */
  async queueEmail(mailOptions, options = {}) {
    if (!this.queue) {
      // Fallback to direct sending if queue is not available
      return this.sendEmailDirectly(mailOptions);
    }

    const jobOptions = {
      priority: options.priority === "high" ? 1 : options.priority === "low" ? 10 : 5,
      attempts: options.attempts || EMAIL_RETRY_ATTEMPTS,
      delay: options.delay || 0,
    };

    const recipient =
      typeof mailOptions.to === "string"
        ? mailOptions.to
        : Array.isArray(mailOptions.to)
          ? mailOptions.to.join(", ")
          : "unknown";

    try {
      logger.email.debug(`Queuing email to ${recipient}`, {
        subject: mailOptions.subject,
        priority: jobOptions.priority,
      });

      const job = await this.queue.add(
        { mailOptions },
        jobOptions
      );

      return {
        success: true,
        queued: true,
        jobId: job.id,
      };
    } catch (error) {
      logger.email.error(`Failed to queue email to ${recipient}`, {
        error,
        subject: mailOptions.subject,
      });
      throw new Error(`Failed to queue email: ${error.message}`);
    }
  }
  
  /**
   * Get email queue statistics
   * @returns {Promise<Object>} Queue stats
   */
  async getQueueStats() {
    if (!this.queue) {
      return {
        enabled: false,
        message: "Email queue not enabled",
      };
    }
    
    try {
      const [jobCounts, workers, isPaused] = await Promise.all([
        this.queue.getJobCounts(),
        this.queue.getWorkers(),
        this.queue.isPaused(),
      ]);
      
      return {
        enabled: true,
        isPaused,
        workers: workers.length,
        jobs: jobCounts,
      };
    } catch (error) {
      logger.email.error("Failed to get queue statistics", { error });
      return {
        enabled: true,
        error: error.message,
      };
    }
  }
}

export default EmailService;
