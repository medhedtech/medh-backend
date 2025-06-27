/**
 * Test script for recorded lesson upload with optional text file
 * This script tests the endpoint: POST /api/v1/batches/:batchId/schedule/:sessionId/upload-recorded-lesson
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Configuration
const API_BASE_URL = 'http://localhost:8080/api/v1';
const TEST_BATCH_ID = '68557a9d841fabd88f839df0'; // Replace with actual batch ID
const TEST_SESSION_ID = '68557a9d841fabd88f839df1'; // Replace with actual session ID
const TEST_TOKEN = 'your_jwt_token_here'; // Replace with actual JWT token

// Generate a simple test video as base64 (minimal MP4 header)
const generateTestVideoBase64 = () => {
  // This is a minimal MP4 file header in base64 - for testing purposes only
  const testVideoBuffer = Buffer.from([
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box
    0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00,
    0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
    0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31
  ]);
  
  return `data:video/mp4;base64,${testVideoBuffer.toString('base64')}`;
};

// Test cases
const testCases = [
  {
    name: 'Upload video only (no text file)',
    payload: {
      base64String: generateTestVideoBase64(),
      title: 'Test Lesson - Video Only',
      recorded_date: new Date().toISOString()
    }
  },
  {
    name: 'Upload video with text file (.txt)',
    payload: {
      base64String: generateTestVideoBase64(),
      title: 'Test Lesson - With Text File',
      recorded_date: new Date().toISOString(),
      textFile: {
        content: `# Lesson Notes

## Topics Covered
1. Introduction to React Hooks
2. useState and useEffect
3. Custom Hooks
4. Performance Optimization

## Key Points
- Hooks allow you to use state and other React features without writing a class
- Always call hooks at the top level of React functions
- Don't call hooks inside loops, conditions, or nested functions

## Additional Resources
- React Documentation: https://reactjs.org/docs/hooks-intro.html
- Hook Rules: https://reactjs.org/docs/rules-of-hooks.html

## Next Session
We will cover advanced patterns and testing strategies.`,
        filename: 'lesson-notes.txt',
        description: 'Comprehensive lesson notes covering React Hooks'
      }
    }
  },
  {
    name: 'Upload video with markdown text file',
    payload: {
      base64String: generateTestVideoBase64(),
      title: 'Test Lesson - With Markdown',
      recorded_date: new Date().toISOString(),
      textFile: {
        content: `# Advanced JavaScript Concepts

## Arrow Functions
\`\`\`javascript
const add = (a, b) => a + b;
\`\`\`

## Destructuring
\`\`\`javascript
const { name, age } = person;
const [first, second] = array;
\`\`\`

## Promises and Async/Await
\`\`\`javascript
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}
\`\`\``,
        filename: 'lesson-content.md',
        description: 'Markdown formatted lesson content with code examples'
      }
    }
  }
];

// Test function
async function testRecordedLessonUpload(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('=' .repeat(50));
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/batches/${TEST_BATCH_ID}/schedule/${TEST_SESSION_ID}/upload-recorded-lesson`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        body: JSON.stringify(testCase.payload)
      }
    );
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(result, null, 2));
      
      // Check if text file information is included
      if (testCase.payload.textFile) {
        console.log(`📄 Text File: ${result.data.hasTextFile ? 'Included' : 'Not detected'}`);
      }
    } else {
      console.log('❌ FAILED');
      console.log('Status:', response.status);
      console.log('Error:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.log('❌ NETWORK ERROR');
    console.error('Error:', error.message);
  }
}

// Validation tests
async function testValidation() {
  console.log('\n🔍 Testing Validation');
  console.log('=' .repeat(50));
  
  // Test invalid text file extension
  const invalidExtensionTest = {
    base64String: generateTestVideoBase64(),
    title: 'Test Invalid Extension',
    textFile: {
      content: 'Some content',
      filename: 'invalid.xyz', // Invalid extension
      description: 'Test file with invalid extension'
    }
  };
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/batches/${TEST_BATCH_ID}/schedule/${TEST_SESSION_ID}/upload-recorded-lesson`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        body: JSON.stringify(invalidExtensionTest)
      }
    );
    
    const result = await response.json();
    
    if (response.status === 400) {
      console.log('✅ Validation working: Invalid extension rejected');
      console.log('Error message:', result.message);
    } else {
      console.log('❌ Validation failed: Invalid extension accepted');
    }
    
  } catch (error) {
    console.error('Validation test error:', error.message);
  }
  
  // Test oversized text file
  const oversizedTest = {
    base64String: generateTestVideoBase64(),
    title: 'Test Oversized File',
    textFile: {
      content: 'x'.repeat(1024 * 1024 + 1), // Just over 1MB
      filename: 'large-file.txt',
      description: 'File that exceeds size limit'
    }
  };
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/batches/${TEST_BATCH_ID}/schedule/${TEST_SESSION_ID}/upload-recorded-lesson`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        body: JSON.stringify(oversizedTest)
      }
    );
    
    const result = await response.json();
    
    if (response.status === 400) {
      console.log('✅ Validation working: Oversized file rejected');
      console.log('Error message:', result.message);
    } else {
      console.log('❌ Validation failed: Oversized file accepted');
    }
    
  } catch (error) {
    console.error('Oversized file test error:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Recorded Lesson Upload Tests with Text File Support');
  console.log('API Endpoint:', `${API_BASE_URL}/batches/${TEST_BATCH_ID}/schedule/${TEST_SESSION_ID}/upload-recorded-lesson`);
  
  // Check if configuration is valid
  if (TEST_TOKEN === 'your_jwt_token_here') {
    console.log('\n⚠️  WARNING: Please update TEST_TOKEN with a valid JWT token');
    console.log('⚠️  WARNING: Please update TEST_BATCH_ID and TEST_SESSION_ID with valid IDs');
    console.log('\nTest will continue but may fail due to authentication...\n');
  }
  
  // Run functional tests
  for (const testCase of testCases) {
    await testRecordedLessonUpload(testCase);
    
    // Wait between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Run validation tests
  await testValidation();
  
  console.log('\n🏁 All tests completed!');
  console.log('\n📋 Test Summary:');
  console.log('- Video only upload');
  console.log('- Video + text file (.txt)');
  console.log('- Video + markdown file (.md)');
  console.log('- Validation: Invalid file extension');
  console.log('- Validation: Oversized file');
}

// Export for use in other scripts
export { testRecordedLessonUpload, generateTestVideoBase64 };

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}
