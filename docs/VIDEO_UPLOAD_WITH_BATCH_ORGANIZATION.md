# Video Upload with Batch and Student Organization

## Overview

This feature implements a comprehensive video upload system that automatically organizes videos in S3 based on student-batch relationships. When a video is uploaded, the system:

1. **Checks student enrollments** in the database
2. **Creates organized S3 folder structure** based on batch and student relationships
3. **Saves complete metadata** in the database
4. **Displays organized videos** in the frontend

## S3 Folder Structure

```
medh-filess/
└── videos/
    ├── {batch_id}/
    │   ├── {student_id_1}/
    │   │   ├── {timestamp}-{random}.mp4
    │   │   └── {timestamp}-{random}.mov
    │   └── {student_id_2}/
    │       └── {timestamp}-{random}.mp4
    └── no-batch/
        └── {student_id}/
            └── {timestamp}-{random}.mp4
```

## API Endpoints

### 1. Upload Videos with Batch Organization

**Endpoint:** `POST /api/v1/live-classes/upload-videos`

**Request:**
```javascript
const formData = new FormData();
formData.append('videos', videoFile1);
formData.append('videos', videoFile2);
formData.append('studentIds', JSON.stringify(['student_id_1', 'student_id_2']));
formData.append('batchId', 'optional_batch_id'); // Optional
```

**Response:**
```json
{
  "status": "success",
  "message": "2 video(s) uploaded successfully",
  "data": {
    "videos": [
      {
        "fileId": "videos/batch_id/student_id/timestamp-random.mp4",
        "name": "lecture.mp4",
        "size": 1024000,
        "url": "https://medh-filess.s3.region.amazonaws.com/videos/batch_id/student_id/timestamp-random.mp4",
        "type": "video/mp4",
        "uploadedAt": "2024-01-15T10:30:00.000Z",
        "studentId": "student_id",
        "studentName": "student_id",
        "batchId": "batch_id",
        "batchName": "Morning Batch - January 2025",
        "batchCode": "MB-202501",
        "s3Path": "videos/batch_id/student_id/timestamp-random.mp4"
      }
    ],
    "totalSize": 2048000,
    "studentBatchMapping": {
      "student_id_1": {
        "batchId": "batch_id",
        "batchName": "Morning Batch - January 2025",
        "batchCode": "MB-202501"
      },
      "student_id_2": {
        "batchId": "batch_id",
        "batchName": "Morning Batch - January 2025",
        "batchCode": "MB-202501"
      }
    },
    "batchInfo": {
      "id": "batch_id",
      "name": "Morning Batch - January 2025",
      "code": "MB-202501"
    }
  }
}
```

### 2. Get Student Batch Information

**Endpoint:** `GET /api/v1/live-classes/student-batch-info?studentIds=id1&studentIds=id2`

**Response:**
```json
{
  "status": "success",
  "data": {
    "studentBatchMapping": {
      "student_id_1": {
        "batchId": "batch_id",
        "batchName": "Morning Batch - January 2025",
        "batchCode": "MB-202501",
        "courseId": "course_id"
      }
    },
    "totalStudents": 2,
    "studentsWithBatches": 1
  }
}
```

## Database Schema

### Enrollment Model
```javascript
{
  student: ObjectId, // Reference to User/Student
  batch: ObjectId,   // Reference to Batch
  course: ObjectId,  // Reference to Course
  status: String,    // "active", "completed", etc.
  enrollment_date: Date
}
```

### Batch Model
```javascript
{
  _id: ObjectId,
  batch_name: String,
  batch_code: String,
  course: ObjectId,
  status: String,
  assigned_instructor: ObjectId,
  capacity: Number,
  enrolled_students: Number
}
```

## Frontend Integration

### 1. Upload Function
```javascript
const uploadVideos = async () => {
  const formData = new FormData();
  
  // Add video files
  selectedVideos.forEach(video => {
    formData.append('videos', video);
  });
  
  // Add student IDs
  if (formData.students && formData.students.length > 0) {
    formData.append('studentIds', JSON.stringify(formData.students));
  }
  
  // Add batch ID (optional)
  if (formData.batchId) {
    formData.append('batchId', formData.batchId);
  }
  
  const response = await fetch('/api/v1/upload-videos', {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Handle success
    const validVideos = result.data.videos;
    const studentBatchMapping = result.data.studentBatchMapping;
    
    // Update UI with uploaded videos
    setUploadedVideos(prev => [...prev, ...validVideos]);
    
    // Show success message with batch information
    const studentCount = Object.keys(studentBatchMapping).length;
    showToast.success(
      `🎬 ${validVideos.length} video(s) uploaded successfully!\n👥 Videos organized for ${studentCount} student(s) in their respective batch folders`
    );
  }
};
```

### 2. Display Uploaded Videos
```javascript
{uploadedVideos.map((video, index) => (
  <div key={video.fileId} className="video-item">
    <div className="video-info">
      <h4>{video.name}</h4>
      <p>Size: {formatFileSize(video.size)}</p>
      {video.studentId && (
        <p>👤 Student: {video.studentId}</p>
      )}
      {video.batchName && (
        <p>📚 Batch: {video.batchName}</p>
      )}
      {video.s3Path && (
        <p>📁 Path: {video.s3Path}</p>
      )}
    </div>
    <div className="video-actions">
      <a href={video.url} target="_blank" rel="noopener noreferrer">
        <FaPlay /> View
      </a>
      <button onClick={() => removeVideo(video.fileId)}>
        <FaTrash /> Remove
      </button>
    </div>
  </div>
))}
```

## Testing

### Test Script
```bash
# Test the complete flow
node test-complete-student-batch-upload.js
```

### Test Cases
1. **Student with Batch**: Video uploaded to `videos/{batch_id}/{student_id}/`
2. **Student without Batch**: Video uploaded to `videos/no-batch/{student_id}/`
3. **Multiple Students**: Each student gets their own folder
4. **Multiple Videos**: Each video gets unique filename
5. **Database Integration**: All metadata saved correctly

## Error Handling

### Common Errors
1. **No Student IDs**: Returns 400 error
2. **Invalid Student ID**: Student skipped, others processed
3. **S3 Upload Failure**: Returns 500 error with details
4. **Database Connection**: Returns 500 error

### Error Response Format
```json
{
  "status": "error",
  "message": "Error description",
  "error": "Detailed error information"
}
```

## Security Considerations

1. **File Validation**: Only video files allowed
2. **Size Limits**: Maximum 500MB per file
3. **Authentication**: JWT token required
4. **Input Sanitization**: All inputs validated
5. **S3 Permissions**: Proper IAM roles configured

## Performance Optimizations

1. **Parallel Uploads**: Multiple videos uploaded simultaneously
2. **Memory Management**: Files processed in memory, not disk
3. **Database Queries**: Optimized with proper indexing
4. **S3 Multipart**: Large files use multipart upload

## Monitoring and Logging

### Log Levels
- **INFO**: Successful uploads, file details
- **WARN**: Missing batch information, fallback paths
- **ERROR**: Upload failures, database errors

### Metrics
- Upload success rate
- File size distribution
- Student-batch mapping accuracy
- S3 upload latency

## Future Enhancements

1. **Video Processing**: Automatic compression and format conversion
2. **Thumbnail Generation**: Auto-generate video thumbnails
3. **Access Control**: Fine-grained permissions per student/batch
4. **Analytics**: Upload patterns and usage statistics
5. **Bulk Operations**: Support for bulk video uploads


