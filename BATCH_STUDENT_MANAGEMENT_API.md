# Batch Student Management API Documentation

## Overview
This API provides comprehensive student management functionality for batches, allowing administrators to manage student enrollments, transfers, and status updates within the batch system.

## Base URL
```
/api/v1/batches
```

## Authentication & Authorization
- **Authentication**: Bearer token required for all endpoints
- **Authorization**: Role-based access control
  - **Admin/Super-Admin**: Full access to all operations
  - **Instructor**: Read-only access to view students in their assigned batches

---

## Endpoints

### 1. Get Students in a Batch

**GET** `/batches/:batchId/students`

Retrieve all students enrolled in a specific batch with pagination and filtering.

#### Parameters
- `batchId` (path): MongoDB ObjectId of the batch

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 20 | Number of students per page |
| `status` | string | "active" | Filter by enrollment status |
| `search` | string | - | Search by student name or email |

#### Response
```json
{
  "success": true,
  "batch": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Web Development Batch 1",
    "course": "Full Stack Web Development",
    "capacity": 30,
    "enrolled": 25
  },
  "students": {
    "count": 10,
    "totalStudents": 25,
    "totalPages": 3,
    "currentPage": 1,
    "hasNextPage": true,
    "hasPrevPage": false,
    "data": [
      {
        "enrollmentId": "64f8a1b2c3d4e5f6a7b8c9d1",
        "student": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
          "full_name": "John Doe",
          "email": "john.doe@example.com",
          "user_image": "profile.jpg",
          "status": "Active"
        },
        "enrollmentDate": "2024-01-15T10:30:00.000Z",
        "status": "active",
        "progress": 65,
        "totalPaid": 25000,
        "paymentPlan": "full_payment",
        "accessExpiryDate": "2024-07-15T00:00:00.000Z"
      }
    ]
  }
}
```

---

### 2. Add Student to Batch

**POST** `/batches/:batchId/students`

Add a new student to an existing batch.

#### Parameters
- `batchId` (path): MongoDB ObjectId of the batch

#### Request Body
```json
{
  "studentId": "64f8a1b2c3d4e5f6a7b8c9d3",
  "paymentPlan": "full_payment",
  "notes": "Direct enrollment by admin"
}
```

#### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `studentId` | string | Yes | MongoDB ObjectId of the student |
| `paymentPlan` | string | No | Payment plan ("full_payment" or "installments") |
| `notes` | string | No | Additional notes (max 500 chars) |

#### Response
```json
{
  "success": true,
  "message": "Student added to batch successfully",
  "data": {
    "enrollmentId": "64f8a1b2c3d4e5f6a7b8c9d4",
    "student": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
      "full_name": "Jane Smith",
      "email": "jane.smith@example.com",
      "user_image": "jane.jpg"
    },
    "enrollmentDate": "2024-01-20T10:30:00.000Z",
    "status": "active",
    "batch": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Web Development Batch 1",
      "enrolled": 26,
      "capacity": 30
    }
  }
}
```

---

### 3. Remove Student from Batch

**DELETE** `/batches/:batchId/students/:studentId`

Remove a student from a batch by cancelling their enrollment.

#### Parameters
- `batchId` (path): MongoDB ObjectId of the batch
- `studentId` (path): MongoDB ObjectId of the student

#### Request Body (Optional)
```json
{
  "reason": "Student requested withdrawal"
}
```

#### Response
```json
{
  "success": true,
  "message": "Student removed from batch successfully",
  "data": {
    "student": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
      "full_name": "Jane Smith",
      "email": "jane.smith@example.com"
    },
    "cancellationReason": "Student requested withdrawal",
    "cancelledDate": "2024-01-25T10:30:00.000Z"
  }
}
```

---

### 4. Transfer Student Between Batches

**POST** `/batches/:batchId/students/:studentId/transfer`

Transfer a student from one batch to another within the same course.

#### Parameters
- `batchId` (path): MongoDB ObjectId of the source batch
- `studentId` (path): MongoDB ObjectId of the student

#### Request Body
```json
{
  "targetBatchId": "64f8a1b2c3d4e5f6a7b8c9d5",
  "reason": "Student schedule conflict"
}
```

#### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `targetBatchId` | string | Yes | MongoDB ObjectId of destination batch |
| `reason` | string | No | Reason for transfer (max 200 chars) |

#### Response
```json
{
  "success": true,
  "message": "Student transferred successfully",
  "data": {
    "student": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
      "full_name": "Jane Smith",
      "email": "jane.smith@example.com"
    },
    "transfer": {
      "from": {
        "batchId": "64f8a1b2c3d4e5f6a7b8c9d0",
        "batchName": "Web Development Batch 1"
      },
      "to": {
        "batchId": "64f8a1b2c3d4e5f6a7b8c9d5",
        "batchName": "Web Development Batch 2"
      },
      "transferDate": "2024-01-25T10:30:00.000Z",
      "reason": "Student schedule conflict"
    },
    "newEnrollmentId": "64f8a1b2c3d4e5f6a7b8c9d6"
  }
}
```

---

### 5. Update Student Status in Batch

**PUT** `/batches/:batchId/students/:studentId/status`

Update the enrollment status of a student in a specific batch.

#### Parameters
- `batchId` (path): MongoDB ObjectId of the batch
- `studentId` (path): MongoDB ObjectId of the student

#### Request Body
```json
{
  "status": "on_hold",
  "reason": "Payment pending"
}
```

#### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | Yes | New status ("active", "completed", "on_hold", "cancelled") |
| `reason` | string | No | Reason for status change (max 200 chars) |

#### Response
```json
{
  "success": true,
  "message": "Student status updated successfully",
  "data": {
    "student": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
      "full_name": "Jane Smith",
      "email": "jane.smith@example.com"
    },
    "oldStatus": "active",
    "newStatus": "on_hold",
    "reason": "Payment pending",
    "updatedAt": "2024-01-25T10:30:00.000Z"
  }
}
```

---

## Error Responses

### Common Error Codes

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "studentId",
      "message": "Valid student ID is required"
    }
  ]
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Batch not found"
}
```

#### 409 Conflict
```json
{
  "success": false,
  "message": "Student is already enrolled in this batch"
}
```

---

## Business Rules

### Batch Capacity
- Cannot add students to a batch that has reached maximum capacity
- Transfer operations respect target batch capacity limits

### Course Consistency
- Students can only be transferred between batches of the same course
- Cross-course transfers are not allowed

### Status Management
- Status changes affect batch enrollment counts
- Only active enrollments count toward batch capacity
- Status history is maintained for audit purposes

### Transfer Rules
- Source and target batches must be different
- Student must have active enrollment in source batch
- Student cannot already be enrolled in target batch
- Transfer creates new enrollment and marks old one as "transferred"

---

## Usage Examples

### JavaScript/Frontend Integration

```javascript
// Get students in a batch
const getBatchStudents = async (batchId, page = 1, status = 'active') => {
  try {
    const response = await axios.get(`/api/v1/batches/${batchId}/students`, {
      params: { page, status },
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching batch students:', error);
    throw error;
  }
};

// Add student to batch
const addStudentToBatch = async (batchId, studentData) => {
  try {
    const response = await axios.post(`/api/v1/batches/${batchId}/students`, studentData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error adding student to batch:', error);
    throw error;
  }
};

// Transfer student
const transferStudent = async (batchId, studentId, targetBatchId, reason) => {
  try {
    const response = await axios.post(
      `/api/v1/batches/${batchId}/students/${studentId}/transfer`,
      { targetBatchId, reason },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error transferring student:', error);
    throw error;
  }
};

// Update student status
const updateStudentStatus = async (batchId, studentId, status, reason) => {
  try {
    const response = await axios.put(
      `/api/v1/batches/${batchId}/students/${studentId}/status`,
      { status, reason },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating student status:', error);
    throw error;
  }
};
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

const BatchStudentManager = ({ batchId }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchStudents();
  }, [batchId]);

  const fetchStudents = async (page = 1) => {
    setLoading(true);
    try {
      const data = await getBatchStudents(batchId, page);
      setStudents(data.students.data);
      setPagination({
        currentPage: data.students.currentPage,
        totalPages: data.students.totalPages,
        hasNextPage: data.students.hasNextPage,
        hasPrevPage: data.students.hasPrevPage
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (studentData) => {
    try {
      await addStudentToBatch(batchId, studentData);
      fetchStudents(); // Refresh list
    } catch (error) {
      console.error('Error adding student:', error);
    }
  };

  const handleRemoveStudent = async (studentId, reason) => {
    try {
      await axios.delete(`/api/v1/batches/${batchId}/students/${studentId}`, {
        data: { reason },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchStudents(); // Refresh list
    } catch (error) {
      console.error('Error removing student:', error);
    }
  };

  return (
    <div className="batch-student-manager">
      {/* Your UI components here */}
    </div>
  );
};
```

---

## Security Considerations

1. **Role-based Access Control**: Strict enforcement of admin/instructor permissions
2. **Input Validation**: All inputs are validated and sanitized
3. **Audit Trail**: All operations are logged with user and timestamp information
4. **Data Integrity**: Maintains referential integrity across enrollments and batches
5. **Business Logic Enforcement**: Prevents invalid operations through comprehensive validation

---

## Performance Notes

1. **Pagination**: Always use pagination for large student lists
2. **Indexing**: Ensure MongoDB indexes on frequently queried fields
3. **Lean Queries**: Uses `.lean()` for read operations to improve performance
4. **Population**: Only populates necessary fields to minimize data transfer 