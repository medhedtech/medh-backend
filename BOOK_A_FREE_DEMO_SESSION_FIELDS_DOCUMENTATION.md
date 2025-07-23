# Complete Field Documentation: `book_a_free_demo_session` Form

## 📋 **Overview**

This document provides a comprehensive list of all supported fields for the `book_a_free_demo_session` form type, including field types, validation rules, and examples.

---

## 🔧 **Required Base Fields**

| Field                 | Type    | Required | Description                                     |
| --------------------- | ------- | -------- | ----------------------------------------------- |
| `form_type`           | string  | ✅       | Must be `"book_a_free_demo_session"`            |
| `captcha_token`       | string  | ✅       | CAPTCHA validation token                        |
| `is_student_under_16` | boolean | ✅       | Determines required fields and validation rules |

---

## 👤 **Contact Information (`contact_info`) - Required**

| Field             | Type   | Required | Validation                          | Example              |
| ----------------- | ------ | -------- | ----------------------------------- | -------------------- |
| `first_name`      | string | ✅       | 2-100 chars, alphabets only         | `"John"`             |
| `middle_name`     | string | ❌       | Alphabets only                      | `"William"`          |
| `last_name`       | string | ✅       | 2-100 chars, alphabets only         | `"Doe"`              |
| `full_name`       | string | ❌       | Auto-generated from names           | `"John William Doe"` |
| `email`           | string | ✅       | Valid email format                  | `"john@example.com"` |
| `mobile_number`   | object | ✅       | See mobile number structure below   |                      |
| `city`            | string | ✅       | Non-empty string                    | `"Mumbai"`           |
| `country`         | string | ✅       | Valid country name/code             | `"India"` or `"in"`  |
| `address`         | string | ❌       | Optional address                    | `"123 Main St"`      |
| `social_profiles` | object | ❌       | See social profiles structure below |                      |

### **Mobile Number Structure:**

```typescript
mobile_number: {
  country_code: string,    // Format: "+XX" (e.g., "+91")
  number: string,          // Valid phone number (e.g., "9876543210")
  formatted?: string       // Auto-generated (e.g., "+91 98765 43210")
}
```

### **Social Profiles Structure:**

```typescript
social_profiles: {
  linkedin?: string,       // Valid LinkedIn URL
  portfolio?: string       // Valid portfolio URL
}
```

---

## 👨‍👩‍👧‍👦 **Parent Details (`parent_details`) - Required if `is_student_under_16: true`**

| Field               | Type   | Required | Options                                  | Example                |
| ------------------- | ------ | -------- | ---------------------------------------- | ---------------------- |
| `relationship`      | string | ❌       | `"father"` \| `"mother"` \| `"guardian"` | `"father"`             |
| `preferred_timings` | string | ❌       | Free text                                | `"evening after 6 PM"` |

---

## 🎓 **Student Details (`student_details`) - Required**

### **Common Fields (All Students):**

| Field               | Type     | Required | Description               | Example                   |
| ------------------- | -------- | -------- | ------------------------- | ------------------------- |
| `name`              | string   | ✅       | Alphabets only            | `"John Doe"`              |
| `preferred_course`  | string[] | ✅       | Array of course names/IDs | `["AI and Data Science"]` |
| `preferred_timings` | string   | ❌       | Free text                 | `"Weekends preferred"`    |

### **For Students Under 16 (`is_student_under_16: true`):**

| Field                       | Type    | Required | Options                                                                          | Example             |
| --------------------------- | ------- | -------- | -------------------------------------------------------------------------------- | ------------------- |
| `grade`                     | string  | ✅       | See grade options below                                                          | `"grade_7-8"`       |
| `school_name`               | string  | ❌       | School name                                                                      | `"ABC High School"` |
| `city`                      | string  | ❌       | City name                                                                        | `"Mumbai"`          |
| `state`                     | string  | ❌       | State name                                                                       | `"Maharashtra"`     |
| `country`                   | string  | ❌       | Country name/code                                                                | `"India"`           |
| `parent_mobile_access`      | boolean | ❌       | Can parent be reached on student's mobile                                        | `true`              |
| `learning_style_preference` | string  | ❌       | `"visual"` \| `"auditory"` \| `"hands_on"` \| `"reading"` \| `"mixed"`           | `"mixed"`           |
| `know_medh_from`            | string  | ❌       | `"social_media"` \| `"friends"` \| `"website"` \| `"advertisement"` \| `"other"` | `"social_media"`    |

### **Grade Options for Under 16:**

```typescript
"grade_1-2" |
  "grade_3-4" |
  "grade_5-6" |
  "grade_7-8" |
  "grade_9-10" |
  "grade_11-12" |
  "home_study";
```

### **For Students 16+ (`is_student_under_16: false`):**

| Field                      | Type    | Required | Options                         | Example                 |
| -------------------------- | ------- | -------- | ------------------------------- | ----------------------- |
| `email`                    | string  | ❌       | Valid email format              | `"student@example.com"` |
| `highest_qualification`    | string  | ✅       | See qualification options below | `"12th passed"`         |
| `currently_studying`       | boolean | ✅       | Current study status            | `true`                  |
| `currently_working`        | boolean | ✅       | Current work status             | `false`                 |
| `education_institute_name` | string  | ❌       | Institute name                  | `"XYZ College"`         |

### **Qualification Options for 16+:**

```typescript
"10th_passed" |
  "12th_passed" |
  "undergraduate" |
  "graduate" |
  "post_graduate" |
  "10th passed" |
  "12th passed" |
  "Undergraduate" |
  "Graduate" |
  "Post-Graduate";
```

_Note: Spaces are auto-normalized to underscores_

---

## 🕐 **Demo Session Details (`demo_session_details`) - Required**

| Field                         | Type    | Required | Options/Validation                                   | Example                      |
| ----------------------------- | ------- | -------- | ---------------------------------------------------- | ---------------------------- |
| `preferred_date`              | Date    | ❌       | Must be future date                                  | `"2025-01-25T00:00:00.000Z"` |
| `preferred_time_slot`         | string  | ❌       | See time slot options below                          | `"morning 9-12"`             |
| `timezone`                    | string  | ❌       | Valid timezone                                       | `"Asia/Kolkata"` (default)   |
| `session_duration_preference` | string  | ❌       | `"30min"` \| `"45min"` \| `"60min"`                  | `"45min"`                    |
| `device_preference`           | string  | ❌       | `"computer"` \| `"tablet"` \| `"mobile"`             | `"computer"`                 |
| `internet_quality`            | string  | ❌       | `"excellent"` \| `"good"` \| `"average"` \| `"poor"` | `"good"`                     |
| `language_preference`         | string  | ❌       | `"english"` \| `"hindi"` \| `"other"`                | `"english"`                  |
| `previous_demo_attended`      | boolean | ❌       | Has attended demo before                             | `false`                      |

### **Time Slot Options:**

```typescript
// Static time slots (recommended):
"morning 9-12" | "afternoon 12-5" | "evening 5-10";

// Hourly slots (backward compatibility):
"09:00-10:00" |
  "10:00-11:00" |
  "11:00-12:00" |
  "12:00-13:00" |
  "13:00-14:00" |
  "14:00-15:00" |
  "15:00-16:00" |
  "16:00-17:00" |
  "17:00-18:00" |
  "18:00-19:00" |
  "19:00-20:00" |
  "20:00-21:00";
```

---

## ✅ **Consent (`consent`) - Required**

| Field                     | Type    | Required | Description               | Value             |
| ------------------------- | ------- | -------- | ------------------------- | ----------------- |
| `terms_and_privacy`       | boolean | ✅       | Must be `true`            | `true`            |
| `data_collection_consent` | boolean | ✅       | Must be `true`            | `true`            |
| `marketing_consent`       | boolean | ❌       | Marketing communications  | `false` (default) |
| `gdpr_consent`            | boolean | ❌       | GDPR compliance           | `true`            |
| `communication_consent`   | boolean | ❌       | Communication preferences | `true`            |

---

## 📧 **Marketing Preferences (`marketing_preferences`) - Optional**

| Field                    | Type    | Required | Description        | Example |
| ------------------------ | ------- | -------- | ------------------ | ------- |
| `email_notifications`    | boolean | ❌       | Email updates      | `true`  |
| `sms_notifications`      | boolean | ❌       | SMS updates        | `false` |
| `whatsapp_updates`       | boolean | ❌       | WhatsApp messages  | `true`  |
| `course_recommendations` | boolean | ❌       | Course suggestions | `true`  |

---

## 🔧 **Form Configuration (`form_config`) - Optional**

| Field           | Type   | Required | Description          | Example                      |
| --------------- | ------ | -------- | -------------------- | ---------------------------- |
| `form_type`     | string | ❌       | Form type identifier | `"book_a_free_demo_session"` |
| `form_version`  | string | ❌       | Form version         | `"2.1"`                      |
| `submission_id` | string | ❌       | Unique submission ID | `"sub_1234567890_abc123"`    |

---

## 📊 **Submission Metadata (`submission_metadata`) - Optional**

| Field                   | Type    | Required | Description                     | Example                      |
| ----------------------- | ------- | -------- | ------------------------------- | ---------------------------- |
| `timestamp`             | Date    | ❌       | Auto-generated if not provided  | `"2025-01-23T10:30:00.000Z"` |
| `form_version`          | string  | ❌       | Form version used               | `"2.1"`                      |
| `device_info`           | object  | ❌       | See device info structure below |                              |
| `validation_passed`     | boolean | ❌       | Client-side validation status   | `true`                       |
| `form_interaction_time` | number  | ❌       | Time spent on form (seconds)    | `180`                        |

### **Device Info Structure:**

```typescript
device_info: {
  type?: "desktop" | "mobile" | "tablet",
  os?: string,                    // e.g., "MacIntel"
  browser?: string,               // e.g., "Chrome"
  user_agent?: string,            // Full user agent string
  screen_resolution?: string      // e.g., "1920x1080"
}
```

---

## 🏗️ **Auto-Generated System Fields**

These fields are automatically generated by the system:

| Field                 | Type     | Description                   | Example                      |
| --------------------- | -------- | ----------------------------- | ---------------------------- |
| `application_id`      | string   | Unique application identifier | `"BOO473751902PHL4A"`        |
| `form_id`             | string   | Unique form identifier        | `"FORM_BOO_123456_A1B2"`     |
| `user_id`             | ObjectId | If user is authenticated      | `"507f1f77bcf86cd799439011"` |
| `status`              | string   | Form processing status        | `"submitted"`                |
| `priority`            | string   | Processing priority           | `"high"`                     |
| `department`          | string   | Assigned department           | `"sales"`                    |
| `submitted_at`        | Date     | Submission timestamp          | `"2025-01-23T10:30:00.000Z"` |
| `ip_address`          | string   | Client IP address             | `"192.168.1.1"`              |
| `user_agent`          | string   | Client user agent             | `"Mozilla/5.0..."`           |
| `source`              | string   | Submission source             | `"website"`                  |
| `acknowledgment_sent` | boolean  | Email acknowledgment status   | `false`                      |

---

## 🌐 **API Endpoints**

### **Submit Form:**

```
POST /api/v1/forms/submit
Content-Type: application/json
```

### **Get Static Time Slots:**

```
GET /api/v1/forms/demo-sessions/static-slots?timezone=Asia/Kolkata&days=7
```

### **Get Detailed Time Slots:**

```
GET /api/v1/forms/demo-sessions/available-slots?timezone=Asia/Kolkata&days=7
```

---

## 📝 **Example Usage**

### **Minimal Required Fields (Under 16):**

```json
{
  "form_type": "book_a_free_demo_session",
  "captcha_token": "development_token",
  "is_student_under_16": true,
  "contact_info": {
    "first_name": "Parent",
    "last_name": "Name",
    "email": "parent@example.com",
    "mobile_number": {
      "country_code": "+91",
      "number": "9876543210"
    },
    "city": "Mumbai",
    "country": "India"
  },
  "parent_details": {
    "relationship": "father"
  },
  "student_details": {
    "name": "Child Name",
    "grade": "grade_7-8",
    "preferred_course": ["AI and Data Science"]
  },
  "demo_session_details": {
    "preferred_time_slot": "morning 9-12",
    "timezone": "Asia/Kolkata"
  },
  "consent": {
    "terms_and_privacy": true,
    "data_collection_consent": true
  }
}
```

### **Minimal Required Fields (16+):**

```json
{
  "form_type": "book_a_free_demo_session",
  "captcha_token": "development_token",
  "is_student_under_16": false,
  "contact_info": {
    "first_name": "Student",
    "last_name": "Name",
    "email": "student@example.com",
    "mobile_number": {
      "country_code": "+91",
      "number": "9876543210"
    },
    "city": "Mumbai",
    "country": "India"
  },
  "student_details": {
    "name": "Student Name",
    "highest_qualification": "12th passed",
    "currently_studying": true,
    "currently_working": false,
    "preferred_course": ["AI and Data Science"]
  },
  "demo_session_details": {
    "preferred_time_slot": "morning 9-12",
    "timezone": "Asia/Kolkata"
  },
  "consent": {
    "terms_and_privacy": true,
    "data_collection_consent": true
  }
}
```

---

## ✅ **Field Validation Summary**

### **Always Required:**

- `form_type`, `captcha_token`, `is_student_under_16`
- `contact_info.*` (first_name, last_name, email, mobile_number, city, country)
- `student_details.name`, `student_details.preferred_course`
- `demo_session_details` (object, but individual fields optional)
- `consent.terms_and_privacy`, `consent.data_collection_consent`

### **Conditionally Required:**

- `parent_details` - Required if `is_student_under_16: true`
- `student_details.grade` - Required if `is_student_under_16: true`
- `student_details.highest_qualification` - Required if `is_student_under_16: false`
- `student_details.currently_studying` - Required if `is_student_under_16: false`
- `student_details.currently_working` - Required if `is_student_under_16: false`

### **Always Optional:**

- All other fields not mentioned above

This comprehensive documentation covers all supported fields for the `book_a_free_demo_session` form type. Use the complete example JSON file (`FORM_FIELDS_COMPLETE_EXAMPLE.json`) as a reference for implementation.
