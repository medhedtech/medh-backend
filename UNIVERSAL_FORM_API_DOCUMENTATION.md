# Universal Form System API Documentation

## Overview

The Universal Form System provides a unified API for handling all types of form submissions including corporate training inquiries, placement forms, enrollment forms, contact forms, and more. This system offers:

- **Unified Schema**: Single model that handles all form types
- **Flexible Validation**: Dynamic validation based on form type
- **Workflow Management**: Status tracking and assignment system
- **Analytics**: Comprehensive reporting and analytics
- **Email Notifications**: Automated email confirmations and notifications
- **Admin Dashboard**: Complete admin interface for form management

## Base URL

```
/api/v1/forms
```

## Form Types

The system supports the following form types:

- `corporate_training_inquiry` - Corporate training requests
- `placement_form` - Job placement applications
- `enrollment_form` - Course enrollment requests
- `contact_form` - General contact inquiries
- `feedback_form` - User feedback submissions
- `consultation_request` - Consultation booking requests
- `partnership_inquiry` - Business partnership inquiries
- `demo_request` - Product demo requests
- `support_ticket` - Technical support requests

## Authentication

Most endpoints require authentication using JWT tokens:

```bash
Authorization: Bearer <your_jwt_token>
```

Public endpoints (form submission and lookup) do not require authentication.

---

## Public Endpoints

### Submit Form (Universal)

Submit any type of form using the universal endpoint.

**Endpoint:** `POST /api/v1/forms/submit`

**Access:** Public

**Request Body:**
```json
{
  "form_type": "corporate_training_inquiry",
  "contact_info": {
    "full_name": "John Doe",
    "email": "john.doe@company.com",
    "phone_number": "+91-9876543210",
    "country": "India",
    "country_code": "+91"
  },
  "professional_info": {
    "designation": "HR Manager",
    "company_name": "Tech Corp Ltd",
    "company_website": "https://techcorp.com",
    "industry": "Information Technology"
  },
  "training_requirements": {
    "course_category": "Leadership Development",
    "training_topics": ["Team Management", "Communication Skills"],
    "preferred_format": "hybrid",
    "number_of_participants": 25,
    "budget_range": "$10,000 - $15,000",
    "preferred_start_date": "2024-02-01T00:00:00.000Z",
    "urgency_level": "medium"
  },
  "message": "We are looking for comprehensive leadership training for our management team. Please provide a detailed proposal.",
  "terms_accepted": true,
  "privacy_policy_accepted": true,
  "marketing_consent": false
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Form submitted successfully",
  "data": {
    "form_id": "corporate_training_inquiry_1640995200000_abc123def",
    "status": "submitted",
    "submitted_at": "2024-01-01T10:00:00.000Z"
  }
}
```

### Submit Corporate Training Inquiry

Convenience endpoint specifically for corporate training inquiries.

**Endpoint:** `POST /api/v1/forms/corporate-training`

**Access:** Public

**Request Body:**
```json
{
  "contact_info": {
    "full_name": "Jane Smith",
    "email": "jane.smith@enterprise.com",
    "phone_number": "+91-9876543210",
    "country": "India"
  },
  "professional_info": {
    "designation": "Learning & Development Head",
    "company_name": "Enterprise Solutions",
    "company_website": "https://enterprise.com"
  },
  "training_requirements": {
    "training_topics": ["Digital Transformation", "Agile Methodologies"],
    "preferred_format": "online",
    "number_of_participants": 50
  },
  "message": "We need training on digital transformation for our entire tech team.",
  "terms_accepted": true,
  "privacy_policy_accepted": true
}
```

### Submit Placement Form

**Endpoint:** `POST /api/v1/forms/placement`

**Access:** Public

**Request Body:**
```json
{
  "contact_info": {
    "full_name": "Alex Johnson",
    "email": "alex.johnson@email.com",
    "phone_number": "+91-9876543210"
  },
  "education_info": {
    "highest_education": "Bachelor's Degree",
    "university": "XYZ University",
    "degree": "Computer Science",
    "field_of_study": "Software Engineering",
    "graduation_year": "2023"
  },
  "files": {
    "resume_url": "https://storage.example.com/resumes/alex_johnson.pdf",
    "linkedin_profile": "https://linkedin.com/in/alexjohnson",
    "github_profile": "https://github.com/alexjohnson",
    "portfolio_url": "https://alexjohnson.dev"
  },
  "skills": ["JavaScript", "React", "Node.js", "Python"],
  "languages_known": ["English", "Hindi"],
  "work_experience": [
    {
      "title": "Software Developer Intern",
      "company": "Tech Startup",
      "start_date": "2023-01",
      "end_date": "2023-06",
      "description": "Developed web applications using React and Node.js"
    }
  ],
  "preferences": {
    "preferred_job_type": "full-time",
    "preferred_work_type": "hybrid",
    "willing_to_relocate": true
  },
  "message": "I am a recent graduate looking for software development opportunities.",
  "terms_accepted": true,
  "privacy_policy_accepted": true
}
```

### Get Form Status

Look up form status using the public form ID.

**Endpoint:** `GET /api/v1/forms/lookup/:formId`

**Access:** Public

**Response:**
```json
{
  "success": true,
  "data": {
    "form_id": "corporate_training_inquiry_1640995200000_abc123def",
    "form_type": "corporate_training_inquiry",
    "status": "under_review",
    "submitted_at": "2024-01-01T10:00:00.000Z",
    "processed_at": "2024-01-01T14:30:00.000Z",
    "contact_info": {
      "full_name": "John Doe"
    }
  }
}
```

---

## Admin Endpoints

All admin endpoints require authentication with admin privileges.

### Get All Forms

Retrieve all forms with filtering and pagination.

**Endpoint:** `GET /api/v1/forms`

**Access:** Private (Admin)

**Query Parameters:**
- `form_type` - Filter by form type
- `status` - Filter by status
- `priority` - Filter by priority (low, medium, high, urgent)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sort` - Sort field (submitted_at, -submitted_at, status, etc.)
- `search` - Search in name, email, company, message
- `assigned_to` - Filter by assigned user ID
- `date_from` - Filter from date (ISO format)
- `date_to` - Filter to date (ISO format)

**Example Request:**
```bash
GET /api/v1/forms?form_type=corporate_training_inquiry&status=submitted&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "form_id": "corporate_training_inquiry_1640995200000_abc123def",
      "form_type": "corporate_training_inquiry",
      "status": "submitted",
      "priority": "medium",
      "contact_info": {
        "full_name": "John Doe",
        "email": "john.doe@company.com",
        "phone_number": "+91-9876543210"
      },
      "professional_info": {
        "company_name": "Tech Corp Ltd",
        "designation": "HR Manager"
      },
      "message": "We are looking for comprehensive leadership training...",
      "submitted_at": "2024-01-01T10:00:00.000Z",
      "assigned_to": null,
      "handled_by": null
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 50,
    "has_next_page": true,
    "has_prev_page": false,
    "limit": 10
  }
}
```

### Get Form by ID

**Endpoint:** `GET /api/v1/forms/:id`

**Access:** Private (Admin or Form Owner)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "form_id": "corporate_training_inquiry_1640995200000_abc123def",
    "form_type": "corporate_training_inquiry",
    "status": "under_review",
    "priority": "medium",
    "contact_info": {
      "full_name": "John Doe",
      "email": "john.doe@company.com",
      "phone_number": "+91-9876543210",
      "country": "India"
    },
    "professional_info": {
      "designation": "HR Manager",
      "company_name": "Tech Corp Ltd",
      "company_website": "https://techcorp.com"
    },
    "training_requirements": {
      "course_category": "Leadership Development",
      "number_of_participants": 25,
      "preferred_format": "hybrid"
    },
    "message": "We are looking for comprehensive leadership training for our management team.",
    "internal_notes": [
      {
        "note": "Initial review completed. Suitable for our leadership program.",
        "added_by": {
          "_id": "507f1f77bcf86cd799439012",
          "full_name": "Admin User",
          "email": "admin@medh.com"
        },
        "added_at": "2024-01-01T15:00:00.000Z"
      }
    ],
    "assigned_to": {
      "_id": "507f1f77bcf86cd799439013",
      "full_name": "Sales Manager",
      "email": "sales@medh.com"
    },
    "submitted_at": "2024-01-01T10:00:00.000Z",
    "processed_at": "2024-01-01T14:30:00.000Z",
    "processing_time": 4.5,
    "form_age_days": 1
  }
}
```

### Update Form

Update form status, priority, assignment, and add internal notes.

**Endpoint:** `PUT /api/v1/forms/:id`

**Access:** Private (Admin)

**Request Body:**
```json
{
  "status": "approved",
  "priority": "high",
  "assigned_to": "507f1f77bcf86cd799439013",
  "internal_note": "Approved for premium training package. Sales team to follow up.",
  "follow_up_required": true,
  "follow_up_date": "2024-01-05T10:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Form updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "status": "approved",
    "priority": "high",
    "assigned_to": {
      "_id": "507f1f77bcf86cd799439013",
      "full_name": "Sales Manager",
      "email": "sales@medh.com"
    },
    "handled_by": {
      "_id": "507f1f77bcf86cd799439014",
      "full_name": "Current Admin",
      "email": "admin@medh.com"
    }
  }
}
```

### Assign Form

**Endpoint:** `PUT /api/v1/forms/:id/assign`

**Access:** Private (Admin)

**Request Body:**
```json
{
  "assigned_to": "507f1f77bcf86cd799439013"
}
```

### Add Internal Note

**Endpoint:** `POST /api/v1/forms/:id/notes`

**Access:** Private (Admin)

**Request Body:**
```json
{
  "note": "Customer called to discuss training requirements in detail. Very interested in our leadership program."
}
```

### Delete Form

Soft delete a form (marks as deleted but preserves data).

**Endpoint:** `DELETE /api/v1/forms/:id`

**Access:** Private (Admin)

**Response:**
```json
{
  "success": true,
  "message": "Form deleted successfully"
}
```

### Get Forms by Type

**Endpoint:** `GET /api/v1/forms/type/:formType`

**Access:** Private (Admin)

**Example:** `GET /api/v1/forms/type/corporate_training_inquiry`

### Get Pending Forms

**Endpoint:** `GET /api/v1/forms/pending`

**Access:** Private (Admin)

**Query Parameters:**
- `form_type` - Filter by specific form type

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "form_id": "corporate_training_inquiry_1640995200000_abc123def",
      "form_type": "corporate_training_inquiry",
      "status": "submitted",
      "contact_info": {
        "full_name": "John Doe",
        "email": "john.doe@company.com"
      },
      "submitted_at": "2024-01-01T10:00:00.000Z"
    }
  ],
  "count": 15
}
```

### Get Form Analytics

**Endpoint:** `GET /api/v1/forms/analytics`

**Access:** Private (Admin)

**Query Parameters:**
- `form_type` - Filter analytics by form type
- `date_from` - Start date for analytics
- `date_to` - End date for analytics

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": [
      {
        "_id": "submitted",
        "count": 25,
        "avgProcessingTime": 4.2
      },
      {
        "_id": "under_review",
        "count": 15,
        "avgProcessingTime": 2.1
      },
      {
        "_id": "approved",
        "count": 40,
        "avgProcessingTime": 6.5
      }
    ],
    "trends": [
      {
        "_id": {
          "date": "2024-01-01",
          "form_type": "corporate_training_inquiry"
        },
        "count": 5
      },
      {
        "_id": {
          "date": "2024-01-02",
          "form_type": "corporate_training_inquiry"
        },
        "count": 8
      }
    ],
    "top_form_types": [
      {
        "_id": "corporate_training_inquiry",
        "count": 45,
        "pending": 12
      },
      {
        "_id": "placement_form",
        "count": 32,
        "pending": 8
      }
    ],
    "processing_times": [
      {
        "_id": "corporate_training_inquiry",
        "avgProcessingHours": 4.5,
        "count": 30
      }
    ]
  }
}
```

### Export Forms

Export forms data as CSV.

**Endpoint:** `GET /api/v1/forms/export`

**Access:** Private (Admin)

**Query Parameters:**
- `form_type` - Filter by form type
- `status` - Filter by status
- `date_from` - Start date
- `date_to` - End date

**Response:** CSV file download

---

## Convenience Endpoints

### Admin Form Type Endpoints

Get forms by specific type through admin endpoints:

- `GET /api/v1/forms/admin/corporate-training` - Corporate training inquiries
- `GET /api/v1/forms/admin/placement` - Placement forms
- `GET /api/v1/forms/admin/enrollment` - Enrollment forms
- `GET /api/v1/forms/admin/contact` - Contact forms
- `GET /api/v1/forms/admin/feedback` - Feedback forms

### Form Type Submission Endpoints

Submit specific form types directly:

- `POST /api/v1/forms/corporate-training`
- `POST /api/v1/forms/placement`
- `POST /api/v1/forms/enrollment`
- `POST /api/v1/forms/contact`
- `POST /api/v1/forms/feedback`
- `POST /api/v1/forms/consultation`
- `POST /api/v1/forms/partnership`
- `POST /api/v1/forms/demo`
- `POST /api/v1/forms/support`

---

## Bulk Operations

### Bulk Update Forms

**Endpoint:** `PUT /api/v1/forms/bulk/update`

**Access:** Private (Admin)

**Request Body:**
```json
{
  "form_ids": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ],
  "updates": {
    "status": "approved",
    "priority": "high"
  }
}
```

### Bulk Delete Forms

**Endpoint:** `DELETE /api/v1/forms/bulk/delete`

**Access:** Private (Admin)

**Request Body:**
```json
{
  "form_ids": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012"
  ]
}
```

---

## Status Values

Forms can have the following status values:

- `submitted` - Initial submission
- `received` - Acknowledged by system
- `under_review` - Being reviewed by team
- `in_progress` - Work in progress
- `shortlisted` - Candidate shortlisted (for placement forms)
- `interviewed` - Interview conducted
- `approved` - Request approved
- `rejected` - Request rejected
- `completed` - Process completed
- `cancelled` - Request cancelled
- `on_hold` - Temporarily on hold

## Priority Values

- `low` - Low priority
- `medium` - Medium priority (default)
- `high` - High priority
- `urgent` - Urgent priority

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "contact_info.email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Email Notifications

The system automatically sends email notifications:

1. **Confirmation Email** - Sent to user upon form submission
2. **Admin Notification** - Sent to admin when new form is submitted
3. **Status Update Email** - Sent to user when form status changes to approved/rejected/completed

---

## Integration Examples

### Frontend Form Submission

```javascript
// Corporate Training Inquiry Form
const submitCorporateTrainingForm = async (formData) => {
  try {
    const response = await fetch('/api/v1/forms/corporate-training', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact_info: {
          full_name: formData.fullName,
          email: formData.email,
          phone_number: formData.phone,
          country: formData.country
        },
        professional_info: {
          designation: formData.designation,
          company_name: formData.companyName,
          company_website: formData.companyWebsite
        },
        training_requirements: {
          training_topics: formData.trainingTopics,
          preferred_format: formData.preferredFormat,
          number_of_participants: formData.participants
        },
        message: formData.message,
        terms_accepted: true,
        privacy_policy_accepted: true,
        marketing_consent: formData.marketingConsent
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Form submitted successfully:', result.data.form_id);
      // Show success message to user
      showSuccessMessage(`Thank you! Your inquiry has been submitted. Reference ID: ${result.data.form_id}`);
    } else {
      console.error('Form submission failed:', result.message);
      // Handle validation errors
      if (result.errors) {
        displayValidationErrors(result.errors);
      }
    }
  } catch (error) {
    console.error('Network error:', error);
    showErrorMessage('Failed to submit form. Please try again.');
  }
};
```

### Admin Dashboard Integration

```javascript
// Fetch pending forms for admin dashboard
const fetchPendingForms = async () => {
  try {
    const response = await fetch('/api/v1/forms/pending', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (result.success) {
      displayPendingForms(result.data);
    }
  } catch (error) {
    console.error('Failed to fetch pending forms:', error);
  }
};

// Update form status
const updateFormStatus = async (formId, status, note) => {
  try {
    const response = await fetch(`/api/v1/forms/${formId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: status,
        internal_note: note
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Form updated successfully');
      refreshFormsList();
    }
  } catch (error) {
    console.error('Failed to update form:', error);
  }
};
```

---

## Migration from Legacy Forms

If you're migrating from the existing individual form systems (corporate-training, placement-form, enroll-form), you can:

1. Use the new universal endpoints for all new submissions
2. Keep existing endpoints temporarily for backward compatibility
3. Migrate existing data using the bulk import functionality
4. Update frontend applications to use the new unified API

The universal form system is designed to be backward compatible while providing enhanced functionality and better maintainability. 