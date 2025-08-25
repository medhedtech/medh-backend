  
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
// Simple script to check if the backend server is running
import http from 'http';

const checkServer = () => {
  console.log('🔍 Checking if backend server is running...');
  
  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/v1/health',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log('✅ Server is running!');
    console.log(`📊 Status: ${res.statusCode}`);
    console.log(`🌐 URL: http://localhost:8080`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('📦 Response:', response);
      } catch (e) {
        console.log('📦 Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Server is not running');
    console.log('💡 To start the server:');
    console.log('   1. Open a terminal in the medh-backend directory');
    console.log('   2. Run: npm run dev');
    console.log('   3. Or double-click: start-server.bat');
  });

  req.on('timeout', () => {
    console.log('⏰ Request timed out - server might be starting up');
    req.destroy();
  });

  req.end();
};

checkServer();
