# Video Upload Implementation

## Overview
This implementation provides a fresh video upload functionality that uploads videos to AWS S3 with a specific folder structure.

## Folder Structure
```
/medh-filess/videos/batch_object_id/student_object_id(student_name)/session_number/
```

### Example:
```
/medh-filess/videos/507f1f77bcf86cd799439011/507f1f77bcf86cd799439012(john_doe)/session-1/
/medh-filess/videos/507f1f77bcf86cd799439011/507f1f77bcf86cd799439013(jane_smith)/session-1/
```

## Backend Implementation

### 1. Controller (`liveClassesController.js`)
- **Function**: `uploadVideos`
- **Purpose**: Handles video upload logic
- **Features**:
  - Validates required fields (studentIds, batchId, sessionNo)
  - Gets student names for folder structure
  - Creates S3 folder structure dynamically
  - Uploads videos to AWS S3
  - Returns upload results with metadata

### 2. Middleware (`upload.js`)
- **Function**: `uploadVideos`
- **Purpose**: Handles file upload using multer
- **Features**:
  - Accepts video files only (MP4, MOV, WebM, AVI, MKV)
  - 500MB file size limit per file
  - Maximum 10 files per upload
  - Memory storage for S3 upload

### 3. Batch Selection Logic
- **Data Source**: Uses `enrolled_student_ids` field in batches collection
- **Query**: Direct batch lookup instead of enrollment join
- **Performance**: Faster queries with direct batch-student mapping
- **Maintenance**: Requires running update script for existing data

### 4. Routes (`liveClassesRoutes.js`)
- **Endpoint**: `POST /api/v1/live-classes/upload-videos`
- **Purpose**: Handles upload requests
- **Features**:
  - Uses uploadVideos middleware
  - Handles multer errors
  - Calls uploadVideos controller

- **Endpoint**: `GET /api/v1/live-classes/batches-for-students`
- **Purpose**: Gets available batches for selected students
- **Features**:
  - Accepts student IDs as query parameter
  - Returns unique batches where students are enrolled
  - Sorted by start date (newest first)
  - Uses direct batch lookup with enrolled_student_ids

## Frontend Implementation

### 1. CreateLiveSessionForm Component
- **Location**: `medh-web/src/components/Dashboard/admin/online-class/CreateLiveSessionForm.tsx`
- **Features**:
  - Video file selection
  - Multiple video upload support
  - Progress tracking
  - Upload status display
  - Video preview and management

### 2. Key Functions
- `handleVideoSelect`: Handles video file selection
- `uploadVideos`: Performs video upload to backend
- `removeSelectedVideo`: Removes selected videos
- `removeUploadedVideo`: Removes uploaded videos
- `formatFileSize`: Formats file sizes for display
- `fetchBatchesForStudents`: Fetches available batches for selected students
- `handleStudentSelect`: Handles student selection and triggers batch loading
- `handleStudentRemove`: Handles student removal and updates batch list

## API Request Format

### Request
```javascript
POST /api/v1/live-classes/upload-videos
Content-Type: multipart/form-data

FormData:
- videos: File[] (video files)
- studentIds: string (JSON array of student IDs)
- batchId: string (batch object ID)
- sessionNo: string (session number)
```

### Response
```javascript
{
  "status": "success",
  "message": "2 video(s) uploaded successfully",
  "data": {
    "videos": [
      {
        "fileId": "medh-filess/videos/batch123/student456(john_doe)/session-1/1234567890-abc123.mp4",
        "name": "video1.mp4",
        "size": 1024000,
        "url": "https://bucket.s3.region.amazonaws.com/medh-filess/videos/batch123/student456(john_doe)/session-1/1234567890-abc123.mp4",
        "studentId": "student456",
        "sessionNo": "1",
        "batchId": "batch123",
        "s3Path": "medh-filess/videos/batch123/student456(john_doe)/session-1/1234567890-abc123.mp4",
        "studentName": "john_doe",
        "uploadedAt": "2024-01-01T12:00:00.000Z"
      }
    ],
    "folderStructure": "medh-filess/videos/batch123/[student_id]([student_name])/session-1/"
  }
}
```

## Usage Instructions

### 1. Prerequisites
- AWS S3 credentials configured
- Backend server running on port 8080
- Frontend application running

### 2. Upload Process
1. **Select Students**: Choose students from the dropdown
2. **Select Batch**: After selecting students, a "Batch Select" dropdown appears showing available batches for those students
3. **Enter Session Number**: Provide the session number for video organization
4. **Upload Videos**: Click "Select Video Files" to choose videos, then "Upload Videos" to upload to S3
5. **Monitor Progress**: Watch upload progress and status

### 3. Batch Selection Logic
- **Dynamic Loading**: Batches are automatically loaded when students are selected
- **Student-Batch Mapping**: Only shows batches where selected students are enrolled
- **Real-time Updates**: Batch list updates when students are added/removed
- **Single Selection**: Only one batch can be selected per upload session

### 4. Validation
- Students must be selected
- Batch must be selected (only appears after student selection)
- Session number must be provided
- Only video files are accepted
- File size limit: 500MB per file
- Maximum 10 files per upload

## Testing

### Test Scripts
Run the test scripts to verify functionality:

1. **Video Upload Test**:
```bash
node test-video-upload.js
```

2. **Batch Selection Test**:
```bash
node test-new-batch-selection.js
```

3. **Database Update Script** (for existing data):
```bash
node update-batches-with-student-ids.js
```

### Manual Testing
1. Start backend server
2. Start frontend application
3. Navigate to Create Live Session form
4. Fill required fields
5. Upload test videos
6. Verify S3 folder structure

## Error Handling

### Common Errors
- **No video files**: "No video files uploaded"
- **Missing fields**: "Student IDs, Batch ID, and Session Number are required"
- **Invalid file type**: Only video files allowed
- **File too large**: Maximum 500MB per file
- **AWS configuration**: Missing S3 credentials
- **Network errors**: Connection timeout or server errors

### Error Response Format
```javascript
{
  "status": "error",
  "message": "Error description"
}
```

## Security Considerations

1. **File Validation**: Only video files accepted
2. **Size Limits**: 500MB per file, 10 files max
3. **Authentication**: JWT token required
4. **Input Sanitization**: Student names sanitized for folder names
5. **Unique Filenames**: Timestamp and random string for uniqueness

## Future Enhancements

1. **Progress Tracking**: Real-time upload progress
2. **Video Processing**: Thumbnail generation
3. **Compression**: Automatic video compression
4. **Batch Operations**: Bulk upload operations
5. **Retry Logic**: Automatic retry on failure
6. **Video Preview**: In-browser video preview
