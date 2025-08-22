// Test script to test actual enrollment API endpoint
import { config } from 'dotenv';
import https from 'https';
import http from 'http';

// Load environment variables
config();

console.log('🧪 Testing Actual Enrollment API Endpoint...\n');

// Test data
const testBatchId = '689de09ca8d09b5e78cbfbd6'; // Example batch ID
const testStudentId = '67f65a6ca2dd90926a759ee4'; // Example student ID

async function testActualEnrollmentAPI() {
  console.log('📋 Test Data:');
  console.log(`   - Batch ID: ${testBatchId}`);
  console.log(`   - Student ID: ${testStudentId}`);
  console.log('');

  try {
    // Test 1: Check if backend server is running
    console.log('🔧 Test 1: Checking if backend server is running...');
    
    const healthCheck = await makeRequest('GET', '/api/v1/health', null);
    
    if (healthCheck.success) {
      console.log('✅ Backend server is running');
    } else {
      console.log('❌ Backend server is not responding');
      console.log('   Please start the backend server first: npm start');
      return;
    }
    console.log('');

    // Test 2: Test the addStudentToBatch API endpoint
    console.log('🔧 Test 2: Testing addStudentToBatch API endpoint...');
    
    const enrollmentData = {
      studentId: testStudentId,
      paymentPlan: 'full_payment',
      notes: 'Test enrollment via API'
    };
    
    const enrollmentResponse = await makeRequest(
      'POST', 
      `/api/v1/batches/${testBatchId}/students`, 
      enrollmentData
    );
    
    if (enrollmentResponse.success) {
      console.log('✅ Student enrollment successful');
      console.log(`   - Enrollment ID: ${enrollmentResponse.data?.enrollmentId}`);
      console.log(`   - Student: ${enrollmentResponse.data?.student?.full_name}`);
      console.log(`   - Batch: ${enrollmentResponse.data?.batch?.name}`);
      console.log('');
      console.log('📁 Check S3 bucket for student folder creation:');
      console.log(`   - Expected path: medh-filess/videos/${testBatchId}/[student_name]/`);
    } else {
      console.log('❌ Student enrollment failed');
      console.log(`   - Error: ${enrollmentResponse.message}`);
      console.log(`   - Details: ${JSON.stringify(enrollmentResponse, null, 2)}`);
    }
    console.log('');

    // Test 3: Check backend logs for S3 folder creation messages
    console.log('📝 Test 3: Check backend logs for S3 folder creation...');
    console.log('   Look for these log messages in the backend console:');
    console.log('   - "✅ S3 folder created for student: [name] in batch: [batch_name]"');
    console.log('   - "S3 Path: s3://medh-filess/videos/[batch_id]/[student_name]/"');
    console.log('');

    console.log('🎉 API testing completed!');
    console.log('');
    console.log('📝 Manual Verification Steps:');
    console.log('   1. Check backend console logs for S3 folder creation messages');
    console.log('   2. Check AWS S3 console for the created folders');
    console.log('   3. Verify folder structure: medh-filess/videos/[batch_id]/[student_name]/');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Helper function to make HTTP requests
function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Add proper auth if needed
      }
    };

    const req = (options.port === 443 ? https : http).request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          resolve({ success: false, message: 'Invalid JSON response', data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, message: `Request failed: ${error.message}` });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run the tests
testActualEnrollmentAPI().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});


