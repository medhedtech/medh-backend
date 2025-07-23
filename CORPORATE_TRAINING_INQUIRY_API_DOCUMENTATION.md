# Corporate Training Inquiry API Documentation

## 🚀 Overview

The Corporate Training Inquiry form is designed to capture comprehensive information from organizations seeking training solutions. This form type (`corporate_training_inquiry`) collects contact details, professional information, and specific training requirements to enable MEDH to provide tailored corporate training solutions.

## 📋 Form Type

**Form Type**: `corporate_training_inquiry`
**Priority**: `high`
**Department**: `sales`
**Default Status**: `submitted`
**Acknowledgment Email**: `corporate@medh.co`

## 📊 Schema Structure

### 1. **Contact Information** (Required)

```javascript
contact_info: {
  // Name fields (separate as per requirements)
  first_name: String,          // Required, alphabets only
  middle_name: String,         // Optional, alphabets only
  last_name: String,           // Required, alphabets only
  full_name: String,           // Auto-generated from first + middle + last

  // Contact details
  email: String,               // Required, valid email format
  mobile_number: {
    country_code: String,      // Required, format: +XX
    number: String,            // Required, normalized and validated
    formatted: String,         // Auto-generated international format
    is_validated: Boolean      // Auto-set based on validation
  },

  // Location
  city: String,                // Required
  country: String,             // Required, validated against country list
  address: String,             // Optional

  // Social profiles (optional)
  social_profiles: {
    linkedin: String,          // LinkedIn URL validation
    facebook: String,          // Facebook URL validation
    instagram: String,         // Instagram URL validation
    portfolio: String          // Portfolio URL validation
  }
}
```

### 2. **Professional Information** (Required)

```javascript
professional_info: {
  designation: String,         // Required, 2-100 characters
  company_name: String,        // Required, 2-150 characters
  company_website: String,     // Optional, valid URL format
  industry: String,            // Optional, enum values
  company_size: String,        // Optional, predefined ranges
  department: String,          // Optional, max 100 characters
  experience_level: String     // Optional, career level enum
}
```

**Industry Options**:

- `technology`
- `healthcare`
- `finance`
- `education`
- `manufacturing`
- `retail`
- `consulting`
- `government`
- `non_profit`
- `other`

**Company Size Options**:

- `1-10`
- `11-50`
- `51-200`
- `201-500`
- `500+`

**Experience Level Options**:

- `entry`
- `mid`
- `senior`
- `executive`

### 3. **Training Requirements** (Required)

```javascript
training_requirements: {
  training_type: String,       // Type of training needed
  training_mode: String,       // Delivery preference
  participants_count: Number,  // 1-10,000 participants
  duration_preference: String, // Training duration
  budget_range: String,        // Budget expectations
  timeline: String,            // Implementation timeline
  specific_skills: [String],   // Array of specific skills
  custom_requirements: String, // Custom needs (max 2000 chars)
  has_existing_lms: Boolean,   // Existing LMS availability
  lms_integration_needed: Boolean // LMS integration requirement
}
```

**Training Type Options**:

- `technical_skills`
- `soft_skills`
- `leadership`
- `compliance`
- `product_training`
- `sales_training`
- `customer_service`
- `digital_transformation`
- `other`

**Training Mode Options**:

- `online`
- `onsite`
- `hybrid`
- `flexible`

**Duration Preference Options**:

- `1_day`
- `2-3_days`
- `1_week`
- `2-4_weeks`
- `1-3_months`
- `ongoing`

**Budget Range Options**:

- `under_1l` (Under ₹1 Lakh)
- `1l_5l` (₹1-5 Lakhs)
- `5l_10l` (₹5-10 Lakhs)
- `10l_25l` (₹10-25 Lakhs)
- `25l_50l` (₹25-50 Lakhs)
- `50l_plus` (₹50+ Lakhs)
- `not_disclosed`

**Timeline Options**:

- `immediate`
- `within_month`
- `within_quarter`
- `within_6months`
- `flexible`

### 4. **Inquiry Details** (Required)

```javascript
inquiry_details: {
  inquiry_type: String,        // Type of inquiry
  preferred_contact_method: String, // Contact preference
  urgency_level: String,       // Request urgency
  course_interest: [String],   // Areas of interest
  company_size: String,        // Organization size
  budget_range: String,        // Budget expectations
  timeline: String,            // Expected timeline
  heard_about_us: String,      // Source of referral
  additional_requirements: String // Extra requirements
}
```

**Inquiry Type Options**:

- `course_information`
- `enrollment_assistance`
- `technical_support`
- `billing_payment`
- `corporate_training`
- `membership_plans`
- `hiring_solutions`
- `partnership_opportunities`
- `media_press`
- `general_inquiry`
- `feedback_complaint`

**Preferred Contact Method**:

- `email`
- `phone`
- `whatsapp`

**Urgency Level**:

- `low`
- `medium`
- `high`
- `urgent`

### 5. **Consent & Compliance** (Required)

```javascript
consent: {
  terms_and_privacy: Boolean,      // Must be true
  data_collection_consent: Boolean, // Must be true
  marketing_consent: Boolean,      // Optional, default false
  accuracy_declaration: Boolean    // Not required for this form type
}
```

### 6. **Security & Validation**

```javascript
captcha_token: String,    // Required for form submission
captcha_validated: Boolean, // Auto-set during validation
ip_address: String,       // Auto-captured
user_agent: String,       // Auto-captured
browser_info: {           // Auto-captured
  name: String,
  version: String,
  os: String
}
```

## 🎯 API Endpoints

### Submit Corporate Training Inquiry

**Endpoint**: `POST /api/v1/forms`

**Request Headers**:

```
Content-Type: application/json
```

**Request Body**:

```json
{
  "form_type": "corporate_training_inquiry",
  "contact_info": {
    "first_name": "John",
    "last_name": "Smith",
    "email": "john.smith@company.com",
    "mobile_number": {
      "country_code": "+1",
      "number": "5551234567"
    },
    "city": "New York",
    "country": "United States",
    "social_profiles": {
      "linkedin": "https://www.linkedin.com/in/johnsmith"
    }
  },
  "professional_info": {
    "designation": "HR Director",
    "company_name": "Tech Solutions Inc",
    "company_website": "https://www.techsolutions.com",
    "industry": "technology",
    "company_size": "201-500",
    "department": "Human Resources",
    "experience_level": "senior"
  },
  "training_requirements": {
    "training_type": "technical_skills",
    "training_mode": "hybrid",
    "participants_count": 50,
    "duration_preference": "2-4_weeks",
    "budget_range": "10l_25l",
    "timeline": "within_quarter",
    "specific_skills": [
      "Python Programming",
      "Data Analysis",
      "AI Fundamentals"
    ],
    "custom_requirements": "Need certification upon completion and LMS integration",
    "has_existing_lms": true,
    "lms_integration_needed": true
  },
  "inquiry_details": {
    "inquiry_type": "corporate_training",
    "preferred_contact_method": "email",
    "urgency_level": "high",
    "course_interest": ["ai_data_science", "programming_python"],
    "heard_about_us": "google_search",
    "additional_requirements": "Prefer weekend sessions to minimize work disruption"
  },
  "consent": {
    "terms_and_privacy": true,
    "data_collection_consent": true,
    "marketing_consent": false
  },
  "captcha_token": "03AGdBq25..."
}
```

**Success Response** (201 Created):

```json
{
  "success": true,
  "message": "Corporate training inquiry submitted successfully",
  "data": {
    "application_id": "COR12345678ABC",
    "form_id": "FORM_COR_123456_ABCD",
    "form_type": "corporate_training_inquiry",
    "status": "submitted",
    "priority": "high",
    "department": "sales",
    "submitted_at": "2024-01-15T10:30:00.000Z",
    "acknowledgment_email": "corporate@medh.co",
    "contact_info": {
      "full_name": "John Smith",
      "email": "john.smith@company.com",
      "mobile_number": {
        "formatted": "+1 555-123-4567",
        "is_validated": true
      }
    }
  }
}
```

**Error Response** (400 Bad Request):

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "professional_info.designation",
      "message": "Designation is required for corporate training inquiry"
    },
    {
      "field": "training_requirements.participants_count",
      "message": "Participants count must be between 1 and 10,000"
    }
  ]
}
```

## 📝 Field Validations

### Contact Information Validations

- **first_name, last_name**: Required, alphabets only, NAME_REGEX pattern
- **email**: Required, valid email format (EMAIL_REGEX)
- **mobile_number**: Country-specific validation with auto-normalization
- **country**: Validated against country service list

### Professional Information Validations

- **designation**: Required, 2-100 characters
- **company_name**: Required, 2-150 characters
- **company_website**: Optional, valid URL format
- **industry**: Optional enum field (empty strings automatically converted to null)
- **company_size**: Optional enum field (empty strings automatically converted to null)
- **experience_level**: Optional enum field (empty strings automatically converted to null)
- **department**: Optional, max 100 characters

### Training Requirements Validations

- **training_type**: Optional enum field (empty strings automatically converted to null)
- **duration_preference**: Optional enum field (empty strings automatically converted to null)
- **budget_range**: Optional enum field (empty strings automatically converted to null)
- **timeline**: Optional enum field (empty strings automatically converted to null)
- **participants_count**: Required, 1-10,000 range
- **custom_requirements**: Optional, max 2000 characters
- **specific_skills**: Array of strings
- **has_existing_lms, lms_integration_needed**: Boolean values

### Consent Validations

- **terms_and_privacy**: Must be `true`
- **data_collection_consent**: Must be `true`
- **marketing_consent**: Optional boolean
- **captcha_token**: Required for submission

## 🔄 Auto-Fill Integration

### User Profile Auto-Fill

If a logged-in user submits the form, the following fields are auto-filled:

```javascript
// Auto-filled from user profile
contact_info: {
  first_name: user.full_name.split(' ')[0],
  last_name: user.full_name.split(' ').pop(),
  email: user.email,
  mobile_number: user.phone_numbers[0],
  country: user.country,
  address: user.address,
  social_profiles: {
    linkedin: user.linkedin_link,
    portfolio: user.portfolio_link
  }
},
professional_info: {
  company_name: user.meta.company,
  designation: user.meta.occupation
}
```

### Get Auto-Fill Data

**Endpoint**: `GET /api/v1/forms/auto-fill-data?form_type=corporate_training_inquiry`

**Headers**:

```
Authorization: Bearer <jwt_token>
```

**Response**:

```json
{
  "success": true,
  "data": {
    "contact_info": {
      "first_name": "John",
      "last_name": "Smith",
      "email": "john@company.com",
      "mobile_number": {
        "country_code": "+1",
        "number": "5551234567"
      },
      "country": "United States"
    },
    "professional_info": {
      "current_company": {
        "name": "Tech Solutions Inc",
        "designation": "HR Director"
      }
    }
  }
}
```

## 📈 Status Workflow

### Status Progression

1. **submitted** → Initial submission
2. **acknowledged** → Auto-acknowledgment sent
3. **under_review** → Sales team reviewing
4. **shortlisted** → Requirements match available programs
5. **selected** → Training proposal prepared
6. **completed** → Training delivered successfully
7. **rejected** → Requirements don't match
8. **on_hold** → Waiting for client response

### Status Updates

**Endpoint**: `PATCH /api/v1/forms/:id/status`

**Request**:

```json
{
  "status": "under_review",
  "internal_note": "Requirements reviewed, preparing proposal"
}
```

## 📧 Email Notifications

### Auto-Acknowledgment Email

- **Trigger**: Form submission
- **Recipient**: Contact email from form
- **From**: corporate@medh.co
- **Template**: Corporate training acknowledgment
- **Content**: Application ID, next steps, contact information

### Internal Notifications

- **Trigger**: New form submission
- **Recipients**: Sales team, assigned personnel
- **Content**: Form summary, priority level, client requirements

## 🏷️ Form Metadata

### Automatic Fields

```javascript
{
  application_id: "COR12345678ABC",    // Auto-generated unique ID
  form_id: "FORM_COR_123456_ABCD",     // Auto-generated form ID
  form_type: "corporate_training_inquiry",
  priority: "high",                     // Auto-set based on form type
  department: "sales",                  // Auto-assigned department
  source: "website",                    // Submission source
  submitted_at: Date,                   // Submission timestamp
  ip_address: String,                   // Client IP
  user_agent: String,                   // Browser info
  acknowledgment_email: "corporate@medh.co"
}
```

### Internal Management

```javascript
{
  assigned_to: ObjectId,               // Sales rep assignment
  internal_notes: [{
    note: String,
    added_by: ObjectId,
    added_at: Date
  }],
  acknowledgment_sent: Boolean,
  acknowledgment_sent_at: Date,
  processed_at: Date,
  completed_at: Date
}
```

## 🎯 Usage Examples

### Complete Form Submission

```javascript
// Frontend form submission
const formData = {
  form_type: "corporate_training_inquiry",
  contact_info: {
    first_name: "Sarah",
    last_name: "Johnson",
    email: "sarah.johnson@enterprise.com",
    mobile_number: {
      country_code: "+91",
      number: "9876543210",
    },
    city: "Bangalore",
    country: "India",
  },
  professional_info: {
    designation: "Learning & Development Manager",
    company_name: "Enterprise Solutions Pvt Ltd",
    company_website: "https://www.enterprise-solutions.com",
    industry: "technology",
    company_size: "201-500",
    experience_level: "senior",
  },
  training_requirements: {
    training_type: "digital_transformation",
    training_mode: "hybrid",
    participants_count: 100,
    duration_preference: "1-3_months",
    budget_range: "25l_50l",
    timeline: "within_quarter",
    specific_skills: [
      "AI Implementation",
      "Cloud Migration",
      "Data Analytics",
      "Change Management",
    ],
    custom_requirements: "Need role-specific modules for different departments",
    has_existing_lms: true,
    lms_integration_needed: true,
  },
  inquiry_details: {
    inquiry_type: "corporate_training",
    preferred_contact_method: "email",
    urgency_level: "high",
    heard_about_us: "referral_colleague",
    additional_requirements:
      "Prefer certified trainers with industry experience",
  },
  consent: {
    terms_and_privacy: true,
    data_collection_consent: true,
    marketing_consent: true,
  },
  captcha_token: "verified_token_here",
};

// Submit form
fetch("/api/v1/forms", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(formData),
});
```

### Form Filtering & Search

```javascript
// Get all corporate training inquiries
GET /api/v1/forms?form_type=corporate_training_inquiry&status=submitted

// Search by company name
GET /api/v1/forms?form_type=corporate_training_inquiry&search=Enterprise

// Filter by budget range
GET /api/v1/forms/type/corporate_training_inquiry?budget_range=25l_50l

// Get high priority inquiries
GET /api/v1/forms?form_type=corporate_training_inquiry&priority=high
```

## 🔍 Dashboard Integration

### Corporate Training Stats

The form integrates with dashboard statistics showing:

- Total corporate training inquiries
- Pending reviews by sales team
- Conversion rates by industry
- Average deal size by company size
- Timeline distribution

### Analytics Breakdown

```json
{
  "corporate_training_stats": {
    "total_inquiries": 45,
    "this_month": 12,
    "by_industry": {
      "technology": 18,
      "healthcare": 12,
      "finance": 8,
      "manufacturing": 7
    },
    "by_company_size": {
      "1-10": 5,
      "11-50": 12,
      "51-200": 15,
      "201-500": 8,
      "500+": 5
    },
    "by_budget_range": {
      "under_1l": 2,
      "1l_5l": 8,
      "5l_10l": 12,
      "10l_25l": 15,
      "25l_50l": 6,
      "50l_plus": 2
    }
  }
}
```

## ✅ Empty String Handling

**Issue Fixed**: The form now gracefully handles empty strings in enum fields.

Previously, sending empty strings (`""`) for optional enum fields like `duration_preference`, `training_type`, etc., would cause validation errors:

```
ValidationError: `` is not a valid enum value for path `duration_preference`
```

**Solution**: All enum fields now use a setter function that converts empty strings to `null`, making them truly optional:

```javascript
duration_preference: {
  type: String,
  enum: ["1_day", "2-3_days", "1_week", "2-4_weeks", "1-3_months", "ongoing"],
  set: function(value) {
    return value === "" ? null : value;
  }
}
```

**Affected Fields**:

- `training_requirements.training_type`
- `training_requirements.duration_preference`
- `training_requirements.budget_range`
- `training_requirements.timeline`
- `professional_info.industry`
- `professional_info.company_size`
- `professional_info.experience_level`
- `inquiry_details.inquiry_type`

## 🚀 Best Practices

### Form Validation

1. **Client-side**: Validate required fields before submission
2. **Server-side**: Use schema validation for data integrity
3. **Phone Numbers**: Implement country-specific validation
4. **Email**: Use real-time email validation
5. **Captcha**: Always validate captcha tokens
6. **Empty Values**: Frontend can safely send empty strings for optional enum fields

### Data Handling

1. **Normalization**: Auto-format phone numbers and names
2. **Sanitization**: Clean input data before storage
3. **Validation**: Use enum validations for dropdown fields
4. **Auto-fill**: Leverage user profiles for better UX

### Performance

1. **Indexing**: Query optimization on form_type and status
2. **Pagination**: Limit response sizes for large datasets
3. **Caching**: Cache frequently accessed form metadata
4. **Async**: Use background jobs for email notifications

---

**Status**: ✅ **Complete** - Ready for integration and production use

**Last Updated**: January 2024
**Version**: 1.0
**Maintained By**: MEDH Backend Team
