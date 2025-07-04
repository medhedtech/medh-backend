/**
 * Test script for course image upload functionality
 * This script demonstrates how to use the course image upload features
 */

import fs from 'fs';
import path from 'path';

// Mock base64 image data (1x1 pixel PNG)
const mockBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// Test data for course creation
const testCourseData = {
  course_title: "Test Course with Image Upload",
  course_category: "Programming",
  course_description: {
    program_overview: "This is a test course to demonstrate image upload functionality",
    benefits: "Learn how to integrate image uploads with course creation"
  },
  no_of_Sessions: 5,
  course_duration: "4 weeks",
  class_type: "Live Courses",
  category_type: "Paid",
  is_Certification: "Yes",
  is_Assignments: "Yes",
  is_Projects: "Yes",
  is_Quizes: "Yes"
};

/**
 * Test 1: Upload image using base64 endpoint
 */
async function testBase64ImageUpload(baseUrl, token) {
  console.log('\n=== Test 1: Base64 Image Upload ===');
  
  try {
    const response = await fetch(`${baseUrl}/api/courses/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        base64String: mockBase64Image,
        fileType: 'image'
      })
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Base64 image upload successful');
      return result.data.imageUrl;
    } else {
      console.log('❌ Base64 image upload failed');
      return null;
    }
  } catch (error) {
    console.error('❌ Error in base64 upload:', error.message);
    return null;
  }
}

/**
 * Test 2: Create course with base64 image
 */
async function testCourseCreationWithBase64(baseUrl, token) {
  console.log('\n=== Test 2: Course Creation with Base64 Image ===');
  
  try {
    const courseDataWithImage = {
      ...testCourseData,
      course_title: "Course with Embedded Base64 Image",
      course_image_base64: mockBase64Image
    };

    const response = await fetch(`${baseUrl}/api/courses/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(courseDataWithImage)
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Course creation with base64 image successful');
      return result.data._id;
    } else {
      console.log('❌ Course creation with base64 image failed');
      return null;
    }
  } catch (error) {
    console.error('❌ Error in course creation:', error.message);
    return null;
  }
}

/**
 * Test 3: Create course with pre-uploaded image URL
 */
async function testCourseCreationWithImageUrl(baseUrl, token, imageUrl) {
  console.log('\n=== Test 3: Course Creation with Image URL ===');
  
  if (!imageUrl) {
    console.log('⏭️ Skipping test - no image URL available');
    return null;
  }
  
  try {
    const courseDataWithUrl = {
      ...testCourseData,
      course_title: "Course with Pre-uploaded Image URL",
      course_image: imageUrl
    };

    const response = await fetch(`${baseUrl}/api/courses/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(courseDataWithUrl)
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Course creation with image URL successful');
      return result.data._id;
    } else {
      console.log('❌ Course creation with image URL failed');
      return null;
    }
  } catch (error) {
    console.error('❌ Error in course creation:', error.message);
    return null;
  }
}

/**
 * Test 4: Update course with new image
 */
async function testCourseUpdateWithImage(baseUrl, token, courseId) {
  console.log('\n=== Test 4: Course Update with New Image ===');
  
  if (!courseId) {
    console.log('⏭️ Skipping test - no course ID available');
    return;
  }
  
  try {
    const updateData = {
      course_title: "Updated Course Title",
      course_image_base64: mockBase64Image
    };

    const response = await fetch(`${baseUrl}/api/courses/${courseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Course update with image successful');
    } else {
      console.log('❌ Course update with image failed');
    }
  } catch (error) {
    console.error('❌ Error in course update:', error.message);
  }
}

/**
 * Test 5: Error handling tests
 */
async function testErrorHandling(baseUrl, token) {
  console.log('\n=== Test 5: Error Handling ===');
  
  // Test 5a: Invalid base64 string
  console.log('\n--- Test 5a: Invalid Base64 String ---');
  try {
    const response = await fetch(`${baseUrl}/api/courses/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        base64String: 'invalid-base64-string',
        fileType: 'image'
      })
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.log('✅ Invalid base64 error handling working correctly');
    } else {
      console.log('❌ Invalid base64 should have failed');
    }
  } catch (error) {
    console.error('❌ Error in invalid base64 test:', error.message);
  }

  // Test 5b: Missing required fields
  console.log('\n--- Test 5b: Missing Required Fields ---');
  try {
    const response = await fetch(`${baseUrl}/api/courses/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        course_title: "Incomplete Course"
        // Missing required fields
      })
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.log('✅ Missing fields error handling working correctly');
    } else {
      console.log('❌ Missing fields should have failed');
    }
  } catch (error) {
    console.error('❌ Error in missing fields test:', error.message);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Course Image Upload Tests');
  console.log('=====================================');
  
  // Configuration
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const token = process.env.TEST_TOKEN || 'your-test-token-here';
  
  if (token === 'your-test-token-here') {
    console.log('⚠️  Please set TEST_TOKEN environment variable with a valid JWT token');
    console.log('   Example: TEST_TOKEN=your-jwt-token node test-course-image-upload.js');
    return;
  }
  
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Token: ${token.substring(0, 20)}...`);
  
  // Run tests
  const imageUrl = await testBase64ImageUpload(baseUrl, token);
  const courseId1 = await testCourseCreationWithBase64(baseUrl, token);
  const courseId2 = await testCourseCreationWithImageUrl(baseUrl, token, imageUrl);
  await testCourseUpdateWithImage(baseUrl, token, courseId1);
  await testErrorHandling(baseUrl, token);
  
  console.log('\n🏁 Tests completed');
  console.log('==================');
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`- Image upload: ${imageUrl ? '✅' : '❌'}`);
  console.log(`- Course creation with base64: ${courseId1 ? '✅' : '❌'}`);
  console.log(`- Course creation with URL: ${courseId2 ? '✅' : '❌'}`);
  
  if (courseId1 || courseId2) {
    console.log('\n🗑️  Clean up:');
    if (courseId1) console.log(`   DELETE ${baseUrl}/api/courses/${courseId1}`);
    if (courseId2) console.log(`   DELETE ${baseUrl}/api/courses/${courseId2}`);
  }
}

// Helper function to create a real base64 image from file (if available)
function createBase64FromFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const imageBuffer = fs.readFileSync(filePath);
      const base64String = imageBuffer.toString('base64');
      const mimeType = path.extname(filePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
      return `data:${mimeType};base64,${base64String}`;
    }
  } catch (error) {
    console.log('Could not read image file, using mock image');
  }
  return mockBase64Image;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export {
  testBase64ImageUpload,
  testCourseCreationWithBase64,
  testCourseCreationWithImageUrl,
  testCourseUpdateWithImage,
  testErrorHandling,
  runTests
}; 