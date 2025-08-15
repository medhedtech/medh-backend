# S3 Video Upload Testing Guide

This document provides comprehensive testing procedures for the S3 video upload functionality in the MEDH platform.

## 🎯 Test Objectives

1. **Verify S3 bucket connectivity and credentials**
2. **Test video upload with proper folder organization using batch ObjectIds**
3. **Validate batch and student data integration**
4. **Ensure video accessibility after upload**
5. **Check error handling and edge cases**

## 🧪 Test Scripts

### 1. Simple Test Script (Recommended)

```bash
# Navigate to backend directory
cd medh-backend

# Run the simple test script
node test-s3-simple.js
```

This script tests:
- ✅ Environment variables configuration
- ✅ S3 connection and credentials
- ✅ Batch and student organization
- 📝 Manual video upload testing

### 2. Batch ObjectId Test Script (New)

```bash
# Navigate to backend directory
cd medh-backend

# Run the batch ObjectId test script
node test-batch-s3-upload.js
```

This script tests:
- ✅ Available batches with their ObjectIds
- ✅ S3 connection verification
- ✅ Batch ObjectId folder structure validation
- 📝 Manual upload testing with proper S3 paths

### 3. Comprehensive Test Script (Advanced)

```bash
# Install dependencies (if needed)
npm install form-data node-fetch

# Run the comprehensive test
node test-s3-video-upload-flow.js
```

This script includes:
- ✅ Automated video upload testing
- ✅ S3 verification of uploaded files
- ✅ Video accessibility testing
- ✅ Complete end-to-end flow validation

## 🔧 Prerequisites

### Environment Variables

Ensure these variables are set in your `.env` file:

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
AWS_S3_BUCKET_NAME=medh-filess
MONGODB_URL=your_mongodb_url
```

### Backend Server

Make sure your backend server is running:

```bash
cd medh-backend
npm start
```

## 📋 Manual Testing Steps

### Step 1: Environment Check

1. **Check environment variables:**
   ```bash
   node -e "
   console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
   console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
   console.log('AWS_REGION:', process.env.AWS_REGION);
   console.log('AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME);
   "
   ```

2. **Test S3 connection:**
   ```bash
   curl -X GET http://localhost:8080/api/v1/live-classes/test-s3-connection
   ```

### Step 2: Get Available Batch ObjectIds

1. **Run the batch test script:**
   ```bash
   node test-batch-s3-upload.js
   ```

2. **Note the available batch ObjectIds:**
   ```
   📚 Available Batch ObjectIds for testing:
      1. Batch Name: 689ba08c5eba793ac7f42a58
      2. Another Batch: 689ba08c5eba793ac7f42a59
   ```

### Step 3: Frontend Video Upload Test

1. **Navigate to the Create Live Session form:**
   - Go to `/dashboards/admin/online-class/create`
   - Or use the navigation menu

2. **Select test data:**
   - Choose a course category
   - **Select a batch from the dropdown (this will use the batch ObjectId)**
   - Select one or more students
   - Choose a grade level
   - Select an instructor
   - Pick a dashboard

3. **Upload a test video:**
   - Click "Select Video Files"
   - Choose a small video file (1-5 MB)
   - Click "Upload Videos"
   - Monitor the console for upload progress

4. **Verify upload success:**
   - Check for success toast notification
   - Verify video appears in "Uploaded Videos" section
   - Note the S3 path and URL

### Step 4: S3 Bucket Verification

1. **Check S3 bucket structure with batch ObjectId:**
   ```
   medh-filess/
   └── videos/
       └── {batchObjectId}/  ← MongoDB ObjectId (e.g., 689ba08c5eba793ac7f42a58)
           └── {studentId}/
               └── {timestamp}-{random}.mp4
   ```

2. **Verify file accessibility:**
   - Copy the video URL from the frontend
   - Open in browser or use curl to test access
   - Verify content-type is `video/mp4`

### Step 5: Database Integration Test

1. **Check session creation:**
   - Fill out the complete form
   - Submit the session
   - Verify session is saved in database

2. **Verify video references:**
   - Check that video URLs are stored in session
   - Verify student-batch relationships
   - Confirm batch ObjectId is correctly stored

## 🔍 Expected Test Results

### ✅ Successful Test Outcomes

1. **S3 Connection Test:**
   ```
   ✅ S3 Connection Test: PASSED
      - Bucket Name: medh-filess
      - Region: us-east-1
      - Access Status: accessible
   ```

2. **Video Upload Test with Batch ObjectId:**
   ```
   ✅ Video Upload Test: PASSED
      - Uploaded Videos: 1
      - Student-Batch Mapping: 1 students
      📹 Video 1:
         - Name: test-video.mp4
         - Size: 1.00 MB
         - S3 Key: videos/689ba08c5eba793ac7f42a58/689ba08c5eba793ac7f42a4e/test-video.mp4
         - URL: https://medh-filess.s3.amazonaws.com/videos/689ba08c5eba793ac7f42a58/...
         - Student ID: 689ba08c5eba793ac7f42a4e
         - Batch ID: 689ba08c5eba793ac7f42a58 (MongoDB ObjectId)
         - Batch Name: Test Batch
   ```

3. **Frontend Display:**
   - Video appears in "Uploaded Videos" section
   - Success notification shows
   - Video URL is accessible
   - S3 path shows correct batch ObjectId

### ❌ Common Failure Scenarios

1. **S3 Credentials Error:**
   ```
   ❌ S3 Connection Test: FAILED
      - Error: The AWS Access Key Id you provided does not exist
   ```
   **Solution:** Check AWS credentials in `.env` file

2. **Bucket Access Error:**
   ```
   ❌ S3 Connection Test: FAILED
      - Error: Access Denied
   ```
   **Solution:** Verify bucket permissions and IAM roles

3. **Upload Size Error:**
   ```
   ❌ Video Upload Test: FAILED
      - Error: File too large
   ```
   **Solution:** Check file size limits in multer configuration

4. **Database Connection Error:**
   ```
   ❌ Batch & Student Organization Test: FAILED
      - Error: connect ECONNREFUSED
   ```
   **Solution:** Ensure MongoDB is running and accessible

5. **Batch ObjectId Not Found:**
   ```
   ❌ Video Upload Test: FAILED
      - Error: Invalid batch ID provided
   ```
   **Solution:** Verify the batch exists in MongoDB and ObjectId is correct

## 🛠️ Troubleshooting

### S3 Issues

1. **Invalid credentials:**
   - Verify AWS credentials in `.env`
   - Check IAM user permissions
   - Ensure credentials have S3 access

2. **Bucket not found:**
   - Verify bucket name in `.env`
   - Check bucket exists in AWS console
   - Ensure bucket is in correct region

3. **Permission denied:**
   - Check IAM policies for S3 access
   - Verify bucket permissions
   - Ensure user has `s3:PutObject` permission

### Database Issues

1. **Connection refused:**
   - Check MongoDB service is running
   - Verify connection string in `.env`
   - Test connection with MongoDB client

2. **Collection not found:**
   - Ensure database and collections exist
   - Check collection names in models
   - Verify data seeding scripts ran

3. **Batch ObjectId issues:**
   - Verify batch exists in MongoDB
   - Check batch ObjectId format (24 character hex string)
   - Ensure batch is properly linked to course

### Frontend Issues

1. **Upload not working:**
   - Check browser console for errors
   - Verify API endpoint is accessible
   - Check CORS configuration

2. **Video not displaying:**
   - Verify video URL is accessible
   - Check S3 bucket public access
   - Test video URL in browser

3. **Batch selection issues:**
   - Verify batch dropdown is populated
   - Check batch ObjectId is being sent correctly
   - Ensure batch is active and available

## 📊 Test Reporting

After running tests, document:

1. **Test Environment:**
   - Date and time
   - Environment (dev/staging/prod)
   - AWS region and bucket
   - Database connection status
   - Available batch ObjectIds

2. **Test Results:**
   - Pass/fail status for each test
   - Error messages and resolutions
   - Performance metrics (upload time, file size)
   - S3 folder structure verification

3. **Issues Found:**
   - Bug descriptions
   - Steps to reproduce
   - Suggested fixes

## 🔄 Continuous Testing

### Automated Testing

Consider setting up automated tests:

1. **GitHub Actions workflow**
2. **Scheduled S3 connectivity checks**
3. **Video upload regression tests**
4. **Batch ObjectId validation tests**

### Monitoring

Set up monitoring for:

1. **S3 upload success rates**
2. **Video accessibility**
3. **Upload performance metrics**
4. **Error rates and types**
5. **Batch ObjectId usage patterns**

## 📝 Test Checklist

- [ ] Environment variables configured
- [ ] Backend server running
- [ ] S3 connection test passed
- [ ] Database connection verified
- [ ] Available batch ObjectIds identified
- [ ] Video upload test completed
- [ ] S3 bucket structure verified (with batch ObjectId)
- [ ] Video accessibility confirmed
- [ ] Frontend integration tested
- [ ] Error handling validated
- [ ] Performance metrics recorded

## 🎉 Success Criteria

The S3 video upload system is working correctly when:

1. ✅ All automated tests pass
2. ✅ Manual upload through frontend works
3. ✅ Videos are stored in correct S3 folders using batch ObjectIds
4. ✅ Video URLs are accessible
5. ✅ Database integration is functional
6. ✅ Error handling works properly
7. ✅ Performance meets requirements
8. ✅ Batch ObjectId folder structure is correct

## 🔍 Key Changes Made

### S3 Folder Structure Update

**Before:**
```
medh-filess/videos/{batch_name}/{student_id}/video.mp4
```

**After:**
```
medh-filess/videos/{batchObjectId}/{student_id}/video.mp4
```

### Batch ObjectId Usage

- Videos are now organized by MongoDB batch ObjectId instead of batch name
- This ensures unique folder structure even with similar batch names
- Provides direct mapping to database records
- Maintains data integrity and consistency

---

**Note:** This testing guide should be updated as the system evolves. Always test in a development environment before deploying to production.
