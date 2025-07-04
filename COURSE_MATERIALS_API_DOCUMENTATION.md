# Course Materials API Documentation

## Overview
The Course Materials API provides endpoints for managing and accessing learning resources including documents, videos, and assignments from your enrolled courses.

## Base URL
`/api/v1/materials`

## Authentication
All endpoints require authentication using JWT token in the Authorization header:
```
Authorization: Bearer <your_token>
```

## Endpoints

### 1. Get Materials from Enrolled Courses
```http
GET /api/v1/materials/enrolled
```

Get all materials from courses you are currently enrolled in.

Query Parameters:
- `type` (string, optional): Filter by material type (document, video, assignment, other)
- `search` (string, optional): Search term to filter materials

Response:
```json
{
  "status": "success",
  "data": {
    "stats": {
      "total": 25,
      "byType": {
        "documents": 10,
        "videos": 8,
        "assignments": 5,
        "other": 2
      }
    },
    "materialsByType": {
      "documents": [...],
      "videos": [...],
      "assignments": [...],
      "other": [...]
    },
    "materials": [
      {
        "id": "material_id",
        "title": "Material Title",
        "description": "Material Description",
        "type": "document",
        "fileUrl": "https://...",
        "course": {
          "id": "course_id",
          "title": "Course Title",
          "courseCode": "CS101",
          "thumbnail": "https://..."
        },
        "lesson": {
          "id": "lesson_id",
          "title": "Lesson Title",
          "order": 1
        },
        "createdBy": {
          "id": "user_id",
          "name": "Instructor Name"
        },
        "createdAt": "2024-05-27T..."
      }
    ]
  }
}
```

### 2. Get Recent Materials
```http
GET /api/v1/materials/recent
```

Get recent materials from your enrolled courses.

Query Parameters:
- `limit` (number, optional): Number of recent materials to return (default: 5)

Response:
```json
{
  "status": "success",
  "data": {
    "materials": [
      {
        "id": "material_id",
        "title": "Material Title",
        "type": "video",
        "course": {
          "title": "Course Title",
          "courseCode": "CS101",
          "thumbnail": "https://..."
        },
        "lesson": {
          "title": "Lesson Title"
        },
        "createdAt": "2024-05-27T..."
      }
    ]
  }
}
```

### 3. Search Materials
```http
GET /api/v1/materials/search
```

Search across all available course materials.

Query Parameters:
- `query` (string): Search term
- `type` (string, optional): Filter by material type (document, video, assignment, other)
- `courseId` (string, optional): Filter by course ID

### 4. Get Course Materials
```http
GET /api/v1/materials/course/:courseId
```

Get all materials for a specific course.

### 5. Get Material by ID
```http
GET /api/v1/materials/:id
```

Get detailed information about a specific material.

### 6. Record Material Download
```http
POST /api/v1/materials/:id/download
```

Record when a material is downloaded by a user.

## Error Responses

All endpoints may return the following error responses:

```json
{
  "status": "error",
  "message": "Error message description"
}
```

Common error codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Material Types
- `document`: PDF, DOC, DOCX, etc.
- `video`: MP4, WebM, etc.
- `assignment`: Linked assignments
- `other`: Other material types

## Notes
- All timestamps are in ISO 8601 format
- File sizes are in bytes
- Video durations are in seconds
- Views and downloads are tracked automatically
- Materials are ordered by their `order` field and then by creation date
- Text search is performed on title, description, and tags 