# Certificate ID Generation and Demo Enrollment API Documentation

## Overview

This document describes the Certificate ID Generation and Demo Student Enrollment APIs that have been added to the MEDH backend system. These APIs provide functionality for generating unique certificate IDs for completed courses and creating demo student enrollments for testing purposes.

## Table of Contents

1. [Certificate ID Generation API](#certificate-id-generation-api)
2. [Demo Student Enrollment API](#demo-student-enrollment-api)
3. [Utility Functions](#utility-functions)
4. [Error Handling](#error-handling)
5. [Examples](#examples)
6. [Testing](#testing)

---

## Certificate ID Generation API

### Generate Certificate ID

**Endpoint:** `POST /api/v1/certificates/generate-id`

**Description:** Generates a unique certificate ID for a completed course enrollment with proper validation and requirements checking.

**Authentication:** Required (JWT Token)

**Authorization:** `admin`, `instructor`, `super-admin`

#### Request Body

```json
{
  "studentId": "string (required)",
  "courseId": "string (required)",
  "enrollmentId": "string (optional)",
  "finalScore": "number (required, 0-100)"
}
```

#### Request Parameters

| Parameter      | Type   | Required | Description                                                                       |
| -------------- | ------ | -------- | --------------------------------------------------------------------------------- |
| `studentId`    | String | Yes      | MongoDB ObjectId of the student                                                   |
| `courseId`     | String | Yes      | MongoDB ObjectId of the course                                                    |
| `enrollmentId` | String | No       | MongoDB ObjectId of the enrollment (if not provided, will be found automatically) |
| `finalScore`   | Number | Yes      | Final score percentage (0-100)                                                    |

#### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Certificate ID generated successfully",
  "data": {
    "certificateId": "MEDH-CERT-2025-A1B2C3D4",
    "certificateNumber": "CERT-20250127-E5F6G7H8",
    "verificationUrl": "https://medh.edu.in/verify-certificate/CERT-20250127-E5F6G7H8",
    "grade": "A",
    "finalScore": 85,
    "issueDate": "2025-01-27T10:30:00.000Z",
    "student": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    "course": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b4",
      "title": "Advanced JavaScript Programming",
      "instructor": "Dr. Jane Smith"
    }
  }
}
```

#### Error Responses

**400 Bad Request - Missing Required Fields**

```json
{
  "success": false,
  "message": "Student ID, Course ID, and Final Score are required"
}
```

**400 Bad Request - Invalid Score**

```json
{
  "success": false,
  "message": "Final score must be a number between 0 and 100"
}
```

**400 Bad Request - Requirements Not Met**

```json
{
  "success": false,
  "message": "Certificate requirements not met",
  "errors": [
    "Course must be completed to generate certificate",
    "Minimum score of 70% required for certificate"
  ]
}
```

**404 Not Found - Enrollment Not Found**

```json
{
  "success": false,
  "message": "Enrollment not found for the given student and course"
}
```

**409 Conflict - Certificate Already Exists**

```json
{
  "success": false,
  "message": "Certificate already exists for this enrollment",
  "certificate": {
    "id": "MEDH-CERT-2025-A1B2C3D4",
    "certificateNumber": "CERT-20250127-E5F6G7H8",
    "verificationUrl": "https://medh.edu.in/verify-certificate/CERT-20250127-E5F6G7H8"
  }
}
```

---

## Demo Student Enrollment API

### Create Demo Enrollment

**Endpoint:** `POST /api/v1/certificates/demo-enrollment`

**Description:** Creates a demo student enrollment for testing certificate generation functionality.

**Authentication:** Required (JWT Token)

**Authorization:** `admin`, `super-admin`

#### Request Body

```json
{
  "studentData": {
    "full_name": "string (required)",
    "email": "string (required)",
    "phone_number": "string (required)",
    "age_group": "string (optional)",
    "gender": "string (optional)"
  },
  "courseId": "string (required)",
  "enrollmentType": "string (optional, default: 'individual')",
  "paymentData": {
    "amount": "number (optional)",
    "payment_method": "string (optional)",
    "transaction_id": "string (optional)"
  },
  "demoMode": "boolean (optional, default: true)"
}
```

#### Request Parameters

| Parameter                  | Type    | Required | Description                                       |
| -------------------------- | ------- | -------- | ------------------------------------------------- |
| `studentData.full_name`    | String  | Yes      | Full name of the demo student                     |
| `studentData.email`        | String  | Yes      | Email address (must be valid format)              |
| `studentData.phone_number` | String  | Yes      | Phone number                                      |
| `studentData.age_group`    | String  | No       | Age group (default: '25-34')                      |
| `studentData.gender`       | String  | No       | Gender (default: 'prefer-not-to-say')             |
| `courseId`                 | String  | Yes      | MongoDB ObjectId of the course                    |
| `enrollmentType`           | String  | No       | Type of enrollment (default: 'individual')        |
| `paymentData`              | Object  | No       | Payment information for non-demo enrollments      |
| `demoMode`                 | Boolean | No       | Whether this is a demo enrollment (default: true) |

#### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Demo enrollment created successfully",
  "data": {
    "enrollment": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b5",
      "status": "active",
      "enrollmentDate": "2025-01-27T10:30:00.000Z",
      "accessExpiryDate": "2025-07-27T10:30:00.000Z",
      "enrollmentType": "individual",
      "progress": {
        "overall_percentage": 85,
        "lessons_completed": 0,
        "last_activity_date": "2025-01-27T10:30:00.000Z"
      }
    },
    "student": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "name": "Demo Student",
      "email": "demo.student@example.com",
      "phone": "+1234567890",
      "isDemo": true
    },
    "course": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b4",
      "title": "Advanced JavaScript Programming",
      "description": "Learn advanced JavaScript concepts...",
      "price": 299,
      "currency": "INR"
    },
    "nextSteps": {
      "message": "You can now generate a certificate ID for this enrollment",
      "generateCertificateEndpoint": "/api/v1/certificates/generate-id",
      "requiredFields": ["studentId", "courseId", "enrollmentId", "finalScore"]
    }
  }
}
```

#### Error Responses

**400 Bad Request - Missing Required Fields**

```json
{
  "success": false,
  "message": "Student data and Course ID are required"
}
```

**400 Bad Request - Missing Student Fields**

```json
{
  "success": false,
  "message": "Missing required student fields: full_name, email"
}
```

**404 Not Found - Course Not Found**

```json
{
  "success": false,
  "message": "Course not found"
}
```

**409 Conflict - Student Already Enrolled**

```json
{
  "success": false,
  "message": "Student is already enrolled in this course",
  "enrollment": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b5",
    "status": "active",
    "enrollmentDate": "2025-01-27T10:30:00.000Z"
  }
}
```

---

## Utility Functions

### Certificate ID Generation

The system includes several utility functions for certificate management:

#### `generateCertificateId(courseId, studentId, completionDate)`

- **Format:** `MEDH-CERT-YYYY-XXXXXXXX`
- **Example:** `MEDH-CERT-2025-A1B2C3D4`
- **Uniqueness:** Verified against existing certificates

#### `generateCertificateNumber(completionDate)`

- **Format:** `CERT-YYYYMMDD-XXXXXXXX`
- **Example:** `CERT-20250127-E5F6G7H8`
- **Uniqueness:** Verified against existing certificates

#### `generateVerificationUrl(certificateNumber)`

- **Format:** `{FRONTEND_URL}/verify-certificate/{certificateNumber}`
- **Example:** `https://medh.edu.in/verify-certificate/CERT-20250127-E5F6G7H8`

#### `calculateGrade(finalScore)`

Grade calculation based on score:

- 97-100: A+
- 93-96: A
- 90-92: A-
- 87-89: B+
- 83-86: B
- 80-82: B-
- 77-79: C+
- 73-76: C
- 70-72: C-
- 60-69: D
- Below 60: F

#### `validateCertificateRequirements(enrollmentData, finalScore)`

Validates:

- Enrollment status is 'completed'
- Final score is at least 70%
- Certificate not already issued

---

## Error Handling

### Common Error Codes

| Status Code | Description           | Common Causes                                        |
| ----------- | --------------------- | ---------------------------------------------------- |
| 400         | Bad Request           | Missing required fields, invalid data format         |
| 401         | Unauthorized          | Missing or invalid JWT token                         |
| 403         | Forbidden             | Insufficient permissions                             |
| 404         | Not Found             | Student, course, or enrollment not found             |
| 409         | Conflict              | Certificate already exists, student already enrolled |
| 500         | Internal Server Error | Database errors, system failures                     |

### Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development mode)",
  "errors": ["Array of validation errors (when applicable)"]
}
```

---

## Examples

### Complete Workflow Example

#### Step 1: Create Demo Enrollment

```bash
curl -X POST "http://localhost:3000/api/v1/certificates/demo-enrollment" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentData": {
      "full_name": "Demo Student",
      "email": "demo.student@example.com",
      "phone_number": "+1234567890",
      "age_group": "25-34",
      "gender": "male"
    },
    "courseId": "60f7b3b3b3b3b3b3b3b3b3b4",
    "enrollmentType": "individual",
    "demoMode": true
  }'
```

#### Step 2: Generate Certificate ID

```bash
curl -X POST "http://localhost:3000/api/v1/certificates/generate-id" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "courseId": "60f7b3b3b3b3b3b3b3b3b3b4",
    "enrollmentId": "60f7b3b3b3b3b3b3b3b3b3b5",
    "finalScore": 85
  }'
```

### JavaScript/Node.js Example

```javascript
const axios = require("axios");

const baseURL = "http://localhost:3000/api/v1/certificates";
const authToken = "YOUR_JWT_TOKEN";

// Create demo enrollment
async function createDemoEnrollment() {
  try {
    const response = await axios.post(
      `${baseURL}/demo-enrollment`,
      {
        studentData: {
          full_name: "Demo Student",
          email: "demo.student@example.com",
          phone_number: "+1234567890",
        },
        courseId: "60f7b3b3b3b3b3b3b3b3b3b4",
        demoMode: true,
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("Demo enrollment created:", response.data);
    return response.data.data;
  } catch (error) {
    console.error("Error creating demo enrollment:", error.response.data);
  }
}

// Generate certificate ID
async function generateCertificateId(
  studentId,
  courseId,
  enrollmentId,
  finalScore,
) {
  try {
    const response = await axios.post(
      `${baseURL}/generate-id`,
      {
        studentId,
        courseId,
        enrollmentId,
        finalScore,
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("Certificate ID generated:", response.data);
    return response.data.data;
  } catch (error) {
    console.error("Error generating certificate ID:", error.response.data);
  }
}

// Complete workflow
async function completeWorkflow() {
  const enrollment = await createDemoEnrollment();
  if (enrollment) {
    const certificate = await generateCertificateId(
      enrollment.student.id,
      enrollment.course.id,
      enrollment.enrollment.id,
      85,
    );
    console.log("Workflow completed successfully!");
  }
}

completeWorkflow();
```

---

## Testing

### Test Scenarios

#### 1. Successful Certificate Generation

- Create demo enrollment
- Generate certificate with valid score (≥70)
- Verify unique certificate ID and number
- Check enrollment is marked as certificate issued

#### 2. Validation Tests

- Test with score below 70% (should fail)
- Test with incomplete enrollment (should fail)
- Test duplicate certificate generation (should fail)
- Test with invalid student/course IDs (should fail)

#### 3. Demo Enrollment Tests

- Create demo student with valid data
- Test with existing student email
- Test with invalid course ID
- Test duplicate enrollment for same student/course

#### 4. Edge Cases

- Test with maximum/minimum scores
- Test with expired enrollments
- Test with large datasets for uniqueness
- Test concurrent certificate generation

### Test Data

```json
{
  "validStudentData": {
    "full_name": "Test Student",
    "email": "test.student@example.com",
    "phone_number": "+1234567890",
    "age_group": "25-34",
    "gender": "male"
  },
  "validCourseId": "60f7b3b3b3b3b3b3b3b3b3b4",
  "validScores": [70, 75, 80, 85, 90, 95, 100],
  "invalidScores": [-10, 0, 69, 101, 150]
}
```

---

## Environment Variables

Ensure these environment variables are set:

```env
# Required
FRONTEND_URL=https://medh.edu.in
MONGODB_URI=mongodb://localhost:27017/medh

# Optional (with defaults)
DEFAULT_SIGNATURE_URL=/assets/signatures/default-signature.png
INSTITUTION_LOGO_URL=/assets/logos/medh-logo.png
CERTIFICATE_TEMPLATE_URL=/assets/templates/default-certificate.png
```

---

## Database Schema Updates

### User Model

Added `is_demo` field:

```javascript
is_demo: {
  type: Boolean,
  default: false
}
```

### Certificate Model

Uses existing certificate model with these key fields:

- `id`: Unique certificate ID (MEDH-CERT-YYYY-XXXXXXXX)
- `certificateNumber`: Unique certificate number (CERT-YYYYMMDD-XXXXXXXX)
- `verificationUrl`: URL for certificate verification
- `grade`: Calculated grade based on final score
- `finalScore`: Student's final score percentage

### Enrollment Model

Uses existing enrollment model with certificate tracking:

- `certificate_issued`: Boolean flag
- `certificate_id`: Reference to certificate document

---

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Role-based access control (admin, instructor, super-admin)
3. **Input Validation**: Comprehensive validation of all input parameters
4. **Unique IDs**: Cryptographically secure random ID generation
5. **Demo Data**: Demo students are clearly marked and can be filtered
6. **Rate Limiting**: Consider implementing rate limiting for production use

---

## Monitoring and Logging

The system logs important events:

- Certificate ID generation attempts and results
- Demo enrollment creation
- Validation failures
- Database errors
- Authentication/authorization failures

Log entries include:

- Timestamp
- User ID (if authenticated)
- Action performed
- Request parameters
- Success/failure status
- Error details (if applicable)

---

## Support

For technical support or questions about these APIs, please contact the development team or refer to the main API documentation.
