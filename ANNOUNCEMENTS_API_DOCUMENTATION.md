# Announcements API Documentation

## Overview
The Announcements API provides comprehensive functionality for managing announcements in the MEDH platform. It supports creating, reading, updating, and deleting announcements with advanced features like user targeting, scheduling, analytics, and read tracking.

## Features
- ✅ **General Audience Targeting**: Target announcements to all users, students, instructors, admins, or corporate users
- ✅ **Specific Student Targeting**: Target announcements to individual students by their user ID
- ✅ **Scheduled Publishing**: Schedule announcements to be published at specific times
- ✅ **Expiry Dates**: Set expiration dates for time-sensitive announcements
- ✅ **Read Tracking**: Track which users have read announcements
- ✅ **Priority Levels**: Set priority levels (low, medium, high, urgent)
- ✅ **Sticky Announcements**: Pin important announcements to the top
- ✅ **Rich Content**: Support for action buttons, attachments, and metadata
- ✅ **Analytics**: Comprehensive analytics and reporting
- ✅ **Bulk Operations**: Bulk status updates and management

## Base URL
```
/api/v1/announcements
```

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Get Recent Announcements
**GET** `/recent`

Returns recent announcements visible to the current user, including those targeted specifically to them.

**Query Parameters:**
- `limit` (optional): Number of announcements to return (default: 10)
- `page` (optional): Page number for pagination (default: 1)
- `type` (optional): Filter by announcement type
- `priority` (optional): Filter by priority level
- `targetAudience` (optional): Filter by target audience
- `includeExpired` (optional): Include expired announcements (default: false)

**Response:**
```json
{
  "success": true,
  "message": "Recent announcements retrieved successfully",
  "data": {
    "announcements": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "title": "New AI Course Starting Soon",
        "content": "We're excited to announce our new AI fundamentals course starting next week.",
        "type": "course",
        "priority": "high",
        "status": "published",
        "targetAudience": ["all", "students"],
        "specificStudents": [
          {
            "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
            "full_name": "John Doe",
            "email": "john@example.com"
          }
        ],
        "author": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
          "full_name": "Admin User",
          "email": "admin@medh.co",
          "role": "admin"
        },
        "date": "2 days ago",
        "isSticky": false,
        "viewCount": 25,
        "readCount": 15,
        "actionButton": {
          "text": "Enroll Now",
          "url": "/courses/ai-fundamentals",
          "type": "internal"
        },
        "tags": ["course", "ai", "machine-learning"],
        "createdAt": "2023-09-06T10:30:00.000Z",
        "updatedAt": "2023-09-06T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCount": 25,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "status": 200
}
```

### 2. Get All Announcements (Admin)
**GET** `/`

**Access:** Admin/Super-Admin only

Returns all announcements with advanced filtering and search capabilities.

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by status (draft, published, archived, scheduled)
- `type`: Filter by type
- `priority`: Filter by priority
- `targetAudience`: Filter by target audience
- `search`: Search in title, content, and tags
- `sortBy`: Sort field (default: createdAt)
- `sortOrder`: Sort order (asc/desc, default: desc)

### 3. Create Announcement
**POST** `/`

**Access:** Admin/Super-Admin only

Creates a new announcement with support for specific student targeting.

**Request Body:**
```json
{
  "title": "Important System Maintenance",
  "content": "The system will be under maintenance on Sunday from 2 AM to 6 AM EST.",
  "type": "maintenance",
  "priority": "high",
  "status": "published",
  "targetAudience": ["all"],
  "specificStudents": [
    "64f8a1b2c3d4e5f6a7b8c9d1",
    "64f8a1b2c3d4e5f6a7b8c9d2"
  ],
  "isSticky": true,
  "expiryDate": "2023-09-15T06:00:00.000Z",
  "tags": ["maintenance", "system", "downtime"],
  "actionButton": {
    "text": "Learn More",
    "url": "https://support.medh.co/maintenance",
    "type": "link"
  },
  "metadata": {
    "sendNotification": true,
    "allowComments": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Announcement created successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "title": "Important System Maintenance",
    // ... full announcement object
  },
  "status": 201
}
```

### 4. Get Available Students for Targeting
**GET** `/students`

**Access:** Admin/Super-Admin only

Returns a list of available students that can be targeted for specific announcements.

**Query Parameters:**
- `search` (optional): Search students by name or email
- `limit` (optional): Number of students to return (default: 50, max: 100)
- `page` (optional): Page number for pagination (default: 1)

**Response:**
```json
{
  "success": true,
  "message": "Available students retrieved successfully",
  "data": {
    "students": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "full_name": "John Doe",
        "email": "john.doe@example.com",
        "createdAt": "2023-08-15T10:30:00.000Z"
      },
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
        "full_name": "Jane Smith",
        "email": "jane.smith@example.com",
        "createdAt": "2023-08-16T14:20:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 245,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "status": 200
}
```

### 5. Get Unread Count
**GET** `/unread-count`

**Access:** Authenticated users

Returns the count of unread announcements for the current user, including those specifically targeted to them.

**Response:**
```json
{
  "success": true,
  "message": "Unread announcement count retrieved successfully",
  "data": {
    "unreadCount": 3
  },
  "status": 200
}
```

## Targeting Logic

The announcement system supports multiple targeting strategies:

### 1. General Audience Targeting
Use the `targetAudience` field to target broad user groups:
- `"all"`: Visible to all users
- `"students"`: Visible to all students
- `"instructors"`: Visible to all instructors
- `"admins"`: Visible to all administrators
- `"corporate"`: Visible to corporate users

### 2. Specific Student Targeting
Use the `specificStudents` field to target individual students:
```json
{
  "specificStudents": [
    "64f8a1b2c3d4e5f6a7b8c9d1",
    "64f8a1b2c3d4e5f6a7b8c9d2"
  ]
}
```

### 3. Combined Targeting
You can combine both approaches:
```json
{
  "targetAudience": ["students"],
  "specificStudents": [
    "64f8a1b2c3d4e5f6a7b8c9d1"
  ]
}
```

This announcement will be visible to:
- All students (via `targetAudience`)
- The specific student with ID `64f8a1b2c3d4e5f6a7b8c9d1` (even if they're not a student)

## Usage Examples

### Creating a Course-Specific Announcement for Selected Students
```javascript
const announcement = {
  title: "Special Assignment for Advanced Students",
  content: "You have been selected for an advanced assignment. Please check your course materials.",
  type: "course",
  priority: "high",
  status: "published",
  targetAudience: [], // No general targeting
  specificStudents: [
    "64f8a1b2c3d4e5f6a7b8c9d1",
    "64f8a1b2c3d4e5f6a7b8c9d2",
    "64f8a1b2c3d4e5f6a7b8c9d3"
  ],
  courseId: "64f8a1b2c3d4e5f6a7b8c9d4",
  actionButton: {
    text: "View Assignment",
    url: "/courses/advanced-ai/assignments/special",
    type: "internal"
  }
};

fetch('/api/v1/announcements', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(announcement)
});
```

### Getting Students for Targeting
```javascript
// Search for students to target
fetch('/api/v1/announcements/students?search=john&limit=20', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
.then(response => response.json())
.then(data => {
  const students = data.data.students;
  // Use students for targeting in announcement creation
});
```

## React Component Example

```jsx
import React, { useState, useEffect } from 'react';

const AnnouncementCreator = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [announcement, setAnnouncement] = useState({
    title: '',
    content: '',
    type: 'general',
    targetAudience: ['all'],
    specificStudents: []
  });

  // Load available students
  useEffect(() => {
    fetch('/api/v1/announcements/students', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setStudents(data.data.students));
  }, []);

  const handleStudentSelect = (studentId) => {
    const updated = selectedStudents.includes(studentId)
      ? selectedStudents.filter(id => id !== studentId)
      : [...selectedStudents, studentId];
    
    setSelectedStudents(updated);
    setAnnouncement(prev => ({
      ...prev,
      specificStudents: updated
    }));
  };

  const createAnnouncement = async () => {
    const response = await fetch('/api/v1/announcements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(announcement)
    });
    
    if (response.ok) {
      alert('Announcement created successfully!');
    }
  };

  return (
    <div className="announcement-creator">
      <h2>Create Announcement</h2>
      
      <input
        type="text"
        placeholder="Title"
        value={announcement.title}
        onChange={(e) => setAnnouncement(prev => ({
          ...prev,
          title: e.target.value
        }))}
      />
      
      <textarea
        placeholder="Content"
        value={announcement.content}
        onChange={(e) => setAnnouncement(prev => ({
          ...prev,
          content: e.target.value
        }))}
      />
      
      <div className="targeting-section">
        <h3>Target Audience</h3>
        
        <div className="general-targeting">
          <label>
            <input
              type="checkbox"
              checked={announcement.targetAudience.includes('all')}
              onChange={(e) => {
                const targetAudience = e.target.checked 
                  ? [...announcement.targetAudience, 'all']
                  : announcement.targetAudience.filter(t => t !== 'all');
                setAnnouncement(prev => ({ ...prev, targetAudience }));
              }}
            />
            All Users
          </label>
          
          <label>
            <input
              type="checkbox"
              checked={announcement.targetAudience.includes('students')}
              onChange={(e) => {
                const targetAudience = e.target.checked 
                  ? [...announcement.targetAudience, 'students']
                  : announcement.targetAudience.filter(t => t !== 'students');
                setAnnouncement(prev => ({ ...prev, targetAudience }));
              }}
            />
            All Students
          </label>
        </div>
        
        <div className="specific-targeting">
          <h4>Specific Students</h4>
          <div className="student-list">
            {students.map(student => (
              <label key={student._id}>
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student._id)}
                  onChange={() => handleStudentSelect(student._id)}
                />
                {student.full_name} ({student.email})
              </label>
            ))}
          </div>
        </div>
      </div>
      
      <button onClick={createAnnouncement}>
        Create Announcement
      </button>
    </div>
  );
};

export default AnnouncementCreator;
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "data": {
    "error": "Detailed error message",
    "errors": [
      {
        "field": "specificStudents.0",
        "message": "Invalid student ID",
        "value": "invalid-id"
      }
    ]
  },
  "status": 400
}
```

## Testing

### Test Specific Student Targeting
```bash
# Create announcement for specific students
curl -X POST "http://localhost:8080/api/v1/announcements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Personal Message",
    "content": "This is a message specifically for you.",
    "type": "general",
    "targetAudience": [],
    "specificStudents": ["STUDENT_ID_1", "STUDENT_ID_2"]
  }'

# Get available students
curl -X GET "http://localhost:8080/api/v1/announcements/students?search=john&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get recent announcements (will include targeted ones)
curl -X GET "http://localhost:8080/api/v1/announcements/recent" \
  -H "Authorization: Bearer STUDENT_TOKEN"
```

## Notes

- **Validation**: Student IDs in `specificStudents` are validated to ensure they exist and have student role
- **Performance**: Indexes are created on `specificStudents` field for optimal query performance
- **Privacy**: Students can only see announcements targeted to them; they cannot see the full list of targeted students
- **Flexibility**: You can combine general audience targeting with specific student targeting
- **Scalability**: The system efficiently handles large numbers of specific student targets

This enhanced targeting system provides fine-grained control over announcement visibility while maintaining performance and user privacy.