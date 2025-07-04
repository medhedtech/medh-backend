# Live Courses Endpoint Documentation

## Overview
This endpoint provides access to all live courses without pagination, combining data from both new course-types models and legacy course models.

## Endpoint Details

**URL:** `GET /api/v1/tcourse/live`  
**Access:** Public  
**Authentication:** Not required  

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `include_legacy` | string | No | "true" | Include courses from legacy Course model |
| `search` | string | No | - | Search term for course title, category, tag, or grade |
| `currency` | string | No | - | Filter courses by currency (e.g., "USD", "INR") |
| `status` | string | No | "Published" | Filter by course status |
| `course_grade` | string | No | - | Filter by specific course grade |

## Response Format

```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
      "course_title": "Live Python Programming Bootcamp",
      "course_category": "Programming",
      "course_type": "live",
      "class_type": "Live Instructor-Led",
      "status": "Published",
      "prices": [
        {
          "currency": "USD",
          "individual": 299,
          "batch": 199
        }
      ],
      "assigned_instructor": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k9",
        "full_name": "Dr. John Smith",
        "email": "john.smith@example.com",
        "role": ["instructor"],
        "domain": "Computer Science"
      },
      "course_schedule": {
        "start_date": "2024-02-01T00:00:00.000Z",
        "end_date": "2024-05-01T00:00:00.000Z",
        "sessions_per_week": 3,
        "session_duration": "2 hours"
      },
      "curriculum": [...],
      "meta": {
        "views": 1250,
        "enrollments": 45,
        "ratings": {
          "average": 4.7,
          "count": 23
        }
      },
      "_source": "new_model",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:22:00.000Z"
    }
  ],
  "sources": {
    "new_model": 15,
    "legacy_model": 10
  },
  "filters_applied": {
    "search": null,
    "currency": null,
    "status": "Published",
    "course_grade": null,
    "include_legacy": "true"
  }
}
```

## Response Fields

### Course Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Unique course identifier |
| `course_title` | string | Course title |
| `course_category` | string | Course category |
| `course_type` | string | Always "live" for this endpoint |
| `class_type` | string | Specific class delivery method |
| `status` | string | Course status (Published, Draft, etc.) |
| `prices` | array | Pricing information for different currencies |
| `assigned_instructor` | object | Instructor details |
| `course_schedule` | object | Live course scheduling information |
| `curriculum` | array | Course curriculum structure |
| `meta` | object | Course metadata (views, enrollments, ratings) |
| `_source` | string | Data source ("new_model" or "legacy_model") |

### Response Metadata

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request success status |
| `count` | number | Total number of courses returned |
| `sources` | object | Breakdown of courses by data source |
| `filters_applied` | object | Summary of applied filters |

## Example Requests

### Basic Request
```bash
curl -X GET "http://localhost:8080/api/v1/tcourse/live"
```

### Search for Python Courses
```bash
curl -X GET "http://localhost:8080/api/v1/tcourse/live?search=python"
```

### Filter by Currency
```bash
curl -X GET "http://localhost:8080/api/v1/tcourse/live?currency=USD"
```

### Advanced Filtering
```bash
curl -X GET "http://localhost:8080/api/v1/tcourse/live?search=data%20science&currency=USD&course_grade=Advanced"
```

## Features

- **No Pagination:** Returns all matching live courses in a single response
- **Multi-Source Data:** Combines courses from both new LiveCourse model and legacy Course model
- **Flexible Filtering:** Support for search, currency, status, and grade filters
- **Instructor Population:** Includes populated instructor information
- **Source Tracking:** Identifies whether courses come from new or legacy models
- **Response Formatting:** Applies consistent formatting to course duration and other fields

## Error Responses

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to fetch live courses: [error details]"
}
```

## Performance Considerations

- This endpoint returns all matching courses without pagination
- For large datasets, consider using the paginated `/api/v1/tcourse/live` endpoint instead
- Response times may vary based on the total number of live courses
- Instructor population adds additional database queries

## Related Endpoints

- `GET /api/v1/tcourse/live/:id` - Get specific live course by ID
- `GET /api/v1/tcourse/search` - Advanced search with pagination
- `GET /api/v1/tcourse/all` - All courses across all types

## Notes

- Course data is automatically formatted for consistent display
- Legacy courses are mapped to the live course structure
- Currency filtering affects the prices array but doesn't exclude courses
- Search is case-insensitive and supports partial matching 