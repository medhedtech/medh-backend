/**
 * Test script for course-specific image upload functionality
 * This script tests the new course-specific upload endpoints
 */

import fetch from 'node-fetch';

// Configuration
const BASE_URL = 'http://localhost:8080/api/v1';
const TEST_COURSE_ID = '67e14360cd2f46d71bf0587c'; // Replace with actual course ID
const AUTH_TOKEN = 'your-auth-token-here'; // Replace with actual token

// Mock base64 image data (1x1 pixel PNG)
const mockBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/**
 * Test course-specific base64 image upload
 */
async function testCourseSpecificBase64Upload() {
  console.log('🧪 Testing course-specific base64 image upload...');
  
  try {
    const response = await fetch(`${BASE_URL}/courses/${TEST_COURSE_ID}/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({
        base64String: mockBase64Image,
        fileType: 'image'
      })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Course-specific base64 upload successful!');
      console.log('📊 Response:', JSON.stringify(result, null, 2));
      return result;
    } else {
      console.log('❌ Course-specific base64 upload failed:');
      console.log('📊 Response:', JSON.stringify(result, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error during course-specific base64 upload:', error.message);
    return null;
  }
}

/**
 * Test legacy standalone base64 image upload
 */
async function testLegacyBase64Upload() {
  console.log('🧪 Testing legacy standalone base64 image upload...');
  
  try {
    const response = await fetch(`${BASE_URL}/courses/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({
        base64String: mockBase64Image,
        fileType: 'image'
      })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Legacy base64 upload successful!');
      console.log('📊 Response:', JSON.stringify(result, null, 2));
      return result;
    } else {
      console.log('❌ Legacy base64 upload failed:');
      console.log('📊 Response:', JSON.stringify(result, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error during legacy base64 upload:', error.message);
    return null;
  }
}

/**
 * Test course retrieval to verify image was updated
 */
async function testCourseRetrieval() {
  console.log('🧪 Testing course retrieval to verify image update...');
  
  try {
    const response = await fetch(`${BASE_URL}/courses/${TEST_COURSE_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Course retrieval successful!');
      console.log('🖼️  Course image URL:', result.data.course_image);
      return result;
    } else {
      console.log('❌ Course retrieval failed:');
      console.log('📊 Response:', JSON.stringify(result, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error during course retrieval:', error.message);
    return null;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Course-Specific Upload Tests');
  console.log('=' .repeat(50));
  
  // Check if configuration is set
  if (AUTH_TOKEN === 'your-auth-token-here') {
    console.log('⚠️  Please update AUTH_TOKEN in the script before running tests');
    return;
  }
  
  if (TEST_COURSE_ID === '67e14360cd2f46d71bf0587c') {
    console.log('⚠️  Please update TEST_COURSE_ID with an actual course ID from your database');
  }
  
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🎯 Test Course ID: ${TEST_COURSE_ID}`);
  console.log('');
  
  // Test 1: Course-specific upload
  const courseSpecificResult = await testCourseSpecificBase64Upload();
  console.log('');
  
  // Test 2: Legacy upload
  const legacyResult = await testLegacyBase64Upload();
  console.log('');
  
  // Test 3: Verify course was updated (only if course-specific upload succeeded)
  if (courseSpecificResult) {
    await testCourseRetrieval();
    console.log('');
  }
  
  // Summary
  console.log('📋 Test Summary:');
  console.log(`   Course-specific upload: ${courseSpecificResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Legacy upload: ${legacyResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  console.log('');
  console.log('🏁 Tests completed!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export {
  testCourseSpecificBase64Upload,
  testLegacyBase64Upload,
  testCourseRetrieval,
  runTests
}; 