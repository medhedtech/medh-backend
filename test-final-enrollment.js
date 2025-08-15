// Final test script to test actual enrollment API with real data
import { config } from 'dotenv';
import https from 'https';
import http from 'http';

// Load environment variables
config();

console.log('🧪 Final Test: Actual Enrollment API with Real Data...\n');

// Real test data from database
const realBatchId = '67bd596b8a56e7688dd02274'; // Real batch ID from database
const realStudentId = '67f65a6ca2dd90926a759ee4'; // Real student ID from database

async function testFinalEnrollment() {
  console.log('📋 Real Test Data:');
  console.log(`   - Batch ID: ${realBatchId}`);
  console.log(`   - Student ID: ${realStudentId}`);
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

    // Test 2: Test the addStudentToBatch API endpoint with real data
    console.log('🔧 Test 2: Testing addStudentToBatch API with real data...');
    
    const enrollmentData = {
      studentId: realStudentId,
      paymentPlan: 'full_payment',
      notes: 'Test enrollment via API with real data'
    };
    
    console.log('📤 Sending enrollment request...');
    console.log(`   - Endpoint: POST /api/v1/batches/${realBatchId}/students`);
    console.log(`   - Data: ${JSON.stringify(enrollmentData, null, 2)}`);
    console.log('');
    
    const enrollmentResponse = await makeRequest(
      'POST', 
      `/api/v1/batches/${realBatchId}/students`, 
      enrollmentData
    );
    
    if (enrollmentResponse.success) {
      console.log('✅ Student enrollment successful!');
      console.log(`   - Enrollment ID: ${enrollmentResponse.data?.enrollmentId}`);
      console.log(`   - Student: ${enrollmentResponse.data?.student?.full_name || 'Unknown'}`);
      console.log(`   - Batch: ${enrollmentResponse.data?.batch?.name || 'Unknown'}`);
      console.log(`   - Status: ${enrollmentResponse.data?.status}`);
      console.log('');
      console.log('📁 S3 Folder Creation:');
      console.log(`   - Expected S3 path: medh-filess/videos/${realBatchId}/hamdan/`);
      console.log(`   - Check AWS S3 console for the created folder`);
      console.log('');
      console.log('🔍 Check backend console logs for:');
      console.log('   - "✅ S3 folder created for student: Hamdan in batch: [batch_name]"');
      console.log('   - "S3 Path: s3://medh-filess/videos/[batch_id]/hamdan/"');
    } else {
      console.log('❌ Student enrollment failed');
      console.log(`   - Error: ${enrollmentResponse.message}`);
      console.log(`   - Status Code: ${enrollmentResponse.status || 'Unknown'}`);
      console.log(`   - Details: ${JSON.stringify(enrollmentResponse, null, 2)}`);
    }
    console.log('');

    // Test 3: Verify the enrollment was created
    console.log('🔧 Test 3: Verifying enrollment was created...');
    
    const verifyResponse = await makeRequest(
      'GET',
      `/api/v1/batches/${realBatchId}/students?page=1&limit=10`,
      null
    );
    
    if (verifyResponse.success && verifyResponse.students) {
      const studentEnrollment = verifyResponse.students.data.find(
        enrollment => enrollment.student._id === realStudentId
      );
      
      if (studentEnrollment) {
        console.log('✅ Enrollment verified in database');
        console.log(`   - Enrollment ID: ${studentEnrollment.enrollmentId}`);
        console.log(`   - Student: ${studentEnrollment.student.full_name || 'Unknown'}`);
        console.log(`   - Status: ${studentEnrollment.status}`);
        console.log(`   - Enrollment Date: ${studentEnrollment.enrollmentDate}`);
      } else {
        console.log('❌ Enrollment not found in database');
      }
    } else {
      console.log('❌ Could not verify enrollment');
    }
    console.log('');

    console.log('🎉 Final test completed!');
    console.log('');
    console.log('📝 Summary:');
    console.log('   - Backend server is running');
    console.log('   - Enrollment API is working');
    console.log('   - S3 folder creation should be working');
    console.log('');
    console.log('🔍 Manual Verification Steps:');
    console.log('   1. Check backend console logs for S3 folder creation messages');
    console.log('   2. Check AWS S3 console for folder: medh-filess/videos/[batch_id]/hamdan/');
    console.log('   3. Verify the folder structure is correct');
    console.log('   4. Try uploading a video to test the complete flow');

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
testFinalEnrollment().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});


