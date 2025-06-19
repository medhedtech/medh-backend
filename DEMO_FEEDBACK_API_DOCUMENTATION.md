# Demo Session Feedback API Documentation

## Overview

The Demo Session Feedback API provides a comprehensive system for collecting, managing, and analyzing feedback from demo sessions. This system allows users to provide detailed feedback about their demo experience, enables instructors and admins to respond to feedback, and provides analytics for continuous improvement.

## Features

- ✅ **Comprehensive Feedback Collection**: Star ratings, qualitative assessments, and detailed comments
- ✅ **Multi-dimensional Rating System**: Overall rating, content quality, instructor performance
- ✅ **Follow-up Interest Tracking**: Enrollment interest, consultation requests, additional information needs
- ✅ **Admin Response System**: Instructors and admins can respond to feedback
- ✅ **Analytics & Statistics**: Comprehensive feedback analytics and trend analysis
- ✅ **Duplicate Prevention**: Ensures one feedback per user per demo session
- ✅ **Edit Window**: Users can edit feedback within 24 hours of submission
- ✅ **Access Control**: Role-based access for viewing and managing feedback

## Base URL

```
/api/demo-feedback
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## API Endpoints

### 1. Create Demo Feedback

**POST** `/api/demo-feedback`

Submit feedback for a completed demo session.

#### Request Body

```json
{
  "demoBookingId": "string (required) - MongoDB ObjectId",
  "overallRating": "number (required) - Integer 1-5",
  "contentQuality": "string (required) - 'excellent' | 'good' | 'average' | 'poor'",
  "instructorPerformance": "string (required) - 'excellent' | 'good' | 'average' | 'poor'",
  "wouldRecommend": "boolean (required)",
  "additionalComments": "string (optional) - Max 2000 characters",
  "specificFeedback": {
    "demoStructure": {
      "rating": "string (optional) - 'excellent' | 'good' | 'average' | 'poor'",
      "comments": "string (optional) - Max 500 characters"
    },
    "technicalAspects": {
      "rating": "string (optional) - 'excellent' | 'good' | 'average' | 'poor'",
      "comments": "string (optional) - Max 500 characters"
    },
    "interaction": {
      "rating": "string (optional) - 'excellent' | 'good' | 'average' | 'poor'",
      "comments": "string (optional) - Max 500 characters"
    },
    "relevance": {
      "rating": "string (optional) - 'excellent' | 'good' | 'average' | 'poor'",
      "comments": "string (optional) - Max 500 characters"
    }
  },
  "likedMost": "string (optional) - Max 1000 characters",
  "improvementAreas": "string (optional) - Max 1000 characters",
  "followUpInterest": {
    "enrollmentInterest": "boolean (optional) - Default false",
    "consultationRequest": "boolean (optional) - Default false",
    "moreInfoRequest": "boolean (optional) - Default false",
    "specificCourseInterest": "string (optional)"
  },
  "feedbackSource": "string (optional) - 'email_link' | 'website_form' | 'mobile_app' | 'phone_call' | 'other'"
}
```

#### Response

```json
{
  "success": true,
  "message": "Feedback submitted successfully",
  "data": {
    "feedback": {
      "id": "string",
      "demoBooking": "object",
      "overallRating": "number",
      "contentQuality": "string",
      "instructorPerformance": "string",
      "wouldRecommend": "boolean",
      "additionalComments": "string",
      "followUpInterest": "object",
      "feedbackSummary": "object",
      "submittedAt": "string (ISO date)",
      "canEdit": "boolean"
    }
  }
}
```

#### Error Responses

- `400` - Validation failed
- `401` - Authentication required
- `404` - Demo booking not found
- `409` - Feedback already exists for this demo
- `403` - Demo session not completed or unauthorized

---

### 2. Get User's Feedback

**GET** `/api/demo-feedback/my-feedback`

Retrieve current user's submitted feedback with pagination.

#### Query Parameters

```
page?: number (default: 1)
limit?: number (default: 10, max: 100)
sortBy?: string (default: 'createdAt') - 'createdAt' | 'overallRating' | 'status'
sortOrder?: string (default: 'desc') - 'asc' | 'desc'
```

#### Response

```json
{
  "success": true,
  "message": "User feedback retrieved successfully",
  "data": {
    "feedbacks": [
      {
        "id": "string",
        "demoBooking": "object",
        "overallRating": "number",
        "contentQuality": "string",
        "instructorPerformance": "string",
        "wouldRecommend": "boolean",
        "additionalComments": "string",
        "followUpInterest": "object",
        "status": "string",
        "submittedAt": "string",
        "canEdit": "boolean"
      }
    ],
    "pagination": {
      "currentPage": "number",
      "totalPages": "number",
      "totalItems": "number",
      "itemsPerPage": "number",
      "hasNextPage": "boolean",
      "hasPrevPage": "boolean"
    }
  }
}
```

---

### 3. Get Available Demos for Feedback

**GET** `/api/demo-feedback/available-demos`

Get completed demo sessions that don't have feedback yet.

#### Response

```json
{
  "success": true,
  "message": "Available demo sessions retrieved successfully",
  "data": {
    "availableDemos": [
      {
        "id": "string",
        "scheduledDateTime": "string (ISO date)",
        "demoType": "string",
        "courseInterest": "string",
        "instructor": "object",
        "durationMinutes": "number",
        "completedAt": "string (ISO date)"
      }
    ],
    "totalAvailable": "number"
  }
}
```

---

### 4. Get Feedback by ID

**GET** `/api/demo-feedback/:feedbackId`

Get detailed feedback information. Accessible by feedback owner, instructor, or admin.

#### Path Parameters

```
feedbackId: string (required) - MongoDB ObjectId
```

#### Response

```json
{
  "success": true,
  "message": "Feedback retrieved successfully",
  "data": {
    "feedback": {
      "id": "string",
      "demoBooking": "object",
      "user": "object",
      "overallRating": "number",
      "contentQuality": "string",
      "instructorPerformance": "string",
      "additionalComments": "string",
      "wouldRecommend": "boolean",
      "specificFeedback": "object",
      "likedMost": "string",
      "improvementAreas": "string",
      "followUpInterest": "object",
      "adminResponse": "object",
      "status": "string",
      "priority": "string",
      "tags": "array",
      "feedbackSummary": "object",
      "averageRating": "string",
      "submittedAt": "string",
      "canEdit": "boolean",
      "canRespond": "boolean"
    }
  }
}
```

---

### 5. Update Feedback

**PUT** `/api/demo-feedback/:feedbackId`

Update feedback within 24 hours of submission. Only accessible by feedback owner.

#### Path Parameters

```
feedbackId: string (required) - MongoDB ObjectId
```

#### Request Body

Same as create feedback, but all fields are optional except feedbackId.

#### Response

```json
{
  "success": true,
  "message": "Feedback updated successfully",
  "data": {
    "feedback": {
      "id": "string",
      "demoBooking": "object",
      "overallRating": "number",
      "contentQuality": "string",
      "instructorPerformance": "string",
      "wouldRecommend": "boolean",
      "additionalComments": "string",
      "followUpInterest": "object",
      "feedbackSummary": "object",
      "updatedAt": "string"
    }
  }
}
```

#### Error Responses

- `400` - Edit time expired (24 hours passed)
- `404` - Feedback not found or access denied

---

### 6. Get All Feedback (Admin/Instructor)

**GET** `/api/demo-feedback`

Get all feedback with filtering options. Accessible by admins and instructors.

#### Query Parameters

```
demoBookingId?: string - Filter by demo booking ID
userId?: string - Filter by user ID
overallRating?: number - Filter by overall rating (1-5)
contentQuality?: string - Filter by content quality rating
instructorPerformance?: string - Filter by instructor performance rating
wouldRecommend?: boolean - Filter by recommendation status
status?: string - Filter by feedback status
priority?: string - Filter by priority level
startDate?: string (ISO date) - Filter by date range start
endDate?: string (ISO date) - Filter by date range end
page?: number (default: 1)
limit?: number (default: 10, max: 100)
sortBy?: string (default: 'createdAt')
sortOrder?: string (default: 'desc')
```

#### Response

```json
{
  "success": true,
  "message": "Feedback retrieved successfully",
  "data": {
    "feedbacks": [
      {
        "id": "string",
        "demoBooking": "object",
        "user": "object",
        "overallRating": "number",
        "contentQuality": "string",
        "instructorPerformance": "string",
        "wouldRecommend": "boolean",
        "additionalComments": "string",
        "followUpInterest": "object",
        "adminResponse": "object",
        "status": "string",
        "priority": "string",
        "tags": "array",
        "feedbackSummary": "object",
        "submittedAt": "string"
      }
    ],
    "pagination": "object"
  }
}
```

---

### 7. Add Admin Response

**POST** `/api/demo-feedback/:feedbackId/response`

Add admin or instructor response to feedback.

#### Path Parameters

```
feedbackId: string (required) - MongoDB ObjectId
```

#### Request Body

```json
{
  "responseText": "string (required) - Max 1000 characters",
  "isPublic": "boolean (optional) - Default false",
  "internalNotes": "string (optional) - Max 1000 characters",
  "priority": "string (optional) - 'low' | 'medium' | 'high' | 'urgent'",
  "tags": "array (optional) - Array of strings"
}
```

#### Response

```json
{
  "success": true,
  "message": "Response added successfully",
  "data": {
    "feedback": {
      "id": "string",
      "adminResponse": {
        "respondedBy": "object",
        "responseText": "string",
        "responseDate": "string",
        "isPublic": "boolean"
      },
      "status": "string",
      "priority": "string",
      "tags": "array",
      "updatedAt": "string"
    }
  }
}
```

---

### 8. Get Feedback Statistics

**GET** `/api/demo-feedback/stats`

Get comprehensive feedback analytics and statistics.

#### Query Parameters

```
startDate?: string (ISO date) - Filter by date range start
endDate?: string (ISO date) - Filter by date range end
instructorId?: string - Filter by specific instructor
period?: string (default: 'month') - 'day' | 'week' | 'month'
```

#### Response

```json
{
  "success": true,
  "message": "Feedback statistics retrieved successfully",
  "data": {
    "totalFeedbacks": "number",
    "averageOverallRating": "number",
    "recommendationRate": "number (percentage)",
    "distributions": {
      "ratings": {
        "1": "number",
        "2": "number",
        "3": "number",
        "4": "number",
        "5": "number"
      },
      "contentQuality": {
        "excellent": "number",
        "good": "number",
        "average": "number",
        "poor": "number"
      },
      "instructorPerformance": {
        "excellent": "number",
        "good": "number",
        "average": "number",
        "poor": "number"
      },
      "status": {
        "pending": "number",
        "reviewed": "number",
        "responded": "number",
        "archived": "number"
      },
      "priority": {
        "low": "number",
        "medium": "number",
        "high": "number",
        "urgent": "number"
      }
    },
    "trends": [
      {
        "period": "string",
        "count": "number",
        "averageRating": "number",
        "recommendationRate": "number"
      }
    ]
  }
}
```

## Data Models

### Feedback Model

```typescript
interface DemoFeedback {
  _id: ObjectId;
  demoBookingId: ObjectId; // Reference to DemoBooking
  userId: ObjectId; // Reference to User
  
  // Core ratings
  overallRating: number; // 1-5 stars
  contentQuality: 'excellent' | 'good' | 'average' | 'poor';
  instructorPerformance: 'excellent' | 'good' | 'average' | 'poor';
  wouldRecommend: boolean;
  
  // Detailed feedback
  additionalComments?: string;
  specificFeedback?: {
    demoStructure?: { rating?: string; comments?: string; };
    technicalAspects?: { rating?: string; comments?: string; };
    interaction?: { rating?: string; comments?: string; };
    relevance?: { rating?: string; comments?: string; };
  };
  likedMost?: string;
  improvementAreas?: string;
  
  // Follow-up interest
  followUpInterest?: {
    enrollmentInterest?: boolean;
    consultationRequest?: boolean;
    moreInfoRequest?: boolean;
    specificCourseInterest?: string;
  };
  
  // Metadata
  feedbackSource: 'email_link' | 'website_form' | 'mobile_app' | 'phone_call' | 'other';
  ipAddress?: string;
  userAgent?: string;
  
  // Admin management
  adminResponse?: {
    respondedBy?: ObjectId;
    responseText?: string;
    responseDate?: Date;
    isPublic?: boolean;
  };
  status: 'pending' | 'reviewed' | 'responded' | 'archived';
  internalNotes?: string;
  tags?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sentimentScore?: number; // -1 to 1
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `DEMO_BOOKING_NOT_FOUND` | Demo booking not found |
| `DEMO_NOT_COMPLETED` | Demo session must be completed before feedback |
| `UNAUTHORIZED_FEEDBACK` | User not authorized to provide feedback |
| `DUPLICATE_FEEDBACK` | Feedback already exists for this demo |
| `FEEDBACK_NOT_FOUND` | Feedback not found |
| `EDIT_TIME_EXPIRED` | Feedback can only be edited within 24 hours |
| `ACCESS_DENIED` | Insufficient permissions to access feedback |
| `AUTH_REQUIRED` | Authentication required |

## Usage Examples

### Submit Basic Feedback

```javascript
const response = await fetch('/api/demo-feedback', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    demoBookingId: '507f1f77bcf86cd799439011',
    overallRating: 5,
    contentQuality: 'excellent',
    instructorPerformance: 'excellent',
    wouldRecommend: true,
    additionalComments: 'Great demo! Very informative and well-structured.',
    followUpInterest: {
      enrollmentInterest: true,
      specificCourseInterest: 'Full Stack Development'
    }
  })
});
```

### Get Feedback Statistics

```javascript
const response = await fetch('/api/demo-feedback/stats?period=month', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const stats = await response.json();
console.log(`Average Rating: ${stats.data.averageOverallRating}`);
console.log(`Recommendation Rate: ${stats.data.recommendationRate}%`);
```

### Add Admin Response

```javascript
const response = await fetch(`/api/demo-feedback/${feedbackId}/response`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    responseText: 'Thank you for your feedback! We\'re glad you enjoyed the demo.',
    isPublic: true,
    priority: 'medium',
    tags: ['positive', 'enrollment-interest']
  })
});
```

## Best Practices

1. **Feedback Timing**: Encourage feedback submission within 24-48 hours of demo completion
2. **Follow-up Actions**: Use `followUpInterest` data to trigger appropriate follow-up workflows
3. **Analytics**: Regularly review feedback statistics to identify improvement areas
4. **Response Management**: Respond to negative feedback promptly and professionally
5. **Data Privacy**: Ensure sensitive feedback is handled according to privacy policies

## Rate Limiting

- Standard rate limiting applies: 100 requests per minute per user
- Feedback submission: Limited to prevent spam (1 feedback per demo per user)
- Statistics endpoints: Cached for 5 minutes for performance

## Integration Notes

- Feedback automatically updates the demo booking record with rating and follow-up flags
- Email notifications can be triggered based on feedback ratings and follow-up interests
- Analytics data can be exported for external business intelligence tools
- Webhook support available for real-time feedback processing 