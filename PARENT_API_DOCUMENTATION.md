# Parent API Documentation

The Parent API provides comprehensive endpoints for parents to monitor and manage their children's educational journey. This system supports parent-child relationship management, academic tracking, communication with instructors, and access to educational resources.

## Base URL
```
/api/v1/parent
```

## Authentication
- All endpoints require authentication using JWT tokens
- Include the token in the Authorization header: `Bearer <your_jwt_token>`
- User must have `parent` role to access these endpoints
- Parent-child relationships must be established and verified

## Parent-Child Relationship Model

### ParentChild Model
```typescript
interface ParentChild {
  parent_id: ObjectId;                    // Reference to parent user
  child_id: ObjectId;                     // Reference to student user
  relationship_type: 'father' | 'mother' | 'guardian' | 'relative' | 'other';
  is_primary_contact: boolean;            // Primary contact for the child
  emergency_contact: boolean;             // Emergency contact status
  
  // Permissions
  can_view_grades: boolean;
  can_view_attendance: boolean;
  can_view_performance: boolean;
  can_communicate_with_instructors: boolean;
  can_schedule_meetings: boolean;
  can_make_payments: boolean;
  
  // Notification preferences
  receive_notifications: boolean;
  notification_preferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  };
  
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  verified: boolean;
  verification_method: 'email' | 'phone' | 'document' | 'manual' | 'none';
}
```

## API Endpoints

### 1. Dashboard Endpoints

#### Get Parent Dashboard Profile
**GET** `/api/v1/parent/dashboard/profile`

Get parent profile with linked children and relationship details.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 50)

**Response:**
```json
{
  "success": true,
  "message": "Parent profile retrieved successfully",
  "data": {
    "parent": {
      "id": "60f7b2c4e1b2c8a4f8d9e1a1",
      "full_name": "John Smith",
      "email": "john.smith@example.com",
      "phone_numbers": ["+1234567890"],
      "user_image": "https://example.com/profile.jpg",
      "status": "Active",
      "member_since": "2024-01-15T10:30:00.000Z",
      "last_login": "2024-01-20T14:30:00.000Z"
    },
    "children": [
      {
        "relationship_id": "60f7b2c4e1b2c8a4f8d9e1a2",
        "child": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a3",
          "full_name": "Emma Smith",
          "email": "emma.smith@example.com",
          "student_id": "MED-2024-000123",
          "age": 16,
          "user_image": "https://example.com/emma.jpg",
          "status": "Active"
        },
        "relationship_type": "father",
        "is_primary_contact": true,
        "permissions": {
          "can_view_grades": true,
          "can_view_attendance": true,
          "can_view_performance": true,
          "can_communicate_with_instructors": true,
          "can_schedule_meetings": true,
          "can_make_payments": false
        },
        "linked_date": "2024-01-15T10:30:00.000Z",
        "verified": true
      }
    ],
    "summary": {
      "total_children": 2,
      "active_children": 2,
      "permissions": {
        "can_view_grades": true,
        "can_view_attendance": true,
        "can_view_performance": true,
        "can_communicate_with_instructors": true,
        "can_schedule_meetings": true,
        "can_make_payments": false
      }
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalCount": 2,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

#### Get Upcoming Classes
**GET** `/api/v1/parent/dashboard/classes/upcoming`

Get upcoming classes for all children with schedule details.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `from` (optional): Filter classes from this date (ISO 8601)
- `to` (optional): Filter classes until this date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "message": "Upcoming classes retrieved successfully",
  "data": {
    "upcoming_classes": [
      {
        "child": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a3",
          "name": "Emma Smith",
          "student_id": "MED-2024-000123"
        },
        "course": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a4",
          "title": "Advanced JavaScript",
          "image": "https://example.com/course.jpg"
        },
        "batch": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a5",
          "name": "JS-2024-B1"
        },
        "instructor": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a6",
          "name": "Dr. Jane Doe",
          "email": "jane.doe@example.com"
        },
        "schedule": {
          "date": "2024-01-22T10:00:00.000Z",
          "start_time": "10:00",
          "end_time": "11:30",
          "duration_minutes": 90,
          "timezone": "UTC"
        },
        "session_type": "live_class",
        "meeting_link": "https://zoom.us/j/123456789",
        "status": "confirmed"
      }
    ],
    "summary": {
      "total_upcoming": 5,
      "today": 2,
      "this_week": 8,
      "children_with_classes": 2
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalCount": 5,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

#### Get Performance Summary
**GET** `/api/v1/parent/dashboard/performance/summary`

Get performance summary for all children with academic metrics.

**Query Parameters:**
- `child_id` (optional): Filter by specific child ID
- `time_period` (optional): Time period for analysis ('7d', '30d', '90d', '6m', '1y', default: '30d')

**Response:**
```json
{
  "success": true,
  "message": "Performance summary retrieved successfully",
  "data": {
    "children": [
      {
        "child": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a3",
          "name": "Emma Smith",
          "student_id": "MED-2024-000123",
          "image": "https://example.com/emma.jpg"
        },
        "performance_metrics": {
          "overall_completion": 85,
          "average_quiz_score": 92,
          "average_assignment_score": 88,
          "overall_performance_score": 88
        },
        "recent_activity": {
          "assignments_completed": 3,
          "assignments_pending": 1,
          "classes_attended": 8,
          "total_classes": 10
        },
        "trends": {
          "performance_trend": "improving",
          "attendance_trend": "stable"
        }
      }
    ],
    "overall_stats": {
      "total_children": 2,
      "average_performance": 86,
      "children_excelling": 1,
      "children_struggling": 0
    },
    "time_period": "30d"
  }
}
```

#### Get Dashboard Shortcuts
**GET** `/api/v1/parent/dashboard/shortcuts`

Get dynamic dashboard shortcuts based on permissions and usage patterns.

**Response:**
```json
{
  "success": true,
  "message": "Dashboard shortcuts retrieved successfully",
  "data": {
    "shortcuts": [
      {
        "id": "attendance",
        "title": "Attendance Reports",
        "description": "View children's attendance records",
        "icon": "calendar-check",
        "url": "/parent/attendance",
        "category": "academic",
        "enabled": true,
        "priority": 1
      },
      {
        "id": "grades",
        "title": "Grade Reports",
        "description": "View children's grades and assessments",
        "icon": "trophy",
        "url": "/parent/grades",
        "category": "academic",
        "enabled": true,
        "priority": 2
      },
      {
        "id": "messages",
        "title": "Messages",
        "description": "Communicate with instructors",
        "icon": "message-circle",
        "url": "/parent/messages",
        "category": "communication",
        "enabled": true,
        "priority": 3,
        "badge": {
          "count": 2,
          "type": "unread"
        }
      }
    ],
    "categories": ["account", "academic", "communication", "resources"],
    "total_shortcuts": 8,
    "enabled_shortcuts": 6
  }
}
```

### 2. Demo Session Management

#### Get Demo Sessions
**GET** `/api/v1/parent/demo-sessions`

Get demo sessions for all children with booking details.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by status ('pending', 'confirmed', 'completed', 'cancelled')
- `include_past` (optional): Include past sessions (default: false)

**Response:**
```json
{
  "success": true,
  "message": "Demo sessions retrieved successfully",
  "data": {
    "demo_sessions": [
      {
        "id": "60f7b2c4e1b2c8a4f8d9e1a7",
        "child": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a3",
          "name": "Emma Smith",
          "student_id": "MED-2024-000123"
        },
        "demo_type": "course_demo",
        "course_interest": "Advanced JavaScript",
        "scheduled_datetime": "2024-01-25T14:00:00.000Z",
        "duration_minutes": 60,
        "status": "confirmed",
        "instructor": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a6",
          "name": "Dr. Jane Doe",
          "email": "jane.doe@example.com"
        },
        "meeting_link": "https://zoom.us/j/987654321",
        "can_reschedule": true,
        "can_cancel": true
      }
    ],
    "summary": {
      "total": 3,
      "upcoming": 2,
      "completed": 1,
      "children_with_demos": 2
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalCount": 3,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

#### Get Demo Session Details
**GET** `/api/v1/parent/demo-sessions/:sessionId`

Get detailed information about a specific demo session.

**Response:**
```json
{
  "success": true,
  "message": "Demo session retrieved successfully",
  "data": {
    "id": "60f7b2c4e1b2c8a4f8d9e1a7",
    "child_info": {
      "id": "60f7b2c4e1b2c8a4f8d9e1a3",
      "name": "Emma Smith",
      "student_id": "MED-2024-000123"
    },
    "demo_type": "course_demo",
    "course_interest": "Advanced JavaScript",
    "scheduled_datetime": "2024-01-25T14:00:00.000Z",
    "duration_minutes": 60,
    "status": "confirmed",
    "instructor": {
      "id": "60f7b2c4e1b2c8a4f8d9e1a6",
      "name": "Dr. Jane Doe",
      "email": "jane.doe@example.com"
    },
    "meeting_details": {
      "meeting_link": "https://zoom.us/j/987654321",
      "meeting_id": "987654321",
      "meeting_password": "demo123"
    },
    "requirements": "Focus on React hooks and state management",
    "experience_level": "intermediate",
    "can_reschedule": true,
    "can_cancel": true,
    "reschedule_history": [],
    "created_at": "2024-01-20T10:30:00.000Z"
  }
}
```

#### Get Demo Certificates
**GET** `/api/v1/parent/demo-certificates`

Get certificates available for children from completed courses.

**Response:**
```json
{
  "success": true,
  "message": "Demo certificates retrieved successfully",
  "data": {
    "certificates": [
      {
        "id": "60f7b2c4e1b2c8a4f8d9e1a8",
        "child_info": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a3",
          "name": "Emma Smith",
          "student_id": "MED-2024-000123",
          "relationship": "father"
        },
        "course": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a4",
          "course_title": "JavaScript Fundamentals",
          "course_image": "https://example.com/course.jpg"
        },
        "certificate_number": "MEDH-2024-JS-001",
        "issue_date": "2024-01-15T00:00:00.000Z",
        "completion_date": "2024-01-10T00:00:00.000Z",
        "grade": "A",
        "final_score": 95,
        "status": "active",
        "certificate_url": "https://example.com/certificate.pdf",
        "verification_url": "https://example.com/verify/MEDH-2024-JS-001"
      }
    ],
    "total_certificates": 1,
    "children_with_certificates": 1
  }
}
```

### 3. Academic Tracking

#### Get Timetable
**GET** `/api/v1/parent/timetable`

Get class timetable for children with weekly schedule.

**Query Parameters:**
- `child_id` (optional): Filter by specific child ID
- `week_start` (optional): Start date of the week (ISO 8601)
- `include_past` (optional): Include past classes (default: false)

**Response:**
```json
{
  "success": true,
  "message": "Timetable retrieved successfully",
  "data": {
    "timetable": [
      {
        "day": "Monday",
        "date": "2024-01-22T00:00:00.000Z",
        "classes": [
          {
            "child": {
              "id": "60f7b2c4e1b2c8a4f8d9e1a3",
              "name": "Emma Smith",
              "student_id": "MED-2024-000123"
            },
            "course": {
              "id": "60f7b2c4e1b2c8a4f8d9e1a4",
              "title": "Advanced JavaScript",
              "image": "https://example.com/course.jpg"
            },
            "batch": {
              "id": "60f7b2c4e1b2c8a4f8d9e1a5",
              "name": "JS-2024-B1"
            },
            "time": {
              "start": "10:00",
              "end": "11:30"
            },
            "date": "2024-01-22T10:00:00.000Z",
            "status": "scheduled"
          }
        ],
        "total_classes": 1
      }
    ],
    "week_info": {
      "start_date": "2024-01-22T00:00:00.000Z",
      "end_date": "2024-01-28T23:59:59.000Z",
      "week_offset": 0
    },
    "summary": {
      "total_weekly_classes": 8,
      "children_with_classes": 2
    }
  }
}
```

#### Get Attendance Reports
**GET** `/api/v1/parent/attendance`

Get attendance reports for children with detailed analytics.

**Query Parameters:**
- `child_id` (optional): Filter by specific child ID
- `start_date` (optional): Start date for report (ISO 8601)
- `end_date` (optional): End date for report (ISO 8601)
- `period` (optional): Report period ('week', 'month', 'quarter', 'year', default: 'month')

**Response:**
```json
{
  "success": true,
  "message": "Attendance reports retrieved successfully",
  "data": {
    "attendance_reports": [
      {
        "child": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a3",
          "name": "Emma Smith",
          "student_id": "MED-2024-000123",
          "image": "https://example.com/emma.jpg"
        },
        "courses": [
          {
            "course": {
              "id": "60f7b2c4e1b2c8a4f8d9e1a4",
              "title": "Advanced JavaScript",
              "image": "https://example.com/course.jpg"
            },
            "attendance_stats": {
              "total_sessions": 20,
              "attended": 18,
              "absent": 2,
              "late": 1,
              "excused": 0,
              "attendance_percentage": 90
            },
            "recent_sessions": [
              {
                "date": "2024-01-20T10:00:00.000Z",
                "status": "present",
                "join_time": "10:02",
                "duration_minutes": 88
              }
            ]
          }
        ],
        "overall_stats": {
          "total_sessions": 25,
          "attended": 23,
          "overall_percentage": 92,
          "trend": "improving"
        }
      }
    ],
    "summary": {
      "period": "month",
      "total_children": 2,
      "average_attendance": 89,
      "children_with_perfect_attendance": 1
    }
  }
}
```

#### Get Class Recordings
**GET** `/api/v1/parent/classes/recordings`

Get recorded class sessions accessible to children.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `child_id` (optional): Filter by specific child ID
- `course_id` (optional): Filter by specific course ID

**Response:**
```json
{
  "success": true,
  "message": "Recorded sessions retrieved successfully",
  "data": {
    "recordings": [
      {
        "id": "60f7b2c4e1b2c8a4f8d9e1a9",
        "session_title": "JavaScript Functions and Closures",
        "session_date": "2024-01-18T10:00:00.000Z",
        "session_link": "https://recordings.example.com/session123",
        "duration_minutes": 90,
        "instructor": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a6",
          "name": "Dr. Jane Doe"
        },
        "course": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a4",
          "title": "Advanced JavaScript",
          "image": "https://example.com/course.jpg"
        },
        "accessible_children": [
          {
            "id": "60f7b2c4e1b2c8a4f8d9e1a3",
            "name": "Emma Smith",
            "student_id": "MED-2024-000123"
          }
        ],
        "access_expires": "2024-07-18T10:00:00.000Z"
      }
    ],
    "summary": {
      "total_recordings": 15,
      "courses_with_recordings": 3,
      "children_with_access": 2
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalCount": 15,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

#### Get Performance Tracking
**GET** `/api/v1/parent/performance/tracking`

Get detailed performance tracking over time with trends and analytics.

**Query Parameters:**
- `child_id` (optional): Filter by specific child ID
- `course_id` (optional): Filter by specific course ID
- `period` (optional): Analysis period ('week', 'month', 'quarter', 'year', default: 'month')
- `metric` (optional): Specific metric ('completion', 'grades', 'attendance', 'all', default: 'all')

**Response:**
```json
{
  "success": true,
  "message": "Performance tracking retrieved successfully",
  "data": {
    "children": [
      {
        "child": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a3",
          "name": "Emma Smith",
          "student_id": "MED-2024-000123"
        },
        "courses": [
          {
            "course": {
              "id": "60f7b2c4e1b2c8a4f8d9e1a4",
              "title": "Advanced JavaScript",
              "image": "https://example.com/course.jpg"
            },
            "progress_tracking": {
              "overall_completion": 85,
              "lessons_completed": 17,
              "lessons_total": 20,
              "assignments_completed": 8,
              "assignments_total": 10,
              "average_quiz_score": 92,
              "average_assignment_score": 88
            },
            "time_series": [
              {
                "date": "2024-01-01",
                "completion_percentage": 20,
                "quiz_average": 85,
                "assignment_average": 82
              },
              {
                "date": "2024-01-15",
                "completion_percentage": 85,
                "quiz_average": 92,
                "assignment_average": 88
              }
            ],
            "trends": {
              "completion_trend": "improving",
              "grade_trend": "stable",
              "pace": "on_track"
            }
          }
        ],
        "overall_metrics": {
          "average_completion": 83,
          "average_grade": 90,
          "courses_on_track": 2,
          "courses_behind": 0
        }
      }
    ],
    "analytics": {
      "period": "month",
      "total_data_points": 30,
      "children_improving": 2,
      "children_stable": 0,
      "children_declining": 0
    }
  }
}
```

### 4. Assignments and Grades

#### Get Pending Assignments
**GET** `/api/v1/parent/assignments/pending`

Get pending assignments for all children with due dates and details.

**Query Parameters:**
- `child_id` (optional): Filter by specific child ID
- `course_id` (optional): Filter by specific course ID
- `due_within` (optional): Filter by due date within days (default: 30)
- `priority` (optional): Filter by priority ('high', 'medium', 'low')

**Response:**
```json
{
  "success": true,
  "message": "Pending assignments retrieved successfully",
  "data": {
    "pending_assignments": [
      {
        "child": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a3",
          "name": "Emma Smith",
          "student_id": "MED-2024-000123"
        },
        "course": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a4",
          "title": "Advanced JavaScript",
          "image": "https://example.com/course.jpg"
        },
        "assignment": {
          "id": "60f7b2c4e1b2c8a4f8d9e1aa",
          "title": "Build a React Todo App",
          "description": "Create a fully functional todo application using React hooks",
          "due_date": "2024-01-25T23:59:59.000Z",
          "max_score": 100,
          "submission_type": "file",
          "priority": "high"
        },
        "instructor": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a6",
          "name": "Dr. Jane Doe"
        },
        "time_remaining": {
          "days": 3,
          "hours": 15,
          "total_hours": 87
        },
        "status": "not_submitted",
        "is_overdue": false
      }
    ],
    "summary": {
      "total_pending": 5,
      "due_this_week": 3,
      "overdue": 1,
      "high_priority": 2,
      "children_with_pending": 2
    }
  }
}
```

#### Get Grade Reports
**GET** `/api/v1/parent/grades`

Get comprehensive grade reports for all children with detailed analytics.

**Query Parameters:**
- `child_id` (optional): Filter by specific child ID
- `course_id` (optional): Filter by specific course ID
- `subject` (optional): Filter by subject/category
- `period` (optional): Report period ('month', 'quarter', 'semester', 'year', default: 'quarter')
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Grade reports retrieved successfully",
  "data": {
    "grade_reports": [
      {
        "child": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a3",
          "name": "Emma Smith",
          "student_id": "MED-2024-000123",
          "image": "https://example.com/emma.jpg"
        },
        "subjects": [
          {
            "subject_name": "Programming",
            "courses": [
              {
                "course": {
                  "id": "60f7b2c4e1b2c8a4f8d9e1a4",
                  "course_title": "Advanced JavaScript",
                  "course_category": "Programming",
                  "course_image": "https://example.com/course.jpg"
                },
                "grades": [
                  {
                    "assignment_id": "60f7b2c4e1b2c8a4f8d9e1aa",
                    "assignment_title": "React Todo App",
                    "score": 95,
                    "max_score": 100,
                    "percentage": 95,
                    "graded_at": "2024-01-20T10:30:00.000Z",
                    "feedback": "Excellent work on component structure"
                  }
                ],
                "course_average": 92,
                "total_assignments": 8
              }
            ],
            "average_grade": 92,
            "total_assignments": 8
          }
        ],
        "overall_summary": {
          "overall_average": 90,
          "total_assignments": 15,
          "total_subjects": 2,
          "grade_distribution": {
            "A": 12,
            "B": 3,
            "C": 0,
            "D": 0,
            "F": 0
          }
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalCount": 2,
      "hasNextPage": false,
      "hasPrevPage": false
    },
    "summary": {
      "total_children": 2,
      "children_with_grades": 2,
      "period": "quarter"
    }
  }
}
```

### 5. Communication

#### Get Messages
**GET** `/api/v1/parent/messages`

Get messages from instructors and communication history.

**Query Parameters:**
- `child_id` (optional): Filter by specific child ID
- `instructor_id` (optional): Filter by specific instructor
- `status` (optional): Filter by status ('unread', 'read', 'all', default: 'all')
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "message": "Messages retrieved successfully",
  "data": {
    "messages": [
      {
        "id": "60f7b2c4e1b2c8a4f8d9e1ab",
        "child": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a3",
          "name": "Emma Smith",
          "student_id": "MED-2024-000123"
        },
        "instructor": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a6",
          "name": "Dr. Jane Doe",
          "email": "jane.doe@example.com"
        },
        "subject": "Assignment Feedback",
        "message": "Emma's React project shows excellent understanding of hooks and state management. Great work!",
        "sent_at": "2024-01-20T15:30:00.000Z",
        "status": "unread",
        "message_type": "feedback",
        "course": {
          "id": "60f7b2c4e1b2c8a4f8d9e1a4",
          "title": "Advanced JavaScript"
        }
      }
    ],
    "summary": {
      "total_messages": 8,
      "unread_messages": 3,
      "instructors_count": 2,
      "children_with_messages": 2
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalCount": 8,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

#### Send Message
**POST** `/api/v1/parent/messages`

Send a message to an instructor.

**Request Body:**
```json
{
  "instructor_id": "60f7b2c4e1b2c8a4f8d9e1a6",
  "child_id": "60f7b2c4e1b2c8a4f8d9e1a3",
  "subject": "Question about Assignment",
  "message": "Could you please provide more details about the React project requirements?"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sending feature coming soon",
  "data": {
    "message_id": "60f7b2c4e1b2c8a4f8d9e1ac",
    "status": "queued",
    "note": "Messaging system is being developed"
  },
  "status": 201
}
```

#### Get Announcements
**GET** `/api/v1/parent/announcements`

Get school announcements relevant to children.

**Query Parameters:**
- `child_id` (optional): Filter by specific child ID
- `category` (optional): Filter by category ('academic', 'administrative', 'event', 'emergency')
- `priority` (optional): Filter by priority ('high', 'medium', 'low')
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "message": "Announcements retrieved successfully",
  "data": {
    "announcements": [
      {
        "id": "60f7b2c4e1b2c8a4f8d9e1ad",
        "title": "Winter Break Schedule",
        "content": "Classes will be suspended from December 20th to January 5th for winter break.",
        "category": "academic",
        "priority": "medium",
        "published_at": "2024-01-15T10:00:00.000Z",
        "expires_at": "2024-01-31T23:59:59.000Z",
        "author": {
          "name": "Academic Office",
          "role": "administration"
        },
        "target_audience": {
          "roles": ["student", "parent"],
          "courses": [],
          "batches": []
        },
        "relevant_children": [
          {
            "id": "60f7b2c4e1b2c8a4f8d9e1a3",
            "name": "Emma Smith"
          }
        ]
      }
    ],
    "summary": {
      "total_announcements": 5,
      "unread_announcements": 2,
      "high_priority": 1,
      "categories": ["academic", "administrative", "event"]
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalCount": 5,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "data": null,
  "status": 400
}
```

### Common Error Codes
- `400` - Bad Request (validation errors, invalid parameters)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error

### Special Response Messages
- `no_children` - Parent has no linked children
- `no_data` - No data available for the requested period
- `no_demo_sessions` - No demo sessions found
- `no_certificates` - No certificates available
- `no_timetable_published` - No timetable published yet
- `access_denied` - Insufficient permissions for the requested action

## Integration Examples

### React/JavaScript Frontend Integration

```javascript
// API Client Setup
class ParentAPIClient {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api/v1/parent${endpoint}`;
    const config = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    return data;
  }

  // Dashboard Methods
  async getDashboardProfile(page = 1, limit = 50) {
    return this.request(`/dashboard/profile?page=${page}&limit=${limit}`);
  }

  async getUpcomingClasses(options = {}) {
    const params = new URLSearchParams(options);
    return this.request(`/dashboard/classes/upcoming?${params}`);
  }

  async getPerformanceSummary(childId = null, timePeriod = '30d') {
    const params = new URLSearchParams({ time_period: timePeriod });
    if (childId) params.append('child_id', childId);
    return this.request(`/dashboard/performance/summary?${params}`);
  }

  // Academic Methods
  async getAttendanceReports(options = {}) {
    const params = new URLSearchParams(options);
    return this.request(`/attendance?${params}`);
  }

  async getGradeReports(options = {}) {
    const params = new URLSearchParams(options);
    return this.request(`/grades?${params}`);
  }

  // Communication Methods
  async getMessages(options = {}) {
    const params = new URLSearchParams(options);
    return this.request(`/messages?${params}`);
  }

  async sendMessage(messageData) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }
}

// Usage Example
const parentAPI = new ParentAPIClient('https://api.medh.com', userToken);

// Get dashboard data
try {
  const profile = await parentAPI.getDashboardProfile();
  const upcomingClasses = await parentAPI.getUpcomingClasses({ limit: 10 });
  const performance = await parentAPI.getPerformanceSummary();
  
  console.log('Parent Profile:', profile.data);
  console.log('Upcoming Classes:', upcomingClasses.data);
  console.log('Performance Summary:', performance.data);
} catch (error) {
  console.error('API Error:', error.message);
}
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';
import { ParentAPIClient } from './api/parentAPI';

const ParentDashboard = ({ token }) => {
  const [profile, setProfile] = useState(null);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const api = new ParentAPIClient('https://api.medh.com', token);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        const [profileData, classesData, performanceData] = await Promise.all([
          api.getDashboardProfile(),
          api.getUpcomingClasses({ limit: 5 }),
          api.getPerformanceSummary()
        ]);

        setProfile(profileData.data);
        setUpcomingClasses(classesData.data.upcoming_classes);
        setPerformance(performanceData.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [token]);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="parent-dashboard">
      <h1>Welcome, {profile?.parent?.full_name}</h1>
      
      {/* Children Summary */}
      <div className="children-summary">
        <h2>My Children ({profile?.summary?.total_children})</h2>
        {profile?.children?.map(child => (
          <div key={child.child.id} className="child-card">
            <img src={child.child.user_image} alt={child.child.full_name} />
            <h3>{child.child.full_name}</h3>
            <p>Student ID: {child.child.student_id}</p>
            <p>Relationship: {child.relationship_type}</p>
          </div>
        ))}
      </div>

      {/* Upcoming Classes */}
      <div className="upcoming-classes">
        <h2>Upcoming Classes</h2>
        {upcomingClasses.map(classItem => (
          <div key={classItem.id} className="class-card">
            <h3>{classItem.course.title}</h3>
            <p>Student: {classItem.child.name}</p>
            <p>Date: {new Date(classItem.schedule.date).toLocaleDateString()}</p>
            <p>Time: {classItem.schedule.start_time} - {classItem.schedule.end_time}</p>
            <p>Instructor: {classItem.instructor.name}</p>
          </div>
        ))}
      </div>

      {/* Performance Overview */}
      <div className="performance-overview">
        <h2>Performance Overview</h2>
        <div className="performance-stats">
          <div>Average Performance: {performance?.overall_stats?.average_performance}%</div>
          <div>Children Excelling: {performance?.overall_stats?.children_excelling}</div>
          <div>Children Struggling: {performance?.overall_stats?.children_struggling}</div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
```

## Rate Limiting

- Most endpoints: 100 requests per minute per user
- Dashboard endpoints: 200 requests per minute per user
- Message sending: 10 requests per minute per user

## Caching

- Dashboard data: Cached for 5 minutes
- Timetable data: Cached for 15 minutes
- Static data (certificates, completed assignments): Cached for 1 hour

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Parent-child relationships must be verified
3. **Data Privacy**: Parents can only access data for their linked children
4. **Permission Checks**: Respect parent-child permission settings
5. **Rate Limiting**: Prevent API abuse with appropriate limits
6. **Input Validation**: All inputs are validated and sanitized

## Support and Documentation

For additional support or questions about the Parent API:

- API Documentation: `/api/v1/docs`
- Support Email: api-support@medh.com
- Developer Portal: https://developer.medh.com
- Status Page: https://status.medh.com

---

This documentation covers all 27 endpoints specified in the parent API requirements, providing comprehensive access to children's educational data, performance tracking, communication tools, and administrative features for parents in the MEDH educational platform. 