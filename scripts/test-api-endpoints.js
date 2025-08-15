import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080/api/v1';

async function testAPIEndpoints() {
  console.log('🔍 Testing API Endpoints...');
  console.log('📡 Base URL:', BASE_URL);

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
      console.log(`📊 Response:`, JSON.stringify(data, null, 2));
      
      if (data.data && data.data.items) {
        console.log(`📝 Items count: ${data.data.items.length}`);
        if (data.data.items.length > 0) {
          console.log(`📝 Sample item:`, data.data.items[0]);
        }
      }
    } catch (error) {
      console.error(`❌ Error testing ${endpoint}:`, error.message);
    }
  }
}

// Run the test
testAPIEndpoints();
