# Completed Courses API Documentation

## Overview

The Completed Courses API provides a specialized endpoint to fetch only completed courses for a student with detailed formatting suitable for dashboard displays. This API returns course information in a structured format that includes instructor details, completion dates, ratings, and available actions.

## Base Path
```
/api/v1/enrolled
```

## Authentication
- **Required**: JWT Token authentication
- **Headers**: `Authorization: Bearer <jwt_token>`

---

## Endpoint

### Get Completed Courses by Student ID
**GET** `/student/{student_id}/completed`

Retrieves all completed courses for a specific student with detailed information formatted for dashboard display.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `student_id` | string | Yes | MongoDB ObjectId of the student |

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number for pagination |
| `limit` | number | No | 10 | Number of courses per page |

#### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer JWT token |
| `Content-Type` | No | application/json |

---

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Completed courses retrieved successfully",
  "data": {
    "courses": [
      {
        "courseId": "67e14360cd2f46d71bf0587c",
        "title": "Digital Marketing Fundamentals",
        "instructor": "Sarah Johnson",
        "completedDate": "2024-01-15T00:00:00.000Z",
        "duration": "8 weeks",
        "keyTopics": ["SEO", "Social Media", "Analytics"],
        "rating": 4.8,
        "status": "Completed",
        "actions": {
          "review": true,
          "certificate": true
        },
        "enrollmentId": "67e14360cd2f46d71bf0587d",
        "progress": 100
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCourses": 25,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### Response Fields Description

#### Course Object
| Field | Type | Description |
|-------|------|-------------|
| `courseId` | string | Unique course identifier |
| `title` | string | Course title |
| `instructor` | string | Instructor's full name |
| `completedDate` | string | ISO date when course was completed |
| `duration` | string | Course duration (e.g., "8 weeks") |
| `keyTopics` | array | Array of key topics/skills covered |
| `rating` | number | Course rating (0-5 scale) |
| `status` | string | Always "Completed" for this endpoint |
| `actions` | object | Available actions for the course |
| `actions.review` | boolean | Whether review action is available |
| `actions.certificate` | boolean | Whether certificate is available |
| `enrollmentId` | string | Enrollment record identifier |
| `progress` | number | Course completion percentage (always 100) |

#### Pagination Object
| Field | Type | Description |
|-------|------|-------------|
| `currentPage` | number | Current page number |
| `totalPages` | number | Total number of pages |
| `totalCourses` | number | Total number of completed courses |
| `hasNextPage` | boolean | Whether next page exists |
| `hasPrevPage` | boolean | Whether previous page exists |

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Student ID is required"
}
```

### 404 Not Found - Student
```json
{
  "success": false,
  "message": "Student not found"
}
```

### 404 Not Found - No Completed Courses
```json
{
  "success": false,
  "message": "No completed courses found for this student"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Invalid token."
}
```

---

## Usage Examples

### cURL Example
```bash
curl -X GET \
  "http://localhost:8080/api/v1/enrolled/student/67e14360cd2f46d71bf0587c/completed?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### JavaScript/Axios Example
```javascript
const axios = require('axios');

const getCompletedCourses = async (studentId, page = 1, limit = 10) => {
  try {
    const response = await axios.get(
      `/api/v1/enrolled/student/${studentId}/completed`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: { page, limit }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching completed courses:', error.response?.data || error.message);
    throw error;
  }
};

// Usage
getCompletedCourses('67e14360cd2f46d71bf0587c', 1, 5)
  .then(data => {
    console.log('Completed courses:', data.data.courses);
    console.log('Pagination:', data.data.pagination);
  })
  .catch(error => {
    console.error('Failed to fetch completed courses:', error);
  });
```

### React/Frontend Example
```javascript
import { useState, useEffect } from 'react';

const CompletedCoursesComponent = ({ studentId }) => {
  const [completedCourses, setCompletedCourses] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompletedCourses = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/v1/enrolled/student/${studentId}/completed?page=1&limit=10`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch completed courses');
        }
        
        const data = await response.json();
        setCompletedCourses(data.data.courses);
        setPagination(data.data.pagination);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchCompletedCourses();
    }
  }, [studentId]);

  if (loading) return <div>Loading completed courses...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="completed-courses">
      <h2>Completed Courses ({pagination.totalCourses})</h2>
      {completedCourses.map(course => (
        <div key={course.courseId} className="course-card">
          <h3>{course.title}</h3>
          <p>by {course.instructor}</p>
          <p>Completed: {new Date(course.completedDate).toLocaleDateString()}</p>
          <p>Duration: {course.duration}</p>
          <p>Topics: {course.keyTopics.join(', ')}</p>
          <p>Rating: {course.rating}/5.0</p>
          <div className="actions">
            {course.actions.review && <button>Write Review</button>}
            {course.actions.certificate && <button>Download Certificate</button>}
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## Data Sources

The API aggregates data from multiple sources:

1. **EnrolledCourse Model**: Enrollment status, completion dates, progress
2. **Course Model**: Course details, curriculum, ratings, tags
3. **User Model**: Instructor information
4. **Certificate Model**: Certificate availability

---

## Key Features

### 1. **Intelligent Duration Calculation**
- Extracts duration from curriculum length (number of weeks)
- Falls back to parsing duration strings from course metadata
- Provides consistent "X weeks" format

### 2. **Smart Topic Extraction**
- Prioritizes course tags for key topics
- Falls back to curriculum week titles
- Limits to top 3 most relevant topics

### 3. **Comprehensive Pagination**
- Standard page/limit parameters
- Rich pagination metadata
- Navigation helpers (hasNextPage, hasPrevPage)

### 4. **Action Availability**
- Dynamic review action availability
- Certificate availability based on actual certificate records
- Extensible for future actions

### 5. **Performance Optimized**
- Efficient MongoDB queries with population
- Lean queries for better performance
- Indexed fields for fast lookups

---

## Business Logic

### Completion Criteria
A course is considered completed when:
- `status` field equals "completed"
- `is_completed` field is true
- `completed_on` date is set

### Rating Calculation
- Uses course meta ratings average
- Defaults to 0 if no ratings available
- Rounded to 1 decimal place

### Topic Prioritization
1. Course tags (if available)
2. Curriculum week titles
3. Limited to 3 topics for UI consistency

---

## Testing

Run the test suite:
```bash
node test-completed-courses-api.js
```

The test file includes:
- Basic API functionality testing
- Pagination testing
- Error handling validation
- Response format verification

---

## Integration Notes

### Frontend Integration
- Perfect for student dashboard "Completed Courses" sections
- Supports pagination for large course lists
- Provides all necessary data for course cards/tiles

### Mobile App Integration
- Lightweight response format
- Optimized for mobile bandwidth
- Consistent data structure

### Analytics Integration
- Completion dates for progress tracking
- Rating data for course quality metrics
- Topic data for skill assessment

---

## Performance Considerations

### Database Optimization
- Uses indexed fields for queries
- Lean queries to reduce memory usage
- Efficient population of related data

### Caching Recommendations
- Consider caching completed courses (they rarely change)
- Cache duration: 1-24 hours depending on requirements
- Cache key: `completed_courses_${studentId}_${page}_${limit}`

### Rate Limiting
- Recommended: 100 requests per minute per user
- Consider lower limits for pagination requests

---

## Security Considerations

1. **Authentication**: JWT token required
2. **Authorization**: Users can only access their own completed courses
3. **Input Validation**: Student ID validation and sanitization
4. **Data Exposure**: Only necessary course information exposed

---

## Changelog

### Version 1.0.0 (Current)
- Initial implementation
- Basic pagination support
- Course completion data
- Instructor and rating information
- Certificate availability
- Key topics extraction

### Future Enhancements
- Course review integration
- Advanced filtering options
- Sorting capabilities
- Export functionality
- Bulk operations support

---

This API provides a comprehensive solution for displaying completed courses with all the information needed for a rich user experience, matching the format requested: course title, instructor, completion date, duration, key topics, rating, status, and available actions. 