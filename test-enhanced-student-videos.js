// Test script for the enhanced getRecordedLessonsForStudent function
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Test configuration
const TEST_CONFIG = {
  // Replace with actual test data
  studentId: '60f7b3b3b3b3b3b3b3b3b3b3', // Replace with real student ID
  adminToken: 'YOUR_ADMIN_JWT_TOKEN',      // Replace with real admin token
  studentToken: 'YOUR_STUDENT_JWT_TOKEN'   // Replace with real student token
};

/**
 * Test the enhanced recorded lessons endpoint
 */
async function testGetRecordedLessonsForStudent() {
  console.log('🧪 Testing Enhanced Student Recorded Videos API\n');

  try {
    // Test 1: Admin accessing student's recorded lessons
    console.log('📋 Test 1: Admin accessing student recorded lessons...');
    const adminResponse = await axios.get(
      `${BASE_URL}/api/v1/batches/students/${TEST_CONFIG.studentId}/recorded-lessons`,
      {
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Admin Response:', {
      success: adminResponse.data.success,
      count: adminResponse.data.count,
      method: adminResponse.data.method,
      message: adminResponse.data.message,
      s3_available: adminResponse.data.s3_available,
      previous_sessions_count: adminResponse.data.data?.your_previous_sessions?.count || 0,
      scheduled_sessions_count: adminResponse.data.data?.scheduled_sessions?.count || 0
    });

    if (adminResponse.data.data?.your_previous_sessions?.videos?.length > 0) {
      const firstVideo = adminResponse.data.data.your_previous_sessions.videos[0];
      console.log('📹 Sample Previous Session Video:', {
        id: firstVideo.id,
        title: firstVideo.title,
        source: firstVideo.source,
        hasSignedUrl: firstVideo.url?.includes('signature') || firstVideo.url?.includes('Expires'),
        fileSize: firstVideo.fileSize ? `${(firstVideo.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'
      });
    }

    if (adminResponse.data.data?.scheduled_sessions?.sessions?.length > 0) {
      const firstSession = adminResponse.data.data.scheduled_sessions.sessions[0];
      console.log('📅 Sample Scheduled Session:', {
        batchName: firstSession.batch.name,
        sessionDay: firstSession.session.day,
        lessonsCount: firstSession.recorded_lessons?.length || 0
      });
    }

    // Test 2: Student accessing their own recorded lessons
    console.log('\n📋 Test 2: Student accessing own recorded lessons...');
    const studentResponse = await axios.get(
      `${BASE_URL}/api/v1/batches/students/${TEST_CONFIG.studentId}/recorded-lessons`,
      {
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.studentToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Student Response:', {
      success: studentResponse.data.success,
      count: studentResponse.data.count,
      method: studentResponse.data.method,
      message: studentResponse.data.message
    });

    // Test 3: Student trying to access another student's lessons (should fail)
    console.log('\n📋 Test 3: Student accessing another student\'s lessons (should fail)...');
    try {
      const unauthorizedResponse = await axios.get(
        `${BASE_URL}/api/v1/batches/students/60f7b3b3b3b3b3b3b3b3b3b4/recorded-lessons`, // Different student ID
        {
          headers: {
            'Authorization': `Bearer ${TEST_CONFIG.studentToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('❌ Unauthorized access should have failed!');
    } catch (unauthorizedError) {
      if (unauthorizedError.response && unauthorizedError.response.status === 403) {
        console.log('✅ Unauthorized access properly blocked (403)');
      } else {
        console.log('⚠️ Unexpected error:', unauthorizedError.response?.status);
      }
    }

    // Test 4: Invalid student ID
    console.log('\n📋 Test 4: Invalid student ID (should return 404)...');
    try {
      const invalidResponse = await axios.get(
        `${BASE_URL}/api/v1/batches/students/invalid-student-id/recorded-lessons`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_CONFIG.adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('❌ Invalid student ID should have returned 404!');
    } catch (invalidError) {
      if (invalidError.response && invalidError.response.status === 404) {
        console.log('✅ Invalid student ID properly handled (404)');
      } else {
        console.log('⚠️ Unexpected error:', invalidError.response?.status);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

/**
 * Test S3 direct listing vs database fallback
 */
async function testS3VsFallbackMethods() {
  console.log('\n🔄 Testing S3 Direct Listing vs Database Fallback\n');
  
  // Note: To properly test fallback, you would need to temporarily disable S3 access
  // or mock the S3 service to simulate failures
  
  console.log('📝 To test fallback mechanism:');
  console.log('1. Temporarily revoke S3 permissions');
  console.log('2. Call the API and verify it returns "Database Fallback" method');
  console.log('3. Restore S3 permissions');
  console.log('4. Call the API and verify it returns "S3 Direct Listing" method');
}

/**
 * Performance comparison test
 */
async function testPerformance() {
  console.log('\n⚡ Performance Test\n');
  
  const startTime = Date.now();
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/v1/batches/students/${TEST_CONFIG.studentId}/recorded-lessons`,
      {
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️ Response Time: ${duration}ms`);
    console.log(`📊 Videos Found: ${response.data.count}`);
    console.log(`🔧 Method Used: ${response.data.method}`);
    
    if (duration < 1000) {
      console.log('✅ Performance: Excellent (< 1s)');
    } else if (duration < 3000) {
      console.log('✅ Performance: Good (< 3s)');
    } else {
      console.log('⚠️ Performance: Could be improved (> 3s)');
    }
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Enhanced Student Recorded Videos API Tests\n');
  console.log('=' .repeat(60));
  
  // Check if test configuration is properly set
  if (TEST_CONFIG.studentId === '60f7b3b3b3b3b3b3b3b3b3b3' || 
      TEST_CONFIG.adminToken === 'YOUR_ADMIN_JWT_TOKEN') {
    console.log('⚠️ WARNING: Please update TEST_CONFIG with real values before running tests');
    console.log('📝 Required:');
    console.log('   - studentId: Real student MongoDB ObjectId');
    console.log('   - adminToken: Valid admin JWT token');
    console.log('   - studentToken: Valid student JWT token');
    console.log('\n🔧 To get tokens, use the login endpoints or check existing sessions');
    return;
  }
  
  await testGetRecordedLessonsForStudent();
  await testS3VsFallbackMethods();
  await testPerformance();
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎉 Test Suite Completed!');
  console.log('📋 Check the results above for any issues or improvements needed.');
}

// Export for use in other test files
export {
  testGetRecordedLessonsForStudent,
  testS3VsFallbackMethods,
  testPerformance,
  runAllTests
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}
