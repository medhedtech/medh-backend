import http from 'http';

const testServer = () => {
  console.log('🔍 Testing if backend server is running...');
  
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
    console.log('❌ Server is not running or not accessible');
    console.log('💡 Error:', error.message);
    console.log('💡 To start the server:');
    console.log('   1. Make sure you are in the medh-backend directory');
    console.log('   2. Run: npm run dev:local');
    console.log('   3. Or run: NODE_ENV=development REDIS_ENABLED=false node index.js');
  });

  req.on('timeout', () => {
    console.log('⏰ Request timed out - server might be starting up');
    req.destroy();
  });

  req.end();
};

testServer();
