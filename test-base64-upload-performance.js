import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:8080';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-test-token';

// Test file sizes
const TEST_SIZES = [
  { name: '1MB', size: 1 * 1024 * 1024 },
  { name: '5MB', size: 5 * 1024 * 1024 },
  { name: '10MB', size: 10 * 1024 * 1024 },
];

/**
 * Generate a test image of specified size
 */
function generateTestImage(sizeInBytes) {
  // Create a buffer filled with random data
  const buffer = Buffer.alloc(sizeInBytes);
  
  // Fill with pseudo-random data
  for (let i = 0; i < sizeInBytes; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  
  // Convert to base64
  return buffer.toString('base64');
}

/**
 * Test upload performance
 */
async function testUploadPerformance(endpoint, base64Data, fileType = 'image') {
  const startTime = Date.now();
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/upload/${endpoint}`,
      {
        base64String: `data:image/jpeg;base64,${base64Data}`,
        fileType: fileType
      },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      success: true,
      duration: duration,
      response: response.data
    };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      success: false,
      duration: duration,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Run performance comparison tests
 */
async function runPerformanceTests() {
  console.log('🚀 Base64 Upload Performance Test\n');
  console.log('API URL:', API_BASE_URL);
  console.log('-----------------------------------\n');
  
  const results = [];
  
  for (const testSize of TEST_SIZES) {
    console.log(`📊 Testing ${testSize.name} file...`);
    
    // Generate test data
    const base64Data = generateTestImage(testSize.size);
    console.log(`Generated base64 string length: ${base64Data.length}`);
    
    // Test optimized endpoint
    console.log('Testing optimized endpoint...');
    const optimizedResult = await testUploadPerformance('base64', base64Data);
    
    // Test legacy endpoint
    console.log('Testing legacy endpoint...');
    const legacyResult = await testUploadPerformance('base64-legacy', base64Data);
    
    // Calculate improvement
    const improvement = legacyResult.duration > 0 
      ? ((legacyResult.duration - optimizedResult.duration) / legacyResult.duration * 100).toFixed(1)
      : 0;
    
    results.push({
      size: testSize.name,
      optimized: {
        duration: optimizedResult.duration,
        success: optimizedResult.success
      },
      legacy: {
        duration: legacyResult.duration,
        success: legacyResult.success
      },
      improvement: `${improvement}%`
    });
    
    console.log(`✅ Optimized: ${optimizedResult.duration}ms`);
    console.log(`⏱️  Legacy: ${legacyResult.duration}ms`);
    console.log(`📈 Improvement: ${improvement}%\n`);
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Display summary
  console.log('\n📊 Performance Test Summary');
  console.log('===========================\n');
  console.table(results);
  
  // Calculate average improvement
  const avgImprovement = results
    .map(r => parseFloat(r.improvement))
    .reduce((a, b) => a + b, 0) / results.length;
  
  console.log(`\n🎯 Average Performance Improvement: ${avgImprovement.toFixed(1)}%`);
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  console.log('\n🔍 Testing Error Handling\n');
  
  const errorTests = [
    {
      name: 'Invalid base64',
      data: { base64String: 'invalid-base64!@#$', fileType: 'image' }
    },
    {
      name: 'Missing fileType',
      data: { base64String: 'SGVsbG8gV29ybGQ=' }
    },
    {
      name: 'Invalid fileType',
      data: { base64String: 'SGVsbG8gV29ybGQ=', fileType: 'invalid' }
    },
    {
      name: 'Empty request',
      data: {}
    }
  ];
  
  for (const test of errorTests) {
    console.log(`Testing: ${test.name}`);
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/upload/base64`,
        test.data,
        {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(`❌ Expected error but got success`);
    } catch (error) {
      console.log(`✅ Got expected error: ${error.response?.data?.error || error.message}`);
    }
    console.log('');
  }
}

/**
 * Main test runner
 */
async function main() {
  try {
    // Check if server is running
    try {
      await axios.get(`${API_BASE_URL}/health`);
    } catch (error) {
      console.error('❌ Server is not running at', API_BASE_URL);
      console.error('Please start the server and try again.');
      process.exit(1);
    }
    
    // Run performance tests
    await runPerformanceTests();
    
    // Run error handling tests
    await testErrorHandling();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
main(); 