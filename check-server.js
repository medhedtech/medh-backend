const axios = require('axios');

async function checkBackendServer() {
  console.log('🔍 Checking Backend Server Status');
  console.log('==================================');
  
  const baseUrl = 'http://localhost:8080';
  
  try {
    console.log(`📡 Testing connection to ${baseUrl}...`);
    
    // Test basic connectivity
    const response = await axios.get(`${baseUrl}/api/v1/live-classes/students`, {
      timeout: 5000
    });
    
    console.log('✅ Backend server is running!');
    console.log(`📋 Status: ${response.status}`);
    console.log(`📋 Response: ${response.data.status || 'OK'}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Backend server is not running or not accessible');
    console.error('📋 Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status
    });
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Solution: Start your backend server with:');
      console.log('   npm start');
      console.log('   or');
      console.log('   node server.js');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Solution: Check if the server is running on the correct port (8080)');
    }
    
    return false;
  }
}

// Run the check
checkBackendServer().then(isRunning => {
  if (isRunning) {
    console.log('\n🎉 Backend server is ready for video uploads!');
  } else {
    console.log('\n⚠️  Please start the backend server before testing video uploads');
  }
});
