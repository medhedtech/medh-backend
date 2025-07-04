# Comprehensive User Profile API Documentation

## Overview
This API provides a complete profile management system for your application's profile page. It integrates data from multiple models including User, Enrollment, Course, Quiz, Order, Progress, and Certificate models to provide a comprehensive view of user data.

## Features
- **Complete Profile Data**: Aggregates all user-related information from multiple models
- **Editable Fields**: Allows updating all profile fields except email (for security)
- **Payment Integration**: Includes payment history from both enrollments and orders
- **Learning Analytics**: Comprehensive learning progress and statistics
- **Certificate Management**: Displays earned certificates and achievements
- **Device & Security Info**: Shows login patterns and device preferences
- **EMI & Subscription Data**: Detailed payment plan information

## Endpoints

### 1. Get Comprehensive Profile
**GET** `/api/v1/profile/me/comprehensive`

**Description**: Retrieves all user profile data for display on profile page

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Response Structure**:
```json
{
  "success": true,
  "message": "Comprehensive profile retrieved successfully",
  "data": {
    "basic_info": {
      "id": "user_id",
      "full_name": "User Name",
      "username": "username",
      "email": "user@example.com", // Read-only
      "student_id": "STU001",
      "phone_numbers": [
        {
          "country": "+1",
          "number": "1234567890",
          "is_primary": true,
          "is_verified": false
        }
      ],
      "age": 25,
      "age_group": "young-adult",
      "address": "User Address",
      "organization": "Company Name",
      "bio": "User bio",
      "country": "USA",
      "timezone": "America/New_York",
      "facebook_link": "https://facebook.com/user",
      "instagram_link": "https://instagram.com/user",
      "linkedin_link": "https://linkedin.com/in/user",
      "twitter_link": "https://twitter.com/user",
      "youtube_link": "https://youtube.com/user",
      "github_link": "https://github.com/user",
      "portfolio_link": "https://portfolio.com",
      "role": "student", // Read-only
      "admin_role": null, // Read-only
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "last_seen": "2024-01-01T00:00:00.000Z",
      "profile_completion": 85
    },
    "profile_media": {
      "user_image": {
        "url": "https://example.com/image.jpg",
        "public_id": "cloudinary_id",
        "alt_text": "Profile image"
      },
      "cover_image": {
        "url": "https://example.com/cover.jpg",
        "public_id": "cloudinary_id",
        "alt_text": "Cover image"
      }
    },
    "personal_details": {
      "date_of_birth": "1998-01-01T00:00:00.000Z",
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
      "annual_income_range": "50k-75k",
      "education_level": "Bachelor's Degree",
      "institution_name": "University of Example",
      "field_of_study": "Computer Science",
      "graduation_year": 2020,
      "skills": ["JavaScript", "Python", "React"],
      "certifications": [
        {
          "name": "AWS Certified Developer",
          "issuer": "Amazon",
          "year": 2023,
          "credential_url": "https://aws.amazon.com/certification/"
        }
      ],
      "learning_goals": [
        {
          "goal": "Master Full Stack Development",
          "priority": "high",
          "target_date": "2024-12-31T00:00:00.000Z",
          "progress": 65
        }
      ],
      "preferred_learning_style": "visual",
      "available_time_per_week": 10,
      "preferred_study_times": [
        {
          "day": "monday",
          "start_time": "18:00",
          "end_time": "20:00"
        }
      ],
      "interests": ["Web Development", "AI/ML", "Cloud Computing"]
    },
    "account_status": {
      "is_active": true,
      "is_banned": false,
      "ban_reason": null,
      "ban_expires": null,
      "email_verified": true,
      "phone_verified": false,
      "identity_verified": false,
      "account_type": "premium",
      "subscription_status": "active",
      "subscription_plan": "pro",
      "subscription_start": "2024-01-01T00:00:00.000Z",
      "subscription_end": "2024-12-31T00:00:00.000Z",
      "trial_used": true,
      "two_factor_enabled": false,
      "failed_login_attempts": 0,
      "account_locked_until": null
    },
    "learning_analytics": {
      "total_learning_time": 150, // hours
      "current_streak": 7, // days
      "longest_streak": 21, // days
      "certificates_earned": 3,
      "skill_points": 1250,
      "achievements_unlocked": 8,
      "total_courses_enrolled": 5,
      "total_courses_completed": 2,
      "completion_rate": 40, // percentage
      "average_score": 85.5,
      "total_lessons_completed": 45,
      "total_assignments_completed": 12,
      "total_quiz_attempts": 18,
      "average_lesson_completion_time": 25, // minutes
      "last_learning_activity": 1672531200000 // timestamp
    },
    "education": {
      "course_stats": {
        "total_enrolled": 5,
        "active_courses": 3,
        "completed_courses": 2,
        "on_hold_courses": 0,
        "cancelled_courses": 0,
        "expired_courses": 0,
        "average_progress": 67.5,
        "total_certificates": 2,
        "total_payments": 1500,
        "emi_enrollments": 1,
        "subscription_enrollments": 2
      },
      "learning_paths": [
        {
          "category": "Web Development",
          "courses_count": 3,
          "completed_count": 1,
          "total_progress": 180,
          "average_progress": 60
        }
      ],
      "enrollments": [
        {
          "id": "enrollment_id",
          "course": {
            "id": "course_id",
            "title": "Full Stack Web Development",
            "subtitle": "Complete course on modern web development",
            "description": "Learn React, Node.js, and MongoDB",
            "image": "https://example.com/course-image.jpg",
            "level": "intermediate",
            "category": "Web Development",
            "language": "English",
            "duration": "40 hours",
            "sessions": 20,
            "class_type": "online",
            "status": "published",
            "tools_technologies": ["React", "Node.js", "MongoDB"]
          },
          "enrollment_date": "2024-01-01T00:00:00.000Z",
          "status": "active",
          "enrollment_type": "paid",
          "enrollment_source": "website",
          "access_expiry_date": "2024-12-31T00:00:00.000Z",
          "progress": {
            "overall_percentage": 75,
            "lessons_completed": 15,
            "last_activity_date": "2024-01-15T00:00:00.000Z",
            "detailed_progress": []
          },
          "batch_info": {
            "id": "batch_id",
            "name": "Batch Jan 2024",
            "start_date": "2024-01-01T00:00:00.000Z",
            "end_date": "2024-03-31T00:00:00.000Z",
            "status": "active",
            "capacity": 30,
            "enrolled_students": 25,
            "instructor": "instructor_id",
            "schedule": []
          },
          "pricing": {
            "original_price": 500,
            "final_price": 400,
            "discount_applied": 100
          },
          "payment_plan": "installment",
          "total_amount_paid": 200,
          "certificate_issued": false,
          "certificate_id": null
        }
      ],
      "active_learning": [
        {
          "enrollment_id": "enrollment_id",
          "course_title": "Full Stack Web Development",
          "course_image": "https://example.com/course-image.jpg",
          "progress": 75,
          "lessons_completed": 15,
          "last_accessed": "2024-01-15T00:00:00.000Z",
          "curriculum_progress": []
        }
      ],
      "upcoming_courses": [
        {
          "enrollment_id": "enrollment_id",
          "course_title": "Advanced React",
          "course_image": "https://example.com/course-image.jpg",
          "start_date": "2024-02-01T00:00:00.000Z",
          "batch_name": "Batch Feb 2024",
          "instructor": "instructor_id",
          "schedule": []
        }
      ],
      "quiz_results": [
        {
          "quiz_id": "quiz_id",
          "title": "JavaScript Fundamentals Quiz",
          "course_id": "course_id",
          "max_attempts": 3,
          "time_limit": 30,
          "total_marks": 100,
          "user_score": 85,
          "attempts_used": 2
        }
      ],
      "certificates": [
        {
          "certificate_id": "cert_id",
          "course_id": "course_id",
          "course_title": "JavaScript Fundamentals",
          "course_image": "https://example.com/course-image.jpg",
          "certificate_number": "CERT2024001",
          "issued_date": "2024-01-15T00:00:00.000Z",
          "certificate_url": "https://example.com/certificate.pdf",
          "certificate_type": "completion",
          "grade": "A",
          "instructor_name": "John Doe",
          "valid_until": "2025-01-15T00:00:00.000Z",
          "verification_url": "https://example.com/verify/CERT2024001"
        }
      ],
      "detailed_progress": [
        {
          "progress_id": "progress_id",
          "course_id": "course_id",
          "course_title": "JavaScript Fundamentals",
          "course_image": "https://example.com/course-image.jpg",
          "overall_progress": 100,
          "lessons_completed": 20,
          "assignments_completed": 5,
          "quizzes_completed": 3,
          "last_updated": "2024-01-15T00:00:00.000Z",
          "time_spent": 2400, // minutes
          "average_lesson_time": 120, // minutes
          "learning_path": "beginner-to-advanced",
          "milestones_reached": ["completed-basics", "completed-advanced"]
        }
      ]
    },
    "social_metrics": {
      "followers_count": 25,
      "following_count": 15,
      "reviews_written": 3,
      "discussions_participated": 8,
      "content_shared": 2,
      "community_reputation": 150,
      "profile_views": 45,
      "likes_received": 32
    },
    "engagement_metrics": {
      "total_logins": 125,
      "total_session_time": 18000, // minutes
      "avg_session_duration": 144, // minutes
      "last_active_date": "2024-01-15T00:00:00.000Z",
      "consecutive_active_days": 7,
      "total_page_views": 450,
      "login_frequency": {
        "daily": 0.8,
        "weekly": 5.6,
        "monthly": 24
      },
      "device_preference": "desktop",
      "browser_preference": "chrome",
      "login_pattern": {
        "pattern": "evening",
        "description": "Most active between 6-9 PM"
      }
    },
    "financial_metrics": {
      "total_spent": 1500,
      "total_courses_purchased": 5,
      "subscription_months": 12,
      "lifetime_value": 1500,
      "average_course_cost": 300,
      "payment_methods_used": ["credit_card", "paypal"],
      "pending_payments": 1,
      "total_emi_amount": 200,
      "successful_transactions": 8,
      "failed_transactions": 1,
      "pending_transactions": 1,
      "most_used_payment_method": {
        "credit_card": 6,
        "paypal": 3
      },
      "monthly_spending": {
        "2024-01": 500,
        "2024-02": 300,
        "2024-03": 700
      }
    },
    "payment_history": [
      {
        "source": "enrollment",
        "enrollment_id": "enrollment_id",
        "course_title": "Full Stack Web Development",
        "amount": 200,
        "currency": "USD",
        "payment_date": "2024-01-01T00:00:00.000Z",
        "payment_method": "credit_card",
        "transaction_id": "txn_12345",
        "payment_status": "completed",
        "receipt_url": "https://example.com/receipt.pdf",
        "payment_type": "course_enrollment"
      },
      {
        "source": "order",
        "order_id": "order_id",
        "course_title": "Advanced React Course",
        "amount": 300,
        "currency": "USD",
        "payment_date": "2024-01-15T00:00:00.000Z",
        "payment_method": "paypal",
        "transaction_id": "order_67890",
        "payment_status": "completed",
        "receipt_url": "https://example.com/receipt2.pdf",
        "payment_type": "purchase"
      }
    ],
    "emi_details": [
      {
        "enrollment_id": "enrollment_id",
        "course_title": "Full Stack Web Development",
        "total_amount": 400,
        "paid_amount": 200,
        "remaining_amount": 200,
        "installments_count": 4,
        "next_payment_date": "2024-02-01T00:00:00.000Z",
        "payment_status": "active"
      }
    ],
    "device_info": {
      "registered_devices": 3,
      "trusted_devices": 2,
      "active_sessions": 1,
      "last_login_device": {
        "device_type": "desktop",
        "device_name": "MacBook Pro",
        "browser": "Chrome",
        "os": "macOS",
        "is_trusted": true,
        "last_seen": "2024-01-15T00:00:00.000Z"
      },
      "device_breakdown": {
        "mobile": 1,
        "tablet": 0,
        "desktop": 2
      },
      "unique_ip_addresses": 5,
      "security_score": 95,
      "recent_login_locations": [
        {
          "device_type": "desktop",
          "last_seen": "2024-01-15T00:00:00.000Z",
          "location": "New York"
        }
      ]
    },
    "preferences": {
      "theme": "dark",
      "language": "en-US",
      "currency": "USD",
      "timezone": "America/New_York",
      "notifications": {
        "email": {
          "marketing": true,
          "course_updates": true,
          "system_alerts": true
        },
        "push": {
          "enabled": true
        },
        "sms": {
          "enabled": false
        }
      },
      "privacy": {
        "profile_visibility": "public",
        "activity_tracking": true,
        "data_analytics": true
      },
      "accessibility": {
        "screen_reader": false,
        "high_contrast": false,
        "large_text": false
      },
      "content": {
        "autoplay_videos": true,
        "preferred_video_quality": "1080p"
      }
    },
    "recent_activity": [
      {
        "action": "course_access",
        "resource": "Full Stack Web Development",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "details": {
          "lesson": "React Components"
        },
        "ip_address": "192.168.1.1",
        "device_type": "desktop",
        "duration": 45
      }
    ],
    "account_insights": {
      "account_age_days": 365,
      "member_since": "2024-01-01T00:00:00.000Z",
      "profile_completion_percentage": 85,
      "verification_status": {
        "email": true,
        "phone": false,
        "identity": false
      },
      "subscription_info": {
        "is_subscribed": true,
        "plan": "pro",
        "expires": "2024-12-31T00:00:00.000Z"
      },
      "security_info": {
        "two_factor_enabled": false,
        "security_score": 95,
        "trusted_devices": 2,
        "recent_login_attempts": 0
      }
    },
    "performance_indicators": {
      "learning_consistency": 7,
      "engagement_level": "medium",
      "progress_rate": 67.5,
      "community_involvement": 150,
      "payment_health": 50
    }
  }
}
```

### 2. Update Comprehensive Profile
**PUT** `/api/v1/profile/me/comprehensive`

**Description**: Updates user profile data (all fields except email and protected fields)

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body** (all fields are optional):
```json
{
  "full_name": "Updated Name",
  "username": "newusername",
  "password": "newpassword123",
  "phone_numbers": [
    {
      "country": "+1",
      "number": "9876543210",
      "is_primary": true
    }
  ],
  "age": 26,
  "age_group": "young-adult",
  "address": "New Address",
  "organization": "New Company",
  "bio": "Updated bio",
  "country": "Canada",
  "timezone": "America/Toronto",
  "facebook_link": "https://facebook.com/newuser",
  "instagram_link": "https://instagram.com/newuser",
  "linkedin_link": "https://linkedin.com/in/newuser",
  "twitter_link": "https://twitter.com/newuser",
  "youtube_link": "",
  "github_link": "https://github.com/newuser",
  "portfolio_link": "https://newportfolio.com",
  "user_image": {
    "url": "https://example.com/new-image.jpg",
    "public_id": "new_cloudinary_id",
    "alt_text": "New profile image"
  },
  "cover_image": {
    "url": "https://example.com/new-cover.jpg",
    "public_id": "new_cloudinary_cover_id",
    "alt_text": "New cover image"
  },
  "meta": {
    "date_of_birth": "1997-06-15T00:00:00.000Z",
    "gender": "female",
    "nationality": "Canadian",
    "languages_spoken": [
      {
        "language": "English",
        "proficiency": "native"
      },
      {
        "language": "French",
        "proficiency": "advanced"
      }
    ],
    "occupation": "Senior Software Developer",
    "industry": "Technology",
    "company": "Tech Innovations Inc",
    "experience_level": "senior",
    "annual_income_range": "75k-100k",
    "education_level": "Master's Degree",
    "institution_name": "University of Toronto",
    "field_of_study": "Computer Engineering",
    "graduation_year": 2021,
    "skills": ["JavaScript", "Python", "React", "Node.js", "AWS"],
    "certifications": [
      {
        "name": "AWS Solutions Architect",
        "issuer": "Amazon",
        "year": 2024,
        "credential_url": "https://aws.amazon.com/certification/"
      }
    ],
    "learning_goals": [
      {
        "goal": "Master Cloud Architecture",
        "priority": "high",
        "target_date": "2024-12-31T00:00:00.000Z",
        "progress": 30
      }
    ],
    "preferred_learning_style": "mixed",
    "available_time_per_week": 15,
    "preferred_study_times": [
      {
        "day": "saturday",
        "start_time": "09:00",
        "end_time": "12:00"
      },
      {
        "day": "sunday",
        "start_time": "14:00",
        "end_time": "17:00"
      }
    ],
    "interests": ["Cloud Computing", "DevOps", "Machine Learning", "Blockchain"]
  },
  "preferences": {
    "theme": "light",
    "language": "en-CA",
    "currency": "CAD",
    "timezone": "America/Toronto",
    "notifications": {
      "email": {
        "marketing": false,
        "course_updates": true,
        "system_alerts": true
      },
      "push": {
        "enabled": true
      },
      "sms": {
        "enabled": true
      }
    },
    "privacy": {
      "profile_visibility": "friends",
      "activity_tracking": false,
      "data_analytics": true
    },
    "accessibility": {
      "screen_reader": false,
      "high_contrast": true,
      "large_text": false
    },
    "content": {
      "autoplay_videos": false,
      "preferred_video_quality": "720p"
    }
  }
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "user_id",
      "full_name": "Updated Name",
      "username": "newusername",
      "student_id": "STU001",
      "profile_completion": 92,
      "updated_at": "2024-01-15T12:00:00.000Z"
    },
    "profile_completion": 92,
    "updated_fields": ["full_name", "username", "meta", "preferences"]
  }
}
```

## Protected Fields
The following fields **cannot** be updated through the comprehensive update endpoint:
- `email` - Use dedicated email update endpoint
- `role` - Admin only
- `admin_role` - Admin only
- `is_active` - Admin only
- `is_banned` - Admin only
- `account_type` - Admin only
- `subscription_status` - System managed
- `email_verified` - System managed
- `phone_verified` - System managed
- `identity_verified` - System managed
- `two_factor_enabled` - Use security settings
- `statistics` - System calculated
- `devices` - System managed
- `sessions` - System managed
- `activity_log` - System managed

## Validation Rules

### Basic Information
- `full_name`: 2-100 characters, letters/spaces/hyphens/apostrophes only
- `username`: 3-30 characters, alphanumeric and underscores only
- `password`: Minimum 8 characters (if provided)
- `age`: 13-120 years
- `bio`: Maximum 1000 characters

### Contact Information
- `phone_numbers`: Array of objects with `country` and `number`
- `address`: Maximum 500 characters
- `country`: Valid country name format

### Social Links
- All social links must be valid URLs or empty strings
- Empty strings are converted to `null`

### Meta Data
- `date_of_birth`: Valid ISO 8601 date
- `gender`: One of: male, female, non-binary, prefer-not-to-say, other
- `graduation_year`: Between 1950 and current year + 10
- `skills`: Array of 1-50 character strings
- `languages_spoken`: Array with `language` and `proficiency` fields

### Preferences
- `theme`: light, dark, auto, high_contrast
- `language`: Valid language code (e.g., en-US)
- `currency`: 3-letter currency code (e.g., USD)
- Boolean values for notification and privacy settings

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "full_name",
      "message": "Full name must be between 2 and 100 characters"
    }
  ]
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Unauthorized access"
}
```

### User Not Found (404)
```json
{
  "success": false,
  "message": "User not found"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error while retrieving comprehensive profile"
}
```

## Usage Examples

### Frontend Integration

#### React Component Example
```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/v1/profile/me/comprehensive', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setProfile(response.data.data);
      setFormData(response.data.data.basic_info);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  const updateProfile = async (updateData) => {
    try {
      const response = await axios.put('/api/v1/profile/me/comprehensive', updateData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        alert('Profile updated successfully!');
        fetchProfile(); // Refresh data
        setEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile(formData);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <img src={profile.profile_media.user_image.url} alt="Profile" />
        <h1>{profile.basic_info.full_name}</h1>
        <p>Profile Completion: {profile.basic_info.profile_completion}%</p>
      </div>

      <div className="profile-sections">
        {/* Basic Information */}
        <section className="basic-info">
          <h2>Basic Information</h2>
          {editing ? (
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Full Name"
              />
              <input
                type="text"
                value={formData.username || ''}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Username"
              />
              <textarea
                value={formData.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Bio"
              />
              <button type="submit">Save Changes</button>
              <button type="button" onClick={() => setEditing(false)}>Cancel</button>
            </form>
          ) : (
            <div>
              <p><strong>Name:</strong> {profile.basic_info.full_name}</p>
              <p><strong>Username:</strong> {profile.basic_info.username}</p>
              <p><strong>Email:</strong> {profile.basic_info.email}</p>
              <p><strong>Bio:</strong> {profile.basic_info.bio}</p>
              <button onClick={() => setEditing(true)}>Edit Profile</button>
            </div>
          )}
        </section>

        {/* Learning Analytics */}
        <section className="learning-analytics">
          <h2>Learning Progress</h2>
          <div className="stats-grid">
            <div className="stat">
              <h3>{profile.learning_analytics.total_courses_enrolled}</h3>
              <p>Courses Enrolled</p>
            </div>
            <div className="stat">
              <h3>{profile.learning_analytics.total_courses_completed}</h3>
              <p>Courses Completed</p>
            </div>
            <div className="stat">
              <h3>{profile.learning_analytics.certificates_earned}</h3>
              <p>Certificates Earned</p>
            </div>
            <div className="stat">
              <h3>{profile.learning_analytics.current_streak}</h3>
              <p>Day Streak</p>
            </div>
          </div>
        </section>

        {/* Courses */}
        <section className="courses">
          <h2>My Courses</h2>
          <div className="course-list">
            {profile.education.enrollments.map(enrollment => (
              <div key={enrollment.id} className="course-card">
                <img src={enrollment.course.image} alt={enrollment.course.title} />
                <div className="course-info">
                  <h3>{enrollment.course.title}</h3>
                  <p>Progress: {enrollment.progress.overall_percentage}%</p>
                  <p>Status: {enrollment.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Certificates */}
        <section className="certificates">
          <h2>My Certificates</h2>
          <div className="certificate-list">
            {profile.education.certificates.map(cert => (
              <div key={cert.certificate_id} className="certificate-card">
                <h3>{cert.course_title}</h3>
                <p>Certificate #{cert.certificate_number}</p>
                <p>Grade: {cert.grade}</p>
                <p>Issued: {new Date(cert.issued_date).toLocaleDateString()}</p>
                <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer">
                  Download Certificate
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Payment History */}
        <section className="payment-history">
          <h2>Payment History</h2>
          <div className="payment-summary">
            <p>Total Spent: ${profile.financial_metrics.total_spent}</p>
            <p>Successful Transactions: {profile.financial_metrics.successful_transactions}</p>
            <p>Pending EMI Amount: ${profile.financial_metrics.total_emi_amount}</p>
          </div>
          <div className="payment-list">
            {profile.payment_history.slice(0, 5).map((payment, index) => (
              <div key={index} className="payment-item">
                <div>
                  <h4>{payment.course_title}</h4>
                  <p>{new Date(payment.payment_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p>${payment.amount} {payment.currency}</p>
                  <span className={`status ${payment.payment_status}`}>
                    {payment.payment_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
```

#### Vue.js Component Example
```vue
<template>
  <div class="profile-page">
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else class="profile-content">
      <!-- Profile Header -->
      <div class="profile-header">
        <img :src="profile.profile_media.user_image.url" :alt="profile.basic_info.full_name" />
        <h1>{{ profile.basic_info.full_name }}</h1>
        <p>{{ profile.basic_info.email }}</p>
        <div class="profile-completion">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: profile.basic_info.profile_completion + '%' }"
            ></div>
          </div>
          <span>{{ profile.basic_info.profile_completion }}% Complete</span>
        </div>
      </div>

      <!-- Editable Form -->
      <form @submit.prevent="updateProfile" class="profile-form">
        <div class="form-section">
          <h2>Basic Information</h2>
          <div class="form-group">
            <label>Full Name</label>
            <input 
              v-model="formData.full_name" 
              type="text" 
              :disabled="!editing"
            />
          </div>
          <div class="form-group">
            <label>Username</label>
            <input 
              v-model="formData.username" 
              type="text" 
              :disabled="!editing"
            />
          </div>
          <div class="form-group">
            <label>Bio</label>
            <textarea 
              v-model="formData.bio" 
              :disabled="!editing"
            ></textarea>
          </div>
        </div>

        <div class="form-section">
          <h2>Personal Details</h2>
          <div class="form-group">
            <label>Date of Birth</label>
            <input 
              v-model="formData.meta.date_of_birth" 
              type="date" 
              :disabled="!editing"
            />
          </div>
          <div class="form-group">
            <label>Gender</label>
            <select v-model="formData.meta.gender" :disabled="!editing">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Occupation</label>
            <input 
              v-model="formData.meta.occupation" 
              type="text" 
              :disabled="!editing"
            />
          </div>
        </div>

        <div class="form-actions">
          <button v-if="!editing" type="button" @click="editing = true">
            Edit Profile
          </button>
          <template v-else>
            <button type="submit" :disabled="updating">
              {{ updating ? 'Saving...' : 'Save Changes' }}
            </button>
            <button type="button" @click="cancelEdit">Cancel</button>
          </template>
        </div>
      </form>

      <!-- Analytics Dashboard -->
      <div class="analytics-dashboard">
        <h2>Learning Analytics</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h3>{{ profile.learning_analytics.total_courses_enrolled }}</h3>
            <p>Total Courses</p>
          </div>
          <div class="stat-card">
            <h3>{{ profile.learning_analytics.certificates_earned }}</h3>
            <p>Certificates</p>
          </div>
          <div class="stat-card">
            <h3>{{ profile.learning_analytics.current_streak }}</h3>
            <p>Day Streak</p>
          </div>
          <div class="stat-card">
            <h3>{{ Math.round(profile.learning_analytics.completion_rate) }}%</h3>
            <p>Completion Rate</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ProfilePage',
  data() {
    return {
      profile: null,
      loading: true,
      editing: false,
      updating: false,
      formData: {}
    };
  },
  async mounted() {
    await this.fetchProfile();
  },
  methods: {
    async fetchProfile() {
      try {
        const response = await axios.get('/api/v1/profile/me/comprehensive', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        this.profile = response.data.data;
        this.formData = {
          full_name: this.profile.basic_info.full_name,
          username: this.profile.basic_info.username,
          bio: this.profile.basic_info.bio,
          meta: { ...this.profile.personal_details }
        };
        this.loading = false;
      } catch (error) {
        console.error('Error fetching profile:', error);
        this.loading = false;
      }
    },
    
    async updateProfile() {
      this.updating = true;
      try {
        const response = await axios.put('/api/v1/profile/me/comprehensive', this.formData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          this.$toast.success('Profile updated successfully!');
          await this.fetchProfile();
          this.editing = false;
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        this.$toast.error('Error updating profile');
      } finally {
        this.updating = false;
      }
    },
    
    cancelEdit() {
      this.editing = false;
      // Reset form data
      this.formData = {
        full_name: this.profile.basic_info.full_name,
        username: this.profile.basic_info.username,
        bio: this.profile.basic_info.bio,
        meta: { ...this.profile.personal_details }
      };
    }
  }
};
</script>

<style scoped>
.profile-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.profile-header {
  text-align: center;
  margin-bottom: 30px;
}

.profile-header img {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
}

.progress-bar {
  width: 200px;
  height: 10px;
  background-color: #e0e0e0;
  border-radius: 5px;
  margin: 10px auto;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}

.form-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.form-group input:disabled,
.form-group select:disabled,
.form-group textarea:disabled {
  background-color: #f5f5f5;
}

.form-actions {
  text-align: center;
  margin-top: 20px;
}

.form-actions button {
  margin: 0 10px;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.form-actions button[type="submit"] {
  background-color: #4caf50;
  color: white;
}

.form-actions button[type="button"] {
  background-color: #2196f3;
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.stat-card {
  text-align: center;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.stat-card h3 {
  font-size: 2em;
  margin: 0;
  color: #4caf50;
}

.loading {
  text-align: center;
  padding: 50px;
  font-size: 18px;
}
</style>
```

## Integration Notes

### Authentication
- All endpoints require valid JWT token in Authorization header
- Token format: `Bearer <jwt_token>`

### Rate Limiting
- GET endpoint: 100 requests per minute per user
- PUT endpoint: 20 requests per minute per user

### Caching
- Profile data is cached for 5 minutes
- Cache invalidated on successful updates

### Performance Optimization
- Use pagination for large datasets (payment history, activity logs)
- Implement lazy loading for non-critical sections
- Consider using GraphQL for selective field fetching

### Security Considerations
- Email updates require separate verification flow
- Password changes require current password confirmation
- Protected fields cannot be modified through this endpoint
- All updates are logged in user activity

### Data Consistency
- Profile completion percentage is automatically calculated
- Statistics are updated in real-time
- Payment data is synchronized across models

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check JWT token validity
   - Ensure proper Authorization header format

2. **Validation Errors**
   - Check field formats and constraints
   - Ensure required nested object structures

3. **Performance Issues**
   - Consider reducing response payload size
   - Implement client-side caching
   - Use pagination for large datasets

4. **Data Inconsistencies**
   - Refresh token if needed
   - Check for concurrent updates
   - Verify model relationships

### Support
For technical support or questions about this API, please contact the development team or create an issue in the project repository. 