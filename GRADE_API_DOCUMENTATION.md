# Grade API Documentation

## Overview

The Grade API provides CRUD operations for managing educational grade levels that organize courses by academic progression. The system supports eight predefined grade levels from preschool to university level:

- **Preschool** - Early childhood education (ages 3-5)
- **Grade 1-2** - Primary education (ages 6-8)
- **Grade 3-4** - Primary education (ages 8-10)
- **Grade 5-6** - Middle school (ages 10-12)
- **Grade 7-8** - Middle school (ages 12-14)
- **Grade 9-10** - High school (ages 14-16)
- **Grade 11-12** - High school (ages 16-18)
- **UG - Graduate - Professionals** - University and professional education (ages 18+)

## Base URL

```
/api/v1/grades
```

## Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Create Grade

**POST** `/api/v1/grades/create`

Creates a new grade level.

#### Request Body

```json
{
  "name": "Grade 5-6",
  "description": "Middle school education for children in grades 5-6",
  "icon": "middle-icon",
  "color": "#8B5CF6",
  "isActive": true,
  "sortOrder": 4,
  "metadata": {
    "ageRange": {
      "min": 10,
      "max": 12
    },
    "difficultyLevel": "intermediate",
    "subjectAreas": [
      "Mathematics",
      "Science",
      "Language Arts",
      "Social Studies",
      "Technology"
    ],
    "learningObjectives": [
      "Advanced problem solving",
      "Scientific method",
      "Critical analysis"
    ],
    "prerequisites": ["Grade 3-4 education"]
  },
  "academicInfo": {
    "gradeLevel": "middle",
    "typicalAge": {
      "min": 10,
      "max": 12
    },
    "curriculumStandards": [
      "Common Core Standards",
      "Next Generation Science Standards"
    ],
    "keySkills": [
      "Problem Solving",
      "Critical Analysis",
      "Research",
      "Technology Literacy"
    ]
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Grade created successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Grade 5-6",
    "description": "Middle school education for children in grades 5-6",
    "icon": "middle-icon",
    "color": "#8B5CF6",
    "isActive": true,
    "sortOrder": 4,
    "metadata": {
      "ageRange": {
        "min": 10,
        "max": 12
      },
      "difficultyLevel": "intermediate",
      "subjectAreas": [
        "Mathematics",
        "Science",
        "Language Arts",
        "Social Studies",
        "Technology"
      ],
      "learningObjectives": [
        "Advanced problem solving",
        "Scientific method",
        "Critical analysis"
      ],
      "prerequisites": ["Grade 3-4 education"]
    },
    "academicInfo": {
      "gradeLevel": "middle",
      "typicalAge": {
        "min": 10,
        "max": 12
      },
      "curriculumStandards": [
        "Common Core Standards",
        "Next Generation Science Standards"
      ],
      "keySkills": [
        "Problem Solving",
        "Critical Analysis",
        "Research",
        "Technology Literacy"
      ]
    },
    "stats": {
      "totalCourses": 0,
      "totalEnrollments": 0,
      "totalRevenue": 0,
      "averageCompletionRate": 0
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get All Grades

**GET** `/api/v1/grades`

Retrieves all grades with optional filtering and pagination.

#### Query Parameters

- `isActive` (optional): Filter by active status (`true` or `false`)
- `academicLevel` (optional): Filter by academic level (`preschool`, `primary`, `middle`, `high`, `university`)
- `difficulty` (optional): Filter by difficulty level (`beginner`, `elementary`, `intermediate`, `advanced`, `expert`)
- `sortBy` (optional): Sort field (`name`, `sortOrder`, `createdAt`, `updatedAt`)
- `order` (optional): Sort order (`asc` or `desc`)
- `limit` (optional): Number of items per page (1-100)
- `page` (optional): Page number (default: 1)

#### Example Request

```
GET /api/v1/grades?isActive=true&academicLevel=middle&sortBy=sortOrder&order=asc&limit=10&page=1
```

#### Response

```json
{
  "success": true,
  "message": "Grades fetched successfully",
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Grade 5-6",
      "description": "Middle school education for children in grades 5-6",
      "icon": "middle-icon",
      "color": "#8B5CF6",
      "isActive": true,
      "sortOrder": 4,
      "metadata": {
        "ageRange": {
          "min": 10,
          "max": 12
        },
        "difficultyLevel": "intermediate",
        "subjectAreas": [
          "Mathematics",
          "Science",
          "Language Arts",
          "Social Studies",
          "Technology"
        ],
        "learningObjectives": [
          "Advanced problem solving",
          "Scientific method",
          "Critical analysis"
        ],
        "prerequisites": ["Grade 3-4 education"]
      },
      "academicInfo": {
        "gradeLevel": "middle",
        "typicalAge": {
          "min": 10,
          "max": 12
        },
        "curriculumStandards": [
          "Common Core Standards",
          "Next Generation Science Standards"
        ],
        "keySkills": [
          "Problem Solving",
          "Critical Analysis",
          "Research",
          "Technology Literacy"
        ]
      },
      "stats": {
        "totalCourses": 25,
        "totalEnrollments": 450,
        "totalRevenue": 12500,
        "averageCompletionRate": 85
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 8,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

### 3. Get Grade by ID

**GET** `/api/v1/grades/:id`

Retrieves a specific grade by its ID.

#### Example Request

```
GET /api/v1/grades/64f8a1b2c3d4e5f6a7b8c9d0
```

#### Response

```json
{
  "success": true,
  "message": "Grade fetched successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Grade 5-6",
    "description": "Middle school education for children in grades 5-6",
    "icon": "middle-icon",
    "color": "#8B5CF6",
    "isActive": true,
    "sortOrder": 4,
    "metadata": {
      "ageRange": {
        "min": 10,
        "max": 12
      },
      "difficultyLevel": "intermediate",
      "subjectAreas": [
        "Mathematics",
        "Science",
        "Language Arts",
        "Social Studies",
        "Technology"
      ],
      "learningObjectives": [
        "Advanced problem solving",
        "Scientific method",
        "Critical analysis"
      ],
      "prerequisites": ["Grade 3-4 education"]
    },
    "academicInfo": {
      "gradeLevel": "middle",
      "typicalAge": {
        "min": 10,
        "max": 12
      },
      "curriculumStandards": [
        "Common Core Standards",
        "Next Generation Science Standards"
      ],
      "keySkills": [
        "Problem Solving",
        "Critical Analysis",
        "Research",
        "Technology Literacy"
      ]
    },
    "stats": {
      "totalCourses": 25,
      "totalEnrollments": 450,
      "totalRevenue": 12500,
      "averageCompletionRate": 85
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. Get Grade Details

**GET** `/api/v1/grades/:id/details`

Retrieves a grade with its associated courses.

#### Example Request

```
GET /api/v1/grades/64f8a1b2c3d4e5f6a7b8c9d0/details
```

#### Response

```json
{
  "success": true,
  "message": "Grade details fetched successfully",
  "data": {
    "grade": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Grade 5-6",
      "description": "Middle school education for children in grades 5-6",
      "icon": "middle-icon",
      "color": "#8B5CF6",
      "isActive": true,
      "sortOrder": 4,
      "metadata": {
        "ageRange": {
          "min": 10,
          "max": 12
        },
        "difficultyLevel": "intermediate",
        "subjectAreas": [
          "Mathematics",
          "Science",
          "Language Arts",
          "Social Studies",
          "Technology"
        ],
        "learningObjectives": [
          "Advanced problem solving",
          "Scientific method",
          "Critical analysis"
        ],
        "prerequisites": ["Grade 3-4 education"]
      },
      "academicInfo": {
        "gradeLevel": "middle",
        "typicalAge": {
          "min": 10,
          "max": 12
        },
        "curriculumStandards": [
          "Common Core Standards",
          "Next Generation Science Standards"
        ],
        "keySkills": [
          "Problem Solving",
          "Critical Analysis",
          "Research",
          "Technology Literacy"
        ]
      },
      "stats": {
        "totalCourses": 25,
        "totalEnrollments": 450,
        "totalRevenue": 12500,
        "averageCompletionRate": 85
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "associatedCourses": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "course_title": "Introduction to Algebra",
        "course_category": "Mathematics",
        "course_duration": "12 weeks",
        "prices": [
          {
            "amount": 149.99,
            "currency": "USD"
          }
        ],
        "status": "Published"
      }
    ],
    "stats": {
      "coursesCount": 1
    }
  }
}
```

### 5. Update Grade

**PUT** `/api/v1/grades/:id`

Updates an existing grade.

#### Request Body

```json
{
  "description": "Updated description for middle school grades 5-6",
  "color": "#7C3AED",
  "sortOrder": 5,
  "metadata": {
    "ageRange": {
      "min": 10,
      "max": 13
    },
    "learningObjectives": [
      "Advanced problem solving",
      "Scientific method",
      "Critical analysis",
      "Digital literacy"
    ]
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Grade updated successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Grade 5-6",
    "description": "Updated description for middle school grades 5-6",
    "icon": "middle-icon",
    "color": "#7C3AED",
    "isActive": true,
    "sortOrder": 5,
    "metadata": {
      "ageRange": {
        "min": 10,
        "max": 13
      },
      "difficultyLevel": "intermediate",
      "subjectAreas": [
        "Mathematics",
        "Science",
        "Language Arts",
        "Social Studies",
        "Technology"
      ],
      "learningObjectives": [
        "Advanced problem solving",
        "Scientific method",
        "Critical analysis",
        "Digital literacy"
      ],
      "prerequisites": ["Grade 3-4 education"]
    },
    "academicInfo": {
      "gradeLevel": "middle",
      "typicalAge": {
        "min": 10,
        "max": 12
      },
      "curriculumStandards": [
        "Common Core Standards",
        "Next Generation Science Standards"
      ],
      "keySkills": [
        "Problem Solving",
        "Critical Analysis",
        "Research",
        "Technology Literacy"
      ]
    },
    "stats": {
      "totalCourses": 25,
      "totalEnrollments": 450,
      "totalRevenue": 12500,
      "averageCompletionRate": 85
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:45:00.000Z"
  }
}
```

### 6. Delete Grade

**DELETE** `/api/v1/grades/:id`

Deletes a grade. Cannot delete if associated with courses.

#### Example Request

```
DELETE /api/v1/grades/64f8a1b2c3d4e5f6a7b8c9d0
```

#### Response

```json
{
  "success": true,
  "message": "Grade deleted successfully"
}
```

### 7. Get Grades by Academic Level

**GET** `/api/v1/grades/academic-level/:level`

Retrieves grades filtered by academic level.

#### Valid Academic Levels

- `preschool` - Preschool education
- `primary` - Primary education (Grades 1-4)
- `middle` - Middle school (Grades 5-8)
- `high` - High school (Grades 9-12)
- `university` - University and professional education

#### Example Request

```
GET /api/v1/grades/academic-level/middle
```

#### Response

```json
{
  "success": true,
  "message": "Grades for middle level fetched successfully",
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Grade 5-6",
      "description": "Middle school education for children in grades 5-6",
      "icon": "middle-icon",
      "color": "#8B5CF6",
      "isActive": true,
      "sortOrder": 4,
      "metadata": {
        "ageRange": {
          "min": 10,
          "max": 12
        },
        "difficultyLevel": "intermediate"
      },
      "academicInfo": {
        "gradeLevel": "middle",
        "typicalAge": {
          "min": 10,
          "max": 12
        }
      },
      "stats": {
        "totalCourses": 25,
        "totalEnrollments": 450,
        "totalRevenue": 12500,
        "averageCompletionRate": 85
      }
    },
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
      "name": "Grade 7-8",
      "description": "Middle school education for children in grades 7-8",
      "icon": "middle-icon",
      "color": "#EC4899",
      "isActive": true,
      "sortOrder": 5,
      "metadata": {
        "ageRange": {
          "min": 12,
          "max": 14
        },
        "difficultyLevel": "intermediate"
      },
      "academicInfo": {
        "gradeLevel": "middle",
        "typicalAge": {
          "min": 12,
          "max": 14
        }
      },
      "stats": {
        "totalCourses": 30,
        "totalEnrollments": 520,
        "totalRevenue": 15000,
        "averageCompletionRate": 82
      }
    }
  ]
}
```

### 8. Get Grades by Difficulty Level

**GET** `/api/v1/grades/difficulty/:difficulty`

Retrieves grades filtered by difficulty level.

#### Valid Difficulty Levels

- `beginner` - Preschool level
- `elementary` - Primary education level
- `intermediate` - Middle school level
- `advanced` - High school level
- `expert` - University and professional level

#### Example Request

```
GET /api/v1/grades/difficulty/intermediate
```

#### Response

```json
{
  "success": true,
  "message": "Grades with intermediate difficulty fetched successfully",
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Grade 5-6",
      "description": "Middle school education for children in grades 5-6",
      "icon": "middle-icon",
      "color": "#8B5CF6",
      "isActive": true,
      "sortOrder": 4,
      "metadata": {
        "ageRange": {
          "min": 10,
          "max": 12
        },
        "difficultyLevel": "intermediate"
      },
      "academicInfo": {
        "gradeLevel": "middle",
        "typicalAge": {
          "min": 10,
          "max": 12
        }
      },
      "stats": {
        "totalCourses": 25,
        "totalEnrollments": 450,
        "totalRevenue": 12500,
        "averageCompletionRate": 85
      }
    },
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
      "name": "Grade 7-8",
      "description": "Middle school education for children in grades 7-8",
      "icon": "middle-icon",
      "color": "#EC4899",
      "isActive": true,
      "sortOrder": 5,
      "metadata": {
        "ageRange": {
          "min": 12,
          "max": 14
        },
        "difficultyLevel": "intermediate"
      },
      "academicInfo": {
        "gradeLevel": "middle",
        "typicalAge": {
          "min": 12,
          "max": 14
        }
      },
      "stats": {
        "totalCourses": 30,
        "totalEnrollments": 520,
        "totalRevenue": 15000,
        "averageCompletionRate": 82
      }
    }
  ]
}
```

### 9. Create Default Grades

**POST** `/api/v1/grades/create-defaults`

Creates the eight default grades if they don't exist.

#### Response

```json
{
  "success": true,
  "message": "Default grades creation completed",
  "data": {
    "created": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "name": "Preschool",
        "description": "Early childhood education for children aged 3-5 years",
        "icon": "preschool-icon",
        "color": "#F59E0B",
        "isActive": true,
        "sortOrder": 1,
        "metadata": {
          "ageRange": {
            "min": 3,
            "max": 5
          },
          "difficultyLevel": "beginner",
          "subjectAreas": [
            "Basic Skills",
            "Social Development",
            "Creative Arts"
          ],
          "learningObjectives": [
            "Develop basic motor skills",
            "Learn social interaction",
            "Explore creativity"
          ],
          "prerequisites": []
        },
        "academicInfo": {
          "gradeLevel": "preschool",
          "typicalAge": {
            "min": 3,
            "max": 5
          },
          "curriculumStandards": ["Early Learning Standards"],
          "keySkills": ["Basic Communication", "Motor Skills", "Social Skills"]
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

### Grade Schema

```javascript
{
  name: {
    type: String,
    required: true,
    enum: [
      "Preschool",
      "Grade 1-2",
      "Grade 3-4",
      "Grade 5-6",
      "Grade 7-8",
      "Grade 9-10",
      "Grade 11-12",
      "UG - Graduate - Professionals"
    ]
  },
  description: String,
  icon: String,
  color: String, // Hex color code
  isActive: Boolean,
  sortOrder: Number,
  metadata: {
    ageRange: {
      min: Number,
      max: Number
    },
    difficultyLevel: {
      type: String,
      enum: ["beginner", "elementary", "intermediate", "advanced", "expert"]
    },
    subjectAreas: [String],
    learningObjectives: [String],
    prerequisites: [String]
  },
  stats: {
    totalCourses: Number,
    totalEnrollments: Number,
    totalRevenue: Number,
    averageCompletionRate: Number
  },
  academicInfo: {
    gradeLevel: {
      type: String,
      enum: ["preschool", "primary", "middle", "high", "university"]
    },
    typicalAge: {
      min: Number,
      max: Number
    },
    curriculumStandards: [String],
    keySkills: [String]
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
      "message": "Grade name is required",
      "value": ""
    }
  ]
}
```

### Not Found Error

```json
{
  "success": false,
  "message": "Grade not found"
}
```

### Conflict Error

```json
{
  "success": false,
  "message": "Cannot delete grade with associated courses",
  "associatedCoursesCount": 5
}
```

### Server Error

```json
{
  "success": false,
  "message": "Error creating grade",
  "error": "Database connection failed"
}
```

## Usage Examples

### JavaScript/Node.js

```javascript
const axios = require("axios");

// Create a grade
const createGrade = async () => {
  try {
    const response = await axios.post(
      "/api/v1/grades/create",
      {
        name: "Grade 9-10",
        description: "High school education for students in grades 9-10",
        icon: "high-icon",
        color: "#EF4444",
        sortOrder: 6,
        metadata: {
          ageRange: { min: 14, max: 16 },
          difficultyLevel: "advanced",
          subjectAreas: [
            "Mathematics",
            "Science",
            "Language Arts",
            "Social Studies",
            "Technology",
            "Foreign Languages",
            "Electives",
          ],
          learningObjectives: [
            "College preparatory skills",
            "Advanced research methods",
            "Critical thinking",
          ],
          prerequisites: ["Grade 7-8 education"],
        },
        academicInfo: {
          gradeLevel: "high",
          typicalAge: { min: 14, max: 16 },
          curriculumStandards: [
            "Common Core Standards",
            "Next Generation Science Standards",
          ],
          keySkills: [
            "College Prep Skills",
            "Advanced Research",
            "Critical Thinking",
            "Leadership",
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("Grade created:", response.data);
  } catch (error) {
    console.error("Error:", error.response.data);
  }
};

// Get grades by academic level
const getGradesByLevel = async () => {
  try {
    const response = await axios.get("/api/v1/grades/academic-level/middle", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Middle school grades:", response.data.data);
  } catch (error) {
    console.error("Error:", error.response.data);
  }
};

// Get grades with filtering
const getGrades = async () => {
  try {
    const response = await axios.get(
      "/api/v1/grades?isActive=true&difficulty=intermediate&sortBy=sortOrder",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    console.log("Intermediate grades:", response.data.data);
  } catch (error) {
    console.error("Error:", error.response.data);
  }
};
```

### cURL Examples

```bash
# Create a grade
curl -X POST http://localhost:3000/api/v1/grades/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grade 11-12",
    "description": "High school education for students in grades 11-12",
    "icon": "high-icon",
    "color": "#DC2626",
    "sortOrder": 7,
    "metadata": {
      "ageRange": { "min": 16, "max": 18 },
      "difficultyLevel": "advanced",
      "subjectAreas": ["Advanced Mathematics", "Advanced Science", "Language Arts", "Social Studies", "Technology", "College Prep"],
      "learningObjectives": ["College readiness", "Advanced academic skills", "Career preparation"],
      "prerequisites": ["Grade 9-10 education"]
    },
    "academicInfo": {
      "gradeLevel": "high",
      "typicalAge": { "min": 16, "max": 18 },
      "curriculumStandards": ["Common Core Standards", "Next Generation Science Standards", "College Readiness Standards"],
      "keySkills": ["College Readiness", "Advanced Academic Skills", "Career Preparation", "Independent Learning"]
    }
  }'

# Get all grades
curl -X GET "http://localhost:3000/api/v1/grades?isActive=true&sortBy=sortOrder&order=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get grades by academic level
curl -X GET "http://localhost:3000/api/v1/grades/academic-level/high" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get grades by difficulty
curl -X GET "http://localhost:3000/api/v1/grades/difficulty/advanced" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update a grade
curl -X PUT http://localhost:3000/api/v1/grades/GRADE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "color": "#059669"
  }'

# Delete a grade
curl -X DELETE http://localhost:3000/api/v1/grades/GRADE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Best Practices

1. **Validation**: Always validate input data before sending requests
2. **Error Handling**: Implement proper error handling for all API calls
3. **Pagination**: Use pagination for large datasets
4. **Caching**: Cache frequently accessed grades
5. **Security**: Always include authentication tokens in requests
6. **Rate Limiting**: Respect API rate limits

## Integration Notes

- Grades are designed to work with the existing course system
- The system supports future expansion to include more grade levels
- Stats are automatically updated based on associated courses and enrollments
- All timestamps are in ISO 8601 format
- MongoDB ObjectId is used for all ID fields
- Academic levels and difficulty levels are automatically mapped based on grade names
