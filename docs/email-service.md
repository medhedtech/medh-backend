# Email Service Documentation

The Medh Platform uses a robust Redis-based email service to handle all email communications with high reliability and performance.

## Features

- Queue-based email delivery using Redis
- Automatic retries for failed emails
- Priority-based email processing
- Rate limiting for bulk emails
- Comprehensive error handling and logging
- HTML templating with Handlebars
- Support for AWS SES via SMTP

## Configuration

Set the following environment variables in your `.env` file:

```env
# Email Configuration
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your-ses-smtp-username
EMAIL_PASS=your-ses-smtp-password
EMAIL_FROM=noreply@yourdomain.com

# Redis Configuration
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis-password

# Email Queue Configuration
EMAIL_QUEUE_CONCURRENCY=5
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY=60000
EMAIL_JOB_TIMEOUT=30000
EMAIL_BATCH_SIZE=50
EMAIL_BATCH_DELAY=1000
EMAIL_KEEP_FAILED_JOBS=false
EMAIL_DEBUG=false

# Email Template Settings
OTP_EXPIRY_MINUTES=10
PASSWORD_RESET_EXPIRY_HOURS=24
```

## Usage

### Basic Email Sending

```javascript
import EmailService from "../services/emailService.js";

const emailService = new EmailService();

// Simple email
await emailService.sendEmail({
  to: "recipient@example.com",
  subject: "Hello World",
  html: "<p>This is a test email</p>"
});

// With priority
await emailService.sendEmail({
  to: "recipient@example.com",
  subject: "Important Notification",
  html: "<p>This is a high priority email</p>"
}, {
  priority: "high", // can be "high", "normal", or "low"
  useQueue: true // force queue usage even if direct would be used
});
```

### Templated Emails

```javascript
// Using one of the built-in template methods
await emailService.sendWelcomeEmail(
  "user@example.com",
  "John Doe",
  { password: "temporary-password" }
);

await emailService.sendOTPVerificationEmail(
  "user@example.com",
  "John Doe",
  "123456"
);

await emailService.sendPasswordResetEmail(
  "user@example.com",
  "John Doe",
  "new-temp-password"
);

// Using a custom template
await emailService.sendNotificationEmail(
  "user@example.com",
  "Course Update Available",
  "Your course has been updated",
  { 
    courseName: "JavaScript Fundamentals",
    updateType: "New content added"
  }
);
```

### Bulk Email Sending

```javascript
const recipients = ["user1@example.com", "user2@example.com", "user3@example.com"];

const results = await emailService.sendBulkEmail(
  recipients,
  "New Feature Announcement",
  "announcement-template",
  { 
    featureName: "Video Conferencing",
    releaseDate: "May 15, 2023"
  }
);

console.log(`Sent: ${results.queued}, Failed: ${results.failed}`);
```

## Email Templates

Email templates are stored in the `templates` directory as `.hbs` (Handlebars) files. The following templates are available:

- `welcome.hbs` - Welcome email for new users
- `email-verification.hbs` - Email verification with OTP
- `reset-password.hbs` - Password reset emails
- `notification.hbs` - General notifications
- `receipt.hbs` - Payment receipts
- `course-update.hbs` - Course update notifications

## Queue Management

The email queue is powered by Bull and Redis. To monitor the queue:

```javascript
// Get queue statistics
const stats = await emailService.getQueueStats();
console.log(stats);
/*
{
  enabled: true,
  isPaused: false,
  workers: 5,
  jobs: {
    waiting: 10,
    active: 2,
    completed: 500,
    failed: 5,
    delayed: 0
  }
}
*/
```

## Health Checks

The email service automatically performs health checks for:
- SMTP connection status
- Redis connection status
- Queue health status

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check your SMTP credentials
   - Ensure AWS SES is properly configured
   - Verify your account is out of the SES sandbox if sending to non-verified recipients

2. **Connection Issues**
   - Verify network connectivity
   - Check firewall settings
   - Ensure SMTP port is not blocked

3. **Redis Issues**
   - Check Redis server is running
   - Verify Redis credentials
   - Ensure Redis is accessible from the application server

### Viewing Logs

Email-related logs are available in the combined log files and can be filtered using:

```bash
grep "email" logs/combined-*.log
```

For queue-specific issues:

```bash
grep "queue" logs/combined-*.log
```

## Performance Considerations

- The service uses connection pooling for better SMTP performance
- Bulk emails are sent in batches with rate limiting
- High priority emails bypass the queue when Redis is unavailable

## Security

- Credentials are stored in environment variables only
- Templates are validated before rendering
- HTML is sanitized where appropriate
- Error messages do not expose sensitive information
