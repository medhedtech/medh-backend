# 🚀 MEDH Backend - Live Server Deployment Guide

## 📋 Overview
This guide helps you sync the latest local backend changes to your live/production server.

## 🔧 Key Changes to Deploy

### 1. Enhanced Video Upload System
- **File**: `controllers/liveClassesController.js`
- **Changes**: 
  - Improved error handling and detailed logging
  - Fixed S3 path structure (no more duplicate bucket names)
  - Enhanced progress tracking and user feedback
  - Better AWS configuration validation

### 2. Fixed Batch Data Fetching
- **File**: `controllers/liveClassesController.js` (lines 960-990)
- **Changes**: Added `getAllBatches` function to fetch batch data from database
- **Route**: `GET /api/v1/live-classes/batches`

### 3. Improved Route Handling
- **File**: `routes/liveClassesRoutes.js`
- **Changes**:
  - Enhanced Multer middleware integration
  - Better error handling for video uploads
  - Added comprehensive logging

### 4. AWS Configuration Fix
- **File**: `config/aws-config.js`
- **Changes**:
  - Fixed `UPLOAD_PATH_PREFIX` to prevent duplicate folders
  - Enhanced validation and error messages
  - Better S3 client initialization

### 5. Enhanced Middleware
- **File**: `middleware/upload.js`
- **Changes**:
  - Increased file size limit to 5GB per file
  - Better video file type validation

## 🚀 Deployment Steps

### Step 1: Backup Current Live Server
```bash
# On live server
cp -r /path/to/your/backend /path/to/backup_$(date +%Y%m%d)
```

### Step 2: Copy Updated Files
Copy these files from local to live server:

```bash
# Controllers
scp medh-backend/controllers/liveClassesController.js user@live-server:/path/to/backend/controllers/

# Routes  
scp medh-backend/routes/liveClassesRoutes.js user@live-server:/path/to/backend/routes/

# Configuration
scp medh-backend/config/aws-config.js user@live-server:/path/to/backend/config/

# Middleware
scp medh-backend/middleware/upload.js user@live-server:/path/to/backend/middleware/

# Main files
scp medh-backend/package.json user@live-server:/path/to/backend/
scp medh-backend/index.js user@live-server:/path/to/backend/
```

### Step 3: Update Environment Variables
Ensure your live server's `.env` file has these variables:

```env
# AWS Configuration (REQUIRED)
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_S3_BUCKET_NAME=medh-filess
AWS_REGION=ap-south-1

# MongoDB (REQUIRED)
MONGODB_URL=your_mongodb_connection_string

# JWT (REQUIRED)
JWT_SECRET_KEY=your_jwt_secret_key

# Server Configuration
PORT=8080
NODE_ENV=production

# Optional
REDIS_ENABLED=false
```

### Step 4: Install Dependencies
```bash
# On live server
cd /path/to/backend
npm install
```

### Step 5: Restart Server
```bash
# Using PM2
pm2 restart medh-backend

# OR using systemctl
systemctl restart medh-backend

# OR manual restart
pkill -f "node index.js"
NODE_ENV=production node index.js
```

## ✅ Testing After Deployment

### 1. Basic Health Check
```bash
curl http://your-live-server:8080/api/v1/live-classes/test-upload
```
**Expected**: `{"status":"success","message":"Test upload endpoint is working"}`

### 2. Batch Data Fetching
```bash
curl http://your-live-server:8080/api/v1/live-classes/batches
```
**Expected**: JSON array of batch data

### 3. Instructor Data
```bash
curl http://your-live-server:8080/api/v1/live-classes/instructors
```
**Expected**: JSON array of instructor data

### 4. Video Upload Test
```bash
curl -X POST \
  http://your-live-server:8080/api/v1/live-classes/upload-videos \
  -H "Content-Type: multipart/form-data" \
  -F "videos=@test-video.mp4" \
  -F "studentIds=[\"test_student_id\"]" \
  -F "batchId=test_batch_id" \
  -F "sessionNo=1"
```

## 🔍 Monitoring & Troubleshooting

### Common Issues:

#### 1. AWS Configuration Errors
**Error**: `Missing AWS configuration`
**Solution**: Check `.env` file has all AWS variables set

#### 2. MongoDB Connection Issues
**Error**: `MongoNetworkError`
**Solution**: Verify `MONGODB_URL` in `.env` file

#### 3. File Upload Errors
**Error**: `Multer error` or `File upload error`
**Solution**: Check file size limits and AWS credentials

#### 4. S3 Path Issues
**Error**: Duplicate folder names in S3
**Solution**: Ensure `UPLOAD_PATH_PREFIX=videos` (not `medh-filess/videos`)

### Log Monitoring:
```bash
# Monitor server logs
tail -f /path/to/backend/logs/server.log

# Monitor PM2 logs
pm2 logs medh-backend

# Monitor system logs
journalctl -u medh-backend -f
```

## 📊 Key Improvements Deployed

1. **✅ Video Upload**: Enhanced error handling, progress tracking
2. **✅ Batch Data**: Fixed database fetching, proper API responses
3. **✅ S3 Integration**: Fixed path structure, better AWS validation
4. **✅ Error Handling**: Comprehensive logging, user-friendly messages
5. **✅ File Size**: Increased limit to 5GB per video file
6. **✅ Network Handling**: Better timeout and connection error management

## 🆘 Rollback Plan

If issues occur after deployment:

1. **Stop current server**:
   ```bash
   pm2 stop medh-backend
   ```

2. **Restore backup**:
   ```bash
   cp -r /path/to/backup_YYYYMMDD/* /path/to/backend/
   ```

3. **Restart with backup**:
   ```bash
   pm2 start medh-backend
   ```

## 📞 Support

- **Development Team**: Contact for technical issues
- **Server Admin**: Contact for deployment/infrastructure issues
- **Documentation**: [Link to your internal docs]

---

**✅ Deployment completed successfully when all tests pass and logs show no errors.**












