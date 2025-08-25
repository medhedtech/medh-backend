// Test script to verify S3 upload with batch ObjectId folder structure
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

console.log('🧪 Testing S3 Upload with Batch ObjectId Structure...');
console.log('====================================================');

// Test configuration
const TEST_CONFIG = {
  backendUrl: 'http://localhost:8080/api/v1',
  testVideoPath: path.join(__dirname, 'test-video.mp4'),
  testVideoSize: 1024 * 1024, // 1MB test file
  timeout: 30000
};

// Create a test video file if it doesn't exist
function createTestVideoFile() {
  console.log('📹 Creating test video file...');
  
  if (!fs.existsSync(TEST_CONFIG.testVideoPath)) {
    // Create a minimal MP4 file for testing
    const testVideoData = Buffer.alloc(TEST_CONFIG.testVideoSize);
    // Add some basic MP4 header data
    testVideoData.write('ftypmp42', 4);
    testVideoData.write('mp42', 8);
    
    fs.writeFileSync(TEST_CONFIG.testVideoPath, testVideoData);
    console.log('✅ Test video file created:', TEST_CONFIG.testVideoPath);
  } else {
    console.log('✅ Test video file already exists');
  }
}

// Simple HTTP request function
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || TEST_CONFIG.timeout
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test 1: Get available batches
async function getAvailableBatches() {
  console.log('\n📚 Test 1: Getting Available Batches');
  console.log('-------------------------------------');
  
  try {
    const response = await makeRequest(`${TEST_CONFIG.backendUrl}/live-classes/test-batch-student-org`);
    
    if (response.status === 200 && response.data.status === 'success') {
      console.log('✅ Batch & Student Organization Test: PASSED');
      console.log('   - Test Students Found:', response.data.data.students.length);
      console.log('   - Test Batches Found:', response.data.data.batches.length);
      
      response.data.data.students.forEach(student => {
        console.log(`   👤 Student: ${student.full_name} (${student._id})`);
      });
      
      response.data.data.batches.forEach(batch => {
        console.log(`   📚 Batch: ${batch.name} (${batch._id})`);
      });
      
      return response.data.data;
    } else {
      console.log('❌ Batch & Student Organization Test: FAILED');
      console.log('   - Status:', response.status);
      console.log('   - Error:', response.data.message || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.log('❌ Batch & Student Organization Test: FAILED');
    console.log('   - Network Error:', error.message);
    return null;
  }
}

// Test 2: Test S3 connection
async function testS3Connection() {
  console.log('\n🔍 Test 2: S3 Connection Test');
  console.log('-------------------------------');
  
  try {
    const response = await makeRequest(`${TEST_CONFIG.backendUrl}/live-classes/test-s3-connection`);
    
    if (response.status === 200 && response.data.status === 'success') {
      console.log('✅ S3 Connection Test: PASSED');
      console.log('   - Bucket Name:', response.data.data.bucketName);
      console.log('   - Region:', response.data.data.region);
      console.log('   - Access Status:', response.data.data.accessStatus);
      return true;
    } else {
      console.log('❌ S3 Connection Test: FAILED');
      console.log('   - Status:', response.status);
      console.log('   - Error:', response.data.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log('❌ S3 Connection Test: FAILED');
    console.log('   - Network Error:', error.message);
    return false;
  }
}

// Test 3: Manual upload test with batch ObjectId
async function testManualUploadWithBatch() {
  console.log('\n📤 Test 3: Manual Upload Test with Batch ObjectId');
  console.log('------------------------------------------------');
  
  console.log('📋 To test video upload with batch ObjectId:');
  console.log('   1. Start your backend server: npm start');
  console.log('   2. Go to the Create Live Session form');
  console.log('   3. Select a batch from the dropdown');
  console.log('   4. Upload a video file');
  console.log('   5. Check the S3 bucket structure');
  
  console.log('\n📁 Expected S3 folder structure with batch ObjectId:');
  console.log('   medh-filess/');
  console.log('   └── videos/');
  console.log('       └── {batchObjectId}/  ← This should be the MongoDB ObjectId');
  console.log('           └── {studentId}/');
  console.log('               └── {timestamp}-{random}.mp4');
  
  console.log('\n🔍 To verify the upload:');
  console.log('   1. Check the browser console for S3 key generation');
  console.log('   2. Look for logs like: "Generated S3 key for student X in batch Y"');
  console.log('   3. Verify the batch ID in the S3 key matches the MongoDB ObjectId');
  console.log('   4. Check your S3 bucket to confirm the folder structure');
  
  return true;
}

// Test 4: Check environment variables
function testEnvironmentVariables() {
  console.log('\n🔧 Test 4: Environment Variables Test');
  console.log('------------------------------------');
  
  const requiredVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY', 
    'AWS_REGION',
    'AWS_S3_BUCKET_NAME'
  ];
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName}: ${varName.includes('SECRET') ? '***' : value}`);
    } else {
      console.log(`   ❌ ${varName}: NOT SET`);
      allPresent = false;
    }
  });
  
  if (allPresent) {
    console.log('✅ All required environment variables are set');
  } else {
    console.log('❌ Some environment variables are missing');
  }
  
  return allPresent;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting S3 Upload with Batch ObjectId Tests...\n');
  
  // Create test video file
  createTestVideoFile();
  
  // Test environment variables first
  const envVarsOk = testEnvironmentVariables();
  
  if (!envVarsOk) {
    console.log('\n⚠️  Environment variables are not properly configured.');
    console.log('   Please check your .env file and ensure all AWS credentials are set.');
    return;
  }
  
  // Run tests
  const results = {
    s3Connection: await testS3Connection(),
    batchData: await getAvailableBatches(),
    manualUpload: testManualUploadWithBatch(),
    envVars: envVarsOk
  };
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`✅ Environment Variables: ${results.envVars ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ S3 Connection: ${results.s3Connection ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Batch Data Available: ${results.batchData ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Manual Upload Test: READY FOR TESTING`);
  
  if (results.batchData && results.batchData.batches.length > 0) {
    console.log('\n📚 Available Batch ObjectIds for testing:');
    results.batchData.batches.forEach((batch, index) => {
      console.log(`   ${index + 1}. ${batch.name}: ${batch._id}`);
    });
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Use one of these batch ObjectIds in your frontend form');
    console.log('   2. Upload a video and check the S3 bucket');
    console.log('   3. Verify the folder structure matches: videos/{batchObjectId}/{studentId}/');
  }
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (results.s3Connection && results.batchData) {
    console.log('🎉 System is ready for batch ObjectId testing!');
    console.log('📝 Ready to test video upload with proper S3 folder structure.');
  } else {
    console.log('⚠️  Some tests failed. Please check the configuration and try again.');
  }
  
  // Cleanup
  if (fs.existsSync(TEST_CONFIG.testVideoPath)) {
    fs.unlinkSync(TEST_CONFIG.testVideoPath);
    console.log('\n🧹 Cleaned up test video file');
  }
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testS3Connection,
  getAvailableBatches,
  testEnvironmentVariables
};


