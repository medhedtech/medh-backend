# Category Class Type Integration

## Overview

The Category model now includes a `class_type` field to categorize courses as **live**, **blended**, or **free**. This allows for better organization and filtering of courses based on their delivery method.

## Class Types

| Class Type  | Description                                            | Default    |
| ----------- | ------------------------------------------------------ | ---------- |
| **live**    | Live instructor-led courses with real-time interaction | ✅ Default |
| **blended** | Combination of live and self-paced learning            |            |
| **free**    | Free courses with no cost                              |            |

## Schema Changes

### Category Model (`models/category-model.js`)

```javascript
class_type: {
  type: String,
  enum: ["live", "blended", "free"],
  default: "live",
  required: [true, "Class type is required"],
}
```

## API Endpoints

### 1. **Add Category with Class Type**

```bash
POST /api/v1/master-data/categories/add
{
  "item": "Web Development",
  "class_type": "live"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Category added successfully",
  "data": ["Web Development"],
  "categoryDetails": {
    "name": "Web Development",
    "class_type": "live",
    "id": "65f8a1b2c3d4e5f6a7b8c9d0"
  }
}
```

### 2. **Get Categories with Class Types**

```bash
GET /api/v1/master-data/categories-with-types
```

**Response:**

```json
{
  "success": true,
  "message": "Categories with class types fetched successfully",
  "data": [
    {
      "name": "Digital Marketing",
      "class_type": "live"
    },
    {
      "name": "AI and Data Science",
      "class_type": "blended"
    },
    {
      "name": "Vedic Mathematics",
      "class_type": "free"
    }
  ]
}
```

### 3. **Get All Categories (Names Only)**

```bash
GET /api/v1/master-data/categories
```

**Response:**

```json
{
  "success": true,
  "message": "categories fetched successfully",
  "data": ["Digital Marketing", "AI and Data Science", "Vedic Mathematics"]
}
```

## Validation

### **Class Type Validation**

- **Required**: Yes (defaults to "live" if not provided)
- **Valid Values**: `["live", "blended", "free"]`
- **Case Sensitive**: Yes

### **Validation Rules**

```javascript
body("class_type")
  .optional()
  .isIn(["live", "blended", "free"])
  .withMessage("Class type must be one of: live, blended, free");
```

## Usage Examples

### **Create Live Course Category**

```bash
POST /api/v1/master-data/categories/add
{
  "item": "Advanced JavaScript",
  "class_type": "live"
}
```

### **Create Blended Course Category**

```bash
POST /api/v1/master-data/categories/add
{
  "item": "Data Science Fundamentals",
  "class_type": "blended"
}
```

### **Create Free Course Category**

```bash
POST /api/v1/master-data/categories/add
{
  "item": "Introduction to Programming",
  "class_type": "free"
}
```

### **Create Category with Default Class Type**

```bash
POST /api/v1/master-data/categories/add
{
  "item": "Python Basics"
}
# Automatically sets class_type to "live"
```

## Database Structure

### **Category Document Example**

```json
{
  "_id": "65f8a1b2c3d4e5f6a7b8c9d0",
  "category_name": "Web Development",
  "category_image": "",
  "class_type": "live",
  "courses": [],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Implementation Details

### **Controller Changes**

- **Add Operation**: Accepts `class_type` in request body
- **Validation**: Validates class_type against allowed values
- **Response Enhancement**: Returns category details including class_type

### **Model Changes**

- **Schema Update**: Added class_type field with enum validation
- **Default Value**: Sets to "live" if not provided
- **Required Field**: Ensures all categories have a class type

### **Master Data Integration**

- **Sync Methods**: Updated to include class_type information
- **New Endpoint**: `/categories-with-types` for detailed category data
- **Backward Compatibility**: Existing endpoints continue to work

## Benefits

1. **Course Organization** - Better categorization of courses by delivery method
2. **Filtering Capability** - Easy filtering of courses by class type
3. **User Experience** - Clear indication of course format for users
4. **Analytics** - Track performance by course type
5. **Flexibility** - Support for different course delivery models

## Migration Notes

- **Existing Categories**: Will have default class_type of "live"
- **Backward Compatibility**: All existing API endpoints continue to work
- **No Data Loss**: Existing category data is preserved
- **Optional Migration**: Can update existing categories with class types as needed

## Next Steps

1. **Test the Integration** - Verify class type functionality works correctly
2. **Update Frontend** - Display class types in category management
3. **Filter Implementation** - Add filtering by class type in course listings
4. **Analytics Integration** - Track course performance by class type
5. **Bulk Update** - Consider bulk update for existing categories
