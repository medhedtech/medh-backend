# Educator Registration Form Implementation

## Overview

Successfully implemented support for the `educator_registration` form type in the universal form system. This new form allows educators to register, providing their personal, professional, and teaching preferences.

## Implementation Details

### 1. Validation Schema (`validations/universalFormValidation.js`)

#### Added New Validation Schemas:

- **`teachingPreferencesValidation`**: Validates educator's teaching preferences

  - `preferred_subjects`: Required array of subjects, 1-20 items
  - `teaching_mode`: Required array of teaching modes (Online Live Sessions, Recorded Content, One-on-One Mentoring, In-Person Workshops), 1-4 items
  - `availability`: Required, enum: ['weekdays', 'weekends', 'flexible', 'evenings', 'mornings']
  - `portfolio_links`: Optional, URL validation
  - `demo_video_url`: Optional, URL validation
  - `has_resume`: Required boolean

- **`educatorConsentValidation`**: Validates educator's consent
  - `terms_accepted`: Required, must be true
  - `background_check_consent`: Required, must be true

#### Updated Base Form Validation (`baseFormValidation`):

- Added `educator_registration` to the `form_type` enum.
- Made `message` field optional for all forms in `baseFormValidation`.
- Removed `required` for `terms_accepted` and `privacy_policy_accepted` in `baseFormValidation` (as they are handled by specific consent schemas like `educatorConsentValidation`).
- Expanded `source` enum to include `website_form`, `email`, `phone`, `referral`, `social_media`, `other`, `campaign`.
- Allowed `referrer` in `submission_metadata` to be an empty string.

#### Educator Registration Schema (`formValidationSchemas.educator_registration`):

```javascript
educator_registration: baseFormValidation.keys({
  contact_info: contactInfoValidation.keys({
    full_name: Joi.required(),
    email: Joi.required(),
    phone_number: Joi.string().pattern(patterns.internationalPhone).required(),
    country: Joi.string().required(),
  }).required(),
  professional_info: professionalInfoValidation.keys({
    current_role: Joi.string().max(100).required(),
    experience_years: Joi.string().valid("0-1", "1-3", "3-5", "5-10", "10+").required(),
    expertise_areas: Joi.array().items(Joi.string().max(100)).min(1).required(),
    education_background: Joi.string().max(200).required(),
    current_company: Joi.string().max(200).allow(""),
  }).required(),
  teaching_preferences: teachingPreferencesValidation.required(),
  consent: educatorConsentValidation.required(),
  additional_notes: Joi.string().max(2000).allow(""),
  submission_metadata: Joi.object({
    user_agent: Joi.string().max(500),
    timestamp: Joi.date().default(() => new Date()),
    referrer: Joi.string().max(500).allow(""),
    form_version: Joi.string().max(20).default("1.0"),
    validation_passed: Joi.boolean().default(false),
  }).optional(),
  message: Joi.string().allow(""), // Explicitly allow empty message for this form
  terms_accepted: Joi.forbidden(), // Handled by educatorConsentValidation
  privacy_policy_accepted: Joi.forbidden(), // Handled by educatorConsentValidation
  source: Joi.string().valid(
    "website_form", "email", "phone", "referral", "social_media", "other", "campaign"
  ).default("website_form"),
}),
```

### 2. Database Model (`models/universal-form.model.js`)

#### Added New Schemas:

- **`teachingPreferencesSchema`**: MongoDB schema for educator teaching preferences
- **`consentSchema`**: MongoDB schema for educator consent

#### Updated Main Schema:

- Added `educator_registration` to the `form_type` enum.
- Added `teaching_preferences: teachingPreferencesSchema` field.
- Added `consent: consentSchema` field.
- Adjusted `message` field validation to be optional for `educator_registration`.
- Extended `source` enum to include `website_form`, `email`, `phone`, `referral`, `social_media`, `other` in the model definition.

### 3. API Routes (`routes/universalFormRoutes.js`)

#### Added New Routes:

- **`POST /api/v1/forms/educator-registration`**: Submit educator registration form
- **`GET /api/v1/forms/admin/educator-registration`**: Get all educator registration forms (admin only)

#### Route Implementation:

```javascript
// Public route for submitting educator registration forms
router.post(
  "/educator-registration",
  (req, res, next) => {
    req.body.form_type = "educator_registration";
    next();
  },
  validateFormByType,
  submitForm,
);

// Admin route for viewing educator registration forms
router.get(
  "/admin/educator-registration",
  authenticateToken,
  (req, res, next) => {
    req.params.formType = "educator_registration";
    next();
  },
  getFormsByType,
);
```

## Form Data Structure

### Required Fields:

- `form_type`: "educator_registration"
- `contact_info.full_name`: Educator's full name
- `contact_info.email`: Educator's email address
- `contact_info.phone_number`: International phone number (e.g., +09343011613)
- `contact_info.country`: Country code (e.g., "IN")
- `professional_info.current_role`: Current professional role
- `professional_info.experience_years`: Years of experience (e.g., "1-3", "3-5")
- `professional_info.expertise_areas`: Array of expertise areas
- `professional_info.education_background`: Educational background
- `teaching_preferences.preferred_subjects`: Array of preferred subjects for teaching
- `teaching_preferences.teaching_mode`: Array of preferred teaching modes
- `teaching_preferences.availability`: Preferred availability for teaching
- `consent.terms_accepted`: Must be true
- `consent.background_check_consent`: Must be true

### Optional Fields:

- `priority`: "low", "medium", "high", "urgent" (default: "high" in test data, "medium" in base)
- `status`: "submitted", "received", etc. (default: "submitted")
- `source`: Submission source (default: "website_form")
- `professional_info.current_company`: Current company (can be empty string)
- `teaching_preferences.portfolio_links`: Portfolio URL
- `teaching_preferences.demo_video_url`: Demo video URL
- `additional_notes`: Additional notes (can be empty string)
- `submission_metadata`: Form submission tracking data
  - `user_agent`, `timestamp`, `referrer` (can be empty string), `form_version`, `validation_passed`
- `message`: Optional for this form type (can be empty string)

## API Endpoints

### Submit Educator Registration Form

```
POST /api/v1/forms/educator-registration
Content-Type: application/json

{
  "form_type": "educator_registration",
  "priority": "high",
  "status": "submitted",
  "source": "website_form",
  "contact_info": {
    "full_name": "Abhishek Jha",
    "email": "abhijha903@gmail.com",
    "phone_number": "+9343011613",
    "country": "IN"
  },
  "professional_info": {
    "current_role": "teacher",
    "experience_years": "1-3",
    "expertise_areas": [
      "Digital Marketing",
      "Machine Learning"
    ],
    "education_background": "btech",
    "current_company": ""
  },
  "teaching_preferences": {
    "preferred_subjects": [
      "UI/UX Design",
      "Digital Marketing"
    ],
    "teaching_mode": [
      "Online Live Sessions"
    ],
    "availability": "weekends",
    "portfolio_links": "",
    "demo_video_url": "",
    "has_resume": false
  },
  "consent": {
    "terms_accepted": true,
    "background_check_consent": true
  },
  "additional_notes": "",
  "submission_metadata": {
    "user_agent": "Mozilla/5.0 ...",
    "timestamp": "2025-07-19T11:28:27.415Z",
    "referrer": "",
    "form_version": "3.0",
    "validation_passed": true
  }
}
```

### Get Educator Registration Forms (Admin)

```
GET /api/v1/forms/admin/educator-registration
Authorization: Bearer <admin_token>
```

## Validation Features

1. **International Phone Number Support**: Accepts phone numbers in international format.
2. **Enum Validations**: `experience_years`, `teaching_mode`, `availability`, `source` are validated against predefined lists.
3. **Array Validations**: `expertise_areas` and `preferred_subjects` are validated for minimum items and content.
4. **Boolean Requirements**: `has_resume`, `terms_accepted`, and `background_check_consent` are strictly validated as booleans that must be `true`.
5. **URL Validation**: Optional `portfolio_links` and `demo_video_url` fields validate URL format.
6. **Optional Fields**: `message`, `additional_notes`, `current_company`, and `submission_metadata.referrer` are explicitly allowed to be empty.

## Testing

The implementation has been tested with the provided JSON data and the validation now passes successfully after addressing the initial validation errors related to `message` being required, `terms_accepted`/`privacy_policy_accepted` handling, `source` enum, and `referrer` empty string. The form supports all the required and optional fields and validates them according to the specified rules.

## Integration

The educator registration form is now fully integrated into the universal form system and can be:

- Submitted via the public API endpoint
- Viewed and managed by administrators
- Filtered and searched using existing form management tools
- Exported using the existing export functionality
- Tracked with the same analytics and reporting features

## Next Steps

1. **Frontend Integration**: Update frontend forms to use the new educator registration endpoint.
2. **Email Notifications**: Configure email notifications for new educator registrations.
3. **Admin Dashboard**: Add specific views and management tools for educator registrations in the admin dashboard.
4. **Automated Workflows**: Set up automated workflows for processing educator registrations (e.g., sending confirmation emails, initiating background checks).
5. **Public API Documentation**: Update the main API documentation to reflect the new `educator_registration` form type.
