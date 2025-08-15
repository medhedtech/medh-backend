import { spawn } from 'child_process';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080/api/v1';

async function waitForServer() {
  console.log('⏳ Waiting for server to start...');
  
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) {
        console.log('✅ Server is running!');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('❌ Server failed to start within 30 seconds');
  return false;
}

async function testEndpoints() {
  console.log('\n🔍 Testing API Endpoints...');
  
  const endpoints = [
    '/live-classes/students',
    '/live-classes/instructors',
    '/live-classes/grades',
    '/live-classes/dashboards'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing: ${endpoint}`);
      const response = await fetch(`${BASE_URL}${endpoint}`);
      const data = await response.json();
      
      console.log(`✅ Status: ${response.status}`);
      
      if (data.data && data.data.items) {
        console.log(`📝 Items count: ${data.data.items.length}`);
        if (data.data.items.length > 0) {
          console.log(`📝 Sample item:`, {
            _id: data.data.items[0]._id,
            full_name: data.data.items[0].full_name,
            email: data.data.items[0].email
          });
        }
      } else if (data.data) {
        console.log(`📝 Data:`, data.data);
      }
    } catch (error) {
      console.error(`❌ Error testing ${endpoint}:`, error.message);
    }
  }
}

async function main() {
  console.log('🚀 Starting backend server...');
  
  // Start the server
  const server = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true
  });

  server.stdout.on('data', (data) => {
    console.log(`📡 Server: ${data.toString().trim()}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`❌ Server Error: ${data.toString().trim()}`);
  });

  // Wait for server to start
  const serverReady = await waitForServer();
  
  if (serverReady) {
    // Test endpoints
    await testEndpoints();
    
    console.log('\n✅ All tests completed!');
    console.log('🔄 Server will continue running. Press Ctrl+C to stop.');
    
    // Keep the server running
    server.on('close', (code) => {
      console.log(`\n🔌 Server stopped with code ${code}`);
    });
  } else {
    server.kill();
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

main().catch(console.error);
