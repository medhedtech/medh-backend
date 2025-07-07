# CloudFront Signed URLs Setup Guide

## Issue

The application is failing to generate signed CloudFront URLs because the private key file is missing.

## Error Message

```
Error generating signed URL: Error: CloudFront private key not loaded. Check CLOUDFRONT_PRIVATE_KEY_PATH
```

## Root Cause

The `private_key.pem` file is missing from the project directory, which is required for CloudFront signed URL generation.

## Solutions

### Option 1: Add CloudFront Private Key File (Recommended)

1. **Download your CloudFront private key from AWS:**

   - Go to AWS Console → CloudFront → Key Management
   - Download your private key file (usually named something like `pk-APKA...pem`)

2. **Place the key file in your project:**

   ```bash
   # Copy your downloaded key to the project root
   cp /path/to/your/downloaded/key.pem ./private_key.pem
   ```

3. **Set proper permissions:**

   ```bash
   chmod 600 private_key.pem
   ```

4. **Verify the file exists:**
   ```bash
   ls -la private_key.pem
   ```

### Option 2: Update Environment Variable Path

If your private key is stored elsewhere, update the `.env` file:

```bash
# Update the path in your .env file
CLOUDFRONT_PRIVATE_KEY_PATH=/absolute/path/to/your/private_key.pem
```

### Option 3: Disable CloudFront Signing (Temporary Fix)

If you don't need signed URLs immediately, you can modify the code to fallback gracefully:

```javascript
// In utils/cloudfrontSigner.js, modify the generateSignedUrl function
export const generateSignedUrl = (
  url,
  expiresInSeconds = ENV_VARS.CLOUDFRONT_DEFAULT_EXPIRES_IN,
) => {
  if (!url) {
    throw new Error("URL is required to generate signed CloudFront URL");
  }
  if (!ENV_VARS.CLOUDFRONT_KEY_PAIR_ID) {
    throw new Error("CLOUDFRONT_KEY_PAIR_ID environment variable is not set");
  }
  if (!privateKey) {
    console.warn("CloudFront private key not loaded. Returning unsigned URL.");
    return url; // Return unsigned URL as fallback
  }

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  return getSignedUrl({
    url,
    keyPairId: ENV_VARS.CLOUDFRONT_KEY_PAIR_ID,
    privateKey,
    dateLessThan: expiresAt,
  });
};
```

## Current Configuration

Your `.env` file has these CloudFront settings:

```
CLOUDFRONT_KEY_PAIR_ID=K183U8VA9HF98N
CLOUDFRONT_PRIVATE_KEY_PATH=./private_key.pem
CLOUDFRONT_DEFAULT_EXPIRES_IN=300
```

## Verification Steps

1. **Check if the file exists:**

   ```bash
   ls -la private_key.pem
   ```

2. **Test the signing function:**

   ```bash
   node -e "
   import { generateSignedUrl } from './utils/cloudfrontSigner.js';
   try {
     const signedUrl = generateSignedUrl('https://cdn.medh.co/test-video.mp4');
     console.log('Success:', signedUrl);
   } catch (error) {
     console.error('Error:', error.message);
   }
   "
   ```

3. **Check file permissions:**
   ```bash
   ls -la private_key.pem
   # Should show: -rw------- (600 permissions)
   ```

## Security Notes

- Keep your private key secure and never commit it to version control
- Add `private_key.pem` to your `.gitignore` file
- Use environment variables for sensitive paths in production
- Consider using AWS Secrets Manager for production deployments

## Production Deployment

For production, consider these best practices:

1. **Use AWS Secrets Manager:**

   ```javascript
   // Store the private key in AWS Secrets Manager
   // and retrieve it at runtime
   ```

2. **Use environment-specific paths:**

   ```bash
   # Development
   CLOUDFRONT_PRIVATE_KEY_PATH=./private_key.pem

   # Production
   CLOUDFRONT_PRIVATE_KEY_PATH=/etc/medh/cloudfront/private_key.pem
   ```

3. **Add to .gitignore:**
   ```gitignore
   # CloudFront private keys
   private_key.pem
   *.pem
   ```
