# Zoom Recording Sync System Documentation

## Overview

The Zoom Recording Sync System automatically downloads Zoom meeting recordings when meetings end and uploads them to S3 as recorded lessons in batch sessions. This eliminates the need for manual uploads and ensures all Zoom recordings are automatically available to students.

## Features

### 🔄 **Automatic Sync**

- Runs every 15 minutes via cron job
- Detects completed Zoom meetings
- Downloads recordings from Zoom cloud
- Uploads to S3 with proper folder structure
- Adds as recorded lessons to batch sessions

### 🎥 **Automatic Zoom Meeting Creation**

- **Auto-creates Zoom meetings** when scheduling new sessions
- **Configurable**: Can be disabled with `create_zoom_meeting: false`
- **Smart defaults**: Uses session time, duration, and course info
- **Student-friendly**: No authentication required for students to join
- **Recording enabled**: Cloud recording automatically enabled

### 📁 **Smart Folder Organization**

- **Individual batches**: `videos/student/{studentId}/`
- **Group batches**: `videos/{batchId}/`
- Automatic filename generation with timestamps

### 🎯 **Recording Types Supported**

- **MP4**: Video recordings
- **M4A**: Audio-only recordings
- **TXT**: Chat transcripts
- **VTT**: Closed captions
- **JSON**: Meeting metadata

### 🔧 **Manual Controls**

- Manual sync for specific batches
- Retry failed syncs
- Sync status monitoring
- Force sync options
- Manual Zoom meeting creation for existing sessions

## System Architecture

### 1. **Cron Job** (`cronjob/zoom-recording-sync.js`)

```javascript
// Runs every 15 minutes
cron.schedule("*/15 * * * *", async () => {
  await syncZoomRecordings();
});
```

### 2. **Database Schema Updates**

```javascript
// Zoom meeting tracking
zoom_meeting: {
  meeting_id: String,
  join_url: String,
  topic: String,
  password: String,
  start_url: String,
  recording_synced: Boolean,
  last_sync_date: Date,
  sync_attempts: Number,
  last_sync_error: String,
  next_retry_at: Date
}

// Recorded lesson metadata
recorded_lessons: [{
  source: 'zoom_auto_sync' | 'manual_upload' | 'external_link',
  zoom_recording_info: {
    meeting_id: String,
    file_type: String,
    file_size: Number,
    recording_start: Date,
    recording_end: Date,
    sync_date: Date
  }
}]
```

### 3. **API Endpoints**

#### Schedule Session with Auto Zoom Meeting

```http
POST /api/v1/batches/:batchId/schedule
Content-Type: application/json

{
  "date": "2024-01-15",
  "start_time": "10:00",
  "end_time": "11:30",
  "title": "Introduction to JavaScript",
  "description": "Learn the basics of JavaScript programming",
  "create_zoom_meeting": true
}
```

#### Manual Sync

```http
POST /api/v1/batches/:batchId/sync-zoom-recordings
```

#### Check Sync Status

```http
GET /api/v1/batches/:batchId/zoom-sync-status
```

#### Retry Failed Syncs

```http
POST /api/v1/batches/:batchId/retry-zoom-recordings
```

#### Create Zoom Meeting for Existing Session

```http
POST /api/v1/batches/:batchId/schedule/:sessionId/create-zoom-meeting
```

## Workflow

### 1. **Session Scheduling with Auto Zoom Creation**

```javascript
// When scheduling a session, automatically create Zoom meeting
const zoomMeetingRequest = {
  topic: `${courseTitle} - ${sessionTitle}`,
  type: 2, // Scheduled meeting
  start_time: sessionStartTime.toISOString(),
  duration: Math.max(30, durationMinutes),
  timezone: "Asia/Kolkata",
  agenda: sessionDescription,
  settings: {
    host_video: true,
    participant_video: false,
    join_before_host: true,
    mute_upon_entry: true,
    waiting_room: false,
    meeting_authentication: false, // No Zoom account required
    auto_recording: "cloud", // Enable cloud recording
    password: randomPassword, // Auto-generated password
  },
};
```

### 2. **Meeting Detection**

```javascript
// Check if meeting has ended (with 5-minute buffer)
const meetingEndTime = new Date(meetingDetails.start_time);
meetingEndTime.setMinutes(
  meetingEndTime.getMinutes() + meetingDetails.duration,
);

if (now < new Date(meetingEndTime.getTime() + 5 * 60 * 1000)) {
  return; // Meeting hasn't ended yet
}
```

### 3. **Retry Logic**

```javascript
// If no recordings found, retry after 30 minutes (up to 3 times)
if (!recordings.recording_files || recordings.recording_files.length === 0) {
  if (sync_attempts < 3) {
    next_retry_at = new Date(now.getTime() + 30 * 60 * 1000);
  }
}
```

### 4. **Recording Download**

```javascript
// Download from Zoom cloud
const response = await axios({
  method: "GET",
  url: recording.download_url,
  responseType: "arraybuffer",
  headers: {
    Authorization: `Bearer ${await zoomService.getAccessToken()}`,
  },
});

// Convert to base64
const base64Data = Buffer.from(response.data).toString("base64");
```

### 5. **S3 Upload**

```javascript
// Upload using existing upload utility
const uploadResult = await uploadBase64FileOptimized(
  base64Data,
  mimeType,
  `${uploadFolder}/${fileName}`,
);
```

### 6. **Database Update**

```javascript
// Add as recorded lesson
session.recorded_lessons.push({
  title: `Zoom Recording - ${sessionDate} (${fileType.toUpperCase()})`,
  url: uploadResult.data.url,
  source: "zoom_auto_sync",
  zoom_recording_info: {
    meeting_id: session.zoom_meeting.meeting_id,
    file_type: recording.file_type,
    file_size: recording.file_size,
    sync_date: new Date(),
  },
});

// Mark as synced
session.zoom_meeting.recording_synced = true;
session.zoom_meeting.last_sync_date = new Date();
```

## Configuration

### Environment Variables Required

```bash
# Zoom API credentials
ZOOM_ACCOUNT_ID=your_zoom_account_id
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret

# AWS S3 configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
BUCKET_NAME=your_s3_bucket_name
```

### Cron Schedule

- **Main sync**: Every 15 minutes (`*/15 * * * *`)
- **Cleanup**: Every hour (`0 * * * *`)

## Usage Examples

### 1. **Schedule Session with Auto Zoom Meeting**

```bash
curl -X POST "http://localhost:3001/api/v1/batches/BATCH_ID/schedule" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-01-15",
    "start_time": "10:00",
    "end_time": "11:30",
    "title": "Introduction to JavaScript",
    "description": "Learn the basics of JavaScript programming",
    "create_zoom_meeting": true
  }'
```

### 2. **Schedule Session without Zoom Meeting**

```bash
curl -X POST "http://localhost:3001/api/v1/batches/BATCH_ID/schedule" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-01-15",
    "start_time": "10:00",
    "end_time": "11:30",
    "title": "Introduction to JavaScript",
    "create_zoom_meeting": false
  }'
```

### 3. **Create Zoom Meeting for Existing Session**

```bash
curl -X POST "http://localhost:3001/api/v1/batches/BATCH_ID/schedule/SESSION_ID/create-zoom-meeting" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. **Manual Sync for Specific Batch**

```bash
curl -X POST "http://localhost:3001/api/v1/batches/BATCH_ID/sync-zoom-recordings" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. **Check Sync Status**

```bash
curl -X GET "http://localhost:3001/api/v1/batches/BATCH_ID/zoom-sync-status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. **Retry Failed Syncs**

```bash
curl -X POST "http://localhost:3001/api/v1/batches/BATCH_ID/retry-zoom-recordings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "optional_session_id"}'
```

## Response Examples

### Session Scheduling Response

```json
{
  "success": true,
  "message": "Session scheduled successfully",
  "data": {
    "session": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "date": "2024-01-15T00:00:00.000Z",
      "start_time": "10:00",
      "end_time": "11:30",
      "title": "Introduction to JavaScript",
      "description": "Learn the basics of JavaScript programming",
      "zoom_meeting": {
        "meeting_id": "123456789012345678901234",
        "join_url": "https://zoom.us/j/123456789012345678901234?pwd=ABC123",
        "start_url": "https://zoom.us/s/123456789012345678901234?zak=...",
        "password": "ABC123",
        "topic": "Advanced JavaScript - Introduction to JavaScript",
        "recording_synced": false,
        "sync_attempts": 0
      }
    },
    "zoom_meeting": {
      "id": "123456789012345678901234",
      "join_url": "https://zoom.us/j/123456789012345678901234?pwd=ABC123",
      "start_url": "https://zoom.us/s/123456789012345678901234?zak=...",
      "password": "ABC123",
      "topic": "Advanced JavaScript - Introduction to JavaScript",
      "start_time": "2024-01-15T10:00:00.000Z",
      "duration": 90
    }
  }
}
```

### Sync Status Response

```json
{
  "success": true,
  "data": {
    "batch": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Advanced JavaScript - Batch 1",
      "course_title": "Advanced JavaScript",
      "batch_type": "group"
    },
    "sync_statistics": {
      "total_sessions": 10,
      "sessions_with_zoom_meetings": 8,
      "synced_sessions": 6,
      "total_zoom_recordings": 12,
      "sync_percentage": 75
    },
    "sessions": [
      {
        "session_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "session_date": "2024-01-15T10:00:00.000Z",
        "session_title": "Introduction to ES6",
        "zoom_meeting": {
          "meeting_id": "123456789012345678901234",
          "recording_synced": true,
          "last_sync_date": "2024-01-15T12:30:00.000Z",
          "sync_attempts": 1,
          "next_retry_at": null
        },
        "recorded_lessons": {
          "total": 2,
          "zoom_auto_sync": 2,
          "manual_upload": 0,
          "external_link": 0
        }
      }
    ]
  }
}
```

## Error Handling

### Common Error Scenarios

1. **Meeting not ended**: Skipped until meeting duration + buffer time
2. **No recordings**: Retried after 30 minutes (up to 3 times)
3. **Download failure**: Retried with exponential backoff
4. **Upload failure**: Logged with error details
5. **Authentication failure**: Logged and skipped
6. **Zoom meeting creation failure**: Session still created, warning returned

### Error Tracking

```javascript
// Track sync attempts and errors
session.zoom_meeting.sync_attempts += 1;
session.zoom_meeting.last_sync_error = error.message;
session.zoom_meeting.next_retry_at = new Date(now.getTime() + 30 * 60 * 1000);
```

## Monitoring and Logging

### Log Messages

- `🔄 Starting Zoom Recording Sync Cron Job...`
- `📹 [Zoom Sync] Starting recording sync check...`
- `🎬 [Zoom Sync] Processing batch: {batch_name}`
- `🎥 [Zoom Sync] Processing meeting: {meeting_id}`
- `🎥 Creating Zoom meeting for session...`
- `✅ Zoom meeting created successfully: {meeting_id}`
- `⬇️ [Zoom Sync] Downloading recording: {file_type}`
- `⬆️ [Zoom Sync] Uploaded to S3: {url}`
- `📝 [Zoom Sync] Added as recorded lesson: {title}`
- `✅ [Zoom Sync] Successfully synced recordings for meeting {meeting_id}`
- `🔁 [Zoom Sync] No recordings found for meeting {meeting_id}, will retry at {next_retry_time}`
- `⏳ [Zoom Sync] Waiting until {next_retry_time} for next retry of meeting {meeting_id}`

### Performance Metrics

- Sync success rate
- Average processing time per recording
- Storage usage statistics
- Error frequency by type
- Zoom meeting creation success rate

## Security Considerations

### 1. **Authentication**

- Zoom API tokens with minimal required scopes
- AWS credentials with S3-only access
- JWT authentication for API endpoints

### 2. **Data Privacy**

- Recordings stored in private S3 buckets
- Access controlled via signed URLs
- Automatic cleanup of temporary files
- Random password generation for Zoom meetings

### 3. **Rate Limiting**

- Respects Zoom API rate limits
- Implements exponential backoff for retries
- Configurable sync intervals

## Troubleshooting

### Common Issues

#### 1. **Recordings Not Syncing**

- Check Zoom meeting has ended (duration + 5 minutes)
- Verify Zoom API credentials
- Check meeting has recordings enabled
- Review sync logs for specific errors
- Check retry schedule (30-minute intervals)

#### 2. **Upload Failures**

- Verify AWS S3 credentials
- Check bucket permissions
- Ensure sufficient storage space
- Review network connectivity

#### 3. **Authentication Errors**

- Refresh Zoom access tokens
- Verify API scopes include recording access
- Check account permissions

#### 4. **Zoom Meeting Creation Failures**

- Verify Zoom API credentials
- Check Zoom account permissions
- Ensure Zoom account has meeting creation privileges
- Review error logs for specific issues

### Debug Commands

```bash
# Check cron job status
pm2 logs --lines 100 | grep "Zoom Sync"

# Manual sync for debugging
node -e "
import('./cronjob/zoom-recording-sync.js').then(({manualSyncZoomRecordings}) => {
  manualSyncZoomRecordings('batch_id_here');
});
"

# Check specific meeting recordings
curl -H "Authorization: Bearer ZOOM_TOKEN" \
  "https://api.zoom.us/v2/meetings/MEETING_ID/recordings"

# Test Zoom meeting creation
curl -X POST "http://localhost:3001/api/v1/batches/BATCH_ID/schedule" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-01-15",
    "start_time": "10:00",
    "end_time": "11:30",
    "title": "Test Session",
    "create_zoom_meeting": true
  }'
```

## Future Enhancements

### Planned Features

1. **Webhook Integration**: Real-time sync on meeting end
2. **Batch Processing**: Process multiple recordings in parallel
3. **Compression**: Optimize video file sizes
4. **Transcription**: Auto-generate captions from audio
5. **Analytics Dashboard**: Sync performance metrics
6. **Notification System**: Email alerts for sync failures
7. **Custom Zoom Settings**: Allow instructors to customize meeting settings
8. **Bulk Operations**: Schedule multiple sessions with Zoom meetings

### Performance Optimizations

1. **Streaming Downloads**: Reduce memory usage
2. **Chunked Uploads**: Handle large files better
3. **Caching**: Cache meeting metadata
4. **Queue System**: Background job processing

## Support

For issues or questions about the Zoom Recording Sync System:

1. Check the logs for specific error messages
2. Verify all environment variables are set correctly
3. Test Zoom API connectivity manually
4. Review S3 bucket permissions and storage
5. Contact the development team with detailed error logs
