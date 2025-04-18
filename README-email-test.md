# Redis Email Queue Testing

This guide describes how to test the Redis-based email queue system for Medh Platform.

## Prerequisites

Before running the tests, make sure you have:

1. Redis server running
2. Proper environment variables set in your `.env` file
3. SMTP credentials configured (AWS SES or other provider)

## Configuration

Update your `.env` file with the following settings:

```bash
# Email and Redis Configuration
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your-ses-smtp-username
EMAIL_PASS=your-ses-smtp-password
EMAIL_FROM="Medh No-Reply <noreply@medh.co>"

# Redis Configuration
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Test settings
TEST_EMAIL=your-email@example.com  # Email to receive test messages
NODE_ENV=development
```

## Running the Test

Execute the test script with:

```bash
# Make sure Redis is running first
node test-redis-email.js
```

## What the Test Does

The test script validates the Redis-based email queue by:

1. Verifying Redis connection
2. Sending high, normal, and low priority emails
3. Testing templated emails
4. Testing bulk email sending
5. Monitoring queue statistics throughout the process

## Example Output

A successful test will produce output similar to:

```
Starting Redis email queue test...
Redis status: {
  connected: true,
  enabled: true,
  host: "localhost",
  port: 6379,
  lastChecked: "2023-06-15T12:34:56.789Z"
}

--- Test 1: Queue Stats ---
Queue stats: {
  "enabled": true,
  "isPaused": false,
  "workers": 5,
  "jobs": {
    "waiting": 0,
    "active": 0,
    "completed": 0,
    "failed": 0,
    "delayed": 0
  }
}

--- Test 2: High Priority Email ---
High priority email result: {
  "success": true,
  "queued": true,
  "jobId": "1"
}

...

Tests completed successfully!
```

## Troubleshooting

If you encounter issues:

1. **Redis Connection Errors**: Verify Redis is running and credentials are correct
2. **SMTP Authentication Errors**: Check your SMTP credentials
3. **Template Errors**: Ensure all required templates exist in the templates directory

## Monitoring the Queue

You can also use tools like Bull Board, Redis Commander, or Redis Desktop Manager to visually inspect the queue state.

For more information, see the [Email Service Documentation](./docs/email-service.md).