# Student Resources API Documentation

## Overview

The Student Resources API provides a comprehensive endpoint to fetch all learning resources from all enrolled courses for a specific student, excluding video lessons. This API aggregates resources from various sources including lessons, sections, live classes, course-level PDFs, and bonus modules, providing a unified view of all downloadable and reference materials.

## Base Path
```
/api/v1/enrolled
```

## Authentication
- **Required**: JWT Token authentication
- **Headers**: `Authorization: Bearer <jwt_token>`

---

## Endpoint

### Get All Resources by Student ID
**GET** `/student/{student_id}/resources`

Retrieves all resources from all enrolled courses for a specific student, excluding video lessons.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `student_id` | string | Yes | MongoDB ObjectId of the student |

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number for pagination |
| `limit` | number | No | 20 | Number of resources per page |
| `resourceType` | string | No | null | Filter by resource type (`pdf`, `document`, `link`, `other`) |
| `courseId` | string | No | null | Filter by specific course ID |
| `search` | string | No | null | Search in title, description, and course title |
| `sortBy` | string | No | `createdAt` | Sort field (`title`, `type`, `course`, `createdAt`) |
| `sortOrder` | string | No | `desc` | Sort order (`asc`, `desc`) |

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
  "message": "Resources retrieved successfully",
  "data": {
    "resources": [
      {
        "id": "lesson_w1_1_resource_1",
        "title": "Course Handbook",
        "description": "Complete guide for the course",
        "url": "https://example.com/handbook.pdf",
        "type": "pdf",
        "size_mb": 2.5,
        "source": {
          "type": "lesson",
          "courseId": "67e14360cd2f46d71bf0587c",
          "courseTitle": "Digital Marketing Fundamentals",
          "courseThumbnail": "https://example.com/course-thumb.jpg",
          "instructor": "Sarah Johnson",
          "weekTitle": "Introduction to Digital Marketing",
          "weekNumber": 1,
          "lessonTitle": "Getting Started",
          "lessonType": "text",
          "lessonId": "lesson_w1_1"
        },
        "enrollmentId": "67e14360cd2f46d71bf0587d",
        "addedDate": "2024-01-15T00:00:00.000Z"
      },
      {
        "id": "course_pdf_0",
        "title": "SEO Best Practices Guide",
        "description": "Comprehensive SEO guide",
        "url": "https://example.com/seo-guide.pdf",
        "type": "pdf",
        "pages": 45,
        "source": {
          "type": "course_resource",
          "courseId": "67e14360cd2f46d71bf0587c",
          "courseTitle": "Digital Marketing Fundamentals",
          "courseThumbnail": "https://example.com/course-thumb.jpg",
          "instructor": "Sarah Johnson"
        },
        "enrollmentId": "67e14360cd2f46d71bf0587d",
        "addedDate": "2024-01-10T00:00:00.000Z"
      }
    ],
    "statistics": {
      "total": 45,
      "byType": {
        "pdf": 25,
        "document": 12,
        "link": 8
      },
      "byCourse": {
        "Digital Marketing Fundamentals": 20,
        "Web Development Basics": 15,
        "Data Analytics": 10
      },
      "bySource": {
        "lesson": 30,
        "course_resource": 10,
        "bonus_module": 3,
        "section": 2
      }
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalResources": 45,
      "resourcesPerPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "filters": {
      "appliedResourceType": null,
      "appliedCourseId": null,
      "appliedSearch": null,
      "sortBy": "createdAt",
      "sortOrder": "desc"
    }
  }
}
```

### Response Fields Description

#### Resource Object
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique resource identifier |
| `title` | string | Resource title |
| `description` | string | Resource description |
| `url` | string | Resource download/access URL |
| `type` | string | Resource type (`pdf`, `document`, `link`, `other`) |
| `size_mb` | number | File size in MB (for PDFs) |
| `pages` | number | Number of pages (for PDFs) |
| `source` | object | Source information |
| `enrollmentId` | string | Enrollment record identifier |
| `addedDate` | string | ISO date when resource was added |

#### Source Object
| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Source type (`lesson`, `section`, `course_resource`, `bonus_module`, `live_class`) |
| `courseId` | string | Course identifier |
| `courseTitle` | string | Course title |
| `courseThumbnail` | string | Course thumbnail URL |
| `instructor` | string | Instructor name |
| `weekTitle` | string | Week title (if applicable) |
| `weekNumber` | number | Week number (if applicable) |
| `sectionTitle` | string | Section title (if applicable) |
| `lessonTitle` | string | Lesson title (if applicable) |
| `lessonType` | string | Lesson type (if applicable) |
| `moduleTitle` | string | Module title (for bonus modules) |

#### Statistics Object
| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of resources |
| `byType` | object | Count by resource type |
| `byCourse` | object | Count by course |
| `bySource` | object | Count by source type |

---

## Resource Sources

The API aggregates resources from multiple sources:

### 1. **Lesson Resources**
- Resources attached to individual lessons (excluding video lessons)
- Includes text lessons, quiz lessons, and assessment lessons
- Source type: `lesson`

### 2. **Section Resources**
- Resources attached to curriculum sections
- Section-level materials and documents
- Source type: `section`

### 3. **Course Resources**
- Course-level PDF resources
- General course materials
- Source type: `course_resource`

### 4. **Bonus Module Resources**
- Resources from bonus modules (excluding videos)
- Additional learning materials
- Source type: `bonus_module`

### 5. **Live Class Materials**
- Materials from live classes
- Presentation slides, handouts, etc.
- Source type: `live_class`

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

### 404 Not Found - No Enrolled Courses
```json
{
  "success": false,
  "message": "No enrolled courses found for this student"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

---

## Usage Examples

### Basic Usage
```bash
curl -X GET \
  "http://localhost:8080/api/v1/enrolled/student/67e14360cd2f46d71bf0587c/resources" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by Resource Type
```bash
curl -X GET \
  "http://localhost:8080/api/v1/enrolled/student/67e14360cd2f46d71bf0587c/resources?resourceType=pdf" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Search Resources
```bash
curl -X GET \
  "http://localhost:8080/api/v1/enrolled/student/67e14360cd2f46d71bf0587c/resources?search=handbook" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by Course
```bash
curl -X GET \
  "http://localhost:8080/api/v1/enrolled/student/67e14360cd2f46d71bf0587c/resources?courseId=67e14360cd2f46d71bf0587c" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Sort by Title
```bash
curl -X GET \
  "http://localhost:8080/api/v1/enrolled/student/67e14360cd2f46d71bf0587c/resources?sortBy=title&sortOrder=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript/Axios Example
```javascript
const axios = require('axios');

const getStudentResources = async (studentId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      resourceType,
      courseId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const params = { page, limit, sortBy, sortOrder };
    if (resourceType) params.resourceType = resourceType;
    if (courseId) params.courseId = courseId;
    if (search) params.search = search;

    const response = await axios.get(
      `/api/v1/enrolled/student/${studentId}/resources`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching student resources:', error.response?.data || error.message);
    throw error;
  }
};

// Usage examples
getStudentResources('67e14360cd2f46d71bf0587c')
  .then(data => console.log('All resources:', data.data.resources));

getStudentResources('67e14360cd2f46d71bf0587c', { resourceType: 'pdf' })
  .then(data => console.log('PDF resources:', data.data.resources));

getStudentResources('67e14360cd2f46d71bf0587c', { search: 'guide' })
  .then(data => console.log('Guide resources:', data.data.resources));
```

### React Component Example
```javascript
import { useState, useEffect } from 'react';

const StudentResourcesComponent = ({ studentId }) => {
  const [resources, setResources] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    resourceType: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const fetchResources = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...filters
      });

      const response = await fetch(
        `/api/v1/enrolled/student/${studentId}/resources?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch resources');
      
      const data = await response.json();
      setResources(data.data.resources);
      setStatistics(data.data.statistics);
      setPagination(data.data.pagination);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) fetchResources();
  }, [studentId, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <div>Loading resources...</div>;

  return (
    <div className="student-resources">
      <div className="filters">
        <select 
          value={filters.resourceType} 
          onChange={(e) => handleFilterChange('resourceType', e.target.value)}
        >
          <option value="">All Types</option>
          <option value="pdf">PDF</option>
          <option value="document">Document</option>
          <option value="link">Link</option>
          <option value="other">Other</option>
        </select>
        
        <input
          type="text"
          placeholder="Search resources..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />
      </div>

      <div className="statistics">
        <h3>Resources Overview</h3>
        <p>Total: {statistics.total}</p>
        <div className="type-breakdown">
          {Object.entries(statistics.byType || {}).map(([type, count]) => (
            <span key={type}>{type}: {count}</span>
          ))}
        </div>
      </div>

      <div className="resources-list">
        {resources.map(resource => (
          <div key={resource.id} className="resource-card">
            <h4>{resource.title}</h4>
            <p>{resource.description}</p>
            <div className="resource-meta">
              <span>Type: {resource.type}</span>
              <span>Course: {resource.source.courseTitle}</span>
              {resource.source.weekTitle && (
                <span>Week {resource.source.weekNumber}: {resource.source.weekTitle}</span>
              )}
            </div>
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              Download/View
            </a>
          </div>
        ))}
      </div>

      <div className="pagination">
        <button 
          disabled={!pagination.hasPrevPage}
          onClick={() => fetchResources(pagination.currentPage - 1)}
        >
          Previous
        </button>
        <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
        <button 
          disabled={!pagination.hasNextPage}
          onClick={() => fetchResources(pagination.currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

---

## Key Features

### 1. **Comprehensive Resource Aggregation**
- Collects resources from all enrolled courses
- Multiple source types (lessons, sections, course-level, bonus modules)
- Excludes video lessons as requested

### 2. **Advanced Filtering & Search**
- Filter by resource type
- Filter by specific course
- Full-text search across titles, descriptions, and course names
- Multiple sorting options

### 3. **Rich Metadata**
- Detailed source information
- Course and instructor context
- Week and lesson hierarchy
- File size and page count for PDFs

### 4. **Performance Optimized**
- Efficient MongoDB queries with lean operations
- Pagination for large result sets
- Indexed fields for fast filtering

### 5. **Statistical Insights**
- Resource count by type
- Distribution across courses
- Source type breakdown

---

## Business Logic

### Resource Inclusion Criteria
- Only from active or completed enrollments
- Excludes video lessons and video resources
- Includes all other resource types (PDF, document, link, other)

### Source Priority
1. Lesson resources (from non-video lessons)
2. Section resources
3. Course-level PDF resources
4. Bonus module resources (non-video)
5. Live class materials

### Filtering Logic
- **Type Filter**: Exact match on resource type
- **Course Filter**: Exact match on course ID
- **Search**: Case-insensitive partial match on title, description, and course title

---

## Testing

Run the test suite:
```bash
node test-student-resources-api.js
```

The test includes:
- Basic resource retrieval
- Type filtering
- Search functionality
- Sorting capabilities
- Course filtering
- Error handling

---

## Performance Considerations

### Database Optimization
- Uses lean queries for better performance
- Efficient population of related data
- Indexed fields for fast lookups

### Caching Recommendations
- Cache resources for active enrollments
- Cache duration: 30 minutes to 2 hours
- Cache key: `student_resources_${studentId}_${filters_hash}`

### Rate Limiting
- Recommended: 60 requests per minute per user
- Consider lower limits for search queries

---

## Security Considerations

1. **Authentication**: JWT token required
2. **Authorization**: Students can only access their own resources
3. **Data Exposure**: Only necessary resource information exposed
4. **URL Validation**: Resource URLs are validated before storage

---

## Integration Notes

### Frontend Integration
- Perfect for student resource libraries
- Supports advanced filtering and search
- Rich metadata for resource organization

### Mobile App Integration
- Optimized response format
- Pagination for mobile performance
- Offline-friendly resource URLs

### Learning Management Systems
- Comprehensive resource aggregation
- Course-specific filtering
- Progress tracking integration

---

## Future Enhancements

- Resource download tracking
- Favorite resources functionality
- Resource sharing capabilities
- Advanced analytics and insights
- Bulk download options
- Resource versioning support

---

This API provides a comprehensive solution for accessing all learning resources across a student's enrolled courses, making it easy to build resource libraries, study materials sections, and comprehensive learning dashboards. 