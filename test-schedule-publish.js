import axios from 'axios';
import colors from 'colors';

const BASE_URL = 'http://localhost:3000/api';

class SchedulePublishTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async test(description, testFn) {
    try {
      console.log(`\n🧪 Testing: ${description}`.cyan);
      const result = await testFn();
      this.results.tests.push({ description, status: 'PASSED', result });
      this.results.passed++;
      console.log(`   ✅ PASSED`.green);
      return result;
    } catch (error) {
      this.results.tests.push({ description, status: 'FAILED', error: error.message });
      this.results.failed++;
      console.log(`   ❌ FAILED: ${error.message}`.red);
      throw error;
    }
  }

  async makeRequest(method, url, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${url}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      
      if (response.status >= 400) {
        console.log(`   🔍 Debug - Status: ${response.status}`.magenta);
        console.log(`   🔍 Debug - Response:`, JSON.stringify(response.data, null, 2).magenta);
        throw new Error(`${response.status}: ${response.data.message || response.statusText}`);
      }

      return response.data;
    } catch (error) {
      if (error.response) {
        console.log(`   🔍 Debug - Status: ${error.response.status}`.magenta);
        console.log(`   🔍 Debug - Response:`, JSON.stringify(error.response.data, null, 2).magenta);
        throw new Error(`${error.response.status}: ${error.response.data.message || error.response.statusText}`);
      }
      throw error;
    }
  }

  async runTests() {
    console.log('🚀 Starting Schedule Publish API Tests\n'.yellow.bold);

    let testCourseId = null;
    let authToken = null;

    try {
      // Test 1: Get all courses to find a test course
      await this.test('Get all courses', async () => {
        const response = await this.makeRequest('GET', '/courses/get');
        
        if (!response.success || !response.data || !response.data.courses) {
          throw new Error('Invalid response structure');
        }

        const courses = response.data.courses;
        if (courses.length === 0) {
          throw new Error('No courses found for testing');
        }

        testCourseId = courses[0]._id;
        console.log(`   📝 Using course ID: ${testCourseId}`.blue);
        
        return { courseCount: courses.length, testCourseId };
      });

      // Test 2: Schedule a course for publishing (without auth - should fail)
      await this.test('Schedule publish without authentication (should fail)', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const publishDate = tomorrow.toISOString().split('T')[0];

        try {
          await this.makeRequest('POST', `/courses/${testCourseId}/schedule-publish`, {
            publishDate,
            publishTime: '10:00',
            timezone: 'UTC'
          });
          throw new Error('Expected authentication error but request succeeded');
        } catch (error) {
          if (error.message.includes('401') || error.message.includes('403')) {
            return { message: 'Authentication properly required' };
          }
          throw error;
        }
      });

      // Test 3: Get scheduled publish info without auth (should fail)
      await this.test('Get scheduled publish info without authentication (should fail)', async () => {
        try {
          await this.makeRequest('GET', `/courses/${testCourseId}/schedule-publish`);
          throw new Error('Expected authentication error but request succeeded');
        } catch (error) {
          if (error.message.includes('401') || error.message.includes('403')) {
            return { message: 'Authentication properly required' };
          }
          throw error;
        }
      });

      // Test 4: Get all scheduled publishes (public route)
      await this.test('Get all scheduled publishes', async () => {
        const response = await this.makeRequest('GET', '/courses/scheduled-publishes');
        
        if (!response.success || !response.data) {
          throw new Error('Invalid response structure');
        }

        return { 
          totalScheduled: response.data.total,
          courses: response.data.courses.length 
        };
      });

      // Test 5: Test validation - invalid date format
      await this.test('Schedule publish with invalid date format (should fail)', async () => {
        try {
          await this.makeRequest('POST', `/courses/${testCourseId}/schedule-publish`, {
            publishDate: 'invalid-date',
            publishTime: '10:00'
          }, {
            'Authorization': 'Bearer fake-token'
          });
          throw new Error('Expected validation error but request succeeded');
        } catch (error) {
          if (error.message.includes('400') || error.message.includes('Validation')) {
            return { message: 'Validation properly working' };
          }
          throw error;
        }
      });

      // Test 6: Test validation - past date
      await this.test('Schedule publish with past date (should fail)', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const publishDate = yesterday.toISOString().split('T')[0];

        try {
          await this.makeRequest('POST', `/courses/${testCourseId}/schedule-publish`, {
            publishDate,
            publishTime: '10:00'
          }, {
            'Authorization': 'Bearer fake-token'
          });
          throw new Error('Expected validation error but request succeeded');
        } catch (error) {
          if (error.message.includes('400') || error.message.includes('future')) {
            return { message: 'Past date validation working' };
          }
          throw error;
        }
      });

      // Test 7: Test validation - invalid time format
      await this.test('Schedule publish with invalid time format (should fail)', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const publishDate = tomorrow.toISOString().split('T')[0];

        try {
          await this.makeRequest('POST', `/courses/${testCourseId}/schedule-publish`, {
            publishDate,
            publishTime: '25:00' // Invalid hour
          }, {
            'Authorization': 'Bearer fake-token'
          });
          throw new Error('Expected validation error but request succeeded');
        } catch (error) {
          if (error.message.includes('400') || error.message.includes('format')) {
            return { message: 'Time format validation working' };
          }
          throw error;
        }
      });

      // Test 8: Execute scheduled publishes (without auth - should fail)
      await this.test('Execute scheduled publishes without authentication (should fail)', async () => {
        try {
          await this.makeRequest('POST', '/courses/execute-scheduled-publishes');
          throw new Error('Expected authentication error but request succeeded');
        } catch (error) {
          if (error.message.includes('401') || error.message.includes('403')) {
            return { message: 'Authentication properly required' };
          }
          throw error;
        }
      });

    } catch (error) {
      console.log(`\n💥 Test suite failed: ${error.message}`.red);
    }

    // Print summary
    console.log('\n📊 Test Results Summary'.yellow.bold);
    console.log('='.repeat(50).gray);
    console.log(`✅ Passed: ${this.results.passed}`.green);
    console.log(`❌ Failed: ${this.results.failed}`.red);
    console.log(`📝 Total:  ${this.results.passed + this.results.failed}`.blue);

    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed! Schedule Publish API is working correctly.'.green.bold);
    } else {
      console.log('\n⚠️  Some tests failed. Please check the implementation.'.yellow.bold);
    }

    return this.results;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SchedulePublishTester();
  tester.runTests()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export default SchedulePublishTester; 