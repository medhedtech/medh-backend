# Session-Based Video Upload Folder Structure

## Overview

The video upload system now organizes videos in a structured folder hierarchy based on batch, student, and session information. This ensures better organization and easier retrieval of videos for specific sessions.

## Folder Structure

```
medh-session/videos/{batch_object_id}/{student_id(student_name)}/{session_no}/
```

### Components

1. **Base Folder**: `medh-session/videos/`
2. **Batch Folder**: `{batch_object_id}` - The MongoDB ObjectId of the selected batch
3. **Student Folder**: `{student_id(student_name)}` - Student ID with their full name in parentheses
4. **Session Folder**: `session-{session_no}` - Session number prefixed with "session-"

### Examples

```
medh-session/videos/507f1f77bcf86cd799439011/507f1f77bcf86cd799439012(John Doe)/session-16/video1.mp4
medh-session/videos/507f1f77bcf86cd799439011/507f1f77bcf86cd799439013(Jane Smith)/session-16/video2.mp4
```

## Implementation Details

### Frontend Changes

1. **Validation**: Session number is now required before video upload
2. **Form Data**: Session number is included in the upload request
3. **User Feedback**: Success messages include session information

### Backend Changes

1. **Student Information**: Fetches student names from database
2. **S3 Key Generation**: Creates structured folder paths
3. **Metadata**: Includes session number in S3 metadata
4. **Response**: Returns session information in upload response

### API Endpoint

**POST** `/api/v1/live-classes/upload-videos`

#### Request Body (FormData)
- `videos`: Video files (multiple)
- `studentIds`: JSON array of student IDs
- `batchId`: Batch ID (optional)
- `sessionNo`: Session number

#### Response
```json
{
  "status": "success",
  "message": "Video(s) uploaded successfully",
  "data": {
    "videos": [
      {
        "fileId": "s3-key",
        "name": "video.mp4",
        "size": 1234567,
        "url": "https://bucket.s3.region.amazonaws.com/path",
        "studentId": "student-id",
        "studentName": "John Doe",
        "batchId": "batch-id",
        "batchName": "Batch Name",
        "sessionNo": "16",
        "s3Path": "medh-session/videos/batch-id/student-id(John Doe)/session-16/timestamp-random.mp4"
      }
    ],
    "studentBatchMapping": {},
    "totalSize": 1234567
  }
}
```

## Validation Rules

1. **Session Number**: Required before video upload
2. **Student Selection**: At least one student must be selected
3. **File Types**: MP4, MOV, WebM, AVI, MKV
4. **File Size**: Maximum 500MB per file

## Error Handling

- Missing session number: "Please enter session number before uploading videos"
- No students selected: "Please select at least one student before uploading videos"
- Invalid file type: "Invalid file type. Only MP4, MOV, WebM, AVI, MKV files are allowed"
- File too large: "File too large. Maximum size is 500MB"

## Testing

Use the test script `test-session-folder-upload.js` to verify the implementation:

```bash
node test-session-folder-upload.js
```

## Benefits

1. **Organized Storage**: Videos are logically organized by batch, student, and session
2. **Easy Retrieval**: Quick access to videos for specific sessions
3. **Scalable**: Structure supports multiple students and sessions
4. **Traceable**: Full audit trail with metadata
5. **User-Friendly**: Clear folder names with student names included

## Migration Notes

- Existing videos remain in their current locations
- New uploads follow the new structure
- No breaking changes to existing functionality
