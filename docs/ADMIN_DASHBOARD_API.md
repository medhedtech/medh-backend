# MEDH Admin Dashboard API Documentation

## Overview
This document outlines the comprehensive admin dashboard API endpoints for the MEDH (Market Expert Digital Hub) educational platform. The admin dashboard provides complete control over the platform with advanced analytics, user management, content management, and system administration capabilities.

## Base URL
All endpoints are prefixed with: `/api/v1/admin`

## Authentication
All endpoints require authentication with admin or super-admin role:
- Header: `Authorization: Bearer <jwt_token>`
- Required roles: `admin` or `super-admin`

## API Endpoints

### 1. Dashboard Analytics

#### Get Dashboard Statistics
```
GET /dashboard-stats
```
**Description:** Comprehensive dashboard statistics with period comparisons

**Response:**
```json
{
  "success": true,
  "data": {
    "totalStudents": {
      "total": 1250,
      "changes": {
        "monthly": { "current": 85, "previous": 72, "change": 18 },
        "quarterly": { "current": 234, "previous": 189, "change": 24 },
        "halfYearly": { "current": 456, "previous": 378, "change": 21 },
        "yearly": { "current": 892, "previous": 623, "change": 43 }
      }
    },
    "totalInstructors": { /* similar structure */ },
    "activeEnrollments": { /* similar structure */ },
    "activeCourses": { /* similar structure */ },
    "monthlyRevenue": { /* similar structure */ },
    "upcomingClasses": { "total": 45 },
    "completionRate": { "total": 78 },
    "studentSatisfaction": { "total": 85 },
    "instructorRating": { "total": 92 },
    "supportTickets": { "total": 12 }
  }
}
```

#### Get Admin Overview
```
GET /overview
```
**Description:** Quick overview for admin dashboard homepage

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "users": { "total": 1250, "active": 1180, "inactiveRate": "5.60" },
      "courses": { "total": 45, "published": 38, "publishRate": "84.44" },
      "enrollments": { "total": 2340, "active": 2156, "completionRate": "92.14" },
      "revenue": { "total": 125000, "monthly": 15600, "growth": 0 }
    },
    "recentActivity": {
      "newUsers": [/* recent user objects */],
      "newEnrollments": [/* recent enrollment objects */],
      "topCourses": [/* top course objects */]
    },
    "quickActions": [
      { "name": "Create Course", "endpoint": "/admin/courses", "method": "POST" },
      { "name": "Create Batch", "endpoint": "/admin/batches", "method": "POST" }
    ]
  }
}
```

### 2. User Management

#### Get All Users
```
GET /users?page=1&limit=10&search=john&role=student&status=active&sortBy=createdAt&sortOrder=desc
```
**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 10)
- `search` (string): Search by name, email, or phone
- `role` (string): Filter by user role
- `status` (string): Filter by user status
- `sortBy` (string): Sort field (default: createdAt)
- `sortOrder` (string): Sort order - asc/desc (default: desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [/* array of user objects */],
    "pagination": {
      "currentPage": 1,
      "totalPages": 25,
      "totalUsers": 250,
      "limit": 10
    },
    "stats": [/* user statistics by role */]
  }
}
```

#### Get User by ID
```
GET /users/:id
```
**Response:**
```json
{
  "success": true,
  "data": {
    "user": {/* user object with populated fields */},
    "stats": {
      "enrollmentCount": 5,
      "completedCourses": 3,
      "averageProgress": 78.5
    }
  }
}
```

#### Update User Status
```
PUT /users/:id/status
```
**Body:**
```json
{
  "status": "active" // active, inactive, suspended
}
```

#### Delete User (Soft Delete)
```
DELETE /users/:id
```

#### Bulk User Operations
```
POST /users/bulk
```
**Body:**
```json
{
  "operation": "updateStatus", // updateStatus, delete, activate, suspend
  "userIds": ["userId1", "userId2"],
  "data": { "status": "active" }
}
```

### 3. Course Management

#### Get All Courses
```
GET /courses?page=1&limit=10&search=python&category=categoryId&status=published&courseType=live&sortBy=createdAt&sortOrder=desc
```

#### Create Course
```
POST /courses
```
**Body:**
```json
{
  "title": "Advanced Python Programming",
  "description": "Comprehensive Python course",
  "category": "categoryId",
  "price": 299,
  "courseType": "live",
  "status": "draft",
  "instructor": "instructorId"
}
```

#### Update Course
```
PUT /courses/:id
```

#### Delete Course
```
DELETE /courses/:id
```

#### Bulk Course Operations
```
POST /courses/bulk
```
**Body:**
```json
{
  "operation": "updateStatus", // updateStatus, updateCategory, updatePrice, publish, unpublish, delete
  "courseIds": ["courseId1", "courseId2"],
  "data": { "status": "published" }
}
```

### 4. Batch Management

#### Get All Batches
```
GET /batches?page=1&limit=10&search=batch&status=active&instructorId=instructorId&courseId=courseId&sortBy=createdAt&sortOrder=desc
```

#### Create Batch
```
POST /batches
```
**Body:**
```json
{
  "name": "Python Batch #1",
  "course": "courseId",
  "instructor": "instructorId",
  "capacity": 30,
  "startDate": "2024-01-15",
  "endDate": "2024-03-15",
  "schedule": [
    {
      "day": "Monday",
      "time": "18:00",
      "duration": 120
    }
  ]
}
```

#### Update Batch
```
PUT /batches/:id
```

### 5. Enrollment Management

#### Get All Enrollments
```
GET /enrollments?page=1&limit=10&status=active&courseId=courseId&batchId=batchId&sortBy=enrollment_date&sortOrder=desc
```

#### Update Enrollment Status
```
PUT /enrollments/:id/status
```
**Body:**
```json
{
  "status": "active", // active, inactive, completed, cancelled, suspended
  "reason": "Optional reason for status change"
}
```

### 6. Payment Management

#### Get All Payments
```
GET /payments?page=1&limit=10&status=paid&paymentMethod=razorpay&dateFrom=2024-01-01&dateTo=2024-01-31&sortBy=createdAt&sortOrder=desc
```

**Response includes:**
- Payment details with populated user and course info
- Payment statistics by status and method
- Daily revenue trends for last 30 days

### 7. Content Management

#### Get All Announcements
```
GET /announcements?page=1&limit=10&search=important&status=published&priority=high&sortBy=createdAt&sortOrder=desc
```

#### Create Announcement
```
POST /announcements
```
**Body:**
```json
{
  "title": "Important Notice",
  "description": "System maintenance scheduled",
  "priority": "high",
  "status": "published",
  "targetAudience": ["student", "instructor"],
  "scheduledDate": "2024-01-15T10:00:00Z"
}
```

#### Update Announcement
```
PUT /announcements/:id
```

#### Get All Blogs
```
GET /blogs?page=1&limit=10&search=technology&status=published&category=tech&sortBy=createdAt&sortOrder=desc
```

### 8. Support Management

#### Get Support Tickets
```
GET /support?page=1&limit=10&search=issue&status=open&priority=high&type=complaint&sortBy=createdAt&sortOrder=desc
```

**Response includes:**
- Combined complaints and feedback data
- Support statistics and ratings
- Pagination for efficient loading

### 9. Assessment Management

#### Get Assessments
```
GET /assessments?page=1&limit=10&search=quiz&courseId=courseId&type=quiz&sortBy=createdAt&sortOrder=desc
```

**Response includes:**
- Quiz responses and assignments
- Progress statistics
- Completion and scoring analytics

### 10. Corporate Training Management

#### Get Corporate Training Data
```
GET /corporate-training?page=1&limit=10&search=company&status=active&sortBy=createdAt&sortOrder=desc
```

**Response includes:**
- Corporate users and their training data
- Corporate enrollment statistics
- Revenue analytics for corporate clients

### 11. System Administration

#### Get System Statistics
```
GET /system
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totals": {
      "users": 1250,
      "courses": 45,
      "enrollments": 2340,
      "orders": 1890
    },
    "recentActivity": {
      "newUsers": [/* recent users */],
      "newCourses": [/* recent courses */],
      "newEnrollments": [/* recent enrollments */]
    },
    "systemHealth": {
      "uptime": 1234567,
      "memory": {/* memory usage */},
      "database": {
        "connected": true,
        "collections": 25,
        "dataSize": 1024000,
        "indexSize": 256000
      },
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development)"
}
```

## Common HTTP Status Codes

- `200` - Success
- `201` - Created successfully
- `400` - Bad request (validation error)
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `500` - Internal server error

## Features

### 1. Advanced Filtering and Search
- Multi-field search across all entities
- Status-based filtering
- Date range filtering for analytics
- Category and role-based filtering

### 2. Pagination
- Consistent pagination across all list endpoints
- Configurable page size (default: 10, max: 100)
- Total count and page information

### 3. Sorting
- Flexible sorting on multiple fields
- Ascending and descending order support
- Default sorting by creation date

### 4. Bulk Operations
- Bulk status updates for users and courses
- Bulk delete operations
- Batch processing for efficiency

### 5. Analytics and Reporting
- Period-based comparisons (monthly, quarterly, yearly)
- Percentage change calculations
- Revenue and enrollment trends
- Performance metrics and KPIs

### 6. Real-time Data
- Live system statistics
- Current database status
- Active user counts
- Ongoing enrollments

### 7. Security
- Role-based access control
- JWT authentication
- Input validation and sanitization
- Audit trail for sensitive operations

## Usage Examples

### Get Dashboard Overview
```javascript
const response = await fetch('/api/v1/admin/dashboard-stats', {
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

### Create New Course
```javascript
const newCourse = {
  title: 'React Development Masterclass',
  description: 'Complete React course with hooks and context',
  category: '60f7b2b5e1b2c72f4c8b4567',
  price: 499,
  courseType: 'live',
  status: 'draft'
};

const response = await fetch('/api/v1/admin/courses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newCourse)
});
```

### Bulk Update User Status
```javascript
const bulkUpdate = {
  operation: 'updateStatus',
  userIds: ['user1', 'user2', 'user3'],
  data: { status: 'active' }
};

const response = await fetch('/api/v1/admin/users/bulk', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(bulkUpdate)
});
```

## Rate Limiting
- Admin endpoints have higher rate limits
- Bulk operations have special handling
- Real-time endpoints may have caching

## Monitoring and Logging
- All admin actions are logged
- Performance metrics tracked
- Error monitoring with detailed context
- Audit trail for compliance

This API provides comprehensive admin dashboard functionality for the MEDH educational platform, enabling complete platform management with advanced analytics and bulk operations.