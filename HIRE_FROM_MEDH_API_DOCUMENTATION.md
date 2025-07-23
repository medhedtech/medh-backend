# Hire from Medh API Documentation

## 🚀 Overview

The Hire from Medh inquiry form connects organizations with MEDH's talented pool of certified professionals. This form type (`hire_from_medh_inquiry`) captures hiring requirements, job specifications, and company details to facilitate perfect candidate matching for organizations seeking skilled talent.

## 📋 Form Type

**Form Type**: `hire_from_medh_inquiry`
**Priority**: `high`
**Department**: `partnerships`
**Default Status**: `submitted`
**Acknowledgment Email**: `hire@medh.co`

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

### 2. **Inquiry Details** (Required)

```javascript
inquiry_details: {
  inquiry_type: String,        // Type of inquiry
  preferred_contact_method: String, // Contact preference
  urgency_level: String,       // Request urgency
  course_interest: [String],   // Skills/areas of interest
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
- `hiring_solutions` _(Most relevant for hire from medh)_
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

**Company Size Options**:

- `1-10`
- `11-50`
- `51-200`
- `201-500`
- `500+`
- `not_applicable`

**Budget Range Options**:

- `under_10k`
- `10k_50k`
- `50k_1l`
- `1l_5l`
- `5l_plus`
- `not_disclosed`

**Timeline Options**:

- `immediate`
- `within_week`
- `within_month`
- `within_quarter`
- `flexible`

**Heard About Us Options**:

- `google_search`
- `social_media`
- `referral_friend`
- `referral_colleague`
- `advertisement`
- `blog_article`
- `webinar_event`
- `partner_institution`
- `other`

**Course Interest Options** (Skills/Areas):

```javascript
course_interest: [
  // AI and Data Science
  "ai_data_science",
  "ai_for_professionals",
  "ai_in_finance",
  "ai_in_healthcare",
  "ai_in_manufacturing",

  // Digital Marketing
  "digital_marketing",
  "social_media_marketing",
  "brand_management",
  "online_reputation_management",

  // Business & Management
  "business_analysis_strategy",
  "entrepreneurship_startup",
  "marketing_sales_strategy",

  // Technical Skills
  "programming_python",
  "programming_scala",
  "programming_r",
  "cloud_computing",
  "cybersecurity",

  // Finance & Accounts
  "finance_startups",
  "financial_statement_mis",
  "tax_computation_filing",

  // Personal Development
  "personality_development",
  "vedic_mathematics",
  "emotional_intelligence",
  "public_speaking",
  "time_management",

  // Career Development
  "job_search_strategies",
  "personal_branding",
  "resume_interview_prep",

  // Language & Communication
  "business_english",
  "french_language",
  "mandarin_language",
  "spanish_language",

  // Health & Wellness
  "mental_health_awareness",
  "nutrition_diet_planning",
  "yoga_mindfulness",

  // Industry Specific
  "healthcare_medical_coding",
  "hospitality_tourism",
  "interior_designing",
  "legal_compliance",

  // Environmental & Sustainability
  "renewable_energy",
  "sustainable_agriculture",
  "sustainable_housing",

  // Other
  "other",
];
```

### 3. **Professional Information** (Optional but Recommended)

```javascript
professional_info: {
  designation: String,         // Optional, 2-100 characters
  company_name: String,        // Optional, 2-150 characters
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

**Experience Level Options**:

- `entry`
- `mid`
- `senior`
- `executive`

### 4. **Consent & Compliance** (Required)

```javascript
consent: {
  terms_and_privacy: Boolean,      // Must be true
  data_collection_consent: Boolean, // Must be true
  marketing_consent: Boolean,      // Optional, default false
  accuracy_declaration: Boolean    // Not required for this form type
}
```

### 5. **Security & Validation**

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

### Submit Hire from Medh Inquiry

**Endpoint**: `POST /api/v1/forms`

**Request Headers**:

```
Content-Type: application/json
```

**Request Body**:

```json
{
  "form_type": "hire_from_medh_inquiry",
  "contact_info": {
    "first_name": "Sarah",
    "last_name": "Johnson",
    "email": "sarah.johnson@techcorp.com",
    "mobile_number": {
      "country_code": "+1",
      "number": "5551234567"
    },
    "city": "San Francisco",
    "country": "United States",
    "social_profiles": {
      "linkedin": "https://www.linkedin.com/in/sarahjohnson"
    }
  },
  "professional_info": {
    "designation": "VP of Engineering",
    "company_name": "TechCorp Solutions",
    "company_website": "https://www.techcorp.com",
    "industry": "technology",
    "company_size": "201-500",
    "department": "Engineering",
    "experience_level": "executive"
  },
  "inquiry_details": {
    "inquiry_type": "hiring_solutions",
    "preferred_contact_method": "email",
    "urgency_level": "high",
    "course_interest": [
      "ai_data_science",
      "programming_python",
      "cloud_computing"
    ],
    "company_size": "201-500",
    "budget_range": "1l_5l",
    "timeline": "within_month",
    "heard_about_us": "referral_colleague",
    "additional_requirements": "Looking for senior AI engineers with 5+ years experience in machine learning and cloud platforms. Remote work capability preferred."
  },
  "consent": {
    "terms_and_privacy": true,
    "data_collection_consent": true,
    "marketing_consent": true
  },
  "captcha_token": "03AGdBq25..."
}
```

**Success Response** (201 Created):

```json
{
  "success": true,
  "message": "Hire from Medh inquiry submitted successfully",
  "data": {
    "application_id": "HIR12345678ABC",
    "form_id": "FORM_HIR_123456_ABCD",
    "form_type": "hire_from_medh_inquiry",
    "status": "submitted",
    "priority": "high",
    "department": "partnerships",
    "submitted_at": "2024-01-15T10:30:00.000Z",
    "acknowledgment_email": "hire@medh.co",
    "contact_info": {
      "full_name": "Sarah Johnson",
      "email": "sarah.johnson@techcorp.com",
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
      "field": "contact_info.email",
      "message": "Please enter a valid email address"
    },
    {
      "field": "inquiry_details.inquiry_type",
      "message": "Inquiry type is required"
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

### Inquiry Details Validations

- **inquiry_type**: Optional enum field (empty strings automatically converted to null)
- **preferred_contact_method**: Defaults to "email"
- **urgency_level**: Defaults to "medium"
- **course_interest**: Array of skill/area strings
- **additional_requirements**: Optional text field

### Professional Information Validations (Optional)

- **company_name**: Optional, 2-150 characters
- **company_website**: Optional, valid URL format
- **industry**: Optional enum field (empty strings automatically converted to null)
- **company_size**: Optional enum field (empty strings automatically converted to null)
- **experience_level**: Optional enum field (empty strings automatically converted to null)

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

**Endpoint**: `GET /api/v1/forms/auto-fill-data?form_type=hire_from_medh_inquiry`

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
      "first_name": "Sarah",
      "last_name": "Johnson",
      "email": "sarah@techcorp.com",
      "mobile_number": {
        "country_code": "+1",
        "number": "5551234567"
      },
      "country": "United States"
    },
    "professional_info": {
      "current_company": {
        "name": "TechCorp Solutions",
        "designation": "VP of Engineering"
      }
    }
  }
}
```

## 📈 Status Workflow

### Status Progression

1. **submitted** → Initial submission
2. **acknowledged** → Auto-acknowledgment sent
3. **under_review** → Partnerships team reviewing
4. **shortlisted** → Requirements match available candidates
5. **selected** → Candidate profiles prepared
6. **completed** → Successful placement achieved
7. **rejected** → Requirements don't match available talent
8. **on_hold** → Waiting for client feedback

### Status Updates

**Endpoint**: `PATCH /api/v1/forms/:id/status`

**Request**:

```json
{
  "status": "under_review",
  "internal_note": "Reviewing requirements, identifying suitable candidates"
}
```

## 📧 Email Notifications

### Auto-Acknowledgment Email

- **Trigger**: Form submission
- **Recipient**: Contact email from form
- **From**: hire@medh.co
- **Template**: Hire from Medh acknowledgment
- **Content**: Application ID, next steps, talent matching process

### Internal Notifications

- **Trigger**: New form submission
- **Recipients**: Partnerships team, assigned personnel
- **Content**: Form summary, hiring requirements, candidate matching criteria

## 🏷️ Form Metadata

### Automatic Fields

```javascript
{
  application_id: "HIR12345678ABC",    // Auto-generated unique ID
  form_id: "FORM_HIR_123456_ABCD",     // Auto-generated form ID
  form_type: "hire_from_medh_inquiry",
  priority: "high",                     // Auto-set based on form type
  department: "partnerships",           // Auto-assigned department
  source: "website",                    // Submission source
  submitted_at: Date,                   // Submission timestamp
  ip_address: String,                   // Client IP
  user_agent: String,                   // Browser info
  acknowledgment_email: "hire@medh.co"
}
```

### Internal Management

```javascript
{
  assigned_to: ObjectId,               // Partnership manager assignment
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
  form_type: "hire_from_medh_inquiry",
  contact_info: {
    first_name: "Michael",
    last_name: "Chen",
    email: "michael.chen@startup.com",
    mobile_number: {
      country_code: "+91",
      number: "9876543210",
    },
    city: "Mumbai",
    country: "India",
  },
  professional_info: {
    designation: "CTO",
    company_name: "InnovateTech Startup",
    company_website: "https://www.innovatetech.com",
    industry: "technology",
    company_size: "11-50",
    experience_level: "senior",
  },
  inquiry_details: {
    inquiry_type: "hiring_solutions",
    preferred_contact_method: "phone",
    urgency_level: "high",
    course_interest: [
      "ai_data_science",
      "programming_python",
      "cloud_computing",
      "cybersecurity",
    ],
    company_size: "11-50",
    budget_range: "50k_1l",
    timeline: "within_week",
    heard_about_us: "google_search",
    additional_requirements:
      "Need full-stack developers with AI/ML expertise for fintech product. Must have experience with Python, React, and cloud platforms. Looking for 3-5 experienced developers for immediate joining.",
  },
  consent: {
    terms_and_privacy: true,
    data_collection_consent: true,
    marketing_consent: false,
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
// Get all hire from medh inquiries
GET /api/v1/forms?form_type=hire_from_medh_inquiry&status=submitted

// Search by company name
GET /api/v1/forms?form_type=hire_from_medh_inquiry&search=TechCorp

// Filter by budget range
GET /api/v1/forms/type/hire_from_medh_inquiry?budget_range=1l_5l

// Get high priority inquiries
GET /api/v1/forms?form_type=hire_from_medh_inquiry&priority=high

// Filter by skills required
GET /api/v1/forms?form_type=hire_from_medh_inquiry&course_interest=ai_data_science
```

## 🔍 Dashboard Integration

### Hire from Medh Stats

The form integrates with dashboard statistics showing:

- Total hiring inquiries
- Pending reviews by partnerships team
- Successful placements by skill area
- Average hiring budget by company size
- Timeline distribution for urgent requirements

### Analytics Breakdown

```json
{
  "hire_from_medh_stats": {
    "total_inquiries": 32,
    "this_month": 8,
    "by_industry": {
      "technology": 15,
      "finance": 8,
      "healthcare": 5,
      "education": 4
    },
    "by_company_size": {
      "1-10": 8,
      "11-50": 12,
      "51-200": 7,
      "201-500": 3,
      "500+": 2
    },
    "by_skills_demanded": {
      "ai_data_science": 18,
      "programming_python": 15,
      "cloud_computing": 12,
      "digital_marketing": 8,
      "cybersecurity": 6
    },
    "by_budget_range": {
      "under_10k": 1,
      "10k_50k": 5,
      "50k_1l": 12,
      "1l_5l": 10,
      "5l_plus": 4
    },
    "by_timeline": {
      "immediate": 5,
      "within_week": 8,
      "within_month": 12,
      "within_quarter": 6,
      "flexible": 1
    }
  }
}
```

## ✅ Empty String Handling

**Issue Fixed**: The form gracefully handles empty strings in enum fields.

Previously, sending empty strings (`""`) for optional enum fields would cause validation errors. All enum fields now use a setter function that converts empty strings to `null`:

```javascript
inquiry_type: {
  type: String,
  enum: ["hiring_solutions", "general_inquiry", /*...*/],
  set: function(value) {
    return value === "" ? null : value;
  }
}
```

**Affected Fields**:

- `inquiry_details.inquiry_type`
- `professional_info.industry` (if provided)
- `professional_info.company_size` (if provided)
- `professional_info.experience_level` (if provided)

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
5. **Skills Mapping**: Map course interests to actual skill requirements

### Performance

1. **Indexing**: Query optimization on form_type and status
2. **Pagination**: Limit response sizes for large datasets
3. **Caching**: Cache frequently accessed form metadata
4. **Async**: Use background jobs for candidate matching and notifications

### Hiring Process Integration

1. **Candidate Matching**: Use course_interest array for skill-based matching
2. **Budget Alignment**: Match client budget with candidate expectations
3. **Timeline Management**: Prioritize urgent hiring requirements
4. **Quality Assurance**: Verify candidate qualifications match client needs

---

**Status**: ✅ **Complete** - Ready for integration and production use

**Last Updated**: January 2024
**Version**: 1.0
**Maintained By**: MEDH Backend Team
