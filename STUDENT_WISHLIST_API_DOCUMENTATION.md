# Student Wishlist API Documentation

This document provides comprehensive documentation for the Student Wishlist Management API endpoints in the MEDH backend system.

## Overview

The Student Wishlist API allows students to manage their course wishlist, including adding courses, removing courses, viewing wishlist contents, and getting wishlist statistics. All endpoints are designed to work with the existing User and Course models while maintaining data integrity and security.

## Base URL

```
/api/students/wishlist
```

## Authentication

All endpoints require proper authentication. Students can only manage their own wishlists.

---

## API Endpoints

### 1. Add Course to Wishlist

**Endpoint:** `POST /api/students/wishlist/add`  
**Access:** Private (Student)  
**Description:** Add a course to the student's wishlist

#### Request Body

```json
{
  "studentId": "64a7b8c9d1e2f3a4b5c6d7e8",
  "courseId": "64a7b8c9d1e2f3a4b5c6d7e9"
}
```

#### Success Response (201)

```json
{
  "success": true,
  "message": "Course added to wishlist successfully",
  "data": {
    "wishlist": {
      "id": "64a7b8c9d1e2f3a4b5c6d7ea",
      "totalCourses": 3,
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    },
    "course": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e9",
      "title": "Python Programming Fundamentals",
      "category": "Programming",
      "image": {
        "url": "https://example.com/course-image.jpg",
        "alt": "Python Course"
      },
      "addedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

#### Error Responses

```json
// 400 - Bad Request
{
  "success": false,
  "message": "Student ID and Course ID are required",
  "errors": {
    "studentId": "Student ID is required",
    "courseId": null
  }
}

// 404 - Student Not Found
{
  "success": false,
  "message": "Student not found or inactive"
}

// 404 - Course Not Found
{
  "success": false,
  "message": "Course not found or not available"
}

// 409 - Already in Wishlist
{
  "success": false,
  "message": "Course is already in your wishlist",
  "data": {
    "course": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e9",
      "title": "Python Programming Fundamentals",
      "addedAt": "2024-01-10T08:15:00.000Z"
    }
  }
}
```

---

### 2. Remove Course from Wishlist

**Endpoint:** `DELETE /api/students/wishlist/remove`  
**Access:** Private (Student)  
**Description:** Remove a course from the student's wishlist

#### Request Body

```json
{
  "studentId": "64a7b8c9d1e2f3a4b5c6d7e8",
  "courseId": "64a7b8c9d1e2f3a4b5c6d7e9"
}
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "Course removed from wishlist successfully",
  "data": {
    "wishlist": {
      "id": "64a7b8c9d1e2f3a4b5c6d7ea",
      "totalCourses": 2,
      "lastUpdated": "2024-01-15T10:35:00.000Z"
    },
    "removedCourse": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e9",
      "title": "Python Programming Fundamentals",
      "category": "Programming"
    }
  }
}
```

#### Error Responses

```json
// 404 - Wishlist Not Found
{
  "success": false,
  "message": "Wishlist not found"
}

// 404 - Course Not in Wishlist
{
  "success": false,
  "message": "Course not found in wishlist"
}
```

---

### 3. Get Student's Wishlist

**Endpoint:** `GET /api/students/wishlist/:studentId`  
**Access:** Private (Student)  
**Description:** Retrieve the student's complete wishlist with course details

#### Query Parameters

- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of courses per page (default: 10)
- `sortBy` (optional): Sort field - 'addedAt', 'title', 'category' (default: 'addedAt')
- `sortOrder` (optional): Sort order - 'asc', 'desc' (default: 'desc')

#### Example Request

```
GET /api/students/wishlist/64a7b8c9d1e2f3a4b5c6d7e8?page=1&limit=5&sortBy=addedAt&sortOrder=desc
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "Wishlist retrieved successfully",
  "data": {
    "wishlist": {
      "id": "64a7b8c9d1e2f3a4b5c6d7ea",
      "totalCourses": 3,
      "courses": [
        {
          "id": "64a7b8c9d1e2f3a4b5c6d7e9",
          "title": "Python Programming Fundamentals",
          "category": "Programming",
          "image": {
            "url": "https://example.com/python-course.jpg",
            "alt": "Python Course"
          },
          "level": "Beginner",
          "duration": "8 weeks",
          "sessions": 16,
          "class_type": "Live",
          "category_type": "Technical",
          "status": "Published",
          "description": "Learn Python programming from basics to advanced concepts",
          "pricing": {
            "currency": "INR",
            "individual": 15000,
            "batch": 12000
          },
          "meta": {
            "views": 1250,
            "ratings": {
              "average": 4.5,
              "count": 89
            },
            "enrollments": 156
          },
          "wishlist_info": {
            "addedAt": "2024-01-15T10:30:00.000Z",
            "notificationPreference": {
              "priceDrops": true,
              "startDate": true
            }
          }
        }
      ],
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalCourses": 3,
      "limit": 5,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

#### Empty Wishlist Response (200)

```json
{
  "success": true,
  "message": "Wishlist is empty",
  "data": {
    "wishlist": {
      "totalCourses": 0,
      "courses": [],
      "lastUpdated": null
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 0,
      "totalCourses": 0,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 4. Check Wishlist Status

**Endpoint:** `GET /api/students/wishlist/check/:studentId/:courseId`  
**Access:** Private (Student)  
**Description:** Check if a specific course is in the student's wishlist

#### Example Request

```
GET /api/students/wishlist/check/64a7b8c9d1e2f3a4b5c6d7e8/64a7b8c9d1e2f3a4b5c6d7e9
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "Wishlist status checked successfully",
  "data": {
    "isInWishlist": true,
    "addedAt": "2024-01-15T10:30:00.000Z",
    "studentId": "64a7b8c9d1e2f3a4b5c6d7e8",
    "courseId": "64a7b8c9d1e2f3a4b5c6d7e9"
  }
}
```

#### Not in Wishlist Response (200)

```json
{
  "success": true,
  "message": "Wishlist status checked successfully",
  "data": {
    "isInWishlist": false,
    "addedAt": null,
    "studentId": "64a7b8c9d1e2f3a4b5c6d7e8",
    "courseId": "64a7b8c9d1e2f3a4b5c6d7e9"
  }
}
```

---

### 5. Clear Entire Wishlist

**Endpoint:** `DELETE /api/students/wishlist/clear/:studentId`  
**Access:** Private (Student)  
**Description:** Remove all courses from the student's wishlist

#### Example Request

```
DELETE /api/students/wishlist/clear/64a7b8c9d1e2f3a4b5c6d7e8
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "Wishlist cleared successfully",
  "data": {
    "clearedCount": 5,
    "wishlist": {
      "id": "64a7b8c9d1e2f3a4b5c6d7ea",
      "totalCourses": 0,
      "lastUpdated": "2024-01-15T10:40:00.000Z"
    }
  }
}
```

---

### 6. Get Wishlist Statistics

**Endpoint:** `GET /api/students/wishlist/stats/:studentId`  
**Access:** Private (Student)  
**Description:** Get statistical information about the student's wishlist

#### Example Request

```
GET /api/students/wishlist/stats/64a7b8c9d1e2f3a4b5c6d7e8
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "Wishlist statistics retrieved successfully",
  "data": {
    "totalCourses": 8,
    "categoryBreakdown": {
      "Programming": 3,
      "Data Science": 2,
      "Web Development": 2,
      "Machine Learning": 1
    },
    "typeBreakdown": {
      "Technical": 6,
      "Soft Skills": 1,
      "Management": 1
    },
    "priceRange": {
      "min": 8000,
      "max": 25000,
      "average": 16250
    },
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

#### No Data Response (200)

```json
{
  "success": true,
  "message": "No wishlist data found",
  "data": {
    "totalCourses": 0,
    "categoryBreakdown": {},
    "typeBreakdown": {},
    "priceRange": {
      "min": 0,
      "max": 0,
      "average": 0
    },
    "lastUpdated": null
  }
}
```

---

## Frontend Integration Examples

### JavaScript/React Examples

#### Add to Wishlist

```javascript
const addToWishlist = async (studentId, courseId) => {
  try {
    const response = await fetch("/api/students/wishlist/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        studentId: studentId,
        courseId: courseId,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("Course added to wishlist:", data.data.course.title);
      // Update UI state
      setWishlistCount(data.data.wishlist.totalCourses);
    } else {
      console.error("Error:", data.message);
    }
  } catch (error) {
    console.error("Network error:", error);
  }
};
```

#### Get Wishlist with Pagination

```javascript
const getWishlist = async (studentId, page = 1, limit = 10) => {
  try {
    const response = await fetch(
      `/api/students/wishlist/${studentId}?page=${page}&limit=${limit}&sortBy=addedAt&sortOrder=desc`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    const data = await response.json();

    if (data.success) {
      setWishlistCourses(data.data.wishlist.courses);
      setPagination(data.data.pagination);
    }
  } catch (error) {
    console.error("Error fetching wishlist:", error);
  }
};
```

#### Check Wishlist Status

```javascript
const checkWishlistStatus = async (studentId, courseId) => {
  try {
    const response = await fetch(
      `/api/students/wishlist/check/${studentId}/${courseId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    const data = await response.json();

    if (data.success) {
      setIsInWishlist(data.data.isInWishlist);
      // Update heart icon or wishlist button state
    }
  } catch (error) {
    console.error("Error checking wishlist status:", error);
  }
};
```

---

## Error Handling

### Common Error Codes

- **400**: Bad Request - Missing or invalid parameters
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - User doesn't have permission to access this resource
- **404**: Not Found - Student, course, or wishlist not found
- **409**: Conflict - Course already exists in wishlist
- **500**: Internal Server Error - Server-side error

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

---

## Security Features

1. **Authentication Required**: All endpoints require valid JWT token
2. **Student Validation**: Verifies student exists and is active
3. **Course Validation**: Ensures only published/upcoming courses can be added
4. **Activity Logging**: All wishlist actions are logged for audit purposes
5. **Input Sanitization**: All inputs are validated and sanitized
6. **Rate Limiting**: Prevent abuse through rate limiting (configure as needed)

---

## Performance Considerations

1. **Database Indexing**: Optimized indexes for efficient queries
2. **Pagination**: Large wishlists are paginated to prevent performance issues
3. **Selective Population**: Only necessary course fields are populated
4. **Caching**: Consider implementing Redis caching for frequently accessed wishlists
5. **Batch Operations**: Efficient handling of multiple course operations

---

## Data Model Integration

### User Model Integration

- Students are identified by role: `USER_ROLES.STUDENT` or `USER_ROLES.CORPORATE_STUDENT`
- Activity logging tracks all wishlist actions
- User status validation ensures only active students can manage wishlists

### Course Model Integration

- Only courses with status "Published" or "Upcoming" can be added
- Course validation ensures referenced courses exist
- Detailed course information is populated in responses

### Wishlist Model Features

- Compound indexing for efficient queries
- Notification preferences for each course
- Automatic timestamp management
- Built-in methods for common operations

---

## Testing

### Unit Tests

```javascript
// Example test structure
describe("Wishlist API", () => {
  test("should add course to wishlist", async () => {
    // Test implementation
  });

  test("should prevent duplicate course addition", async () => {
    // Test implementation
  });

  test("should retrieve paginated wishlist", async () => {
    // Test implementation
  });
});
```

### Integration Tests

- Test complete wishlist workflows
- Verify database state changes
- Test error scenarios and edge cases
- Validate response formats and status codes

---

## Monitoring and Logging

### Key Metrics to Monitor

- Wishlist addition/removal rates
- Most wishlisted courses
- Wishlist conversion rates (wishlist → enrollment)
- API response times and error rates

### Log Events

- Course added to wishlist
- Course removed from wishlist
- Wishlist cleared
- Failed wishlist operations
- Authentication failures

---

This documentation provides a complete guide for implementing and using the Student Wishlist API. For additional support or questions, please refer to the main API documentation or contact the development team.
