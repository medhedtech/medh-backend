const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Test configuration
const TEST_CONFIG = {
  backendUrl: 'http://localhost:8080',
  testVideoPath: path.join(__dirname, 'test-video.mp4'), // You'll need to create this
  batchId: '68a9703374114d3786af9339', // Use a real batch ID
  studentIds: ['68a828618ef079505811bf33'], // Use real student IDs
  sessionNo: 'test-session-001'
};

async function testVideoUpload() {
  console.log('🧪 Testing video upload functionality...');
  
  // Check if test video exists
  if (!fs.existsSync(TEST_CONFIG.testVideoPath)) {
    console.log('⚠️ Test video not found. Creating a dummy video file...');
    
    // Create a dummy video file for testing
    const dummyContent = Buffer.alloc(1024 * 1024); // 1MB dummy file
    fs.writeFileSync(TEST_CONFIG.testVideoPath, dummyContent);
    console.log('✅ Created dummy test video file');
  }
  
  try {
    const formData = new FormData();
    
    // Add the video file
    formData.append('videos', fs.createReadStream(TEST_CONFIG.testVideoPath));
    
    // Add required metadata
    formData.append('studentIds', JSON.stringify(TEST_CONFIG.studentIds));
    formData.append('batchId', TEST_CONFIG.batchId);
    formData.append('sessionNo', TEST_CONFIG.sessionNo);
    
    console.log('📤 Sending upload request...');
    console.log('   - Video file:', TEST_CONFIG.testVideoPath);
    console.log('   - File size:', fs.statSync(TEST_CONFIG.testVideoPath).size, 'bytes');
    console.log('   - Batch ID:', TEST_CONFIG.batchId);
    console.log('   - Students:', TEST_CONFIG.studentIds);
    console.log('   - Session:', TEST_CONFIG.sessionNo);
    
    const response = await fetch(`${TEST_CONFIG.backendUrl}/api/v1/live-classes/upload-videos`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
        'Authorization': 'Bearer test-token' // Use a valid token if needed
      }
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📥 Response body:', responseText.substring(0, 500));
    
    if (response.ok) {
      console.log('✅ Upload test successful!');
    } else {
      console.log('❌ Upload test failed!');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testVideoUpload();

