# Instructor API Integration Guide

## Overview
This guide provides comprehensive documentation for integrating instructor/trainer features with the MEDH backend system. The system supports role-based access control with dedicated instructor functionalities.

## Authentication
All instructor endpoints require authentication using JWT tokens with instructor role permissions.

```javascript
// Headers required for all requests
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

## 1. Instructor Dashboard Data

### Get Instructor Overview
```http
GET /api/v1/instructors/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "upcomingClasses": [],
    "recentSubmissions": [],
    "totalStudents": 0,
    "activeBatches": 0,
    "pendingDemos": 0,
    "monthlyRevenue": 0
  }
}
```

## 2. Demo Classes Management

### Get Assigned Demo Classes
```http
GET /api/demo-booking/instructor/:instructorId
```

### Accept/Reject Demo Assignment
```http
PUT /api/demo-booking/:id/status
```

**Request Body:**
```json
{
  "status": "accepted" | "rejected",
  "reason": "Optional rejection reason"
}
```

### Get Demo Feedback Statistics
```http
GET /api/demo-feedback/stats/instructor/:instructorId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalFeedbacks": 25,
    "averageRating": 4.2,
    "ratingDistribution": {
      "5": 10,
      "4": 8,
      "3": 5,
      "2": 2,
      "1": 0
    }
  }
}
```

## 3. Batch Management

### Get Instructor Batches
```http
GET /api/v1/batches/instructor/:instructorId
```

### Create New Batch
```http
POST /api/v1/batches
```

**Request Body:**
```json
{
  "batch_name": "Python Fundamentals - Batch 1",
  "course_id": "course_id_here",
  "instructor_id": "instructor_id_here",
  "start_date": "2024-02-01",
  "end_date": "2024-04-01",
  "max_students": 30,
  "schedule": {
    "days": ["Monday", "Wednesday", "Friday"],
    "time": "10:00 AM - 12:00 PM"
  }
}
```

### Get Batch Analytics
```http
GET /api/v1/batches/:batchId/analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollmentStats": {
      "total": 25,
      "active": 23,
      "completed": 2,
      "dropped": 0
    },
    "progressStats": {
      "averageProgress": 65.5,
      "completionRate": 78.2
    },
    "attendanceStats": {
      "averageAttendance": 85.3
    }
  }
}
```

## 4. Student Management

### Get Batch Students
```http
GET /api/enrollments/batch/:batchId/students
```

### Get Student Progress
```http
GET /api/v1/progress/student/:studentId/batch/:batchId
```

### Get Enhanced Student Analytics
```http
GET /api/enhanced-progress/student/:studentId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "studentId": "student_id",
    "overallProgress": 75.5,
    "courseProgress": {
      "completed_lessons": 15,
      "total_lessons": 20,
      "completion_percentage": 75
    },
    "performanceMetrics": {
      "quiz_average": 82.5,
      "assignment_average": 78.3,
      "attendance_rate": 90.2
    },
    "engagementMetrics": {
      "forum_posts": 12,
      "questions_asked": 8,
      "peer_interactions": 25
    }
  }
}
```

## 5. Assignment Management

### Get Instructor Assignments
```http
GET /api/assignments/instructor/:instructorId
```

### Create Assignment
```http
POST /api/assignments
```

**Request Body:**
```json
{
  "title": "Python Functions Assignment",
  "description": "Create functions for mathematical operations",
  "course_id": "course_id_here",
  "batch_id": "batch_id_here",
  "due_date": "2024-02-15",
  "max_marks": 100,
  "instructions": "Detailed instructions here",
  "attachments": ["file_url_1", "file_url_2"]
}
```

### Get Assignment Submissions
```http
GET /api/assignments/:assignmentId/submissions
```

### Grade Submission
```http
PUT /api/assignments/submissions/:submissionId/grade
```

**Request Body:**
```json
{
  "marks": 85,
  "feedback": "Good work! Consider optimizing the algorithm.",
  "status": "graded"
}
```

## 6. Content Management

### Upload Video Lesson
```http
POST /api/v1/courses/:courseId/video-lessons
```

**Request Body:**
```json
{
  "title": "Introduction to Variables",
  "description": "Learn about Python variables",
  "video_data": "base64_encoded_video_data",
  "duration": 1800,
  "order": 1,
  "is_preview": false
}
```

### Upload Course Materials
```http
POST /api/v1/upload/course-materials
```

**Request Body (multipart/form-data):**
```
file: [File]
course_id: string
material_type: "presentation" | "document" | "resource"
title: string
description: string
```

### Get Course Content
```http
GET /api/v1/courses/:courseId/content
```

## 7. Attendance Management

### Mark Attendance
```http
POST /api/v1/attendance/mark
```

**Request Body:**
```json
{
  "batch_id": "batch_id_here",
  "session_date": "2024-02-01",
  "session_type": "live_class",
  "attendance_records": [
    {
      "student_id": "student_1",
      "status": "present",
      "join_time": "10:05 AM",
      "leave_time": "11:55 AM"
    },
    {
      "student_id": "student_2",
      "status": "absent",
      "reason": "sick"
    }
  ]
}
```

### Get Attendance Reports
```http
GET /api/v1/attendance/batch/:batchId/report
```

## 8. Revenue & Analytics

### Get Instructor Revenue
```http
GET /api/v1/instructors/:instructorId/revenue
```

**Response:**
```json
{
  "success": true,
  "data": {
    "monthly_revenue": 15000,
    "total_revenue": 125000,
    "pending_payments": 2500,
    "commission_rate": 0.15,
    "breakdown": {
      "demo_classes": 1200,
      "live_classes": 8500,
      "course_sales": 5300
    }
  }
}
```

### Get Performance Analytics
```http
GET /api/v1/instructors/:instructorId/analytics
```

## 9. Communication & Announcements

### Send Batch Announcement
```http
POST /api/announcements
```

**Request Body:**
```json
{
  "title": "Class Schedule Update",
  "message": "Tomorrow's class will start 30 minutes late.",
  "target_type": "batch",
  "target_id": "batch_id_here",
  "priority": "high",
  "sender_id": "instructor_id_here"
}
```

### Get Batch Messages
```http
GET /api/announcements/batch/:batchId
```

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "batch_name",
      "issue": "Required field missing"
    }
  }
}
```

## Rate Limiting

- Standard endpoints: 100 requests per minute
- Upload endpoints: 10 requests per minute
- Analytics endpoints: 50 requests per minute

## Webhooks

### Batch Events
```javascript
// Webhook payload for batch events
{
  "event": "batch.student_enrolled",
  "data": {
    "batch_id": "batch_id",
    "student_id": "student_id",
    "enrollment_date": "2024-02-01T10:00:00Z"
  },
  "timestamp": "2024-02-01T10:00:00Z"
}
```

### Assignment Events
```javascript
// Webhook payload for assignment submissions
{
  "event": "assignment.submitted",
  "data": {
    "assignment_id": "assignment_id",
    "student_id": "student_id",
    "submission_id": "submission_id",
    "submitted_at": "2024-02-01T10:00:00Z"
  },
  "timestamp": "2024-02-01T10:00:00Z"
}
```

## Implementation Examples

### React Integration Example
```javascript
// Instructor Dashboard Component
import { useEffect, useState } from 'react';
import axios from 'axios';

const InstructorDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get('/api/v1/instructors/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        setDashboardData(response.data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="instructor-dashboard">
      <h1>Instructor Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Active Batches</h3>
          <p>{dashboardData?.activeBatches || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Students</h3>
          <p>{dashboardData?.totalStudents || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Pending Demos</h3>
          <p>{dashboardData?.pendingDemos || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Monthly Revenue</h3>
          <p>${dashboardData?.monthlyRevenue || 0}</p>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;
```

### Vue.js Integration Example
```javascript
// Batch Management Component
<template>
  <div class="batch-management">
    <h2>My Batches</h2>
    <div v-for="batch in batches" :key="batch._id" class="batch-card">
      <h3>{{ batch.batch_name }}</h3>
      <p>Students: {{ batch.current_students }}/{{ batch.max_students }}</p>
      <button @click="viewBatchDetails(batch._id)">View Details</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      batches: [],
      loading: false
    };
  },
  async mounted() {
    await this.fetchBatches();
  },
  methods: {
    async fetchBatches() {
      this.loading = true;
      try {
        const response = await this.$http.get(`/api/v1/batches/instructor/${this.instructorId}`);
        this.batches = response.data.data;
      } catch (error) {
        console.error('Failed to fetch batches:', error);
      } finally {
        this.loading = false;
      }
    },
    viewBatchDetails(batchId) {
      this.$router.push(`/instructor/batches/${batchId}`);
    }
  }
};
</script>
```

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Role-based access control ensures instructors can only access their own data
3. **Input Validation**: All inputs are validated using Joi schemas
4. **Rate Limiting**: Prevents abuse of API endpoints
5. **File Upload Security**: Virus scanning and file type validation for uploads
6. **Data Encryption**: Sensitive data is encrypted at rest and in transit

## Testing

### Unit Test Example
```javascript
// Test for assignment creation
describe('Assignment Creation', () => {
  it('should create assignment successfully', async () => {
    const assignmentData = {
      title: 'Test Assignment',
      description: 'Test Description',
      course_id: 'course_123',
      batch_id: 'batch_123',
      due_date: '2024-02-15',
      max_marks: 100
    };

    const response = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send(assignmentData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe(assignmentData.title);
  });
});
```

## Support & Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure JWT token is valid and not expired
2. **Permission Denied**: Verify instructor role and resource ownership
3. **Upload Failures**: Check file size limits and supported formats
4. **Rate Limiting**: Implement proper retry logic with exponential backoff

### Contact Information
- API Support: api-support@medh.com
- Documentation: docs@medh.com
- Emergency: emergency@medh.com

---

*Last Updated: January 2024*
*Version: 1.0.0* 