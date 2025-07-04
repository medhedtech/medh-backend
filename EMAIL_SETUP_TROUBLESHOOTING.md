# Email Setup Troubleshooting Guide

## Current Issue
You're getting this error when creating an instructor:
```
"Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to 535 5.7.8 https://support.google.com/mail/?p=BadCredentials"
```

This indicates a **Gmail SMTP authentication failure**.

## Root Cause Analysis

The issue is likely one of the following:

1. **Missing Environment Variables**: `EMAIL_USER` and `EMAIL_PASS` are not set
2. **Incorrect Gmail Credentials**: Using regular password instead of App Password
3. **Gmail Security Settings**: 2-Step Verification not enabled or App Password not generated

## Quick Fix Solutions

### Option 1: Fix Gmail Configuration (Recommended for Development)

1. **Check your current environment variables**:
   ```bash
   # Check if variables are set
   echo $EMAIL_USER
   echo $EMAIL_PASS
   ```

2. **Set up Gmail App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Navigate to **Security** → **2-Step Verification** (enable if not already)
   - Go to **Security** → **App passwords**
   - Generate a new App Password for "Mail"
   - Copy the 16-character password (no spaces)

3. **Create/Update your `.env` file**:
   ```bash
   # Email Configuration
   EMAIL_SERVICE=Gmail
   EMAIL_USER=your-gmail-address@gmail.com
   EMAIL_PASS=your-16-character-app-password
   EMAIL_FROM="Medh Platform <your-gmail-address@gmail.com>"
   ```

### Option 2: Switch to AWS SES (Recommended for Production)

1. **Set up AWS SES**:
   - Go to AWS Console → Simple Email Service
   - Verify your domain or email address
   - Create SMTP credentials
   - Move out of sandbox mode for production

2. **Update your `.env` file**:
   ```bash
   # Email Configuration
   EMAIL_SERVICE=SES
   EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
   EMAIL_PORT=465
   EMAIL_SECURE=true
   EMAIL_USER=your-ses-smtp-username
   EMAIL_PASS=your-ses-smtp-password
   EMAIL_FROM="Medh Platform <noreply@yourdomain.com>"
   ```

## Testing Your Email Configuration

1. **Test email service directly**:
   ```bash
   node test-email-queue.js
   ```

2. **Check email service logs**:
   ```bash
   # Look for email configuration errors in logs
   tail -f logs/app.log | grep -i email
   ```

3. **Test instructor creation**:
   ```bash
   curl -X POST https://api.medh.co/api/v1/auth/create \
     -H "Content-Type: application/json" \
     -d '{
       "full_name": "Test Instructor",
       "email": "test@example.com",
       "phone_number": "1234567890",
       "password": "testpassword123",
       "domain": "test",
       "meta": {}
     }'
   ```

## Environment Variables Reference

Create a `.env` file in your project root with these variables:

```bash
# Database
MONGO_URI=your-mongodb-connection-string
JWT_SECRET_KEY=your-jwt-secret

# Email Configuration (Choose one option)

# Option 1: Gmail
EMAIL_SERVICE=Gmail
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Medh Platform <your-gmail@gmail.com>"

# Option 2: AWS SES
EMAIL_SERVICE=SES
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your-ses-username
EMAIL_PASS=your-ses-password
EMAIL_FROM="Medh Platform <noreply@yourdomain.com>"

# Redis (for email queue)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Other required variables
PORT=8080
NODE_ENV=development
```

## Verification Steps

1. **Check email service initialization**:
   - Look for "Email server is ready to send messages" in logs
   - If you see authentication errors, check credentials

2. **Monitor email queue**:
   - Check Redis for queued emails: `redis-cli KEYS "*email*"`
   - Monitor failed emails in `logs/failed-emails/` directory

3. **Test with different email providers**:
   - Try with a different Gmail account
   - Test with AWS SES if available

## Common Error Codes

- **535-5.7.8**: Invalid credentials (wrong username/password)
- **534-5.7.9**: App Password required (2-Step Verification needed)
- **535-5.7.1**: Username and Password not accepted
- **EAUTH**: Authentication failed
- **ESOCKET**: Connection failed

## Immediate Workaround

If you need to create instructors immediately while fixing email:

1. The updated code will still create the instructor successfully
2. It will return a success response with an email error note
3. You can manually send credentials to instructors while fixing email

## Next Steps

1. **Set up environment variables** using one of the options above
2. **Restart your application** to load new environment variables
3. **Test instructor creation** again
4. **Monitor logs** for any remaining issues

## Production Recommendations

- Use AWS SES for production email sending
- Set up proper domain verification
- Configure SPF, DKIM, and DMARC records
- Monitor email delivery rates and bounces
- Use email templates for better formatting 