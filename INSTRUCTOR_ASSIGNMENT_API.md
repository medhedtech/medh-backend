# Instructor Assignment API Documentation

This document describes the API endpoints for assigning instructors to courses and students in the Medh Learning Platform.

## Overview

The instructor assignment system allows administrators to:
- Assign instructors to courses for teaching responsibilities
- Assign instructors to students for mentoring/tutoring
- Manage and track these assignments
- Retrieve assignment information

## Base URL
```
/api/v1/auth
```

## Authentication
Most endpoints require authentication using a Bearer token in the Authorization header:
```
Authorization: Bearer <your_token>
```

---

## Instructor-to-Course Assignment

### 1. Assign Instructor to Course
**POST** `/assign-instructor-to-course`

Assigns an instructor to a specific course.

**Request Body:**
```json
{
  "full_name": "John Doe",
  "email": "john.doe@example.com",
  "course_title": "Introduction to Programming",
  "user_id": "64a7b8c9d1e2f3g4h5i6j7k8"
}
```

**Response:**
```json
{
  "message": "Instructor assigned successfully to the course",
  "assignment": {
    "_id": "64a7b8c9d1e2f3g4h5i6j7k9",
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "course_title": "Introduction to Programming",
    "user_id": "64a7b8c9d1e2f3g4h5i6j7k8",
    "createdAt": "2023-07-07T10:30:00.000Z",
    "updatedAt": "2023-07-07T10:30:00.000Z"
  }
}
```

### 2. Get All Instructor Assignments
**GET** `/instructor-assignments`

Retrieves all instructor-to-course assignments.

**Response:**
```json
[
  {
    "_id": "64a7b8c9d1e2f3g4h5i6j7k9",
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "course_title": "Introduction to Programming",
    "user_id": {
      "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
      "full_name": "John Doe",
      "email": "john.doe@example.com"
    },
    "count": 1,
    "createdAt": "2023-07-07T10:30:00.000Z",
    "updatedAt": "2023-07-07T10:30:00.000Z"
  }
]
```

### 3. Get Instructor Assignment by ID
**GET** `/instructor-assignment/:id`

Retrieves a specific instructor assignment by ID.

**Parameters:**
- `id` - Assignment ID or User ID

**Response:**
```json
{
  "message": "Instructor assignment fetched successfully",
  "assignment": {
    "_id": "64a7b8c9d1e2f3g4h5i6j7k9",
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "course_title": "Introduction to Programming",
    "user_id": "64a7b8c9d1e2f3g4h5i6j7k8",
    "createdAt": "2023-07-07T10:30:00.000Z",
    "updatedAt": "2023-07-07T10:30:00.000Z"
  }
}
```

### 4. Update Instructor Assignment
**PUT** `/instructor-assignment/:id`

Updates an existing instructor assignment.

**Request Body:**
```json
{
  "full_name": "John Smith",
  "email": "john.smith@example.com",
  "course_title": "Advanced Programming"
}
```

### 5. Delete Instructor Assignment
**DELETE** `/instructor-assignment/:id`

Deletes an instructor assignment.

**Response:**
```json
{
  "message": "Assignment deleted successfully"
}
```

### 6. Get Courses Assigned to Instructor
**GET** `/instructor-courses/:id`

Retrieves all courses assigned to a specific instructor.

**Parameters:**
- `id` - Instructor ID

**Response:**
```json
{
  "message": "Courses fetched successfully",
  "courses": [
    {
      "_id": "64a7b8c9d1e2f3g4h5i6j7k0",
      "course_title": "Introduction to Programming",
      "assigned_instructor": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
        "full_name": "John Doe",
        "email": "john.doe@example.com"
      }
    }
  ]
}
```

---

## Instructor-to-Student Assignment

### 1. Assign Instructor to Student
**POST** `/assign-instructor-to-student`

Assigns an instructor to a student for mentoring or tutoring.

**Request Body:**
```json
{
  "instructor_id": "64a7b8c9d1e2f3g4h5i6j7k8",
  "student_id": "64a7b8c9d1e2f3g4h5i6j7k1",
  "assignment_type": "mentor",
  "notes": "Assigned for programming guidance"
}
```

**Fields:**
- `instructor_id` (required) - ID of the instructor
- `student_id` (required) - ID of the student
- `assignment_type` (optional) - Type of assignment: "mentor", "tutor", "advisor", "supervisor" (default: "mentor")
- `notes` (optional) - Additional notes about the assignment

**Response:**
```json
{
  "success": true,
  "message": "Instructor assigned to student successfully",
  "data": {
    "student_id": "64a7b8c9d1e2f3g4h5i6j7k1",
    "student_name": "Jane Smith",
    "instructor_id": "64a7b8c9d1e2f3g4h5i6j7k8",
    "instructor_name": "John Doe",
    "assignment_type": "mentor",
    "assignment_date": "2023-07-07T10:30:00.000Z",
    "notes": "Assigned for programming guidance"
  }
}
```

### 2. Get Students Assigned to Instructor
**GET** `/instructor-students/:instructor_id`

Retrieves all students assigned to a specific instructor.

**Parameters:**
- `instructor_id` - ID of the instructor

**Response:**
```json
{
  "success": true,
  "message": "Students assigned to instructor fetched successfully",
  "data": {
    "instructor": {
      "id": "64a7b8c9d1e2f3g4h5i6j7k8",
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    "assigned_students": [
      {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k1",
        "full_name": "Jane Smith",
        "email": "jane.smith@example.com",
        "role": ["student"],
        "instructor_assignment_date": "2023-07-07T10:30:00.000Z",
        "instructor_assignment_type": "mentor",
        "instructor_assignment_notes": "Assigned for programming guidance"
      }
    ],
    "total_students": 1
  }
}
```

### 3. Unassign Instructor from Student
**DELETE** `/unassign-instructor-from-student/:student_id`

Removes the instructor assignment from a student.

**Parameters:**
- `student_id` - ID of the student

**Response:**
```json
{
  "success": true,
  "message": "Instructor unassigned from student successfully",
  "data": {
    "student_id": "64a7b8c9d1e2f3g4h5i6j7k1",
    "student_name": "Jane Smith",
    "previous_instructor": {
      "id": "64a7b8c9d1e2f3g4h5i6j7k8",
      "name": "John Doe",
      "email": "john.doe@example.com"
    }
  }
}
```

---

## Error Responses

### Common Error Codes

**400 Bad Request**
```json
{
  "success": false,
  "message": "Instructor ID and Student ID are required"
}
```

**404 Not Found**
```json
{
  "success": false,
  "message": "Instructor not found or invalid role"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Error assigning instructor to student",
  "error": "Detailed error message"
}
```

---

## Database Schema Updates

### User Model Updates
The User model has been updated with the following fields for instructor-to-student assignments:

```javascript
{
  // ... existing fields ...
  
  // Instructor assignment fields for students
  assigned_instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  instructor_assignment_date: {
    type: Date
  },
  instructor_assignment_type: {
    type: String,
    enum: ["mentor", "tutor", "advisor", "supervisor"],
    default: "mentor"
  },
  instructor_assignment_notes: {
    type: String,
    trim: true
  }
}
```

---

## Usage Examples

### Example 1: Complete Instructor-Course Assignment Flow
```javascript
// 1. Create an instructor
const instructor = await fetch('/api/v1/auth/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    full_name: "Dr. Smith",
    email: "dr.smith@example.com",
    phone_number: "1234567890",
    password: "password123",
    domain: "Computer Science"
  })
});

// 2. Assign instructor to course
const assignment = await fetch('/api/v1/auth/assign-instructor-to-course', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    full_name: "Dr. Smith",
    email: "dr.smith@example.com",
    course_title: "Data Structures",
    user_id: instructor.instructor._id
  })
});
```

### Example 2: Student Mentoring Assignment
```javascript
// Assign instructor as mentor to student
const mentorAssignment = await fetch('/api/v1/auth/assign-instructor-to-student', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    instructor_id: "64a7b8c9d1e2f3g4h5i6j7k8",
    student_id: "64a7b8c9d1e2f3g4h5i6j7k1",
    assignment_type: "mentor",
    notes: "Focus on programming fundamentals and career guidance"
  })
});

// Get all students assigned to this instructor
const assignedStudents = await fetch('/api/v1/auth/instructor-students/64a7b8c9d1e2f3g4h5i6j7k8', {
  headers: { 'Authorization': 'Bearer ' + token }
});
```

---

## Testing

A test script is provided (`test-instructor-assignment.js`) to verify all functionality:

```bash
node test-instructor-assignment.js
```

The test script will:
1. Create test instructor and student
2. Test course assignment
3. Test student assignment
4. Test retrieval endpoints
5. Test unassignment functionality

---

## Enhanced API Responses

### Course APIs with Instructor Information

All course API endpoints now include instructor assignment information in their responses:

#### GET `/api/courses/get` - Get All Courses
**Enhanced Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "64a7b8c9d1e2f3g4h5i6j7k0",
      "course_title": "Introduction to Programming",
      "course_category": "Technology",
      "course_image": "https://example.com/image.jpg",
      "course_duration": "8 weeks",
      "status": "Published",
      "assigned_instructor": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
        "full_name": "Dr. John Smith",
        "email": "john.smith@example.com",
        "role": ["instructor"],
        "domain": "Computer Science"
      },
      "prices": [...],
      "createdAt": "2023-07-07T10:30:00.000Z"
    }
  ]
}
```

#### GET `/api/courses/:id` - Get Course by ID
**Enhanced Response:**
```json
{
  "success": true,
  "data": {
    "_id": "64a7b8c9d1e2f3g4h5i6j7k0",
    "course_title": "Introduction to Programming",
    "course_description": "Learn programming fundamentals...",
    "assigned_instructor": {
      "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
      "full_name": "Dr. John Smith",
      "email": "john.smith@example.com",
      "role": ["instructor"],
      "domain": "Computer Science",
      "phone_numbers": [
        {
          "country": "+1",
          "number": "1234567890"
        }
      ]
    },
    "curriculum": [...],
    "prices": [...]
  }
}
```

### Student APIs with Instructor Information

All student API endpoints now include instructor assignment information:

#### GET `/api/v1/auth/get-all-students` - Get All Students
**Enhanced Response:**
```json
{
  "success": true,
  "count": 5,
  "total": 50,
  "totalPages": 5,
  "currentPage": 1,
  "data": [
    {
      "_id": "64a7b8c9d1e2f3g4h5i6j7k1",
      "full_name": "Jane Doe",
      "email": "jane.doe@example.com",
      "role": ["student"],
      "status": "Active",
      "assigned_instructor": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
        "full_name": "Dr. John Smith",
        "email": "john.smith@example.com",
        "role": ["instructor"],
        "domain": "Computer Science"
      },
      "instructor_assignment_date": "2023-07-07T10:30:00.000Z",
      "instructor_assignment_type": "mentor",
      "instructor_assignment_notes": "Focus on programming fundamentals",
      "createdAt": "2023-07-01T10:30:00.000Z"
    }
  ]
}
```

### New Enhanced Endpoints

#### GET `/api/v1/auth/get-all-students-with-instructors`
**Description:** Get all students with detailed instructor assignment information and statistics.

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 10)
- `status` (string) - Filter by student status
- `search` (string) - Search by student name or email
- `assignment_type` (string) - Filter by assignment type: "mentor", "tutor", "advisor", "supervisor"
- `has_instructor` (boolean) - Filter students with/without assigned instructors
- `sortBy` (string) - Sort field (default: "createdAt")
- `sortOrder` (string) - Sort order: "asc" or "desc" (default: "desc")

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 100,
  "totalPages": 10,
  "currentPage": 1,
  "statistics": {
    "totalStudents": 100,
    "studentsWithInstructor": 75,
    "studentsWithoutInstructor": 25
  },
  "data": [
    {
      "_id": "64a7b8c9d1e2f3g4h5i6j7k1",
      "full_name": "Jane Doe",
      "email": "jane.doe@example.com",
      "role": ["student"],
      "status": "Active",
      "assigned_instructor": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
        "full_name": "Dr. John Smith",
        "email": "john.smith@example.com",
        "role": ["instructor"],
        "domain": "Computer Science",
        "phone_numbers": [...]
      },
      "instructor_assignment_date": "2023-07-07T10:30:00.000Z",
      "instructor_assignment_type": "mentor",
      "instructor_assignment_notes": "Focus on programming fundamentals"
    }
  ]
}
```

#### GET `/api/v1/auth/get-all-courses-with-instructors`
**Description:** Get all courses with detailed instructor assignment information and statistics.

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 10)
- `status` (string) - Filter by course status
- `search` (string) - Search by course title
- `category` (string) - Filter by course category
- `has_instructor` (boolean) - Filter courses with/without assigned instructors
- `sortBy` (string) - Sort field (default: "createdAt")
- `sortOrder` (string) - Sort order: "asc" or "desc" (default: "desc")

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "totalPages": 5,
  "currentPage": 1,
  "statistics": {
    "totalCourses": 50,
    "coursesWithInstructor": 35,
    "coursesWithoutInstructor": 15
  },
  "data": [
    {
      "_id": "64a7b8c9d1e2f3g4h5i6j7k0",
      "course_title": "Introduction to Programming",
      "course_category": "Technology",
      "course_image": "https://example.com/image.jpg",
      "status": "Published",
      "course_duration": "8 weeks",
      "assigned_instructor": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
        "full_name": "Dr. John Smith",
        "email": "john.smith@example.com",
        "role": ["instructor"],
        "domain": "Computer Science",
        "phone_numbers": [...]
      },
      "prices": [...],
      "createdAt": "2023-07-07T10:30:00.000Z"
    }
  ]
}
```

### Enrollment APIs with Instructor Information

#### GET `/api/enrolled/student/:student_id` - Get Student Enrollments
**Enhanced Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64a7b8c9d1e2f3g4h5i6j7k2",
      "student_id": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k1",
        "full_name": "Jane Doe",
        "email": "jane.doe@example.com",
        "role": ["student"],
        "assigned_instructor": {
          "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
          "full_name": "Dr. John Smith",
          "email": "john.smith@example.com",
          "role": ["instructor"],
          "domain": "Computer Science"
        },
        "instructor_assignment_date": "2023-07-07T10:30:00.000Z",
        "instructor_assignment_type": "mentor",
        "instructor_assignment_notes": "Focus on programming fundamentals"
      },
      "course_id": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k0",
        "course_title": "Introduction to Programming",
        "assigned_instructor": {
          "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
          "full_name": "Dr. John Smith",
          "email": "john.smith@example.com",
          "role": ["instructor"],
          "domain": "Computer Science"
        }
      },
      "enrollment_date": "2023-07-05T10:30:00.000Z",
      "status": "active",
      "progress": 45
    }
  ]
}
```

---

## Notes

1. **Authentication**: Most endpoints require admin-level authentication
2. **Validation**: The system validates that instructors have the "instructor" role
3. **Uniqueness**: A student can only be assigned to one instructor at a time
4. **Flexibility**: The assignment type allows for different mentoring relationships
5. **Tracking**: All assignments are timestamped for audit purposes
6. **Enhanced Responses**: All course and student APIs now include instructor assignment information
7. **Statistics**: New endpoints provide statistics about instructor assignments
8. **Filtering**: Enhanced filtering options for instructor assignments in list endpoints 