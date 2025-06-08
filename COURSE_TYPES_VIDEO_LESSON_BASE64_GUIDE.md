# Course Types Video Lesson with Base64 Upload Guide

## Overview

The course-types routes now support adding video lessons with both traditional URL-based videos and base64-encoded video uploads. This enhancement allows for direct video file uploads without requiring separate upload endpoints.

## Base Path
```
/api/v1/tcourse
```

## Authentication
- **Admin Required**: All video lesson creation endpoints require admin authentication
- **Headers**: `Authorization: Bearer <jwt_token>`

---

## Video Lesson Endpoints

### 1. Add Video Lesson (URL-based)
**POST** `/:type/:id/curriculum/weeks/:weekId/video-lessons`

Traditional method using video URLs.

#### Request Body
```json
{
  "sectionId": "section_1_1",  // Optional
  "title": "JavaScript Fundamentals",
  "description": "Learn the basics of JavaScript",
  "video_url": "https://example.com/video.mp4",
  "duration": "25 minutes",
  "video_thumbnail": "https://example.com/thumb.jpg",
  "order": 1,
  "isPreview": true
}
```

### 2. Add Video Lesson (Base64 Upload)
**POST** `/:type/:id/curriculum/weeks/:weekId/video-lessons/base64`

Enhanced method supporting direct video file uploads via base64 encoding.

#### Request Body
```json
{
  "sectionId": "section_1_1",  // Optional
  "title": "JavaScript Advanced Concepts",
  "description": "Deep dive into advanced JavaScript",
  "video_base64": "data:video/mp4;base64,AAAIGZ0dHA...",
  "duration": "45 minutes",
  "video_thumbnail": "https://example.com/thumb.jpg",
  "order": 2,
  "isPreview": false
}
```

#### Base64 Video Format Support
- **Data URI Format**: `data:video/mp4;base64,<base64_data>`
- **Raw Base64**: Just the base64 string (assumes MP4)
- **Supported MIME Types**: `video/mp4`, `video/webm`, `video/avi`, `video/mov`
- **File Size Limit**: 100MB maximum

---

## Request Parameters

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Course type: `blended`, `live`, `free` |
| `id` | string | Course ID (MongoDB ObjectId) |
| `weekId` | string | Week ID (e.g., `week_1`) |

### Body Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Video lesson title |
| `description` | string | No | Video lesson description |
| `video_url` | string | No* | Direct video URL |
| `video_base64` | string | No* | Base64-encoded video data |
| `duration` | string | No | Video duration (e.g., "25 minutes") |
| `video_thumbnail` | string | No | Thumbnail image URL |
| `order` | number | No | Lesson order (default: 0) |
| `isPreview` | boolean | No | Preview availability (default: false) |
| `sectionId` | string | No | Section ID within week |

*Either `video_url` OR `video_base64` is required.

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Video lesson added to week successfully",
  "data": {
    "title": "JavaScript Advanced Concepts",
    "description": "Deep dive into advanced JavaScript",
    "lessonType": "video",
    "video_url": "https://medhdocuments.s3.ap-south-1.amazonaws.com/videos/1749140025780-fxzbr5.mp4",
    "duration": "45 minutes",
    "video_thumbnail": "https://example.com/thumb.jpg",
    "order": 2,
    "isPreview": false,
    "meta": {
      "uploadedViaBase64": true,
      "uploadTimestamp": "2025-01-21T10:30:00.000Z"
    },
    "resources": [],
    "id": "lesson_w1_5",
    "uploadMethod": "base64"
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Either video URL or base64 video data is required"
}
```

#### 413 Payload Too Large
```json
{
  "success": false,
  "message": "Video file size exceeds maximum limit of 100MB"
}
```

---

## Usage Examples

### cURL Examples

#### 1. URL-based Video Lesson
```bash
curl -X POST \
  "http://localhost:8080/api/v1/tcourse/blended/67e14360cd2f46d71bf0587c/curriculum/weeks/week_1/video-lessons" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "JavaScript Basics",
    "description": "Learn JavaScript fundamentals",
    "video_url": "https://example.com/video.mp4",
    "duration": "25 minutes",
    "isPreview": true
  }'
```

#### 2. Base64 Video Upload
```bash
curl -X POST \
  "http://localhost:8080/api/v1/tcourse/blended/67e14360cd2f46d71bf0587c/curriculum/weeks/week_1/video-lessons/base64" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Advanced JavaScript",
    "description": "Advanced concepts",
    "video_base64": "data:video/mp4;base64,AAAIGZ0dHA...",
    "duration": "45 minutes"
  }'
```

### JavaScript/Node.js Examples

#### Using Fetch API
```javascript
// Base64 video upload
const uploadVideoLesson = async (courseId, weekId, videoFile) => {
  // Convert file to base64
  const base64Data = await fileToBase64(videoFile);
  
  const response = await fetch(
    `/api/v1/tcourse/blended/${courseId}/curriculum/weeks/${weekId}/video-lessons/base64`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'My Video Lesson',
        description: 'Lesson description',
        video_base64: base64Data,
        duration: '30 minutes',
        isPreview: false
      })
    }
  );
  
  return response.json();
};

// Helper function to convert file to base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};
```

#### Using Axios
```javascript
const axios = require('axios');
const fs = require('fs');

// Upload video from file system
const uploadVideoFromFile = async (filePath, courseId, weekId) => {
  const videoBuffer = fs.readFileSync(filePath);
  const base64Data = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
  
  try {
    const response = await axios.post(
      `/api/v1/tcourse/blended/${courseId}/curriculum/weeks/${weekId}/video-lessons/base64`,
      {
        title: 'Uploaded Video Lesson',
        description: 'Video uploaded from file system',
        video_base64: base64Data,
        duration: '20 minutes'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Video uploaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('Upload failed:', error.response?.data || error.message);
    throw error;
  }
};
```

---

## Integration with Upload Routes

The video lesson functionality integrates with the existing upload system (`/api/v1/upload/base64`) for optimal performance:

- **Small videos** (< 25MB): Direct processing
- **Large videos** (> 25MB): Chunked processing
- **Automatic optimization**: Based on file size
- **S3 Storage**: Videos stored in `videos/` folder

---

## Best Practices

### 1. File Size Optimization
- Compress videos before base64 encoding
- Use appropriate video codecs (H.264 recommended)
- Consider video resolution vs. file size trade-offs

### 2. Error Handling
```javascript
try {
  const result = await uploadVideoLesson(courseId, weekId, videoFile);
  console.log('Success:', result);
} catch (error) {
  if (error.response?.status === 413) {
    console.error('File too large - compress video');
  } else if (error.response?.status === 400) {
    console.error('Invalid request:', error.response.data.message);
  } else {
    console.error('Upload failed:', error.message);
  }
}
```

### 3. Progress Tracking
For large files, consider implementing progress tracking:
```javascript
const uploadWithProgress = async (file, onProgress) => {
  const chunkSize = 1024 * 1024; // 1MB chunks
  const totalChunks = Math.ceil(file.size / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
    // Upload chunk...
    onProgress((i + 1) / totalChunks * 100);
  }
};
```

---

## Security Considerations

1. **File Type Validation**: Only video MIME types accepted
2. **Size Limits**: 100MB maximum per video
3. **Authentication**: Admin-only access
4. **Malware Scanning**: Consider implementing virus scanning
5. **Rate Limiting**: Implement upload rate limits

---

## Troubleshooting

### Common Issues

1. **"Base64 video data is too short"**
   - Ensure complete base64 string
   - Check for truncation during transmission

2. **"Invalid MIME type for video"**
   - Use proper data URI format: `data:video/mp4;base64,...`
   - Ensure video file is actually a video format

3. **"File size exceeds maximum limit"**
   - Compress video before upload
   - Use lower resolution or bitrate

4. **Upload timeout**
   - Increase server timeout settings
   - Use chunked upload for large files

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` to see detailed upload logs.

---

This enhanced video lesson system provides flexible options for content creators while maintaining security and performance standards. 