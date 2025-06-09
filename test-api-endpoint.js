#!/usr/bin/env node

/**
 * Quick test for the courses category API endpoint
 * Tests the specific URL format: http://localhost:8080/api/v1/courses/category
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080';
const API_ENDPOINT = `${BASE_URL}/api/v1/courses/category`;

async function testAPI() {
  console.log('🚀 Testing Courses Category API');
  console.log(`🔗 Endpoint: ${API_ENDPOINT}`);
  console.log('═'.repeat(60));

  try {
    console.log('\n📋 Test 1: Get all courses (no parameters)');
    const response1 = await fetch(API_ENDPOINT);
    const data1 = await response1.json();
    
    console.log(`📊 Status: ${response1.status}`);
    console.log(`✅ Success: ${data1.success}`);
    console.log(`📚 Total Courses: ${data1.data?.pagination?.totalCourses || 'N/A'}`);
    console.log(`📋 Courses Returned: ${data1.data?.courses?.length || 0}`);
    
    if (data1.data?.courses?.length > 0) {
      console.log(`📝 Sample Course Fields:`, Object.keys(data1.data.courses[0]));
    }
    
    if (data1.data?.sources) {
      console.log(`🏛️ Sources: Legacy(${data1.data.sources.legacy_model}), New(${data1.data.sources.new_model})`);
    }

    console.log('\n📋 Test 2: Get courses with pagination');
    const response2 = await fetch(`${API_ENDPOINT}?page=1&limit=5`);
    const data2 = await response2.json();
    
    console.log(`📊 Status: ${response2.status}`);
    console.log(`✅ Success: ${data2.success}`);
    console.log(`📄 Page: ${data2.data?.pagination?.currentPage || 'N/A'}`);
    console.log(`📋 Courses Returned: ${data2.data?.courses?.length || 0}`);

    console.log('\n📋 Test 3: Get courses by category (if any exist)');
    const response3 = await fetch(`${API_ENDPOINT}?category=Programming&limit=3`);
    const data3 = await response3.json();
    
    console.log(`📊 Status: ${response3.status}`);
    console.log(`✅ Success: ${data3.success}`);
    console.log(`🔍 Category Filter: ${data3.data?.filters?.category || 'N/A'}`);
    console.log(`📋 Courses Returned: ${data3.data?.courses?.length || 0}`);

    console.log('\n✨ All tests completed successfully!');
    
  } catch (error) {
    console.error(`💥 Error testing API: ${error.message}`);
    console.log('\n❌ Make sure your server is running on http://localhost:8080');
  }
}

// Run the test
testAPI(); 