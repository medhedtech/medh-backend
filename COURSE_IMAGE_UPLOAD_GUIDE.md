# Course Image Upload Integration Guide

This guide explains how to use the integrated image upload functionality in the course controller and model.

## Overview

The course system now supports multiple ways to upload course images:

1. **Base64 Upload** - Upload images as base64 strings (recommended for frontend integration)
2. **File Upload** - Upload images as multipart form data
3. **Integrated Upload** - Upload images during course creation/update

## API Endpoints

### 1. Course-Specific Image Upload (Base64) - **RECOMMENDED**

**Endpoint:** `POST /api/v1/courses/{courseId}/upload-image`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "base64String": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "fileType": "image"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Course image uploaded and course updated successfully",
  "data": {
    "courseId": "67e14360cd2f46d71bf0587c",
    "imageUrl": "https://your-bucket.s3.amazonaws.com/images/1234567890-abc123.jpg",
    "key": "images/1234567890-abc123.jpg",
    "size": 245760,
    "course": {
      "id": "67e14360cd2f46d71bf0587c",
      "title": "Advanced JavaScript Course",
      "image": "https://your-bucket.s3.amazonaws.com/images/1234567890-abc123.jpg"
    }
  }
}
```

### 2. Standalone Image Upload (Base64) - Legacy Support

**Endpoint:** `POST /api/v1/courses/upload-image`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "base64String": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "fileType": "image"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Course image uploaded successfully",
  "data": {
    "imageUrl": "https://your-bucket.s3.amazonaws.com/images/1234567890-abc123.jpg",
    "key": "images/1234567890-abc123.jpg",
    "size": 245760
  }
}
```

### 3. Course-Specific File Upload - **RECOMMENDED**

**Endpoint:** `POST /api/v1/courses/{courseId}/upload-image-file`

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Form Data:**
```
image: <file>
```

**Response:**
```json
{
  "success": true,
  "message": "Course image uploaded and course updated successfully",
  "data": {
    "courseId": "67e14360cd2f46d71bf0587c",
    "imageUrl": "https://your-bucket.s3.amazonaws.com/images/1234567890-abc123.jpg",
    "key": "images/1234567890-abc123.jpg",
    "size": 245760,
    "course": {
      "id": "67e14360cd2f46d71bf0587c",
      "title": "Advanced JavaScript Course",
      "image": "https://your-bucket.s3.amazonaws.com/images/1234567890-abc123.jpg"
    }
  }
}
```

### 4. Standalone Image Upload (File) - Legacy Support

**Endpoint:** `POST /api/v1/courses/upload-image-file`

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Form Data:**
```
image: <file>
```

**Response:**
```json
{
  "success": true,
  "message": "Course image uploaded successfully",
  "data": {
    "imageUrl": "https://your-bucket.s3.amazonaws.com/images/1234567890-abc123.jpg",
    "key": "images/1234567890-abc123.jpg",
    "size": 245760
  }
}
```

## Course-Specific Upload Examples

### Example: Upload Image for Existing Course

**Using the course-specific endpoint (recommended):**

```bash
# Using cURL with base64
curl -X POST "http://localhost:8080/api/v1/courses/67e14360cd2f46d71bf0587c/upload-image" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "base64String": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "fileType": "image"
  }'

# Using cURL with file upload
curl -X POST "http://localhost:8080/api/v1/courses/67e14360cd2f46d71bf0587c/upload-image-file" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/your/image.jpg"
```

**JavaScript/React Example:**

```javascript
// Upload image for specific course
const uploadCourseImage = async (courseId, imageFile) => {
  try {
    // Convert file to base64
    const base64String = await fileToBase64(imageFile);
    
    const response = await fetch(`/api/v1/courses/${courseId}/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        base64String,
        fileType: 'image'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Course updated with new image:', result.data.course);
      return result.data;
    }
  } catch (error) {
    console.error('Error uploading course image:', error);
  }
};

// Usage
uploadCourseImage('67e14360cd2f46d71bf0587c', selectedImageFile);
```

### 5. Course Creation with Image Upload

**Endpoint:** `POST /api/courses/create`

**Option A: With Base64 Image**
```json
{
  "course_title": "Advanced JavaScript",
  "course_category": "Programming",
  "course_description": {
    "program_overview": "Learn advanced JavaScript concepts",
    "benefits": "Master modern JavaScript development"
  },
  "course_image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "no_of_Sessions": 10,
  "course_duration": "8 weeks",
  "class_type": "Live Courses",
  "category_type": "Paid",
  "is_Certification": "Yes",
  "is_Assignments": "Yes",
  "is_Projects": "Yes",
  "is_Quizes": "Yes"
}
```

**Option B: With File Upload**
```
Content-Type: multipart/form-data

course_title: Advanced JavaScript
course_category: Programming
course_description: {"program_overview": "Learn advanced JavaScript concepts", "benefits": "Master modern JavaScript development"}
course_image: <file>
no_of_Sessions: 10
course_duration: 8 weeks
class_type: Live Courses
category_type: Paid
is_Certification: Yes
is_Assignments: Yes
is_Projects: Yes
is_Quizes: Yes
```

**Option C: With Pre-uploaded Image URL**
```json
{
  "course_title": "Advanced JavaScript",
  "course_category": "Programming",
  "course_description": {
    "program_overview": "Learn advanced JavaScript concepts",
    "benefits": "Master modern JavaScript development"
  },
  "course_image": "https://your-bucket.s3.amazonaws.com/images/1234567890-abc123.jpg",
  "no_of_Sessions": 10,
  "course_duration": "8 weeks",
  "class_type": "Live Courses",
  "category_type": "Paid",
  "is_Certification": "Yes",
  "is_Assignments": "Yes",
  "is_Projects": "Yes",
  "is_Quizes": "Yes"
}
```

### 4. Course Update with Image Upload

**Endpoint:** `PUT /api/courses/:id`

Same options as course creation. The system will handle image upload and update the course record accordingly.

## Frontend Integration Examples

### React/JavaScript Example

```javascript
// Option 1: Upload image first, then create course
const uploadImageAndCreateCourse = async (imageFile, courseData) => {
  try {
    // Convert file to base64
    const base64String = await fileToBase64(imageFile);
    
    // Upload image
    const imageResponse = await fetch('/api/courses/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        base64String,
        fileType: 'image'
      })
    });
    
    const imageResult = await imageResponse.json();
    
    if (imageResult.success) {
      // Create course with uploaded image URL
      const courseResponse = await fetch('/api/courses/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...courseData,
          course_image: imageResult.data.imageUrl
        })
      });
      
      return await courseResponse.json();
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Option 2: Create course with embedded base64 image
const createCourseWithBase64Image = async (imageFile, courseData) => {
  try {
    const base64String = await fileToBase64(imageFile);
    
    const response = await fetch('/api/courses/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...courseData,
        course_image_base64: base64String
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
  }
};

// Helper function to convert file to base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};
```

### cURL Examples

```bash
# Upload image first
curl -X POST "http://localhost:3000/api/courses/upload-image" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "base64String": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "fileType": "image"
  }'

# Create course with base64 image
curl -X POST "http://localhost:3000/api/courses/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "course_title": "Advanced JavaScript",
    "course_category": "Programming",
    "course_description": {
      "program_overview": "Learn advanced JavaScript concepts",
      "benefits": "Master modern JavaScript development"
    },
    "course_image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "no_of_Sessions": 10,
    "course_duration": "8 weeks",
    "class_type": "Live Courses",
    "category_type": "Paid",
    "is_Certification": "Yes",
    "is_Assignments": "Yes",
    "is_Projects": "Yes",
    "is_Quizes": "Yes"
  }'

# Upload image file
curl -X POST "http://localhost:3000/api/courses/upload-image-file" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/your/image.jpg"
```

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- BMP (.bmp)

## File Size Limits

- Maximum file size: 10MB (configurable in environment variables)
- Recommended size: 1-2MB for optimal performance
- Recommended dimensions: 1200x800px or 16:9 aspect ratio

## Error Handling

The system provides detailed error messages for various scenarios:

```json
{
  "success": false,
  "message": "Invalid file type. Only images are allowed",
  "error": "INVALID_FILE_TYPE"
}
```

Common error codes:
- `INVALID_FILE_TYPE`: File is not an image
- `FILE_TOO_LARGE`: File exceeds size limit
- `INVALID_BASE64_FORMAT`: Base64 string is malformed
- `UPLOAD_ERROR`: General upload failure

## Best Practices

1. **Use Base64 for Frontend Integration**: Easier to handle in JavaScript applications
2. **Validate Images Client-Side**: Check file type and size before uploading
3. **Handle Errors Gracefully**: Always check the response status and handle errors
4. **Optimize Images**: Compress images before uploading to reduce file size
5. **Use Appropriate Dimensions**: Maintain consistent aspect ratios for better UI

## Security Considerations

- All upload endpoints require authentication
- File type validation is performed server-side
- File size limits are enforced
- Malicious file detection is implemented
- S3 bucket permissions are properly configured

## Performance Optimization

- Large files (>25MB) use chunked processing
- Smaller files use optimized processing
- Images are automatically optimized during upload
- CDN integration for faster delivery

## Troubleshooting

### Common Issues

1. **"Course image URL is required" error**
   - Ensure either `course_image` or `course_image_base64` is provided
   - Check that the base64 string is properly formatted

2. **"Invalid data URI format" error**
   - Ensure base64 string includes the data URI prefix: `data:image/jpeg;base64,`

3. **Upload timeout**
   - Check file size (should be under 10MB)
   - Ensure stable internet connection
   - Try uploading a smaller image first

4. **Authentication errors**
   - Verify the JWT token is valid and not expired
   - Check that the user has appropriate permissions

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` to see detailed upload logs. 