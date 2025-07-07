# Certificate Master API Documentation

## Overview

The Certificate Master API provides comprehensive management of different certificate types offered by the MEDH platform. This system supports various certificate levels from foundational to expert, with detailed metadata, requirements, and pricing information.

## Base URL

```
/api/v1/certificate-masters
```

## Authentication

All endpoints require JWT authentication. Include the authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Certificate Types

The system supports the following certificate types:

1. **Foundational Certificate** - Entry-level for beginners
2. **Advanced Certificate** - Intermediate-level for experienced learners
3. **Professional Certificate** - Professional-level for career advancement
4. **Specialist Certificate** - Specialized expertise areas
5. **Master Certificate** - Master-level for industry leadership
6. **Executive Diploma** - Executive-level for senior leadership
7. **Professional Grad Diploma** - Graduate-level professional diploma
8. **Industry Certificate** - Industry-specific for specialized sectors

## API Endpoints

### 1. Create Certificate Master

**POST** `/api/v1/certificate-masters/create`

Creates a new certificate master entry.

#### Request Body

```json
{
  "name": "Professional Certificate",
  "description": "Professional-level certificate for career advancement",
  "icon": "professional-icon",
  "color": "#8B5CF6",
  "isActive": true,
  "sortOrder": 3,
  "metadata": {
    "level": "professional",
    "duration": "12-18 months",
    "prerequisites": ["Advanced knowledge", "Professional experience"],
    "learningOutcomes": ["Expert-level skills", "Industry best practices"],
    "targetAudience": ["Professionals", "Managers"],
    "industryRecognition": true,
    "accreditation": "Industry Accredited"
  },
  "certificateInfo": {
    "certificateType": "professional",
    "validityPeriod": "5 years",
    "renewalRequired": true,
    "renewalPeriod": "Every 5 years",
    "issuingAuthority": "MEDH",
    "digitalBadge": true,
    "physicalCertificate": true,
    "certificateTemplate": "professional-template"
  },
  "requirements": {
    "minimumCourses": 5,
    "minimumHours": 120,
    "minimumScore": 80,
    "mandatoryCourses": [],
    "electiveCourses": [],
    "assessmentRequired": true,
    "projectRequired": true
  },
  "pricing": {
    "basePrice": 599,
    "currency": "USD",
    "discountAvailable": true,
    "discountPercentage": 20,
    "installmentAvailable": true,
    "installmentCount": 6
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Certificate created successfully",
  "data": {
    "_id": "65f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Professional Certificate",
    "description": "Professional-level certificate for career advancement",
    "icon": "professional-icon",
    "color": "#8B5CF6",
    "isActive": true,
    "sortOrder": 3,
    "metadata": {
      "level": "professional",
      "duration": "12-18 months",
      "prerequisites": ["Advanced knowledge", "Professional experience"],
      "learningOutcomes": ["Expert-level skills", "Industry best practices"],
      "targetAudience": ["Professionals", "Managers"],
      "industryRecognition": true,
      "accreditation": "Industry Accredited"
    },
    "certificateInfo": {
      "certificateType": "professional",
      "validityPeriod": "5 years",
      "renewalRequired": true,
      "renewalPeriod": "Every 5 years",
      "issuingAuthority": "MEDH",
      "digitalBadge": true,
      "physicalCertificate": true,
      "certificateTemplate": "professional-template"
    },
    "requirements": {
      "minimumCourses": 5,
      "minimumHours": 120,
      "minimumScore": 80,
      "mandatoryCourses": [],
      "electiveCourses": [],
      "assessmentRequired": true,
      "projectRequired": true
    },
    "pricing": {
      "basePrice": 599,
      "currency": "USD",
      "discountAvailable": true,
      "discountPercentage": 20,
      "installmentAvailable": true,
      "installmentCount": 6
    },
    "stats": {
      "totalCourses": 0,
      "totalEnrollments": 0,
      "totalCompletions": 0,
      "totalRevenue": 0,
      "averageCompletionRate": 0
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get All Certificate Masters

**GET** `/api/v1/certificate-masters`

Retrieves all certificate masters with optional filtering and pagination.

#### Query Parameters

| Parameter             | Type    | Description                    | Example                     |
| --------------------- | ------- | ------------------------------ | --------------------------- |
| `isActive`            | boolean | Filter by active status        | `?isActive=true`            |
| `level`               | string  | Filter by certificate level    | `?level=professional`       |
| `certificateType`     | string  | Filter by certificate type     | `?certificateType=diploma`  |
| `industryRecognition` | boolean | Filter by industry recognition | `?industryRecognition=true` |
| `sortBy`              | string  | Sort field                     | `?sortBy=sortOrder`         |
| `order`               | string  | Sort order (asc/desc)          | `?order=asc`                |
| `limit`               | number  | Number of results per page     | `?limit=10`                 |
| `page`                | number  | Page number                    | `?page=1`                   |

#### Example Request

```
GET /api/v1/certificate-masters?level=professional&sortBy=sortOrder&order=asc&limit=5&page=1
```

#### Response

```json
{
  "success": true,
  "message": "Certificates fetched successfully",
  "data": [
    {
      "_id": "65f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Professional Certificate",
      "description": "Professional-level certificate for career advancement",
      "icon": "professional-icon",
      "color": "#8B5CF6",
      "isActive": true,
      "sortOrder": 3,
      "metadata": {
        "level": "professional",
        "duration": "12-18 months",
        "prerequisites": ["Advanced knowledge", "Professional experience"],
        "learningOutcomes": ["Expert-level skills", "Industry best practices"],
        "targetAudience": ["Professionals", "Managers"],
        "industryRecognition": true,
        "accreditation": "Industry Accredited"
      },
      "certificateInfo": {
        "certificateType": "professional",
        "validityPeriod": "5 years",
        "renewalRequired": true,
        "renewalPeriod": "Every 5 years",
        "issuingAuthority": "MEDH",
        "digitalBadge": true,
        "physicalCertificate": true,
        "certificateTemplate": "professional-template"
      },
      "requirements": {
        "minimumCourses": 5,
        "minimumHours": 120,
        "minimumScore": 80,
        "mandatoryCourses": [],
        "electiveCourses": [],
        "assessmentRequired": true,
        "projectRequired": true
      },
      "pricing": {
        "basePrice": 599,
        "currency": "USD",
        "discountAvailable": true,
        "discountPercentage": 20,
        "installmentAvailable": true,
        "installmentCount": 6
      },
      "stats": {
        "totalCourses": 0,
        "totalEnrollments": 0,
        "totalCompletions": 0,
        "totalRevenue": 0,
        "averageCompletionRate": 0
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 8,
    "page": 1,
    "limit": 5,
    "pages": 2
  }
}
```

### 3. Get Certificate Master by ID

**GET** `/api/v1/certificate-masters/:id`

Retrieves a specific certificate master by its ID.

#### Example Request

```
GET /api/v1/certificate-masters/65f8a1b2c3d4e5f6a7b8c9d0
```

#### Response

```json
{
  "success": true,
  "message": "Certificate fetched successfully",
  "data": {
    "_id": "65f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Professional Certificate",
    "description": "Professional-level certificate for career advancement",
    "icon": "professional-icon",
    "color": "#8B5CF6",
    "isActive": true,
    "sortOrder": 3,
    "metadata": {
      "level": "professional",
      "duration": "12-18 months",
      "prerequisites": ["Advanced knowledge", "Professional experience"],
      "learningOutcomes": ["Expert-level skills", "Industry best practices"],
      "targetAudience": ["Professionals", "Managers"],
      "industryRecognition": true,
      "accreditation": "Industry Accredited"
    },
    "certificateInfo": {
      "certificateType": "professional",
      "validityPeriod": "5 years",
      "renewalRequired": true,
      "renewalPeriod": "Every 5 years",
      "issuingAuthority": "MEDH",
      "digitalBadge": true,
      "physicalCertificate": true,
      "certificateTemplate": "professional-template"
    },
    "requirements": {
      "minimumCourses": 5,
      "minimumHours": 120,
      "minimumScore": 80,
      "mandatoryCourses": [],
      "electiveCourses": [],
      "assessmentRequired": true,
      "projectRequired": true
    },
    "pricing": {
      "basePrice": 599,
      "currency": "USD",
      "discountAvailable": true,
      "discountPercentage": 20,
      "installmentAvailable": true,
      "installmentCount": 6
    },
    "stats": {
      "totalCourses": 0,
      "totalEnrollments": 0,
      "totalCompletions": 0,
      "totalRevenue": 0,
      "averageCompletionRate": 0
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. Get Certificate Master Details

**GET** `/api/v1/certificate-masters/:id/details`

Retrieves a certificate master with associated courses and statistics.

#### Example Request

```
GET /api/v1/certificate-masters/65f8a1b2c3d4e5f6a7b8c9d0/details
```

#### Response

```json
{
  "success": true,
  "message": "Certificate details fetched successfully",
  "data": {
    "certificate": {
      "_id": "65f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Professional Certificate",
      "description": "Professional-level certificate for career advancement",
      "icon": "professional-icon",
      "color": "#8B5CF6",
      "isActive": true,
      "sortOrder": 3,
      "metadata": {
        "level": "professional",
        "duration": "12-18 months",
        "prerequisites": ["Advanced knowledge", "Professional experience"],
        "learningOutcomes": ["Expert-level skills", "Industry best practices"],
        "targetAudience": ["Professionals", "Managers"],
        "industryRecognition": true,
        "accreditation": "Industry Accredited"
      },
      "certificateInfo": {
        "certificateType": "professional",
        "validityPeriod": "5 years",
        "renewalRequired": true,
        "renewalPeriod": "Every 5 years",
        "issuingAuthority": "MEDH",
        "digitalBadge": true,
        "physicalCertificate": true,
        "certificateTemplate": "professional-template"
      },
      "requirements": {
        "minimumCourses": 5,
        "minimumHours": 120,
        "minimumScore": 80,
        "mandatoryCourses": [],
        "electiveCourses": [],
        "assessmentRequired": true,
        "projectRequired": true
      },
      "pricing": {
        "basePrice": 599,
        "currency": "USD",
        "discountAvailable": true,
        "discountPercentage": 20,
        "installmentAvailable": true,
        "installmentCount": 6
      },
      "stats": {
        "totalCourses": 0,
        "totalEnrollments": 0,
        "totalCompletions": 0,
        "totalRevenue": 0,
        "averageCompletionRate": 0
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "associatedCourses": [
      {
        "_id": "65f8b1c2d3e4f5g6h7i8j9k0",
        "course_title": "Advanced JavaScript Development",
        "course_category": "Programming",
        "course_duration": "8 weeks",
        "prices": {
          "USD": 199
        },
        "status": "Published"
      }
    ],
    "stats": {
      "coursesCount": 1
    }
  }
}
```

### 5. Update Certificate Master

**PUT** `/api/v1/certificate-masters/:id`

Updates an existing certificate master.

#### Request Body

```json
{
  "description": "Updated description for professional certificate",
  "isActive": true,
  "sortOrder": 4,
  "metadata": {
    "level": "professional",
    "duration": "15-20 months",
    "prerequisites": [
      "Advanced knowledge",
      "Professional experience",
      "Leadership skills"
    ],
    "learningOutcomes": [
      "Expert-level skills",
      "Industry best practices",
      "Strategic thinking"
    ],
    "targetAudience": ["Professionals", "Managers", "Team Leaders"],
    "industryRecognition": true,
    "accreditation": "Industry Accredited"
  },
  "pricing": {
    "basePrice": 699,
    "currency": "USD",
    "discountAvailable": true,
    "discountPercentage": 25,
    "installmentAvailable": true,
    "installmentCount": 8
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Certificate updated successfully",
  "data": {
    "_id": "65f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Professional Certificate",
    "description": "Updated description for professional certificate",
    "icon": "professional-icon",
    "color": "#8B5CF6",
    "isActive": true,
    "sortOrder": 4,
    "metadata": {
      "level": "professional",
      "duration": "15-20 months",
      "prerequisites": [
        "Advanced knowledge",
        "Professional experience",
        "Leadership skills"
      ],
      "learningOutcomes": [
        "Expert-level skills",
        "Industry best practices",
        "Strategic thinking"
      ],
      "targetAudience": ["Professionals", "Managers", "Team Leaders"],
      "industryRecognition": true,
      "accreditation": "Industry Accredited"
    },
    "certificateInfo": {
      "certificateType": "professional",
      "validityPeriod": "5 years",
      "renewalRequired": true,
      "renewalPeriod": "Every 5 years",
      "issuingAuthority": "MEDH",
      "digitalBadge": true,
      "physicalCertificate": true,
      "certificateTemplate": "professional-template"
    },
    "requirements": {
      "minimumCourses": 5,
      "minimumHours": 120,
      "minimumScore": 80,
      "mandatoryCourses": [],
      "electiveCourses": [],
      "assessmentRequired": true,
      "projectRequired": true
    },
    "pricing": {
      "basePrice": 699,
      "currency": "USD",
      "discountAvailable": true,
      "discountPercentage": 25,
      "installmentAvailable": true,
      "installmentCount": 8
    },
    "stats": {
      "totalCourses": 0,
      "totalEnrollments": 0,
      "totalCompletions": 0,
      "totalRevenue": 0,
      "averageCompletionRate": 0
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:45:00.000Z"
  }
}
```

### 6. Delete Certificate Master

**DELETE** `/api/v1/certificate-masters/:id`

Deletes a certificate master (only if no courses are associated).

#### Example Request

```
DELETE /api/v1/certificate-masters/65f8a1b2c3d4e5f6a7b8c9d0
```

#### Response

```json
{
  "success": true,
  "message": "Certificate deleted successfully"
}
```

### 7. Get Certificates by Level

**GET** `/api/v1/certificate-masters/level/:level`

Retrieves certificates filtered by level.

#### Supported Levels

- `beginner`
- `intermediate`
- `advanced`
- `expert`
- `professional`

#### Example Request

```
GET /api/v1/certificate-masters/level/professional
```

#### Response

```json
{
  "success": true,
  "message": "Certificates with professional level fetched successfully",
  "data": [
    {
      "_id": "65f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Professional Certificate",
      "description": "Professional-level certificate for career advancement",
      "icon": "professional-icon",
      "color": "#8B5CF6",
      "isActive": true,
      "sortOrder": 3,
      "metadata": {
        "level": "professional",
        "duration": "12-18 months",
        "prerequisites": ["Advanced knowledge", "Professional experience"],
        "learningOutcomes": ["Expert-level skills", "Industry best practices"],
        "targetAudience": ["Professionals", "Managers"],
        "industryRecognition": true,
        "accreditation": "Industry Accredited"
      },
      "certificateInfo": {
        "certificateType": "professional",
        "validityPeriod": "5 years",
        "renewalRequired": true,
        "renewalPeriod": "Every 5 years",
        "issuingAuthority": "MEDH",
        "digitalBadge": true,
        "physicalCertificate": true,
        "certificateTemplate": "professional-template"
      },
      "requirements": {
        "minimumCourses": 5,
        "minimumHours": 120,
        "minimumScore": 80,
        "mandatoryCourses": [],
        "electiveCourses": [],
        "assessmentRequired": true,
        "projectRequired": true
      },
      "pricing": {
        "basePrice": 599,
        "currency": "USD",
        "discountAvailable": true,
        "discountPercentage": 20,
        "installmentAvailable": true,
        "installmentCount": 6
      },
      "stats": {
        "totalCourses": 0,
        "totalEnrollments": 0,
        "totalCompletions": 0,
        "totalRevenue": 0,
        "averageCompletionRate": 0
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 8. Get Certificates by Type

**GET** `/api/v1/certificate-masters/type/:type`

Retrieves certificates filtered by type.

#### Supported Types

- `diploma`
- `certificate`
- `professional`
- `specialist`
- `master`
- `industry`

#### Example Request

```
GET /api/v1/certificate-masters/type/diploma
```

#### Response

```json
{
  "success": true,
  "message": "diploma certificates fetched successfully",
  "data": [
    {
      "_id": "65f8a1b2c3d4e5f6a7b8c9d1",
      "name": "Executive Diploma",
      "description": "Executive-level diploma for senior leadership",
      "icon": "executive-icon",
      "color": "#DC2626",
      "isActive": true,
      "sortOrder": 6,
      "metadata": {
        "level": "professional",
        "duration": "18-24 months",
        "prerequisites": [
          "Senior management experience",
          "Professional background"
        ],
        "learningOutcomes": [
          "Executive leadership",
          "Strategic management",
          "Business acumen"
        ],
        "targetAudience": ["Executives", "Senior managers", "Business leaders"],
        "industryRecognition": true,
        "accreditation": "Industry Accredited"
      },
      "certificateInfo": {
        "certificateType": "diploma",
        "validityPeriod": "Lifetime",
        "renewalRequired": false,
        "issuingAuthority": "MEDH",
        "digitalBadge": true,
        "physicalCertificate": true,
        "certificateTemplate": "executive-template"
      },
      "requirements": {
        "minimumCourses": 10,
        "minimumHours": 250,
        "minimumScore": 85,
        "mandatoryCourses": [],
        "electiveCourses": [],
        "assessmentRequired": true,
        "projectRequired": true
      },
      "pricing": {
        "basePrice": 2999,
        "currency": "USD",
        "discountAvailable": true,
        "discountPercentage": 25,
        "installmentAvailable": true,
        "installmentCount": 12
      },
      "stats": {
        "totalCourses": 0,
        "totalEnrollments": 0,
        "totalCompletions": 0,
        "totalRevenue": 0,
        "averageCompletionRate": 0
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 9. Get Industry-Recognized Certificates

**GET** `/api/v1/certificate-masters/industry-recognized`

Retrieves all certificates with industry recognition.

#### Example Request

```
GET /api/v1/certificate-masters/industry-recognized
```

#### Response

```json
{
  "success": true,
  "message": "Industry-recognized certificates fetched successfully",
  "data": [
    {
      "_id": "65f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Professional Certificate",
      "description": "Professional-level certificate for career advancement",
      "icon": "professional-icon",
      "color": "#8B5CF6",
      "isActive": true,
      "sortOrder": 3,
      "metadata": {
        "level": "professional",
        "duration": "12-18 months",
        "prerequisites": ["Advanced knowledge", "Professional experience"],
        "learningOutcomes": ["Expert-level skills", "Industry best practices"],
        "targetAudience": ["Professionals", "Managers"],
        "industryRecognition": true,
        "accreditation": "Industry Accredited"
      },
      "certificateInfo": {
        "certificateType": "professional",
        "validityPeriod": "5 years",
        "renewalRequired": true,
        "renewalPeriod": "Every 5 years",
        "issuingAuthority": "MEDH",
        "digitalBadge": true,
        "physicalCertificate": true,
        "certificateTemplate": "professional-template"
      },
      "requirements": {
        "minimumCourses": 5,
        "minimumHours": 120,
        "minimumScore": 80,
        "mandatoryCourses": [],
        "electiveCourses": [],
        "assessmentRequired": true,
        "projectRequired": true
      },
      "pricing": {
        "basePrice": 599,
        "currency": "USD",
        "discountAvailable": true,
        "discountPercentage": 20,
        "installmentAvailable": true,
        "installmentCount": 6
      },
      "stats": {
        "totalCourses": 0,
        "totalEnrollments": 0,
        "totalCompletions": 0,
        "totalRevenue": 0,
        "averageCompletionRate": 0
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 10. Create Default Certificates

**POST** `/api/v1/certificate-masters/create-defaults`

Creates all default certificate types in the system.

#### Example Request

```
POST /api/v1/certificate-masters/create-defaults
```

#### Response

```json
{
  "success": true,
  "message": "Default certificates creation completed",
  "data": {
    "created": [
      {
        "name": "Foundational Certificate",
        "id": "65f8a1b2c3d4e5f6a7b8c9d2"
      },
      {
        "name": "Advanced Certificate",
        "id": "65f8a1b2c3d4e5f6a7b8c9d3"
      }
    ],
    "errors": null
  }
}
```

## Error Responses

### Validation Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Certificate name is required",
      "value": ""
    }
  ]
}
```

### Not Found Error

```json
{
  "success": false,
  "message": "Certificate not found"
}
```

### Duplicate Error

```json
{
  "success": false,
  "message": "Certificate with this name already exists"
}
```

### Delete Constraint Error

```json
{
  "success": false,
  "message": "Cannot delete certificate with associated courses",
  "associatedCoursesCount": 3
}
```

### Server Error

```json
{
  "success": false,
  "message": "Error creating certificate",
  "error": "Database connection failed"
}
```

## Data Models

### Certificate Master Schema

```javascript
{
  name: String,                    // Required, unique, enum
  description: String,             // Optional, max 500 chars
  icon: String,                    // Optional, default "certificate-icon"
  color: String,                   // Optional, hex color, default "#6B7280"
  isActive: Boolean,               // Optional, default true
  sortOrder: Number,               // Optional, default 0
  metadata: {
    level: String,                 // Enum: beginner, intermediate, advanced, expert, professional
    duration: String,              // Optional, max 50 chars
    prerequisites: [String],       // Optional array
    learningOutcomes: [String],    // Optional array
    targetAudience: [String],      // Optional array
    industryRecognition: Boolean,  // Optional, default false
    accreditation: String          // Optional, max 100 chars
  },
  stats: {
    totalCourses: Number,          // Default 0
    totalEnrollments: Number,      // Default 0
    totalCompletions: Number,      // Default 0
    totalRevenue: Number,          // Default 0
    averageCompletionRate: Number  // Default 0, min 0, max 100
  },
  certificateInfo: {
    certificateType: String,       // Required enum
    validityPeriod: String,        // Optional, default "Lifetime"
    renewalRequired: Boolean,      // Optional, default false
    renewalPeriod: String,         // Optional
    issuingAuthority: String,      // Optional, default "MEDH"
    digitalBadge: Boolean,         // Optional, default true
    physicalCertificate: Boolean,  // Optional, default false
    certificateTemplate: String    // Optional
  },
  requirements: {
    minimumCourses: Number,        // Optional, default 1
    minimumHours: Number,          // Optional, default 0
    minimumScore: Number,          // Optional, default 70, min 0, max 100
    mandatoryCourses: [String],    // Optional array
    electiveCourses: [String],     // Optional array
    assessmentRequired: Boolean,   // Optional, default true
    projectRequired: Boolean       // Optional, default false
  },
  pricing: {
    basePrice: Number,             // Optional, default 0
    currency: String,              // Optional, default "USD"
    discountAvailable: Boolean,    // Optional, default false
    discountPercentage: Number,    // Optional, default 0, min 0, max 100
    installmentAvailable: Boolean, // Optional, default false
    installmentCount: Number       // Optional, default 1, min 1, max 12
  },
  createdAt: Date,                 // Auto-generated
  updatedAt: Date                  // Auto-generated
}
```

## Usage Examples

### Frontend Integration

```javascript
// Get all professional certificates
const getProfessionalCertificates = async () => {
  try {
    const response = await fetch(
      "/api/v1/certificate-masters?level=professional",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching certificates:", error);
  }
};

// Create a new certificate
const createCertificate = async (certificateData) => {
  try {
    const response = await fetch("/api/v1/certificate-masters/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(certificateData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating certificate:", error);
  }
};

// Update certificate pricing
const updateCertificatePricing = async (id, pricing) => {
  try {
    const response = await fetch(`/api/v1/certificate-masters/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pricing }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating certificate:", error);
  }
};
```

### Backend Integration

```javascript
// Get certificates by level for course assignment
const getCertificatesForCourse = async (level) => {
  try {
    const certificates = await CertificateMaster.find({
      "metadata.level": level,
      isActive: true,
    }).sort({ sortOrder: 1 });

    return certificates;
  } catch (error) {
    console.error("Error fetching certificates:", error);
    throw error;
  }
};

// Update certificate stats when course is added
const updateCertificateStats = async (certificateId) => {
  try {
    const certificate = await CertificateMaster.findById(certificateId);
    if (certificate) {
      const courseCount = await Course.countDocuments({
        certificate_type: certificateId,
      });
      certificate.stats.totalCourses = courseCount;
      await certificate.save();
    }
  } catch (error) {
    console.error("Error updating certificate stats:", error);
  }
};
```

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Implement role-based access control for admin operations
3. **Input Validation**: Comprehensive validation for all input fields
4. **Data Sanitization**: All user inputs are sanitized and validated
5. **Rate Limiting**: Implement rate limiting for API endpoints
6. **Audit Logging**: Log all certificate modifications for compliance

## Best Practices

1. **Use Pagination**: Always use pagination for large datasets
2. **Filtering**: Use query parameters for efficient data retrieval
3. **Error Handling**: Implement proper error handling and user feedback
4. **Caching**: Cache frequently accessed certificate data
5. **Validation**: Validate all inputs on both client and server side
6. **Documentation**: Keep API documentation updated with changes

## Performance Optimization

1. **Indexing**: Database indexes on frequently queried fields
2. **Projection**: Use field projection to limit data transfer
3. **Aggregation**: Use MongoDB aggregation for complex queries
4. **Caching**: Implement Redis caching for static certificate data
5. **Compression**: Enable response compression for large datasets

## Monitoring and Analytics

1. **API Metrics**: Track API usage and performance metrics
2. **Error Tracking**: Monitor and alert on API errors
3. **Usage Analytics**: Track certificate popularity and trends
4. **Performance Monitoring**: Monitor response times and throughput
5. **Health Checks**: Implement health check endpoints

## Migration and Deployment

1. **Database Migration**: Use MongoDB migrations for schema changes
2. **Backup Strategy**: Regular database backups before deployments
3. **Rollback Plan**: Maintain rollback procedures for failed deployments
4. **Environment Management**: Separate configurations for dev/staging/prod
5. **Testing**: Comprehensive testing before production deployment
