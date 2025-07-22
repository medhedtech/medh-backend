# Universal Form Integration Guide

## Overview

This guide provides comprehensive documentation for integrating with the Universal Form API. The system uses a simplified, DRY approach with a single flexible model that handles multiple form types through customizable fields. **Enhanced with intelligent auto-fill functionality for logged-in users and proper phone number validation using libphonenumber-js.**

## 🎯 **Form Types Supported**

### 1. 🎯 **Candidate Application Form** (`candidate_application`)

For job applications with employment history and preferences.

### 2. 🏫 **School/Institute Partnership Form** (`school_partnership`)

For educational institutions seeking partnerships.

### 3. 👩‍🏫 **Educator Application Form** (`educator_application`)

For teachers/instructors wanting to join the platform.

### 4. 📩 **General Contact Form** (`general_contact`)

For general inquiries and support requests.

### 5. 🏢 **Enhanced Contact Forms** (Based on Medh Contact Page)

#### **Corporate Training Inquiry** (`corporate_training_inquiry`)
For businesses seeking corporate training solutions.

**🎯 Dedicated Endpoint**: `POST /api/v1/forms/corporate-training`

**Key Features:**
- **Multi-step Form Support**: 3-step process (Contact → Organization → Training)
- **Professional Information**: Designation, company details, industry classification
- **Training Requirements**: Structured training needs with budget and timeline
- **Advanced Validation**: Phone number, email, and URL validation
- **Auto-fill Support**: For logged-in users
- **Email Routing**: Routes to `corporate@medh.co`

**Form Structure:**
```typescript
interface CorporateTrainingForm {
  // Step 1: Contact Information
  full_name: string;
  email: string;
  country?: string;
  phone_number: string | { country: string; number: string };
  
  // Step 2: Organization Details
  designation: string;
  company_name: string;
  company_website?: string;
  
  // Step 3: Training Requirements
  training_requirements: string; // 20-2000 characters
  terms_accepted: boolean;
  
  // Optional Advanced Fields
  company_size?: "1-10" | "11-50" | "51-200" | "201-500" | "500+";
  industry?: "technology" | "healthcare" | "finance" | "education" | "manufacturing" | "retail" | "consulting" | "government" | "non_profit" | "other";
  training_type?: "technical_skills" | "soft_skills" | "leadership" | "compliance" | "product_training" | "sales_training" | "customer_service" | "digital_transformation" | "other";
  training_mode?: "online" | "onsite" | "hybrid" | "flexible";
  participants_count?: number; // 1-10000
  duration_preference?: "1_day" | "2-3_days" | "1_week" | "2-4_weeks" | "1-3_months" | "ongoing";
  budget_range?: "under_1l" | "1l_5l" | "5l_10l" | "10l_25l" | "25l_50l" | "50l_plus" | "not_disclosed";
  timeline?: "immediate" | "within_month" | "within_quarter" | "within_6months" | "flexible";
  specific_skills?: string[];
}
```

**Example Request:**
```json
{
  "full_name": "Priya Sharma",
  "email": "priya.sharma@techcorp.com",
  "country": "in",
  "phone_number": "+919876543210",
  "designation": "HR Manager",
  "company_name": "TechCorp Solutions",
  "company_website": "https://techcorp.com",
  "training_requirements": "We need a comprehensive 3-week digital transformation training program for 50 mid-level managers. The focus should be on data analytics, cloud computing, and agile methodologies. We prefer a hybrid approach with online theory sessions and hands-on workshops.",
  "terms_accepted": true,
  "company_size": "201-500",
  "industry": "technology",
  "training_type": "digital_transformation",
  "training_mode": "hybrid",
  "participants_count": 50,
  "duration_preference": "2-4_weeks",
  "budget_range": "10l_25l",
  "timeline": "within_quarter",
  "specific_skills": ["data analytics", "cloud computing", "agile methodologies"]
}
```

**Response Format:**
```json
{
  "success": true,
  "message": "Corporate training inquiry submitted successfully. Our partnerships team will contact you within 24 hours.",
  "data": {
    "form_id": "COR20241215AB123CD",
    "submission_date": "2024-12-15T10:30:00.000Z",
    "status": "submitted",
    "priority": "high",
    "auto_filled": false
  }
}
```

#### **Membership Inquiry** (`membership_inquiry`)

For individuals interested in Medh membership plans.

#### **Hire from Medh Inquiry** (`hire_from_medh_inquiry`)

For companies looking to hire trained professionals from Medh.

#### **Course Inquiry** (`course_inquiry`)

For prospective students inquiring about specific courses.

#### **Support Request** (`support_request`)

For existing users needing assistance or support.

#### **Partnership Inquiry** (`partnership_inquiry`)

For business partnership opportunities (different from school partnerships).

#### **Media Inquiry** (`media_inquiry`)

For press, journalists, and media-related inquiries.

#### **Technical Support** (`technical_support`)

For technical issues and platform-related problems.

#### **Billing Inquiry** (`billing_inquiry`)

For payment, billing, and account-related questions.

#### **Feedback Submission** (`feedback_submission`)

For user feedback, suggestions, and complaints.

### 6. 🎓 **Book-A-Free-Demo-Session Form** (`book_a_free_demo_session`)

For scheduling demo sessions with age-based conditional logic.

**Key Features:**

- **Age Verification**: Determines form structure (under 16 vs 16+)
- **DRY Architecture**: Uses main `contact_info` for all contact details
- **Live Course Integration**: Dynamic course selection from active courses
- **Automated User Creation**: Creates temporary portal accounts
- **Multi-channel Notifications**: Email and WhatsApp confirmations
- **Smart Routing**: Routes to demo@medh.co for specialized handling

**Form Structure:**

- **Age Check**: `is_student_under_16` (boolean, required)
- **Contact Info**: Uses main `contact_info` schema (DRY approach)
- **Parent Details**: Minimal additional fields for under-16 students
- **Student Details**: Academic and course preference information
- **Demo Session Details**: Scheduling and session management

---

## 📋 **Base Form Structure**

All forms share this common structure:

```typescript
interface UniversalForm {
  // Form Identification
  form_type: FormType;
  application_id?: string; // Auto-generated (e.g., "CAN12345678ABC")
  user_id?: string; // Optional - for logged-in users

  // Auto-fill Metadata (Enhanced)
  auto_filled?: boolean;
  auto_fill_source?: "user_profile" | "previous_form" | "oauth_data";
  auto_filled_fields?: string[]; // Tracks which fields were auto-filled

  // Core Information (Required for all forms)
  contact_info: ContactInfo;

  // Form-specific fields based on form_type
  // ... (varies by form type)

  // Consent and Validation
  consent: ConsentInfo;
  captcha_token: string; // Required

  // Metadata
  status?: string;
  submitted_at?: Date;
  acknowledgment_sent?: boolean;
}
```

---

## 👤 **Enhanced Contact Information Schema**

```typescript
interface ContactInfo {
  // Name fields (separate as per requirements)
  first_name: string; // Required, alphabets only
  middle_name?: string; // Optional, alphabets only
  last_name: string; // Required, alphabets only
  full_name?: string; // Auto-generated from name parts

  // Contact details
  email: string; // Required, validated

  // Enhanced mobile number with country support
  mobile_number: {
    country_code: string; // Default "+91", format: "+XX"
    number: string; // Required, validated with libphonenumber-js
    formatted?: string; // Auto-generated international format
    is_validated?: boolean; // Auto-set after validation
  };

  // Location
  city: string; // Required
  country: string; // Required, validated against countries list
  address?: string; // Optional

  // Social media profiles (optional)
  social_profiles?: {
    linkedin?: string; // LinkedIn URL
    facebook?: string; // Facebook URL
    instagram?: string; // Instagram URL
    portfolio?: string; // Portfolio URL
  };
}
```

---

## 🔒 **Consent Schema**

```typescript
interface ConsentInfo {
  terms_and_privacy: boolean; // Required: true
  data_collection_consent: boolean; // Required: true
  marketing_consent?: boolean; // Optional, default: false
  accuracy_declaration?: boolean; // Required for job/educator applications
}
```

---

## 🔍 **Enhanced Inquiry Details Schema** (For Contact Forms)

```typescript
interface InquiryDetails {
  inquiry_type?:
    | "course_information"
    | "enrollment_assistance"
    | "technical_support"
    | "billing_payment"
    | "corporate_training"
    | "membership_plans"
    | "hiring_solutions"
    | "partnership_opportunities"
    | "media_press"
    | "general_inquiry"
    | "feedback_complaint";

  preferred_contact_method?: "email" | "phone" | "whatsapp"; // Default: "email"
  urgency_level?: "low" | "medium" | "high" | "urgent"; // Default: "medium"

  // Course interests (comprehensive list from Medh website)
  course_interest?: // AI and Data Science
  (
    | "ai_data_science"
    | "ai_for_professionals"
    | "ai_in_finance"
    | "ai_in_healthcare"
    | "ai_in_manufacturing"

    // Digital Marketing
    | "digital_marketing"
    | "social_media_marketing"
    | "brand_management"
    | "online_reputation_management"

    // Business & Management
    | "business_analysis_strategy"
    | "entrepreneurship_startup"
    | "marketing_sales_strategy"

    // Technical Skills
    | "programming_python"
    | "programming_scala"
    | "programming_r"
    | "cloud_computing"
    | "cybersecurity"

    // Finance & Accounts
    | "finance_startups"
    | "financial_statement_mis"
    | "tax_computation_filing"

    // Personal Development
    | "personality_development"
    | "vedic_mathematics"
    | "emotional_intelligence"
    | "public_speaking"
    | "time_management"

    // Career Development
    | "job_search_strategies"
    | "personal_branding"
    | "resume_interview_prep"

    // Language & Communication
    | "business_english"
    | "french_language"
    | "mandarin_language"
    | "spanish_language"

    // Health & Wellness
    | "mental_health_awareness"
    | "nutrition_diet_planning"
    | "yoga_mindfulness"

    // Industry Specific
    | "healthcare_medical_coding"
    | "hospitality_tourism"
    | "interior_designing"
    | "legal_compliance"

    // Environmental & Sustainability
    | "renewable_energy"
    | "sustainable_agriculture"
    | "sustainable_housing"
    | "other"
  )[];

  company_size?:
    | "1-10"
    | "11-50"
    | "51-200"
    | "201-500"
    | "500+"
    | "not_applicable";
  budget_range?:
    | "under_10k"
    | "10k_50k"
    | "50k_1l"
    | "1l_5l"
    | "5l_plus"
    | "not_disclosed";
  timeline?:
    | "immediate"
    | "within_week"
    | "within_month"
    | "within_quarter"
    | "flexible";

  heard_about_us?:
    | "google_search"
    | "social_media"
    | "referral_friend"
    | "referral_colleague"
    | "advertisement"
    | "blog_article"
    | "webinar_event"
    | "partner_institution"
    | "other";

  additional_requirements?: string;
}
```

---

## 📝 **Form Type Specifications**

### 1. 🎯 **Candidate Application Form**

**Purpose**: Job applications with detailed employment information

**Required Fields**:

- `contact_info` (full schema)
- `post_applying_for` (string)
- `employment_info` (object)
- `consent.terms_and_privacy` (true)
- `consent.data_collection_consent` (true)
- `consent.accuracy_declaration` (true)
- `captcha_token` (string)

**Employment Info Schema**:

```typescript
interface EmploymentInfo {
  has_work_experience: boolean; // Required
  currently_employed?: boolean; // Required if has_work_experience
  current_company?: {
    name?: string;
    designation?: string;
    working_since?: {
      month?: string;
      year?: number;
    };
  };
  previous_company?: {
    name?: string;
    designation?: string;
    last_working_day?: Date;
  };
  preferred_work_mode: "wfh" | "wfo" | "hybrid"; // Required
}
```

**Complete JSON Example**:

```json
{
  "form_type": "candidate_application",
  "contact_info": {
    "first_name": "John",
    "middle_name": "Robert",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "mobile_number": {
      "country_code": "+91",
      "number": "9876543210"
    },
    "city": "Mumbai",
    "country": "India",
    "address": "123 Main Street, Andheri West",
    "social_profiles": {
      "linkedin": "https://linkedin.com/in/johndoe",
      "portfolio": "https://johndoe.dev"
    }
  },
  "post_applying_for": "Full Stack Developer",
  "employment_info": {
    "has_work_experience": true,
    "currently_employed": true,
    "current_company": {
      "name": "Tech Solutions Ltd",
      "designation": "Software Developer",
      "working_since": {
        "month": "January",
        "year": 2023
      }
    },
    "preferred_work_mode": "hybrid"
  },
  "remarks": "Passionate about React and Node.js development",
  "consent": {
    "terms_and_privacy": true,
    "data_collection_consent": true,
    "accuracy_declaration": true,
    "marketing_consent": false
  },
  "captcha_token": "abc123xyz"
}
```

---

### 2. 🏫 **School Partnership Form**

**Purpose**: Educational institutions seeking partnerships

**Required Fields**:

- `contact_info` (full schema)
- `representative_position` (string)
- `institution_info` (object)
- `partnership_details` (object)
- `consent.terms_and_privacy` (true)
- `consent.data_collection_consent` (true)
- `captcha_token` (string)

**Institution Info Schema**:

```typescript
interface InstitutionInfo {
  name: string; // Required
  type:
    | "primary"
    | "secondary"
    | "high_school"
    | "college"
    | "university"
    | "coaching"
    | "other"; // Required
  website?: string; // Optional, URL validation
  year_of_establishment?: number; // Optional, 1800-current year
  address?: string;
  social_media?: {
    website?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
}
```

**Partnership Details Schema**:

```typescript
interface PartnershipDetails {
  program_interests?: string[]; // Array of interests
  other_interests?: string;
  target_grades?: (
    | "grades_1-5"
    | "grades_6-8"
    | "grades_9-10"
    | "grades_11-12"
    | "ug"
    | "pg"
  )[];
  preferred_mode?: "on_campus" | "online" | "hybrid" | "flexible";
  timeline?:
    | "immediate"
    | "short_term"
    | "medium_term"
    | "long_term"
    | "exploratory";
  additional_notes?: string;
  referral_source?:
    | "social_media"
    | "email_campaign"
    | "event"
    | "referral"
    | "website"
    | "other";
}
```

**Complete JSON Example**:

```json
{
  "form_type": "school_partnership",
  "contact_info": {
    "first_name": "Sarah",
    "last_name": "Johnson",
    "email": "sarah.johnson@brightfuture.edu",
    "mobile_number": {
      "country_code": "+91",
      "number": "9876543210"
    },
    "city": "Delhi",
    "country": "India"
  },
  "representative_position": "Academic Director",
  "institution_info": {
    "name": "Bright Future High School",
    "type": "high_school",
    "website": "https://brightfuture.edu",
    "year_of_establishment": 1995,
    "address": "456 Education Lane, New Delhi"
  },
  "partnership_details": {
    "program_interests": ["STEM Education", "Digital Literacy"],
    "target_grades": ["grades_9-10", "grades_11-12"],
    "preferred_mode": "hybrid",
    "timeline": "short_term",
    "referral_source": "website"
  },
  "consent": {
    "terms_and_privacy": true,
    "data_collection_consent": true,
    "marketing_consent": true
  },
  "captcha_token": "def456uvw"
}
```

---

### 3. 👩‍🏫 **Educator Application Form**

**Purpose**: Teachers/instructors applying to join the platform

**Required Fields**:

- `contact_info` (full schema)
- `education_info` (object)
- `teaching_info` (object)
- `consent.terms_and_privacy` (true)
- `consent.data_collection_consent` (true)
- `consent.accuracy_declaration` (true)
- `captcha_token` (string)

**Education Info Schema**:

```typescript
interface EducationInfo {
  highest_qualification: "10th" | "12th" | "ug" | "graduate" | "pg"; // Required
  specialization?: string;
  years_of_experience?: "fresher" | "1-3" | "4-6" | "7-10" | "10+";
  current_institution?: {
    name?: string;
    role?: string;
    start_date?: Date;
    end_date?: Date;
  };
}
```

**Teaching Info Schema**:

```typescript
interface TeachingInfo {
  preferred_teaching_mode: "in_person" | "remote" | "hybrid" | "flexible"; // Required
  engagement_type: ("full_time" | "part_time" | "hourly")[]; // Required array
  subject_areas?: string[];
  grade_levels?: (
    | "elementary"
    | "middle_school"
    | "high_school"
    | "undergraduate"
    | "postgraduate"
  )[];
  certifications?: string[];
  it_assets: {
    // Required
    has_computer: boolean;
    has_webcam: boolean;
    has_microphone: boolean;
    internet_quality: "excellent" | "good" | "average" | "poor";
    teaching_platform_experience: boolean;
  };
  teaching_portfolio?: {
    portfolio_link?: string;
    video_url?: string;
    uploaded_file?: string;
  };
  availability: {
    // Required
    weekly_hours: "less_than_10" | "10-20" | "21-30" | "31-40" | "more_than_40";
    preferred_schedule?: {
      monday?: { available: boolean; start_time?: string; end_time?: string };
      tuesday?: { available: boolean; start_time?: string; end_time?: string };
      wednesday?: {
        available: boolean;
        start_time?: string;
        end_time?: string;
      };
      thursday?: { available: boolean; start_time?: string; end_time?: string };
      friday?: { available: boolean; start_time?: string; end_time?: string };
      saturday?: { available: boolean; start_time?: string; end_time?: string };
      sunday?: { available: boolean; start_time?: string; end_time?: string };
    };
    notice_period:
      | "immediate"
      | "1_week"
      | "2_weeks"
      | "1_month"
      | "more_than_month";
  };
}
```

**Complete JSON Example**:

```json
{
  "form_type": "educator_application",
  "contact_info": {
    "first_name": "Dr. Priya",
    "last_name": "Sharma",
    "email": "priya.sharma@email.com",
    "mobile_number": {
      "country_code": "+91",
      "number": "9876543210"
    },
    "city": "Bangalore",
    "country": "India",
    "social_profiles": {
      "linkedin": "https://linkedin.com/in/priyasharma"
    }
  },
  "education_info": {
    "highest_qualification": "pg",
    "specialization": "Computer Science",
    "years_of_experience": "7-10"
  },
  "teaching_info": {
    "preferred_teaching_mode": "hybrid",
    "engagement_type": ["part_time"],
    "subject_areas": ["Mathematics", "Computer Science"],
    "grade_levels": ["high_school", "undergraduate"],
    "it_assets": {
      "has_computer": true,
      "has_webcam": true,
      "has_microphone": true,
      "internet_quality": "excellent",
      "teaching_platform_experience": true
    },
    "availability": {
      "weekly_hours": "21-30",
      "notice_period": "1_month"
    }
  },
  "consent": {
    "terms_and_privacy": true,
    "data_collection_consent": true,
    "accuracy_declaration": true
  },
  "captcha_token": "ghi789rst"
}
```

---

### 4. 📩 **General Contact Form**

**Purpose**: General inquiries and support requests

**Required Fields**:

- `contact_info` (full schema)
- `subject` (string)
- `message` (string, 10-2000 chars)
- `consent.terms_and_privacy` (true)
- `consent.data_collection_consent` (true)
- `captcha_token` (string)

**Complete JSON Example**:

```json
{
  "form_type": "general_contact",
  "contact_info": {
    "first_name": "Amit",
    "last_name": "Patel",
    "email": "amit.patel@email.com",
    "mobile_number": {
      "country_code": "+91",
      "number": "9876543210"
    },
    "city": "Ahmedabad",
    "country": "India"
  },
  "subject": "Course Inquiry",
  "message": "I am interested in learning more about your data science courses. Could you please provide more information about the curriculum and enrollment process?",
  "consent": {
    "terms_and_privacy": true,
    "data_collection_consent": true,
    "marketing_consent": false
  },
  "captcha_token": "jkl012mno"
}
```

---

## 🎓 **Demo Session Schemas** (For Book-A-Free-Demo-Session)

```typescript
interface DemoSessionForm {
  form_type: "book_a_free_demo_session";
  is_student_under_16: boolean; // Required - determines form flow

  // Uses main contact_info schema (DRY approach)
  contact_info: ContactInfo; // Parent info if under 16, student info if 16+

  // Minimal parent details (only additional fields)
  parent_details?: {
    preferred_timings?: string; // Optional timing preferences
  };

  // Student-specific information
  student_details: {
    name: string; // Required - student's name
    email?: string; // Optional for under 16
    preferred_timings?: string;

    // For students under 16
    grade?:
      | "grade_1-2"
      | "grade_3-4"
      | "grade_5-6"
      | "grade_7-8"
      | "grade_9-10"
      | "grade_11-12"
      | "home_study";
    school_name?: string;

    // For students 16 and above
    highest_qualification?:
      | "10th_passed"
      | "12th_passed"
      | "undergraduate"
      | "graduate"
      | "post_graduate";
    currently_studying?: boolean;
    currently_working?: boolean;
    education_institute_name?: string;

    // Common fields
    preferred_course: string[]; // Required - array of course IDs
  };

  // Demo session scheduling
  demo_session_details?: {
    preferred_date?: Date; // Must be future date
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
    timezone?: string; // Default: "Asia/Kolkata"
    demo_status?:
      | "scheduled"
      | "confirmed"
      | "completed"
      | "cancelled"
      | "rescheduled";
    zoom_meeting_id?: string;
    zoom_meeting_url?: string;
    zoom_passcode?: string;
    instructor_assigned?: string; // User ID
  };

  consent: ConsentInfo;
}
```

### **📝 Demo Session Form Examples**

#### **Example 1: Student Under 16**

```json
{
  "form_type": "book_a_free_demo_session",
  "is_student_under_16": true,

  "contact_info": {
    "first_name": "Rajesh",
    "last_name": "Kumar",
    "email": "rajesh.kumar@email.com",
    "mobile_number": {
      "country_code": "+91",
      "number": "9876543210"
    },
    "city": "Mumbai",
    "country": "India"
  },

  "parent_details": {
    "preferred_timings": "Evening 6-8 PM"
  },

  "student_details": {
    "name": "Arjun Kumar",
    "grade": "grade_7-8",
    "school_name": "Delhi Public School",
    "preferred_course": ["course_id_1", "course_id_2"]
  },

  "demo_session_details": {
    "preferred_date": "2024-02-15T00:00:00.000Z",
    "preferred_time_slot": "18:00-19:00"
  },

  "consent": {
    "terms_and_privacy": true,
    "data_collection_consent": true,
    "marketing_consent": false
  }
}
```

#### **Example 2: Student 16 and Above**

```json
{
  "form_type": "book_a_free_demo_session",
  "is_student_under_16": false,

  "contact_info": {
    "first_name": "Priya",
    "last_name": "Sharma",
    "email": "priya.sharma@email.com",
    "mobile_number": {
      "country_code": "+91",
      "number": "9123456789"
    },
    "city": "Bangalore",
    "country": "India"
  },

  "student_details": {
    "name": "Priya Sharma",
    "email": "priya.sharma@email.com",
    "highest_qualification": "12th_passed",
    "currently_studying": true,
    "currently_working": false,
    "education_institute_name": "St. Xavier's College",
    "preferred_course": ["ai_data_science", "digital_marketing"],
    "preferred_timings": "Weekend mornings"
  },

  "demo_session_details": {
    "preferred_date": "2024-02-17T00:00:00.000Z",
    "preferred_time_slot": "10:00-11:00"
  },

  "consent": {
    "terms_and_privacy": true,
    "data_collection_consent": true,
    "marketing_consent": true
  }
}
```

---

## 🚀 **API Endpoints**

### **Submit Form**

```http
POST /api/v1/forms/submit
Content-Type: application/json

{
  // Form data as per form type specification
}
```

**Response**:

```json
{
  "success": true,
  "message": "Your job application has been submitted successfully...",
  "data": {
    "application_id": "CAN12345678ABC",
    "form_type": "candidate_application",
    "status": "submitted",
    "submitted_at": "2025-01-27T10:30:00Z",
    "acknowledgment_sent": true,
    "auto_filled": true,
    "auto_fill_source": "user_profile",
    "auto_filled_fields": ["contact_info.first_name", "contact_info.email"]
  }
}
```

### **Get Auto-fill Data** (Authenticated)

```http
GET /api/v1/forms/auto-fill
Authorization: Bearer <token>
```

**Response**:

```json
{
  "success": true,
  "message": "Auto-fill data retrieved successfully",
  "data": {
    "contact_info": {
      "first_name": "John",
      "middle_name": "",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "mobile_number": {
        "country_code": "+91",
        "number": "9876543210"
      },
      "city": "Mumbai",
      "country": "India",
      "address": "123 Main Street",
      "social_profiles": {
        "linkedin": "https://linkedin.com/in/johndoe",
        "portfolio": "https://johndoe.dev"
      }
    },
    "education_info": {
      "highest_qualification": "graduate",
      "specialization": "Computer Science",
      "years_of_experience": "4-6"
    },
    "professional_info": {
      "current_company": {
        "name": "Tech Corp",
        "designation": "Software Developer"
      }
    }
  }
}
```

### **Get Countries List**

```http
GET /api/v1/forms/countries
```

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "code": "IN",
      "name": "India",
      "phone": "91",
      "emoji": "🇮🇳"
    },
    {
      "code": "US",
      "name": "United States",
      "phone": "1",
      "emoji": "🇺🇸"
    }
    // ... more countries
  ]
}
```

### **Get Form by Application ID**

```http
GET /api/v1/forms/lookup/{application_id}
```

---

## 🌍 **Country Service & API Endpoints**

The Universal Form system includes a comprehensive country service that combines multiple authoritative data sources for accurate, up-to-date country information.

### **📊 Data Sources**

- **countries-list**: Primary country data with phone codes
- **world-countries**: Comprehensive geographic and political data
- **country-codes-list**: Enhanced phone code validation

### **🔗 Available Endpoints**

#### **Basic Countries List**

```bash
GET /api/v1/forms/countries
```

#### **Popular Countries** (High Priority)

```bash
GET /api/v1/forms/countries/popular
GET /api/v1/forms/countries?popular=true
```

#### **Countries with Phone Codes**

```bash
GET /api/v1/forms/countries/phone-codes
GET /api/v1/forms/countries?format=phone
```

#### **Search Countries**

```bash
GET /api/v1/forms/countries/search?q=india
GET /api/v1/forms/countries?search=united
```

#### **Filter by Continent**

```bash
GET /api/v1/forms/countries?continent=Asia
GET /api/v1/forms/countries?continent=Europe
```

#### **Dropdown Format** (Frontend Optimized)

```bash
GET /api/v1/forms/countries?format=dropdown
```

### **📋 Response Format**

```json
{
  "success": true,
  "data": [
    {
      "code": "IN",
      "code3": "IND",
      "name": "India",
      "nativeName": "भारत",
      "phone": "+91",
      "phoneCode": "91",
      "continent": "Asia",
      "region": "Southern Asia",
      "subregion": "Southern Asia",
      "emoji": "🇮🇳",
      "flag": "🇮🇳",
      "currency": "INR",
      "currencies": {
        "INR": { "name": "Indian Rupee", "symbol": "₹" }
      },
      "languages": ["Hindi", "English"],
      "capital": "New Delhi",
      "timezone": "Asia/Kolkata",
      "tld": ".in",
      "priority": 100,
      "searchTerms": ["india", "भारत", "in", "ind"]
    }
  ],
  "meta": {
    "total": 195,
    "returned": 195,
    "format": "full",
    "filters": {
      "search": null,
      "continent": null,
      "popular": false,
      "phone_codes_only": false
    }
  }
}
```

### **🎯 Country Priority System**

Countries are automatically prioritized for better UX:

- **High Priority (100)**: India, US, UK, Canada, Australia, Singapore, UAE, Germany, France, Japan
- **Medium Priority (50)**: China, Brazil, Russia, Italy, Spain, Netherlands, Sweden, Norway, Denmark, Finland
- **Low Priority (25)**: English-speaking countries
- **Default Priority (1)**: All other countries

### **🔍 Search Capabilities**

The search function supports:

- **Country Names**: "India", "United States"
- **Native Names**: "भारत", "Deutschland"
- **Country Codes**: "IN", "US", "IND", "USA"
- **Phone Codes**: "+91", "91"
- **Partial Matches**: "uni" matches "United States", "United Kingdom"

### **📱 Phone Code Integration**

Perfect integration with `libphonenumber-js`:

```json
{
  "code": "IN",
  "name": "India",
  "phone": "+91",
  "phoneCode": "91",
  "flag": "🇮🇳",
  "priority": 100
}
```

### **🌐 Frontend Integration Examples**

#### **React Country Dropdown**

```jsx
const [countries, setCountries] = useState([]);

// Load popular countries first
useEffect(() => {
  fetch("/api/v1/forms/countries/popular")
    .then((res) => res.json())
    .then((data) => setCountries(data.data));
}, []);

// Country dropdown with search
<Select
  options={countries.map((country) => ({
    value: country.code,
    label: `${country.flag} ${country.name}`,
    phone: country.phone,
  }))}
  isSearchable
  placeholder="Select Country"
/>;
```

#### **Phone Number Input**

```jsx
const [phoneCodes, setPhoneCodes] = useState([]);

useEffect(() => {
  fetch("/api/v1/forms/countries/phone-codes")
    .then((res) => res.json())
    .then((data) => setPhoneCodes(data.data));
}, []);

// Phone code dropdown
<Select
  options={phoneCodes.map((country) => ({
    value: country.phoneCode,
    label: `${country.flag} +${country.phoneCode}`,
    country: country.code,
  }))}
/>;
```

### **⚡ Performance Features**

- **Caching**: Countries data is cached in memory for fast access
- **Lazy Loading**: Data loaded only when first requested
- **Result Limiting**: Maximum 250 countries returned per request
- **Fallback Support**: Graceful degradation to basic country list if service fails

---

## 💻 **Frontend Integration Examples**

### **React Component with Auto-fill**

```jsx
import React, { useState, useEffect } from "react";
import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";

const UniversalForm = ({ formType, isAuthenticated }) => {
  const [formData, setFormData] = useState({
    form_type: formType,
    contact_info: {
      first_name: "",
      middle_name: "",
      last_name: "",
      email: "",
      mobile_number: {
        country_code: "+91",
        number: "",
      },
      city: "",
      country: "India",
      address: "",
      social_profiles: {},
    },
    consent: {
      terms_and_privacy: false,
      data_collection_consent: false,
      marketing_consent: false,
      accuracy_declaration: false,
    },
    captcha_token: "",
  });

  const [countries, setCountries] = useState([]);
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  // Load countries on component mount
  useEffect(() => {
    fetchCountries();
    if (isAuthenticated) {
      loadAutoFillData();
    }
  }, [isAuthenticated]);

  const fetchCountries = async () => {
    try {
      const response = await fetch("/api/v1/forms/countries");
      const data = await response.json();
      if (data.success) {
        setCountries(data.data);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  const loadAutoFillData = async () => {
    try {
      const response = await fetch("/api/v1/forms/auto-fill", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setFormData((prev) => ({
          ...prev,
          ...data.data,
        }));
        setIsAutoFilled(true);
      }
    } catch (error) {
      console.error("Error loading auto-fill data:", error);
    }
  };

  const validatePhoneNumber = (countryCode, number) => {
    try {
      const fullNumber = `${countryCode}${number}`;
      return isValidPhoneNumber(fullNumber);
    } catch {
      return false;
    }
  };

  const handlePhoneChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      contact_info: {
        ...prev.contact_info,
        mobile_number: {
          ...prev.contact_info.mobile_number,
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate phone number
    const { country_code, number } = formData.contact_info.mobile_number;
    if (!validatePhoneNumber(country_code, number)) {
      alert("Please enter a valid phone number");
      return;
    }

    try {
      const response = await fetch("/api/v1/forms/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(isAuthenticated && {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          }),
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        alert(
          `Form submitted successfully! Application ID: ${result.data.application_id}`,
        );
        // Handle success (redirect, show success message, etc.)
      } else {
        alert("Error submitting form: " + result.message);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Error submitting form. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="universal-form">
      {isAutoFilled && (
        <div className="auto-fill-notice">
          ✅ Some fields have been auto-filled from your profile
        </div>
      )}

      {/* Contact Information */}
      <section className="contact-section">
        <h3>Contact Information</h3>

        <div className="name-fields">
          <input
            type="text"
            placeholder="First Name*"
            value={formData.contact_info.first_name}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                contact_info: {
                  ...prev.contact_info,
                  first_name: e.target.value,
                },
              }))
            }
            pattern="[A-Za-z\s'-]+"
            required
          />

          <input
            type="text"
            placeholder="Middle Name"
            value={formData.contact_info.middle_name}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                contact_info: {
                  ...prev.contact_info,
                  middle_name: e.target.value,
                },
              }))
            }
            pattern="[A-Za-z\s'-]*"
          />

          <input
            type="text"
            placeholder="Last Name*"
            value={formData.contact_info.last_name}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                contact_info: {
                  ...prev.contact_info,
                  last_name: e.target.value,
                },
              }))
            }
            pattern="[A-Za-z\s'-]+"
            required
          />
        </div>

        <input
          type="email"
          placeholder="Email Address*"
          value={formData.contact_info.email}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              contact_info: {
                ...prev.contact_info,
                email: e.target.value,
              },
            }))
          }
          required
        />

        {/* Mobile Number with Country Code */}
        <div className="phone-field">
          <select
            value={formData.contact_info.mobile_number.country_code}
            onChange={(e) => handlePhoneChange("country_code", e.target.value)}
            required
          >
            {countries.map((country) => (
              <option key={country.code} value={`+${country.phone}`}>
                {country.emoji} +{country.phone}
              </option>
            ))}
          </select>

          <input
            type="tel"
            placeholder="Mobile Number*"
            value={formData.contact_info.mobile_number.number}
            onChange={(e) =>
              handlePhoneChange("number", e.target.value.replace(/\D/g, ""))
            }
            pattern="[0-9]{10,15}"
            required
          />
        </div>

        <div className="location-fields">
          <input
            type="text"
            placeholder="City*"
            value={formData.contact_info.city}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                contact_info: {
                  ...prev.contact_info,
                  city: e.target.value,
                },
              }))
            }
            required
          />

          <select
            value={formData.contact_info.country}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                contact_info: {
                  ...prev.contact_info,
                  country: e.target.value,
                },
              }))
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
      </section>

      {/* Form-specific fields would go here based on formType */}
      {formType === "candidate_application" && (
        <CandidateApplicationFields
          formData={formData}
          setFormData={setFormData}
        />
      )}

      {formType === "school_partnership" && (
        <SchoolPartnershipFields
          formData={formData}
          setFormData={setFormData}
        />
      )}

      {formType === "educator_application" && (
        <EducatorApplicationFields
          formData={formData}
          setFormData={setFormData}
        />
      )}

      {formType === "general_contact" && (
        <GeneralContactFields formData={formData} setFormData={setFormData} />
      )}

      {/* Consent Section */}
      <section className="consent-section">
        <h3>Consent & Agreement</h3>

        <label>
          <input
            type="checkbox"
            checked={formData.consent.terms_and_privacy}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                consent: {
                  ...prev.consent,
                  terms_and_privacy: e.target.checked,
                },
              }))
            }
            required
          />
          I agree to the{" "}
          <a href="/terms" target="_blank">
            Terms of Use
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank">
            Privacy Policy
          </a>
          *
        </label>

        <label>
          <input
            type="checkbox"
            checked={formData.consent.data_collection_consent}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                consent: {
                  ...prev.consent,
                  data_collection_consent: e.target.checked,
                },
              }))
            }
            required
          />
          I consent to data collection and communication*
        </label>

        <label>
          <input
            type="checkbox"
            checked={formData.consent.marketing_consent}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                consent: {
                  ...prev.consent,
                  marketing_consent: e.target.checked,
                },
              }))
            }
          />
          I would like to receive marketing communications (optional)
        </label>

        {["candidate_application", "educator_application"].includes(
          formType,
        ) && (
          <label>
            <input
              type="checkbox"
              checked={formData.consent.accuracy_declaration}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  consent: {
                    ...prev.consent,
                    accuracy_declaration: e.target.checked,
                  },
                }))
              }
              required
            />
            I declare that all information provided is accurate*
          </label>
        )}
      </section>

      {/* Captcha would go here */}

      <button type="submit" className="submit-button">
        Submit{" "}
        {formType.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
      </button>

      <div className="footer-note">
        © Medh | By submitting this form, I agree to the Terms of Use and
        Privacy Policy.
      </div>
    </form>
  );
};

export default UniversalForm;
```

---

## 📧 **Email Acknowledgments**

Each form type triggers automatic email acknowledgments:

### **Candidate Application**

- **From**: careers@medh.co
- **Subject**: Thank You for Your Application to Medh (Application ID: XXXXXXXX)
- **Content**: Application timeline, review process, next steps

### **Educator Application**

- **From**: teach@medh.co
- **Subject**: Thank You for Applying to Join the MEDH Teaching Team (Application ID: XXXXXXXX)
- **Content**: Demo session info, interview process, onboarding details

### **School Partnership**

- **From**: partnerships@medh.co
- **Subject**: Thank You for Your Interest in Partnering with Medh (Inquiry ID: XXXXXXX)
- **Content**: Partnership process, discovery call scheduling

### **General Contact**

- **From**: support@medh.co
- **Subject**: Thank You for Contacting MEDH - We've Received Your Inquiry (Ref ID: XXXXXXX)
- **Content**: Response timeline, helpful resources, contact info

---

## 🔧 **Key Features**

### ✅ **Enhanced Phone Number Validation**

- Uses `libphonenumber-js` for accurate validation
- Country-specific formatting
- Supports international numbers
- Auto-formats to international standard

### ✅ **Intelligent Auto-fill**

- Populates forms from user profile data
- Tracks which fields were auto-filled
- Works with social profiles and professional info
- Maintains data accuracy and user control

### ✅ **Professional Email Templates**

- Form-specific acknowledgment emails
- Professional styling and branding
- Clear next steps and timelines
- Contact information and resources

### ✅ **Robust Validation**

- Name fields: alphabets only
- Email: comprehensive validation
- Phone: country-specific validation
- Required field enforcement
- File upload restrictions (PDF/DOC/DOCX)

### ✅ **Security & Compliance**

- Captcha validation required
- Consent tracking and validation
- Terms and privacy policy agreement
- Data collection consent management

---

## 🎨 **Frontend Best Practices**

1. **Progressive Enhancement**: Start with basic form, enhance with auto-fill
2. **Validation Feedback**: Real-time validation with clear error messages
3. **Loading States**: Show loading during auto-fill and submission
4. **Accessibility**: Proper labels, ARIA attributes, keyboard navigation
5. **Mobile Optimization**: Responsive design, touch-friendly inputs
6. **Error Handling**: Graceful degradation when services are unavailable

---

This comprehensive system provides a professional, user-friendly form experience while maintaining data integrity and compliance with modern web standards.
