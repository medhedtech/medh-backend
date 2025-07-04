# Forms Field Documentation - Medh Web Platform

## Overview

This document provides a comprehensive reference for all forms in the Medh Web Platform, detailing their fields, types, validation rules, and usage patterns. This documentation serves as a technical reference for developers working with the Universal Form System.

---

## Table of Contents

1. [Universal Form System](#universal-form-system)
2. [Contact & Inquiry Forms](#contact--inquiry-forms)
3. [Registration Forms](#registration-forms)
4. [Admin Forms](#admin-forms)
5. [Enrollment Forms](#enrollment-forms)
6. [Career Application Forms](#career-application-forms)
7. [Field Type Reference](#field-type-reference)
8. [Validation Patterns](#validation-patterns)
9. [API Integration](#api-integration)
10. [Form Configuration Examples](#form-configuration-examples)

---

## Universal Form System

The Medh platform uses a unified form system that supports multiple form types through a single model and API. All forms share common base fields while supporting form-specific extensions.

### Base Form Structure

Every form includes these core components:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `form_type` | string | ✅ | Identifies the form type |
| `contact_info` | object | ✅ | Contact information |
| `message` | string | ✅ | Primary message/content |
| `terms_accepted` | boolean | ✅ | Terms acceptance |
| `privacy_policy_accepted` | boolean | ✅ | Privacy policy acceptance |

### Supported Form Types

- `contact_form` - General contact inquiries
- `blog_contact_form` - Simplified blog contact
- `corporate_training_inquiry` - Corporate training requests
- `general_registration` - General service registration
- `school_registration` - Educational institution registration
- `add_student_form` - Admin student creation
- `add_instructor_form` - Admin instructor creation
- `course_enrollment` - Course enrollment applications
- `job_application` - Job application submissions
- `placement_form` - Comprehensive placement applications
- `feedback_form` - User feedback
- `consultation_request` - Consultation requests
- `partnership_inquiry` - Partnership inquiries
- `demo_request` - Product demo requests
- `support_ticket` - Technical support requests

---

## Contact & Inquiry Forms

### 1. ContactForm (`contact_form`)

**Purpose**: General contact inquiries from website visitors
**Usage**: Main contact page, service inquiries

#### Fields Structure

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `contact_info.full_name` | text | ✅ | 2+ chars, letters/spaces/hyphens/apostrophes | Contact person's name |
| `contact_info.email` | email | ✅ | Valid email format | Contact email |
| `contact_info.phone_number` | tel | ❌ | 10 digits | Contact phone number |
| `company` | text | ❌ | Max 100 chars | Company name |
| `subject` | text | ✅ | 3-100 chars | Inquiry subject |
| `message` | textarea | ✅ | 10-2000 chars | Detailed message |

#### Validation Schema
```javascript
const contactFormValidation = {
  contact_info: {
    full_name: "required|min:2|pattern:^[a-zA-Z\\s'-]+$",
    email: "required|email",
    phone_number: "optional|pattern:^\\d{10}$"
  },
  subject: "required|min:3|max:100",
  message: "required|min:10|max:2000",
  company: "optional|max:100"
};
```

### 2. BlogContactForm (`blog_contact_form`)

**Purpose**: Simplified contact form for blog pages
**Usage**: Blog sidebar, article contact sections

#### Fields Structure

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `contact_info.full_name` | text | ✅ | 2+ chars, letters/spaces/hyphens/apostrophes | Contact person's name |
| `contact_info.email` | email | ✅ | Valid email format | Contact email |
| `message` | textarea | ✅ | 10-1000 chars | Message content |

#### Special Features
- **Minimal design** optimized for blog sidebar
- **Quick submission** with immediate feedback
- **Auto-reset** after successful submission

### 3. Corporate Training Form (`corporate_training_inquiry`)

**Purpose**: Corporate training inquiries and requests
**Usage**: Corporate services page, B2B inquiries

#### Fields Structure

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `contact_info.full_name` | text | ✅ | Letters/spaces/hyphens/apostrophes | Contact person's name |
| `contact_info.email` | email | ✅ | Valid email format | Business email |
| `contact_info.country` | select | ❌ | Country list | Country selection |
| `contact_info.phone_number` | tel | ✅ | 10 digits | Business phone |
| `professional_info.designation` | text | ✅ | Job title/position | Contact person's role |
| `professional_info.company_name` | text | ✅ | Company name | Organization name |
| `professional_info.company_website` | url | ✅ | Valid URL format | Company website |
| `message` | textarea | ✅ | Training requirements | Detailed training needs |

#### Extended Fields (Optional)
| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `training_requirements.course_category` | select | ❌ | Training category |
| `training_requirements.preferred_format` | select | ❌ | online/offline/hybrid |
| `training_requirements.number_of_participants` | number | ❌ | Team size |
| `training_requirements.budget_range` | text | ❌ | Budget expectations |
| `training_requirements.preferred_start_date` | date | ❌ | Preferred start date |

---

## Registration Forms

### 4. General Registration (`general_registration`)

**Purpose**: Multi-purpose registration for various services
**Usage**: Service signup, general applications

#### Fields Structure

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `contact_info.full_name` | text | ✅ | Letters/spaces/hyphens/apostrophes | User's full name |
| `contact_info.email` | email | ✅ | Valid email format | User's email |
| `contact_info.country` | select | ✅ | Country list | Country selection |
| `contact_info.phone_number` | tel | ✅ | 10 digits | Phone number |
| `message` | textarea | ✅ | 10+ chars | Requirements/message |
| `files.resume_file` | file | ❌ | PDF/DOC/DOCX, 5MB max | Resume upload (optional) |

### 5. School Registration (`school_registration`)

**Purpose**: Educational institution registration
**Usage**: School/university partnerships, institutional services

#### Fields Structure

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `contact_info.full_name` | text | ✅ | Contact person name | Representative name |
| `contact_info.email` | email | ✅ | Valid email | Institution email |
| `contact_info.phone_number` | tel | ✅ | 10 digits | Contact number |
| `contact_info.country` | select | ✅ | Country list | Location |
| `education_info.school_institute_name` | text | ✅ | Institution name | School/university name |
| `professional_info.designation` | text | ✅ | Job title | Contact person's role |
| `professional_info.company_website` | url | ✅ | Valid URL | Institution website |
| `message` | textarea | ✅ | Requirements | Service requirements |

---

## Admin Forms

### 6. Add Student Form (`add_student_form`)

**Purpose**: Admin interface for adding new students
**Usage**: Admin dashboard, bulk student creation

#### Fields Structure

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `contact_info.full_name` | text | ✅ | Full name | Student's name |
| `personal_details.age` | number | ✅ | Min 1 | Student's age |
| `contact_info.email` | email | ✅ | Valid email | Student's email |
| `contact_info.phone_number` | tel | ✅ | 10 digits | Phone number |
| `contact_info.country_code` | select | ✅ | Country code | Phone country code |
| `personal_details.gender` | select | ✅ | Gender options | Student's gender |
| `password` | password | ❌ | Complex validation | Manual password (optional) |
| `use_manual_password` | checkbox | ❌ | Boolean | Enable manual password |
| `files.user_image` | file | ❌ | Image upload | Profile picture |

#### Password Validation
When `use_manual_password` is enabled:
- Minimum 8 characters
- Must contain uppercase, lowercase, number, and special character
- Pattern: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/`

### 7. Add Instructor Form (`add_instructor_form`)

**Purpose**: Admin interface for adding new instructors
**Usage**: Admin dashboard, instructor onboarding

#### Fields Structure

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `contact_info.full_name` | text | ✅ | Instructor name | Full name |
| `personal_details.age` | number | ✅ | Min 18 years | Age validation |
| `contact_info.phone_number` | tel | ✅ | 10-digit format | Mobile number |
| `contact_info.email` | email | ✅ | Valid email format | Email address |
| `course_name` | text | ❌ | Course specialization | Teaching subject |
| `professional_info.amount_per_session` | number | ✅ | Positive number | Session rate |
| `professional_info.category` | select | ✅ | Course category | Teaching category |
| `password` | password | ✅ | Complex validation | Account password |
| `personal_details.gender` | select | ✅ | Gender options | Gender selection |

---

## Enrollment Forms

### 8. Course Enrollment (`course_enrollment`)

**Purpose**: Course enrollment with detailed preferences
**Usage**: Course pages, enrollment flow

#### Fields Structure

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `contact_info.full_name` | text | ✅ | 3+ chars, letters/spaces/hyphens/apostrophes | Student name |
| `contact_info.email` | email | ✅ | Valid email format | Contact email |
| `contact_info.country` | select | ✅ | Country with dial code | Country selection |
| `contact_info.phone_number` | tel | ✅ | 10 digits | Phone number |
| `course_preferences.course_category` | select | ✅ | Available categories | Course category |
| `course_preferences.course_type` | select | ✅ | Course delivery type | Learning format |
| `message` | textarea | ✅ | 10+ chars | Learning goals |

#### Course Preferences Schema
| Field Name | Type | Options | Description |
|------------|------|---------|-------------|
| `course_preferences.course_type` | select | online, offline, hybrid, self-paced, live | Delivery method |
| `course_preferences.experience_level` | select | beginner, intermediate, advanced | Current skill level |
| `course_preferences.preferred_schedule` | text | - | Schedule preferences |
| `course_preferences.budget_range` | text | - | Budget expectations |
| `course_preferences.preferred_start_date` | date | - | Desired start date |

---

## Career Application Forms

### 9. Job Application Form (`job_application`)

**Purpose**: Job application submissions
**Usage**: Careers page, job postings

#### Fields Structure

| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `contact_info.full_name` | text | ✅ | Letters/spaces/hyphens/apostrophes | Applicant name |
| `contact_info.email` | email | ✅ | Valid email format | Contact email |
| `contact_info.country` | select | ✅ | Country selection | Location |
| `contact_info.phone_number` | tel | ✅ | 10 digits | Phone number |
| `message` | textarea | ❌ | Cover letter/message | Additional information |

### 10. Placement Form (`placement_form`)

**Purpose**: Comprehensive placement application with multi-step process
**Usage**: Placement assistance program, career services

#### Multi-Tab Structure

##### Tab 1: Personal Information
| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `contact_info.first_name` | text | ✅ | First name | Given name |
| `contact_info.last_name` | text | ✅ | Last name | Family name |
| `contact_info.email` | email | ✅ | Valid email | Contact email |
| `contact_info.phone_number` | tel | ✅ | 10 digits | Phone number |
| `files.resume_url` | file | ✅ | PDF/DOC/DOCX, 5MB max | Resume upload |
| `files.linkedin_profile` | url | ❌ | Valid LinkedIn URL | LinkedIn profile |
| `files.github_profile` | url | ❌ | Valid GitHub URL | GitHub profile |
| `files.portfolio_url` | url | ❌ | Valid URL | Portfolio website |
| `files.website` | url | ❌ | Valid URL | Personal website |

##### Tab 2: Education
| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `education_info.highest_education` | text | ✅ | Education level | Highest degree |
| `education_info.university` | text | ✅ | Institution name | University/college |
| `education_info.degree` | text | ✅ | Degree title | Degree obtained |
| `education_info.field_of_study` | text | ✅ | Study field | Major/specialization |
| `education_info.graduation_year` | text | ✅ | 4-digit year | Graduation year |
| `education_info.gpa` | text | ✅ | GPA/percentage | Academic performance |

##### Tab 3: Experience (Dynamic Arrays)
| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `work_experience` | array | ❌ | Work history objects | Professional experience |
| `internships` | array | ❌ | Internship objects | Internship experience |
| `projects` | array | ❌ | Project objects | Personal/academic projects |

###### Work Experience Object
```javascript
{
  title: "string", // Job title
  company: "string", // Company name
  location: "string", // Work location
  start_date: "string", // Start date
  end_date: "string", // End date (optional if current)
  current: "boolean", // Currently working
  description: "string", // Job description
  technologies: ["string"], // Technologies used
  achievements: "string" // Key achievements
}
```

###### Internship Object
```javascript
{
  title: "string", // Internship title
  company: "string", // Company name
  location: "string", // Location
  start_date: "string", // Start date
  end_date: "string", // End date
  current: "boolean", // Currently ongoing
  description: "string", // Description
  technologies: ["string"], // Technologies
  supervisor: "string", // Supervisor name
  stipend: "string" // Stipend amount
}
```

###### Project Object
```javascript
{
  title: "string", // Project name
  description: "string", // Project description
  technologies: ["string"], // Technologies used
  github_url: "string", // GitHub repository
  demo_url: "string", // Live demo URL
  start_date: "string", // Start date
  end_date: "string", // End date
  current: "boolean", // Ongoing project
  role: "string", // Your role
  highlights: "string", // Key highlights
  is_open_source: "boolean", // Open source project
  team_size: "number" // Team size
}
```

##### Tab 4: Skills & Achievements
| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `skills` | array | ❌ | String array | Technical/soft skills |
| `languages_known` | array | ✅ | String array | Known languages |
| `achievements` | array | ❌ | Achievement objects | Awards/recognitions |
| `certifications` | array | ❌ | Certification objects | Professional certifications |

###### Achievement Object
```javascript
{
  title: "string", // Achievement title
  description: "string", // Description
  date: "string", // Date achieved
  issuer: "string", // Issuing organization
  category: "academic|professional|competition|volunteer|other",
  level: "local|regional|national|international"
}
```

###### Certification Object
```javascript
{
  title: "string", // Certification name
  issuer: "string", // Issuing organization
  date: "string", // Issue date
  expiry: "string", // Expiry date (optional)
  credential_id: "string", // Credential ID
  url: "string", // Verification URL
  score: "string", // Score/grade
  status: "active|expired|pending"
}
```

##### Tab 5: Job Preferences
| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `job_preferences.preferred_location` | array | ❌ | String array | Preferred work locations |
| `job_preferences.preferred_job_type` | select | ❌ | full-time/part-time/contract/freelance/internship | Job type |
| `job_preferences.preferred_work_type` | select | ✅ | remote/on-site/hybrid | Work arrangement |
| `job_preferences.expected_salary` | text | ❌ | Salary expectation | Expected compensation |
| `job_preferences.notice_period` | text | ❌ | Notice period | Current notice period |
| `job_preferences.willing_to_relocate` | boolean | ✅ | Boolean | Relocation willingness |
| `job_preferences.availability_date` | date | ❌ | Date | Available start date |
| `job_preferences.job_title_interest` | array | ❌ | String array | Interested job titles |
| `job_preferences.industry_preference` | array | ❌ | String array | Preferred industries |

##### Tab 6: Additional Information
| Field Name | Type | Required | Validation | Description |
|------------|------|----------|------------|-------------|
| `message` | textarea | ✅ | 10-2000 chars | Additional information |
| `references` | array | ❌ | Reference objects | Professional references |
| `additional_info` | textarea | ❌ | Additional details | Extra information |

###### Reference Object
```javascript
{
  name: "string", // Reference name
  designation: "string", // Job title
  company: "string", // Company name
  email: "string", // Email address
  phone: "string", // Phone number
  relationship: "supervisor|colleague|mentor|client|professor|other",
  years_known: "number" // Years known
}
```

#### Multi-Step Validation

The placement form uses step-wise validation:

```javascript
const stepValidation = {
  1: ["contact_info", "files.resume_url"], // Personal info + resume required
  2: ["education_info"], // All education fields required
  3: [], // Experience is optional
  4: ["languages_known"], // Languages required
  5: ["job_preferences.preferred_work_type", "job_preferences.willing_to_relocate"],
  6: ["message", "terms_accepted", "privacy_policy_accepted"]
};
```

---

## Field Type Reference

### Input Types

| Type | HTML Input | Validation | Use Case | Example |
|------|------------|------------|----------|---------|
| `text` | `type="text"` | String patterns | Names, titles | `full_name`, `company_name` |
| `email` | `type="email"` | Email format | Email addresses | `contact_info.email` |
| `tel` | `type="tel"` | Phone patterns | Phone numbers | `phone_number` |
| `password` | `type="password"` | Strength validation | Passwords | `password` |
| `number` | `type="number"` | Numeric validation | Ages, amounts | `age`, `amount_per_session` |
| `url` | `type="url"` | URL format | Websites, profiles | `company_website`, `github_profile` |
| `date` | `type="date"` | Date validation | Dates, deadlines | `preferred_start_date` |
| `file` | `type="file"` | File type/size | Document uploads | `resume_file`, `user_image` |
| `checkbox` | `type="checkbox"` | Boolean | Agreements, preferences | `terms_accepted` |
| `select` | `<select>` | Option validation | Dropdowns, categories | `gender`, `course_type` |
| `textarea` | `<textarea>` | Text length | Messages, descriptions | `message`, `description` |

### Custom Field Types

| Field Type | Description | Validation | Example Usage |
|------------|-------------|------------|---------------|
| `phone_with_country` | Phone with country code | Country-specific validation | International contact forms |
| `skill_tags` | Multi-select skill tags | Predefined skill list | Skills selection |
| `experience_level` | Experience dropdown | Enum validation | Job applications |
| `file_upload` | File upload with preview | Type/size validation | Resume, portfolio uploads |
| `date_range` | Start and end date picker | Date range validation | Employment history |
| `rating_scale` | 1-5 rating scale | Numeric range | Feedback forms |

---

## Validation Patterns

### Common Regex Patterns

```javascript
const validationPatterns = {
  // Name validation (letters, spaces, hyphens, apostrophes)
  name: /^[a-zA-Z\s'-]+$/,
  
  // Email validation (comprehensive)
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // Phone validation (10 digits)
  phone: /^\d{10}$/,
  
  // International phone validation
  internationalPhone: /^\+[1-9]\d{1,14}$/,
  
  // URL validation
  url: /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[a-zA-Z0-9-]*)*$/,
  
  // Strong password validation
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  
  // Year validation (4 digits)
  year: /^\d{4}$/,
  
  // MongoDB ObjectId validation
  mongoId: /^[0-9a-fA-F]{24}$/
};
```

### Validation Functions

```javascript
// Email validation
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Phone validation with country code
const validatePhone = (phone, countryCode) => {
  const cleanNumber = phone.replace(/\D/g, '');
  return cleanNumber.length === 10 && /^\d{10}$/.test(cleanNumber);
};

// Password strength calculation
const calculatePasswordStrength = (password) => {
  let score = 0;
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password)
  ];
  
  score = checks.filter(Boolean).length;
  
  const levels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const colors = ["red", "orange", "yellow", "blue", "green"];
  
  return {
    score,
    message: levels[score] || "Very Weak",
    color: colors[score] || "red",
    percentage: (score / 5) * 100
  };
};

// File validation
const validateFile = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['pdf', 'doc', 'docx'],
    required = false
  } = options;
  
  if (!file && required) {
    return { valid: false, message: "File is required" };
  }
  
  if (file && file.size > maxSize) {
    return { valid: false, message: `File size must be less than ${maxSize / (1024 * 1024)}MB` };
  }
  
  const fileExtension = file.name.split('.').pop().toLowerCase();
  if (file && !allowedTypes.includes(fileExtension)) {
    return { valid: false, message: `File type must be one of: ${allowedTypes.join(', ')}` };
  }
  
  return { valid: true };
};
```

---

## API Integration

### Form Submission Endpoint

```javascript
POST /api/v1/forms/submit

// Request Body
{
  "form_type": "corporate_training_inquiry",
  "contact_info": {
    "full_name": "John Doe",
    "email": "john@company.com",
    "phone_number": "9876543210",
    "country": "India"
  },
  "professional_info": {
    "designation": "Training Manager",
    "company_name": "Tech Corp",
    "company_website": "https://techcorp.com"
  },
  "message": "We need Python training for 20 developers",
  "terms_accepted": true,
  "privacy_policy_accepted": true,
  "source": "website",
  "utm_source": "google",
  "utm_campaign": "corporate-training"
}

// Response
{
  "success": true,
  "message": "Form submitted successfully",
  "data": {
    "form_id": "corporate_training_inquiry_1640995200000_abc123def",
    "status": "submitted",
    "submitted_at": "2023-12-01T10:30:00Z"
  }
}
```

### Form Status Check

```javascript
GET /api/v1/forms/status/:form_id

// Response
{
  "success": true,
  "data": {
    "form_id": "corporate_training_inquiry_1640995200000_abc123def",
    "status": "under_review",
    "submitted_at": "2023-12-01T10:30:00Z",
    "processed_at": "2023-12-01T11:00:00Z",
    "completion_percentage": 100,
    "is_complete": true
  }
}
```

### Admin Endpoints

```javascript
// Get all forms with filtering
GET /api/v1/forms/admin/all?form_type=placement_form&status=submitted&page=1&limit=10

// Update form status
PUT /api/v1/forms/admin/:form_id
{
  "status": "approved",
  "internal_notes": [
    {
      "note": "Candidate looks promising, scheduling interview",
      "added_by": "admin_user_id"
    }
  ]
}

// Get form analytics
GET /api/v1/forms/admin/analytics?form_type=corporate_training_inquiry
```

---

## Form Configuration Examples

### Basic Contact Form Config

```javascript
const contactFormConfig = {
  formType: "contact_form",
  title: "Get in Touch",
  subtitle: "We'd love to hear from you",
  fields: {
    contact_info: {
      full_name: { required: true, placeholder: "Your full name" },
      email: { required: true, placeholder: "your.email@company.com" },
      phone_number: { required: false, placeholder: "Your phone number" }
    },
    company: { required: false, placeholder: "Your company name" },
    subject: { required: true, placeholder: "How can we help you?" },
    message: { required: true, placeholder: "Tell us more about your requirements..." }
  },
  submitButton: {
    text: "Send Message",
    loadingText: "Sending..."
  },
  successMessage: "Thank you! We'll get back to you within 24 hours.",
  validation: {
    realTime: true,
    showErrors: "onBlur"
  }
};
```

### Corporate Training Form Config

```javascript
const corporateFormConfig = {
  formType: "corporate_training_inquiry",
  title: "Corporate Training Inquiry",
  subtitle: "Transform your team with our expert-led training programs",
  sections: [
    {
      title: "Contact Information",
      fields: ["contact_info.full_name", "contact_info.email", "contact_info.phone_number"]
    },
    {
      title: "Company Details",
      fields: ["professional_info.designation", "professional_info.company_name", "professional_info.company_website"]
    },
    {
      title: "Training Requirements",
      fields: ["message", "training_requirements.course_category", "training_requirements.number_of_participants"]
    }
  ],
  features: {
    progressIndicator: true,
    autosave: true,
    fileUpload: false,
    recaptcha: true
  }
};
```

### Multi-Step Placement Form Config

```javascript
const placementFormConfig = {
  formType: "placement_form",
  title: "Placement Application",
  subtitle: "Join our placement assistance program",
  multiStep: true,
  steps: [
    {
      id: 1,
      title: "Personal Information",
      description: "Basic contact details and resume",
      fields: ["contact_info", "files.resume_url", "files.linkedin_profile"],
      validation: "required"
    },
    {
      id: 2,
      title: "Education",
      description: "Educational background",
      fields: ["education_info"],
      validation: "required"
    },
    {
      id: 3,
      title: "Experience",
      description: "Work experience and projects",
      fields: ["work_experience", "internships", "projects"],
      validation: "optional"
    },
    {
      id: 4,
      title: "Skills & Achievements",
      description: "Technical skills and accomplishments",
      fields: ["skills", "languages_known", "achievements", "certifications"],
      validation: "partial"
    },
    {
      id: 5,
      title: "Job Preferences",
      description: "Career preferences and expectations",
      fields: ["job_preferences"],
      validation: "required"
    },
    {
      id: 6,
      title: "Additional Information",
      description: "Final details and references",
      fields: ["message", "references", "additional_info"],
      validation: "required"
    }
  ],
  navigation: {
    showProgress: true,
    allowSkip: false,
    saveProgress: true
  },
  completion: {
    showSummary: true,
    allowEdit: true,
    confirmSubmission: true
  }
};
```

---

## Frontend Integration Examples

### React Hook for Form Handling

```javascript
import { useState, useCallback } from 'react';
import { validateUniversalForm } from '../utils/formValidation';

export const useUniversalForm = (formType, initialData = {}) => {
  const [formData, setFormData] = useState({
    form_type: formType,
    ...initialData
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const updateField = useCallback((fieldPath, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = fieldPath.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
    
    // Clear field error on change
    if (errors[fieldPath]) {
      setErrors(prev => ({ ...prev, [fieldPath]: null }));
    }
  }, [errors]);

  const validateForm = useCallback(() => {
    const validation = validateUniversalForm(formData);
    if (validation.error) {
      const fieldErrors = {};
      validation.error.details.forEach(detail => {
        fieldErrors[detail.path.join('.')] = detail.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }, [formData]);

  const submitForm = useCallback(async () => {
    if (!validateForm()) return false;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      if (result.success) {
        setIsSubmitted(true);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setErrors({ submit: error.message });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm]);

  return {
    formData,
    errors,
    isSubmitting,
    isSubmitted,
    updateField,
    validateForm,
    submitForm,
    resetForm: () => {
      setFormData({ form_type: formType });
      setErrors({});
      setIsSubmitted(false);
    }
  };
};
```

### Form Component Example

```jsx
import React from 'react';
import { useUniversalForm } from '../hooks/useUniversalForm';

const CorporateTrainingForm = () => {
  const {
    formData,
    errors,
    isSubmitting,
    isSubmitted,
    updateField,
    submitForm
  } = useUniversalForm('corporate_training_inquiry');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await submitForm();
    if (result) {
      // Handle success
      console.log('Form submitted:', result.data.form_id);
    }
  };

  if (isSubmitted) {
    return (
      <div className="success-message">
        <h3>Thank you for your inquiry!</h3>
        <p>We'll contact you within 24 hours to discuss your training needs.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="corporate-training-form">
      <div className="form-section">
        <h3>Contact Information</h3>
        
        <div className="form-field">
          <label>Full Name *</label>
          <input
            type="text"
            value={formData.contact_info?.full_name || ''}
            onChange={(e) => updateField('contact_info.full_name', e.target.value)}
            className={errors['contact_info.full_name'] ? 'error' : ''}
          />
          {errors['contact_info.full_name'] && (
            <span className="error-message">{errors['contact_info.full_name']}</span>
          )}
        </div>

        <div className="form-field">
          <label>Email Address *</label>
          <input
            type="email"
            value={formData.contact_info?.email || ''}
            onChange={(e) => updateField('contact_info.email', e.target.value)}
            className={errors['contact_info.email'] ? 'error' : ''}
          />
          {errors['contact_info.email'] && (
            <span className="error-message">{errors['contact_info.email']}</span>
          )}
        </div>

        <div className="form-field">
          <label>Phone Number *</label>
          <input
            type="tel"
            value={formData.contact_info?.phone_number || ''}
            onChange={(e) => updateField('contact_info.phone_number', e.target.value)}
            className={errors['contact_info.phone_number'] ? 'error' : ''}
          />
          {errors['contact_info.phone_number'] && (
            <span className="error-message">{errors['contact_info.phone_number']}</span>
          )}
        </div>
      </div>

      <div className="form-section">
        <h3>Company Details</h3>
        
        <div className="form-field">
          <label>Designation *</label>
          <input
            type="text"
            value={formData.professional_info?.designation || ''}
            onChange={(e) => updateField('professional_info.designation', e.target.value)}
            className={errors['professional_info.designation'] ? 'error' : ''}
          />
          {errors['professional_info.designation'] && (
            <span className="error-message">{errors['professional_info.designation']}</span>
          )}
        </div>

        <div className="form-field">
          <label>Company Name *</label>
          <input
            type="text"
            value={formData.professional_info?.company_name || ''}
            onChange={(e) => updateField('professional_info.company_name', e.target.value)}
            className={errors['professional_info.company_name'] ? 'error' : ''}
          />
          {errors['professional_info.company_name'] && (
            <span className="error-message">{errors['professional_info.company_name']}</span>
          )}
        </div>

        <div className="form-field">
          <label>Company Website *</label>
          <input
            type="url"
            value={formData.professional_info?.company_website || ''}
            onChange={(e) => updateField('professional_info.company_website', e.target.value)}
            className={errors['professional_info.company_website'] ? 'error' : ''}
          />
          {errors['professional_info.company_website'] && (
            <span className="error-message">{errors['professional_info.company_website']}</span>
          )}
        </div>
      </div>

      <div className="form-section">
        <h3>Training Requirements</h3>
        
        <div className="form-field">
          <label>Your Message *</label>
          <textarea
            value={formData.message || ''}
            onChange={(e) => updateField('message', e.target.value)}
            placeholder="Please describe your training requirements, team size, preferred schedule, and any specific topics you'd like to cover..."
            rows="5"
            className={errors.message ? 'error' : ''}
          />
          {errors.message && (
            <span className="error-message">{errors.message}</span>
          )}
        </div>
      </div>

      <div className="form-section">
        <div className="form-field checkbox-field">
          <label>
            <input
              type="checkbox"
              checked={formData.terms_accepted || false}
              onChange={(e) => updateField('terms_accepted', e.target.checked)}
            />
            I accept the <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a> *
          </label>
          {errors.terms_accepted && (
            <span className="error-message">{errors.terms_accepted}</span>
          )}
        </div>
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting}
        className="submit-button"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
      </button>

      {errors.submit && (
        <div className="error-message submit-error">{errors.submit}</div>
      )}
    </form>
  );
};

export default CorporateTrainingForm;
```

---

## Best Practices

### Form Design
1. **Progressive disclosure** - Show only necessary fields initially
2. **Clear labeling** - Use descriptive labels and placeholders
3. **Inline validation** - Provide immediate feedback
4. **Error handling** - Show clear, actionable error messages
5. **Success feedback** - Confirm successful submissions
6. **Mobile optimization** - Ensure forms work well on all devices

### Validation Strategy
1. **Client-side validation** - Immediate user feedback
2. **Server-side validation** - Security and data integrity
3. **Progressive validation** - Validate as user types/moves
4. **Contextual help** - Provide format examples
5. **Accessibility** - Screen reader compatible errors

### Performance Optimization
1. **Lazy loading** - Load form components on demand
2. **Debounced validation** - Avoid excessive API calls
3. **Form state management** - Efficient state updates
4. **Conditional rendering** - Show only relevant fields
5. **Memory management** - Clean up resources

### Security Considerations
1. **Input sanitization** - Clean all user inputs
2. **CSRF protection** - Prevent cross-site request forgery
3. **Rate limiting** - Prevent spam submissions
4. **File validation** - Secure file uploads
5. **Data encryption** - Protect sensitive information

---

## Conclusion

This comprehensive documentation provides a complete reference for all forms in the Medh Web Platform. The Universal Form System enables consistent handling of diverse form types while maintaining flexibility for specific requirements. Each form is designed with user experience, validation, and data integrity in mind.

For implementation details and code examples, refer to the respective component files and the UniversalForm system documentation. The system supports both simple contact forms and complex multi-step applications, providing a scalable solution for all form requirements.

### Quick Reference

- **Model**: `models/universal-form.model.js`
- **Validation**: `validations/universalFormValidation.js`
- **Controller**: `controllers/universalFormController.js`
- **Routes**: `routes/universalFormRoutes.js`
- **API Documentation**: `UNIVERSAL_FORM_API_DOCUMENTATION.md`
- **Example Forms**: `examples/` directory

For support or questions about form implementation, refer to the development team or create an issue in the project repository. 