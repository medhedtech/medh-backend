# Comprehensive User Profile API Documentation

## Overview

The Comprehensive Profile API endpoint provides a complete view of a user's profile, including all relevant data such as basic information, educational progress, social metrics, engagement analytics, and more. This endpoint is designed following modern user profile API best practices from leading platforms.

## Endpoint

```
GET /api/v1/profile/me/comprehensive
```

## Authentication

- **Required**: Yes
- **Type**: Bearer Token
- **Roles**: All authenticated users (admin, instructor, super-admin, student, corporate, corporate-student, parent)

## Response Structure

The API returns a comprehensive JSON object with the following sections:

### 1. Basic User Information
```json
{
  "user": {
    "id": "user_id",
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "username": "johndoe",
    "phone_number": "+1234567890",
    "user_image": { /* image details */ },
    "cover_image": { /* cover image details */ },
    "bio": "Student passionate about technology",
    "role": "student",
    "admin_role": null,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-15T12:00:00.000Z",
    "last_seen": "2024-01-15T12:00:00.000Z",
    "profile_completion": 85
  }
}
```

### 2. Personal Details & Metadata
```json
{
  "personal_details": {
    "date_of_birth": "1995-05-15T00:00:00.000Z",
    "gender": "male",
    "nationality": "United States",
    "languages_spoken": [
      {
        "language": "English",
        "proficiency": "native"
      },
      {
        "language": "Spanish", 
        "proficiency": "intermediate"
      }
    ],
    "occupation": "Software Developer",
    "industry": "Technology",
    "company": "Tech Corp",
    "experience_level": "mid",
    "education_level": "Bachelor's Degree",
    "institution_name": "University of Technology"
  }
}
```

### 3. Account Status & Verification
```json
{
  "account_status": {
    "is_active": true,
    "is_banned": false,
    "email_verified": true,
    "phone_verified": true,
    "identity_verified": false,
    "account_type": "premium",
    "subscription_status": "active",
    "subscription_plan": "pro",
    "subscription_start": "2024-01-01T00:00:00.000Z",
    "subscription_end": "2024-12-31T23:59:59.999Z"
  }
}
```

### 4. Learning Analytics & Progress
```json
{
  "learning_analytics": {
    "total_learning_time": 12580,
    "current_streak": 15,
    "longest_streak": 42,
    "certificates_earned": 8,
    "skill_points": 2450,
    "achievements_unlocked": 12
  }
}
```

### 5. Educational Data
```json
{
  "education": {
    "course_stats": {
      "total_enrolled": 25,
      "active_courses": 8,
      "completed_courses": 15,
      "on_hold_courses": 2,
      "average_progress": 73.5
    },
    "enrollments": [
      {
        "id": "enrollment_id",
        "course": {
          "id": "course_id",
          "title": "Advanced JavaScript",
          "description": "Master advanced JavaScript concepts",
          "image": { /* course image */ },
          "level": "advanced",
          "category": "Programming",
          "instructor": "instructor_id"
        },
        "enrollment_date": "2024-01-10T00:00:00.000Z",
        "status": "active",
        "progress": 65,
        "batch_info": {
          "name": "JS Advanced Batch 2024",
          "start_date": "2024-01-15T00:00:00.000Z",
          "end_date": "2024-04-15T00:00:00.000Z"
        },
        "pricing": {
          "original_price": 299,
          "final_price": 199,
          "currency": "USD"
        }
      }
    ],
    "active_learning": [
      {
        "course_title": "React Development",
        "progress": 45,
        "last_accessed": "2024-01-14T10:30:00.000Z"
      }
    ],
    "upcoming_courses": [
      {
        "course_title": "Node.js Backend",
        "start_date": "2024-02-01T00:00:00.000Z",
        "batch_name": "Backend Development 2024"
      }
    ]
  }
}
```

### 6. Social Metrics
```json
{
  "social_metrics": {
    "followers_count": 145,
    "following_count": 89,
    "reviews_written": 12,
    "discussions_participated": 34,
    "content_shared": 28,
    "community_reputation": 850
  }
}
```

### 7. Engagement Metrics
```json
{
  "engagement_metrics": {
    "total_logins": 156,
    "total_session_time": 45600,
    "avg_session_duration": 1820,
    "last_active_date": "2024-01-15T12:00:00.000Z",
    "consecutive_active_days": 12,
    "total_page_views": 2340
  }
}
```

### 8. Financial Information
```json
{
  "financial_metrics": {
    "total_spent": 1250.50,
    "total_courses_purchased": 15,
    "subscription_months": 6,
    "lifetime_value": 1250.50
  }
}
```

### 9. Device & Security Information
```json
{
  "device_info": {
    "registered_devices": 3,
    "trusted_devices": 2,
    "active_sessions": 1,
    "last_login_device": {
      "device_name": "iPhone 13",
      "device_type": "mobile",
      "operating_system": "iOS 17.2"
    }
  }
}
```

### 10. User Preferences
```json
{
  "preferences": {
    "theme": "dark",
    "language": "en",
    "currency": "USD",
    "timezone": "America/New_York",
    "notifications": {
      "email": {
        "marketing": true,
        "course_updates": true,
        "system_alerts": true
      },
      "push": {
        "enabled": true,
        "course_reminders": true
      }
    }
  }
}
```

### 11. Recent Activity
```json
{
  "recent_activity": [
    {
      "action": "course_view",
      "resource": "course_12345",
      "timestamp": "2024-01-15T11:30:00.000Z",
      "details": {
        "course_title": "JavaScript Basics"
      }
    }
  ]
}
```

### 12. Account Insights
```json
{
  "account_insights": {
    "account_age_days": 365,
    "member_since": "2023-01-15T00:00:00.000Z",
    "profile_completion_percentage": 85,
    "verification_status": {
      "email": true,
      "phone": true,
      "identity": false
    },
    "subscription_info": {
      "is_subscribed": true,
      "plan": "pro",
      "expires": "2024-12-31T23:59:59.999Z"
    }
  }
}
```

### 13. Performance Indicators
```json
{
  "performance_indicators": {
    "learning_consistency": 15,
    "engagement_level": "high",
    "progress_rate": 73.5,
    "community_involvement": 850
  }
}
```

## Example Complete Response

```json
{
  "success": true,
  "message": "Comprehensive profile retrieved successfully",
  "data": {
    "user": { /* user data */ },
    "personal_details": { /* personal details */ },
    "account_status": { /* account status */ },
    "learning_analytics": { /* learning data */ },
    "education": { /* educational data */ },
    "social_metrics": { /* social data */ },
    "engagement_metrics": { /* engagement data */ },
    "financial_metrics": { /* financial data */ },
    "device_info": { /* device data */ },
    "preferences": { /* user preferences */ },
    "recent_activity": [ /* activity array */ ],
    "account_insights": { /* insights */ },
    "performance_indicators": { /* performance data */ }
  }
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error while retrieving comprehensive profile"
}
```

## Rate Limiting

This endpoint is subject to rate limiting:
- **Window**: 15 minutes
- **Limit**: 100 requests per IP per window

## Data Privacy & Security

- Sensitive fields (passwords, tokens, etc.) are automatically excluded
- Activity logging is performed for audit purposes
- All data is filtered based on user permissions and privacy settings

## Usage Examples

### JavaScript/Fetch
```javascript
const response = await fetch('/api/v1/profile/me/comprehensive', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_jwt_token',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data.learning_analytics);
```

### cURL
```bash
curl -X GET \
  'https://api.medh.com/api/v1/profile/me/comprehensive' \
  -H 'Authorization: Bearer your_jwt_token' \
  -H 'Content-Type: application/json'
```

## Performance Considerations

- This endpoint aggregates data from multiple sources, so response times may be higher than basic profile endpoints
- Consider caching the response on the client side for frequently accessed data
- The endpoint is optimized with database queries and only retrieves necessary data

## Related Endpoints

- `GET /api/v1/profile/me` - Basic profile information
- `GET /api/v1/profile/me/stats` - Profile statistics only
- `PUT /api/v1/profile/me` - Update profile information
- `PUT /api/v1/profile/me/preferences` - Update preferences only 