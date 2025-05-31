# Schedule Publish API Documentation

## Overview

The Schedule Publish API allows administrators to schedule courses for automatic publishing at a future date and time. This feature enables content planning and automated course releases.

## Features

- ✅ Schedule courses for future publishing
- ✅ View scheduled publish information
- ✅ Cancel scheduled publishing
- ✅ List all scheduled publishes
- ✅ Automatic execution via cron job
- ✅ Timezone support
- ✅ Input validation
- ✅ Comprehensive logging

## API Endpoints

### 1. Schedule Course Publishing

**POST** `/api/courses/:id/schedule-publish`

Schedule a course to be automatically published at a future date and time.

#### Headers
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "publishDate": "2024-12-25",           // Required: YYYY-MM-DD format
  "publishTime": "10:00",                // Optional: HH:MM format (24-hour)
  "timezone": "UTC"                      // Optional: Timezone (default: UTC)
}
```

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "Course publishing scheduled successfully",
  "data": {
    "course": {
      "id": "course_id",
      "title": "Course Title",
      "status": "Upcoming",
      "scheduledPublishDate": "2024-12-25T10:00:00.000Z",
      "scheduledPublishTimezone": "UTC",
      "currentTime": "2024-12-20T15:30:00.000Z"
    }
  },
  "statusCode": 200
}
```

#### Response (Error - 400)
```json
{
  "success": false,
  "message": "Scheduled publish date must be in the future",
  "data": null,
  "statusCode": 400
}
```

### 2. Get Scheduled Publish Information

**GET** `/api/courses/:id/schedule-publish`

Retrieve scheduling information for a specific course.

#### Headers
```
Authorization: Bearer <admin_token>
```

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "Schedule information retrieved successfully",
  "data": {
    "courseId": "course_id",
    "title": "Course Title",
    "status": "Upcoming",
    "scheduledPublishDate": "2024-12-25T10:00:00.000Z",
    "scheduledPublishTimezone": "UTC",
    "isScheduled": true,
    "timeRemainingMs": 432000000,
    "isPastDue": false,
    "currentTime": "2024-12-20T15:30:00.000Z"
  },
  "statusCode": 200
}
```

### 3. Cancel Scheduled Publishing

**DELETE** `/api/courses/:id/schedule-publish`

Cancel scheduled publishing for a course.

#### Headers
```
Authorization: Bearer <admin_token>
```

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "Scheduled publishing cancelled successfully",
  "data": {
    "courseId": "course_id",
    "title": "Course Title",
    "status": "Draft"
  },
  "statusCode": 200
}
```

### 4. Get All Scheduled Publishes

**GET** `/api/courses/scheduled-publishes`

Retrieve all courses with scheduled publishing.

#### Query Parameters
- `status` (optional): Filter by course status (`Published`, `Upcoming`, `Draft`, `all`)
- `upcoming` (optional): Set to `true` to only show future scheduled publishes

#### Example Request
```
GET /api/courses/scheduled-publishes?status=Upcoming&upcoming=true
```

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "Scheduled publishes retrieved successfully",
  "data": {
    "courses": [
      {
        "courseId": "course_id_1",
        "title": "Course Title 1",
        "status": "Upcoming",
        "scheduledPublishDate": "2024-12-25T10:00:00.000Z",
        "scheduledPublishTimezone": "UTC",
        "timeRemainingMs": 432000000,
        "isPastDue": false,
        "createdAt": "2024-12-01T10:00:00.000Z",
        "lastUpdated": "2024-12-20T15:30:00.000Z"
      }
    ],
    "total": 1,
    "filters": {
      "status": "Upcoming",
      "upcoming": true
    }
  },
  "statusCode": 200
}
```

### 5. Execute Scheduled Publishes

**POST** `/api/courses/execute-scheduled-publishes`

Manually trigger execution of scheduled publishes (typically called by cron job).

#### Headers
```
Authorization: Bearer <admin_token>
```

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "Scheduled publishing executed: 2 published, 0 failed",
  "data": {
    "publishedCount": 2,
    "failedCount": 0,
    "results": [
      {
        "courseId": "course_id_1",
        "title": "Course Title 1",
        "previousStatus": "Upcoming",
        "newStatus": "Published",
        "scheduledDate": "2024-12-25T10:00:00.000Z",
        "publishedAt": "2024-12-25T10:05:00.000Z",
        "success": true
      }
    ]
  },
  "statusCode": 200
}
```

## Database Schema Changes

The following fields have been added to the Course model:

```javascript
{
  scheduledPublishDate: {
    type: Date,
    default: null,
    index: true,
  },
  scheduledPublishTimezone: {
    type: String,
    default: 'UTC',
    trim: true,
  }
}
```

## Validation Rules

### Schedule Publish Request
- `publishDate`: Required, must be in ISO 8601 format (YYYY-MM-DD), must be today or in the future
- `publishTime`: Optional, must be in HH:MM format (24-hour), defaults to 00:00 if not provided
- `timezone`: Optional, string between 1-50 characters, defaults to 'UTC'

### Business Rules
- Only authenticated admin users can schedule publishing
- Scheduled publish date must be in the future
- Courses that are already published remain published when scheduling
- Scheduling information is automatically removed after successful publishing

## Cron Job Integration

### Automatic Execution
A cron job runs every 5 minutes to check for courses ready to be published:

```javascript
// File: cronjob/schedule-publish-cron.js
import { schedulePublishCron } from './cronjob/schedule-publish-cron.js';

// Initialize cron job
schedulePublishCron();
```

### Cron Job Features
- Runs every 5 minutes (`*/5 * * * *`)
- Finds courses with `scheduledPublishDate <= now`
- Updates course status to 'Published'
- Removes scheduling fields after successful publishing
- Comprehensive error handling and logging
- Two implementation options: API-based and direct database

## Error Handling

### Common Error Responses

#### 400 - Bad Request
```json
{
  "success": false,
  "message": "Publish date is required",
  "data": null,
  "statusCode": 400
}
```

#### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No token provided.",
  "data": null,
  "statusCode": 401
}
```

#### 404 - Course Not Found
```json
{
  "success": false,
  "message": "Course not found",
  "data": null,
  "statusCode": 404
}
```

#### 500 - Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "data": null,
  "statusCode": 500
}
```

## Usage Examples

### Example 1: Schedule a Course for Tomorrow at 2 PM UTC
```bash
curl -X POST http://localhost:3000/api/courses/course_id/schedule-publish \
  -H "Authorization: Bearer your_admin_token" \
  -H "Content-Type: application/json" \
  -d '{
    "publishDate": "2024-12-21",
    "publishTime": "14:00",
    "timezone": "UTC"
  }'
```

### Example 2: Get Scheduling Information
```bash
curl -X GET http://localhost:3000/api/courses/course_id/schedule-publish \
  -H "Authorization: Bearer your_admin_token"
```

### Example 3: Cancel Scheduled Publishing
```bash
curl -X DELETE http://localhost:3000/api/courses/course_id/schedule-publish \
  -H "Authorization: Bearer your_admin_token"
```

### Example 4: List All Upcoming Scheduled Publishes
```bash
curl -X GET "http://localhost:3000/api/courses/scheduled-publishes?upcoming=true"
```

## Testing

Run the test suite to verify functionality:

```bash
node test-schedule-publish.js
```

The test suite covers:
- Authentication requirements
- Input validation
- Date/time format validation
- Error handling
- API response structure

## Security Considerations

1. **Authentication Required**: All scheduling operations require admin authentication
2. **Input Validation**: Comprehensive validation of dates, times, and timezones
3. **Rate Limiting**: Consider implementing rate limiting for scheduling endpoints
4. **Audit Logging**: All scheduling operations are logged for audit purposes

## Performance Considerations

1. **Database Indexing**: Indexed `scheduledPublishDate` field for efficient queries
2. **Cron Job Frequency**: 5-minute intervals balance responsiveness with server load
3. **Batch Processing**: Cron job processes multiple courses efficiently
4. **Query Optimization**: Sparse indexing for optional scheduling fields

## Future Enhancements

- Email notifications for scheduled publishing
- Bulk scheduling operations
- Advanced timezone handling
- Scheduling templates
- Integration with content management workflows
- Webhook notifications for publishing events

## Troubleshooting

### Common Issues

1. **Cron Job Not Running**: Check server logs and ensure cron job is initialized
2. **Timezone Issues**: Verify timezone strings and consider using standard timezone identifiers
3. **Authentication Errors**: Ensure valid admin tokens are being used
4. **Date Validation**: Check date formats and ensure future dates are being used

### Debugging

Enable debug logging to troubleshoot issues:

```javascript
// In your environment configuration
DEBUG=schedule-publish:*
```

Check application logs for detailed information about scheduling operations and cron job execution. 