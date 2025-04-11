# Email Service Documentation

## Overview

The Email Service is an industry-standard implementation for handling all email operations in the Medh Learning Platform. It provides a robust, reliable way to send emails with features like templating, queuing, rate limiting, and error recovery.

## Features

- **HTML Templating**: Uses Handlebars for consistent, maintainable email templates
- **Queue System**: Bull queue integration for reliable email delivery
- **Rate Limiting**: Prevents sending too many emails too quickly
- **Retry Mechanism**: Automatic retries with exponential backoff
- **Error Handling**: Comprehensive error capturing and reporting
- **Admin Notifications**: Alerts for persistent failures
- **Plain Text Fallback**: Automatically generates plain text versions
- **Template Caching**: Performance optimization for templates
- **Bulk Email Support**: Efficiently send to multiple recipients
- **Email Analytics**: Track email sending status and queue health

## Configuration

The Email Service uses the following environment variables:

```
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-password
ADMIN_EMAIL=admin@example.com
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis-password
```

## Template System

Email templates are stored in the `templates/` directory as `.hbs` files. Here's how to create a new template:

1. Create a new file in the `templates` directory (e.g., `notification.hbs`)
2. Use Handlebars syntax for dynamic content: `{{variableName}}`
3. Use available helpers like `{{currentYear}}` or `{{formatDate date 'long'}}`

### Available Template Helpers

- `currentYear` - Returns the current year
- `formatDate` - Formats a date (formats: 'short', 'long', 'time', 'full')
- `ifEquals` - Conditional comparison
- `joinList` - Joins an array with a separator

## API Reference

### Initialization

```javascript
import EmailService from "../services/emailService.js";
const emailService = new EmailService();
```

### Sending Emails

#### Welcome Email

```javascript
/**
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {Object} userData - Additional user data (optional)
 */
await emailService.sendWelcomeEmail("user@example.com", "John Doe", {
  loginUrl: "https://example.com/login",
  // Any additional data to pass to the template
});
```

#### Password Reset Email

```javascript
/**
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} tempPassword - Temporary password
 */
await emailService.sendPasswordResetEmail(
  "user@example.com",
  "John Doe",
  "Temp123!",
);
```

#### Notification Email

```javascript
/**
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} message - HTML content or template name
 * @param {Object} data - Template data (if message is template name)
 */
// Using HTML content directly
await emailService.sendNotificationEmail(
  "user@example.com",
  "Important Update",
  "<h1>Hello!</h1><p>This is an important update.</p>",
);

// Using a template
await emailService.sendNotificationEmail(
  "user@example.com",
  "Course Completion",
  "course-completion", // Template name (without .hbs extension)
  {
    courseName: "JavaScript 101",
    completionDate: new Date(),
    score: 95,
  },
);
```

#### Bulk Email

```javascript
/**
 * @param {Array<string>} emails - List of recipient emails
 * @param {string} subject - Email subject
 * @param {string} templateName - Template name
 * @param {Object} templateData - Template data
 * @param {Object} options - Additional options (priority, delay)
 */
await emailService.sendBulkEmail(
  ["user1@example.com", "user2@example.com", "user3@example.com"],
  "New Course Available",
  "new-course",
  {
    courseName: "Advanced React",
    startDate: new Date("2023-11-15"),
    instructor: "Jane Smith",
  },
  { priority: "high" },
);
```

### Advanced Usage

#### Direct Email Sending (Bypass Queue)

```javascript
/**
 * @param {Object} mailOptions - Email options
 */
await emailService.sendEmailDirectly({
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Urgent Message",
  html: "<p>This is sent immediately, bypassing the queue.</p>",
});
```

#### Custom Queue Options

```javascript
/**
 * @param {Object} mailOptions - Email options
 * @param {Object} options - Queue options
 */
await emailService.queueEmail(
  {
    to: "user@example.com",
    subject: "Scheduled Email",
    html: "<p>This is a scheduled email.</p>",
  },
  {
    priority: "low", // 'high', 'normal', 'low'
    delay: 3600000, // 1 hour delay in milliseconds
    attempts: 5, // Custom retry attempts
  },
);
```

#### Queue Status Monitoring

```javascript
/**
 * Get current queue statistics
 */
const queueStats = await emailService.getQueueStatus();
console.log(queueStats);
// Output: { waiting: 5, active: 2, completed: 100, failed: 1, delayed: 3, total: 111 }
```

## Handling Email Failures

The service automatically retries failed emails with exponential backoff. After all retries are exhausted:

1. The error is logged with detailed information
2. An admin notification is sent (if configured)
3. The failed job remains in the queue for manual inspection

## Best Practices

1. **Always use templates** for consistent branding and easier maintenance
2. **Include both HTML and plain text** versions for better deliverability
3. **Use queue priorities** appropriately (high for critical emails like password resets)
4. **Monitor the queue status** regularly
5. **Test templates** in various email clients
6. **Keep templates modular** with reusable components
7. **Follow anti-spam guidelines** in your email content

## Troubleshooting

### Common Issues

1. **Emails not being sent**

   - Check SMTP credentials
   - Verify Redis connection for queue
   - Check server logs for detailed errors

2. **Template rendering errors**

   - Verify template exists in the templates directory
   - Check variable names match between code and template

3. **Rate limiting problems**

   - Adjust rate limiting settings in the EmailService constructor
   - Use bulk email sending for large batches

4. **Queue processing stalled**
   - Restart the application
   - Check Redis connection
   - Verify worker processes are running

## Development and Testing

For local development and testing, you can use:

- [Ethereal](https://ethereal.email/) - Fake SMTP service
- [MailHog](https://github.com/mailhog/MailHog) - Email testing tool with UI
- Test environment flag to prevent actual email sending

Example test configuration:

```javascript
// In test environment
if (process.env.NODE_ENV === "test") {
  // Create test account on ethereal
  const testAccount = await nodemailer.createTestAccount();

  // Configure transporter with test account
  this.transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}
```
