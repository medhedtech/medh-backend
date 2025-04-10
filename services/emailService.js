import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

/**
 * Email Service
 * Handles all email sending operations and configuration
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === "true" || true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    this.verifyConnection();
  }
  
  /**
   * Verify the email service connection
   */
  verifyConnection() {
    this.transporter.verify((error, success) => {
      if (error) {
        logger.error("Email configuration error:", error);
        this.handleConnectionError(error);
      } else {
        logger.info("Email server is ready to send messages");
      }
    });
  }
  
  /**
   * Handle specific email connection errors
   * @param {Error} error - Connection error
   */
  handleConnectionError(error) {
    if (error.code === 'EAUTH') {
      logger.error("Authentication failed. Please check your credentials.");
      logger.error("If using Gmail, make sure to:");
      logger.error("1. Enable 2-Step Verification in your Google Account");
      logger.error("2. Generate an App Password from Google Account settings");
      logger.error("3. Use the App Password instead of your regular password");
    } else if (error.code === 'EDNS') {
      logger.error("DNS lookup failed. Please check your internet connection and SMTP server settings.");
    }
  }
  
  /**
   * Send an email
   * @param {Object} mailOptions - Email options (from, to, subject, html)
   * @returns {Promise} Email sending result
   */
  async sendEmail(mailOptions) {
    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info("Email sent successfully:", info.messageId);
      return true;
    } catch (error) {
      logger.error("Email sending failed:", error);
      
      if (error.code === 'EAUTH') {
        throw new Error("Email authentication failed. Please check your email credentials.");
      } else if (error.code === 'ESOCKET') {
        throw new Error("Email connection failed. Please check your internet connection.");
      } else {
        throw new Error("Failed to send email. Please try again later.");
      }
    }
  }

  /**
   * Send a welcome email to new user
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {string} password - User's password
   * @returns {Promise} Email sending result
   */
  async sendWelcomeEmail(email, name, password) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Medh Learning Platform",
      html: `
        <h2>Welcome, ${name}!</h2>
        <p>Thank you for registering with us. Here are your login credentials:</p>
        <ul>
          <li><strong>Username:</strong> ${email}</li>
          <li><strong>Password:</strong> ${password}</li>
        </ul>
        <p>Please keep this information secure. If you did not request this, please contact us immediately.</p>
      `
    };
    
    return this.sendEmail(mailOptions);
  }

  /**
   * Send a password reset email
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {string} tempPassword - Temporary password
   * @returns {Promise} Email sending result
   */
  async sendPasswordResetEmail(email, name, tempPassword) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset - Temporary Password",
      html: `
        <h2>Dear ${name},</h2>
        <p>You have requested to reset your password. Here is your temporary password:</p>
        <p><strong>${tempPassword}</strong></p>
        <p>Please use this temporary password to log in, then change your password immediately.</p>
        <p>This temporary password will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      `
    };
    
    return this.sendEmail(mailOptions);
  }

  /**
   * Send a notification email
   * @param {string} email - Recipient email
   * @param {string} subject - Email subject
   * @param {string} message - Email message
   * @returns {Promise} Email sending result
   */
  async sendNotificationEmail(email, subject, message) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html: message
    };
    
    return this.sendEmail(mailOptions);
  }
}

export default EmailService; 