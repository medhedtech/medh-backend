# Enhanced Demo Registration API Documentation

## Overview

The Enhanced Demo Registration API provides a comprehensive solution for users to access the Medh Learning Platform with scheduled demo sessions, Zoom integration, and calendar management. This system allows users to register for personalized demo sessions while exploring the platform immediately.

## Core Features

- **Enhanced demo registration**: Users register with course preferences and session scheduling
- **Zoom integration**: Automatic meeting creation for demo sessions
- **Calendar integration**: ICS file generation and calendar app integration
- **Course category selection**: Personalized demo sessions based on user interests
- **Timing preferences**: Flexible scheduling based on user availability
- **Automatic conversion**: Demo accounts automatically convert to regular accounts when passwords are set
- **Comprehensive validation**: Robust input validation and error handling
- **Security measures**: Account lockout protection and audit logging

## API Endpoints

### 1. Enhanced Demo User Registration

**Endpoint:** `POST /api/v1/auth/demo-register`
**Description:** Register a new demo user with course preferences and session scheduling
**Access:** Public

#### Request Body

```json
{
  "full_name": "John Doe",
  "email": "john.doe@example.com",
  "username": "johndoe123",
  "phone_numbers": [
    {
      "country": "US",
      "number": "+1234567890"
    }
  ],
  "gender": "male",
  "referral_source": "google",
  "course_category": "web_development",
  "grade_level": "intermediate",
  "preferred_timing": "evening",
  "preferred_timezone": "America/New_York",
  "preferred_days": ["monday", "wednesday", "friday"],
  "session_duration": 90
}
```

#### Required Fields

- `full_name`: String (2-100 characters, letters and spaces only)
- `email`: Valid email address
- `course_category`: String (web_development, data_science, mobile_development, cloud_computing, cybersecurity, ai_machine_learning, devops, ui_ux_design, digital_marketing, project_management, other)
- `grade_level`: String (beginner, intermediate, advanced, expert)
- `preferred_timing`: String (morning, afternoon, evening, flexible)

#### Optional Fields

- `username`: String (3-30 characters, letters, numbers, underscores)
- `phone_numbers`: Array of phone objects with country and number
- `gender`: String (male, female, non-binary, prefer-not-to-say, other)
- `referral_source`: String (source of referral)
- `preferred_timezone`: String (timezone identifier, defaults to UTC)
- `preferred_days`: Array of strings (monday, tuesday, wednesday, thursday, friday, saturday, sunday)
- `session_duration`: Number (30-180 minutes, defaults to 60)

#### Response (Success - 201)

```json
{
  "success": true,
  "message": "Demo account created successfully with scheduled session. You can start exploring immediately!",
  "data": {
    "user": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "username": "johndoe123",
      "student_id": "DEMO-2024-000001",
      "role": "student",
      "is_demo": true,
      "password_set": false,
      "first_login_completed": false,
      "email_verified": true,
      "account_type": "free",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "demo_session": {
      "course_category": "web_development",
      "grade_level": "intermediate",
      "preferred_timing": "evening",
      "session_duration": 90,
      "demo_scheduled": true,
      "zoom_meeting": {
        "meeting_url": "https://zoom.us/j/123456789",
        "meeting_id": "123456789",
        "meeting_password": "abc123",
        "scheduled_for": "2024-01-02T18:00:00.000Z",
        "duration": 90
      },
      "calendar_event": {
        "event_url": "https://app.medh.co/demo/calendar-event/medh-demo-xyz123",
        "ics_download": "https://api.medh.co/api/v1/demo/calendar/medh-demo-xyz123.ics"
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "session_id": "abc123def456",
    "expires_in": "24h",
    "next_steps": {
      "message": "Your demo session is scheduled! You can start exploring the platform immediately and set up a password anytime to secure your account.",
      "password_setup_required": true,
      "demo_session_scheduled": true
    }
  }
}
```

#### Response (Error - 409)

```json
{
  "success": false,
  "message": "An account with this email already exists",
  "details": {
    "email_taken": true,
    "existing_user_type": "demo"
  }
}
```

### 2. Unified Login

**Endpoint:** `POST /api/v1/auth/login`
**Description:** Unified login endpoint for both demo and regular users
**Access:** Public

#### Request Body

```json
{
  "email": "john.doe@example.com",
  "password": "optional_password",
  "remember_me": false
}
```

#### Required Fields

- `email`: Valid email address

#### Optional Fields

- `password`: String (required for regular users, optional for demo users)
- `remember_me`: Boolean (extends token expiry to 30 days)

#### Response (Demo User - Password Setup Required)

```json
{
  "success": true,
  "message": "Demo account found. Please set up your password to continue.",
  "requires_password_setup": true,
  "user_type": "demo",
  "data": {
    "user": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "username": "johndoe123",
      "is_demo": true,
      "password_set": false
    },
    "setup_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Response (Successful Login)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "username": "johndoe123",
      "role": "student",
      "student_id": "DEMO-2024-000001",
      "is_demo": true,
      "password_set": true,
      "first_login_completed": true,
      "account_type": "free",
      "is_online": true,
      "statistics": {},
      "preferences": {}
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "session_id": "abc123def456",
    "expires_in": "24h",
    "user_type": "demo"
  }
}
```

### 3. Demo Password Setup

**Endpoint:** `POST /api/v1/auth/demo/set-password`
**Description:** Set password for demo user and automatically convert to regular account
**Access:** Private (Demo users with valid token)

#### Request Body

```json
{
  "password": "MySecurePassword123!",
  "confirm_password": "MySecurePassword123!"
}
```

#### Required Fields

- `password`: String (min 8 characters, must contain uppercase, lowercase, number, special character)
- `confirm_password`: String (must match password)

#### Response (Success - 200)

```json
{
  "success": true,
  "message": "Password set successfully and account converted to regular account",
  "data": {
    "user": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "username": "johndoe123",
      "student_id": "MED-2024-000001",
      "role": "student",
      "is_demo": false,
      "password_set": true,
      "first_login_completed": true,
      "account_converted": true,
      "conversion_date": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": "24h",
    "user_type": "regular"
  }
}
```

### 4. Demo Status

**Endpoint:** `GET /api/v1/auth/demo/status`
**Description:** Get current demo user status and available actions
**Access:** Private (Demo users only)

#### Response (Success - 200)

```json
{
  "success": true,
  "message": "Demo status retrieved successfully",
  "data": {
    "user": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "username": "johndoe123",
      "is_demo": true,
      "password_set": false,
      "first_login_completed": false
    },
    "actions_available": {
      "can_set_password": true,
      "needs_password_setup": true,
      "auto_convert_on_password": true
    }
  }
}
```

### 5. Download Calendar ICS File

**Endpoint:** `GET /api/v1/auth/demo/calendar/:eventId.ics`
**Description:** Download calendar ICS file for demo session
**Access:** Public

#### Parameters

- `eventId`: String (calendar event ID)

#### Response (Success - 200)

```
Content-Type: text/calendar; charset=utf-8
Content-Disposition: attachment; filename="medh-demo-xyz123.ics"

BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Medh Learning Platform//Demo Session//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:medh-demo-xyz123@medh.co
DTSTART:20240102T180000Z
DTEND:20240102T193000Z
DTSTAMP:20240101T120000Z
SUMMARY:Medh Demo Session - WEB DEVELOPMENT
DESCRIPTION:Welcome to your Medh Learning Platform demo session!...
LOCATION:https://zoom.us/j/123456789
ORGANIZER;CN=Medh Learning Platform:MAILTO:noreply@medh.co
ATTENDEE;CN=John Doe;RSVP=TRUE:MAILTO:john.doe@example.com
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Demo session reminder - 15 minutes
END:VALARM
END:VEVENT
END:VCALENDAR
```

#### Response (Error - 404)

```json
{
  "success": false,
  "message": "Calendar event not found"
}
```

## Course Categories

### Available Categories

- `web_development`: Web Development
- `data_science`: Data Science
- `mobile_development`: Mobile Development
- `cloud_computing`: Cloud Computing
- `cybersecurity`: Cybersecurity
- `ai_machine_learning`: AI & Machine Learning
- `devops`: DevOps
- `ui_ux_design`: UI/UX Design
- `digital_marketing`: Digital Marketing
- `project_management`: Project Management
- `other`: Other

### Grade Levels

- `beginner`: Beginner Level
- `intermediate`: Intermediate Level
- `advanced`: Advanced Level
- `expert`: Expert Level

### Timing Preferences

- `morning`: 9 AM - 12 PM
- `afternoon`: 12 PM - 5 PM
- `evening`: 5 PM - 8 PM
- `flexible`: Any time

## Zoom Integration

### Meeting Creation

- Automatic Zoom meeting creation for each demo session
- Personalized meeting topics based on course category and grade level
- Meeting passwords for security
- Recording enabled for future reference
- Join before host enabled for user convenience

### Meeting Details

- Meeting URL for direct access
- Meeting ID for manual entry
- Meeting password for security
- Host start URL for instructors
- Scheduled time based on user preferences

## Calendar Integration

### ICS File Generation

- Standard ICS format for universal calendar compatibility
- Detailed event descriptions with preparation tips
- Multiple reminder alarms (15 minutes and 1 hour before)
- Attendee information and RSVP tracking
- Event location with Zoom meeting URL

### Calendar App Integration

- Google Calendar direct link
- Outlook Calendar direct link
- ICS file download for other calendar applications
- Automatic timezone handling
- Event updates and modifications

## User Flow

### 1. Enhanced Demo Registration Flow

1. User visits registration page
2. User fills basic information and course preferences
3. User selects timing preferences and session duration
4. System creates demo account with immediate access
5. System automatically creates Zoom meeting
6. System generates calendar event with ICS file
7. User receives welcome email with session details
8. User can add event to calendar and access Zoom meeting

### 2. Demo Session Flow

1. User receives email with session details
2. User adds event to calendar using provided links
3. User joins Zoom meeting at scheduled time
4. Instructor provides personalized demo based on preferences
5. User completes feedback after session
6. System tracks session completion

### 3. Password Setup and Conversion Flow

1. Demo user decides to set password
2. User provides password and confirmation
3. System validates password strength
4. Account automatically converts to regular account
5. Demo session data is preserved
6. User receives conversion confirmation email
7. User continues with full account access

## Security Features

### Account Lockout Protection

- Progressive lockout system (1 min → 5 min → 15 min → 30 min → 1 hour → 2 hours → 4 hours → 24 hours)
- Separate attempt counters for login and password changes
- Automatic lockout reset after expiry
- Admin unlock capabilities

### Password Requirements

- Minimum 8 characters
- Must contain uppercase letter
- Must contain lowercase letter
- Must contain number
- Must contain special character
- No common patterns allowed

### Zoom Security

- Meeting passwords required
- Waiting room disabled for demo sessions
- Recording permissions controlled
- Host key protection
- Meeting ID encryption

### Calendar Security

- Event ID encryption
- Access control for ICS downloads
- No sensitive data in calendar descriptions
- Secure event URLs

## Error Handling

### Validation Errors (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "course_category",
      "message": "Please select a valid course category"
    },
    {
      "field": "grade_level",
      "message": "Please select a valid grade level"
    }
  ]
}
```

### Zoom Integration Errors

```json
{
  "success": true,
  "message": "Demo account created successfully. Zoom meeting creation failed but you can still explore the platform.",
  "data": {
    "user": {},
    "demo_session": {
      "course_category": "web_development",
      "grade_level": "intermediate",
      "demo_scheduled": false,
      "zoom_meeting": null,
      "calendar_event": null
    }
  }
}
```

## Best Practices

### For Frontend Integration

1. **Handle Enhanced Registration**: Implement course category and timing selection
2. **Calendar Integration**: Provide easy calendar app integration
3. **Zoom Meeting Access**: Display meeting details prominently
4. **Session Reminders**: Show upcoming session information
5. **Feedback Collection**: Implement post-session feedback forms

### For API Consumers

1. **Handle Integration Failures**: Gracefully handle Zoom/Calendar failures
2. **Timezone Handling**: Properly handle user timezones
3. **Calendar Downloads**: Implement ICS file download functionality
4. **Meeting Management**: Track and display meeting status
5. **Session Analytics**: Monitor session completion rates

## Monitoring and Analytics

### Key Metrics

- Demo registration with session scheduling rate
- Session attendance rate
- Session completion rate
- Demo to regular conversion rate
- Course category popularity
- Timing preference distribution
- Calendar integration usage

### Logging Events

- `demo_register`: Demo user registration with session details
- `demo_scheduled`: Demo session scheduled
- `demo_completed`: Demo session completed
- `zoom_meeting_created`: Zoom meeting created
- `calendar_event_generated`: Calendar event generated
- `ics_downloaded`: ICS file downloaded

This enhanced documentation provides a comprehensive guide for implementing and integrating with the Enhanced Demo Registration API system with Zoom and calendar integration.
