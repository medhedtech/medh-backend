import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api/v1';

const testSessionData = {
  sessionTitle: "Test Session",
  sessionNo: "999",
  students: ["507f1f77bcf86cd799439011"], // Mock student ID
  grades: ["507f1f77bcf86cd799439012"], // Mock grade ID
  dashboard: "507f1f77bcf86cd799439013", // Mock dashboard ID
  instructorId: "507f1f77bcf86cd799439014", // Mock instructor ID
  date: "2024-01-01",
  summary: {
    title: "Test Summary",
    description: "Test Description",
    items: []
  }
};

async function testSessionEndpoint() {
  try {
    console.log('🧪 Testing session creation endpoint...');
    console.log('📝 Test data:', JSON.stringify(testSessionData, null, 2));
    
    const response = await axios.post(`${BASE_URL}/live-classes/sessions`, testSessionData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Success! Response:', response.data);
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', response.headers);
    
  } catch (error) {
    console.error('❌ Error testing session endpoint:');
    console.error('📊 Status:', error.response?.status);
    console.error('📋 Status Text:', error.response?.statusText);
    console.error('📝 Response Data:', error.response?.data);
    console.error('🔍 Error Message:', error.message);
    console.error('🌐 URL:', error.config?.url);
    console.error('📤 Request Data:', error.config?.data);
  }
}

testSessionEndpoint();
