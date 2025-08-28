import fetch from 'node-fetch';

async function testLogoutEndpoint() {
  try {
    console.log('\n🔍 Testing Logout API Endpoint');
    console.log('==============================');
    
    // Test the logout endpoint
    const logoutUrl = 'http://localhost:8080/api/v1/auth/logout';
    
    console.log(`📡 Testing endpoint: ${logoutUrl}`);
    
    // First, let's try without authentication (should fail)
    console.log('\n1️⃣ Testing without authentication...');
    try {
      const response = await fetch(logoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: 'test-session'
        })
      });
      
      console.log(`Status: ${response.status}`);
      console.log(`Status Text: ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response:', data);
      } else {
        console.log('Expected failure - endpoint requires authentication');
      }
    } catch (error) {
      console.log('Network error:', error.message);
    }
    
    // Check if the server is running
    console.log('\n2️⃣ Checking if server is running...');
    try {
      const healthResponse = await fetch('http://localhost:8080/api/v1/health', {
        method: 'GET'
      });
      
      console.log(`Health check status: ${healthResponse.status}`);
      if (healthResponse.ok) {
        console.log('✅ Server is running');
      } else {
        console.log('❌ Server responded but health check failed');
      }
    } catch (error) {
      console.log('❌ Server is not running or not accessible:', error.message);
      console.log('Make sure the backend server is running on port 8080');
    }
    
    console.log('\n✅ Endpoint test completed');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testLogoutEndpoint();
