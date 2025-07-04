# Complete Batch API Summary

## Overview
The Batch API provides comprehensive batch and student management functionality for the MEDH platform, allowing administrators and instructors to manage course batches and student enrollments effectively.

## Base URL
```
/api/v1/batches
```

## Authentication
All endpoints require Bearer token authentication with appropriate role-based permissions.

---

## Core Batch Management Endpoints

### 1. Get All Batches
- **GET** `/`
- **Access**: Admin, Instructor, Super-Admin
- **Features**: Pagination, search, status filtering
- **Purpose**: Retrieve all batches across all courses

### 2. Create Batch
- **POST** `/courses/:courseId/batches`
- **Access**: Admin only
- **Purpose**: Create a new batch for a specific course

### 3. Get Batches for Course
- **GET** `/courses/:courseId/batches`
- **Access**: Authenticated users
- **Purpose**: Get all batches for a specific course

### 4. Get Batch Details
- **GET** `/batches/:batchId`
- **Access**: Authenticated users
- **Purpose**: Get detailed information about a specific batch

### 5. Update Batch
- **PUT** `/batches/:batchId`
- **Access**: Admin only
- **Purpose**: Update batch information

### 6. Delete Batch
- **DELETE** `/batches/:batchId`
- **Access**: Admin only
- **Purpose**: Delete a batch (only if no enrolled students)

### 7. Assign Instructor to Batch
- **PUT** `/batches/:batchId/assign-instructor/:instructorId`
- **Access**: Admin only
- **Purpose**: Assign an instructor to a batch

---

## Student Management Endpoints

### 8. Get Students in Batch
- **GET** `/batches/:batchId/students`
- **Access**: Admin, Instructor, Super-Admin
- **Features**: Pagination, search, status filtering
- **Purpose**: View all students enrolled in a specific batch

### 9. Add Student to Batch
- **POST** `/batches/:batchId/students`
- **Access**: Admin, Super-Admin
- **Purpose**: Manually add a student to a batch
- **Features**: Payment plan selection, notes

### 10. Remove Student from Batch
- **DELETE** `/batches/:batchId/students/:studentId`
- **Access**: Admin, Super-Admin
- **Purpose**: Remove a student from a batch
- **Features**: Cancellation reason tracking

### 11. Transfer Student Between Batches
- **POST** `/batches/:batchId/students/:studentId/transfer`
- **Access**: Admin, Super-Admin
- **Purpose**: Transfer a student from one batch to another
- **Features**: Same-course validation, capacity checking

### 12. Update Student Status in Batch
- **PUT** `/batches/:batchId/students/:studentId/status`
- **Access**: Admin, Super-Admin
- **Purpose**: Update enrollment status (active, completed, on_hold, cancelled)
- **Features**: Status change reason tracking

---

## Key Features

### Pagination & Search
- All list endpoints support pagination
- Search functionality for student names and emails
- Configurable page size (default: 10-20 items)

### Status Management
- Batch statuses: Active, Upcoming, Completed, Cancelled
- Student enrollment statuses: active, completed, on_hold, cancelled
- Status change history and audit trail

### Capacity Management
- Automatic batch capacity checking
- Prevents over-enrollment
- Real-time enrolled student counts

### Transfer System
- Cross-batch student transfers
- Same-course validation
- Maintains enrollment history
- Automatic capacity adjustments

### Audit Trail
- All operations logged with user and timestamp
- Change reason tracking
- Complete enrollment history

### Data Population
- Course details populated automatically
- Instructor information included
- Student profiles with relevant details
- Progress and payment information

---

## Business Rules

### Batch Management
1. **Capacity Limits**: Cannot exceed defined batch capacity
2. **Instructor Assignment**: Each batch must have an assigned instructor
3. **Date Validation**: End date must be after start date
4. **Deletion Rules**: Can only delete batches with no enrolled students

### Student Management
1. **Course Consistency**: Transfers only allowed within same course
2. **Unique Enrollment**: Student cannot be enrolled in same batch multiple times
3. **Status Tracking**: All status changes are audited
4. **Capacity Respect**: All operations respect batch capacity limits

### Access Control
1. **Admin**: Full access to all operations
2. **Super-Admin**: Full access to all operations
3. **Instructor**: Read-only access to assigned batches
4. **Authentication**: All endpoints require valid bearer token

---

## Error Handling

### Common HTTP Status Codes
- **200**: Success
- **201**: Created successfully
- **400**: Bad request/validation error
- **401**: Authentication required
- **403**: Insufficient permissions
- **404**: Resource not found
- **409**: Conflict (e.g., duplicate enrollment)
- **500**: Internal server error

### Response Format
All responses follow a consistent format:
```json
{
  "success": boolean,
  "message": "descriptive message",
  "data": {}, // response data
  "errors": [] // validation errors (if any)
}
```

---

## Usage Examples

### Get All Batches with Filters
```bash
GET /api/v1/batches?page=1&limit=10&status=active&search=python
```

### View Students in a Batch
```bash
GET /api/v1/batches/64f8a1b2c3d4e5f6a7b8c9d0/students?status=active
```

### Add Student to Batch
```bash
POST /api/v1/batches/64f8a1b2c3d4e5f6a7b8c9d0/students
{
  "studentId": "64f8a1b2c3d4e5f6a7b8c9d1",
  "paymentPlan": "full_payment",
  "notes": "Direct enrollment"
}
```

### Transfer Student
```bash
POST /api/v1/batches/64f8a1b2c3d4e5f6a7b8c9d0/students/64f8a1b2c3d4e5f6a7b8c9d1/transfer
{
  "targetBatchId": "64f8a1b2c3d4e5f6a7b8c9d2",
  "reason": "Schedule conflict"
}
```

---

## Integration Points

### Frontend Integration
- React components for batch management
- Student enrollment workflows
- Transfer and status update interfaces
- Real-time capacity monitoring

### Other APIs
- Course API integration
- User/Student API integration
- Payment API integration
- Notification system integration

### Database Models
- Batch model with course relationship
- Enrollment model with student/batch relationship
- User model for student information
- Audit logging for all operations

---

## Performance Considerations

1. **Indexing**: MongoDB indexes on frequently queried fields
2. **Pagination**: Prevents large data transfers
3. **Lean Queries**: Optimized database queries
4. **Population**: Only necessary fields populated
5. **Caching**: Consider implementing Redis caching for frequently accessed data

---

## Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **Role-based Authorization**: Granular permission control
3. **Input Validation**: Comprehensive validation middleware
4. **SQL Injection Prevention**: Mongoose ODM protection
5. **Audit Logging**: Complete operation tracking

---

## Future Enhancements

### Potential Features
1. **Bulk Operations**: Bulk student transfers and status updates
2. **Waitlist Management**: Student waitlist for full batches
3. **Automated Notifications**: Email notifications for status changes
4. **Reporting**: Advanced analytics and reporting
5. **Integration**: Webhook support for external systems

### Scalability Considerations
1. **Database Sharding**: For large-scale deployments
2. **Microservices**: Potential service decomposition
3. **Event Sourcing**: For complex audit requirements
4. **Real-time Updates**: WebSocket integration for live updates 