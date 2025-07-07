# Parent Category API Documentation

## Overview

The Parent Category API provides CRUD operations for managing master categories that organize courses by target audience. The system supports four predefined parent categories:

- **Children & Teens** - Educational content for ages 5-18
- **Professionals** - Career-focused courses for working professionals
- **Homemakers** - Life skills and personal development courses
- **Lifelong Learners** - Diverse learning opportunities for continuous education

## Base URL

```
/api/v1/parent-categories
```

## Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Create Parent Category

**POST** `/api/v1/parent-categories/create`

Creates a new parent category.

#### Request Body

```json
{
  "name": "Children & Teens",
  "description": "Educational content and courses designed specifically for children and teenagers",
  "icon": "child-icon",
  "color": "#10B981",
  "isActive": true,
  "sortOrder": 1,
  "metadata": {
    "targetAudience": "Children and teenagers aged 5-18",
    "ageRange": {
      "min": 5,
      "max": 18
    },
    "skillLevel": "beginner"
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Parent category created successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Children & Teens",
    "description": "Educational content and courses designed specifically for children and teenagers",
    "icon": "child-icon",
    "color": "#10B981",
    "isActive": true,
    "sortOrder": 1,
    "metadata": {
      "targetAudience": "Children and teenagers aged 5-18",
      "ageRange": {
        "min": 5,
        "max": 18
      },
      "skillLevel": "beginner"
    },
    "stats": {
      "totalCourses": 0,
      "totalEnrollments": 0,
      "totalRevenue": 0
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get All Parent Categories

**GET** `/api/v1/parent-categories`

Retrieves all parent categories with optional filtering and pagination.

#### Query Parameters

- `isActive` (optional): Filter by active status (`true` or `false`)
- `sortBy` (optional): Sort field (`name`, `sortOrder`, `createdAt`, `updatedAt`)
- `order` (optional): Sort order (`asc` or `desc`)
- `limit` (optional): Number of items per page (1-100)
- `page` (optional): Page number (default: 1)

#### Example Request

```
GET /api/v1/parent-categories?isActive=true&sortBy=sortOrder&order=asc&limit=10&page=1
```

#### Response

```json
{
  "success": true,
  "message": "Parent categories fetched successfully",
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Children & Teens",
      "description": "Educational content and courses designed specifically for children and teenagers",
      "icon": "child-icon",
      "color": "#10B981",
      "isActive": true,
      "sortOrder": 1,
      "metadata": {
        "targetAudience": "Children and teenagers aged 5-18",
        "ageRange": {
          "min": 5,
          "max": 18
        },
        "skillLevel": "beginner"
      },
      "stats": {
        "totalCourses": 15,
        "totalEnrollments": 250,
        "totalRevenue": 5000
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 4,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

### 3. Get Parent Category by ID

**GET** `/api/v1/parent-categories/:id`

Retrieves a specific parent category by its ID.

#### Example Request

```
GET /api/v1/parent-categories/64f8a1b2c3d4e5f6a7b8c9d0
```

#### Response

```json
{
  "success": true,
  "message": "Parent category fetched successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Children & Teens",
    "description": "Educational content and courses designed specifically for children and teenagers",
    "icon": "child-icon",
    "color": "#10B981",
    "isActive": true,
    "sortOrder": 1,
    "metadata": {
      "targetAudience": "Children and teenagers aged 5-18",
      "ageRange": {
        "min": 5,
        "max": 18
      },
      "skillLevel": "beginner"
    },
    "stats": {
      "totalCourses": 15,
      "totalEnrollments": 250,
      "totalRevenue": 5000
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. Get Parent Category Details

**GET** `/api/v1/parent-categories/:id/details`

Retrieves a parent category with its associated categories and courses.

#### Example Request

```
GET /api/v1/parent-categories/64f8a1b2c3d4e5f6a7b8c9d0/details
```

#### Response

```json
{
  "success": true,
  "message": "Parent category details fetched successfully",
  "data": {
    "parentCategory": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Children & Teens",
      "description": "Educational content and courses designed specifically for children and teenagers",
      "icon": "child-icon",
      "color": "#10B981",
      "isActive": true,
      "sortOrder": 1,
      "metadata": {
        "targetAudience": "Children and teenagers aged 5-18",
        "ageRange": {
          "min": 5,
          "max": 18
        },
        "skillLevel": "beginner"
      },
      "stats": {
        "totalCourses": 15,
        "totalEnrollments": 250,
        "totalRevenue": 5000
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "associatedCategories": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "category_name": "Programming for Kids",
        "category_image": "https://example.com/image.jpg"
      }
    ],
    "associatedCourses": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
        "course_title": "Introduction to Python for Kids",
        "course_category": "Programming",
        "course_duration": "8 weeks",
        "prices": [
          {
            "amount": 99.99,
            "currency": "USD"
          }
        ],
        "status": "Published"
      }
    ],
    "stats": {
      "categoriesCount": 1,
      "coursesCount": 1
    }
  }
}
```

### 5. Update Parent Category

**PUT** `/api/v1/parent-categories/:id`

Updates an existing parent category.

#### Request Body

```json
{
  "description": "Updated description for children and teens courses",
  "color": "#059669",
  "sortOrder": 2,
  "metadata": {
    "targetAudience": "Children and teenagers aged 6-19",
    "ageRange": {
      "min": 6,
      "max": 19
    }
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Parent category updated successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Children & Teens",
    "description": "Updated description for children and teens courses",
    "icon": "child-icon",
    "color": "#059669",
    "isActive": true,
    "sortOrder": 2,
    "metadata": {
      "targetAudience": "Children and teenagers aged 6-19",
      "ageRange": {
        "min": 6,
        "max": 19
      },
      "skillLevel": "beginner"
    },
    "stats": {
      "totalCourses": 15,
      "totalEnrollments": 250,
      "totalRevenue": 5000
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:45:00.000Z"
  }
}
```

### 6. Delete Parent Category

**DELETE** `/api/v1/parent-categories/:id`

Deletes a parent category. Cannot delete if associated with categories or courses.

#### Example Request

```
DELETE /api/v1/parent-categories/64f8a1b2c3d4e5f6a7b8c9d0
```

#### Response

```json
{
  "success": true,
  "message": "Parent category deleted successfully"
}
```

### 7. Create Default Parent Categories

**POST** `/api/v1/parent-categories/create-defaults`

Creates the four default parent categories if they don't exist.

#### Response

```json
{
  "success": true,
  "message": "Default parent categories creation completed",
  "data": {
    "created": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "name": "Children & Teens",
        "description": "Educational content and courses designed specifically for children and teenagers",
        "icon": "child-icon",
        "color": "#10B981",
        "isActive": true,
        "sortOrder": 1,
        "metadata": {
          "targetAudience": "Children and teenagers aged 5-18",
          "ageRange": {
            "min": 5,
            "max": 18
          },
          "skillLevel": "beginner"
        },
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "errors": null
  }
}
```

## Data Models

### Parent Category Schema

```javascript
{
  name: {
    type: String,
    required: true,
    enum: ["Children & Teens", "Professionals", "Homemakers", "Lifelong Learners"]
  },
  description: String,
  icon: String,
  color: String, // Hex color code
  isActive: Boolean,
  sortOrder: Number,
  metadata: {
    targetAudience: String,
    ageRange: {
      min: Number,
      max: Number
    },
    skillLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "all"]
    }
  },
  stats: {
    totalCourses: Number,
    totalEnrollments: Number,
    totalRevenue: Number
  },
  createdAt: Date,
  updatedAt: Date
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
      "message": "Parent category name is required",
      "value": ""
    }
  ]
}
```

### Not Found Error

```json
{
  "success": false,
  "message": "Parent category not found"
}
```

### Conflict Error

```json
{
  "success": false,
  "message": "Cannot delete parent category with associated categories",
  "associatedCategoriesCount": 3
}
```

### Server Error

```json
{
  "success": false,
  "message": "Error creating parent category",
  "error": "Database connection failed"
}
```

## Usage Examples

### JavaScript/Node.js

```javascript
const axios = require("axios");

// Create a parent category
const createParentCategory = async () => {
  try {
    const response = await axios.post(
      "/api/v1/parent-categories/create",
      {
        name: "Professionals",
        description:
          "Career-focused courses and professional development programs",
        icon: "professional-icon",
        color: "#3B82F6",
        sortOrder: 2,
        metadata: {
          targetAudience:
            "Working professionals and career-oriented individuals",
          ageRange: { min: 18, max: 65 },
          skillLevel: "intermediate",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("Parent category created:", response.data);
  } catch (error) {
    console.error("Error:", error.response.data);
  }
};

// Get all active parent categories
const getParentCategories = async () => {
  try {
    const response = await axios.get(
      "/api/v1/parent-categories?isActive=true&sortBy=sortOrder",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    console.log("Parent categories:", response.data.data);
  } catch (error) {
    console.error("Error:", error.response.data);
  }
};
```

### cURL Examples

```bash
# Create a parent category
curl -X POST http://localhost:3000/api/v1/parent-categories/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Homemakers",
    "description": "Life skills, hobbies, and personal development courses for homemakers",
    "icon": "home-icon",
    "color": "#F59E0B",
    "sortOrder": 3,
    "metadata": {
      "targetAudience": "Homemakers and individuals managing households",
      "ageRange": { "min": 18, "max": 80 },
      "skillLevel": "all"
    }
  }'

# Get all parent categories
curl -X GET "http://localhost:3000/api/v1/parent-categories?isActive=true&sortBy=sortOrder&order=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update a parent category
curl -X PUT http://localhost:3000/api/v1/parent-categories/CATEGORY_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "color": "#059669"
  }'

# Delete a parent category
curl -X DELETE http://localhost:3000/api/v1/parent-categories/CATEGORY_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Best Practices

1. **Validation**: Always validate input data before sending requests
2. **Error Handling**: Implement proper error handling for all API calls
3. **Pagination**: Use pagination for large datasets
4. **Caching**: Cache frequently accessed parent categories
5. **Security**: Always include authentication tokens in requests
6. **Rate Limiting**: Respect API rate limits

## Integration Notes

- Parent categories are designed to work with the existing category system
- The system supports future expansion to include more parent categories
- Stats are automatically updated based on associated courses and enrollments
- All timestamps are in ISO 8601 format
- MongoDB ObjectId is used for all ID fields
