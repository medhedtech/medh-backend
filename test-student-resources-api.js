import axios from 'axios';
import colors from 'colors';

// Configuration
const BASE_URL = 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;

// Test data - replace with actual student ID and JWT token
const TEST_STUDENT_ID = '67e14360cd2f46d71bf0587c'; // Replace with actual student ID
const JWT_TOKEN = 'your-jwt-token-here'; // Replace with actual JWT token

/**
 * Test the student resources API
 */
async function testStudentResourcesAPI() {
  console.log('\n🧪 Testing Student Resources API'.bold.cyan);
  console.log('=' .repeat(50).cyan);

  try {
    // Test 1: Get all resources for a student
    console.log('\n📚 Test 1: Get All Resources'.bold.yellow);
    
    const response = await axios.get(
      `${API_BASE}/enrolled/student/${TEST_STUDENT_ID}/resources`,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: 1,
          limit: 10
        }
      }
    );

    console.log('✅ API Response Status:'.green, response.status);
    console.log('✅ Success:'.green, response.data.success);
    console.log('✅ Message:'.green, response.data.message);

    if (response.data.data && response.data.data.resources) {
      console.log('\n📊 Resources Data:'.bold.blue);
      console.log('Total Resources:'.blue, response.data.data.pagination.totalResources);
      console.log('Current Page:'.blue, response.data.data.pagination.currentPage);
      console.log('Total Pages:'.blue, response.data.data.pagination.totalPages);

      // Display statistics
      console.log('\n📈 Statistics:'.bold.magenta);
      console.log('By Type:'.magenta, JSON.stringify(response.data.data.statistics.byType, null, 2));
      console.log('By Source:'.magenta, JSON.stringify(response.data.data.statistics.bySource, null, 2));

      // Display first few resources
      response.data.data.resources.slice(0, 3).forEach((resource, index) => {
        console.log(`\n📄 Resource ${index + 1}:`.bold.white);
        console.log(`   Title: ${resource.title}`.white);
        console.log(`   Type: ${resource.type}`.white);
        console.log(`   Description: ${resource.description}`.white);
        console.log(`   Source: ${resource.source.type} from ${resource.source.courseTitle}`.white);
        if (resource.source.weekTitle) {
          console.log(`   Week: ${resource.source.weekNumber} - ${resource.source.weekTitle}`.white);
        }
        if (resource.source.lessonTitle) {
          console.log(`   Lesson: ${resource.source.lessonTitle} (${resource.source.lessonType})`.white);
        }
        console.log(`   URL: ${resource.url}`.gray);
      });
    }

    // Test 2: Filter by resource type
    console.log('\n📄 Test 2: Filter by PDF Type'.bold.yellow);
    
    const pdfResponse = await axios.get(
      `${API_BASE}/enrolled/student/${TEST_STUDENT_ID}/resources`,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          resourceType: 'pdf',
          page: 1,
          limit: 5
        }
      }
    );

    console.log('✅ PDF Filter Status:'.green, pdfResponse.status);
    console.log('✅ PDF Resources Found:'.green, pdfResponse.data.data?.pagination?.totalResources || 0);

    // Test 3: Search functionality
    console.log('\n🔍 Test 3: Search Resources'.bold.yellow);
    
    const searchResponse = await axios.get(
      `${API_BASE}/enrolled/student/${TEST_STUDENT_ID}/resources`,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          search: 'guide',
          page: 1,
          limit: 5
        }
      }
    );

    console.log('✅ Search Status:'.green, searchResponse.status);
    console.log('✅ Search Results:'.green, searchResponse.data.data?.pagination?.totalResources || 0);

    // Test 4: Sort by title
    console.log('\n📝 Test 4: Sort by Title'.bold.yellow);
    
    const sortResponse = await axios.get(
      `${API_BASE}/enrolled/student/${TEST_STUDENT_ID}/resources`,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          sortBy: 'title',
          sortOrder: 'asc',
          page: 1,
          limit: 3
        }
      }
    );

    console.log('✅ Sort Status:'.green, sortResponse.status);
    if (sortResponse.data.data?.resources?.length) {
      console.log('✅ First sorted resource:'.green, sortResponse.data.data.resources[0].title);
    }

    // Test 5: Filter by specific course
    console.log('\n🎓 Test 5: Filter by Course'.bold.yellow);
    
    // Get a course ID from the first response
    const firstResource = response.data.data?.resources?.[0];
    if (firstResource) {
      const courseFilterResponse = await axios.get(
        `${API_BASE}/enrolled/student/${TEST_STUDENT_ID}/resources`,
        {
          headers: {
            'Authorization': `Bearer ${JWT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          params: {
            courseId: firstResource.source.courseId,
            page: 1,
            limit: 5
          }
        }
      );

      console.log('✅ Course Filter Status:'.green, courseFilterResponse.status);
      console.log('✅ Course Resources:'.green, courseFilterResponse.data.data?.pagination?.totalResources || 0);
    }

    // Test 6: Test with invalid student ID
    console.log('\n❌ Test 6: Test Invalid Student ID'.bold.yellow);
    
    try {
      await axios.get(
        `${API_BASE}/enrolled/student/invalid-id/resources`,
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
  console.log('\n📚 Student Resources API Documentation'.bold.cyan);
  console.log('=' .repeat(60).cyan);
  
  console.log('\n🔗 Endpoint:'.bold.yellow);
  console.log('GET /api/v1/enrolled/student/{student_id}/resources'.white);
  
  console.log('\n🔑 Headers:'.bold.yellow);
  console.log('Authorization: Bearer <jwt_token>'.white);
  console.log('Content-Type: application/json'.white);
  
  console.log('\n📝 Query Parameters:'.bold.yellow);
  console.log('page (optional): Page number (default: 1)'.white);
  console.log('limit (optional): Items per page (default: 20)'.white);
  console.log('resourceType (optional): Filter by type (pdf, document, link, other)'.white);
  console.log('courseId (optional): Filter by specific course'.white);
  console.log('search (optional): Search in title, description, course title'.white);
  console.log('sortBy (optional): Sort field (title, type, course, createdAt)'.white);
  console.log('sortOrder (optional): Sort order (asc, desc)'.white);
  
  console.log('\n📊 Response Format:'.bold.yellow);
  console.log(`{
  "success": true,
  "message": "Resources retrieved successfully",
  "data": {
    "resources": [
      {
        "id": "resource_id",
        "title": "Course Handbook",
        "description": "Complete guide for the course",
        "url": "https://example.com/handbook.pdf",
        "type": "pdf",
        "size_mb": 2.5,
        "source": {
          "type": "lesson",
          "courseId": "course_id",
          "courseTitle": "Digital Marketing",
          "courseThumbnail": "https://example.com/thumb.jpg",
          "instructor": "John Doe",
          "weekTitle": "Introduction",
          "weekNumber": 1,
          "lessonTitle": "Getting Started",
          "lessonType": "text",
          "lessonId": "lesson_1"
        },
        "enrollmentId": "enrollment_id",
        "addedDate": "2024-01-15T00:00:00.000Z"
      }
    ],
    "statistics": {
      "total": 45,
      "byType": {
        "pdf": 20,
        "document": 15,
        "link": 10
      },
      "byCourse": {
        "Digital Marketing": 25,
        "Web Development": 20
      },
      "bySource": {
        "lesson": 30,
        "course_resource": 10,
        "bonus_module": 5
      }
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalResources": 45,
      "resourcesPerPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "filters": {
      "appliedResourceType": null,
      "appliedCourseId": null,
      "appliedSearch": null,
      "sortBy": "createdAt",
      "sortOrder": "desc"
    }
  }
}`.white);

  console.log('\n🚀 Usage Examples:'.bold.yellow);
  console.log(`# Get all resources
curl -X GET \\
  "${API_BASE}/enrolled/student/{student_id}/resources" \\
  -H "Authorization: Bearer <token>"

# Filter by PDF type
curl -X GET \\
  "${API_BASE}/enrolled/student/{student_id}/resources?resourceType=pdf" \\
  -H "Authorization: Bearer <token>"

# Search resources
curl -X GET \\
  "${API_BASE}/enrolled/student/{student_id}/resources?search=guide" \\
  -H "Authorization: Bearer <token>"

# Sort by title
curl -X GET \\
  "${API_BASE}/enrolled/student/{student_id}/resources?sortBy=title&sortOrder=asc" \\
  -H "Authorization: Bearer <token>"`.white);
}

/**
 * Main execution
 */
async function main() {
  console.log('🎯 Student Resources API Test Suite'.bold.rainbow);
  
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
  await testStudentResourcesAPI();
}

// Run the test suite
main().catch(console.error); 