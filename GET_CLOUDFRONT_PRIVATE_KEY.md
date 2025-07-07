# How to Get Your CloudFront Private Key

## 🔑 **Step-by-Step Guide**

### 1. **Access AWS CloudFront Console**

- Go to [AWS Console](https://console.aws.amazon.com/)
- Navigate to **CloudFront** service
- Click on **Key Management** in the left sidebar

### 2. **Find Your Key Pair**

- Look for the key pair with ID: `K183U8VA9HF98N` (from your .env file)
- If you don't see it, you may need to create a new key pair

### 3. **Download the Private Key**

- Click on your key pair
- Look for the **Private Key** section
- Click **Download** to get the `.pem` file
- The file will be named something like `pk-K183U8VA9HF98N.pem`

### 4. **Add to Your Project**

```bash
# Copy the downloaded file to your project root
cp ~/Downloads/pk-K183U8VA9HF98N.pem ./private_key.pem

# Set proper permissions (IMPORTANT for security)
chmod 600 private_key.pem

# Verify the file exists
ls -la private_key.pem
```

### 5. **Test the Setup**

```bash
# Run the signed URL test
node test-signed-urls.js
```

## 🔍 **If You Don't Have a Key Pair**

If you don't see the key pair `K183U8VA9HF98N` in your CloudFront console:

### Option A: Create a New Key Pair

1. In CloudFront → Key Management
2. Click **Create Key Pair**
3. Give it a name (e.g., "MEDH-Video-Signing")
4. Download both public and private keys
5. Update your `.env` file with the new key pair ID

### Option B: Check Your AWS Account

- Make sure you're in the correct AWS account
- Check if the key pair exists in a different region
- Contact your AWS administrator if needed

## 🔐 **Security Best Practices**

- **Never commit** the private key to version control
- **Set proper permissions**: `chmod 600 private_key.pem`
- **Use environment variables** for the key path in production
- **Consider AWS Secrets Manager** for production deployments

## 🧪 **Verification**

After adding the key, you should see:

```bash
$ node test-signed-urls.js

🔐 Testing CloudFront Signed URL Generation
===========================================

📋 Environment Configuration:
CLOUDFRONT_KEY_PAIR_ID: ✅ Set
CLOUDFRONT_PRIVATE_KEY_PATH: ./private_key.pem
Private Key File: ✅ Found
CLOUDFRONT_DEFAULT_EXPIRES_IN: 300 seconds

🧪 Testing URL Signing:
========================

1. Testing: https://cdn.medh.co/test-video.mp4
   ✅ Success: Generated signed URL
   🔗 Original: https://cdn.medh.co/test-video.mp4
   🔐 Signed:   https://cdn.medh.co/test-video.mp4?Key-Pair-Id=K183U8VA9HF98N&Signature=...
   🎯 Verified: URL contains signature parameters
```

## 🚨 **Troubleshooting**

### "Private key file not found"

- Check the file path in your `.env` file
- Make sure the file exists and has correct permissions
- Verify the file name is exactly `private_key.pem`

### "Invalid private key format"

- Make sure you downloaded the private key (not public key)
- Check that the file starts with `-----BEGIN RSA PRIVATE KEY-----`
- Verify the file wasn't corrupted during download

### "Key pair ID not found"

- Update your `.env` file with the correct key pair ID
- Make sure the key pair exists in your AWS account
