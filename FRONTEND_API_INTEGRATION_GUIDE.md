# Frontend API Integration Guide

## Table of Contents
1. [Authentication](#authentication)
2. [Course Types API (New)](#course-types-api-new)
3. [Legacy Course API](#legacy-course-api)
4. [Data Structures](#data-structures)
5. [Error Handling](#error-handling)
6. [Code Examples](#code-examples)
7. [Testing](#testing)

## Authentication

All course-related APIs require authentication using JWT tokens.

### Login Endpoint
```
POST /api/v1/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "full_name": "Admin User",
    "email": "admin@medh.co",
    "role": ["admin"],
    "expires_in": "24h"
  }
}
```

### Using Authorization Header
Include the access token in all subsequent requests:
```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

## Course Types API (New)

Base URL: `/api/v1/tcourse`

### Endpoints

#### 1. Create Course
```
POST /api/v1/tcourse
```
**Authorization:** Admin required
**Content-Type:** application/json

#### 2. Get Courses by Type
```
GET /api/v1/tcourse/{type}
```
**Types:** `blended`, `live`, `free`

#### 3. Get Specific Course
```
GET /api/v1/tcourse/{type}/{id}
```

#### 4. Update Course
```
PUT /api/v1/tcourse/{type}/{id}
```
**Authorization:** Admin required

#### 5. Delete Course
```
DELETE /api/v1/tcourse/{type}/{id}
```
**Authorization:** Admin required

#### 6. Get All Courses (Unified)
```
GET /api/v1/tcourse/all
```
Returns both new and legacy courses in a unified format.

### Specialized Endpoints

#### Blended Course Specific
```
POST /api/v1/tcourse/blended/{id}/doubt-session
PUT /api/v1/tcourse/blended/{id}/doubt-schedule
```

#### Live Course Specific
```
PUT /api/v1/tcourse/live/{id}/schedule
POST /api/v1/tcourse/live/{id}/week/{weekId}/recording
```

#### Free Course Specific
```
PUT /api/v1/tcourse/free/{id}/access
```

## Legacy Course API

Base URL: `/api/v1/courses`

### Endpoints

#### 1. Create Course
```
POST /api/v1/courses/create
```
**Authorization:** Admin required

#### 2. Get All Courses
```
GET /api/v1/courses/get
```

#### 3. Update Course
```
PUT /api/v1/courses/{id}
```
**Authorization:** Admin required

#### 4. Delete Course
```
DELETE /api/v1/courses/{id}
```
**Authorization:** Admin required

## Data Structures

### Unified Pricing Structure

Both new course types and legacy courses now use the same pricing structure:

```typescript
interface Price {
  currency: "USD" | "EUR" | "INR" | "GBP" | "AUD" | "CAD"; // Required
  individual: number;                         // Required, min: 0
  batch: number;                              // Required, min: 0
  min_batch_size: number;                     // Required, min: 2, defaults to 2
  max_batch_size: number;                     // Required, min: 2, must be >= min_batch_size, defaults to 10
  early_bird_discount: number;               // Required, 0-100%, defaults to 0
  group_discount: number;                     // Required, 0-100%, defaults to 0
  is_active: boolean;                         // Required, defaults to true
}
```

### Pricing Examples

```javascript
// Multi-currency pricing for paid courses
prices: [
  {
    currency: "INR",
    individual: 15000,
    batch: 12000,
    min_batch_size: 3,
    max_batch_size: 10,
    early_bird_discount: 10,
    group_discount: 15,
    is_active: true
  },
  {
    currency: "USD",
    individual: 200,
    batch: 160,
    min_batch_size: 3,
    max_batch_size: 10,
    early_bird_discount: 10,
    group_discount: 15,
    is_active: true
  }
]

// Empty array for free courses
prices: []
```

### Blended Course Structure

```typescript
interface BlendedCourse {
  // Required base fields
  course_type: "blended";
  course_category: string;                    // Required
  course_title: string;                       // Required
  course_level: "Beginner" | "Intermediate" | "Advanced" | "All Levels"; // Required
  course_image: string;                       // Required
  course_description: {                       // Required object
    program_overview: string;                 // Required
    benefits: string;                         // Required
    learning_objectives?: string[];           // Optional, defaults to []
    course_requirements?: string[];           // Optional, defaults to []
    target_audience?: string[];               // Optional, defaults to []
  };
  
  // Optional base fields
  course_subcategory?: string;
  course_subtitle?: string;
  course_tag?: string;
  slug?: string;                              // Auto-generated if not provided
  language?: string;                          // Defaults to "English"
  brochures?: string[];                       // Optional, defaults to []
  status?: "Draft" | "Published" | "Upcoming"; // Defaults to "Draft"
  tools_technologies?: Array<{                // Optional, defaults to []
    name: string;                             // Required if provided
    category?: "programming_language" | "framework" | "library" | "tool" | "platform" | "other"; // Defaults to "other"
    description?: string;                     // Optional
    logo_url?: string;                        // Optional
  }>;
  faqs?: Array<{                              // Optional, defaults to []
    question: string;                         // Required if provided
    answer: string;                           // Required if provided
  }>;
  
  // Required Blended-specific fields
  curriculum: Array<{                         // Required, must have at least 1 section
    id: string;                               // Required
    title: string;                            // Required
    description: string;                      // Required
    order: number;                            // Required
    lessons: Array<{
      title: string;                          // Required
      description: string;                    // Required
      duration?: number;                      // Optional
      content_type: "video" | "text" | "quiz"; // Required
      content_url: string;                    // Required
      is_preview?: boolean;                   // Optional, defaults to false
      order: number;                          // Required
    }>;
    resources?: Array<{                       // Optional
      title: string;                          // Required if provided
      description?: string;                   // Optional
      fileUrl: string;                        // Required if provided
      type?: string;                          // Optional
    }>;
    assignments?: Array<{                     // Optional
      title: string;                          // Required if provided
      description: string;                    // Required if provided
      due_date: Date;                         // Required if provided
      total_points: number;                   // Required if provided
      instructions: string;                   // Required if provided
    }>;
  }>;
  course_duration: string;                    // Required
  session_duration: string;                  // Required
  prices: {                                  // Required object
    individual: number;                       // Required, min: 0
    group: number;                           // Required, min: 0
    enterprise: number;                      // Required, min: 0
  };
  
  // Optional Blended-specific fields
  doubt_session_schedule?: {                  // Optional
    frequency?: "daily" | "weekly" | "bi-weekly" | "monthly" | "on-demand"; // Required if schedule provided
    preferred_days?: string[];                // Optional
    preferred_time_slots?: Array<{
      start_time: string;                     // Required if slots provided
      end_time: string;                       // Required if slots provided
      timezone: string;                       // Required if slots provided
    }>;
  };
  instructors?: string[];                     // Optional ObjectId array
  prerequisites?: string[];                   // Optional
  certification?: {                           // Optional
    is_certified?: boolean;                   // Defaults to true
    certification_criteria?: {
      min_assignments_score?: number;         // 0-100, defaults to 70
      min_quizzes_score?: number;            // 0-100, defaults to 70
      min_attendance?: number;               // 0-100, defaults to 80
    };
  };
}
```

### Live Course Structure

```typescript
interface LiveCourse {
  // Required base fields
  course_type: "live";
  course_category: string;                    // Required
  course_title: string;                       // Required
  course_level: "Beginner" | "Intermediate" | "Advanced" | "All Levels"; // Required
  course_image: string;                       // Required
  course_description: {                       // Required object
    program_overview: string;                 // Required
    benefits: string;                         // Required
    learning_objectives?: string[];           // Optional, defaults to []
    course_requirements?: string[];           // Optional, defaults to []
    target_audience?: string[];               // Optional, defaults to []
  };
  
  // Optional base fields
  course_subcategory?: string;
  course_subtitle?: string;
  course_tag?: string;
  slug?: string;                              // Auto-generated if not provided
  language?: string;                          // Defaults to "English"
  brochures?: string[];                       // Optional, defaults to []
  status?: "Draft" | "Published" | "Upcoming"; // Defaults to "Draft"
  tools_technologies?: Array<{                // Optional, defaults to []
    name: string;                             // Required if provided
    category?: "programming_language" | "framework" | "library" | "tool" | "platform" | "other"; // Defaults to "other"
    description?: string;                     // Optional
    logo_url?: string;                        // Optional
  }>;
  faqs?: Array<{                              // Optional, defaults to []
    question: string;                         // Required if provided
    answer: string;                           // Required if provided
  }>;
  
  // Required Live-specific fields
  course_schedule: {                          // Required object
    start_date: Date;                         // Required
    end_date: Date;                           // Required (must be after start_date)
    session_days: string[];                   // Required array of weekdays
    session_time: string;                     // Required
    timezone: string;                         // Required
  };
  total_sessions: number;                     // Required, min: 1
  session_duration: number;                   // Required, min: 30 minutes
  modules: Array<{                            // Required, must have at least 1 module
    title: string;                            // Required
    description: string;                      // Required
    order: number;                            // Required
    sessions?: Array<{                        // Optional
      title: string;                          // Required if provided
      description: string;                    // Required if provided
      scheduled_date?: Date;                  // Optional
      duration: number;                       // Required if provided
      instructor_requirements?: string[];     // Optional
      zoom_link?: string;                     // Optional
      recording_url?: string;                 // Optional
    }>;
    resources?: Array<{                       // Optional
      title: string;                          // Required if provided
      description?: string;                   // Optional
      file_url: string;                       // Required if provided
      type?: string;                          // Optional
    }>;
  }>;
  max_students: number;                       // Required, min: 1
  prices: {                                   // Required object
    regular: number;                          // Required, min: 0
    early_bird?: number;                      // Optional, min: 0
    group_discount?: number;                  // Optional, 0-100%
  };
  
  // Optional Live-specific fields
  instructors?: string[];                     // Optional ObjectId array
  prerequisites?: string[];                   // Optional
  certification?: {                           // Optional
    is_certified?: boolean;                   // Defaults to true
    attendance_required?: number;             // 0-100%, defaults to 80
  };
}
```

### Free Course Structure

```typescript
interface FreeCourse {
  // Required base fields
  course_type: "free";
  course_category: string;                    // Required
  course_title: string;                       // Required
  course_level: "Beginner" | "Intermediate" | "Advanced" | "All Levels"; // Required
  course_image: string;                       // Required
  course_description: {                       // Required object
    program_overview: string;                 // Required
    benefits: string;                         // Required
    learning_objectives?: string[];           // Optional, defaults to []
    course_requirements?: string[];           // Optional, defaults to []
    target_audience?: string[];               // Optional, defaults to []
  };
  
  // Optional base fields
  course_subcategory?: string;
  course_subtitle?: string;
  course_tag?: string;
  slug?: string;                              // Auto-generated if not provided
  language?: string;                          // Defaults to "English"
  brochures?: string[];                       // Optional, defaults to []
  status?: "Draft" | "Published" | "Upcoming"; // Defaults to "Draft"
  tools_technologies?: Array<{                // Optional, defaults to []
    name: string;                             // Required if provided
    category?: "programming_language" | "framework" | "library" | "tool" | "platform" | "other"; // Defaults to "other"
    description?: string;                     // Optional
    logo_url?: string;                        // Optional
  }>;
  faqs?: Array<{                              // Optional, defaults to []
    question: string;                         // Required if provided
    answer: string;                           // Required if provided
  }>;
  
  // Required Free-specific fields
  estimated_duration: string;                 // Required
  lessons: Array<{                            // Required, must have at least 1 lesson
    title: string;                            // Required
    description: string;                      // Required
    content_type: "video" | "text" | "pdf" | "link"; // Required
    content: string;                          // Required (URL or content)
    duration?: number;                        // Required for video type, optional for others
    order: number;                            // Required
    is_preview?: boolean;                     // Optional, defaults to true
  }>;
  
  // Optional Free-specific fields
  resources?: Array<{                         // Optional
    title: string;                            // Required if provided
    description?: string;                     // Optional
    url: string;                             // Required if provided
    type?: "pdf" | "link" | "video" | "other"; // Defaults to "other"
  }>;
  access_type?: "unlimited" | "time-limited"; // Defaults to "unlimited"
  access_duration?: number;                   // Required if access_type is "time-limited" (in days)
  prerequisites?: string[];                   // Optional
  target_skills?: string[];                   // Optional
  completion_certificate?: {                  // Optional
    is_available?: boolean;                   // Defaults to false
    requirements?: {
      min_lessons_completed?: number;         // 0-100%, defaults to 100
    };
  };
}
```

### Legacy Course Structure

```typescript
interface LegacyCourse {
  // Required fields
  course_category: string;                    // Required
  course_title: string;                       // Required
  course_image: string;                       // Required
  category_type: "Paid" | "Live" | "Free";   // Required
  class_type: "Blended Courses" | "Live Courses" | "Self-Paced" | "Virtual Learning" | "Online Classes" | "Hybrid" | "Pre-Recorded"; // Required
  no_of_Sessions: number;                     // Required, min: 1
  course_duration: string;                    // Required
  is_Certification: "Yes" | "No";            // Required
  is_Assignments: "Yes" | "No";              // Required
  is_Projects: "Yes" | "No";                 // Required
  is_Quizes: "Yes" | "No";                   // Required
  course_description: {                       // Required object
    program_overview: string;                 // Required
    benefits: string;                         // Required
    learning_objectives?: string[];           // Optional, defaults to []
    course_requirements?: string[];           // Optional, defaults to []
    target_audience?: string[];               // Optional, defaults to []
  };
  
  // Optional fields
  course_subcategory?: string;
  course_subtitle?: string;
  course_tag?: string;
  course_level?: "Beginner" | "Intermediate" | "Advanced";
  language?: string;                          // Defaults to "English"
  brochures?: string[];                       // Optional, defaults to []
  status?: "Draft" | "Published" | "Upcoming"; // Defaults to "Draft"
  session_duration?: string;
  isFree?: boolean;                           // Auto-set based on category_type
  
  // Optional pricing (empty array for free courses)
  prices?: Array<{
    currency: "USD" | "EUR" | "INR" | "GBP" | "AUD" | "CAD"; // Required if prices provided
    individual?: number;                      // Min: 0, defaults to 0
    batch?: number;                           // Min: 0, defaults to 0
    min_batch_size?: number;                  // Min: 2, defaults to 2
    max_batch_size?: number;                  // Min: 2, must be >= min_batch_size, defaults to 10
    early_bird_discount?: number;             // 0-100%, defaults to 0
    group_discount?: number;                  // 0-100%, defaults to 0
    is_active?: boolean;                      // Defaults to true
  }>;
  
  // Optional arrays
  tools_technologies?: Array<{                // Optional, defaults to []
    name: string;                             // Required if provided
    category?: string;                        // Optional
    description?: string;                     // Optional
  }>;
  
  faqs?: Array<{                              // Optional, defaults to []
    question: string;                         // Required if provided
    answer: string;                           // Required if provided
  }>;
  
  curriculum?: Array<{                        // Optional
    weekTitle: string;                        // Required if curriculum provided
    weekDescription?: string;                 // Optional
    lessons?: Array<{                         // Optional
      title: string;                          // Required if lessons provided
      description?: string;                   // Optional
      duration?: number;                      // Optional
      content_type?: string;                  // Optional
      url?: string;                           // Optional
      is_preview?: boolean;                   // Defaults to false
    }>;
  }>;
  
  // Optional metadata
  efforts_per_Week?: string;
  min_hours_per_week?: number;                // Min: 0
  max_hours_per_week?: number;                // Min: 0, must be >= min_hours_per_week
  related_courses?: string[];                 // Array of course IDs
  show_in_home?: boolean;                     // Defaults to false
}
```

## Minimum Required Payloads

Below are the absolute minimum required fields to create each course type successfully:

### Blended Course - Minimum Payload
```javascript
{
  "course_type": "blended",
  "course_category": "Technology",
  "course_title": "Sample Blended Course",
  "course_level": "Beginner",
  "course_image": "https://example.com/image.jpg",
  "course_description": {
    "program_overview": "Course overview description",
    "benefits": "Benefits of taking this course"
  },
  "curriculum": [
    {
      "id": "section1",
      "title": "Introduction",
      "description": "Basic introduction",
      "order": 1,
      "lessons": [
        {
          "title": "Getting Started",
          "description": "First lesson",
          "content_type": "video",
          "content_url": "https://example.com/video.mp4",
          "order": 1
        }
      ]
    }
  ],
  "course_duration": "4 weeks",
  "session_duration": "2 hours",
  "prices": {
    "individual": 1000,
    "group": 800,
    "enterprise": 600
  }
}
```

### Live Course - Minimum Payload
```javascript
{
  "course_type": "live",
  "course_category": "Technology",
  "course_title": "Sample Live Course",
  "course_level": "Beginner",
  "course_image": "https://example.com/image.jpg",
  "course_description": {
    "program_overview": "Course overview description",
    "benefits": "Benefits of taking this course"
  },
  "course_schedule": {
    "start_date": "2024-02-01T00:00:00.000Z",
    "end_date": "2024-03-01T00:00:00.000Z",
    "session_days": ["Monday", "Wednesday", "Friday"],
    "session_time": "18:00",
    "timezone": "Asia/Kolkata"
  },
  "total_sessions": 12,
  "session_duration": 120,
  "modules": [
    {
      "title": "Module 1",
      "description": "First module",
      "order": 1
    }
  ],
  "max_students": 30,
  "prices": {
    "regular": 2000
  }
}
```

### Free Course - Minimum Payload
```javascript
{
  "course_type": "free",
  "course_category": "Technology",
  "course_title": "Sample Free Course",
  "course_level": "Beginner",
  "course_image": "https://example.com/image.jpg",
  "course_description": {
    "program_overview": "Course overview description",
    "benefits": "Benefits of taking this course"
  },
  "estimated_duration": "2 weeks",
  "lessons": [
    {
      "title": "Introduction",
      "description": "Basic introduction",
      "content_type": "video",
      "content": "https://example.com/video.mp4",
      "order": 1
    }
  ]
}
```

### Legacy Course - Minimum Payload
```javascript
{
  "course_category": "Technology",
  "course_title": "Sample Legacy Course",
  "course_image": "https://example.com/image.jpg",
  "category_type": "Paid",
  "class_type": "Blended Courses",
  "no_of_Sessions": 10,
  "course_duration": "8 weeks",
  "is_Certification": "Yes",
  "is_Assignments": "Yes",
  "is_Projects": "No",
  "is_Quizes": "Yes",
  "course_description": {
    "program_overview": "Course overview description",
    "benefits": "Benefits of taking this course"
  }
}
```

## Error Handling

### Common Error Responses

```typescript
interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  details?: any;
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

### Validation Errors
```json
{
  "success": false,
  "message": "Validation failed",
  "details": {
    "course_title": "Course title is required",
    "course_category": "Course category must be a string"
  }
}
```

## Field Validation Reference

### Common Validations
- **course_title**: Required, string, minimum 3 characters
- **course_category**: Required, string
- **course_level**: Required, enum: ["Beginner", "Intermediate", "Advanced", "All Levels"]
- **course_image**: Required, valid URL string
- **course_description.program_overview**: Required, string, minimum 10 characters
- **course_description.benefits**: Required, string, minimum 10 characters

### Course Type Specific Validations

#### Blended Course
- **curriculum**: Required array, must have at least 1 section
- **course_duration**: Required string
- **session_duration**: Required string
- **prices.individual**: Required number, minimum 0
- **prices.group**: Required number, minimum 0
- **prices.enterprise**: Required number, minimum 0

#### Live Course
- **course_schedule.start_date**: Required date
- **course_schedule.end_date**: Required date, must be after start_date
- **course_schedule.session_days**: Required array of valid weekdays
- **course_schedule.session_time**: Required string (time format)
- **course_schedule.timezone**: Required string
- **total_sessions**: Required number, minimum 1
- **session_duration**: Required number, minimum 30 minutes
- **modules**: Required array, must have at least 1 module
- **max_students**: Required number, minimum 1
- **prices.regular**: Required number, minimum 0

#### Free Course
- **estimated_duration**: Required string
- **lessons**: Required array, must have at least 1 lesson
- **lessons[].title**: Required string
- **lessons[].description**: Required string
- **lessons[].content_type**: Required enum: ["video", "text", "pdf", "link"]
- **lessons[].content**: Required string
- **lessons[].order**: Required number
- **lessons[].duration**: Required for video type, optional for others

#### Legacy Course
- **category_type**: Required enum: ["Paid", "Live", "Free"]
- **class_type**: Required enum: ["Blended Courses", "Live Courses", "Self-Paced", "Virtual Learning", "Online Classes", "Hybrid", "Pre-Recorded"]
- **no_of_Sessions**: Required number, minimum 1
- **course_duration**: Required string
- **is_Certification**: Required enum: ["Yes", "No"]
- **is_Assignments**: Required enum: ["Yes", "No"]
- **is_Projects**: Required enum: ["Yes", "No"]
- **is_Quizes**: Required enum: ["Yes", "No"]

### Array Validations
- **tools_technologies[].name**: Required if array provided
- **faqs[].question**: Required if array provided
- **faqs[].answer**: Required if array provided
- **prices[].currency**: Required if prices array provided, enum: ["USD", "EUR", "INR", "GBP", "AUD", "CAD"]

### String Length Limits
- **course_title**: 3-200 characters
- **course_subtitle**: 0-300 characters
- **course_tag**: 0-100 characters
- **program_overview**: 10-5000 characters
- **benefits**: 10-5000 characters

## Code Examples

### JavaScript/TypeScript Frontend Integration

#### 1. Authentication Service

```javascript
class AuthService {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('access_token');
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        this.token = data.data.access_token;
        localStorage.setItem('access_token', this.token);
        localStorage.setItem('refresh_token', data.data.refresh_token);
        return data.data;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  logout() {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}
```

#### 2. Course Service

```javascript
class CourseService {
  constructor(baseURL, authService) {
    this.baseURL = baseURL;
    this.authService = authService;
  }

  // Create course using new API
  async createCourse(courseData) {
    try {
      const response = await fetch(`${this.baseURL}/tcourse`, {
        method: 'POST',
        headers: this.authService.getAuthHeaders(),
        body: JSON.stringify(courseData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data;
    } catch (error) {
      throw new Error(`Course creation failed: ${error.message}`);
    }
  }

  // Get courses by type
  async getCoursesByType(type) {
    try {
      const response = await fetch(`${this.baseURL}/tcourse/${type}`, {
        headers: this.authService.getAuthHeaders(),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return {
        courses: data.data,
        count: data.count,
        sources: data.sources,
      };
    } catch (error) {
      throw new Error(`Failed to fetch courses: ${error.message}`);
    }
  }

  // Get specific course
  async getCourseById(type, id) {
    try {
      const response = await fetch(`${this.baseURL}/tcourse/${type}/${id}`, {
        headers: this.authService.getAuthHeaders(),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data;
    } catch (error) {
      throw new Error(`Failed to fetch course: ${error.message}`);
    }
  }

  // Update course
  async updateCourse(type, id, updateData) {
    try {
      const response = await fetch(`${this.baseURL}/tcourse/${type}/${id}`, {
        method: 'PUT',
        headers: this.authService.getAuthHeaders(),
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data;
    } catch (error) {
      throw new Error(`Course update failed: ${error.message}`);
    }
  }

  // Delete course
  async deleteCourse(type, id) {
    try {
      const response = await fetch(`${this.baseURL}/tcourse/${type}/${id}`, {
        method: 'DELETE',
        headers: this.authService.getAuthHeaders(),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data;
    } catch (error) {
      throw new Error(`Course deletion failed: ${error.message}`);
    }
  }

  // Get all courses (unified)
  async getAllCourses() {
    try {
      const response = await fetch(`${this.baseURL}/tcourse/all`, {
        headers: this.authService.getAuthHeaders(),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return {
        courses: data.data,
        totalCount: data.totalCount,
        newModelCount: data.newModelCount,
        legacyModelCount: data.legacyModelCount,
      };
    } catch (error) {
      throw new Error(`Failed to fetch all courses: ${error.message}`);
    }
  }
}
```

#### 3. Legacy Course Service

```javascript
class LegacyCourseService {
  constructor(baseURL, authService) {
    this.baseURL = baseURL;
    this.authService = authService;
  }

  // Create legacy course
  async createLegacyCourse(courseData) {
    try {
      const response = await fetch(`${this.baseURL}/courses/create`, {
        method: 'POST',
        headers: this.authService.getAuthHeaders(),
        body: JSON.stringify(courseData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data;
    } catch (error) {
      throw new Error(`Legacy course creation failed: ${error.message}`);
    }
  }

  // Get all legacy courses
  async getAllLegacyCourses() {
    try {
      const response = await fetch(`${this.baseURL}/courses/get`, {
        headers: this.authService.getAuthHeaders(),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data;
    } catch (error) {
      throw new Error(`Failed to fetch legacy courses: ${error.message}`);
    }
  }
}
```

#### 4. React Hook Example

```javascript
import { useState, useEffect } from 'react';

const useCourses = (authService, courseService) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCoursesByType = async (type) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await courseService.getCoursesByType(type);
      setCourses(result.courses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createCourse = async (courseData) => {
    setLoading(true);
    setError(null);
    
    try {
      const newCourse = await courseService.createCourse(courseData);
      setCourses(prev => [...prev, newCourse]);
      return newCourse;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCourse = async (type, id, updateData) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedCourse = await courseService.updateCourse(type, id, updateData);
      setCourses(prev => prev.map(course => 
        course._id === id ? updatedCourse : course
      ));
      return updatedCourse;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (type, id) => {
    setLoading(true);
    setError(null);
    
    try {
      await courseService.deleteCourse(type, id);
      setCourses(prev => prev.filter(course => course._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    courses,
    loading,
    error,
    fetchCoursesByType,
    createCourse,
    updateCourse,
    deleteCourse,
  };
};
```

#### 5. Form Component Example

```javascript
import React, { useState } from 'react';

const CourseForm = ({ onSubmit, initialData, courseType = 'blended' }) => {
  const [formData, setFormData] = useState(initialData || {
    course_type: courseType,
    course_category: '',
    course_subcategory: '',
    course_title: '',
    course_subtitle: '',
    course_tag: '',
    slug: '',
    course_description: {
      program_overview: '',
      benefits: '',
      learning_objectives: [],
      course_requirements: [],
      target_audience: [],
    },
    course_level: 'Beginner',
    language: 'English',
    course_image: '',
    brochures: [],
    status: 'Draft',
    tools_technologies: [],
    faqs: [],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDescriptionChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      course_description: {
        ...prev.course_description,
        [field]: value,
      },
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Course Title:</label>
        <input
          type="text"
          value={formData.course_title}
          onChange={(e) => handleInputChange('course_title', e.target.value)}
          required
        />
      </div>

      <div>
        <label>Course Category:</label>
        <input
          type="text"
          value={formData.course_category}
          onChange={(e) => handleInputChange('course_category', e.target.value)}
          required
        />
      </div>

      <div>
        <label>Course Level:</label>
        <select
          value={formData.course_level}
          onChange={(e) => handleInputChange('course_level', e.target.value)}
        >
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>

      <div>
        <label>Program Overview:</label>
        <textarea
          value={formData.course_description.program_overview}
          onChange={(e) => handleDescriptionChange('program_overview', e.target.value)}
          required
        />
      </div>

      {/* Add more form fields based on course type */}
      
      <button type="submit">
        {initialData ? 'Update Course' : 'Create Course'}
      </button>
    </form>
  );
};
```

## Testing

### Environment Variables
Set up your test environment with:
```bash
BASE_URL=http://localhost:8080/api/v1
ADMIN_EMAIL=superadmin@medh.co
ADMIN_PASSWORD=Admin@123
```

### Running Tests
```bash
# Test new course types API
npm run test:course-types

# Test legacy course API
npm run test:legacy-courses

# With debug output
npm run test:course-types:debug
npm run test:legacy-courses:debug
```

### Postman Collection
Import the provided Postman collection for API testing:
- Authentication flows
- Course CRUD operations
- Error scenarios
- Data validation tests

## Best Practices

1. **Always handle authentication errors** - Implement token refresh logic
2. **Validate data on frontend** - Don't rely solely on backend validation
3. **Use TypeScript** - Leverage the provided interfaces for type safety
4. **Handle loading states** - Provide user feedback during API calls
5. **Implement error boundaries** - Gracefully handle API failures
6. **Cache responses** - Use appropriate caching strategies for course data
7. **Pagination** - Implement pagination for large course lists
8. **Search and filtering** - Add search capabilities for better UX

## Rate Limiting

The API implements rate limiting. Handle `429 Too Many Requests` responses appropriately:

```javascript
const makeAPICall = async (apiCall, retries = 3) => {
  try {
    return await apiCall();
  } catch (error) {
    if (error.status === 429 && retries > 0) {
      const delay = Math.pow(2, 4 - retries) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      return makeAPICall(apiCall, retries - 1);
    }
    throw error;
  }
};
```

## Support

For additional support or questions:
- Check the test files: `test-course-types-creation.js` and `test-legacy-course-creation.js`
- Review the API documentation: `API_DOCUMENTATION.md`
- Check backend logs for detailed error information 