# Video Upload Setup Guide

## Overview
This guide explains how to set up the video upload functionality for live sessions in the MEDH platform.

## Features
- Multiple video file upload support (up to 10 files)
- Video file validation (MP4, MOV, WebM, AVI, MKV)
- File size limit: 500MB per file
- AWS S3 integration for secure storage
- Real-time upload progress
- Video preview and management

## Environment Variables

### Backend (.env file)
Add these variables to your `medh-backend/.env` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-s3-bucket-name-here
```

### Frontend (.env.local file)
Add these variables to your `medh-web/.env.local` file:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# AWS S3 Configuration (if needed for direct uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-s3-bucket-name-here
```

## AWS S3 Setup

1. **Create an S3 Bucket**:
   - Go to AWS S3 Console
   - Create a new bucket with a unique name
   - Enable versioning (recommended)
   - Configure CORS if needed

2. **Create IAM User**:
   - Go to AWS IAM Console
   - Create a new user with programmatic access
   - Attach the following policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
```

3. **Get Access Keys**:
   - After creating the IAM user, download the access keys
   - Add them to your environment variables

## API Endpoints

### Backend Routes
- `POST /api/v1/live-classes/upload-videos` - Upload multiple video files to S3

### Frontend Routes
- `POST /api/v1/upload-videos` - Next.js API route that proxies to backend

## File Structure

### Backend
```
medh-backend/
├── controllers/
│   └── liveClassesController.js (contains uploadVideos function)
├── routes/
│   └── liveClassesRoutes.js (contains upload route)
└── .env (AWS configuration)
```

### Frontend
```
medh-web/
├── src/
│   ├── app/
│   │   └── api/v1/upload-videos/
│   │       └── route.ts (Next.js API route)
│   └── components/
│       └── Dashboard/admin/online-class/
│           └── CreateLiveSessionForm.tsx (video upload UI)
└── .env.local (environment variables)
```

## Usage

1. **In the Live Session Form**:
   - Click "Select Video Files" to choose video files
   - Preview selected videos before upload
   - Click "Upload Videos" to upload to S3
   - View uploaded videos with play and remove options

2. **Video Management**:
   - Remove videos before upload using the X button
   - Remove uploaded videos using the trash icon
   - Play uploaded videos using the play icon

## Security Considerations

1. **File Validation**:
   - Only video MIME types are accepted
   - File size is limited to 500MB
   - File extensions are validated

2. **S3 Security**:
   - Use IAM roles with minimal required permissions
   - Consider using presigned URLs for direct uploads
   - Enable bucket versioning for backup

3. **Environment Variables**:
   - Never commit AWS credentials to version control
   - Use different credentials for development and production
   - Rotate access keys regularly

## Troubleshooting

### Common Issues

1. **Upload Fails**:
   - Check AWS credentials in environment variables
   - Verify S3 bucket name and region
   - Check file size and type restrictions

2. **CORS Errors**:
   - Configure CORS on your S3 bucket
   - Ensure proper headers are set

3. **File Not Found**:
   - Check S3 bucket permissions
   - Verify file path and naming

### Error Messages

- "No video files uploaded" - No files selected
- "Invalid file type" - File type not supported
- "File too large" - File exceeds 500MB limit
- "S3 bucket name not configured" - Missing AWS_S3_BUCKET_NAME
- "Failed to upload videos to S3" - AWS configuration or network issue

## Dependencies

### Backend
```json
{
  "@aws-sdk/client-s3": "^3.x.x",
  "@aws-sdk/s3-request-presigner": "^3.x.x"
}
```

### Frontend
No additional dependencies required (uses built-in fetch API)

## Testing

1. **Test File Upload**:
   - Try uploading different video formats
   - Test file size limits
   - Verify upload progress

2. **Test Error Handling**:
   - Try uploading non-video files
   - Test with files larger than 500MB
   - Test with invalid AWS credentials

3. **Test UI**:
   - Verify video preview functionality
   - Test remove video functionality
   - Check responsive design on mobile



