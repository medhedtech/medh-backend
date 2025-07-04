# Courses by Category API Documentation

## Overview
This API endpoint retrieves all courses grouped by their categories. It returns only essential course fields and organizes them by category for easy frontend consumption.

## Endpoint
```
GET /api/courses/category
```

## Features
- **No Pagination**: Returns all courses at once
- **Grouped by Category**: Courses are organized by their `course_category` field
- **Limited Fields**: Returns only 4 essential fields per course
- **Multiple Filters**: Support for status, class_type, category_type, and text search
- **Sorting**: Courses within each category can be sorted
- **Multi-Model Support**: Searches across legacy Course model and new course-types models

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `category` | string | No | - | Filter courses by specific category |
| `status` | string | No | all | Filter by course status (Published, Draft, Upcoming) |
| `class_type` | string | No | all | Filter by class type |
| `category_type` | string | No | all | Filter by category type (Free, Paid, Live, etc.) |
| `search` | string | No | - | Text search in title, tags, and description |
| `sort_by` | string | No | course_title | Sort field (course_title, course_category) |
| `sort_order` | string | No | asc | Sort order (asc, desc) |

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "message": "All courses retrieved successfully, grouped by category",
  "data": {
    "coursesByCategory": {
      "AI For Professionals": [
        {
          "_id": "course_id_1",
          "course_category": "AI For Professionals",
          "course_subcategory": "Machine Learning",
          "course_title": "Introduction to Machine Learning",
          "course_tag": "ml,ai,python"
        },
        {
          "_id": "course_id_2",
          "course_category": "AI For Professionals",
          "course_subcategory": "Deep Learning",
          "course_title": "Neural Networks Fundamentals",
          "course_tag": "neural,networks,deep learning"
        }
      ],
      "Web Development": [
        {
          "_id": "course_id_3",
          "course_category": "Web Development",
          "course_subcategory": "Frontend",
          "course_title": "React.js Complete Guide",
          "course_tag": "react,javascript,frontend"
        }
      ],
      "Uncategorized": [
        {
          "_id": "course_id_4",
          "course_category": null,
          "course_subcategory": "General",
          "course_title": "General Programming Concepts",
          "course_tag": "programming,basics"
        }
      ]
    },
    "summary": {
      "totalCourses": 4,
      "totalCategories": 3,
      "categoriesWithCounts": [
        {
          "category": "AI For Professionals",
          "courseCount": 2
        },
        {
          "category": "Web Development",
          "courseCount": 1
        },
        {
          "category": "Uncategorized",
          "courseCount": 1
        }
      ]
    },
    "filters": {
      "category": "all",
      "status": "all",
      "class_type": "all",
      "category_type": "all",
      "search": null
    },
    "sorting": {
      "sort_by": "course_title",
      "sort_order": "asc"
    },
    "sources": {
      "legacy_model": 2,
      "new_model": 2
    }
  }
}
```

### Error Response (400/500)
```json
{
  "success": false,
  "message": "Error message describing the issue",
  "error": "Detailed error information"
}
```

## Response Fields

### Course Object Fields
Each course object contains only these 4 fields:

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Unique course identifier |
| `course_category` | string | Course category name |
| `course_subcategory` | string | Course subcategory name |
| `course_title` | string | Course title |
| `course_tag` | string | Comma-separated course tags |

### Summary Object
| Field | Type | Description |
|-------|------|-------------|
| `totalCourses` | number | Total number of courses returned |
| `totalCategories` | number | Total number of categories |
| `categoriesWithCounts` | array | Array of category names with course counts |

## Usage Examples

### 1. Get All Courses Grouped by Category
```bash
curl -X GET "http://localhost:5000/api/courses/category"
```

### 2. Filter by Specific Category
```bash
curl -X GET "http://localhost:5000/api/courses/category?category=AI%20For%20Professionals"
```

### 3. Filter by Status
```bash
curl -X GET "http://localhost:5000/api/courses/category?status=Published"
```

### 4. Search with Text
```bash
curl -X GET "http://localhost:5000/api/courses/category?search=machine%20learning"
```

### 5. Sort by Title Descending
```bash
curl -X GET "http://localhost:5000/api/courses/category?sort_by=course_title&sort_order=desc"
```

### 6. Multiple Filters
```bash
curl -X GET "http://localhost:5000/api/courses/category?status=Published&class_type=Live&sort_by=course_title"
```

## JavaScript/Frontend Usage

### Using Fetch API
```javascript
async function getCoursesByCategory(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/courses/category?${params}`);
  const data = await response.json();
  
  if (data.success) {
    return data.data.coursesByCategory;
  } else {
    throw new Error(data.message);
  }
}

// Usage examples
const allCourses = await getCoursesByCategory();
const aiCourses = await getCoursesByCategory({ category: 'AI For Professionals' });
const publishedCourses = await getCoursesByCategory({ status: 'Published' });
```

### Using Axios
```javascript
import axios from 'axios';

async function getCoursesByCategory(filters = {}) {
  try {
    const response = await axios.get('/api/courses/category', { params: filters });
    return response.data.data.coursesByCategory;
  } catch (error) {
    console.error('Error fetching courses:', error.response?.data?.message || error.message);
    throw error;
  }
}
```

## Frontend Integration Tips

### 1. Displaying Categories and Courses
```javascript
// Assuming you have the coursesByCategory object
Object.entries(coursesByCategory).forEach(([categoryName, courses]) => {
  console.log(`Category: ${categoryName} (${courses.length} courses)`);
  courses.forEach(course => {
    console.log(`  - ${course.course_title}`);
  });
});
```

### 2. Creating Category Navigation
```javascript
const categories = Object.keys(coursesByCategory);
const categoryNav = categories.map(category => ({
  name: category,
  count: coursesByCategory[category].length,
  courses: coursesByCategory[category]
}));
```

### 3. Search and Filter Implementation
```javascript
function filterCourses(coursesByCategory, searchTerm) {
  const filtered = {};
  
  Object.entries(coursesByCategory).forEach(([category, courses]) => {
    const matchingCourses = courses.filter(course => 
      course.course_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_tag.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (matchingCourses.length > 0) {
      filtered[category] = matchingCourses;
    }
  });
  
  return filtered;
}
```

## Performance Considerations

1. **No Pagination**: This endpoint returns all courses at once. For large datasets, consider implementing client-side pagination or virtualization.

2. **Limited Fields**: Only 4 essential fields are returned to minimize payload size and improve performance.

3. **Caching**: Consider implementing caching on the frontend since this data doesn't change frequently.

4. **Lazy Loading**: For better UX, consider loading course details on-demand when users click on specific courses.

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad request (invalid parameters)
- `500`: Internal server error

Always check the `success` field in the response before processing data:

```javascript
if (response.data.success) {
  // Process data
  const coursesByCategory = response.data.data.coursesByCategory;
} else {
  // Handle error
  console.error('API Error:', response.data.message);
}
```

## Testing

Use the provided test script to verify the API functionality:

```bash
node test-courses-by-category.js
```

The test script validates:
- Response structure
- Required fields presence
- Data integrity
- Filter functionality
- Sorting behavior 