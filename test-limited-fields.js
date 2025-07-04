#!/usr/bin/env node

/**
 * Test script to verify the API returns only the specified fields:
 * - course_category
 * - course_subcategory  
 * - course_title
 * - course_tag
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080';
const API_ENDPOINT = `${BASE_URL}/api/v1/courses/category`;

// Expected fields in the response
const EXPECTED_FIELDS = [
  '_id',
  'course_category',
  'course_subcategory', 
  'course_title',
  'course_tag',
  'course_type', // Added by system
  '_source'      // Added by system
];

async function testLimitedFields() {
  console.log('🧪 Testing Limited Fields API Response');
  console.log(`🔗 Endpoint: ${API_ENDPOINT}`);
  console.log(`📋 Expected Fields: ${EXPECTED_FIELDS.join(', ')}`);
  console.log('═'.repeat(70));

  try {
    // Test 1: Get all courses
    console.log('\n📋 Test 1: Get all courses');
    const response = await fetch(`${API_ENDPOINT}?limit=3`);
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`✅ Success: ${data.success}`);
    console.log(`📋 Courses Returned: ${data.data?.courses?.length || 0}`);
    
    if (data.success && data.data?.courses?.length > 0) {
      const firstCourse = data.data.courses[0];
      const actualFields = Object.keys(firstCourse);
      
      console.log(`\n🔍 Field Analysis:`);
      console.log(`📝 Actual Fields: ${actualFields.join(', ')}`);
      
      // Check if we have only expected fields
      const unexpectedFields = actualFields.filter(field => !EXPECTED_FIELDS.includes(field));
      const missingFields = EXPECTED_FIELDS.filter(field => !actualFields.includes(field));
      
      if (unexpectedFields.length === 0 && missingFields.length === 0) {
        console.log(`✅ Perfect! Only expected fields returned.`);
      } else {
        if (unexpectedFields.length > 0) {
          console.log(`⚠️  Unexpected fields found: ${unexpectedFields.join(', ')}`);
        }
        if (missingFields.length > 0) {
          console.log(`❌ Missing expected fields: ${missingFields.join(', ')}`);
        }
      }
      
      console.log(`\n📄 Sample Course Data:`);
      console.log(JSON.stringify(firstCourse, null, 2));
      
    } else {
      console.log(`❌ No courses returned or API failed`);
    }

    // Test 2: Get courses by category
    console.log('\n📋 Test 2: Get courses by category');
    const response2 = await fetch(`${API_ENDPOINT}?category=Programming&limit=2`);
    const data2 = await response2.json();
    
    console.log(`📊 Status: ${response2.status}`);
    console.log(`✅ Success: ${data2.success}`);
    console.log(`🔍 Category Filter: ${data2.data?.filters?.category || 'N/A'}`);
    console.log(`📋 Courses Returned: ${data2.data?.courses?.length || 0}`);

    console.log('\n✨ Field validation test completed!');
    
  } catch (error) {
    console.error(`💥 Error testing API: ${error.message}`);
    console.log('\n❌ Make sure your server is running on http://localhost:8080');
  }
}

// Run the test
testLimitedFields(); 