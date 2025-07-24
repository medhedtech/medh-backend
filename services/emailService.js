import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

import { Queue, Worker } from "bullmq";
import Handlebars from "handlebars";
import nodemailer from "nodemailer";
import { createClient, createCluster } from "redis";

import logger from "../utils/logger.js";
import cache, { isRedisEnabled } from "../utils/cache.js";
import registerTemplateHelpers from "../utils/templateHelpers.js";
import { serviceCircuitBreakers } from "../utils/circuitBreaker.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readFileAsync = promisify(fs.readFile);

// Constants for email queue configuration with modern BullMQ optimizations
const EMAIL_QUEUE_NAME = "email-queue";
const EMAIL_QUEUE_CONCURRENCY =
  parseInt(process.env.EMAIL_QUEUE_CONCURRENCY, 10) || 10; // Increased for better throughput
const EMAIL_RETRY_ATTEMPTS =
  parseInt(process.env.EMAIL_RETRY_ATTEMPTS, 10) || 5; // More attempts for better reliability
const EMAIL_RETRY_DELAY =
  parseInt(process.env.EMAIL_RETRY_DELAY, 10) || 30 * 1000; // 30 seconds initial delay
const EMAIL_JOB_TIMEOUT =
  parseInt(process.env.EMAIL_JOB_TIMEOUT, 10) || 60 * 1000; // 60 seconds for complex templates
const EMAIL_RATE_LIMIT_MAX =
  parseInt(process.env.EMAIL_RATE_LIMIT_MAX, 10) || 100; // Max emails per window
const EMAIL_RATE_LIMIT_WINDOW =
  parseInt(process.env.EMAIL_RATE_LIMIT_WINDOW, 10) || 60 * 1000; // 1 minute window
const EMAIL_BATCH_SIZE = parseInt(process.env.EMAIL_BATCH_SIZE, 10) || 50; // Batch processing size
const EMAIL_PRIORITY_HIGH = 1;
const EMAIL_PRIORITY_NORMAL = 5;
const EMAIL_PRIORITY_LOW = 10;

/**
 * Advanced Email Service with BullMQ Integration
 * Modern implementation following 2025 best practices for high-performance email processing
 */
class EmailService {
  constructor() {
    // Initialize service state
    this.queue = null;
    this.worker = null;
    this.redisConnection = null;
    this.isInitialized = false;
    this.stats = {
      sent: 0,
      failed: 0,
      queued: 0,
      processed: 0,
      startTime: Date.now(),
    };

    // Initialize with comprehensive error handling
    try {
      // Log email config for debugging (without credentials)
      logger.email.debug("Configuring email transport with:", {
        host: process.env.EMAIL_HOST || "email-smtp.us-east-1.amazonaws.com",
        port: process.env.EMAIL_PORT || 465,
        secure: process.env.EMAIL_SECURE === "true" || true,
        user: process.env.EMAIL_USER ? "Set" : "Not set",
        pass: process.env.EMAIL_PASS ? "Set" : "Not set",
        pooling: true,
      });

      // Initialize high-performance SMTP transporter with connection pooling
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "email-smtp.us-east-1.amazonaws.com",
        port: parseInt(process.env.EMAIL_PORT, 10) || 465,
        secure: process.env.EMAIL_SECURE === "true" || true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        // Advanced connection pool settings for high throughput
        pool: true,
        maxConnections: parseInt(process.env.EMAIL_MAX_CONNECTIONS, 10) || 5,
        maxMessages: parseInt(process.env.EMAIL_MAX_MESSAGES, 10) || 100,
        rateLimit: parseInt(process.env.EMAIL_RATE_LIMIT, 10) || 14, // SES limit is 14 emails/second
        // Optimized timeout settings
        connectionTimeout:
          parseInt(process.env.EMAIL_CONNECTION_TIMEOUT, 10) || 30000,
        greetingTimeout:
          parseInt(process.env.EMAIL_GREETING_TIMEOUT, 10) || 30000,
        socketTimeout: parseInt(process.env.EMAIL_SOCKET_TIMEOUT, 10) || 60000,
        // Enhanced TLS settings for better compatibility
        requireTLS: true,
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === "production",
          minVersion: "TLSv1.2",
        },
        // Performance monitoring
        debug: process.env.NODE_ENV === "development",
        logger: process.env.NODE_ENV === "development",
        // Retry configuration for failed connections
        retry: {
          times: 3,
          delay: 1000,
        },
      });

      // Enhanced transporter with health monitoring
      this.transporter.on("idle", () => {
        logger.email.debug("Email transporter is idle and ready");
      });
    } catch (error) {
      logger.email.error("Failed to initialize email transporter", {
        error: error.message,
        stack: error.stack,
      });

      // Create a resilient fallback transporter
      this.transporter = this.createFallbackTransporter();
    }

    // Initialize template cache with LRU eviction
    this.templateCache = new Map();
    this.maxTemplateCache =
      parseInt(process.env.EMAIL_TEMPLATE_CACHE_SIZE, 10) || 50;

    // Register template helpers
    registerTemplateHelpers();

    // Initialize the email queue system
    this.initializeQueue();

    // Verify connection with retry logic
    this.verifyConnection();

    // Create circuit breaker for direct email sending
    this.sendEmailDirectlyWithCircuitBreaker = serviceCircuitBreakers.email(
      // Main function
      async (mailOptions) => {
        return await this.sendEmailDirectly(mailOptions);
      },
      // Fallback function
      async (mailOptions) => {
        logger.email.warn("Email circuit breaker open, using fallback", {
          to: mailOptions.to,
          subject: mailOptions.subject,
        });

        try {
          // Store in persistent storage for later retry
          await this.storeFailedEmailForRetry(mailOptions);

          return {
            success: false,
            queued: true,
            message:
              "Email service unavailable, message stored for later delivery",
          };
        } catch (fallbackError) {
          logger.email.error("Email fallback also failed", {
            error: fallbackError.message,
          });

          return {
            success: false,
            queued: false,
            message: "Email service unavailable and fallback storage failed",
          };
        }
      },
    );

    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }

  /**
   * Create fallback transporter for error scenarios
   */
  createFallbackTransporter() {
    return {
      sendMail: async (mailOptions) => {
        logger.email.warn(
          "Using fallback transporter - email not actually sent:",
          {
            to: mailOptions.to,
            subject: mailOptions.subject,
            timestamp: new Date().toISOString(),
          },
        );

        // Store email for manual processing if needed
        await this.storeFailedEmailForRetry(mailOptions);

        return {
          messageId: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          response: "Fallback mode - email stored for later processing",
        };
      },
      verify: async () => false,
      close: () => {},
    };
  }

  /**
   * Initialize advanced email queue system with BullMQ
   */
  async initializeQueue() {
    try {
      // Check Redis availability with enhanced detection
      const redisIsEnabled = this.checkRedisAvailability();
      logger.email.info("Email service Redis availability check:", {
        enabled: redisIsEnabled,
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
      });

      if (!redisIsEnabled) {
        logger.email.warn(
          "Redis not available - Using direct email sending without queuing",
        );
        this.queue = null;
        return;
      }

      // Create optimized Redis connection for BullMQ
      const redisConfig = this.createRedisConfig();

      // Initialize BullMQ components
      await this.initializeBullMQComponents(redisConfig);

      logger.email.info(
        "Advanced email queue system initialized successfully with BullMQ",
      );
      this.isInitialized = true;
    } catch (error) {
      logger.email.error("Failed to initialize email queue system", {
        error: error.message,
        stack: error.stack,
      });

      // Graceful degradation - disable queue but continue service
      this.queue = null;
      this.worker = null;
      this.isInitialized = false;
    }
  }

  /**
   * Create optimized Redis configuration for BullMQ
   */
  createRedisConfig() {
    const baseConfig = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      db: parseInt(process.env.REDIS_EMAIL_DB, 10) || 1, // Separate DB for email queue
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 10000,
      commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT, 10) || 5000,
      lazyConnect: false,
      keepAlive: true,
      // BullMQ specific optimizations
      maxmemoryPolicy: "allkeys-lru",
      keyPrefix: process.env.REDIS_KEY_PREFIX || "email:",
    };

    // Add authentication if provided
    if (process.env.REDIS_PASSWORD) {
      baseConfig.password = process.env.REDIS_PASSWORD;
    }
    if (process.env.REDIS_USERNAME) {
      baseConfig.username = process.env.REDIS_USERNAME;
    }

    // Cluster configuration if enabled
    if (process.env.REDIS_CLUSTER_ENABLED === "true") {
      const clusterNodes = process.env.REDIS_CLUSTER_NODES?.split(",").map(
        (node) => {
          const [host, port] = node.trim().split(":");
          return {
            host: host || "localhost",
            port: parseInt(port, 10) || 6379,
          };
        },
      ) || [{ host: baseConfig.host, port: baseConfig.port }];

      return {
        cluster: {
          enableReadyCheck: false,
          redisOptions: baseConfig,
          clusterRetryDelayOnFailover: 100,
          clusterRetryDelayOnClusterDown: 300,
          clusterMaxRedirections: 3,
          scaleReads: "slave",
        },
        nodes: clusterNodes,
      };
    }

    return baseConfig;
  }

  /**
   * Initialize BullMQ components (Queue, Worker, Scheduler)
   */
  async initializeBullMQComponents(redisConfig) {
    // Initialize Queue for job management
    this.queue = new Queue(EMAIL_QUEUE_NAME, {
      connection: redisConfig.cluster ? undefined : redisConfig,
      ...(redisConfig.cluster && { connection: redisConfig }),
      defaultJobOptions: {
        attempts: EMAIL_RETRY_ATTEMPTS,
        backoff: {
          type: "exponential",
          delay: EMAIL_RETRY_DELAY,
        },
        removeOnComplete: parseInt(process.env.EMAIL_KEEP_COMPLETED, 10) || 100,
        removeOnFail: parseInt(process.env.EMAIL_KEEP_FAILED, 10) || 50,
      },
    });

    // Initialize Worker for job processing
    this.worker = new Worker(
      EMAIL_QUEUE_NAME,
      async (job) => {
        return await this.processEmailJob(job);
      },
      {
        connection: redisConfig.cluster ? redisConfig : redisConfig,
        concurrency: EMAIL_QUEUE_CONCURRENCY,
        limiter: {
          max: EMAIL_RATE_LIMIT_MAX,
          duration: EMAIL_RATE_LIMIT_WINDOW,
        },
        // Advanced worker settings
        stalledInterval: 30000, // 30 seconds
        maxStalledCount: 1,
      },
    );

    // Note: QueueScheduler is deprecated in BullMQ v5+, delayed jobs are handled automatically by the queue

    // Setup comprehensive event handlers
    this.setupAdvancedQueueListeners();

    logger.email.info("BullMQ components initialized", {
      queue: !!this.queue,
      worker: !!this.worker,
      concurrency: EMAIL_QUEUE_CONCURRENCY,
      rateLimit: `${EMAIL_RATE_LIMIT_MAX}/${EMAIL_RATE_LIMIT_WINDOW}ms`,
    });
  }

  /**
   * Process individual email jobs with enhanced error handling
   */
  async processEmailJob(job) {
    const startTime = Date.now();
    const {
      mailOptions,
      priority = EMAIL_PRIORITY_NORMAL,
      metadata = {},
    } = job.data;

    try {
      // Update job progress
      await job.updateProgress(10);

      logger.email.debug(`Processing email job ${job.id}`, {
        to: mailOptions.to,
        subject: mailOptions.subject,
        priority,
        attempt: job.attemptsMade + 1,
      });

      // Add job context to mail options
      const enhancedMailOptions = {
        ...mailOptions,
        headers: {
          ...mailOptions.headers,
          "X-Job-ID": job.id,
          "X-Queue-Name": EMAIL_QUEUE_NAME,
          "X-Priority": priority.toString(),
        },
      };

      await job.updateProgress(30);

      // Send email with circuit breaker protection
      const result =
        await this.sendEmailDirectlyWithCircuitBreaker(enhancedMailOptions);

      await job.updateProgress(90);

      // Update statistics
      this.stats.processed++;
      if (result.success !== false) {
        this.stats.sent++;
      }

      await job.updateProgress(100);

      const processingTime = Date.now() - startTime;
      logger.email.info(`Email job ${job.id} completed successfully`, {
        to: mailOptions.to,
        processingTime: `${processingTime}ms`,
        messageId: result.messageId,
      });

      return {
        success: true,
        messageId: result.messageId,
        processingTime,
        timestamp: new Date().toISOString(),
        ...result,
      };
    } catch (error) {
      this.stats.failed++;

      logger.email.error(`Email job ${job.id} failed`, {
        error: error.message,
        to: mailOptions.to,
        subject: mailOptions.subject,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
        processingTime: `${Date.now() - startTime}ms`,
      });

      // Store failed job details for analysis
      await this.storeFailedJobAnalytics(job, error);

      throw error; // Re-throw for BullMQ retry handling
    }
  }

  /**
   * Check if Redis is available for the email service
   * @returns {boolean} Whether Redis is available
   */
  checkRedisAvailability() {
    try {
      // Check if we're in development and Redis might not be available
      if (process.env.NODE_ENV === "development") {
        // In development, allow fallback to direct email sending
        const redisHost = process.env.REDIS_HOST;
        if (!redisHost || redisHost === "api.medh.co") {
          // If Redis host is external and we're in development, likely not available
          return false;
        }
      }

      // Check if Redis environment variables are properly set
      if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
        return false;
      }

      return true;
    } catch (error) {
      logger.email.error("Error checking Redis availability", { error });
      return false;
    }
  }

  /**
   * Setup advanced queue event listeners with comprehensive monitoring
   */
  setupAdvancedQueueListeners() {
    if (!this.queue || !this.worker) return;

    // Queue-level events
    this.queue.on("error", (error) => {
      logger.email.error("Email queue error", {
        error: error.message,
        stack: error.stack,
        queueName: EMAIL_QUEUE_NAME,
      });
    });

    // Worker-level events for detailed job monitoring
    this.worker.on("completed", (job, result) => {
      const { to, subject } = job.data.mailOptions;
      logger.email.info(`Email job completed successfully`, {
        jobId: job.id,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        processingTime: result.processingTime,
        messageId: result.messageId,
        attempt: job.attemptsMade + 1,
      });
    });

    this.worker.on("failed", (job, error) => {
      const { to, subject } = job.data.mailOptions;
      logger.email.error(`Email job failed`, {
        jobId: job.id,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        error: error.message,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        isFinalAttempt: job.attemptsMade >= job.opts.attempts,
      });

      // Send alert for final failures
      if (job.attemptsMade >= job.opts.attempts) {
        this.sendFailureAlert(job, error);
      }
    });

    this.worker.on("stalled", (jobId) => {
      logger.email.warn(`Email job stalled`, {
        jobId,
        queueName: EMAIL_QUEUE_NAME,
      });
    });

    this.worker.on("progress", (job, progress) => {
      logger.email.debug(`Email job progress`, {
        jobId: job.id,
        progress: `${progress}%`,
        to: job.data.mailOptions.to,
      });
    });

    // Worker lifecycle events
    this.worker.on("ready", () => {
      logger.email.info("Email worker is ready and processing jobs");
    });

    this.worker.on("closing", () => {
      logger.email.info("Email worker is closing");
    });

    this.worker.on("closed", () => {
      logger.email.info("Email worker has closed");
    });

    // Note: Scheduler events not needed in BullMQ v5+ as scheduling is handled by the queue itself

    // Setup periodic health monitoring with enhanced metrics
    this.setupPeriodicHealthCheck();
  }

  /**
   * Setup periodic health check with comprehensive metrics
   */
  setupPeriodicHealthCheck() {
    const healthCheckInterval =
      parseInt(process.env.EMAIL_HEALTH_CHECK_INTERVAL, 10) || 60000; // 1 minute

    setInterval(async () => {
      try {
        if (!this.queue) return;

        const [waiting, active, completed, failed, delayed] = await Promise.all(
          [
            this.queue.getWaiting(),
            this.queue.getActive(),
            this.queue.getCompleted(),
            this.queue.getFailed(),
            this.queue.getDelayed(),
          ],
        );

        const queueStats = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          total:
            waiting.length +
            active.length +
            completed.length +
            failed.length +
            delayed.length,
        };

        // Calculate service statistics
        const uptime = Date.now() - this.stats.startTime;
        const throughput =
          this.stats.processed > 0
            ? (this.stats.processed / (uptime / 1000 / 60)).toFixed(2)
            : 0; // per minute
        const successRate =
          this.stats.processed > 0
            ? ((this.stats.sent / this.stats.processed) * 100).toFixed(2)
            : 100;

        const serviceStats = {
          ...this.stats,
          uptime: Math.floor(uptime / 1000), // seconds
          throughput: `${throughput}/min`,
          successRate: `${successRate}%`,
        };

        logger.email.debug("Email service health check", {
          queue: queueStats,
          service: serviceStats,
          timestamp: new Date().toISOString(),
        });

        // Alert on concerning metrics
        if (queueStats.failed > 10) {
          logger.email.warn("High number of failed email jobs detected", {
            failedCount: queueStats.failed,
            successRate: serviceStats.successRate,
          });
        }

        if (queueStats.waiting > 100) {
          logger.email.warn("Email queue backlog detected", {
            waitingCount: queueStats.waiting,
            activeCount: queueStats.active,
          });
        }
      } catch (error) {
        logger.email.error("Failed to perform email service health check", {
          error: error.message,
        });
      }
    }, healthCheckInterval);
  }

  /**
   * Send failure alert for critical email failures
   */
  async sendFailureAlert(job, error) {
    try {
      // Only send alerts in production to avoid spam in development
      if (process.env.NODE_ENV !== "production") return;

      const alertRecipients =
        process.env.EMAIL_ALERT_RECIPIENTS?.split(",") || [];
      if (alertRecipients.length === 0) return;

      const alertSubject = `Email Service Alert: Job ${job.id} Failed Permanently`;
      const alertBody = `
        Email job ${job.id} has failed permanently after ${job.attemptsMade} attempts.
        
        Job Details:
        - Recipient: ${job.data.mailOptions.to}
        - Subject: ${job.data.mailOptions.subject}
        - Queue: ${EMAIL_QUEUE_NAME}
        - Final Error: ${error.message}
        - Timestamp: ${new Date().toISOString()}
        
        Please investigate the email service configuration.
      `;

      // Send alert directly (bypass queue to avoid infinite loops)
      await this.sendEmailDirectly({
        to: alertRecipients,
        subject: alertSubject,
        text: alertBody,
        headers: {
          "X-Alert-Type": "email-service-failure",
          "X-Job-ID": job.id.toString(),
        },
      });
    } catch (alertError) {
      logger.email.error("Failed to send email failure alert", {
        error: alertError.message,
        originalJobId: job.id,
      });
    }
  }

  /**
   * Store failed job analytics for later analysis
   */
  async storeFailedJobAnalytics(job, error) {
    try {
      const analyticsData = {
        jobId: job.id,
        queueName: job.queueName,
        timestamp: new Date().toISOString(),
        recipient: job.data.mailOptions.to,
        subject: job.data.mailOptions.subject,
        error: error.message,
        stack: error.stack,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        jobData: job.data,
      };

      // Store in cache for quick access
      if (cache) {
        const cacheKey = `email:failed:${job.id}`;
        await cache.set(cacheKey, analyticsData, 7 * 24 * 60 * 60); // 7 days
      }

      // Also log for external monitoring systems
      logger.email.error("Email job failure analytics", analyticsData);
    } catch (analyticsError) {
      logger.email.error("Failed to store job analytics", {
        error: analyticsError.message,
        jobId: job.id,
      });
    }
  }

  /**
   * Setup graceful shutdown handling
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.email.info(
        `Received ${signal}, shutting down email service gracefully...`,
      );

      try {
        // Stop accepting new jobs
        if (this.worker) {
          await this.worker.close();
          logger.email.info("Email worker closed successfully");
        }

        // Wait for active jobs to complete (with timeout)
        if (this.queue) {
          const activeJobs = await this.queue.getActive();
          if (activeJobs.length > 0) {
            logger.email.info(
              `Waiting for ${activeJobs.length} active email jobs to complete...`,
            );

            // Wait up to 30 seconds for jobs to complete
            const timeout = setTimeout(() => {
              logger.email.warn(
                "Timeout waiting for active jobs, forcing shutdown",
              );
            }, 30000);

            // Wait for jobs to finish
            await Promise.all(
              activeJobs.map((job) => job.finished().catch(() => {})),
            );
            clearTimeout(timeout);
          }

          await this.queue.close();
          logger.email.info("Email queue closed successfully");
        }

        // Note: Scheduler not used in BullMQ v5+

        // Close transporter
        if (this.transporter && typeof this.transporter.close === "function") {
          this.transporter.close();
          logger.email.info("Email transporter closed successfully");
        }

        logger.email.info("Email service shutdown completed");
        process.exit(0);
      } catch (error) {
        logger.email.error("Error during email service shutdown", {
          error: error.message,
          stack: error.stack,
        });
        process.exit(1);
      }
    };

    // Handle various shutdown signals
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGUSR2", () => shutdown("SIGUSR2")); // Nodemon restart
  }

  /**
   * Verify the email service connection
   */
  verifyConnection() {
    // Skip verification if using the fake transporter
    if (typeof this.transporter.verify !== "function") {
      logger.email.warn(
        "Using failsafe email transporter - skipping verification",
      );
      return;
    }

    this.transporter.verify((error, _success) => {
      if (error) {
        logger.email.error("Email configuration error:", {
          error: error.message,
          code: error.code,
          command: error.command,
        });
        this.handleConnectionError(error);
      } else {
        logger.email.info("Email server is ready to send messages");
        console.log("Email server is ready to send messages");
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
   * Send an email with intelligent routing (queue vs direct)
   * @param {Object} mailOptions - Nodemailer mail options
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(mailOptions, options = {}) {
    try {
      const {
        priority = "normal",
        skipQueue = false,
        delay = 0,
        metadata = {},
        template = null,
        templateData = {},
      } = options;

      // Comprehensive email validation
      this.validateEmailOptions(mailOptions);

      const recipient = Array.isArray(mailOptions.to)
        ? mailOptions.to.join(", ")
        : mailOptions.to;

      // Log the email being processed
      logger.email.info(`Processing email request`, {
        to: recipient,
        subject: mailOptions.subject,
        priority,
        skipQueue,
        hasTemplate: !!template,
        delay: delay > 0 ? `${delay}ms` : "none",
      });

      // Process template if provided
      if (template) {
        mailOptions = await this.processEmailTemplate(
          mailOptions,
          template,
          templateData,
        );
      }

      // Update statistics
      this.stats.queued++;

      // Determine sending strategy
      const shouldUseQueue = this.shouldUseQueue(mailOptions, options);

      if (!shouldUseQueue || skipQueue) {
        logger.email.debug(
          `Sending email directly (queue: ${!!this.queue}, skip: ${skipQueue})`,
        );
        return await this.sendEmailDirectlyWithCircuitBreaker(mailOptions);
      }

      // Queue the email with enhanced options
      return await this.queueEmailAdvanced(mailOptions, {
        priority: this.mapPriorityToNumber(priority),
        delay,
        metadata: {
          ...metadata,
          queuedAt: new Date().toISOString(),
          source: "api",
        },
        ...options,
      });
    } catch (error) {
      this.stats.failed++;

      const recipient = Array.isArray(mailOptions?.to)
        ? mailOptions.to.join(", ")
        : mailOptions?.to || "unknown";

      logger.email.error(`Failed to process email request`, {
        to: recipient,
        subject: mailOptions?.subject || "unknown",
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Validate email options comprehensively
   */
  validateEmailOptions(mailOptions) {
    if (!mailOptions) {
      throw new Error("Mail options are required");
    }

    if (!mailOptions.to) {
      throw new Error("Recipient email address is required");
    }

    if (!mailOptions.subject) {
      throw new Error("Email subject is required");
    }

    if (!mailOptions.html && !mailOptions.text) {
      throw new Error("Email must have either HTML or text content");
    }

    // Validate email addresses
    const recipients = Array.isArray(mailOptions.to)
      ? mailOptions.to
      : [mailOptions.to];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const email of recipients) {
      if (typeof email === "string" && !emailRegex.test(email.trim())) {
        throw new Error(`Invalid email address: ${email}`);
      }
    }

    // Validate subject length
    if (mailOptions.subject.length > 998) {
      throw new Error("Email subject is too long (max 998 characters)");
    }
  }

  /**
   * Determine if email should use queue based on various factors
   */
  shouldUseQueue(mailOptions, options) {
    // No queue available
    if (!this.queue || !this.isInitialized) {
      return false;
    }

    // High priority emails can bypass queue for faster delivery
    if (
      options.priority === "high" &&
      process.env.EMAIL_HIGH_PRIORITY_DIRECT === "true"
    ) {
      return false;
    }

    // Bulk emails should always use queue
    if (Array.isArray(mailOptions.to) && mailOptions.to.length > 1) {
      return true;
    }

    // Delayed emails must use queue
    if (options.delay && options.delay > 0) {
      return true;
    }

    // Template processing benefits from queue
    if (options.template) {
      return true;
    }

    // Default to queue for better throughput and reliability
    return true;
  }

  /**
   * Map priority string to BullMQ priority number
   */
  mapPriorityToNumber(priority) {
    switch (priority.toLowerCase()) {
      case "high":
      case "urgent":
        return EMAIL_PRIORITY_HIGH;
      case "low":
        return EMAIL_PRIORITY_LOW;
      case "normal":
      case "medium":
      default:
        return EMAIL_PRIORITY_NORMAL;
    }
  }

  /**
   * Process email template with caching
   */
  async processEmailTemplate(mailOptions, templateName, templateData) {
    try {
      // Check template cache first
      let template = this.templateCache.get(templateName);

      if (!template) {
        template = await this.loadTemplate(templateName);

        // Implement LRU cache eviction
        if (this.templateCache.size >= this.maxTemplateCache) {
          const firstKey = this.templateCache.keys().next().value;
          this.templateCache.delete(firstKey);
        }

        this.templateCache.set(templateName, template);
      }

      // Render template with data
      const htmlContent = template(templateData);

      return {
        ...mailOptions,
        html: htmlContent,
        // Generate text version if not provided
        text: mailOptions.text || this.htmlToText(htmlContent),
      };
    } catch (error) {
      logger.email.error(`Failed to process email template: ${templateName}`, {
        error: error.message,
        templateData: Object.keys(templateData),
      });
      throw error;
    }
  }

  /**
   * Simple HTML to text conversion
   */
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
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
      // Generate template variables
      const templateData = {
        name,
        email,
        currentYear: new Date().getFullYear(),
        registrationDate: new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        loginUrl: `${process.env.FRONTEND_URL || "https://www.medh.co"}/login`,
        demoUrl: `${process.env.FRONTEND_URL || "https://www.medh.co"}/demo`,
        logoUrl: `${process.env.FRONTEND_URL || "https://www.medh.co"}/assets/logo.png`,
        unsubscribeUrl: `${process.env.FRONTEND_URL || "https://www.medh.co"}/unsubscribe?email=${encodeURIComponent(email)}`,
        privacyPolicyUrl: `${process.env.FRONTEND_URL || "https://www.medh.co"}/privacy-policy`,
        termsUrl: `${process.env.FRONTEND_URL || "https://www.medh.co"}/terms-of-service`,
        discountCode: userData.discountCode || "WELCOME2025", // Default discount code for new users
        ...userData,
      };

      const html = await this.renderTemplate("welcome", templateData);

      const mailOptions = {
        to: email,
        from: process.env.EMAIL_FROM || "care@medh.co",
        subject:
          "Welcome to Medh! Your Journey to Skills Development Begins Now",
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
   * Send beautiful login notification email
   * @param {string} email - Recipient email
   * @param {string} userName - User's name
   * @param {Object} loginDetails - Login details object
   * @param {Object} options - Additional options
   * @returns {Promise} Email sending result
   */
  async sendLoginNotificationEmail(
    email,
    userName,
    loginDetails,
    options = {},
  ) {
    try {
      // Calculate risk level based on login patterns
      const riskLevel = this.calculateLoginRiskLevel(loginDetails, options);

      const templateData = {
        user_name: userName,
        email: email,
        details: {
          Login_Time: loginDetails["Login Time"] || loginDetails.loginTime,
          Location: loginDetails["Location"] || loginDetails.location,
          Device: loginDetails["Device"] || loginDetails.device,
          Browser: loginDetails["Browser"] || loginDetails.browser,
          Operating_System:
            loginDetails["Operating System"] || loginDetails.operatingSystem,
          IP_Address: loginDetails["IP Address"] || loginDetails.ipAddress,
        },
        risk_level: riskLevel,
        actionUrl:
          options.actionUrl ||
          `${process.env.FRONTEND_URL || "https://app.medh.co"}/security`,
        logoutAllUrl:
          options.logoutAllUrl ||
          `${process.env.FRONTEND_URL || "https://app.medh.co"}/logout-all-devices`,
        loginUrl:
          options.loginUrl ||
          `${process.env.FRONTEND_URL || "https://app.medh.co"}/login`,
        helpUrl:
          options.helpUrl ||
          `${process.env.FRONTEND_URL || "https://app.medh.co"}/help`,
        securityUrl:
          options.securityUrl ||
          `${process.env.FRONTEND_URL || "https://app.medh.co"}/security`,
        privacyUrl:
          options.privacyUrl ||
          `${process.env.FRONTEND_URL || "https://app.medh.co"}/privacy`,
        contactUrl:
          options.contactUrl ||
          `${process.env.FRONTEND_URL || "https://app.medh.co"}/contact`,
        currentYear: new Date().getFullYear(),
        recent_activity: options.recentActivity,
      };

      const html = await this.renderTemplate(
        "login-notification",
        templateData,
      );

      let subject = `🔐 New Login Detected - Medh Learning Platform`;
      if (riskLevel === "high") {
        subject = `🚨 Suspicious Login Detected - Immediate Action Required`;
      } else if (riskLevel === "medium") {
        subject = `⚠️ New Login Detected - Please Review`;
      }

      const mailOptions = {
        to: email,
        subject: subject,
        html,
      };

      return this.sendEmail(mailOptions, {
        priority: riskLevel === "high" ? "high" : "normal",
      });
    } catch (error) {
      logger.email.error("Failed to send login notification email", {
        error,
        email,
        userName,
      });
      throw error;
    }
  }

  /**
   * Send beautiful logout all devices notification email
   * @param {string} email - Recipient email
   * @param {string} userName - User's name
   * @param {Object} logoutDetails - Logout details object
   * @param {Object} options - Additional options
   * @returns {Promise} Email sending result
   */
  async sendLogoutAllDevicesEmail(
    email,
    userName,
    logoutDetails,
    options = {},
  ) {
    try {
      const templateData = {
        user_name: userName,
        email: email,
        details: {
          Logout_Time: logoutDetails["Logout Time"] || logoutDetails.logoutTime,
          Location: logoutDetails["Location"] || logoutDetails.location,
          Initiated_From_Device:
            logoutDetails["Initiated From Device"] ||
            logoutDetails.initiatedFromDevice,
          Browser: logoutDetails["Browser"] || logoutDetails.browser,
          Operating_System:
            logoutDetails["Operating System"] || logoutDetails.operatingSystem,
          IP_Address: logoutDetails["IP Address"] || logoutDetails.ipAddress,
          Sessions_Terminated:
            logoutDetails["Sessions Terminated"] ||
            logoutDetails.sessionsTerminated,
        },
        urgent: options.urgent || false,
        security_recommendations: options.securityRecommendations || [
          "Change your password if you suspect unauthorized access",
          "Review your recent login history",
          "Enable two-factor authentication for added security",
          "Use strong, unique passwords for all accounts",
          "Avoid using public computers for sensitive accounts",
          "Regularly monitor your account activity",
        ],
        actionUrl:
          options.actionUrl ||
          `${process.env.FRONTEND_URL || "https://app.medh.co"}/login`,
        supportUrl:
          options.supportUrl ||
          `${process.env.FRONTEND_URL || "https://app.medh.co"}/contact`,
        loginUrl:
          options.loginUrl ||
          `${process.env.FRONTEND_URL || "https://app.medh.co"}/login`,
        helpUrl:
          options.helpUrl ||
          `${process.env.FRONTEND_URL || "https://app.medh.co"}/help`,
        securityUrl:
          options.securityUrl ||
          `${process.env.FRONTEND_URL || "https://app.medh.co"}/security`,
        contactUrl:
          options.contactUrl ||
          `${process.env.FRONTEND_URL || "https://app.medh.co"}/contact`,
        currentYear: new Date().getFullYear(),
      };

      const html = await this.renderTemplate(
        "logout-all-devices",
        templateData,
      );

      const subject = options.urgent
        ? `🚨 Security Alert: All Sessions Terminated - Medh Learning Platform`
        : `🚪 Logged Out From All Devices - Medh Learning Platform`;

      const mailOptions = {
        to: email,
        subject: subject,
        html,
      };

      return this.sendEmail(mailOptions, {
        priority: options.urgent ? "high" : "normal",
      });
    } catch (error) {
      logger.email.error("Failed to send logout all devices email", {
        error,
        email,
        userName,
      });
      throw error;
    }
  }

  /**
   * Calculate login risk level based on various factors
   * @param {Object} loginDetails - Login details
   * @param {Object} options - Additional context
   * @returns {string} Risk level: 'low', 'medium', or 'high'
   */
  calculateLoginRiskLevel(loginDetails, options = {}) {
    let riskScore = 0;

    // Check for suspicious IP patterns
    const ipAddress = loginDetails["IP Address"] || loginDetails.ipAddress;
    if (
      (ipAddress && ipAddress.includes("127.0.0.1")) ||
      ipAddress.includes("::1")
    ) {
      riskScore += 0; // Local development
    } else if (
      (ipAddress && ipAddress.includes("192.168.")) ||
      ipAddress.includes("10.")
    ) {
      riskScore += 1; // Private network
    } else {
      riskScore += 2; // Public IP
    }

    // Check for unusual location
    const location = loginDetails["Location"] || loginDetails.location;
    if (location && location.includes("Unknown")) {
      riskScore += 2;
    }

    // Check for new device patterns
    if (options.isNewDevice) {
      riskScore += 3;
    }

    // Check for unusual timing (could be enhanced with actual user patterns)
    if (options.unusualTime) {
      riskScore += 2;
    }

    // Check for multiple recent failed attempts
    if (options.recentFailedAttempts > 3) {
      riskScore += 4;
    }

    // Determine risk level
    if (riskScore >= 8) {
      return "high";
    } else if (riskScore >= 4) {
      return "medium";
    } else {
      return "low";
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
  async sendBulkEmail(emails, subject, templateName, templateData = {}) {
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
          await new Promise((resolve) => setTimeout(resolve, batchDelay));
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

      // Make sure we have proper From address set
      if (!mailOptions.from) {
        mailOptions.from = process.env.EMAIL_FROM || "noreply@medh.co";
      }

      // Ensure text version for clients that can't display HTML
      if (mailOptions.html && !mailOptions.text) {
        // Simple conversion, you could use a library for better HTML-to-text
        mailOptions.text = mailOptions.html.replace(/<[^>]*>/g, "");
      }

      // Add retry envelope for troubleshooting
      const info = await this.transporter.sendMail({
        ...mailOptions,
        headers: {
          ...(mailOptions.headers || {}),
          "X-Mailer": "Medh-Learning-Platform",
        },
      });

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
        error: error.message,
        code: error.code,
        command: error.command,
        subject: mailOptions.subject,
      });

      // Store for retry
      await this.storeFailedEmailForRetry(mailOptions).catch((storeError) => {
        logger.email.error("Failed to store email for retry", {
          error: storeError.message,
        });
      });

      // Handle specific error cases
      if (error.code === "EAUTH") {
        throw new Error(
          "Email authentication failed. Please check your email credentials.",
        );
      } else if (error.code === "ESOCKET") {
        throw new Error(
          "Email connection failed. Please check your internet connection.",
        );
      } else if (error.code === "EENVELOPE") {
        throw new Error(
          "Invalid envelope parameters (possibly invalid recipient email).",
        );
      } else {
        throw new Error(`Failed to send email: ${error.message}`);
      }
    }
  }

  /**
   * Advanced email queuing with BullMQ features
   * @param {Object} mailOptions - Email options
   * @param {Object} options - Enhanced queue options
   * @returns {Promise} Queue result
   */
  async queueEmailAdvanced(mailOptions, options = {}) {
    if (!this.queue || !this.isInitialized) {
      logger.email.warn("Queue not available, falling back to direct sending");
      return this.sendEmailDirectlyWithCircuitBreaker(mailOptions);
    }

    const {
      priority = EMAIL_PRIORITY_NORMAL,
      delay = 0,
      attempts = EMAIL_RETRY_ATTEMPTS,
      metadata = {},
      jobId = null,
    } = options;

    const recipient = Array.isArray(mailOptions.to)
      ? mailOptions.to.join(", ")
      : mailOptions.to;

    try {
      logger.email.debug(`Queuing email to ${recipient}`, {
        subject: mailOptions.subject,
        priority,
        delay: delay > 0 ? `${delay}ms` : "immediate",
        attempts,
      });

      // Enhanced job data with metadata
      const jobData = {
        mailOptions,
        priority,
        metadata: {
          ...metadata,
          recipient,
          subject: mailOptions.subject,
          queuedAt: new Date().toISOString(),
        },
      };

      // Advanced job options for BullMQ
      const jobOptions = {
        priority,
        attempts,
        delay,
        // Exponential backoff with jitter for retries
        backoff: {
          type: "exponential",
          delay: EMAIL_RETRY_DELAY,
        },
        // Remove completed jobs after a while to save memory
        removeOnComplete: parseInt(process.env.EMAIL_KEEP_COMPLETED, 10) || 100,
        removeOnFail: parseInt(process.env.EMAIL_KEEP_FAILED, 10) || 50,
        // Job timeout
        timeout: EMAIL_JOB_TIMEOUT,
      };

      // Add job ID if provided (for idempotency)
      if (jobId) {
        jobOptions.jobId = jobId;
      }

      const job = await this.queue.add(
        "send-email", // Job name for better organization
        jobData,
        jobOptions,
      );

      logger.email.info(`Email queued successfully`, {
        jobId: job.id,
        to: recipient,
        subject: mailOptions.subject,
        priority,
        estimatedDelay: delay > 0 ? `${delay}ms` : "none",
      });

      return {
        success: true,
        queued: true,
        jobId: job.id,
        priority,
        estimatedDelay: delay,
        queuePosition: await job.getQueuePosition(),
      };
    } catch (error) {
      logger.email.error(`Failed to queue email to ${recipient}`, {
        error: error.message,
        subject: mailOptions.subject,
        priority,
        stack: error.stack,
      });

      // Attempt direct sending as fallback
      logger.email.info("Attempting direct sending as queue fallback");
      return this.sendEmailDirectlyWithCircuitBreaker(mailOptions);
    }
  }

  /**
   * Get comprehensive email service statistics
   */
  getServiceStats() {
    const uptime = Date.now() - this.stats.startTime;
    const throughput =
      this.stats.processed > 0
        ? (this.stats.processed / (uptime / 1000 / 60)).toFixed(2)
        : 0;
    const successRate =
      this.stats.processed > 0
        ? ((this.stats.sent / this.stats.processed) * 100).toFixed(2)
        : 100;

    return {
      service: {
        ...this.stats,
        uptime: Math.floor(uptime / 1000),
        throughput: `${throughput}/min`,
        successRate: `${successRate}%`,
        isInitialized: this.isInitialized,
      },
      queue: this.queue
        ? {
            name: EMAIL_QUEUE_NAME,
            concurrency: EMAIL_QUEUE_CONCURRENCY,
            rateLimit: `${EMAIL_RATE_LIMIT_MAX}/${EMAIL_RATE_LIMIT_WINDOW}ms`,
          }
        : null,
      transporter: {
        pooled: true,
        maxConnections: parseInt(process.env.EMAIL_MAX_CONNECTIONS, 10) || 5,
        maxMessages: parseInt(process.env.EMAIL_MAX_MESSAGES, 10) || 100,
        rateLimit: parseInt(process.env.EMAIL_RATE_LIMIT, 10) || 14,
      },
      cache: {
        templateCacheSize: this.templateCache.size,
        maxTemplateCache: this.maxTemplateCache,
      },
    };
  }

  /**
   * Get queue statistics (if available)
   */
  async getQueueStats() {
    if (!this.queue) {
      return { error: "Queue not available" };
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total:
          waiting.length +
          active.length +
          completed.length +
          failed.length +
          delayed.length,
      };
    } catch (error) {
      logger.email.error("Failed to get queue statistics", {
        error: error.message,
      });
      return { error: error.message };
    }
  }

  /**
   * Retry failed jobs (admin function)
   */
  async retryFailedJobs(limit = 10) {
    if (!this.queue) {
      throw new Error("Queue not available");
    }

    try {
      const failedJobs = await this.queue.getFailed(0, limit - 1);
      const retryPromises = failedJobs.map((job) => job.retry());

      await Promise.all(retryPromises);

      logger.email.info(`Retried ${failedJobs.length} failed email jobs`);

      return {
        success: true,
        retriedCount: failedJobs.length,
      };
    } catch (error) {
      logger.email.error("Failed to retry failed jobs", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Clean up old jobs (maintenance function)
   */
  async cleanupOldJobs() {
    if (!this.queue) {
      return { message: "Queue not available" };
    }

    try {
      // Clean completed jobs older than 24 hours
      const completedJobs = await this.queue.getCompleted(0, -1);
      const oldCompleted = completedJobs.filter((job) => {
        const jobAge = Date.now() - job.timestamp;
        return jobAge > 24 * 60 * 60 * 1000; // 24 hours
      });

      // Clean failed jobs older than 7 days
      const failedJobs = await this.queue.getFailed(0, -1);
      const oldFailed = failedJobs.filter((job) => {
        const jobAge = Date.now() - job.timestamp;
        return jobAge > 7 * 24 * 60 * 60 * 1000; // 7 days
      });

      // Remove old jobs
      const cleanupPromises = [
        ...oldCompleted.map((job) => job.remove()),
        ...oldFailed.map((job) => job.remove()),
      ];

      await Promise.all(cleanupPromises);

      const cleanedCount = oldCompleted.length + oldFailed.length;
      logger.email.info(`Cleaned up ${cleanedCount} old email jobs`);

      return {
        success: true,
        cleanedCompleted: oldCompleted.length,
        cleanedFailed: oldFailed.length,
        total: cleanedCount,
      };
    } catch (error) {
      logger.email.error("Failed to cleanup old jobs", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send session reminder email using template
   * @param {string} email - Recipient email
   * @param {string} subject - Email subject
   * @param {Object} sessionData - Session data for template
   * @param {Object} options - Additional options
   */
  async sendSessionReminderEmail(email, subject, sessionData, options = {}) {
    try {
      logger.email.info(`Sending session reminder email to ${email}`, {
        subject,
        sessionTitle: sessionData.session_title,
        reminderInterval: sessionData.reminder_interval,
        isUrgent: sessionData.is_urgent,
      });

      const templateData = {
        ...sessionData,
        currentYear: new Date().getFullYear(),
        support_email: process.env.SUPPORT_EMAIL || "support@medh.co",
        dashboard_url: process.env.FRONTEND_URL || "https://app.medh.co",
        // Add additional computed fields
        urgent_class: sessionData.is_urgent ? "urgent" : "",
        time_icon: sessionData.is_urgent ? "🚨" : "📅",
        button_text: sessionData.is_urgent ? "Join Now" : "Join Session",
      };

      return await this.sendTemplatedEmail(
        email,
        "session-reminder",
        subject,
        templateData,
        options,
      );
    } catch (error) {
      logger.email.error("Failed to send session reminder email:", {
        error: error.message,
        email,
        subject,
        sessionId: sessionData.session_id,
      });
      throw error;
    }
  }

  /**
   * Send templated email (general method)
   * @param {string} email - Recipient email
   * @param {string} templateName - Template name
   * @param {string} subject - Email subject
   * @param {Object} templateData - Data for template
   * @param {Object} options - Additional options
   */
  async sendTemplatedEmail(
    email,
    templateName,
    subject,
    templateData,
    options = {},
  ) {
    try {
      const htmlContent = await this.renderTemplate(templateName, templateData);

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: subject,
        html: htmlContent,
        // Add plain text fallback
        text: this.generatePlainTextFromTemplate(templateName, templateData),
        ...options.mailOptions,
      };

      return await this.sendEmail(mailOptions, {
        priority:
          options.priority || (templateData.is_urgent ? "high" : "normal"),
        useQueue: options.useQueue !== false,
      });
    } catch (error) {
      logger.email.error("Failed to send templated email:", {
        error: error.message,
        email,
        templateName,
        subject,
      });
      throw error;
    }
  }

  /**
   * Send form confirmation email
   * @param {string} email - Recipient email
   * @param {Object} formData - Form submission data
   * @returns {Promise} Email sending result
   */
  async sendFormConfirmationEmail(email, formData) {
    try {
      const templateData = {
        ...formData,
        currentYear: new Date().getFullYear(),
        dashboard_url: process.env.FRONTEND_URL || "https://app.medh.co",
        contact_url: `${process.env.FRONTEND_URL || "https://app.medh.co"}/contact`,
        privacy_url: `${process.env.FRONTEND_URL || "https://app.medh.co"}/privacy`,
        terms_url: `${process.env.FRONTEND_URL || "https://app.medh.co"}/terms`,
        unsubscribe_url: `${process.env.FRONTEND_URL || "https://app.medh.co"}/unsubscribe?email=${encodeURIComponent(email)}`,
        submitted_at: new Date(),
      };

      return this.sendTemplatedEmail(
        email,
        "form-confirmation",
        `Form Submission Confirmation - ${formData.form_type}`,
        templateData,
        { priority: "normal" },
      );
    } catch (error) {
      logger.email.error("Failed to send form confirmation email", {
        error,
        email,
      });
      throw error;
    }
  }

  /**
   * Send parent demo confirmation email
   * @param {string} email - Parent email
   * @param {Object} demoData - Demo session data
   * @returns {Promise} Email sending result
   */
  async sendParentDemoConfirmationEmail(email, demoData) {
    try {
      const baseUrl = process.env.FRONTEND_URL || "https://medh.co";

      // Enhanced template data with better field mapping
      const templateData = {
        parent_name: demoData.parent_name || demoData.name || "Parent",
        student_name: demoData.student_name || demoData.name || "Student",
        demo_date: demoData.demo_date || "To be confirmed",
        demo_time: demoData.demo_time || "To be confirmed",
        course: demoData.course || demoData.preferred_course || "Demo Course",
        grade_level: demoData.grade_level || demoData.grade || null,
        parent_email: demoData.parent_email || email,
        temporary_password: demoData.temporary_password || null,

        // URLs and branding
        currentYear: new Date().getFullYear(),
        logo_url: `${baseUrl}/medh_logo-1.png`,
        dashboard_url: baseUrl,
        support_url: `${baseUrl}/support`,
        privacy_url: `${baseUrl}/privacy`,
        terms_url: `${baseUrl}/terms`,
        unsubscribe_url: `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`,

        // Additional data from original object
        ...demoData,
      };

      return this.sendTemplatedEmail(
        email,
        "parent-demo-confirmation",
        "Your Child's Medh Demo Session is Confirmed!",
        templateData,
        {
          priority: "high",
          from: process.env.DEMO_EMAIL || "demo@medh.co",
        },
      );
    } catch (error) {
      logger.email.error("Failed to send parent demo confirmation email", {
        error,
        email,
      });
      throw error;
    }
  }

  /**
   * Send student demo confirmation email
   * @param {string} email - Student email
   * @param {Object} demoData - Demo session data
   * @returns {Promise} Email sending result
   */
  async sendStudentDemoConfirmationEmail(email, demoData) {
    try {
      const baseUrl = process.env.FRONTEND_URL || "https://medh.co";

      // Enhanced template data with better field mapping
      const templateData = {
        name: demoData.name || demoData.student_name || "Student",
        demo_date: demoData.demo_date || "To be confirmed",
        demo_time: demoData.demo_time || "To be confirmed",
        course: demoData.course || demoData.preferred_course || "Demo Course",
        email: email,
        temporary_password: demoData.temporary_password || null,

        // URLs and branding
        currentYear: new Date().getFullYear(),
        logo_url: `${baseUrl}/medh_logo-1.png`,
        dashboard_url: baseUrl,
        support_url: `${baseUrl}/support`,
        privacy_url: `${baseUrl}/privacy`,
        terms_url: `${baseUrl}/terms`,
        unsubscribe_url: `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`,

        // Additional data from original object
        ...demoData,
      };

      return this.sendTemplatedEmail(
        email,
        "student-demo-confirmation",
        "Your Medh Demo Session is Confirmed!",
        templateData,
        {
          priority: "high",
          from: process.env.DEMO_EMAIL || "demo@medh.co",
        },
      );
    } catch (error) {
      logger.email.error("Failed to send student demo confirmation email", {
        error,
        email,
      });
      throw error;
    }
  }

  /**
   * Send receipt email
   * @param {string} email - Customer email
   * @param {Object} receiptData - Receipt data
   * @returns {Promise} Email sending result
   */
  async sendReceiptEmail(email, receiptData) {
    try {
      const templateData = {
        ...receiptData,
        currentYear: new Date().getFullYear(),
        dashboard_url: process.env.FRONTEND_URL || "https://app.medh.co",
        privacy_url: `${process.env.FRONTEND_URL || "https://app.medh.co"}/privacy`,
        terms_url: `${process.env.FRONTEND_URL || "https://app.medh.co"}/terms`,
        billing_url: `${process.env.FRONTEND_URL || "https://app.medh.co"}/billing`,
        payment_date: receiptData.payment_date || new Date(),
      };

      const subject =
        receiptData.payment_type === "subscription"
          ? `Your Subscription Receipt - ${receiptData.plan_name || "Medh Platform"}`
          : `Your Course Receipt - ${receiptData.course_name || "Medh Platform"}`;

      return this.sendTemplatedEmail(email, "receipt", subject, templateData, {
        priority: "high",
      });
    } catch (error) {
      logger.email.error("Failed to send receipt email", { error, email });
      throw error;
    }
  }

  /**
   * Send course enrollment confirmation email
   * @param {string} email - Student email
   * @param {Object} enrollmentData - Enrollment data
   * @returns {Promise} Email sending result
   */
  async sendCourseEnrollmentEmail(email, enrollmentData) {
    try {
      const templateData = {
        student_name: enrollmentData.student_name,
        course_name: enrollmentData.course_name,
        course_type: enrollmentData.course_type,
        enrollment_date: new Date().toLocaleDateString(),
        start_date: enrollmentData.start_date,
        instructor_name: enrollmentData.instructor_name,
        course_duration: enrollmentData.duration,
        access_details: enrollmentData.access_details,
        currentYear: new Date().getFullYear(),
        dashboard_url: process.env.FRONTEND_URL || "https://app.medh.co",
        course_url: `${process.env.FRONTEND_URL || "https://app.medh.co"}/courses/${enrollmentData.course_id}`,
      };

      return this.sendTemplatedEmail(
        email,
        "course-enrollment",
        `Welcome to ${enrollmentData.course_name}! 🎉`,
        templateData,
        { priority: "high" },
      );
    } catch (error) {
      logger.email.error("Failed to send course enrollment email", {
        error,
        email,
      });
      throw error;
    }
  }

  /**
   * Generate plain text fallback for templates
   * @param {string} templateName - Template name
   * @param {Object} data - Template data
   * @returns {string} Plain text content
   */
  generatePlainTextFromTemplate(templateName, data) {
    switch (templateName) {
      case "session-reminder":
        return `
Session Reminder - ${data.session_title}

Hello ${data.student_name},

This is a reminder about your upcoming session in ${data.reminder_interval}.

Session Details:
- Course: ${data.batch_name}
- Date: ${data.session_date}
- Time: ${data.session_time} - ${data.session_end_time} (${data.timezone})
- Duration: ${data.session_duration} minutes

${data.meeting_url ? `Join URL: ${data.meeting_url}` : ""}
${data.meeting_id ? `Meeting ID: ${data.meeting_id}` : ""}
${data.meeting_password ? `Password: ${data.meeting_password}` : ""}

${data.instructor_name ? `Instructor: ${data.instructor_name}` : ""}

${data.is_urgent ? "URGENT: Your session is starting soon! Please join now." : "Please mark your calendar and prepare for the session."}

Best regards,
Medh Learning Platform Team

---
© ${data.current_year} Medh Learning Platform. All rights reserved.
        `.trim();

      default:
        return `Hello ${data.user_name || data.student_name || ""},\n\nThis is a notification from Medh Learning Platform.\n\nBest regards,\nMedh Team`;
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

  /**
   * Store failed email for later retry when the circuit breaker is open
   * @param {Object} mailOptions - The email that failed to send
   * @returns {Promise<void>}
   */
  async storeFailedEmailForRetry(mailOptions) {
    try {
      // Create a file in the failed-emails directory
      const failedEmailsDir = path.join(__dirname, "../logs/failed-emails");

      // Ensure directory exists
      if (!fs.existsSync(failedEmailsDir)) {
        fs.mkdirSync(failedEmailsDir, { recursive: true });
      }

      // Generate a unique identifier
      const recipient =
        typeof mailOptions.to === "string"
          ? mailOptions.to
          : Array.isArray(mailOptions.to)
            ? mailOptions.to[0]
            : "unknown";

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safeRecipient = recipient
        .replace(/[^a-zA-Z0-9]/g, "_")
        .substring(0, 30);
      const filename = `${timestamp}-${safeRecipient}.json`;
      const filePath = path.join(failedEmailsDir, filename);

      // Store the mail options as JSON, but handle circular references
      const safeMailOptions = { ...mailOptions };

      // Remove any potential circular references or non-serializable data
      delete safeMailOptions.connection;
      delete safeMailOptions.transport;
      delete safeMailOptions.transporter;

      // Handle functions that can't be serialized
      if (typeof safeMailOptions.text === "function") {
        safeMailOptions.text = "[Function: text]";
      }

      if (typeof safeMailOptions.html === "function") {
        safeMailOptions.html = "[Function: html]";
      }

      // Store the mail options safely
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            retryCount: 0,
            mailOptions: safeMailOptions,
          },
          null,
          2,
        ),
      );

      logger.email.info("Stored failed email for later retry", {
        to: recipient,
        subject: mailOptions.subject,
        filePath,
      });

      return true;
    } catch (error) {
      logger.email.error("Failed to store email for retry", {
        error: error.message,
        stack: error.stack,
      });
      // Don't throw, just return false - we don't want storing failures to cascade
      return false;
    }
  }

  /**
   * Send marketing email with segmentation
   * @param {Array} recipients - Array of recipient objects with email and data
   * @param {string} templateName - Template name
   * @param {string} subject - Email subject
   * @param {Object} globalData - Global template data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Results summary
   */
  async sendMarketingEmail(
    recipients,
    templateName,
    subject,
    globalData = {},
    options = {},
  ) {
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new Error("Invalid recipients list");
    }

    try {
      const results = {
        total: recipients.length,
        queued: 0,
        failed: 0,
        errors: [],
      };

      // Process in batches to avoid overwhelming the system
      const batchSize = options.batchSize || 50;
      const batchDelay = options.batchDelay || 1000;

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        const batchPromises = batch.map(async (recipient) => {
          try {
            const templateData = {
              ...globalData,
              ...recipient.data,
              recipient_email: recipient.email,
              unsubscribe_url: `${process.env.FRONTEND_URL || "https://app.medh.co"}/unsubscribe?email=${encodeURIComponent(recipient.email)}&token=${recipient.unsubscribe_token || ""}`,
              currentYear: new Date().getFullYear(),
            };

            await this.sendTemplatedEmail(
              recipient.email,
              templateName,
              subject,
              templateData,
              {
                priority: options.priority || "low",
                useQueue: true,
                metadata: { campaign: options.campaign, type: "marketing" },
              },
            );

            results.queued++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              email: recipient.email,
              error: error.message,
            });
          }
        });

        await Promise.allSettled(batchPromises);

        // Add delay between batches
        if (i + batchSize < recipients.length) {
          await new Promise((resolve) => setTimeout(resolve, batchDelay));
        }
      }

      logger.email.info(`Marketing email campaign completed`, {
        campaign: options.campaign,
        total: results.total,
        queued: results.queued,
        failed: results.failed,
      });

      return results;
    } catch (error) {
      logger.email.error("Failed to send marketing email", { error });
      throw error;
    }
  }

  /**
   * Send announcement email to all users
   * @param {string} subject - Email subject
   * @param {Object} announcementData - Announcement data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Results summary
   */
  async sendAnnouncementEmail(subject, announcementData, options = {}) {
    try {
      // This would typically fetch users from database
      // For now, we'll assume recipients are provided
      const recipients = options.recipients || [];

      const templateData = {
        ...announcementData,
        currentYear: new Date().getFullYear(),
        dashboard_url: process.env.FRONTEND_URL || "https://app.medh.co",
      };

      return await this.sendMarketingEmail(
        recipients,
        "announcement",
        subject,
        templateData,
        {
          campaign: "platform_announcement",
          priority: options.urgent ? "high" : "normal",
          ...options,
        },
      );
    } catch (error) {
      logger.email.error("Failed to send announcement email", { error });
      throw error;
    }
  }

  /**
   * Test email sending with various templates
   * @param {string} testEmail - Test email address
   * @returns {Promise<Object>} Test results
   */
  async runEmailTests(testEmail) {
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      tests: [],
    };

    const tests = [
      {
        name: "Welcome Email",
        method: () =>
          this.sendWelcomeEmail(testEmail, "Test User", {
            discountCode: "TEST2025",
          }),
      },
      {
        name: "Password Reset Email",
        method: () =>
          this.sendPasswordResetEmail(testEmail, "Test User", "temp123"),
      },
      {
        name: "OTP Verification Email",
        method: () =>
          this.sendOTPVerificationEmail(testEmail, "Test User", "123456"),
      },
      {
        name: "Login Notification Email",
        method: () =>
          this.sendLoginNotificationEmail(testEmail, "Test User", {
            "Login Time": new Date().toLocaleString(),
            Device: "Test Device",
            Location: "Test Location",
            "IP Address": "127.0.0.1",
          }),
      },
      {
        name: "Form Confirmation Email",
        method: () =>
          this.sendFormConfirmationEmail(testEmail, {
            form_type: "Contact Form",
            form_id: "TEST-001",
            name: "Test User",
            message: "This is a test form submission",
          }),
      },
      {
        name: "Receipt Email",
        method: () =>
          this.sendReceiptEmail(testEmail, {
            customer_name: "Test User",
            payment_type: "course",
            course_name: "JavaScript Fundamentals",
            amount: "99.99",
            currency: "USD",
            payment_id: "TEST-PAY-001",
            receipt_number: "RCP-001",
            payment_method: "Credit Card",
            payment_status: "Completed",
          }),
      },
    ];

    for (const test of tests) {
      results.total++;
      try {
        await test.method();
        results.successful++;
        results.tests.push({
          name: test.name,
          status: "success",
          timestamp: new Date(),
        });
        logger.email.info(`Email test passed: ${test.name}`);
      } catch (error) {
        results.failed++;
        results.tests.push({
          name: test.name,
          status: "failed",
          error: error.message,
          timestamp: new Date(),
        });
        logger.email.error(`Email test failed: ${test.name}`, { error });
      }
    }

    return results;
  }

  /**
   * Get comprehensive email service health check
   * @returns {Promise<Object>} Health check results
   */
  async getHealthCheck() {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.stats.startTime,
      services: {},
      stats: this.stats,
    };

    try {
      // Check SMTP connection
      health.services.smtp = {
        status: "checking",
        connected: false,
      };

      try {
        await this.transporter.verify();
        health.services.smtp = {
          status: "healthy",
          connected: true,
          host: process.env.EMAIL_HOST,
        };
      } catch (error) {
        health.services.smtp = {
          status: "unhealthy",
          connected: false,
          error: error.message,
        };
        health.status = "degraded";
      }

      // Check queue status
      if (this.queue) {
        try {
          const queueStats = await this.getQueueStats();
          health.services.queue = {
            status: queueStats.enabled ? "healthy" : "disabled",
            ...queueStats,
          };
        } catch (error) {
          health.services.queue = {
            status: "unhealthy",
            error: error.message,
          };
          health.status = "degraded";
        }
      } else {
        health.services.queue = {
          status: "disabled",
          message: "Queue not initialized",
        };
      }

      // Check Redis connection (if available)
      if (this.redisConnection) {
        try {
          health.services.redis = {
            status: "healthy",
            connected: true,
          };
        } catch (error) {
          health.services.redis = {
            status: "unhealthy",
            connected: false,
            error: error.message,
          };
          health.status = "degraded";
        }
      } else {
        health.services.redis = {
          status: "disabled",
          message: "Redis not available",
        };
      }

      return health;
    } catch (error) {
      logger.email.error("Health check failed", { error });
      return {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Send Career Application Acknowledgment Email
   * @param {string} to - Recipient email
   * @param {Object} data - Application data
   */
  async sendCareerApplicationAcknowledgment(to, data) {
    const emailData = {
      to,
      subject: `Career Application Received - Reference ID: ${data.reference_id}`,
      template: "career-application-acknowledgment",
      data,
      priority: EMAIL_PRIORITY_HIGH,
    };

    return this.sendEmail(emailData);
  }

  /**
   * Send Partnership Inquiry Acknowledgment Email
   * @param {string} to - Recipient email
   * @param {Object} data - Partnership inquiry data
   */
  async sendPartnershipInquiryAcknowledgment(to, data) {
    const emailData = {
      to,
      subject: `Partnership Inquiry Received - Reference ID: ${data.reference_id}`,
      template: "partnership-inquiry-acknowledgment",
      data,
      priority: EMAIL_PRIORITY_HIGH,
    };

    return this.sendEmail(emailData);
  }

  /**
   * Send Educator Application Acknowledgment Email
   * @param {string} to - Recipient email
   * @param {Object} data - Educator application data
   */
  async sendEducatorApplicationAcknowledgment(to, data) {
    const emailData = {
      to,
      subject: `Educator Application Received - Reference ID: ${data.reference_id}`,
      template: "educator-application-acknowledgment",
      data,
      priority: EMAIL_PRIORITY_HIGH,
    };

    return this.sendEmail(emailData);
  }

  /**
   * Send Contact Form Acknowledgment Email
   * @param {string} to - Recipient email
   * @param {Object} data - Contact form data
   */
  async sendContactFormAcknowledgment(to, data) {
    const emailData = {
      to,
      subject: `We've Received Your Message - Reference ID: ${data.reference_id}`,
      template: "contact-form-acknowledgment",
      data,
      priority: EMAIL_PRIORITY_NORMAL,
    };

    return this.sendEmail(emailData);
  }

  /**
   * Health check for email service
   * @returns {Object} Health status
   */
  async healthCheck() {
    // ... existing code ...
  }
}

// Create instance
const emailService = new EmailService();

// Export as default
export default emailService;
