# Instructor APIs Implementation Guide

## Overview
Complete guide for implementing instructor/trainer API system with dashboard management, attendance tracking, and revenue analytics.

**Base URL:** `/api/v1/instructor/`
**Authentication:** JWT Bearer token required

## Quick Start

### 1. Authentication
```javascript
headers: {
  'Authorization': 'Bearer <jwt_token>',
  'Content-Type': 'application/json'
}
```

### 2. Response Format
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

---

## Dashboard APIs

### Get Dashboard Overview
```
GET /api/v1/instructor/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "activeBatches": 5,
      "totalStudents": 120,
      "pendingDemos": 8,
      "completedAssignments": 45,
      "pendingAssignments": 12
    },
    "upcomingClasses": [...],
    "recentSubmissions": [...],
    "monthlyStats": {...},
    "quickActions": [...]
  }
}
```

### Other Dashboard Endpoints
- `GET /instructor/profile` - Instructor profile & statistics
- `GET /instructor/batches` - Active batches list
- `GET /instructor/students` - Students list with filters
- `GET /instructor/demos/pending` - Pending demo bookings
- `GET /instructor/classes/upcoming` - Upcoming classes
- `GET /instructor/submissions/recent` - Recent submissions
- `GET /instructor/stats/monthly` - Monthly statistics

---

## Attendance Management APIs

### Mark Attendance
```
POST /api/v1/instructor/attendance/mark
```

**Request:**
```json
{
  "batch_id": "batch_object_id",
  "session_date": "2025-01-15",
  "session_time": "09:00",
  "session_duration": 120,
  "session_topic": "Introduction to Python",
  "attendance_records": [
    {
      "student_id": "student_object_id",
      "status": "present",
      "join_time": "09:05",
      "leave_time": "11:00",
      "notes": "Active participation"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attendance_id": "record_id",
    "session_info": {
      "batch_name": "Python Fundamentals",
      "present_count": 23,
      "absent_count": 2,
      "attendance_percentage": 92
    }
  }
}
```

### Other Attendance Endpoints
- `GET /attendance/batch/:batch_id` - Get batch attendance
- `PUT /attendance/:attendance_id` - Update attendance record
- `POST /attendance/bulk-mark` - Bulk mark attendance
- `GET /attendance/analytics` - Attendance analytics
- `GET /attendance/export` - Export attendance report

---

## Revenue Tracking APIs

### Get Revenue Overview
```
GET /api/v1/instructor/revenue?period=month&include_projections=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 45000,
      "monthlyRevenue": 8500,
      "demoRevenue": 2400,
      "batchRevenue": 42600,
      "pendingAmount": 3200,
      "averageRevenuePerStudent": 375
    },
    "breakdown": [...],
    "monthlyTrends": [...],
    "demoMetrics": {
      "conversionRate": 84.4,
      "averageRevenuePerDemo": 63.16
    },
    "batchMetrics": {...},
    "pendingPayments": [...]
  }
}
```

### Other Revenue Endpoints
- `GET /revenue/comparison` - Revenue vs platform average
- `GET /revenue/demos` - Demo revenue metrics
- `GET /revenue/batches` - Batch revenue metrics
- `GET /revenue/pending` - Pending payments
- `GET /revenue/trends` - Revenue trends
- `GET /revenue/projections` - Revenue projections
- `GET /revenue/platform-stats` - Platform statistics

---

## Frontend Integration Examples

### React Dashboard Component
```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const InstructorDashboard = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('jwt_token');
        const response = await axios.get('/api/v1/instructor/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setData(response.data.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchData();
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <div className="stats">
        <div>Active Batches: {data.overview.activeBatches}</div>
        <div>Total Students: {data.overview.totalStudents}</div>
      </div>
      
      <div className="upcoming-classes">
        {data.upcomingClasses.map((class_, index) => (
          <div key={index}>
            <h4>{class_.batchName}</h4>
            <p>{class_.courseTitle} - {class_.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Attendance Marking Component
```jsx
const AttendanceMarker = ({ batchId, students }) => {
  const [attendance, setAttendance] = useState({
    batch_id: batchId,
    session_date: new Date().toISOString().split('T')[0],
    session_topic: '',
    attendance_records: students.map(s => ({
      student_id: s._id,
      status: 'present'
    }))
  });

  const submitAttendance = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      await axios.post('/api/v1/instructor/attendance/mark', 
        attendance, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert('Attendance marked successfully!');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Session Topic"
        value={attendance.session_topic}
        onChange={(e) => setAttendance({
          ...attendance, 
          session_topic: e.target.value
        })}
      />
      
      {students.map((student, index) => (
        <div key={student._id}>
          <span>{student.full_name}</span>
          <select
            value={attendance.attendance_records[index].status}
            onChange={(e) => {
              const records = [...attendance.attendance_records];
              records[index].status = e.target.value;
              setAttendance({...attendance, attendance_records: records});
            }}
          >
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
          </select>
        </div>
      ))}
      
      <button onClick={submitAttendance}>Submit</button>
    </div>
  );
};
```

### Vue.js Dashboard
```vue
<template>
  <div class="dashboard">
    <div v-if="loading">Loading...</div>
    <div v-else>
      <div class="metrics">
        <div>Batches: {{ data.overview.activeBatches }}</div>
        <div>Students: {{ data.overview.totalStudents }}</div>
      </div>
      
      <div class="classes">
        <div v-for="class_ in data.upcomingClasses" :key="class_.id">
          {{ class_.batchName }} - {{ class_.time }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const data = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const token = localStorage.getItem('jwt_token')
    const response = await axios.get('/api/v1/instructor/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    data.value = response.data.data
  } catch (error) {
    console.error('Error:', error)
  } finally {
    loading.value = false
  }
})
</script>
```

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed information"
  }
}
```

### Common Status Codes
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `400` - Validation error
- `500` - Internal server error

### Error Handling Example
```javascript
const apiCall = async (url, options) => {
  try {
    const response = await axios(url, options);
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      localStorage.removeItem('jwt_token');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      alert('Permission denied');
    } else {
      alert('An error occurred');
    }
    throw error;
  }
};
```

---

## Testing

### Postman Collection Example
```javascript
// Test: Get Dashboard
pm.test("Dashboard returns success", function () {
    pm.response.to.have.status(200);
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data).to.have.property('overview');
});

// Test: Mark Attendance
pm.test("Attendance marked successfully", function () {
    pm.response.to.have.status(201);
    var json = pm.response.json();
    pm.expect(json.data).to.have.property('attendance_id');
});
```

### Unit Test Example (Jest)
```javascript
describe('Instructor APIs', () => {
  let authToken;

  beforeAll(async () => {
    // Get auth token
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'instructor@test.com', password: 'test123' });
    authToken = response.body.token;
  });

  test('GET /instructor/dashboard', async () => {
    const response = await request(app)
      .get('/api/v1/instructor/dashboard')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.overview).toBeDefined();
  });
});
```

---

## Deployment

### Environment Variables
```bash
NODE_ENV=production
JWT_SECRET=your_jwt_secret
MONGODB_URI=mongodb://localhost:27017/medh
REDIS_URL=redis://localhost:6379
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
```

### Production Checklist
- [ ] Set environment variables
- [ ] Configure database connections
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Configure rate limiting
- [ ] Test all endpoints

---

## API Summary

### Total Endpoints: 35+

**Dashboard (8 endpoints):**
- Dashboard overview, profile, batches, students, demos, classes, submissions, stats

**Attendance (12 endpoints):**
- Mark, get, update, bulk operations, analytics, export, reports

**Revenue (8 endpoints):**
- Overview, comparison, demos, batches, pending, trends, projections, platform stats

**Additional (7 endpoints):**
- Authentication, user management, notifications, settings

All APIs include:
- JWT authentication
- Input validation
- Error handling
- Pagination support
- Export functionality
- Real-time analytics

---

## Support

- **Documentation:** This guide + API docs
- **Issues:** GitHub repository
- **Updates:** Semantic versioning with backward compatibility

The system is production-ready with comprehensive security, performance optimization, and monitoring capabilities. 