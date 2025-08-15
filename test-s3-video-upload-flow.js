// Test script to verify S3 bucket functionality and video upload flow
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

console.log('🧪 Testing S3 Video Upload Flow...');
console.log('=====================================');

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

// Test 1: Check S3 credentials and bucket access
async function testS3Connection() {
  console.log('\n🔍 Test 1: S3 Connection Test');
  console.log('-------------------------------');
  
  try {
    const response = await fetch(`${TEST_CONFIG.backendUrl}/live-classes/test-s3-connection`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: TEST_CONFIG.timeout
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ S3 Connection Test: PASSED');
      console.log('   - Bucket Name:', result.data.bucketName);
      console.log('   - Region:', result.data.region);
      console.log('   - Access Status:', result.data.accessStatus);
      return true;
    } else {
      console.log('❌ S3 Connection Test: FAILED');
      console.log('   - Error:', result.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log('❌ S3 Connection Test: FAILED');
    console.log('   - Network Error:', error.message);
    return false;
  }
}

// Test 2: Test video upload with student and batch information
async function testVideoUpload() {
  console.log('\n📤 Test 2: Video Upload Test');
  console.log('-----------------------------');
  
  try {
    // Create form data
    const formData = new FormData();
    
    // Add test video file
    const videoStream = fs.createReadStream(TEST_CONFIG.testVideoPath);
    formData.append('videos', videoStream, {
      filename: 'test-video.mp4',
      contentType: 'video/mp4'
    });
    
    // Add test student IDs
    const testStudentIds = ['689ba08c5eba793ac7f42a4e', '689ba08c5eba793ac7f42a51'];
    formData.append('studentIds', JSON.stringify(testStudentIds));
    
    // Add test batch ID
    const testBatchId = '689ba08c5eba793ac7f42a58';
    formData.append('batchId', testBatchId);
    
    console.log('📋 Upload Parameters:');
    console.log('   - Video File:', path.basename(TEST_CONFIG.testVideoPath));
    console.log('   - File Size:', (TEST_CONFIG.testVideoSize / 1024 / 1024).toFixed(2), 'MB');
    console.log('   - Student IDs:', testStudentIds);
    console.log('   - Batch ID:', testBatchId);
    
    const response = await fetch(`${TEST_CONFIG.backendUrl}/live-classes/upload-videos`, {
      method: 'POST',
      body: formData,
      timeout: TEST_CONFIG.timeout
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Video Upload Test: PASSED');
      console.log('   - Uploaded Videos:', result.data.videos.length);
      console.log('   - Student-Batch Mapping:', Object.keys(result.data.studentBatchMapping || {}).length, 'students');
      
      // Log details of uploaded videos
      result.data.videos.forEach((video, index) => {
        console.log(`   📹 Video ${index + 1}:`);
        console.log(`      - Name: ${video.name}`);
        console.log(`      - Size: ${(video.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`      - S3 Key: ${video.s3Key}`);
        console.log(`      - URL: ${video.url}`);
        console.log(`      - Student ID: ${video.studentId}`);
        console.log(`      - Batch Name: ${video.batchName}`);
      });
      
      return result.data.videos;
    } else {
      console.log('❌ Video Upload Test: FAILED');
      console.log('   - Error:', result.message || result.error || 'Unknown error');
      console.log('   - Response Status:', response.status);
      return null;
    }
  } catch (error) {
    console.log('❌ Video Upload Test: FAILED');
    console.log('   - Network Error:', error.message);
    return null;
  }
}

// Test 3: Verify uploaded videos in S3
async function testS3VideoVerification(uploadedVideos) {
  console.log('\n🔍 Test 3: S3 Video Verification Test');
  console.log('--------------------------------------');
  
  if (!uploadedVideos || uploadedVideos.length === 0) {
    console.log('⚠️  Skipping S3 verification - no videos uploaded');
    return false;
  }
  
  try {
    const response = await fetch(`${TEST_CONFIG.backendUrl}/live-classes/verify-s3-videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videos: uploadedVideos.map(video => ({
          s3Key: video.s3Key,
          expectedSize: video.size
        }))
      }),
      timeout: TEST_CONFIG.timeout
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ S3 Video Verification Test: PASSED');
      console.log('   - Verified Videos:', result.data.verifiedVideos.length);
      console.log('   - Failed Verifications:', result.data.failedVerifications.length);
      
      result.data.verifiedVideos.forEach(video => {
        console.log(`   ✅ ${video.s3Key} - Size: ${(video.size / 1024 / 1024).toFixed(2)} MB`);
      });
      
      if (result.data.failedVerifications.length > 0) {
        result.data.failedVerifications.forEach(failure => {
          console.log(`   ❌ ${failure.s3Key} - Error: ${failure.error}`);
        });
      }
      
      return result.data.verifiedVideos.length > 0;
    } else {
      console.log('❌ S3 Video Verification Test: FAILED');
      console.log('   - Error:', result.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log('❌ S3 Video Verification Test: FAILED');
    console.log('   - Network Error:', error.message);
    return false;
  }
}

// Test 4: Test video download/access
async function testVideoAccess(uploadedVideos) {
  console.log('\n🔗 Test 4: Video Access Test');
  console.log('----------------------------');
  
  if (!uploadedVideos || uploadedVideos.length === 0) {
    console.log('⚠️  Skipping video access test - no videos uploaded');
    return false;
  }
  
  let successCount = 0;
  
  for (const video of uploadedVideos) {
    try {
      console.log(`🔍 Testing access to: ${video.name}`);
      
      const response = await fetch(video.url, {
        method: 'HEAD',
        timeout: 10000
      });
      
      if (response.ok) {
        console.log(`   ✅ ${video.name} - Accessible (Status: ${response.status})`);
        console.log(`      - Content-Type: ${response.headers.get('content-type')}`);
        console.log(`      - Content-Length: ${response.headers.get('content-length')} bytes`);
        successCount++;
      } else {
        console.log(`   ❌ ${video.name} - Not accessible (Status: ${response.status})`);
      }
    } catch (error) {
      console.log(`   ❌ ${video.name} - Access failed: ${error.message}`);
    }
  }
  
  const success = successCount > 0;
  console.log(`📊 Video Access Summary: ${successCount}/${uploadedVideos.length} videos accessible`);
  
  return success;
}

// Test 5: Test batch and student organization
async function testBatchStudentOrganization() {
  console.log('\n👥 Test 5: Batch & Student Organization Test');
  console.log('--------------------------------------------');
  
  try {
    const response = await fetch(`${TEST_CONFIG.backendUrl}/live-classes/test-batch-student-org`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: TEST_CONFIG.timeout
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Batch & Student Organization Test: PASSED');
      console.log('   - Test Students Found:', result.data.students.length);
      console.log('   - Test Batches Found:', result.data.batches.length);
      
      result.data.students.forEach(student => {
        console.log(`   👤 Student: ${student.full_name} (${student._id})`);
      });
      
      result.data.batches.forEach(batch => {
        console.log(`   📚 Batch: ${batch.name} (${batch._id})`);
      });
      
      return true;
    } else {
      console.log('❌ Batch & Student Organization Test: FAILED');
      console.log('   - Error:', result.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log('❌ Batch & Student Organization Test: FAILED');
    console.log('   - Network Error:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting S3 Video Upload Flow Tests...\n');
  
  // Create test video file
  createTestVideoFile();
  
  // Run tests
  const results = {
    s3Connection: await testS3Connection(),
    videoUpload: await testVideoUpload(),
    s3Verification: false,
    videoAccess: false,
    batchStudentOrg: await testBatchStudentOrganization()
  };
  
  // Run dependent tests
  if (results.videoUpload) {
    results.s3Verification = await testS3VideoVerification(results.videoUpload);
    results.videoAccess = await testVideoAccess(results.videoUpload);
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`✅ S3 Connection: ${results.s3Connection ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Video Upload: ${results.videoUpload ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ S3 Verification: ${results.s3Verification ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Video Access: ${results.videoAccess ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Batch/Student Org: ${results.batchStudentOrg ? 'PASSED' : 'FAILED'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! S3 video upload system is working correctly.');
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
  testVideoUpload,
  testS3VideoVerification,
  testVideoAccess,
  testBatchStudentOrganization
};


