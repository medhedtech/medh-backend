/**
 * Quick test script to verify profile completion endpoint
 * Run with: node test-profile-completion-endpoint.js
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test without authentication first
async function testEndpointExists() {
  try {
    console.log('🧪 Testing if profile completion endpoint exists...\n');
    
    const response = await fetch(`${BASE_URL}/api/v1/profile/me/completion`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('✅ Endpoint exists but requires authentication (expected)');
      return true;
    } else if (response.status === 404) {
      console.log('❌ Endpoint not found - route not registered properly');
      return false;
    } else {
      console.log('🤔 Unexpected response:', response.status);
      const text = await response.text();
      console.log('Response:', text);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing endpoint:', error.message);
    return false;
  }
}

// Test with a sample token (you'll need to replace this)
async function testWithAuth(token) {
  try {
    console.log('\n🔐 Testing with authentication...\n');
    
    const response = await fetch(`${BASE_URL}/api/v1/profile/me/completion`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Profile completion data:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
    }
  } catch (error) {
    console.error('❌ Error with auth test:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Profile Completion Endpoint Test\n');
  console.log('='.repeat(50));
  
  const endpointExists = await testEndpointExists();
  
  if (endpointExists) {
    console.log('\n📝 To test with authentication:');
    console.log('1. Login to get a token');
    console.log('2. Replace TOKEN_HERE in this script');
    console.log('3. Uncomment the testWithAuth call below\n');
    
    // Uncomment and add your token here to test with auth
    // const token = 'YOUR_TOKEN_HERE';
    // await testWithAuth(token);
  } else {
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure backend server is running on port 5000');
    console.log('2. Check if profileCompletionController is imported in routes');
    console.log('3. Verify route is registered in profile-enhanced.routes.js');
    console.log('4. Restart the backend server');
  }
}

runTests();