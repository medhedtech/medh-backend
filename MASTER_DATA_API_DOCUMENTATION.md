# Master Data API Documentation

## Overview

The Master Data API provides a unified system for managing all master data types in the MEDH platform. This system consolidates parent categories, categories, certificates, grades, and course durations into a single, simple model with name arrays for each type.

## Base URL

```
/api/v1/master-data
```

## Authentication

All endpoints require JWT authentication. Include the authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Master Data Types

The system supports the following master data types:

1. **parentCategories** - Parent category names
2. **categories** - Category names (synced from existing Category model)
3. **certificates** - Certificate type names
4. **grades** - Grade level names
5. **courseDurations** - Course duration formats

### Categories Integration

Categories are automatically synced from the existing `Category` model in the database. When you:
- **GET** categories: Returns all category names from the Category model
- **POST** categories: Creates a new category in the Category model
- **DELETE** categories: Removes a category from the Category model (only if no courses are associated)
- **PUT** categories: Updates the categories array in master data (synced from Category model)

## API Endpoints

### 1. Get All Master Data

**GET** `/api/v1/master-data`

Retrieves all master data types in a single response.

#### Response

```json
{
  "success": true,
  "message": "Master data fetched successfully",
  "data": {
    "_id": "65f8a1b2c3d4e5f6a7b8c9d0",
    "parentCategories": [
      "Children & Teens",
      "Professionals",
      "Homemakers",
      "Lifelong Learners"
    ],
    "categories": [
      "Digital Marketing",
      "AI and Data Science",
      "Vedic Mathematics",
      "Personality Development"
    ],
    "certificates": [
      "Executive Diploma",
      "Professional Grad Diploma",
      "Foundational Certificate",
      "Advanced Certificate",
      "Professional Certificate",
      "Specialist Certificate",
      "Master Certificate",
      "Industry Certificate"
    ],
    "grades": [
      "Preschool",
      "Grade 1-2",
      "Grade 3-4",
      "Grade 5-6",
      "Grade 7-8",
      "Grade 9-10",
      "Grade 11-12",
      "UG - Graduate - Professionals"
    ],
    "courseDurations": [
      "2 hours 0 minutes",
      "4 months 16 weeks",
      "6 months 24 weeks",
      "8 months 32 weeks",
      "9 months 36 weeks",
      "12 months 48 weeks",
      "18 months 72 weeks",
      "24 months 96 weeks"
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get Master Data Statistics

**GET** `/api/v1/master-data/stats`

Retrieves statistics about all master data types.

#### Response

```json
{
  "success": true,
  "message": "Master data statistics fetched successfully",
  "data": {
    "parentCategories": 4,
    "categories": 4,
    "certificates": 8,
    "grades": 8,
    "courseDurations": 8,
    "total": 32
  }
}
```

### 3. Get Specific Master Type

**GET** `/api/v1/master-data/:type`

Retrieves a specific master data type.

#### Parameters

| Parameter | Type   | Description      | Example            |
| --------- | ------ | ---------------- | ------------------ |
| `type`    | string | Master data type | `parentCategories` |

#### Supported Types

- `parentCategories`
- `categories`
- `certificates`
- `grades`
- `courseDurations`

#### Example Request

```
GET /api/v1/master-data/certificates
```

#### Response

```json
{
  "success": true,
  "message": "certificates fetched successfully",
  "data": [
    "Executive Diploma",
    "Professional Grad Diploma",
    "Foundational Certificate",
    "Advanced Certificate",
    "Professional Certificate",
    "Specialist Certificate",
    "Master Certificate",
    "Industry Certificate"
  ]
}
```

### 4. Add Item to Master Type

**POST** `/api/v1/master-data/:type/add`

Adds a new item to a specific master data type.

#### Parameters

| Parameter | Type   | Description      | Example      |
| --------- | ------ | ---------------- | ------------ |
| `type`    | string | Master data type | `categories` |

#### Request Body

```json
{
  "item": "New Category Name"
}
```

#### Example Request

```
POST /api/v1/master-data/categories/add
Content-Type: application/json

{
  "item": "Web Development"
}
```

#### Response

```json
{
  "success": true,
  "message": "Item added to categories successfully",
  "data": [
    "Digital Marketing",
    "AI and Data Science",
    "Vedic Mathematics",
    "Personality Development",
    "Web Development"
  ]
}
```

### 5. Remove Item from Master Type

**DELETE** `/api/v1/master-data/:type/:item`

Removes an item from a specific master data type.

#### Parameters

| Parameter | Type   | Description         | Example           |
| --------- | ------ | ------------------- | ----------------- |
| `type`    | string | Master data type    | `categories`      |
| `item`    | string | Item name to remove | `Web Development` |

#### Example Request

```
DELETE /api/v1/master-data/categories/Web%20Development
```

#### Response

```json
{
  "success": true,
  "message": "Item removed from categories successfully",
  "data": [
    "Digital Marketing",
    "AI and Data Science",
    "Vedic Mathematics",
    "Personality Development"
  ]
}
```

### 6. Update Master Type

**PUT** `/api/v1/master-data/:type`

Updates all items in a specific master data type.

#### Parameters

| Parameter | Type   | Description      | Example      |
| --------- | ------ | ---------------- | ------------ |
| `type`    | string | Master data type | `categories` |

#### Request Body

```json
{
  "items": [
    "Digital Marketing",
    "AI and Data Science",
    "Vedic Mathematics",
    "Personality Development",
    "Web Development",
    "Mobile Development"
  ]
}
```

#### Example Request

```
PUT /api/v1/master-data/categories
Content-Type: application/json

{
  "items": [
    "Digital Marketing",
    "AI and Data Science",
    "Vedic Mathematics",
    "Personality Development",
    "Web Development",
    "Mobile Development"
  ]
}
```

#### Response

```json
{
  "success": true,
  "message": "categories updated successfully",
  "data": [
    "Digital Marketing",
    "AI and Data Science",
    "Vedic Mathematics",
    "Personality Development",
    "Web Development",
    "Mobile Development"
  ]
}
```

### 7. Initialize Master Data

**POST** `/api/v1/master-data/initialize`

Initializes master data with default values if none exists.

#### Example Request

```
POST /api/v1/master-data/initialize
```

#### Response

```json
{
  "success": true,
  "message": "Master data initialized successfully",
  "data": {
    "_id": "65f8a1b2c3d4e5f6a7b8c9d0",
    "parentCategories": [
      "Children & Teens",
      "Professionals",
      "Homemakers",
      "Lifelong Learners"
    ],
    "categories": [],
    "certificates": [
      "Executive Diploma",
      "Professional Grad Diploma",
      "Foundational Certificate",
      "Advanced Certificate",
      "Professional Certificate",
      "Specialist Certificate",
      "Master Certificate",
      "Industry Certificate"
    ],
    "grades": [
      "Preschool",
      "Grade 1-2",
      "Grade 3-4",
      "Grade 5-6",
      "Grade 7-8",
      "Grade 9-10",
      "Grade 11-12",
      "UG - Graduate - Professionals"
    ],
    "courseDurations": [
      "2 hours 0 minutes",
      "4 months 16 weeks",
      "6 months 24 weeks",
      "8 months 32 weeks",
      "9 months 36 weeks",
      "12 months 48 weeks",
      "18 months 72 weeks",
      "24 months 96 weeks"
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 8. Reset Master Data

**POST** `/api/v1/master-data/reset`

Resets all master data to default values.

#### Example Request

```
POST /api/v1/master-data/reset
```

#### Response

```json
{
  "success": true,
  "message": "Master data reset to defaults successfully",
  "data": {
    "_id": "65f8a1b2c3d4e5f6a7b8c9d1",
    "parentCategories": [
      "Children & Teens",
      "Professionals",
      "Homemakers",
      "Lifelong Learners"
    ],
    "categories": [],
    "certificates": [
      "Executive Diploma",
      "Professional Grad Diploma",
      "Foundational Certificate",
      "Advanced Certificate",
      "Professional Certificate",
      "Specialist Certificate",
      "Master Certificate",
      "Industry Certificate"
    ],
    "grades": [
      "Preschool",
      "Grade 1-2",
      "Grade 3-4",
      "Grade 5-6",
      "Grade 7-8",
      "Grade 9-10",
      "Grade 11-12",
      "UG - Graduate - Professionals"
    ],
    "courseDurations": [
      "2 hours 0 minutes",
      "4 months 16 weeks",
      "6 months 24 weeks",
      "8 months 32 weeks",
      "9 months 36 weeks",
      "12 months 48 weeks",
      "18 months 72 weeks",
      "24 months 96 weeks"
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
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
      "field": "type",
      "message": "Master type must be one of: parentCategories, categories, certificates, grades, courseDurations",
      "value": "invalid-type"
    }
  ]
}
```

### Not Found Error

```json
{
  "success": false,
  "message": "Master data not found"
}
```

### Invalid Item Error

```json
{
  "success": false,
  "message": "Item must be a non-empty string"
}
```

### Server Error

```json
{
  "success": false,
  "message": "Error fetching master data",
  "error": "Database connection failed"
}
```

## Data Model

### Master Data Schema

```javascript
{
  parentCategories: [String],    // Array of parent category names
  categories: [String],          // Array of category names
  certificates: [String],        // Array of certificate type names
  grades: [String],              // Array of grade level names
  courseDurations: [String],     // Array of course duration formats
  createdAt: Date,               // Auto-generated
  updatedAt: Date                // Auto-generated
}
```

### Default Values

#### Parent Categories

- "Children & Teens"
- "Professionals"
- "Homemakers"
- "Lifelong Learners"

#### Certificates

- "Executive Diploma"
- "Professional Grad Diploma"
- "Foundational Certificate"
- "Advanced Certificate"
- "Professional Certificate"
- "Specialist Certificate"
- "Master Certificate"
- "Industry Certificate"

#### Grades

- "Preschool"
- "Grade 1-2"
- "Grade 3-4"
- "Grade 5-6"
- "Grade 7-8"
- "Grade 9-10"
- "Grade 11-12"
- "UG - Graduate - Professionals"

#### Course Durations

- "2 hours 0 minutes"
- "4 months 16 weeks"
- "6 months 24 weeks"
- "8 months 32 weeks"
- "9 months 36 weeks"
- "12 months 48 weeks"
- "18 months 72 weeks"
- "24 months 96 weeks"

## Usage Examples

### Frontend Integration

```javascript
// Get all master data
const getAllMasterData = async () => {
  try {
    const response = await fetch("/api/v1/master-data", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching master data:", error);
  }
};

// Get specific master type
const getMasterType = async (type) => {
  try {
    const response = await fetch(`/api/v1/master-data/${type}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
  }
};

// Add item to master type
const addToMasterType = async (type, item) => {
  try {
    const response = await fetch(`/api/v1/master-data/${type}/add`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ item }),
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Error adding item to ${type}:`, error);
  }
};

// Update master type
const updateMasterType = async (type, items) => {
  try {
    const response = await fetch(`/api/v1/master-data/${type}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Error updating ${type}:`, error);
  }
};

// Remove item from master type
const removeFromMasterType = async (type, item) => {
  try {
    const response = await fetch(
      `/api/v1/master-data/${type}/${encodeURIComponent(item)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Error removing item from ${type}:`, error);
  }
};
```

### Backend Integration

```javascript
// Get master data for dropdowns
const getMasterDataForDropdowns = async () => {
  try {
    const masterData = await MasterData.getAllMasterData();
    return {
      parentCategories: masterData.parentCategories,
      categories: masterData.categories,
      certificates: masterData.certificates,
      grades: masterData.grades,
      courseDurations: masterData.courseDurations,
    };
  } catch (error) {
    console.error("Error fetching master data:", error);
    throw error;
  }
};

// Validate item exists in master type
const validateMasterItem = async (type, item) => {
  try {
    const masterData = await MasterData.getMasterType(type);
    return masterData && masterData[type].includes(item);
  } catch (error) {
    console.error(`Error validating ${type} item:`, error);
    return false;
  }
};

// Add new category
const addNewCategory = async (categoryName) => {
  try {
    const masterData = await MasterData.addToMasterType(
      "categories",
      categoryName,
    );
    return masterData.categories;
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
};
```

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Implement role-based access control for admin operations
3. **Input Validation**: Comprehensive validation for all input fields
4. **Data Sanitization**: All user inputs are sanitized and validated
5. **Rate Limiting**: Implement rate limiting for API endpoints
6. **Audit Logging**: Log all master data modifications for compliance

## Best Practices

1. **Use Specific Endpoints**: Use specific type endpoints for better performance
2. **Bulk Updates**: Use PUT endpoint for updating multiple items at once
3. **Error Handling**: Implement proper error handling and user feedback
4. **Caching**: Cache frequently accessed master data
5. **Validation**: Validate all inputs on both client and server side
6. **Documentation**: Keep API documentation updated with changes

## Performance Optimization

1. **Indexing**: Database indexes on frequently queried fields
2. **Projection**: Use field projection to limit data transfer
3. **Caching**: Implement Redis caching for static master data
4. **Compression**: Enable response compression for large datasets

## Monitoring and Analytics

1. **API Metrics**: Track API usage and performance metrics
2. **Error Tracking**: Monitor and alert on API errors
3. **Usage Analytics**: Track master data usage patterns
4. **Performance Monitoring**: Monitor response times and throughput
5. **Health Checks**: Implement health check endpoints

## Migration and Deployment

1. **Database Migration**: Use MongoDB migrations for schema changes
2. **Backup Strategy**: Regular database backups before deployments
3. **Rollback Plan**: Maintain rollback procedures for failed deployments
4. **Environment Management**: Separate configurations for dev/staging/prod
5. **Testing**: Comprehensive testing before production deployment
