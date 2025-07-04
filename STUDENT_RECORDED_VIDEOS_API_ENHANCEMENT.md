# Student Recorded Videos API Enhancement

## Overview

Enhanced the `getRecordedLessonsForStudent` function to directly fetch all recorded videos for a student from S3, bypassing the folder structure and database lookups for improved performance and completeness.

## API Endpoint

```
GET /api/v1/batches/students/:studentId/recorded-lessons
```

### Authorization
- **Admin/Instructor/Super-Admin**: Can access any student's recorded lessons
- **Student**: Can only access their own recorded lessons

## New Implementation Features

### 🚀 **Dual Data Sources**
- **Your Previous Sessions**: Direct S3 listing of files under `videos/student/{studentId}/` including all subfolders
- **Scheduled Sessions**: Database lookup for recorded lessons in batch sessions
- **Combined Response**: Organizes data from both sources in a structured format
- **Independent Operation**: Both methods run independently for complete coverage
- **Recursive Discovery**: Finds videos in nested folder structures (e.g., `videos/student/{studentId}/isaac/subfolder/video.mp4`)

### 🔄 **Enhanced Logic Flow**
1. **Step 1**: Check S3 for direct uploads (Your Previous Sessions)
2. **Step 2**: Query database for scheduled session recordings
3. **Step 3**: Combine both results in organized response structure
4. **Always Available**: Both data sources are checked regardless of individual failures

### 🔍 **Enhanced Subfolder Discovery**
- **Recursive Search**: Discovers videos in any subfolder depth under `videos/student/{studentId}/`
- **Folder Tracking**: Each video includes `folderPath` showing its subfolder location
- **Video File Filtering**: Only includes files with video extensions (.mp4, .avi, .mov, .wmv, .flv, .webm, .mkv, .m4v)
- **Debug Logging**: Provides detailed logs about folder distribution and file discovery
- **Example Paths**: 
  - `videos/student/123/isaac/session1/recording.mp4`
  - `videos/student/123/batch-recordings/week1/lesson.mp4`
  - `videos/student/123/direct-upload.mp4`

### 🔐 **Security Features**
- **Signed URLs**: All S3 URLs are converted to signed CloudFront URLs
- **Secure Access**: Time-limited access to video content
- **Error Handling**: Individual source failures don't affect the other source

## Request Example

```bash
curl -X GET "https://api.medh.co/api/v1/batches/students/60f7b3b3b3b3b3b3b3b3b3b3/recorded-lessons" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## Response Format

### Successful Combined Response (S3 + Database)

```json
{
  "success": true,
  "count": 8,
  "method": "Combined (S3 + Database)",
  "message": "Retrieved 8 recorded videos for student",
  "s3_available": true,
  "data": {
    "your_previous_sessions": {
      "count": 5,
      "description": "Videos uploaded directly to your personal folder",
      "videos": [
        {
          "id": "videos_student_60f7b3b3b3b3b3b3b3b3b3b3_session1_mp4",
          "title": "1704067200000-abc123.mp4",
          "url": "https://cdn.medh.co/videos/student/60f7b3b3b3b3b3b3b3b3b3b3/1704067200000-abc123.mp4?signature=...",
          "originalUrl": "https://medh-filess.s3.us-east-1.amazonaws.com/videos/student/60f7b3b3b3b3b3b3b3b3b3b3/1704067200000-abc123.mp4",
          "fileSize": 45678912,
          "lastModified": "2024-01-01T10:30:00.000Z",
          "source": "your_previous_sessions",
          "student": {
            "id": "60f7b3b3b3b3b3b3b3b3b3b3",
            "name": "John Doe"
          }
        }
      ]
    },
    "scheduled_sessions": {
      "count": 3,
      "description": "Videos from your scheduled batch sessions",
      "sessions": [
        {
          "batch": {
            "id": "60f7b3b3b3b3b3b3b3b3b3b4",
            "name": "Java Basics - Individual Session"
          },
          "session": {
            "id": "60f7b3b3b3b3b3b3b3b3b3b5",
            "day": "Monday",
            "start_time": "10:00",
            "end_time": "11:00"
          },
          "recorded_lessons": [
            {
              "title": "Introduction to Variables",
              "url": "https://cdn.medh.co/videos/student/60f7b3b3b3b3b3b3b3b3b3b3/lesson1.mp4?signature=...",
              "recorded_date": "2024-01-01T10:30:00.000Z",
              "created_by": "60f7b3b3b3b3b3b3b3b3b3b6"
            }
          ],
          "source": "scheduled_sessions"
        }
      ]
    }
  }
}
```

### S3 Only Response

```json
{
  "success": true,
  "count": 5,
  "method": "S3 Direct Listing",
  "message": "Retrieved 5 recorded videos for student",
  "s3_available": true,
  "data": {
    "your_previous_sessions": {
      "count": 5,
      "description": "Videos uploaded directly to your personal folder",
      "videos": [
        {
          "id": "videos_student_60f7b3b3b3b3b3b3b3b3b3b3_session1_mp4",
          "title": "1704067200000-abc123.mp4",
          "url": "https://cdn.medh.co/videos/student/60f7b3b3b3b3b3b3b3b3b3b3/1704067200000-abc123.mp4?signature=...",
          "originalUrl": "https://medh-filess.s3.us-east-1.amazonaws.com/videos/student/60f7b3b3b3b3b3b3b3b3b3b3/1704067200000-abc123.mp4",
          "fileSize": 45678912,
          "lastModified": "2024-01-01T10:30:00.000Z",
          "source": "your_previous_sessions",
          "student": {
            "id": "60f7b3b3b3b3b3b3b3b3b3b3",
            "name": "John Doe"
          }
        }
      ]
    },
    "scheduled_sessions": {
      "count": 0,
      "description": "Videos from your scheduled batch sessions",
      "sessions": []
    }
  }
}
```

```

### Database Fallback Response (S3 Unavailable)

```json
{
  "success": true,
  "count": 3,
  "method": "Database Fallback", 
  "message": "Retrieved 3 recorded videos for student",
  "s3_available": false,
  "data": {
    "your_previous_sessions": {
      "count": 0,
      "description": "Videos uploaded directly to your personal folder",
      "videos": []
    },
    "scheduled_sessions": {
      "count": 3,
      "description": "Videos from your scheduled batch sessions",
      "sessions": [
        {
          "batch": {
            "id": "60f7b3b3b3b3b3b3b3b3b3b4",
            "name": "Java Basics - Individual Session"
          },
          "session": {
            "id": "60f7b3b3b3b3b3b3b3b3b3b5",
            "day": "Monday",
            "start_time": "10:00",
            "end_time": "11:00"
          },
          "recorded_lessons": [
            {
              "title": "Introduction to Variables",
              "url": "https://cdn.medh.co/videos/student/60f7b3b3b3b3b3b3b3b3b3b3/lesson1.mp4?signature=...",
              "recorded_date": "2024-01-01T10:30:00.000Z",
              "created_by": "60f7b3b3b3b3b3b3b3b3b3b6"
            }
          ],
          "source": "scheduled_sessions"
        }
      ]
    }
  }
}
```

### Empty Response (No Videos Found)

```json
{
  "success": true,
  "count": 0,
  "method": "Combined (S3 + Database)",
  "message": "Retrieved 0 recorded videos for student",
  "s3_available": true,
  "data": {
    "your_previous_sessions": {
      "count": 0,
      "description": "Videos uploaded directly to your personal folder",
      "videos": []
    },
    "scheduled_sessions": {
      "count": 0,
      "description": "Videos from your scheduled batch sessions",
      "sessions": []
    }
  }
}
```

## Implementation Details

### S3 Configuration
- **Bucket**: Uses `ENV_VARS.UPLOAD_CONSTANTS.BUCKET_NAME`
- **Prefix**: `videos/student/{studentId}/`
- **Max Results**: 1000 files (configurable)

### CloudFront Integration
- **CDN URL**: `https://cdn.medh.co/{objectKey}`
- **Signed URLs**: Automatic signing for secure access
- **Fallback**: Original S3 URLs if signing fails

### Error Handling
- **S3 Errors**: Logged and gracefully handled with database fallback
- **Signing Errors**: Individual URL signing failures don't break the response
- **Authorization**: Proper role-based access control

## Benefits

### 🎯 **Complete Video Discovery**
- **Two Data Sources**: Combines S3 direct files AND database scheduled sessions
- **No Missing Content**: Finds both direct uploads and session recordings
- **Organized Presentation**: Clear separation between "Your Previous Sessions" and "Scheduled Sessions"
- **Comprehensive Coverage**: No dependency on single data source

### ⚡ **Improved Performance & Reliability**
- **Parallel Processing**: Both S3 and database queries run independently
- **Fault Tolerance**: Failure of one source doesn't affect the other
- **Always Available**: Ensures some data is returned even if one source fails
- **Optimal Speed**: Uses the fastest available method for each data source

### 🛡️ **Enhanced User Experience**
- **Logical Organization**: Videos grouped by their source/context
- **Clear Descriptions**: Each section explains what type of videos it contains
- **Complete Metadata**: File sizes, timestamps, and source information
- **Intuitive Structure**: Easy for frontend to display appropriately

### 📊 **Better Metadata**
- File size information from S3
- Accurate last modified timestamps
- Original and signed URL access

## Usage Examples

### Frontend Integration

```javascript
// Fetch all recorded videos for a student
const getStudentVideos = async (studentId) => {
  try {
    const response = await fetch(`/api/v1/batches/students/${studentId}/recorded-lessons`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`Found ${result.count} videos using ${result.method}`);
      return result.data;
    }
  } catch (error) {
    console.error('Error fetching student videos:', error);
  }
};

// Video player component with organized sections
const VideoList = ({ studentId }) => {
  const [videoData, setVideoData] = useState(null);
  
  useEffect(() => {
    getStudentVideos(studentId).then(setVideoData);
  }, [studentId]);
  
  if (!videoData) return <div>Loading...</div>;
  
  return (
    <div className="student-videos">
      {/* Your Previous Sessions Section */}
      <div className="video-section">
        <h2>Your Previous Sessions ({videoData.your_previous_sessions.count})</h2>
        <p>{videoData.your_previous_sessions.description}</p>
        <div className="video-grid">
          {videoData.your_previous_sessions.videos.map(video => (
            <div key={video.id} className="video-card">
              <video controls>
                <source src={video.url} type="video/mp4" />
              </video>
              <div className="video-info">
                <h4>{video.title}</h4>
                <p>Size: {(video.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                <p>Date: {new Date(video.lastModified).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Scheduled Sessions Section */}
      <div className="video-section">
        <h2>Scheduled Sessions ({videoData.scheduled_sessions.count})</h2>
        <p>{videoData.scheduled_sessions.description}</p>
        <div className="sessions-list">
          {videoData.scheduled_sessions.sessions.map(session => (
            <div key={session.session.id} className="session-card">
              <h3>{session.batch.name}</h3>
              <p>{session.session.day} - {session.session.start_time} to {session.session.end_time}</p>
              <div className="session-videos">
                {session.recorded_lessons.map((lesson, index) => (
                  <div key={index} className="lesson-video">
                    <video controls>
                      <source src={lesson.url} type="video/mp4" />
                    </video>
                    <h4>{lesson.title}</h4>
                    <p>Recorded: {new Date(lesson.recorded_date).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to get total video count
const getTotalVideoCount = (videoData) => {
  const previousSessionsCount = videoData.your_previous_sessions.count;
  const scheduledSessionsCount = videoData.scheduled_sessions.sessions.reduce((total, session) => {
    return total + (session.recorded_lessons ? session.recorded_lessons.length : 0);
  }, 0);
  return previousSessionsCount + scheduledSessionsCount;
};
```

## Configuration

### Environment Variables Required
- `IM_AWS_ACCESS_KEY` - AWS Access Key
- `IM_AWS_SECRET_KEY` - AWS Secret Key  
- `AWS_REGION` - AWS Region (e.g., us-east-1)
- `AWS_S3_BUCKET_NAME` - S3 Bucket name
- CloudFront signing configuration

### Security Considerations
- Student folder isolation: `videos/student/{studentId}/`
- Signed URLs with expiration
- Role-based access control
- Error logging without exposing sensitive data

## Testing

### Manual Testing
```bash
# Test for existing student
curl -X GET "http://localhost:5000/api/v1/batches/students/STUDENT_ID/recorded-lessons" \
  -H "Authorization: Bearer JWT_TOKEN"

# Test unauthorized access
curl -X GET "http://localhost:5000/api/v1/batches/students/OTHER_STUDENT_ID/recorded-lessons" \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"
```

### Expected Behaviors
1. **S3 Success**: Returns direct S3 listing with `method: "S3 Direct Listing"`
2. **S3 Failure**: Falls back to database with `method: "Database Fallback"`
3. **No Videos**: Returns empty array with `count: 0`
4. **Unauthorized**: Returns 403 for students accessing other students' data

## Future Enhancements

1. **Pagination**: Add support for large video collections
2. **Filtering**: Add date range and file type filters
3. **Caching**: Cache S3 results for improved performance
4. **Metadata**: Store and retrieve additional video metadata
5. **Thumbnails**: Generate and serve video thumbnails
