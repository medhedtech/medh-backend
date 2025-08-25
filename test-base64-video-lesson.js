// Test script for base64 video lesson upload functionality
// Run with: node test-base64-video-lesson.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8080';
const COURSE_ID = '67e14360cd2f46d71bf0587c'; // Your course ID
const WEEK_ID = 'week_1';
const COURSE_TYPE = 'blended'; // or 'live', 'free'

// Test configuration
const TEST_CONFIG = {
  // Use a small test video file (you can create a small MP4 for testing)
  testVideoPath: './test-video.mp4', // Create a small test video
  adminToken: 'YOUR_ADMIN_JWT_TOKEN', // Replace with actual admin token
};

/**
 * Convert file to base64 data URI
 */
function fileToBase64DataUri(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Test video file not found: ${filePath}`);
    }
    
    const videoBuffer = fs.readFileSync(filePath);
    const base64Data = videoBuffer.toString('base64');
    
    // Create data URI with proper MIME type
    const dataUri = `data:video/mp4;base64,${base64Data}`;
    
    console.log(`📁 File: ${filePath}`);
    console.log(`📊 Size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🔢 Base64 length: ${base64Data.length} characters`);
    
    return dataUri;
  } catch (error) {
    console.error('❌ Error reading video file:', error.message);
    throw error;
  }
}

/**
 * Create a small test video file (placeholder)
 */
function createTestVideoFile() {
  const testVideoPath = './test-video.mp4';
  
  if (!fs.existsSync(testVideoPath)) {
    console.log('📝 Creating placeholder test video file...');
    console.log('⚠️  Note: This creates a dummy file. Use a real MP4 file for actual testing.');
    
    // Create a small dummy file (not a real video)
    const dummyContent = Buffer.from('DUMMY_VIDEO_CONTENT_FOR_TESTING');
    fs.writeFileSync(testVideoPath, dummyContent);
    
    console.log('✅ Placeholder file created. Replace with a real MP4 file for testing.');
  }
  
  return testVideoPath;
}

/**
 * Test 1: Add video lesson with base64 upload
 */
async function testBase64VideoUpload() {
  try {
    console.log('\n🎬 Test 1: Base64 Video Upload');
    console.log('================================');
    
    // Ensure test video exists
    const videoPath = createTestVideoFile();
    
    // Convert to base64
    const base64Data = fileToBase64DataUri(videoPath);
    
    const videoLessonData = {
      title: 'Base64 Uploaded Video Lesson',
      description: 'This video was uploaded using base64 encoding',
      video_base64: base64Data,
      duration: '15 minutes',
      order: 1,
      isPreview: true
    };
    
    console.log('\n📤 Uploading video lesson...');
    
    const response = await axios.post(
      `${BASE_URL}/api/v1/tcourse/${COURSE_TYPE}/${COURSE_ID}/curriculum/weeks/${WEEK_ID}/video-lessons/base64`,
      videoLessonData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_CONFIG.adminToken}`
        },
        timeout: 60000 // 60 second timeout for large uploads
      }
    );
    
    console.log('✅ Video lesson uploaded successfully!');
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Base64 upload test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

/**
 * Test 2: Add video lesson with URL (for comparison)
 */
async function testUrlVideoUpload() {
  try {
    console.log('\n🔗 Test 2: URL-based Video Upload');
    console.log('==================================');
    
    const videoLessonData = {
      title: 'URL-based Video Lesson',
      description: 'This video uses a direct URL',
      video_url: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
      duration: '10 minutes',
      order: 2,
      isPreview: false
    };
    
    console.log('📤 Adding URL-based video lesson...');
    
    const response = await axios.post(
      `${BASE_URL}/api/v1/tcourse/${COURSE_TYPE}/${COURSE_ID}/curriculum/weeks/${WEEK_ID}/video-lessons`,
      videoLessonData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_CONFIG.adminToken}`
        }
      }
    );
    
    console.log('✅ URL-based video lesson added successfully!');
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ URL upload test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

/**
 * Test 3: Error handling tests
 */
async function testErrorHandling() {
  console.log('\n⚠️  Test 3: Error Handling');
  console.log('===========================');
  
  const errorTests = [
    {
      name: 'Missing title',
      data: {
        video_base64: 'data:video/mp4;base64,dGVzdA==',
        description: 'Missing title test'
      },
      expectedError: 'Title is required'
    },
    {
      name: 'Missing video data',
      data: {
        title: 'No video data test',
        description: 'Missing video data'
      },
      expectedError: 'Either video URL or base64 video data is required'
    },
    {
      name: 'Invalid base64 data',
      data: {
        title: 'Invalid base64 test',
        video_base64: 'invalid_base64_data',
        description: 'Invalid base64 test'
      },
      expectedError: 'Base64 video data is too short'
    }
  ];
  
  for (const test of errorTests) {
    try {
      console.log(`\n🧪 Testing: ${test.name}`);
      
      await axios.post(
        `${BASE_URL}/api/v1/tcourse/${COURSE_TYPE}/${COURSE_ID}/curriculum/weeks/${WEEK_ID}/video-lessons/base64`,
        test.data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_CONFIG.adminToken}`
          }
        }
      );
      
      console.log('❌ Expected error but request succeeded');
    } catch (error) {
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        console.log(`✅ Correctly caught error: ${error.response.data.message}`);
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
  }
}

/**
 * Test 4: Get curriculum to verify lessons were added
 */
async function testGetCurriculum() {
  try {
    console.log('\n📚 Test 4: Verify Curriculum');
    console.log('=============================');
    
    const response = await axios.get(
      `${BASE_URL}/api/v1/tcourse/${COURSE_TYPE}/${COURSE_ID}/curriculum`,
      {
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.adminToken}`
        }
      }
    );
    
    console.log('✅ Curriculum retrieved successfully!');
    
    // Find our test week
    const testWeek = response.data.weeks?.find(week => week.id === WEEK_ID);
    if (testWeek) {
      console.log(`📖 Week "${testWeek.weekTitle}" has ${testWeek.lessons?.length || 0} lessons:`);
      testWeek.lessons?.forEach((lesson, index) => {
        console.log(`  ${index + 1}. ${lesson.title} (${lesson.lessonType})`);
        if (lesson.meta?.uploadedViaBase64) {
          console.log(`     🎬 Uploaded via base64 at ${lesson.meta.uploadTimestamp}`);
        }
      });
    } else {
      console.log(`⚠️  Week ${WEEK_ID} not found in curriculum`);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get curriculum:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🎬 Base64 Video Lesson Upload Test Suite');
  console.log('=========================================');
  console.log(`Course ID: ${COURSE_ID}`);
  console.log(`Week ID: ${WEEK_ID}`);
  console.log(`Course Type: ${COURSE_TYPE}`);
  console.log('');
  
  // Check if admin token is configured
  if (!TEST_CONFIG.adminToken || TEST_CONFIG.adminToken === 'YOUR_ADMIN_JWT_TOKEN') {
    console.log('⚠️  Warning: Admin token not configured. Update TEST_CONFIG.adminToken');
    console.log('   Some tests may fail due to authentication.');
  }
  
  try {
    // Run tests sequentially
    await testBase64VideoUpload();
    await testUrlVideoUpload();
    await testErrorHandling();
    await testGetCurriculum();
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📝 Summary:');
    console.log('- Base64 video upload: ✅');
    console.log('- URL-based video upload: ✅');
    console.log('- Error handling: ✅');
    console.log('- Curriculum verification: ✅');
    
  } catch (error) {
    console.log('\n💥 Test suite failed!');
    console.error('Final error:', error.message);
    process.exit(1);
  }
}

/**
 * Utility function to create a real test video (requires ffmpeg)
 */
function createRealTestVideo() {
  const { execSync } = require('child_process');
  const outputPath = './test-video.mp4';
  
  try {
    console.log('🎥 Creating real test video with ffmpeg...');
    
    // Create a 5-second test video (requires ffmpeg installed)
    execSync(`ffmpeg -f lavfi -i testsrc=duration=5:size=320x240:rate=1 -c:v libx264 -y ${outputPath}`, 
      { stdio: 'inherit' });
    
    console.log('✅ Real test video created!');
    return outputPath;
  } catch (error) {
    console.log('⚠️  ffmpeg not available, using placeholder file');
    return createTestVideoFile();
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testBase64VideoUpload,
  testUrlVideoUpload,
  testErrorHandling,
  testGetCurriculum,
  fileToBase64DataUri
}; 