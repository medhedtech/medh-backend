import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080/api/v1';

async function testAdminAPI() {
  console.log('🧪 Testing Admin API Endpoints');
  console.log('================================');
  
  const endpoints = [
    '/admin/dashboard-stats',
    '/admin/recent-enrollments?limit=5',
    '/admin/recent-users?limit=5'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing: ${endpoint}`);
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`- Status: ${response.status}`);
      console.log(`- OK: ${response.ok}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`- Success: ${data.success}`);
        console.log(`- Has Data: ${!!data.data}`);
        console.log(`- Data Type: ${typeof data.data}`);
        
        if (Array.isArray(data.data)) {
          console.log(`- Array Length: ${data.data.length}`);
        } else if (data.data && typeof data.data === 'object') {
          console.log(`- Object Keys: ${Object.keys(data.data).join(', ')}`);
        }
      } else {
        const errorText = await response.text();
        console.log(`- Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`- Connection Error: ${error.message}`);
    }
  }
}

testAdminAPI().catch(console.error);

