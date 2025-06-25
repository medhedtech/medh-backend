# Wishlist API Documentation

The Wishlist API allows students to manage their course wishlist, including adding/removing courses and managing notification preferences.

## Base URL
```
/api/v1/wishlist
```

## Authentication
All endpoints require authentication using JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Get Wishlist
Retrieves the user's wishlist with populated course details.

**Endpoint:** `GET /api/v1/wishlist`

**Response:**
```json
{
  "status": "success",
  "data": {
    "wishlist": {
      "user": "user_id",
      "courses": [
        {
          "course": {
            "_id": "course_id",
            "course_title": "Course Title",
            "course_thumbnail": "thumbnail_url",
            "price": 99.99,
            "course_category": "category",
            "meta": {
              "views": 1000,
              "ratings": {
                "average": 4.5,
                "count": 100
              }
            }
          },
          "addedAt": "2024-01-01T00:00:00.000Z",
          "notificationPreference": {
            "priceDrops": true,
            "startDate": true
          }
        }
      ],
      "lastUpdated": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 2. Add to Wishlist
Adds a course to the user's wishlist.

**Endpoint:** `POST /api/v1/wishlist/add`

**Request Body:**
```json
{
  "courseId": "course_id"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Course added to wishlist",
  "data": {
    "wishlist": {
      // Wishlist object
    }
  }
}
```

### 3. Remove from Wishlist
Removes a course from the user's wishlist.

**Endpoint:** `DELETE /api/v1/wishlist/remove/:courseId`

**Response:**
```json
{
  "status": "success",
  "message": "Course removed from wishlist",
  "data": {
    "wishlist": {
      // Updated wishlist object
    }
  }
}
```

### 4. Update Notification Preferences
Updates notification preferences for a course in the wishlist.

**Endpoint:** `PUT /api/v1/wishlist/notifications`

**Request Body:**
```json
{
  "courseId": "course_id",
  "preferences": {
    "priceDrops": true,
    "startDate": false
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Notification preferences updated",
  "data": {
    "wishlist": {
      // Updated wishlist object
    }
  }
}
```

## Error Responses

### 1. Course Not Found
```json
{
  "status": "error",
  "message": "Course not found"
}
```

### 2. Course Already in Wishlist
```json
{
  "status": "error",
  "message": "Course already in wishlist"
}
```

### 3. Wishlist Not Found
```json
{
  "status": "error",
  "message": "Wishlist not found"
}
```

### 4. Course Not in Wishlist
```json
{
  "status": "error",
  "message": "Course not found in wishlist"
}
```

### 5. Authentication Error
```json
{
  "status": "error",
  "message": "Please authenticate"
}
```

## Caching
- Wishlist data is cached for 1 hour
- Cache is automatically invalidated when:
  - Adding a course
  - Removing a course
  - Updating notification preferences

## Rate Limiting
The Wishlist API follows the global rate limiting rules:
- Window: 15 minutes
- Max Requests: 100 per window 