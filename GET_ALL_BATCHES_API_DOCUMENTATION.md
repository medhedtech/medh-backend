# Get All Batches API Documentation

## Overview
This API endpoint allows authorized users (admin and instructors) to retrieve all batches across all courses with support for pagination, filtering, and search functionality.

## Endpoint
```
GET /api/v1/batches
```

## Authentication
- **Required**: Yes
- **Authorization**: Bearer token required
- **Roles**: Admin, Instructor

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 10 | Number of batches per page |
| `status` | string | - | Filter by batch status (e.g., 'active', 'inactive') |
| `search` | string | - | Search in batch name and batch code (case-insensitive) |

## Request Examples

### Basic Request
```bash
GET /api/v1/batches
Authorization: Bearer <your-token>
```

### With Pagination
```bash
GET /api/v1/batches?page=2&limit=5
Authorization: Bearer <your-token>
```

### With Search
```bash
GET /api/v1/batches?search=python
Authorization: Bearer <your-token>
```

### With Status Filter
```bash
GET /api/v1/batches?status=active
Authorization: Bearer <your-token>
```

### Combined Parameters
```bash
GET /api/v1/batches?page=1&limit=10&status=active&search=web
Authorization: Bearer <your-token>
```

## Response Structure

### Success Response (200 OK)
```json
{
  "success": true,
  "count": 10,
  "totalBatches": 25,
  "totalPages": 3,
  "currentPage": 1,
  "hasNextPage": true,
  "hasPrevPage": false,
  "data": [
    {
      "_id": "65f8a1b2c3d4e5f6a7b8c9d0",
      "batch_name": "Python Development Batch 1",
      "batch_code": "PY-001",
      "batch_size": 30,
      "enrolled_students": 25,
      "status": "active",
      "start_date": "2024-02-01T00:00:00.000Z",
      "end_date": "2024-05-01T00:00:00.000Z",
      "created_at": "2024-01-15T10:30:00.000Z",
      "course": {
        "_id": "65f8a1b2c3d4e5f6a7b8c9d1",
        "course_title": "Python Full Stack Development",
        "course_image": "python-course.jpg",
        "slug": "python-full-stack-development",
        "course_type": "professional",
        "course_category": "Programming"
      },
      "assigned_instructor": {
        "_id": "65f8a1b2c3d4e5f6a7b8c9d2",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com"
      }
    }
    // ... more batches
  ]
}
```

### Error Responses

#### Unauthorized (401)
```json
{
  "success": false,
  "message": "Access token required"
}
```

#### Forbidden (403)
```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions."
}
```

#### Server Error (500)
```json
{
  "success": false,
  "message": "Server error while fetching batches"
}
```

## Features

### 1. Pagination
- Supports page-based pagination
- Returns pagination metadata (totalPages, hasNextPage, etc.)
- Default: 10 items per page

### 2. Search
- Case-insensitive search across batch name and batch code
- Uses MongoDB regex for flexible matching

### 3. Status Filtering
- Filter batches by their current status
- Common statuses: 'active', 'inactive', 'completed', 'pending'

### 4. Data Population
- Course details (title, image, slug, type, category)
- Instructor details (name, email)
- Optimized with `.lean()` for better performance

### 5. Sorting
- Results sorted by creation date (newest first)

## Usage in Frontend

### JavaScript/Axios Example
```javascript
const getAllBatches = async (page = 1, limit = 10, filters = {}) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });

    const response = await axios.get(`/api/v1/batches?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching batches:', error);
    throw error;
  }
};

// Usage examples
const batches = await getAllBatches(1, 10); // Get first page
const searchResults = await getAllBatches(1, 10, { search: 'python' }); // Search
const activeBatches = await getAllBatches(1, 10, { status: 'active' }); // Filter
```

### React Hook Example
```javascript
import { useState, useEffect } from 'react';

const useBatches = (page = 1, filters = {}) => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    const fetchBatches = async () => {
      setLoading(true);
      try {
        const data = await getAllBatches(page, 10, filters);
        setBatches(data.data);
        setPagination({
          totalBatches: data.totalBatches,
          totalPages: data.totalPages,
          currentPage: data.currentPage,
          hasNextPage: data.hasNextPage,
          hasPrevPage: data.hasPrevPage
        });
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, [page, filters]);

  return { batches, loading, pagination };
};
```

## Performance Considerations

1. **Pagination**: Always use pagination for large datasets
2. **Indexing**: Ensure MongoDB indexes on frequently queried fields (status, created_at)
3. **Lean Queries**: Uses `.lean()` for better performance
4. **Population**: Only populates necessary fields to reduce data transfer

## Security Notes

1. **Authentication Required**: All requests must include valid Bearer token
2. **Role-based Access**: Only admin and instructor roles can access this endpoint
3. **Data Filtering**: No sensitive information exposed in responses
4. **Input Validation**: Query parameters are validated and sanitized

## Testing

Run the provided test script:
```bash
node test-get-all-batches.js
```

Make sure to:
1. Update the `authToken` variable with a valid admin/instructor token
2. Ensure your server is running on the correct port
3. Have some test data in your database 