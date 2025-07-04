# Hire from Medh - Corporate Talent & Upskilling Inquiry API

## Overview

The Hire from Medh API allows companies to submit inquiries for hiring Medh-trained candidates or requesting corporate training solutions. This multi-step form system captures comprehensive requirements and manages the inquiry lifecycle.

## Table of Contents

- [Form Schema](#form-schema)
- [API Endpoints](#api-endpoints)
- [Field Validation](#field-validation)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)
- [Admin Management](#admin-management)
- [Analytics](#analytics)

## Form Schema

The Hire from Medh form follows a multi-step structure:

### Step 1: Contact Information
- `full_name` (required): Your full name
- `email` (required): Work email address
- `country` (required): Country name
- `phone` (required): Phone number with country code

### Step 2: Company Details
- `company_name` (required): Company name
- `company_website` (optional): Company website URL
- `department` (required): Department or function
- `team_size` (required): Team size for training or hiring

### Step 3: Requirements
- `requirement_type` (required): What you need from Medh
- `training_domain` (required): Preferred domain or skills
- `start_date` (optional): Expected start date
- `budget_range` (optional): Budget range
- `detailed_requirements` (required): Detailed requirements (min 20 chars)
- `document_upload` (optional): Upload JD or document

### Step 4: Terms
- `terms_accepted` (required): Must be true

## API Endpoints

### Public Endpoints

#### Submit Hire from Medh Inquiry
```http
POST /api/v1/hire-from-medh
```

**Request Body:**
```json
{
  "full_name": "Radhika Sharma",
  "email": "radhika@company.com",
  "country": "India",
  "phone": "+911234567890",
  "company_name": "TechNova Solutions",
  "company_website": "https://www.technova.com",
  "department": "Engineering",
  "team_size": "21–50",
  "requirement_type": "Both",
  "training_domain": "Full Stack Web Development, UI/UX, DevOps",
  "start_date": "2024-02-01",
  "budget_range": "₹50,000 – ₹1,00,000",
  "detailed_requirements": "We are looking to hire 5 full-stack developers with experience in React, Node.js, and cloud technologies. Additionally, we need training for our existing team of 15 developers on modern DevOps practices including Docker, Kubernetes, and CI/CD pipelines.",
  "document_upload": "https://example.com/job-description.pdf",
  "terms_accepted": true
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "✅ Thank you for submitting your request. Our partnerships team will contact you shortly.",
  "data": {
    "form_id": "hire_from_medh_inquiry_1703123456789_abc123def",
    "submission_date": "2024-01-20T15:30:45.123Z",
    "status": "submitted",
    "priority": "high",
    "requirement_type": "Both",
    "team_size": "21–50"
  }
}
```

#### Get Form Information
```http
GET /api/v1/hire-from-medh/info
```

**Response:**
```json
{
  "success": true,
  "message": "Hire from Medh form information",
  "data": {
    "form_type": "hire_from_medh_inquiry",
    "title": "Hire from Medh – Corporate Talent & Upskilling Inquiry",
    "description": "Connect with industry-ready professionals trained by Medh or request a custom training solution for your team.",
    "required_fields": [
      "full_name", "email", "country", "phone", "company_name",
      "department", "team_size", "requirement_type", "training_domain",
      "detailed_requirements", "terms_accepted"
    ],
    "field_options": {
      "team_size": ["1–5", "6–20", "21–50", "50+"],
      "requirement_type": [
        "Hire Medh-trained Candidates",
        "Corporate Upskilling/Training",
        "Both"
      ]
    },
    "benefits": [
      "✅ Pre-trained, job-ready talent",
      "🎯 Custom training programs for your team",
      "🛠️ Hands-on project-based learning",
      "📄 Certification from Medh",
      "💬 Dedicated hiring/training support",
      "🔁 Option to retrain or rehire as needed"
    ]
  }
}
```

### Protected Endpoints (Admin/Staff Only)

#### Get All Inquiries
```http
GET /api/v1/hire-from-medh
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by status
- `priority` (optional): Filter by priority
- `requirement_type` (optional): Filter by requirement type
- `team_size` (optional): Filter by team size
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65abc123def456789",
      "form_id": "hire_from_medh_inquiry_1703123456789_abc123def",
      "contact_info": {
        "full_name": "Radhika Sharma",
        "email": "radhika@company.com",
        "phone_number": "+911234567890",
        "country": "India"
      },
      "professional_info": {
        "company_name": "TechNova Solutions",
        "company_website": "https://www.technova.com",
        "department": "Engineering"
      },
      "hire_requirements": {
        "requirement_type": "Both",
        "training_domain": "Full Stack Web Development, UI/UX, DevOps",
        "team_size": "21–50",
        "budget_range": "₹50,000 – ₹1,00,000",
        "detailed_requirements": "We are looking to hire 5 full-stack developers..."
      },
      "status": "submitted",
      "priority": "high",
      "submitted_at": "2024-01-20T15:30:45.123Z",
      "completion_percentage": 100
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 47,
    "items_per_page": 10
  }
}
```

#### Get Inquiry by ID
```http
GET /api/v1/hire-from-medh/:id
Authorization: Bearer <token>
```

#### Update Inquiry
```http
PUT /api/v1/hire-from-medh/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "under_review",
  "priority": "high",
  "assigned_to": "65abc123def456789",
  "internal_notes": "High priority inquiry - following up within 24 hours"
}
```

#### Delete Inquiry
```http
DELETE /api/v1/hire-from-medh/:id
Authorization: Bearer <token>
```

#### Get Analytics
```http
GET /api/v1/hire-from-medh/analytics
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_inquiries": 47,
    "avg_completion_percentage": 98,
    "breakdown": {
      "by_requirement_type": {
        "Hire Medh-trained Candidates": 18,
        "Corporate Upskilling/Training": 15,
        "Both": 14
      },
      "by_team_size": {
        "1–5": 8,
        "6–20": 12,
        "21–50": 15,
        "50+": 12
      },
      "by_status": {
        "submitted": 25,
        "under_review": 12,
        "in_progress": 8,
        "completed": 2
      }
    }
  }
}
```

## Field Validation

### Required Fields
All required fields must be provided and non-empty:
- `full_name`, `email`, `country`, `phone`
- `company_name`, `department`, `team_size`
- `requirement_type`, `training_domain`, `detailed_requirements`
- `terms_accepted`

### Format Validation

#### Email
- Must be valid email format
- Example: `user@company.com`

#### Phone Number
- Must include country code with `+`
- Minimum 10 digits after country code
- Example: `+911234567890`

#### Company Website (Optional)
- Must be valid URL format if provided
- Can include or exclude protocol
- Examples: `https://company.com`, `www.company.com`

#### Team Size
- Must be one of: `["1–5", "6–20", "21–50", "50+"]`

#### Requirement Type
- Must be one of:
  - `"Hire Medh-trained Candidates"`
  - `"Corporate Upskilling/Training"`
  - `"Both"`

#### Detailed Requirements
- Minimum 20 characters required
- Should provide comprehensive information about needs

#### Terms Accepted
- Must be exactly `true`

## Usage Examples

### Frontend Integration

#### Basic Form Submission
```javascript
const submitHireInquiry = async (formData) => {
  try {
    const response = await fetch('/api/v1/hire-from-medh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();
    
    if (result.success) {
      // Show success message
      alert(result.message);
      console.log('Form ID:', result.data.form_id);
    } else {
      // Handle validation errors
      console.error('Submission failed:', result.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

#### Multi-step Form Implementation
```javascript
const MultiStepHireForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});

  const steps = [
    { id: 'contact_info', title: 'Your Information' },
    { id: 'company_info', title: 'Company Details' },
    { id: 'request_info', title: 'Your Requirements' },
    { id: 'terms', title: 'Final Review' }
  ];

  const handleStepSubmit = (stepData) => {
    setFormData({ ...formData, ...stepData });
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final submission
      submitHireInquiry(formData);
    }
  };

  return (
    <div className="hire-form">
      <div className="steps-indicator">
        {steps.map((step, index) => (
          <div 
            key={step.id}
            className={`step ${index + 1 <= currentStep ? 'active' : ''}`}
          >
            Step {index + 1}: {step.title}
          </div>
        ))}
      </div>
      
      {/* Render current step component */}
      {currentStep === 1 && <ContactInfoStep onSubmit={handleStepSubmit} />}
      {currentStep === 2 && <CompanyInfoStep onSubmit={handleStepSubmit} />}
      {currentStep === 3 && <RequirementsStep onSubmit={handleStepSubmit} />}
      {currentStep === 4 && <TermsStep onSubmit={handleStepSubmit} />}
    </div>
  );
};
```

### Admin Dashboard Integration

#### Fetch and Display Inquiries
```javascript
const HireInquiriesDashboard = () => {
  const [inquiries, setInquiries] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchInquiries = async () => {
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(
        `/api/v1/hire-from-medh?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        }
      );
      
      const result = await response.json();
      setInquiries(result.data);
    } catch (error) {
      console.error('Failed to fetch inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateInquiryStatus = async (id, newStatus) => {
    try {
      await fetch(`/api/v1/hire-from-medh/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      // Refresh inquiries
      fetchInquiries();
    } catch (error) {
      console.error('Failed to update inquiry:', error);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [filters]);

  return (
    <div className="inquiries-dashboard">
      <div className="filters">
        <select 
          value={filters.status || ''} 
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        
        <select 
          value={filters.requirement_type || ''} 
          onChange={(e) => setFilters({...filters, requirement_type: e.target.value})}
        >
          <option value="">All Types</option>
          <option value="Hire Medh-trained Candidates">Hire Candidates</option>
          <option value="Corporate Upskilling/Training">Training</option>
          <option value="Both">Both</option>
        </select>
      </div>

      <div className="inquiries-list">
        {inquiries.map(inquiry => (
          <div key={inquiry._id} className="inquiry-card">
            <h3>{inquiry.contact_info.full_name}</h3>
            <p>{inquiry.professional_info.company_name}</p>
            <p>Type: {inquiry.hire_requirements.requirement_type}</p>
            <p>Team Size: {inquiry.hire_requirements.team_size}</p>
            <div className="actions">
              <select 
                value={inquiry.status}
                onChange={(e) => updateInquiryStatus(inquiry._id, e.target.value)}
              >
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Error Handling

### Validation Errors (400)
```json
{
  "success": false,
  "message": "Missing required fields. Please fill in all mandatory information.",
  "required_fields": [
    "full_name", "email", "country", "phone",
    "company_name", "department", "team_size", "requirement_type",
    "training_domain", "detailed_requirements", "terms_accepted"
  ]
}
```

### Specific Field Errors
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone",
      "message": "Phone number must include country code"
    },
    {
      "field": "detailed_requirements",
      "message": "Detailed requirements must be at least 20 characters long"
    }
  ]
}
```

### Server Errors (500)
```json
{
  "success": false,
  "message": "Internal server error while processing your inquiry. Please try again later."
}
```

## Admin Management

### Status Management
Available statuses for inquiry lifecycle:
- `submitted` - Initial submission
- `received` - Acknowledged by team
- `under_review` - Being evaluated
- `in_progress` - Action being taken
- `shortlisted` - Candidate shortlisted (for hiring)
- `interviewed` - Interview completed
- `approved` - Approved for next steps
- `rejected` - Not suitable
- `completed` - Process completed
- `cancelled` - Cancelled by client
- `on_hold` - Temporarily paused

### Priority Levels
- `low` - Standard processing
- `medium` - Default priority
- `high` - High priority (default for hire inquiries)
- `urgent` - Immediate attention required

### Internal Notes
Admins can add internal notes for tracking:
```json
{
  "internal_notes": "High-value client - expedite processing. CEO mentioned in tech conference."
}
```

## Analytics

The analytics endpoint provides insights into:

### Inquiry Volume
- Total number of inquiries
- Average completion percentage
- Trends over time

### Requirement Types
- Distribution of hiring vs training requests
- Popular skill domains
- Team size patterns

### Status Distribution
- Pipeline health
- Processing efficiency
- Bottleneck identification

### Geographic Insights
- Country-wise inquiry distribution
- Regional preferences

## Integration with Universal Form System

The Hire from Medh form integrates seamlessly with the existing Universal Form system:

### Database Structure
- Stored in `UniversalForm` collection
- Form type: `hire_from_medh_inquiry`
- Utilizes shared schemas for contact info and professional details
- Custom `hire_requirements` schema for specific needs

### Workflow Integration
- Follows standard form lifecycle
- Compatible with existing admin tools
- Supports bulk operations and reporting
- Integrates with notification systems

### Benefits of Universal Integration
- Consistent data structure across all forms
- Shared validation and processing logic
- Unified admin interface
- Common analytics and reporting
- Standardized API patterns

## Best Practices

### Frontend Implementation
1. **Progressive Enhancement**: Build form to work without JavaScript
2. **Client-side Validation**: Validate before submission to improve UX
3. **Error Handling**: Provide clear, actionable error messages
4. **Loading States**: Show progress indicators during submission
5. **Success Feedback**: Clear confirmation with next steps

### Backend Processing
1. **Input Sanitization**: Clean all user inputs
2. **Rate Limiting**: Prevent spam submissions
3. **Logging**: Track all submissions for analytics
4. **Email Notifications**: Notify relevant teams immediately
5. **Follow-up Automation**: Set up automated follow-up workflows

### Security Considerations
1. **CSRF Protection**: Implement CSRF tokens for form submissions
2. **Input Validation**: Server-side validation is mandatory
3. **SQL Injection Prevention**: Use parameterized queries
4. **XSS Protection**: Sanitize output in admin interfaces
5. **File Upload Security**: Validate and scan uploaded documents

## Support and Maintenance

For technical support or feature requests related to the Hire from Medh API:

1. **Documentation Updates**: Keep this document current with API changes
2. **Monitoring**: Set up alerts for failed submissions or high error rates
3. **Performance**: Monitor response times and optimize as needed
4. **Data Backup**: Regular backups of inquiry data
5. **Compliance**: Ensure GDPR/privacy compliance for collected data

---

*Last Updated: January 2024*  
*API Version: v1*  
*Status: Active* 