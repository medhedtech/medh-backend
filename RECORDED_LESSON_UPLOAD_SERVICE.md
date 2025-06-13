# Recorded Lesson Upload Service

This service provides a comprehensive solution for uploading recorded lessons via base64 encoding with automatic CloudFront URL signing and intelligent directory organization based on batch type.

## Features

### 🎯 **Smart Directory Organization**
- **Individual Batches**: Files uploaded to `{bucket}/student/{student_id}/`
- **Group Batches**: Files uploaded to `{bucket}/{batch_id}/`
- **Recorded Sessions**: General uploads go to `{bucket}/recorded-sessions/`

### 🔐 **CloudFront Security**
- Automatic CloudFront URL signing for secure video access
- Converts S3 URLs to CloudFront URLs (only for `medh-filess` bucket)
- Time-limited access (configurable expiry)
- Seamless integration with existing video infrastructure

### 📤 **Upload Methods**
- Base64 upload with automatic processing
- Chunked upload for large files (>25MB)
- Optimized upload for smaller files
- Multiple file format support (primarily video)

## API Endpoints

### 1. **Generic Recorded Lesson Upload**
```http
POST /api/v1/upload/recorded-lesson/base64
Authorization: Bearer <token>
Content-Type: application/json

{
  "base64String": "data:video/mp4;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEA...",
  "batchId": "6836bb36d5d3e50e4b812b84",
  "title": "Introduction to React",
  "sessionId": "6837142c52672ede1371493c", // Optional
  "recorded_date": "2025-01-07T10:00:00Z" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Recorded lesson uploaded successfully",
  "data": {
    "url": "https://medh-filess.s3.ap-south-1.amazonaws.com/videos/6836bb36d5d3e50e4b812b84/1704628800000-abc123.mp4",
    "batch": {
      "id": "6836bb36d5d3e50e4b812b84",
      "name": "React Fundamentals Batch",
      "type": "group"
    },
    "uploadPath": "videos/6836bb36d5d3e50e4b812b84",
    "lessonInfo": {
      "title": "Introduction to React",
      "recorded_date": "2025-01-07T10:00:00Z",
      "sessionId": "6837142c52672ede1371493c"
    }
  }
}
```

### 2. **Upload and Add to Batch Session**
```http
POST /api/v1/batches/{batchId}/schedule/{sessionId}/upload-recorded-lesson
Authorization: Bearer <token>

{
  "base64String": "data:video/mp4;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEA...",
  "title": "Live Session Recording",
  "recorded_date": "2025-01-07T14:30:00Z"
}
```


### 4. **Upload Recorded Session**
```http
POST /api/v1/recorded-sessions/upload
Authorization: Bearer <token>

{
  "base64String": "data:video/mp4;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEA...",
  "course_id": "64a1b2c3d4e5f6789abc1234",
  "title": "Advanced JavaScript Concepts",
  "description": "Deep dive into closures and async programming",
  "session_date": "2025-01-07T16:00:00Z",
  "duration": 3600
}
```

### 5. **Get Recorded Session with Signed URL**
```http
GET /api/v1/recorded-sessions/{sessionId}/signed
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Recorded session fetched successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789abc1234",
    "title": "Advanced JavaScript Concepts",
    "video_url": "https://medh-filess.s3.ap-south-1.amazonaws.com/videos/example.mp4",
    "signed_video_url": "https://cdn.medh.co/videos/example.mp4?Expires=1704629100&Signature=...",
    "course": {
      "id": "64a1b2c3d4e5f6789abc1234",
      "title": "Full Stack Development"
    }
  }
}
```

## Directory Structure Examples

### Individual Batch (1:1 Sessions)
```
medh-filess/
└── videos/
    └── student/
        └── 67cfe3a9a50dbb995b4d94da/
            ├── 1704628800000-abc123.mp4
            ├── 1704715200000-def456.mp4
            └── 1704801600000-ghi789.mp4
```

### Group Batch (Multiple Students)
```
medh-filess/
└── videos/
    └── 6836bb36d5d3e50e4b812b84/
        ├── 1704628800000-session1.mp4
        ├── 1704715200000-session2.mp4
        └── 1704801600000-session3.mp4
```

### General Recorded Sessions
```
medh-filess/
└── videos/
    └── recorded-sessions/
        ├── 1704628800000-javascript-basics.mp4
        ├── 1704715200000-react-hooks.mp4
        └── 1704801600000-nodejs-fundamentals.mp4
```

## CloudFront Configuration

### Environment Variables
```env
CLOUDFRONT_KEY_PAIR_ID=APKAEIBAERJR2EXAMPLE
CLOUDFRONT_PRIVATE_KEY_PATH=./private_key.pem
CLOUDFRONT_DEFAULT_EXPIRES_IN=300
```

### Key Generation
```bash
# Generate RSA private key
openssl genrsa -out private_key.pem 2048

# Generate public key
openssl rsa -pubout -in private_key.pem -out public_key.pem
```

### URL Signing Process
1. **S3 URLs** (`medh-filess` bucket) → Converted to CloudFront URLs → Signed
2. **CloudFront URLs** → Directly signed
3. **Other URLs** → Left unchanged
4. **YouTube URLs** → Left unchanged

## Integration with Existing Systems

### Batch Controller Integration
- Automatically determines upload path based on batch type
- Adds lessons to batch sessions when `sessionId` provided
- Generates signed URLs in student lesson fetch endpoints

### Recorded Session Controller Integration
- Creates session records with signed URLs
- Handles general course-level recordings
- Provides signed URL access for enrolled students

## Security Features

### Access Control
- JWT authentication required for all endpoints
- Role-based authorization (Admin, Instructor, Student)
- Students can only access their own recorded lessons

### Video Security
- Time-limited signed URLs (default: 5 minutes)
- CloudFront distribution prevents direct S3 access
- Automatic URL expiration and renewal

### File Validation
- Video file type validation
- File size limits (configurable via environment)
- Base64 format validation

## Performance Optimizations

### Upload Optimization
- **Small files (<25MB)**: Optimized single-request upload
- **Large files (>25MB)**: Chunked upload processing
- **Memory efficient**: Streaming processing for large files

### Response Optimization
- Compressed responses for large data
- Parallel processing where possible
- Efficient database queries with proper indexing

## Error Handling

### Upload Errors
- `INVALID_REQUEST`: Missing required fields
- `BATCH_NOT_FOUND`: Batch ID doesn't exist
- `NO_STUDENT_FOUND`: No student in individual batch
- `INVALID_FILE_TYPE`: Non-video file uploaded
- `FILE_TOO_LARGE`: Exceeds size limits

### Signing Errors
- Graceful fallback to original URLs
- Detailed error logging
- Non-blocking operation (doesn't fail main request)

## Usage Examples

### Frontend Implementation
```javascript
// Upload recorded lesson
const uploadRecordedLesson = async (batchId, sessionId, videoFile) => {
  const base64String = await fileToBase64(videoFile);
  
  const response = await fetch(`/api/v1/batches/${batchId}/schedule/${sessionId}/upload-recorded-lesson`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      base64String,
      title: 'Live Session Recording',
      recorded_date: new Date().toISOString()
    })
  });
  
  return response.json();
};

// Get student's recorded lessons with signed URLs
const getStudentLessons = async (studentId) => {
  const response = await fetch(`/api/v1/batches/students/${studentId}/recorded-lessons`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};
```

### Video Player Integration
```html
<!-- Use signed URL in video player -->
<video controls controlsList="nodownload">
  <source src="{{signedUrl}}" type="video/mp4">
  Your browser does not support the video tag.
</video>
```

## Monitoring and Analytics

### Logging
- Upload success/failure rates
- File size and processing time metrics
- CloudFront signing errors
- Student access patterns

### Metrics to Track
- Upload volume per batch type
- Average file sizes
- CloudFront cache hit rates
- URL signing performance

This service provides a complete solution for managing recorded lesson uploads with enterprise-grade security, performance, and scalability features. 