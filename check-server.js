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
