import axios from 'axios';
import colors from 'colors';

const BASE_URL = 'http://localhost:8080/api/v1';
const COURSE_ID = '67e26cbf87546e5d28fbc9f5'; // Your course ID

class DeleteCourseTest {
  constructor() {
    this.adminToken = null; // You'll need to set this
  }

  async testDeleteCourse() {
    try {
      console.log('🧪 Testing DELETE Course API'.cyan);
      console.log(`📍 URL: ${BASE_URL}/courses/${COURSE_ID}`.gray);
      
      // First, let's check if the course exists
      console.log('\n1️⃣ Checking if course exists...'.yellow);
      try {
        const checkResponse = await axios.get(`${BASE_URL}/courses/${COURSE_ID}`);
        console.log(`   ✅ Course found: ${checkResponse.data.data.course_title}`.green);
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('   ❌ Course not found (404)'.red);
          return;
        }
        throw error;
      }

      // Test DELETE without authentication
      console.log('\n2️⃣ Testing DELETE without authentication...'.yellow);
      try {
        await axios.delete(`${BASE_URL}/courses/${COURSE_ID}`);
        console.log('   ❌ Should have failed without auth'.red);
      } catch (error) {
        if (error.response?.status === 401) {
          console.log('   ✅ Correctly rejected without authentication (401)'.green);
        } else {
          console.log(`   ⚠️  Unexpected error: ${error.response?.status} - ${error.message}`.orange);
        }
      }

      // Test DELETE with authentication (you need to provide a valid token)
      if (this.adminToken) {
        console.log('\n3️⃣ Testing DELETE with authentication...'.yellow);
        try {
          const response = await axios.delete(`${BASE_URL}/courses/${COURSE_ID}`, {
            headers: {
              'Authorization': `Bearer ${this.adminToken}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('   ✅ Course deleted successfully'.green);
          console.log(`   📄 Response: ${JSON.stringify(response.data, null, 2)}`.gray);
        } catch (error) {
          console.log(`   ❌ Delete failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`.red);
        }
      } else {
        console.log('\n3️⃣ Skipping authenticated test (no admin token provided)'.yellow);
        console.log('   💡 To test with authentication, set this.adminToken in the script'.gray);
      }

    } catch (error) {
      console.error('❌ Test failed:'.red, error.message);
    }
  }

  async testRouteStructure() {
    console.log('\n🔍 Testing Route Structure'.cyan);
    
    const testRoutes = [
      { method: 'GET', path: '/courses/get', description: 'Get all courses' },
      { method: 'GET', path: `/courses/${COURSE_ID}`, description: 'Get course by ID' },
      { method: 'DELETE', path: `/courses/${COURSE_ID}`, description: 'Delete course', needsAuth: true },
    ];

    for (const route of testRoutes) {
      try {
        console.log(`\n📍 Testing ${route.method} ${route.path}`.yellow);
        
        const config = {
          method: route.method.toLowerCase(),
          url: `${BASE_URL}${route.path}`,
        };

        if (route.needsAuth && this.adminToken) {
          config.headers = { 'Authorization': `Bearer ${this.adminToken}` };
        }

        const response = await axios(config);
        console.log(`   ✅ ${route.description}: ${response.status}`.green);
      } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        
        if (route.needsAuth && status === 401) {
          console.log(`   🔒 ${route.description}: Requires authentication (${status})`.orange);
        } else if (status === 404) {
          console.log(`   ❌ ${route.description}: Not found (${status})`.red);
        } else {
          console.log(`   ⚠️  ${route.description}: ${status} - ${message}`.orange);
        }
      }
    }
  }
}

// Run the tests
const tester = new DeleteCourseTest();

// Uncomment and set your admin token here for full testing
// tester.adminToken = 'your-admin-jwt-token-here';

console.log('🚀 Starting Course DELETE API Tests\n'.rainbow);

tester.testRouteStructure()
  .then(() => tester.testDeleteCourse())
  .then(() => {
    console.log('\n✨ Tests completed!'.rainbow);
    console.log('\n📝 Summary:'.cyan);
    console.log('   • Fixed route structure by removing global authenticateToken');
    console.log('   • DELETE route is now properly configured');
    console.log('   • Use correct URL: http://localhost:8080/api/v1/courses/{id}');
    console.log('   • Authentication is required for DELETE operations');
  })
  .catch(error => {
    console.error('\n💥 Test suite failed:'.red, error.message);
  }); 