# Profile API Documentation

## Overview
The Profile API provides comprehensive user profile management functionality including viewing, updating, deleting, and managing user preferences. It supports all user fields from the user schema and includes advanced features like statistics, activity tracking, and preferences management.

## Base URL
```
/api/v1/profile
```

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Rate Limiting
- **Profile Operations**: 100 requests per 15 minutes
- **Update Operations**: 20 requests per 15 minutes  
- **Delete Operations**: 5 requests per hour

---

## Endpoints

### 1. Get User Profile

**GET** `/api/v1/profile/:userId`

Get complete user profile information.

#### Authorization
- Users can view their own profile
- Admins can view any profile
- Other users cannot view profiles they don't own

#### Parameters
- `userId` (path) - MongoDB ObjectId of the user

#### Response
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "_id": "67cfe3a9a50dbb995b4d94da",
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "username": "johndoe",
      "student_id": "MED-2025-000001",
      "phone_numbers": [
        {
          "country": "US",
          "number": "+1234567890"
        }
      ],
      "age": 25,
      "age_group": "young-adult",
      "address": "123 Main St, City, State",
      "organization": "Tech Corp",
      "bio": "Software developer passionate about learning",
      "user_image": {
        "url": "https://example.com/image.jpg",
        "public_id": "user_images/abc123",
        "alt_text": "Profile picture",
        "upload_date": "2025-01-15T10:30:00.000Z"
      },
      "cover_image": {
        "url": "https://example.com/cover.jpg",
        "public_id": "cover_images/def456",
        "alt_text": "Cover image",
        "upload_date": "2025-01-15T10:30:00.000Z"
      },
      "facebook_link": "https://facebook.com/johndoe",
      "instagram_link": "https://instagram.com/johndoe",
      "linkedin_link": "https://linkedin.com/in/johndoe",
      "twitter_link": "https://twitter.com/johndoe",
      "youtube_link": "https://youtube.com/johndoe",
      "github_link": "https://github.com/johndoe",
      "portfolio_link": "https://johndoe.dev",
      "country": "United States",
      "timezone": "America/New_York",
      "email_verified": true,
      "phone_verified": true,
      "identity_verified": false,
      "is_active": true,
      "is_banned": false,
      "account_type": "premium",
      "role": "student",
      "subscription_status": "active",
      "subscription_plan": "premium_monthly",
      "subscription_start": "2025-01-01T00:00:00.000Z",
      "subscription_end": "2025-02-01T00:00:00.000Z",
      "trial_used": false,
      "two_factor_enabled": false,
      "is_online": true,
      "last_seen": "2025-01-16T15:30:00.000Z",
      "status_message": "Learning new technologies",
      "activity_status": "online",
      "meta": {
        "date_of_birth": "1999-05-15T00:00:00.000Z",
        "gender": "male",
        "nationality": "American",
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
        "annual_income_range": "75k-100k",
        "education_level": "Bachelor's Degree",
        "institution_name": "State University",
        "field_of_study": "Computer Science",
        "graduation_year": 2021,
        "skills": ["JavaScript", "Python", "React", "Node.js"],
        "certifications": [
          {
            "name": "AWS Certified Developer",
            "issuer": "Amazon Web Services",
            "year": 2024,
            "expiry_date": "2027-01-15T00:00:00.000Z",
            "credential_id": "AWS-123456",
            "credential_url": "https://aws.amazon.com/verification/123456",
            "is_verified": true
          }
        ]
      },
      "preferences": {
        "theme": "dark",
        "language": "en",
        "currency": "USD",
        "timezone": "America/New_York",
        "notifications": {
          "email": {
            "marketing": true,
            "course_updates": true,
            "system_alerts": true,
            "weekly_summary": true,
            "achievement_unlocked": true
          },
          "push": {
            "enabled": true,
            "marketing": false,
            "course_reminders": true,
            "live_sessions": true,
            "community_activity": false
          },
          "sms": {
            "enabled": false,
            "security_alerts": false,
            "urgent_only": false
          }
        },
        "privacy": {
          "profile_visibility": "public",
          "activity_tracking": true,
          "data_analytics": true,
          "third_party_sharing": false,
          "marketing_emails": true
        },
        "accessibility": {
          "screen_reader": false,
          "high_contrast": false,
          "large_text": false,
          "keyboard_navigation": false,
          "reduced_motion": false
        },
        "content": {
          "autoplay_videos": true,
          "subtitles_default": false,
          "preferred_video_quality": "1080p",
          "content_maturity": "all"
        }
      },
      "statistics": {
        "learning": {
          "total_courses_enrolled": 5,
          "total_courses_completed": 3,
          "total_learning_time": 1200,
          "current_streak": 7,
          "longest_streak": 15,
          "certificates_earned": 3,
          "skill_points": 850,
          "achievements_unlocked": 12
        },
        "engagement": {
          "total_logins": 45,
          "total_session_time": 18000,
          "avg_session_duration": 400,
          "last_active_date": "2025-01-16T15:30:00.000Z",
          "consecutive_active_days": 7,
          "total_page_views": 234,
          "feature_usage_count": {}
        },
        "social": {
          "reviews_written": 8,
          "discussions_participated": 15,
          "content_shared": 3,
          "followers_count": 25,
          "following_count": 18,
          "community_reputation": 120
        },
        "financial": {
          "total_spent": 299.99,
          "total_courses_purchased": 5,
          "subscription_months": 3,
          "refunds_requested": 0,
          "lifetime_value": 299.99
        }
      },
      "created_at": "2024-12-15T10:00:00.000Z",
      "updated_at": "2025-01-16T15:30:00.000Z",
      "last_profile_update": "2025-01-16T15:30:00.000Z"
    },
    "profile_completion": 85,
    "last_updated": "2025-01-16T15:30:00.000Z",
    "account_status": {
      "is_active": true,
      "is_banned": false,
      "email_verified": true,
      "phone_verified": true,
      "identity_verified": false
    }
  }
}
```

---

### 2. Update User Profile

**PUT** `/api/v1/profile/:userId`

Update user profile information.

#### Authorization
- Users can update their own profile
- Admins can update any profile
- Regular users cannot update admin-only fields

#### Parameters
- `userId` (path) - MongoDB ObjectId of the user

#### Request Body
All fields are optional. Only include fields you want to update:

```json
{
  "full_name": "John Smith",
  "email": "john.smith@example.com",
  "username": "johnsmith",
  "password": "NewSecurePassword123!",
  "phone_numbers": [
    {
      "country": "US",
      "number": "+1234567890"
    }
  ],
  "age": 26,
  "age_group": "young-adult",
  "address": "456 Oak St, New City, State",
  "organization": "New Tech Corp",
  "bio": "Senior software developer with 5 years experience",
  "user_image": {
    "url": "https://example.com/new-image.jpg",
    "public_id": "user_images/xyz789",
    "alt_text": "Updated profile picture"
  },
  "cover_image": {
    "url": "https://example.com/new-cover.jpg",
    "public_id": "cover_images/abc123",
    "alt_text": "Updated cover image"
  },
  "facebook_link": "https://facebook.com/johnsmith",
  "instagram_link": "https://instagram.com/johnsmith",
  "linkedin_link": "https://linkedin.com/in/johnsmith",
  "twitter_link": "https://twitter.com/johnsmith",
  "youtube_link": "https://youtube.com/johnsmith",
  "github_link": "https://github.com/johnsmith",
  "portfolio_link": "https://johnsmith.dev",
  "country": "United States",
  "timezone": "America/Los_Angeles",
  "status_message": "Building amazing applications",
  "activity_status": "busy",
  "meta": {
    "date_of_birth": "1999-05-15T00:00:00.000Z",
    "gender": "male",
    "nationality": "American",
    "languages_spoken": [
      {
        "language": "English",
        "proficiency": "native"
      },
      {
        "language": "French",
        "proficiency": "beginner"
      }
    ],
    "occupation": "Senior Software Developer",
    "industry": "Technology",
    "company": "New Tech Corp",
    "experience_level": "senior",
    "annual_income_range": "100k-150k",
    "education_level": "Master's Degree",
    "institution_name": "Tech University",
    "field_of_study": "Computer Science",
    "graduation_year": 2023,
    "skills": ["JavaScript", "Python", "React", "Node.js", "AWS", "Docker"],
    "certifications": [
      {
        "name": "AWS Solutions Architect",
        "issuer": "Amazon Web Services",
        "year": 2024,
        "expiry_date": "2027-06-15T00:00:00.000Z",
        "credential_id": "AWS-789012",
        "credential_url": "https://aws.amazon.com/verification/789012",
        "is_verified": true
      }
    ]
  }
}
```

#### Admin-Only Fields
These fields can only be updated by admins:
- `role`
- `admin_role`
- `is_active`
- `is_banned`
- `ban_reason`
- `ban_expires`
- `account_type`
- `subscription_status`
- `subscription_plan`
- `subscription_start`
- `subscription_end`
- `email_verified`
- `phone_verified`
- `identity_verified`
- `api_key`
- `api_rate_limit`
- `webhooks`
- `failed_login_attempts`
- `account_locked_until`

#### Response
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      // Updated user object (same structure as GET response)
    },
    "profile_completion": 90,
    "updated_fields": ["full_name", "bio", "meta.occupation"]
  }
}
```

---

### 3. Delete User Profile

**DELETE** `/api/v1/profile/:userId`

Delete user profile (soft delete by default, permanent delete for super-admin).

#### Authorization
- Users can delete their own profile
- Admins can delete any profile
- Only super-admin can perform permanent deletion

#### Parameters
- `userId` (path) - MongoDB ObjectId of the user

#### Query Parameters
- `permanent` (optional) - Set to "true" for permanent deletion (super-admin only)

#### Response (Soft Delete)
```json
{
  "success": true,
  "message": "Profile deactivated successfully",
  "data": {
    "user": {
      "full_name": "John Smith",
      "email": "deleted_1737049200000_john.smith@example.com",
      "is_active": false,
      "deleted_at": "2025-01-16T15:30:00.000Z"
    },
    "deletion_type": "soft_delete",
    "can_be_restored": true
  }
}
```

#### Response (Permanent Delete)
```json
{
  "success": true,
  "message": "Profile permanently deleted"
}
```

---

### 4. Restore User Profile

**POST** `/api/v1/profile/:userId/restore`

Restore a soft-deleted user profile.

#### Authorization
- Admin only

#### Parameters
- `userId` (path) - MongoDB ObjectId of the user

#### Response
```json
{
  "success": true,
  "message": "Profile restored successfully",
  "data": {
    "user": {
      "full_name": "John Smith",
      "email": "john.smith@example.com",
      "is_active": true,
      "restored_at": "2025-01-16T16:00:00.000Z"
    }
  }
}
```

---

### 5. Get Profile Statistics

**GET** `/api/v1/profile/:userId/stats`

Get detailed profile statistics and analytics.

#### Authorization
- Users can view their own stats
- Admins can view any user's stats

#### Parameters
- `userId` (path) - MongoDB ObjectId of the user

#### Response
```json
{
  "success": true,
  "message": "Profile statistics retrieved successfully",
  "data": {
    "statistics": {
      "learning": {
        "total_courses_enrolled": 5,
        "total_courses_completed": 3,
        "total_learning_time": 1200,
        "current_streak": 7,
        "longest_streak": 15,
        "certificates_earned": 3,
        "skill_points": 850,
        "achievements_unlocked": 12
      },
      "engagement": {
        "total_logins": 45,
        "total_session_time": 18000,
        "avg_session_duration": 400,
        "last_active_date": "2025-01-16T15:30:00.000Z",
        "consecutive_active_days": 7,
        "total_page_views": 234,
        "feature_usage_count": {}
      },
      "social": {
        "reviews_written": 8,
        "discussions_participated": 15,
        "content_shared": 3,
        "followers_count": 25,
        "following_count": 18,
        "community_reputation": 120
      },
      "financial": {
        "total_spent": 299.99,
        "total_courses_purchased": 5,
        "subscription_months": 3,
        "refunds_requested": 0,
        "lifetime_value": 299.99
      }
    },
    "account_metrics": {
      "account_age_days": 32,
      "profile_completion": 85,
      "last_seen": "2025-01-16T15:30:00.000Z",
      "recent_activity": [
        {
          "action": "course_view",
          "resource": "course_123",
          "timestamp": "2025-01-16T15:25:00.000Z"
        }
      ]
    },
    "preferences": {
      // User preferences object
    }
  }
}
```

---

### 6. Update User Preferences

**PUT** `/api/v1/profile/:userId/preferences`

Update user preferences and settings.

#### Authorization
- Users can only update their own preferences

#### Parameters
- `userId` (path) - MongoDB ObjectId of the user

#### Request Body
All fields are optional:

```json
{
  "theme": "dark",
  "language": "en-US",
  "currency": "EUR",
  "timezone": "Europe/London",
  "notifications": {
    "email": {
      "marketing": false,
      "course_updates": true,
      "system_alerts": true,
      "weekly_summary": false,
      "achievement_unlocked": true
    },
    "push": {
      "enabled": true,
      "marketing": false,
      "course_reminders": true,
      "live_sessions": true,
      "community_activity": true
    },
    "sms": {
      "enabled": true,
      "security_alerts": true,
      "urgent_only": true
    }
  },
  "privacy": {
    "profile_visibility": "friends",
    "activity_tracking": false,
    "data_analytics": true,
    "third_party_sharing": false,
    "marketing_emails": false
  },
  "accessibility": {
    "screen_reader": false,
    "high_contrast": true,
    "large_text": true,
    "keyboard_navigation": true,
    "reduced_motion": false
  },
  "content": {
    "autoplay_videos": false,
    "subtitles_default": true,
    "preferred_video_quality": "720p",
    "content_maturity": "teen"
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "data": {
    "preferences": {
      // Updated preferences object
    }
  }
}
```

---

## Convenience Routes

For easier access, the following convenience routes are available that automatically use the current user's ID:

### Get Current User Profile
**GET** `/api/v1/profile/me`

### Update Current User Profile  
**PUT** `/api/v1/profile/me`

### Delete Current User Profile
**DELETE** `/api/v1/profile/me`

### Get Current User Statistics
**GET** `/api/v1/profile/me/stats`

### Update Current User Preferences
**PUT** `/api/v1/profile/me/preferences`

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token is required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Unauthorized to view this profile"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Too many profile requests from this IP, please try again later."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error while retrieving profile"
}
```

---

## Field Validation Rules

### Basic Information
- `full_name`: 2-100 characters, letters, spaces, hyphens, apostrophes only
- `email`: Valid email format
- `username`: 3-30 characters, letters, numbers, underscores only
- `password`: Minimum 8 characters with uppercase, lowercase, number, and special character

### Contact Information
- `phone_numbers.*.country`: 2-3 characters
- `phone_numbers.*.number`: 10-15 digits

### Profile Information
- `age`: 13-120
- `age_group`: teen, young-adult, adult, senior
- `address`: Maximum 500 characters
- `organization`: Maximum 200 characters
- `bio`: Maximum 1000 characters

### Social Links
- Must be valid URLs for respective platforms
- Facebook: `https://facebook.com/*`
- Instagram: `https://instagram.com/*`
- LinkedIn: `https://linkedin.com/*`
- Twitter: `https://twitter.com/*` or `https://x.com/*`
- YouTube: `https://youtube.com/*`
- GitHub: `https://github.com/*`

### Meta Information
- `date_of_birth`: Valid ISO 8601 date
- `gender`: male, female, non-binary, prefer-not-to-say, other
- `experience_level`: entry, mid, senior, executive, student, other
- `education_level`: High School, Diploma, Associate Degree, Bachelor's Degree, Master's Degree, Doctorate/PhD, Professional Certificate, Other
- `graduation_year`: 1950 to current year + 10

### Preferences
- `theme`: light, dark, auto, high_contrast
- `language`: ISO language code format (e.g., en, en-US)
- `currency`: 3-letter currency code (e.g., USD, EUR)
- `preferred_video_quality`: auto, 480p, 720p, 1080p
- `content_maturity`: all, teen, mature

---

## Usage Examples

### Get Your Own Profile
```bash
curl -X GET "http://localhost:8080/api/v1/profile/me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Update Your Profile
```bash
curl -X PUT "http://localhost:8080/api/v1/profile/me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Smith",
    "bio": "Updated bio",
    "skills": ["JavaScript", "Python", "React"]
  }'
```

### Update Preferences
```bash
curl -X PUT "http://localhost:8080/api/v1/profile/me/preferences" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "dark",
    "notifications": {
      "email": {
        "marketing": false
      }
    }
  }'
```

### Get Profile Statistics
```bash
curl -X GET "http://localhost:8080/api/v1/profile/me/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Security Features

1. **Authentication Required**: All endpoints require valid JWT token
2. **Authorization Checks**: Users can only access/modify their own data (except admins)
3. **Rate Limiting**: Prevents abuse with different limits for different operations
4. **Input Validation**: Comprehensive validation for all fields
5. **Sensitive Data Protection**: Passwords and tokens are excluded from responses
6. **Activity Logging**: All profile operations are logged for audit purposes
7. **Soft Delete**: Default deletion is reversible (permanent delete requires super-admin)
8. **Email Verification**: Email changes require re-verification

---

## Notes

1. **Profile Completion**: Automatically calculated based on filled fields
2. **Activity Tracking**: User activities are logged for analytics
3. **Nested Updates**: Nested objects (meta, preferences) are merged with existing data
4. **Password Updates**: Passwords are automatically hashed before storage
5. **Email Changes**: Changing email sets `email_verified` to false and generates verification token
6. **Admin Fields**: Regular users cannot modify admin-only fields
7. **Timezone Support**: All dates are stored in UTC and can be converted based on user timezone
8. **Image Handling**: Supports both URL and Cloudinary public_id for images 