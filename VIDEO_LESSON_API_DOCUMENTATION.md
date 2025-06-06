# Video Lesson API Documentation

This document describes the new video lesson functionality added to the course management system. Video lessons are now supported as a distinct lesson type with specific fields for video content.

## Overview

Video lessons extend the base lesson schema with additional fields for video URLs, thumbnails, duration, and quality settings. They can be added to both legacy courses and new course types (Blended, Live, Free).

## Lesson Types

The system now supports different lesson types:
- `text` - Basic text-based lessons (default)
- `video` - Video lessons with video URL and metadata
- `quiz` - Quiz-based lessons
- `assessment` - Assignment-based lessons

## API Endpoints

### 1. Add Video Lesson to Course (Legacy Route)

**POST** `/api/courses/:courseId/video-lessons`

Add a video lesson to a legacy course curriculum.

#### Headers
```
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

#### Path Parameters
- `courseId` (string, required) - The ID of the course

#### Request Body
```json
{
  "weekId": "week_1",
  "sectionId": "section_1_1", // Optional - if not provided, adds to week directly
  "title": "Introduction to JavaScript",
  "description": "Learn the basics of JavaScript programming",
  "video_url": "https://www.youtube.com/watch?v=W6NZfCO5SIk",
  "duration": "25 minutes",
  "video_thumbnail": "https://img.youtube.com/vi/W6NZfCO5SIk/maxresdefault.jpg",
  "order": 1,
  "isPreview": true
}
```

#### Response
```json
{
  "success": true,
  "message": "Video lesson added successfully",
  "data": {
    "lessonType": "video",
    "title": "Introduction to JavaScript",
    "description": "Learn the basics of JavaScript programming",
    "video_url": "https://www.youtube.com/watch?v=W6NZfCO5SIk",
    "duration": "25 minutes",
    "video_thumbnail": "https://img.youtube.com/vi/W6NZfCO5SIk/maxresdefault.jpg",
    "order": 1,
    "isPreview": true,
    "resources": [],
    "id": "lesson_w1_4",
    "createdAt": "2025-01-21T10:30:00.000Z",
    "updatedAt": "2025-01-21T10:30:00.000Z"
  }
}
```

### 2. Add Video Lesson to Course Type

**POST** `/api/v1/tcourse/:type/:id/curriculum/weeks/:weekId/video-lessons`

Add a video lesson to a specific course type (blended, live, free).

#### Headers
```
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

#### Path Parameters
- `type` (string, required) - Course type: `blended`, `live`, or `free`
- `id` (string, required) - The ID of the course
- `weekId` (string, required) - The ID of the week to add the lesson to

#### Request Body
```json
{
  "sectionId": "section_1_1", // Optional
  "title": "Advanced JavaScript Concepts",
  "description": "Deep dive into advanced JavaScript features",
  "video_url": "https://www.youtube.com/watch?v=example123",
  "duration": "45 minutes",
  "video_thumbnail": "https://img.youtube.com/vi/example123/maxresdefault.jpg",
  "order": 2,
  "isPreview": false
}
```

#### Response
```json
{
  "success": true,
  "message": "Video lesson added to week successfully",
  "data": {
    "title": "Advanced JavaScript Concepts",
    "description": "Deep dive into advanced JavaScript features",
    "lessonType": "video",
    "video_url": "https://www.youtube.com/watch?v=example123",
    "duration": "45 minutes",
    "video_thumbnail": "https://img.youtube.com/vi/example123/maxresdefault.jpg",
    "order": 2,
    "isPreview": false,
    "meta": {},
    "resources": [],
    "id": "lesson_w1_5"
  }
}
```

### 3. Update Video Lesson

**PUT** `/api/courses/:courseId/video-lessons/:lessonId`

Update an existing video lesson.

#### Headers
```
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

#### Path Parameters
- `courseId` (string, required) - The ID of the course
- `lessonId` (string, required) - The ID of the lesson to update

#### Request Body
```json
{
  "title": "Updated JavaScript Introduction",
  "description": "Updated description with more details",
  "video_url": "https://www.youtube.com/watch?v=updated-video",
  "duration": "30 minutes",
  "video_thumbnail": "https://img.youtube.com/vi/updated-video/maxresdefault.jpg",
  "order": 1,
  "isPreview": false
}
```

#### Response
```json
{
  "success": true,
  "message": "Video lesson updated successfully",
  "data": {
    "lessonType": "video",
    "title": "Updated JavaScript Introduction",
    "description": "Updated description with more details",
    "video_url": "https://www.youtube.com/watch?v=updated-video",
    "duration": "30 minutes",
    "video_thumbnail": "https://img.youtube.com/vi/updated-video/maxresdefault.jpg",
    "order": 1,
    "isPreview": false,
    "id": "lesson_w1_1",
    "updatedAt": "2025-01-21T11:00:00.000Z"
  }
}
```

### 4. Delete Video Lesson

**DELETE** `/api/courses/:courseId/video-lessons/:lessonId`

Delete a video lesson from the course curriculum.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Path Parameters
- `courseId` (string, required) - The ID of the course
- `lessonId` (string, required) - The ID of the lesson to delete

#### Response
```json
{
  "success": true,
  "message": "Video lesson deleted successfully"
}
```

### 5. Get Course Curriculum (Enhanced with Video Fields)

**GET** `/api/v1/tcourse/:type/:id/curriculum`

Retrieve the course curriculum with enhanced lesson information including video fields.

#### Response Example
```json
{
  "success": true,
  "data": {
    "curriculum": [
      {
        "id": "week_1",
        "weekTitle": "Week 1: JavaScript Fundamentals",
        "weekDescription": "Introduction to JavaScript programming",
        "createdAt": "2025-01-21T10:00:00.000Z",
        "updatedAt": "2025-01-21T11:30:00.000Z",
        "lessons": [
          {
            "title": "Introduction to JavaScript",
            "description": "Learn the basics of JavaScript programming",
            "order": 1,
            "isPreview": true,
            "lessonType": "video",
            "video_url": "https://www.youtube.com/watch?v=W6NZfCO5SIk",
            "duration": "25 minutes",
            "video_thumbnail": "https://img.youtube.com/vi/W6NZfCO5SIk/maxresdefault.jpg",
            "resources": [],
            "id": "lesson_w1_1",
            "createdAt": "2025-01-21T10:30:00.000Z",
            "updatedAt": "2025-01-21T10:30:00.000Z"
          },
          {
            "title": "JavaScript Variables",
            "description": "Understanding variables and data types",
            "order": 2,
            "isPreview": false,
            "lessonType": "video",
            "video_url": "https://www.youtube.com/watch?v=9Q-Zn5lkpbQ",
            "duration": "18 minutes",
            "resources": [],
            "id": "lesson_w1_2",
            "createdAt": "2025-01-21T10:45:00.000Z",
            "updatedAt": "2025-01-21T10:45:00.000Z"
          }
        ],
        "liveClasses": []
      }
    ]
  }
}
```

## Request Body Field Descriptions

### Video Lesson Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | The title of the video lesson |
| `description` | string | No | A detailed description of the lesson content |
| `video_url` | string | Yes | The URL of the video (supports YouTube, Vimeo, direct links) |
| `duration` | string | No | The duration of the video (e.g., "25 minutes", "1 hour 30 minutes") |
| `video_thumbnail` | string | No | URL of the video thumbnail image |
| `order` | number | No | The order of the lesson within the week/section (auto-assigned if not provided) |
| `isPreview` | boolean | No | Whether this lesson is available as a preview (default: false) |
| `weekId` | string | Yes | The ID of the week to add the lesson to |
| `sectionId` | string | No | The ID of the section within the week (if adding to a specific section) |

### Additional Video Lesson Schema Fields

| Field | Type | Description |
|-------|------|-------------|
| `lessonType` | string | Always "video" for video lessons |
| `video_quality` | string | Video quality setting ("720p", "1080p", "4K", "auto") |
| `meta` | object | Additional metadata for the lesson |
| `resources` | array | Associated resources (PDFs, links, documents) |

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Title and video URL are required for video lessons"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Course not found"
}
```

```json
{
  "success": false,
  "message": "Week not found. Available weeks: [week_1, week_2]. Requested: week_3"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to add video lesson",
  "error": "Database connection error"
}
```

## Usage Examples

### cURL Examples

#### Add a video lesson to a blended course
```bash
curl -X POST \
  http://localhost:8080/api/v1/tcourse/blended/67e14360cd2f46d71bf0587c/curriculum/weeks/week_1/video-lessons \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
    "title": "JavaScript Basics",
    "description": "Learn JavaScript fundamentals",
    "video_url": "https://www.youtube.com/watch?v=W6NZfCO5SIk",
    "duration": "25 minutes",
    "isPreview": true
  }'
```

#### Update a video lesson
```bash
curl -X PUT \
  http://localhost:8080/api/courses/67e14360cd2f46d71bf0587c/video-lessons/lesson_w1_1 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
    "title": "Updated JavaScript Basics",
    "duration": "30 minutes"
  }'
```

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

// Add video lesson
async function addVideoLesson() {
  try {
    const response = await axios.post(
      'http://localhost:8080/api/v1/tcourse/blended/67e14360cd2f46d71bf0587c/curriculum/weeks/week_1/video-lessons',
      {
        title: "Advanced JavaScript Concepts",
        description: "Deep dive into closures, prototypes, and async programming",
        video_url: "https://www.youtube.com/watch?v=example123",
        duration: "45 minutes",
        video_thumbnail: "https://img.youtube.com/vi/example123/maxresdefault.jpg",
        order: 3,
        isPreview: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_JWT_TOKEN'
        }
      }
    );
    
    console.log('Video lesson added:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}
```

## Integration Notes

1. **Backward Compatibility**: Existing lessons without `lessonType` will be automatically assigned the type "text" or "video" based on the presence of `video_url`.

2. **ID Assignment**: Lesson IDs are automatically generated and reassigned when new lessons are added to maintain consistency.

3. **Video URL Validation**: The system validates that video URLs start with "http" or "https". Empty strings are allowed for optional video URLs.

4. **Course Type Support**: Video lessons work with both legacy courses and new course types (Blended, Live, Free).

5. **Section Support**: Video lessons can be added directly to weeks or to specific sections within weeks.

## Testing

Use the provided `test-video-lesson.js` script to test the video lesson functionality:

```bash
node test-video-lesson.js
```

This script will:
- Add sample video lessons to your course
- Verify the lessons were added correctly
- Display the updated curriculum with video information

## Next Steps

1. **Frontend Integration**: Update the frontend to display video lessons with video players
2. **Video Player**: Integrate a video player component for playing the video lessons
3. **Progress Tracking**: Implement video progress tracking (watched duration, completion status)
4. **Video Analytics**: Add analytics for video lesson engagement
5. **Thumbnails**: Auto-generate video thumbnails if not provided 