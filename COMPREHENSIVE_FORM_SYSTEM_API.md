# Comprehensive Form System API Documentation

## Overview

The MEDH backend now supports a comprehensive form system with four main form types:

1. **Career/Job Application Forms** - For job seekers and career applications
2. **School/Institute Partnership Forms** - For institutional partnerships
3. **Educator Application Forms** - For educator recruitment
4. **Contact Us Forms** - For general inquiries

All forms include professional email acknowledgments with unique reference IDs and proper validation.

## Base URL

```
https://api.medh.co/api/v1/forms
```

## Authentication

- Public endpoints: No authentication required for form submissions
- Admin endpoints: Require JWT token in Authorization header

---

## 1. Career Application Form

### Submit Career Application

**POST** `/career-application`

Submit a career or job application with comprehensive professional details.

#### Request Body

```json
{
  "contact_info": {
    "full_name": "John Doe",
    "email": "john.doe@email.com",
    "phone_number": "+91-9876543210",
    "country": "India",
    "city": "Mumbai",
    "address": "123 Main Street"
  },
  "post_applying_for": "Full Stack Developer",
  "employment_info": {
    "has_work_experience": true,
    "currently_employed": true,
    "present_company_name": "Tech Solutions Inc",
    "working_since": "January 2022",
    "current_designation": "Software Developer",
    "work_location_preference": "hybrid"
  },
  "education_info": {
    "highest_education": "bachelor",
    "university": "Mumbai University",
    "degree": "Computer Science",
    "field_of_study": "Software Engineering",
    "graduation_year": "2021"
  },
  "files": {
    "resume_url": "https://example.com/resume.pdf",
    "linkedin_profile": "https://linkedin.com/in/johndoe",
    "github_profile": "https://github.com/johndoe",
    "portfolio_url": "https://johndoe.dev"
  },
  "skills": ["JavaScript", "React", "Node.js", "Python", "MongoDB"],
  "work_experience": [
    {
      "title": "Software Developer",
      "company": "Tech Solutions Inc",
      "location": "Mumbai, India",
      "start_date": "January 2022",
      "end_date": "Present",
      "current": true,
      "description": "Developed web applications using React and Node.js",
      "technologies": ["React", "Node.js", "MongoDB"]
    }
  ],
  "projects": [
    {
      "title": "E-commerce Platform",
      "description": "Full-stack e-commerce application",
      "technologies": ["React", "Express", "MongoDB"],
      "github_url": "https://github.com/johndoe/ecommerce",
      "demo_url": "https://ecommerce-demo.com"
    }
  ],
  "certifications": [
    {
      "title": "AWS Certified Developer",
      "issuer": "Amazon Web Services",
      "date": "2023-06-15",
      "credential_id": "AWS-123456"
    }
  ],
  "message": "I am passionate about creating innovative solutions and would love to contribute to your team's success. My experience in full-stack development and cloud technologies aligns well with your requirements.",
  "terms_accepted": true,
  "privacy_policy_accepted": true,
  "marketing_consent": false
}
```

#### Response

```json
{
  "success": true,
  "message": "Career application submitted successfully",
  "data": {
    "reference_id": "CAR-20250122-A1B2C3D4",
    "status": "submitted",
    "submitted_at": "2025-01-22T10:30:00.000Z"
  }
}
```

#### Validation Rules

- `full_name`: Required, 2-100 characters, letters/spaces only
- `email`: Required, valid email format, no disposable emails
- `phone_number`: Required, valid mobile number
- `post_applying_for`: Required, 2-200 characters
- `has_work_experience`: Required boolean
- `work_location_preference`: Required, one of: "wfh", "wfo", "hybrid"
- `message`: Required, 50-2000 characters (cover letter)
- `terms_accepted` & `privacy_policy_accepted`: Must be true

---

## 2. Partnership Inquiry Form

### Submit Partnership Inquiry

**POST** `/partnership-inquiry`

Submit a partnership inquiry for schools, institutes, or organizations.

#### Request Body

```json
{
  "contact_info": {
    "full_name": "Dr. Sarah Wilson",
    "email": "sarah.wilson@brightfuture.edu",
    "phone_number": "+91-9876543210",
    "city": "Delhi"
  },
  "professional_info": {
    "designation": "Academic Director",
    "company_name": "Bright Future Academy"
  },
  "school_info": {
    "school_name": "Bright Future Academy",
    "school_type": "CBSE",
    "city_state": "Delhi, India",
    "student_count": "501-1000",
    "website": "https://brightfuture.edu"
  },
  "partnership_info": {
    "services_of_interest": [
      "Student learning solutions",
      "Teacher training",
      "LMS / Digital infrastructure",
      "Career guidance and assessments"
    ],
    "additional_notes": "We are particularly interested in AI and data science courses for our high school students."
  },
  "training_requirements": {
    "budget_range": "₹5,00,000 - ₹10,00,000",
    "preferred_start_date": "2025-04-01T00:00:00.000Z"
  },
  "message": "We are looking to partner with MEDH to enhance our technology curriculum and provide our students with industry-relevant skills. Our institution has been serving the community for over 15 years and we believe this partnership will greatly benefit our students' career prospects.",
  "terms_accepted": true,
  "privacy_policy_accepted": true
}
```

#### Response

```json
{
  "success": true,
  "message": "Partnership inquiry submitted successfully",
  "data": {
    "reference_id": "PART-20250122-E5F6G7H8",
    "status": "submitted",
    "submitted_at": "2025-01-22T11:15:00.000Z"
  }
}
```

#### Validation Rules

- `school_name`: Required, 2-200 characters
- `school_type`: Required, one of: "CBSE", "ICSE", "IB", "State Board", "International", "University", "College", "Training Institute", "Other"
- `student_count`: Required, one of: "1-50", "51-100", "101-300", "301-500", "501-1000", "1000+"
- `services_of_interest`: Required array with at least one service
- `message`: Required, 50-2000 characters

---

## 3. Educator Application Form

### Submit Educator Application

**POST** `/educator-application`

Submit an application to join as an educator or instructor.

#### Request Body

```json
{
  "contact_info": {
    "full_name": "Prof. Michael Chen",
    "email": "michael.chen@email.com",
    "phone_number": "+91-9876543210",
    "city": "Bangalore"
  },
  "professional_info": {
    "experience_level": "senior",
    "organization": "Tech University"
  },
  "education_info": {
    "highest_education": "phd",
    "university": "Stanford University",
    "degree": "PhD in Computer Science",
    "field_of_study": "Artificial Intelligence",
    "graduation_year": "2015"
  },
  "subject_areas": {
    "primary_subjects": ["ai_data_science", "programming_development"],
    "grade_levels": ["undergraduate", "professionals"]
  },
  "preferred_teaching_mode": "hybrid",
  "interested_in": ["part_time", "hourly_basis"],
  "it_assets": {
    "has_desktop_laptop": true,
    "has_webcam": true,
    "has_headphone_mic": true,
    "lms_proficiency": true,
    "video_conferencing_knowledge": true,
    "internet_connection_quality": "excellent"
  },
  "availability": {
    "hours_per_week": "11_to_20",
    "preferred_schedule": {
      "monday": {
        "available": true,
        "time_from": "18:00",
        "time_to": "22:00"
      },
      "tuesday": {
        "available": true,
        "time_from": "18:00",
        "time_to": "22:00"
      },
      "wednesday": {
        "available": false
      },
      "thursday": {
        "available": true,
        "time_from": "18:00",
        "time_to": "22:00"
      },
      "friday": {
        "available": true,
        "time_from": "18:00",
        "time_to": "22:00"
      },
      "saturday": {
        "available": true,
        "time_from": "10:00",
        "time_to": "16:00"
      },
      "sunday": {
        "available": false
      }
    },
    "notice_period": "3_to_4_weeks"
  },
  "teaching_portfolio": {
    "youtube_videos": [
      "https://youtube.com/watch?v=example1",
      "https://youtube.com/watch?v=example2"
    ],
    "online_video_url": "https://vimeo.com/teachingdemo"
  },
  "work_experience": [
    {
      "title": "Senior Lecturer",
      "company": "Tech University",
      "start_date": "2018",
      "end_date": "Present",
      "current": true,
      "description": "Teaching AI and machine learning courses to undergraduate and graduate students"
    }
  ],
  "certifications": [
    {
      "title": "Certified TensorFlow Developer",
      "issuer": "Google",
      "date": "2023-03-15"
    }
  ],
  "message": "I am excited about the opportunity to share my knowledge and help students develop practical AI skills.",
  "terms_accepted": true,
  "privacy_policy_accepted": true
}
```

#### Response

```json
{
  "success": true,
  "message": "Educator application submitted successfully",
  "data": {
    "reference_id": "EDU-20250122-I9J0K1L2",
    "status": "submitted",
    "submitted_at": "2025-01-22T14:45:00.000Z"
  }
}
```

#### Validation Rules

- `primary_subjects`: Required array, at least one subject
- `grade_levels`: Required array, at least one level
- `preferred_teaching_mode`: Required, one of: "in_person_only", "remote_only", "hybrid", "flexible"
- `hours_per_week`: Required, one of: "less_than_5", "5_to_10", "11_to_20", "21_to_30", "more_than_30"
- All IT assets fields: Required booleans
- `internet_connection_quality`: Required, one of: "excellent", "good", "average", "poor"

---

## 4. Contact Us Form

### Submit Contact Form

**POST** `/contact-us`

Submit a general inquiry or contact message.

#### Request Body

```json
{
  "contact_info": {
    "full_name": "Alice Johnson",
    "email": "alice.johnson@email.com",
    "phone_number": "+91-9876543210",
    "company": "Innovation Corp"
  },
  "subject": "Inquiry about Corporate Training Programs",
  "message": "Hello, I would like to learn more about your corporate training programs for our development team. We have about 25 developers who could benefit from upskilling in AI and data science. Could you please provide more information about your offerings and pricing?",
  "category": "course_information",
  "priority": "medium",
  "preferred_contact_method": "email",
  "terms_accepted": true,
  "privacy_policy_accepted": true,
  "marketing_consent": false
}
```

#### Response

```json
{
  "success": true,
  "message": "Contact form submitted successfully",
  "data": {
    "reference_id": "CONT-20250122-M3N4O5P6",
    "status": "submitted",
    "submitted_at": "2025-01-22T16:20:00.000Z"
  }
}
```

#### Validation Rules

- `subject`: Required, 5-200 characters
- `message`: Required, 20-2000 characters
- `category`: Optional, one of predefined categories
- `priority`: Optional, one of: "low", "medium", "high", "urgent"
- `preferred_contact_method`: Optional, one of: "email", "phone", "whatsapp", "any"

---

## Admin Endpoints

### Get All Forms

**GET** `/`
_Requires authentication_

Retrieve all forms with filtering and pagination.

#### Query Parameters

- `form_type`: Filter by specific form type
- `status`: Filter by status
- `priority`: Filter by priority
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search in name, email, company, message
- `date_from`: Start date filter
- `date_to`: End date filter

#### Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "form_id_here",
      "form_id": "CAR-20250122-A1B2C3D4",
      "form_type": "career_application",
      "status": "submitted",
      "priority": "medium",
      "contact_info": {
        "full_name": "John Doe",
        "email": "john.doe@email.com"
      },
      "submitted_at": "2025-01-22T10:30:00.000Z",
      "assigned_to": null
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 95,
    "has_next_page": true,
    "has_prev_page": false,
    "limit": 20
  }
}
```

### Get Form by ID

**GET** `/:id`
_Requires authentication_

Get detailed information about a specific form.

### Update Form

**PUT** `/:id`
_Requires authentication_

Update form status, priority, assignments, and add internal notes.

#### Request Body

```json
{
  "status": "under_review",
  "priority": "high",
  "assigned_to": "admin_user_id",
  "internal_note": "Reviewed application, scheduling interview",
  "follow_up_required": true,
  "follow_up_date": "2025-01-25T10:00:00.000Z"
}
```

### Get Form Analytics

**GET** `/analytics`
_Requires authentication_

Get comprehensive analytics about form submissions.

---

## Email Acknowledgments

All form submissions automatically trigger professional email acknowledgments:

### Email Features

- **Unique Reference ID**: Each form gets a unique, trackable reference ID
- **Professional Branding**: Consistent MEDH branding across all emails
- **Comprehensive Summary**: Detailed summary of submitted information
- **Next Steps**: Clear explanation of what happens next
- **Response Timeline**: Expected response timeframes
- **Contact Information**: Multiple ways to reach support if needed

### Reference ID Format

- Career Applications: `CAR-YYYYMMDD-XXXXXXXX`
- Partnership Inquiries: `PART-YYYYMMDD-XXXXXXXX`
- Educator Applications: `EDU-YYYYMMDD-XXXXXXXX`
- Contact Forms: `CONT-YYYYMMDD-XXXXXXXX`

### Email Templates

- `career-application-acknowledgment.hbs`
- `partnership-inquiry-acknowledgment.hbs`
- `educator-application-acknowledgment.hbs`
- `contact-form-acknowledgment.hbs`

---

## Error Handling

### Validation Errors

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "contact_info.email",
      "message": "Please provide a valid email address",
      "value": "invalid-email"
    }
  ]
}
```

### Server Errors

```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details for debugging"
}
```

---

## Usage Examples

### JavaScript/Fetch Example

```javascript
// Submit career application
const submitCareerApplication = async (formData) => {
  try {
    const response = await fetch("/api/v1/forms/career-application", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (result.success) {
      console.log("Application submitted:", result.data.reference_id);
      // Show success message to user
    } else {
      console.error("Validation errors:", result.errors);
      // Display validation errors
    }
  } catch (error) {
    console.error("Submission failed:", error);
  }
};
```

### cURL Example

```bash
curl -X POST https://api.medh.co/api/v1/forms/contact-us \
  -H "Content-Type: application/json" \
  -d '{
    "contact_info": {
      "full_name": "John Doe",
      "email": "john@example.com"
    },
    "subject": "Course Inquiry",
    "message": "I would like to know more about your AI courses.",
    "terms_accepted": true,
    "privacy_policy_accepted": true
  }'
```

---

## Security Features

- **Input Validation**: Comprehensive server-side validation
- **Email Verification**: Disposable email detection
- **Rate Limiting**: Prevents spam submissions
- **Data Sanitization**: All inputs are sanitized
- **CORS Protection**: Proper CORS configuration
- **Audit Trail**: Complete submission tracking

---

## Integration Notes

- All form submissions are stored in the `universalforms` MongoDB collection
- Email acknowledgments are queued using BullMQ for reliable delivery
- Admin notifications are sent for high-priority forms
- Forms support file uploads for resumes, portfolios, and documents
- Complete audit trail with IP tracking and user agent logging

This comprehensive form system provides a professional, scalable solution for handling various types of inquiries and applications with proper validation, email acknowledgments, and admin management capabilities.
