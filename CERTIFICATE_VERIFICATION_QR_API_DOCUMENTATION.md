# Certificate Verification and QR Code Generation API Documentation

## Overview

This document describes the Certificate Verification and QR Code Generation APIs that extend the MEDH certificate system. These APIs provide functionality for verifying certificate authenticity, generating QR codes for certificates, and creating demo enrollments for testing.

## Table of Contents

1. [Certificate Verification APIs](#certificate-verification-apis)
2. [QR Code Generation APIs](#qr-code-generation-apis)
3. [Demo Enrollment API](#demo-enrollment-api)
4. [Utility Functions](#utility-functions)
5. [Error Handling](#error-handling)
6. [Examples](#examples)
7. [Testing](#testing)

---

## Certificate Verification APIs

### 1. Verify Single Certificate

**Endpoint:** `GET /api/v1/certificates/verify/:certificateNumber`

**Description:** Verifies a single certificate by its certificate number.

**Parameters:**

- `certificateNumber` (path parameter): The certificate number to verify

**Response:**

```json
{
  "success": true,
  "message": "Certificate is valid",
  "data": {
    "isValid": true,
    "certificate": {
      "id": "certificate_id",
      "certificateNumber": "MEDH-CERT-2024-ABC12345",
      "issueDate": "2024-01-15T10:30:00Z",
      "expiryDate": "2025-01-15T10:30:00Z",
      "status": "active",
      "grade": "A",
      "finalScore": 85,
      "completionDate": "2024-01-10T15:45:00Z"
    },
    "student": {
      "id": "student_id",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "studentId": "STU123456"
    },
    "course": {
      "id": "course_id",
      "title": "Advanced JavaScript",
      "description": "Comprehensive JavaScript course",
      "instructor": "Jane Smith"
    },
    "enrollment": {
      "enrollmentDate": "2023-12-01T09:00:00Z",
      "status": "completed"
    },
    "metadata": {
      "issuedBy": "MEDH Education",
      "issuerTitle": "Chief Academic Officer",
      "verificationDate": "2024-01-16T12:00:00Z"
    }
  }
}
```

**Authentication:** Not required (public endpoint)

### 2. Bulk Certificate Verification

**Endpoint:** `POST /api/v1/certificates/verify-bulk`

**Description:** Verifies multiple certificates at once (maximum 50).

**Authentication:** Required (admin, instructor, super-admin)

**Request Body:**

```json
{
  "certificateNumbers": [
    "MEDH-CERT-2024-ABC12345",
    "MEDH-CERT-2024-DEF67890",
    "MEDH-CERT-2024-GHI11111"
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Verified 3 certificates",
  "data": {
    "summary": {
      "total": 3,
      "valid": 2,
      "invalid": 1
    },
    "results": [
      {
        "certificateNumber": "MEDH-CERT-2024-ABC12345",
        "isValid": true,
        "status": "active",
        "message": "Valid certificate",
        "data": {
          "issueDate": "2024-01-15T10:30:00Z",
          "grade": "A",
          "finalScore": 85,
          "student": "John Doe",
          "course": "Advanced JavaScript"
        }
      },
      {
        "certificateNumber": "MEDH-CERT-2024-DEF67890",
        "isValid": false,
        "status": "not_found",
        "message": "Certificate not found",
        "data": null
      }
    ]
  }
}
```

---

## QR Code Generation APIs

### 1. Generate QR Code (GET Method)

**Endpoint:** `GET /api/v1/certificates/:certificateId/qr-code`

**Description:** Generates a QR code for a certificate using GET method.

**Authentication:** Required (admin, instructor, super-admin, student)

**Parameters:**

- `certificateId` (path parameter): Certificate ID, MongoDB ObjectId, or certificate number

**Response:**

```json
{
  "success": true,
  "message": "QR code generated successfully",
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "verificationUrl": "https://api.medh.co/verify/MEDH-CERT-2024-ABC12345",
    "certificateId": "certificate_id",
    "certificateNumber": "MEDH-CERT-2024-ABC12345",
    "format": "data:image/png;base64",
    "certificate": {
      "issueDate": "2024-01-15T10:30:00Z",
      "grade": "A",
      "finalScore": 85
    }
  }
}
```

### 2. Generate QR Code (POST Method)

**Endpoint:** `POST /api/v1/certificates/generate-qr-code`

**Description:** Generates a QR code with more options using POST method.

**Authentication:** Required (admin, instructor, super-admin)

**Request Body:**

```json
{
  "certificateId": "certificate_id_or_number",
  "certificateNumber": "MEDH-CERT-2024-ABC12345",
  "verificationUrl": "https://api.medh.co/verify/MEDH-CERT-2024-ABC12345",
  "options": {
    "width": 300,
    "errorCorrectionLevel": "H",
    "margin": 2
  }
}
```

**Response:** Same as GET method

### 3. Download QR Code

**Endpoint:** `GET /api/v1/certificates/:certificateId/qr-code/download`

**Description:** Downloads QR code as an image file.

**Authentication:** Required (admin, instructor, super-admin, student)

**Query Parameters:**

- `format` (optional): Image format (png, jpg, svg). Default: png
- `width` (optional): Image width in pixels. Default: 300

**Response:** Binary image file with appropriate headers

---

## Demo Enrollment API

### Create Demo Enrollment

**Endpoint:** `POST /api/v1/certificates/demo-enrollment`

**Description:** Creates a demo student enrollment for testing certificate generation.

**Authentication:** Required (admin, super-admin)

**Request Body:**

```json
{
  "studentName": "Demo Student",
  "studentEmail": "demo@medh.co",
  "courseTitle": "Demo Course",
  "courseDuration": "30 days",
  "finalScore": 85,
  "completionDate": "2024-01-10T15:45:00Z"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Demo enrollment created successfully",
  "data": {
    "enrollment": {
      "id": "enrollment_id",
      "enrollmentDate": "2023-12-01T09:00:00Z",
      "completionDate": "2024-01-10T15:45:00Z",
      "finalScore": 85,
      "status": "completed"
    },
    "student": {
      "id": "student_id",
      "name": "Demo Student",
      "email": "demo@medh.co",
      "studentId": "DEMO_1705123456789"
    },
    "course": {
      "id": "course_id",
      "title": "Demo Course",
      "description": "This is a demo course for testing certificate generation",
      "duration": "30 days"
    },
    "certificateEligible": true,
    "nextSteps": {
      "generateCertificateId": "/api/v1/certificates/generate-id",
      "generateQRCode": "/api/v1/certificates/generate-qr-code"
    }
  }
}
```

---

## Utility Functions

### QR Code Generation Options

The system supports different QR code configurations:

1. **Certificate Style** (High quality for certificates):

   - Width: 300px
   - Error correction: High (H)
   - Margin: 2
   - Color: Dark blue (#1a365d)

2. **Verification Style** (Standard for verification):

   - Width: 200px
   - Error correction: Medium (M)
   - Margin: 1
   - Color: Black (#000000)

3. **General Style** (Default):
   - Width: 256px
   - Error correction: Medium (M)
   - Margin: 1
   - Color: Black (#000000)

### Certificate Validation

Certificates are validated based on:

- Status must be 'active'
- Expiry date must be in the future (if set)
- Certificate must exist in the database
- Student and course must be valid

---

## Error Handling

### Common Error Responses

**400 Bad Request:**

```json
{
  "success": false,
  "message": "Certificate number is required",
  "errors": ["Validation error details"]
}
```

**404 Not Found:**

```json
{
  "success": false,
  "message": "Certificate not found",
  "isValid": false
}
```

**500 Internal Server Error:**

```json
{
  "success": false,
  "message": "Failed to verify certificate",
  "error": "Error details"
}
```

### QR Code Generation Errors

**Invalid Parameters:**

```json
{
  "success": false,
  "message": "Invalid QR code parameters",
  "errors": [
    "Width must be a number between 50 and 2000",
    "Error correction level must be one of: L, M, Q, H"
  ]
}
```

---

## Examples

### Example 1: Verify Certificate

```bash
curl -X GET "https://api.medh.co/api/v1/certificates/verify/MEDH-CERT-2024-ABC12345" \
  -H "Content-Type: application/json"
```

### Example 2: Generate QR Code

```bash
curl -X GET "https://api.medh.co/api/v1/certificates/certificate_id/qr-code" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Example 3: Create Demo Enrollment

```bash
curl -X POST "https://api.medh.co/api/v1/certificates/demo-enrollment" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentName": "Test Student",
    "studentEmail": "test@example.com",
    "courseTitle": "Test Course",
    "finalScore": 90
  }'
```

### Example 4: Bulk Verification

```bash
curl -X POST "https://api.medh.co/api/v1/certificates/verify-bulk" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "certificateNumbers": [
      "MEDH-CERT-2024-ABC12345",
      "MEDH-CERT-2024-DEF67890"
    ]
  }'
```

---

## Testing

### Test Workflow

1. **Create Demo Enrollment:**

   ```bash
   POST /api/v1/certificates/demo-enrollment
   ```

2. **Generate Certificate ID:**

   ```bash
   POST /api/v1/certificates/generate-id
   ```

3. **Generate QR Code:**

   ```bash
   GET /api/v1/certificates/{certificateId}/qr-code
   ```

4. **Verify Certificate:**
   ```bash
   GET /api/v1/certificates/verify/{certificateNumber}
   ```

### Test Data

The system automatically creates demo data with:

- Demo student with `is_demo: true`
- Demo course with status 'Published'
- Completed enrollment with 85% score
- Certificate eligibility (score >= 70%)

---

## Security Considerations

1. **Public Verification:** Certificate verification is public to allow anyone to verify authenticity
2. **QR Code Generation:** Requires authentication to prevent abuse
3. **Demo Enrollment:** Restricted to admin users only
4. **Rate Limiting:** Bulk verification limited to 50 certificates per request
5. **Input Validation:** All inputs are validated and sanitized

---

## Dependencies

- **QR Code Generation:** `qrcode` package (v1.5.4)
- **Authentication:** JWT tokens
- **Database:** MongoDB with Mongoose
- **Logging:** Winston logger
- **File Upload:** For QR code downloads

---

## Future Enhancements

1. **Blockchain Integration:** Store certificate hashes on blockchain
2. **Advanced QR Codes:** Add logos and custom styling
3. **Batch QR Generation:** Generate multiple QR codes at once
4. **Analytics:** Track verification attempts and patterns
5. **Mobile App Integration:** Deep linking for mobile verification

---

## Support

For technical support or questions about the Certificate Verification and QR Code Generation APIs, please contact the development team or refer to the main API documentation.
