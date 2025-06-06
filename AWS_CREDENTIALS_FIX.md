# AWS Credentials Fix Guide

## 🚨 Problem

The course image upload is failing with error:
```json
{
    "success": false,
    "message": "Failed to upload course image",
    "error": "Resolved credential object is not valid"
}
```

## 🔍 Root Cause

The error occurs because the **production server** has different or missing AWS credentials compared to the local development environment.

## ✅ Solution

### Step 1: Verify Local Environment (Working ✅)

Your local environment is correctly configured with:
- ✅ AWS credentials are valid
- ✅ S3 bucket access is working
- ✅ Upload functionality works locally

### Step 2: Fix Production Environment

#### 2.1 Check Production Environment Variables

SSH into your production server and verify:

```bash
echo $IM_AWS_ACCESS_KEY
echo $IM_AWS_SECRET_KEY  
echo $AWS_S3_BUCKET_NAME
echo $AWS_REGION
```

#### 2.2 Set Correct Environment Variables

Ensure your production server has these exact values:

```bash
export IM_AWS_ACCESS_KEY="AKIAU6VTTMQEZIR67CE6"
export IM_AWS_SECRET_KEY="your_actual_secret_key_here"
export AWS_S3_BUCKET_NAME="medhdocuments"
export AWS_REGION="ap-south-1"
```

Or add them to your `.env` file:

```bash
IM_AWS_ACCESS_KEY=AKIAU6VTTMQEZIR67CE6
IM_AWS_SECRET_KEY=your_actual_secret_key_here
AWS_S3_BUCKET_NAME=medhdocuments
AWS_REGION=ap-south-1
```

#### 2.3 Test AWS Configuration

Run the diagnostic script to verify:

```bash
node scripts/diagnose-aws-credentials.js
```

#### 2.4 Restart Production Server

```bash
# If using PM2:
pm2 restart all --update-env

# If using Docker:
docker-compose restart

# If using systemd:
sudo systemctl restart your-app-service
```

### Step 3: Use Deployment Script

For future deployments, use the automated script:

```bash
./scripts/deploy-production.sh
```

This script will:
- ✅ Verify all environment variables
- ✅ Test AWS credentials
- ✅ Install dependencies
- ✅ Restart the application
- ✅ Perform health checks

## 🔧 Improvements Made

### Enhanced AWS Configuration (`config/aws-config.js`)

- ✅ Added environment variable validation on startup
- ✅ Better error logging with specific AWS error types
- ✅ Consistent region configuration

### Enhanced Upload Error Handling (`utils/uploadFile.js`)

- ✅ Specific error messages for credential issues
- ✅ Better debugging information
- ✅ Proper error codes for different failure types

### Diagnostic Script (`scripts/diagnose-aws-credentials.js`)

- ✅ Comprehensive AWS credential testing
- ✅ Environment variable validation
- ✅ S3 bucket access verification
- ✅ Upload permission testing

### Deployment Script (`scripts/deploy-production.sh`)

- ✅ Automated environment validation
- ✅ AWS credential testing
- ✅ Application restart with multiple process managers
- ✅ Health check verification

## 🎯 Test the Fix

After deployment, test the course image upload:

```bash
curl -X POST "https://api.medh.co/api/v1/courses/67c194158a56e7688ddcf320/upload-image" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "base64String": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...",
    "fileType": "image"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Course image uploaded and course updated successfully",
  "data": {
    "courseId": "67c194158a56e7688ddcf320",
    "imageUrl": "https://medhdocuments.s3.ap-south-1.amazonaws.com/images/...",
    "course": { ... }
  }
}
```

## 🚨 Common Issues & Solutions

### Issue: "Invalid AWS Access Key ID"
**Solution:** Check that `IM_AWS_ACCESS_KEY` is correctly set in production

### Issue: "Invalid AWS Secret Access Key"  
**Solution:** Check that `IM_AWS_SECRET_KEY` is correctly set in production

### Issue: "NoSuchBucket"
**Solution:** Verify bucket name `medhdocuments` exists in region `ap-south-1`

### Issue: "Access Denied"
**Solution:** Check IAM permissions for S3 bucket access

### Issue: "UnknownEndpoint"
**Solution:** Verify `AWS_REGION` is set to `ap-south-1`

## 📋 Verification Checklist

- [ ] Production environment variables are set correctly
- [ ] AWS credentials are valid and not expired  
- [ ] S3 bucket `medhdocuments` exists in `ap-south-1`
- [ ] IAM user has S3 upload permissions
- [ ] Production server has been restarted
- [ ] Diagnostic script passes all tests
- [ ] Course image upload endpoint works

## 🔍 Monitoring

Monitor your application logs for:
- AWS configuration validation messages
- Specific AWS error types
- Upload success/failure metrics

The enhanced error handling will provide clearer diagnostic information for any future issues.

## 📞 Support

If issues persist after following this guide:

1. Run `node scripts/diagnose-aws-credentials.js` on production
2. Check application logs for specific error messages
3. Verify AWS IAM permissions and bucket policies
4. Ensure production security groups allow outbound HTTPS to AWS 