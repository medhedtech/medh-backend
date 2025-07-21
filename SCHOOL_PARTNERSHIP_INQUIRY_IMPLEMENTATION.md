# School Partnership Inquiry Form Implementation

## Overview

Successfully implemented support for the `school_partnership_inquiry` form type in the universal form system. This new form type allows schools to submit partnership inquiries for educational technology solutions.

## Implementation Details

### 1. Validation Schema (`validations/universalFormValidation.js`)

#### Added New Validation Schemas:

- **`schoolInfoValidation`**: Validates school information

  - `school_name`: Required, 2-200 characters
  - `school_type`: Required, enum: ['CBSE', 'ICSE', 'IB', 'State Board', 'International', 'Other']
  - `city_state`: Required, 2-100 characters
  - `student_count`: Required, enum: ['1-50', '51-100', '101-300', '301-500', '501-1000', '1000+']
  - `website`: Optional, URL validation

- **`partnershipInfoValidation`**: Validates partnership information
  - `services_of_interest`: Required array of services
  - `additional_notes`: Optional, max 2000 characters

#### Updated Form Type Validation:

- Added `school_partnership_inquiry` to the valid form types list
- Added `school_partnership_inquiry` to query parameter validation

#### School Partnership Inquiry Schema:

```javascript
school_partnership_inquiry: baseFormValidation.keys({
  contact_info: contactInfoValidation
    .keys({
      full_name: Joi.required(),
      email: Joi.required(),
      phone_number: Joi.string()
        .pattern(patterns.internationalPhone)
        .required(),
      designation: Joi.string().min(2).max(100).required(),
      country: Joi.string().min(2).max(100).required(),
    })
    .required(),
  school_info: schoolInfoValidation.required(),
  partnership_info: partnershipInfoValidation.required(),
  priority: Joi.string()
    .valid("low", "medium", "high", "urgent")
    .default("medium"),
  source: Joi.string()
    .valid(
      "website_form",
      "email",
      "phone",
      "referral",
      "social_media",
      "other",
    )
    .default("website_form"),
  submission_metadata: Joi.object({
    user_agent: Joi.string().max(500),
    timestamp: Joi.date().default(() => new Date()),
    referrer: Joi.string().max(500),
    form_version: Joi.string().max(20).default("1.0"),
  }).optional(),
});
```

### 2. Database Model (`models/universal-form.model.js`)

#### Added New Schemas:

- **`schoolInfoSchema`**: MongoDB schema for school information
- **`partnershipInfoSchema`**: MongoDB schema for partnership information

#### Updated Main Schema:

- Added `school_partnership_inquiry` to the form_type enum
- Added `school_info: schoolInfoSchema` field
- Added `partnership_info: partnershipInfoSchema` field
- Added `submission_metadata` field for tracking form submissions
- Extended source enum to include `website_form`, `email`, `phone`, `referral`, `social_media`, `other`

### 3. API Routes (`routes/universalFormRoutes.js`)

#### Added New Routes:

- **`POST /api/v1/forms/school-partnership`**: Submit school partnership inquiry
- **`GET /api/v1/forms/admin/school-partnership`**: Get all school partnership inquiries (admin only)

#### Route Implementation:

```javascript
// Public route for submitting school partnership inquiries
router.post(
  "/school-partnership",
  (req, res, next) => {
    req.body.form_type = "school_partnership_inquiry";
    next();
  },
  validateFormByType,
  submitForm,
);

// Admin route for viewing school partnership inquiries
router.get(
  "/admin/school-partnership",
  authenticateToken,
  (req, res, next) => {
    req.params.formType = "school_partnership_inquiry";
    next();
  },
  getFormsByType,
);
```

## Supported Services of Interest

The partnership form supports the following services:

1. Student learning solutions
2. Teacher training
3. LMS / Digital infrastructure
4. Customized curriculum support
5. Career guidance and assessments
6. Parent engagement tools
7. School management software
8. Online course platform
9. Assessment and evaluation tools
10. Professional development programs

## Form Data Structure

### Required Fields:

- `form_type`: "school_partnership_inquiry"
- `contact_info.full_name`: Contact person's full name
- `contact_info.email`: Contact email address
- `contact_info.phone_number`: International phone number (e.g., +9343011613)
- `contact_info.designation`: Contact person's designation
- `contact_info.country`: Country code (e.g., "IN")
- `school_info.school_name`: Name of the school
- `school_info.school_type`: Type of school board
- `school_info.city_state`: City and state location
- `school_info.student_count`: Number of students
- `partnership_info.services_of_interest`: Array of services interested in
- `terms_accepted`: Must be true
- `privacy_policy_accepted`: Must be true
- `message`: Description of the inquiry

### Optional Fields:

- `priority`: "low", "medium", "high", "urgent" (default: "medium")
- `source`: Submission source (default: "website_form")
- `school_info.website`: School website URL
- `partnership_info.additional_notes`: Additional information
- `submission_metadata`: Form submission tracking data

## API Endpoints

### Submit School Partnership Inquiry

```
POST /api/v1/forms/school-partnership
Content-Type: application/json

{
  "contact_info": {
    "full_name": "Abhishek Jha",
    "designation": "Principal",
    "email": "theory903@icloud.com",
    "phone_number": "+9343011613",
    "country": "IN"
  },
  "school_info": {
    "school_name": "holy hearts",
    "school_type": "CBSE",
    "city_state": "raipur",
    "student_count": "101-300",
    "website": ""
  },
  "partnership_info": {
    "services_of_interest": [
      "Student learning solutions",
      "Teacher training",
      "LMS / Digital infrastructure"
    ],
    "additional_notes": ""
  },
  "terms_accepted": true,
  "privacy_policy_accepted": true,
  "message": "School partnership inquiry for educational technology solutions"
}
```

### Get School Partnership Inquiries (Admin)

```
GET /api/v1/forms/admin/school-partnership
Authorization: Bearer <admin_token>
```

## Validation Features

1. **International Phone Number Support**: Accepts phone numbers in international format (+1234567890)
2. **School Type Validation**: Validates against predefined school board types
3. **Student Count Categories**: Predefined ranges for student population
4. **Service Interest Validation**: Ensures selected services are from the approved list
5. **Required Field Validation**: All essential fields are validated
6. **URL Validation**: Optional website field validates URL format

## Testing

The implementation has been tested with the provided JSON data and validation passes successfully. The form supports all the required fields and validates them according to the specified rules.

## Integration

The school partnership inquiry form is now fully integrated into the universal form system and can be:

- Submitted via the public API endpoint
- Viewed and managed by administrators
- Filtered and searched using existing form management tools
- Exported using the existing export functionality
- Tracked with the same analytics and reporting features

## Next Steps

1. **Frontend Integration**: Update frontend forms to use the new endpoint
2. **Email Notifications**: Configure email notifications for new school partnership inquiries
3. **Admin Dashboard**: Add specific views for school partnership inquiries in the admin dashboard
4. **Analytics**: Create specific analytics for school partnership inquiries
5. **Workflow Automation**: Set up automated workflows for processing school partnership inquiries
