# Demo Booking Form - Complete Integration Guide

## Overview

This guide provides comprehensive documentation for integrating a **Demo Booking Form** with the MEDH Universal Form API. The demo booking form allows students and parents to schedule free demo sessions for live courses, with intelligent handling for different age groups and automated user account creation.

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Data Structures](#data-structures)
3. [Validation Rules](#validation-rules)
4. [Integration Examples](#integration-examples)
5. [Error Handling](#error-handling)
6. [Admin Management](#admin-management)
7. [Email Notifications](#email-notifications)
8. [Frontend Integration](#frontend-integration)
9. [Testing Guide](#testing-guide)

---

## API Endpoints

### 1. Submit Demo Booking Form

**Endpoint**: `POST /api/v1/forms/submit`

**Access**: Public

**Description**: Submit a demo booking form with automatic user creation and session scheduling.

**Headers**:

```http
Content-Type: application/json
Accept: application/json
```

**Request Body**:

```json
{
  "form_type": "book_a_free_demo_session",
  "is_student_under_16": false,
  "contact_info": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "mobile_number": {
      "country_code": "+91",
      "number": "9876543210"
    },
    "city": "Mumbai",
    "country": "India"
  },
  "student_details": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "highest_qualification": "12th_passed",
    "currently_studying": true,
    "currently_working": false,
    "education_institute_name": "ABC College",
    "preferred_course": ["COURSE_ID_1", "COURSE_ID_2"],
    "preferred_timings": "Evening sessions preferred"
  },
  "demo_session_details": {
    "preferred_date": "2024-02-15T00:00:00.000Z",
    "preferred_time_slot": "18:00-19:00",
    "timezone": "Asia/Kolkata"
  },
  "consent": {
    "terms_and_privacy": true,
    "data_collection_consent": true,
    "marketing_consent": false
  },
  "captcha_token": "CAPTCHA_TOKEN_HERE"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Demo session booking submitted successfully. You will receive confirmation details shortly.",
  "data": {
    "application_id": "BOO20240215ABC12345",
    "form_type": "book_a_free_demo_session",
    "status": "submitted",
    "submitted_at": "2024-02-15T10:30:00.000Z",
    "acknowledgment_sent": true,
    "demo_session_details": {
      "preferred_date": "2024-02-15T00:00:00.000Z",
      "preferred_time_slot": "18:00-19:00",
      "demo_status": "scheduled"
    }
  }
}
```

### 2. Get Available Live Courses

**Endpoint**: `GET /api/v1/forms/live-courses`

**Access**: Public

**Description**: Get list of available live courses for demo booking.

**Query Parameters**:

- `category` (optional): Filter by course category
- `grade_level` (optional): Filter by grade level
- `limit` (optional): Number of results (default: 20)

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "course_id": "COURSE_ID_1",
      "title": "Python Programming Fundamentals",
      "category": "Programming",
      "grade_level": "high_school",
      "description": "Learn Python from basics to advanced",
      "duration": "8 weeks",
      "next_batch_start": "2024-03-01T00:00:00.000Z"
    }
  ]
}
```

### 3. Get Countries List

**Endpoint**: `GET /api/v1/forms/countries`

**Access**: Public

**Description**: Get list of countries with phone codes for form dropdowns.

**Query Parameters**:

- `format` (optional): `phone` for phone codes, `standard` for country names
- `popular` (optional): `true` to get popular countries first
- `search` (optional): Search countries by name

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "name": "India",
      "code": "IN",
      "phone_code": "+91",
      "popular": true
    },
    {
      "name": "United States",
      "code": "US",
      "phone_code": "+1",
      "popular": true
    }
  ]
}
```

### 4. Auto-fill Data (Authenticated Users)

**Endpoint**: `GET /api/v1/forms/auto-fill`

**Access**: Private (requires authentication)

**Headers**:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:

```json
{
  "success": true,
  "data": {
    "contact_info": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "mobile_number": {
        "country_code": "+91",
        "number": "9876543210"
      },
      "city": "Mumbai",
      "country": "India"
    },
    "auto_fill_source": "user_profile"
  }
}
```

---

## Data Structures

### Contact Information Schema

```typescript
interface ContactInfo {
  first_name: string; // Required, 2-100 characters
  middle_name?: string; // Optional, alphabets only
  last_name: string; // Required, 2-100 characters
  full_name?: string; // Auto-generated
  email: string; // Required, valid email format
  mobile_number: {
    country_code: string; // Required, format: +XX
    number: string; // Required, valid phone number
    formatted?: string; // Auto-generated
  };
  city: string; // Required
  country: string; // Required, valid country name/code
  address?: string; // Optional
  social_profiles?: {
    linkedin?: string; // Valid LinkedIn URL
    portfolio?: string; // Valid URL
  };
}
```

### Student Details Schema (Age 16+)

```typescript
interface StudentDetails {
  name: string; // Required, alphabets only
  email?: string; // Optional, valid email
  highest_qualification:
    | "10th_passed"
    | "12th_passed"
    | "undergraduate"
    | "graduate"
    | "post_graduate"; // Required for 16+
  currently_studying: boolean; // Required for 16+
  currently_working: boolean; // Required for 16+
  education_institute_name?: string; // Optional
  preferred_course: string[]; // Required, course IDs
  preferred_timings?: string; // Optional
}
```

### Student Details Schema (Under 16)

```typescript
interface StudentDetailsUnder16 {
  name: string; // Required, alphabets only
  grade:
    | "grade_1-2"
    | "grade_3-4"
    | "grade_5-6"
    | "grade_7-8"
    | "grade_9-10"
    | "grade_11-12"
    | "home_study"; // Required for under 16
  school_name?: string; // Optional
  preferred_course: string[]; // Required, course IDs
  preferred_timings?: string; // Optional
}
```

### Demo Session Details Schema

```typescript
interface DemoSessionDetails {
  preferred_date?: Date; // Future date only
  preferred_time_slot?:
    | "09:00-10:00"
    | "10:00-11:00"
    | "11:00-12:00"
    | "12:00-13:00"
    | "13:00-14:00"
    | "14:00-15:00"
    | "15:00-16:00"
    | "16:00-17:00"
    | "17:00-18:00"
    | "18:00-19:00"
    | "19:00-20:00"
    | "20:00-21:00";
  timezone: string; // Default: "Asia/Kolkata"
  demo_status:
    | "scheduled"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "rescheduled";
  zoom_meeting_id?: string; // Auto-generated
  zoom_meeting_url?: string; // Auto-generated
  zoom_passcode?: string; // Auto-generated
  instructor_assigned?: string; // User ID
}
```

### Consent Schema

```typescript
interface Consent {
  terms_and_privacy: boolean; // Required: true
  data_collection_consent: boolean; // Required: true
  marketing_consent: boolean; // Optional, default: false
}
```

---

## Validation Rules

### Field Validation

| Field                        | Validation Rules                          |
| ---------------------------- | ----------------------------------------- |
| `first_name`                 | Required, 2-100 chars, alphabets only     |
| `last_name`                  | Required, 2-100 chars, alphabets only     |
| `email`                      | Required, valid email format              |
| `mobile_number.country_code` | Required, format: +XX (1-4 digits)        |
| `mobile_number.number`       | Required, valid phone number for country  |
| `city`                       | Required, non-empty string                |
| `country`                    | Required, valid country name or code      |
| `student_details.name`       | Required, alphabets only                  |
| `preferred_course`           | Required, array with at least 1 course ID |
| `highest_qualification`      | Required for 16+, valid enum value        |
| `grade`                      | Required for under 16, valid enum value   |
| `currently_studying`         | Required boolean for 16+                  |
| `currently_working`          | Required boolean for 16+                  |
| `preferred_date`             | Must be future date if provided           |
| `terms_and_privacy`          | Required: true                            |
| `data_collection_consent`    | Required: true                            |
| `captcha_token`              | Required, valid captcha token             |

### Business Logic Validation

1. **Age-based Validation**:

   - If `is_student_under_16` is true, `parent_details` is required
   - If `is_student_under_16` is false, `student_details` with adult fields required

2. **Contact Information**:

   - For under 16: Parent contact info in `contact_info`
   - For 16+: Student contact info in `contact_info`

3. **Course Selection**:

   - At least one course must be selected
   - Course IDs must be valid and active

4. **Demo Session**:
   - Preferred date must be at least 24 hours in the future
   - Time slots must be within available hours (9 AM - 9 PM IST)

---

## Integration Examples

### Frontend JavaScript Integration

```javascript
class DemoBookingForm {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
  }

  async getCountries() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/forms/countries`);
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error("Failed to fetch countries:", error);
      return [];
    }
  }

  async getLiveCourses(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(
        `${this.apiBaseUrl}/api/v1/forms/live-courses?${params}`,
      );
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error("Failed to fetch courses:", error);
      return [];
    }
  }

  async submitDemoBooking(formData) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/forms/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          form_type: "book_a_free_demo_session",
          ...formData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Submission failed");
      }

      return result;
    } catch (error) {
      console.error("Demo booking submission failed:", error);
      throw error;
    }
  }

  async getAutoFillData(authToken) {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/v1/forms/auto-fill`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        return data.success ? data.data : null;
      }
      return null;
    } catch (error) {
      console.error("Auto-fill failed:", error);
      return null;
    }
  }
}

// Usage Example
const demoForm = new DemoBookingForm("https://api.medh.co");

// Submit demo booking
async function submitDemo() {
  const formData = {
    is_student_under_16: false,
    contact_info: {
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
      mobile_number: {
        country_code: "+91",
        number: "9876543210",
      },
      city: "Mumbai",
      country: "India",
    },
    student_details: {
      name: "John Doe",
      email: "john@example.com",
      highest_qualification: "12th_passed",
      currently_studying: true,
      currently_working: false,
      preferred_course: ["COURSE_ID_1"],
    },
    demo_session_details: {
      preferred_date: new Date("2024-02-20"),
      preferred_time_slot: "18:00-19:00",
      timezone: "Asia/Kolkata",
    },
    consent: {
      terms_and_privacy: true,
      data_collection_consent: true,
      marketing_consent: false,
    },
    captcha_token: "CAPTCHA_TOKEN",
  };

  try {
    const result = await demoForm.submitDemoBooking(formData);
    console.log("Success:", result);
    // Handle success - show confirmation
  } catch (error) {
    console.error("Error:", error);
    // Handle error - show error message
  }
}
```

### React Component Example

```jsx
import React, { useState, useEffect } from "react";

const DemoBookingForm = () => {
  const [formData, setFormData] = useState({
    is_student_under_16: false,
    contact_info: {
      first_name: "",
      last_name: "",
      email: "",
      mobile_number: {
        country_code: "+91",
        number: "",
      },
      city: "",
      country: "India",
    },
    student_details: {
      name: "",
      email: "",
      highest_qualification: "",
      currently_studying: false,
      currently_working: false,
      preferred_course: [],
    },
    demo_session_details: {
      preferred_date: "",
      preferred_time_slot: "",
      timezone: "Asia/Kolkata",
    },
    consent: {
      terms_and_privacy: false,
      data_collection_consent: false,
      marketing_consent: false,
    },
  });

  const [countries, setCountries] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadCountries();
    loadCourses();
  }, []);

  const loadCountries = async () => {
    try {
      const response = await fetch("/api/v1/forms/countries");
      const data = await response.json();
      if (data.success) setCountries(data.data);
    } catch (error) {
      console.error("Failed to load countries:", error);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await fetch("/api/v1/forms/live-courses");
      const data = await response.json();
      if (data.success) setCourses(data.data);
    } catch (error) {
      console.error("Failed to load courses:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/v1/forms/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          form_type: "book_a_free_demo_session",
          ...formData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Show success message
        alert("Demo session booked successfully!");
        // Reset form or redirect
      } else {
        setErrors(result.errors || {});
      }
    } catch (error) {
      console.error("Submission error:", error);
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = [
    "09:00-10:00",
    "10:00-11:00",
    "11:00-12:00",
    "12:00-13:00",
    "13:00-14:00",
    "14:00-15:00",
    "15:00-16:00",
    "16:00-17:00",
    "17:00-18:00",
    "18:00-19:00",
    "19:00-20:00",
    "20:00-21:00",
  ];

  return (
    <form onSubmit={handleSubmit} className="demo-booking-form">
      <h2>Book Your Free Demo Session</h2>

      {/* Age Selection */}
      <div className="form-section">
        <label>
          <input
            type="checkbox"
            checked={formData.is_student_under_16}
            onChange={(e) =>
              setFormData({
                ...formData,
                is_student_under_16: e.target.checked,
              })
            }
          />
          Student is under 16 years old
        </label>
      </div>

      {/* Contact Information */}
      <div className="form-section">
        <h3>Contact Information</h3>
        <input
          type="text"
          placeholder="First Name"
          value={formData.contact_info.first_name}
          onChange={(e) =>
            setFormData({
              ...formData,
              contact_info: {
                ...formData.contact_info,
                first_name: e.target.value,
              },
            })
          }
          required
        />

        <input
          type="text"
          placeholder="Last Name"
          value={formData.contact_info.last_name}
          onChange={(e) =>
            setFormData({
              ...formData,
              contact_info: {
                ...formData.contact_info,
                last_name: e.target.value,
              },
            })
          }
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={formData.contact_info.email}
          onChange={(e) =>
            setFormData({
              ...formData,
              contact_info: {
                ...formData.contact_info,
                email: e.target.value,
              },
            })
          }
          required
        />

        <select
          value={formData.contact_info.country}
          onChange={(e) =>
            setFormData({
              ...formData,
              contact_info: {
                ...formData.contact_info,
                country: e.target.value,
              },
            })
          }
          required
        >
          {countries.map((country) => (
            <option key={country.code} value={country.name}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      {/* Course Selection */}
      <div className="form-section">
        <h3>Course Interest</h3>
        {courses.map((course) => (
          <label key={course.course_id}>
            <input
              type="checkbox"
              checked={formData.student_details.preferred_course.includes(
                course.course_id,
              )}
              onChange={(e) => {
                const courses = formData.student_details.preferred_course;
                if (e.target.checked) {
                  setFormData({
                    ...formData,
                    student_details: {
                      ...formData.student_details,
                      preferred_course: [...courses, course.course_id],
                    },
                  });
                } else {
                  setFormData({
                    ...formData,
                    student_details: {
                      ...formData.student_details,
                      preferred_course: courses.filter(
                        (id) => id !== course.course_id,
                      ),
                    },
                  });
                }
              }}
            />
            {course.title}
          </label>
        ))}
      </div>

      {/* Demo Session Timing */}
      <div className="form-section">
        <h3>Preferred Demo Time</h3>
        <input
          type="date"
          value={formData.demo_session_details.preferred_date}
          onChange={(e) =>
            setFormData({
              ...formData,
              demo_session_details: {
                ...formData.demo_session_details,
                preferred_date: e.target.value,
              },
            })
          }
          min={new Date().toISOString().split("T")[0]}
        />

        <select
          value={formData.demo_session_details.preferred_time_slot}
          onChange={(e) =>
            setFormData({
              ...formData,
              demo_session_details: {
                ...formData.demo_session_details,
                preferred_time_slot: e.target.value,
              },
            })
          }
        >
          <option value="">Select Time Slot</option>
          {timeSlots.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
      </div>

      {/* Consent */}
      <div className="form-section">
        <label>
          <input
            type="checkbox"
            checked={formData.consent.terms_and_privacy}
            onChange={(e) =>
              setFormData({
                ...formData,
                consent: {
                  ...formData.consent,
                  terms_and_privacy: e.target.checked,
                },
              })
            }
            required
          />
          I agree to the Terms of Service and Privacy Policy
        </label>
      </div>

      {/* Error Display */}
      {errors.general && <div className="error-message">{errors.general}</div>}

      <button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Book Free Demo"}
      </button>
    </form>
  );
};

export default DemoBookingForm;
```

---

## Error Handling

### Common Error Responses

#### Validation Errors (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "type": "field",
      "msg": "First name is required",
      "path": "contact_info.first_name",
      "location": "body"
    },
    {
      "type": "field",
      "msg": "Please provide a valid email address",
      "path": "contact_info.email",
      "location": "body"
    }
  ]
}
```

#### Business Logic Errors (400)

```json
{
  "success": false,
  "message": "Invalid request data",
  "error": "For students under 16, parent details are required",
  "code": "PARENT_DETAILS_REQUIRED"
}
```

#### Server Errors (500)

```json
{
  "success": false,
  "message": "Internal server error while processing demo booking",
  "error": "Database connection failed",
  "timestamp": "2024-02-15T10:30:00.000Z"
}
```

### Error Handling Best Practices

1. **Client-Side Validation**: Validate on frontend before submission
2. **Graceful Degradation**: Handle API failures gracefully
3. **User-Friendly Messages**: Convert technical errors to user-friendly messages
4. **Retry Logic**: Implement retry for transient failures
5. **Logging**: Log errors for debugging while protecting user privacy

```javascript
// Error handling utility
class ErrorHandler {
  static handleApiError(error, response) {
    if (response?.data?.errors) {
      // Validation errors
      const fieldErrors = {};
      response.data.errors.forEach((err) => {
        fieldErrors[err.path] = err.msg;
      });
      return { type: "validation", errors: fieldErrors };
    }

    if (response?.status >= 500) {
      // Server errors
      return {
        type: "server",
        message: "Something went wrong on our end. Please try again.",
      };
    }

    if (response?.status === 429) {
      // Rate limiting
      return {
        type: "rate_limit",
        message: "Too many requests. Please wait a moment and try again.",
      };
    }

    // Default error
    return {
      type: "unknown",
      message: "An unexpected error occurred. Please try again.",
    };
  }
}
```

---

## Admin Management

### Admin Endpoints

#### Get All Demo Bookings

**Endpoint**: `GET /api/v1/forms`

**Headers**: `Authorization: Bearer ADMIN_TOKEN`

**Query Parameters**:

- `form_type=book_a_free_demo_session`
- `status`: Filter by status
- `date_from`: Start date filter
- `date_to`: End date filter
- `page`: Page number
- `limit`: Results per page

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "65d1234567890abcdef123456",
      "application_id": "BOO20240215ABC12345",
      "form_type": "book_a_free_demo_session",
      "status": "submitted",
      "contact_info": {
        "full_name": "John Doe",
        "email": "john@example.com",
        "mobile_number": {
          "formatted": "+91 98765 43210"
        }
      },
      "student_details": {
        "preferred_course": ["COURSE_ID_1"],
        "highest_qualification": "12th_passed"
      },
      "demo_session_details": {
        "preferred_date": "2024-02-20T00:00:00.000Z",
        "preferred_time_slot": "18:00-19:00",
        "demo_status": "scheduled"
      },
      "submitted_at": "2024-02-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 87,
    "has_next_page": true,
    "has_prev_page": false,
    "limit": 20
  }
}
```

#### Update Demo Booking

**Endpoint**: `PUT /api/v1/forms/:id`

**Headers**: `Authorization: Bearer ADMIN_TOKEN`

**Request Body**:

```json
{
  "status": "confirmed",
  "demo_session_details": {
    "zoom_meeting_id": "123456789",
    "zoom_meeting_url": "https://zoom.us/j/123456789",
    "zoom_passcode": "demo123",
    "instructor_assigned": "INSTRUCTOR_USER_ID",
    "demo_status": "confirmed"
  },
  "internal_note": "Demo confirmed for 20th Feb at 6 PM IST"
}
```

#### Assign Instructor

**Endpoint**: `PUT /api/v1/forms/:id/assign`

**Headers**: `Authorization: Bearer ADMIN_TOKEN`

**Request Body**:

```json
{
  "assigned_to": "INSTRUCTOR_USER_ID",
  "internal_note": "Assigned to John Smith for Python course demo"
}
```

### Demo Management Dashboard Features

1. **Demo Calendar View**: Visual calendar showing all scheduled demos
2. **Instructor Assignment**: Bulk assign instructors based on course expertise
3. **Zoom Integration**: Auto-generate meeting links and passcodes
4. **Student Communication**: Send confirmation emails and SMS
5. **Follow-up Tracking**: Track demo completion and enrollment conversion

---

## Email Notifications

### Automatic Email Templates

#### 1. Demo Booking Confirmation (Student/Parent)

**Template**: `demo-booking-confirmation`

**Triggered**: Upon successful form submission

**Variables**:

```json
{
  "student_name": "John Doe",
  "parent_name": "Jane Doe", // If under 16
  "reference_id": "BOO20240215ABC12345",
  "preferred_date": "February 20, 2024",
  "preferred_time": "6:00 PM - 7:00 PM IST",
  "courses_selected": ["Python Programming", "Web Development"],
  "contact_email": "care@medh.co",
  "next_steps": "You will receive demo link 24 hours before the session"
}
```

**Sample Email**:

```html
Subject: Demo Session Booked Successfully - Reference #BOO20240215ABC12345 Hi
John, Great news! Your free demo session has been successfully booked. 📅 Demo
Details: • Reference ID: BOO20240215ABC12345 • Date: February 20, 2024 • Time:
6:00 PM - 7:00 PM IST • Courses: Python Programming, Web Development 🎯 What to
Expect: ✓ Interactive live session with expert instructor ✓ Course overview and
learning path discussion ✓ Q&A session for all your queries ✓ No pressure,
completely free experience 📧 Next Steps: • You'll receive the Zoom meeting link
24 hours before the demo • Our team will call you 1 hour before to confirm
attendance • Prepare any questions you'd like to ask during the session Need
help? Reply to this email or call us at +91-XXXX-XXXX-XX Best regards, MEDH Team
```

#### 2. Demo Confirmation with Meeting Link

**Template**: `demo-meeting-confirmation`

**Triggered**: 24 hours before demo session

**Variables**:

```json
{
  "student_name": "John Doe",
  "demo_date": "February 20, 2024",
  "demo_time": "6:00 PM IST",
  "zoom_meeting_url": "https://zoom.us/j/123456789",
  "meeting_id": "123 456 789",
  "passcode": "demo123",
  "instructor_name": "Sarah Wilson",
  "instructor_bio": "5+ years Python expert",
  "preparation_tips": ["Have a notebook ready", "Test your internet connection"]
}
```

#### 3. Demo Reminder (1 Hour Before)

**Template**: `demo-reminder`

**Triggered**: 1 hour before demo session

**SMS Template**:

```
Hi John! Your MEDH demo session starts in 1 hour (6 PM IST).
Join here: https://zoom.us/j/123456789
Meeting ID: 123456789 | Passcode: demo123
See you soon! - MEDH Team
```

#### 4. Post-Demo Follow-up

**Template**: `demo-followup`

**Triggered**: 2 hours after demo completion

**Variables**:

```json
{
  "student_name": "John Doe",
  "course_name": "Python Programming",
  "instructor_name": "Sarah Wilson",
  "enrollment_link": "https://medh.co/enroll/python-basics",
  "discount_code": "DEMO20",
  "validity": "Valid till February 25, 2024"
}
```

### Admin Notifications

#### 1. New Demo Booking Alert

**Recipients**: Demo coordination team

**Template**: `admin-demo-booking`

**Sample**:

```
Subject: New Demo Booking - Python Programming

New demo session booked:

Student: John Doe (john@example.com)
Course: Python Programming
Preferred: Feb 20, 6-7 PM IST
Age Group: 16+ (Direct student)
Reference: BOO20240215ABC12345

Action Required:
• Assign instructor
• Generate meeting link
• Confirm session timing

View Details: [Dashboard Link]
```

---

## Testing Guide

### Unit Test Examples

#### API Endpoint Testing

```javascript
// Jest/Node.js test example
const request = require("supertest");
const app = require("../app");

describe("Demo Booking Form API", () => {
  test("POST /api/v1/forms/submit - Valid demo booking", async () => {
    const demoBookingData = {
      form_type: "book_a_free_demo_session",
      is_student_under_16: false,
      contact_info: {
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com",
        mobile_number: {
          country_code: "+91",
          number: "9876543210",
        },
        city: "Mumbai",
        country: "India",
      },
      student_details: {
        name: "John Doe",
        highest_qualification: "12th_passed",
        currently_studying: true,
        currently_working: false,
        preferred_course: ["COURSE_ID_1"],
      },
      demo_session_details: {
        preferred_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        preferred_time_slot: "18:00-19:00",
        timezone: "Asia/Kolkata",
      },
      consent: {
        terms_and_privacy: true,
        data_collection_consent: true,
      },
      captcha_token: "valid_token",
    };

    const response = await request(app)
      .post("/api/v1/forms/submit")
      .send(demoBookingData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.application_id).toMatch(/^BOO/);
    expect(response.body.data.status).toBe("submitted");
  });

  test("POST /api/v1/forms/submit - Missing required fields", async () => {
    const invalidData = {
      form_type: "book_a_free_demo_session",
      // Missing required fields
    };

    const response = await request(app)
      .post("/api/v1/forms/submit")
      .send(invalidData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation failed");
    expect(Array.isArray(response.body.errors)).toBe(true);
  });

  test("GET /api/v1/forms/live-courses - Fetch available courses", async () => {
    const response = await request(app)
      .get("/api/v1/forms/live-courses")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
```

#### Frontend Component Testing

```javascript
// React Testing Library example
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DemoBookingForm from "../components/DemoBookingForm";

// Mock fetch API
global.fetch = jest.fn();

describe("DemoBookingForm Component", () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test("renders demo booking form", () => {
    render(<DemoBookingForm />);

    expect(screen.getByText("Book Your Free Demo Session")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("First Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
  });

  test("submits form with valid data", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { application_id: "BOO123456789" },
      }),
    });

    render(<DemoBookingForm />);

    // Fill form fields
    fireEvent.change(screen.getByPlaceholderText("First Name"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByPlaceholderText("Last Name"), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "john@example.com" },
    });

    // Submit form
    fireEvent.click(screen.getByText("Book Free Demo"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/v1/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"form_type":"book_a_free_demo_session"'),
      });
    });
  });

  test("displays validation errors", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        message: "Validation failed",
        errors: [
          { path: "contact_info.email", msg: "Please provide a valid email" },
        ],
      }),
    });

    render(<DemoBookingForm />);

    fireEvent.click(screen.getByText("Book Free Demo"));

    await waitFor(() => {
      expect(
        screen.getByText("Please provide a valid email"),
      ).toBeInTheDocument();
    });
  });
});
```

### Manual Testing Checklist

#### Form Validation Testing

- [ ] **Required Field Validation**

  - [ ] Submit form with empty required fields
  - [ ] Verify proper error messages display
  - [ ] Test each required field individually

- [ ] **Email Validation**

  - [ ] Test invalid email formats
  - [ ] Test valid email formats
  - [ ] Test email uniqueness (if applicable)

- [ ] **Phone Number Validation**

  - [ ] Test invalid phone numbers
  - [ ] Test different country codes
  - [ ] Verify formatted output

- [ ] **Date/Time Validation**

  - [ ] Test past dates (should fail)
  - [ ] Test future dates (should pass)
  - [ ] Test invalid time slots

- [ ] **Age-based Logic**
  - [ ] Test under 16 form flow
  - [ ] Test 16+ form flow
  - [ ] Verify parent details requirement

#### Integration Testing

- [ ] **Course Loading**

  - [ ] Verify courses load from API
  - [ ] Test course selection functionality
  - [ ] Test multi-course selection

- [ ] **Country/Phone Code Loading**

  - [ ] Test country dropdown population
  - [ ] Verify phone code auto-selection

- [ ] **Auto-fill Testing** (Authenticated)
  - [ ] Test auto-fill with logged-in user
  - [ ] Verify data population accuracy
  - [ ] Test partial auto-fill scenarios

#### End-to-end Testing

- [ ] **Complete Demo Booking Flow**

  - [ ] Fill all form fields correctly
  - [ ] Submit form successfully
  - [ ] Verify confirmation page/message
  - [ ] Check email delivery (if possible)

- [ ] **Admin Dashboard Testing**
  - [ ] Verify form appears in admin panel
  - [ ] Test status updates
  - [ ] Test instructor assignment
  - [ ] Test internal notes

### Load Testing

```javascript
// Artillery.js load test configuration
// artillery-load-test.yml
config:
  target: 'https://api.medh.co'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 20
      name: "Load test"
    - duration: 60
      arrivalRate: 10
      name: "Cool down"

scenarios:
  - name: "Submit demo booking form"
    weight: 100
    flow:
      - post:
          url: "/api/v1/forms/submit"
          headers:
            Content-Type: "application/json"
          json:
            form_type: "book_a_free_demo_session"
            is_student_under_16: false
            contact_info:
              first_name: "Load"
              last_name: "Test"
              email: "loadtest{{ $randomString() }}@example.com"
              mobile_number:
                country_code: "+91"
                number: "9876543210"
              city: "Mumbai"
              country: "India"
            student_details:
              name: "Load Test"
              highest_qualification: "12th_passed"
              currently_studying: true
              currently_working: false
              preferred_course: ["COURSE_ID_1"]
            demo_session_details:
              preferred_time_slot: "18:00-19:00"
              timezone: "Asia/Kolkata"
            consent:
              terms_and_privacy: true
              data_collection_consent: true
            captcha_token: "test_token"
```

---

## Best Practices & Recommendations

### Security Considerations

1. **Input Sanitization**: Always sanitize user inputs
2. **Rate Limiting**: Implement rate limiting for form submissions
3. **CAPTCHA Integration**: Use CAPTCHA to prevent spam
4. **Data Encryption**: Encrypt sensitive data at rest and in transit
5. **Access Control**: Properly authenticate admin endpoints

### Performance Optimization

1. **Form Field Loading**: Load courses and countries asynchronously
2. **Auto-fill Caching**: Cache user profile data for faster auto-fill
3. **Database Indexing**: Ensure proper indexing on frequently queried fields
4. **CDN Usage**: Serve static assets through CDN
5. **API Response Caching**: Cache country/course data responses

### User Experience

1. **Progressive Enhancement**: Form should work without JavaScript
2. **Mobile Responsive**: Ensure form works well on mobile devices
3. **Real-time Validation**: Provide immediate feedback on field validation
4. **Clear Error Messages**: Use user-friendly error messages
5. **Loading States**: Show loading indicators during form submission

### Monitoring & Analytics

1. **Form Analytics**: Track form completion rates and drop-off points
2. **Error Monitoring**: Monitor and alert on form submission errors
3. **Performance Monitoring**: Track form loading and submission times
4. **Conversion Tracking**: Track demo bookings to enrollment conversion
5. **User Feedback**: Collect feedback on form usability

---

This comprehensive integration guide provides everything needed to successfully implement and integrate the demo booking form with the MEDH Universal Form API. For additional support or questions, contact the development team or refer to the API documentation.
