import axios from 'axios';
import colors from 'colors';

// Configuration
const BASE_URL = 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;

// Test data - replace with actual student ID and JWT token
const TEST_STUDENT_ID = '67e14360cd2f46d71bf0587c'; // Replace with actual student ID
const JWT_TOKEN = 'your-jwt-token-here'; // Replace with actual JWT token

/**
 * Test the completed courses API
 */
async function testCompletedCoursesAPI() {
  console.log('\n🧪 Testing Completed Courses API'.bold.cyan);
  console.log('=' .repeat(50).cyan);

  try {
    // Test 1: Get completed courses for a student
    console.log('\n📚 Test 1: Get Completed Courses'.bold.yellow);
    
    const response = await axios.get(
      `${API_BASE}/enrolled/student/${TEST_STUDENT_ID}/completed`,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: 1,
          limit: 5
        }
      }
    );

    console.log('✅ API Response Status:'.green, response.status);
    console.log('✅ Success:'.green, response.data.success);
    console.log('✅ Message:'.green, response.data.message);

    if (response.data.data && response.data.data.courses) {
      console.log('\n📊 Completed Courses Data:'.bold.blue);
      console.log('Total Courses:'.blue, response.data.data.pagination.totalCourses);
      console.log('Current Page:'.blue, response.data.data.pagination.currentPage);
      console.log('Total Pages:'.blue, response.data.data.pagination.totalPages);

      // Display each completed course
      response.data.data.courses.forEach((course, index) => {
        console.log(`\n📖 Course ${index + 1}:`.bold.magenta);
        console.log(`   Title: ${course.title}`.white);
        console.log(`   Instructor: ${course.instructor}`.white);
        console.log(`   Completed: ${new Date(course.completedDate).toLocaleDateString()}`.white);
        console.log(`   Duration: ${course.duration}`.white);
        console.log(`   Key Topics: ${course.keyTopics.join(', ')}`.white);
        console.log(`   Rating: ${course.rating}/5.0`.white);
        console.log(`   Status: ${course.status}`.white);
        console.log(`   Actions: Review: ${course.actions.review ? 'Available' : 'Not Available'}, Certificate: ${course.actions.certificate ? 'Available' : 'Not Available'}`.white);
      });
    }

    // Test 2: Test pagination
    console.log('\n📄 Test 2: Test Pagination'.bold.yellow);
    
    const paginationResponse = await axios.get(
      `${API_BASE}/enrolled/student/${TEST_STUDENT_ID}/completed`,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: 2,
          limit: 3
        }
      }
    );

    console.log('✅ Pagination Test Status:'.green, paginationResponse.status);
    console.log('✅ Page 2 Courses:'.green, paginationResponse.data.data?.courses?.length || 0);

    // Test 3: Test with invalid student ID
    console.log('\n❌ Test 3: Test Invalid Student ID'.bold.yellow);
    
    try {
      await axios.get(
        `${API_BASE}/enrolled/student/invalid-id/completed`,
        {
          headers: {
            'Authorization': `Bearer ${JWT_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Invalid ID Test Passed:'.green, 'Correctly returned 400 error');
      } else {
        console.log('❌ Invalid ID Test Failed:'.red, error.message);
      }
    }

    console.log('\n🎉 All tests completed successfully!'.bold.green);

  } catch (error) {
    console.error('\n❌ Test Failed:'.bold.red);
    
    if (error.response) {
      console.error('Status:'.red, error.response.status);
      console.error('Error:'.red, error.response.data?.message || error.response.data);
    } else if (error.request) {
      console.error('Network Error:'.red, 'No response received');
      console.error('Make sure the server is running on'.red, BASE_URL);
    } else {
      console.error('Error:'.red, error.message);
    }
  }
}

/**
 * Display API documentation
 */
function displayAPIDocumentation() {
  console.log('\n📚 Completed Courses API Documentation'.bold.cyan);
  console.log('=' .repeat(60).cyan);
  
  console.log('\n🔗 Endpoint:'.bold.yellow);
  console.log('GET /api/v1/enrolled/student/{student_id}/completed'.white);
  
  console.log('\n🔑 Headers:'.bold.yellow);
  console.log('Authorization: Bearer <jwt_token>'.white);
  console.log('Content-Type: application/json'.white);
  
  console.log('\n📝 Query Parameters:'.bold.yellow);
  console.log('page (optional): Page number (default: 1)'.white);
  console.log('limit (optional): Items per page (default: 10)'.white);
  
  console.log('\n📊 Response Format:'.bold.yellow);
  console.log(`{
  "success": true,
  "message": "Completed courses retrieved successfully",
  "data": {
    "courses": [
      {
        "courseId": "course_id",
        "title": "Digital Marketing Fundamentals",
        "instructor": "Sarah Johnson",
        "completedDate": "2024-01-15T00:00:00.000Z",
        "duration": "8 weeks",
        "keyTopics": ["SEO", "Social Media", "Analytics"],
        "rating": 4.8,
        "status": "Completed",
        "actions": {
          "review": true,
          "certificate": true
        },
        "enrollmentId": "enrollment_id",
        "progress": 100
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalCourses": 15,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}`.white);

  console.log('\n🚀 Usage Example:'.bold.yellow);
  console.log(`curl -X GET \\
  "${API_BASE}/enrolled/student/{student_id}/completed?page=1&limit=5" \\
  -H "Authorization: Bearer <your_jwt_token>" \\
  -H "Content-Type: application/json"`.white);
}

/**
 * Main execution
 */
async function main() {
  console.log('🎯 Completed Courses API Test Suite'.bold.rainbow);
  
  // Display documentation first
  displayAPIDocumentation();
  
  // Check if test credentials are provided
  if (JWT_TOKEN === 'your-jwt-token-here' || TEST_STUDENT_ID === '67e14360cd2f46d71bf0587c') {
    console.log('\n⚠️  Warning:'.bold.yellow);
    console.log('Please update the JWT_TOKEN and TEST_STUDENT_ID variables in this file with actual values before running tests.'.yellow);
    console.log('\nTo get a JWT token:'.yellow);
    console.log('1. Login via the auth API'.yellow);
    console.log('2. Copy the token from the response'.yellow);
    console.log('3. Replace JWT_TOKEN variable in this file'.yellow);
    console.log('\nTo get a student ID:'.yellow);
    console.log('1. Use the user management API to get student IDs'.yellow);
    console.log('2. Replace TEST_STUDENT_ID variable in this file'.yellow);
    return;
  }
  
  // Run the tests
  await testCompletedCoursesAPI();
}

// Run the test suite
main().catch(console.error); 