/**
 * Test script for certificate generation
 * This script tests the demo certificate generation endpoint
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:8080/api/v1';

// Test data for certificate generation
const testCertificateData = {
  student_id: "507f1f77bcf86cd799439011", // Example ObjectId
  course_id: "507f1f77bcf86cd799439012", // Example ObjectId
  enrollment_id: "507f1f77bcf86cd799439013", // Example ObjectId
  course_name: "Advanced Web Development",
  full_name: "John Doe",
  instructor_name: "Dr. Jane Smith",
  date: new Date().toISOString()
};

async function testCertificateGeneration() {
  console.log('🧪 Testing Certificate Generation...');
  console.log('📋 Test Data:', JSON.stringify(testCertificateData, null, 2));

  try {
    // Test the demo certificate endpoint
    const response = await fetch(`${API_BASE_URL}/certificates/demo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: You'll need to add a valid Authorization header for testing
        // 'Authorization': 'Bearer YOUR_JWT_TOKEN'
      },
      body: JSON.stringify(testCertificateData)
    });

    const result = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📄 Response Body:', JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log('✅ Certificate generation successful!');
      console.log('🆔 Certificate ID:', result.data?.certificateId);
      console.log('📎 PDF URL:', result.data?.pdfUrl);
      console.log('🔗 Verification URL:', result.data?.verificationUrl);
    } else {
      console.log('❌ Certificate generation failed!');
      console.log('🚨 Error:', result.error || result.message);
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

// Test validation with missing fields
async function testValidation() {
  console.log('\n🧪 Testing Validation...');
  
  const invalidData = {
    // Missing required fields
    course_id: "507f1f77bcf86cd799439012",
    course_name: "Advanced Web Development"
  };

  try {
    const response = await fetch(`${API_BASE_URL}/certificates/demo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData)
    });

    const result = await response.json();
    
    console.log('📊 Validation Response Status:', response.status);
    console.log('📄 Validation Response:', JSON.stringify(result, null, 2));

    if (response.status === 400) {
      console.log('✅ Validation working correctly!');
    } else {
      console.log('❌ Validation not working as expected!');
    }

  } catch (error) {
    console.error('💥 Validation test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Certificate Generation Tests...\n');
  
  await testValidation();
  await testCertificateGeneration();
  
  console.log('\n🏁 Tests completed!');
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testCertificateGeneration, testValidation };


