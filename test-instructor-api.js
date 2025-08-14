import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api/v1';

async function testInstructorAPI() {
  try {
    console.log('🔍 Testing Instructor API Endpoint...\n');

    // Test the instructor endpoint
    console.log('📡 Making request to /live-classes/instructors...');
    
    const response = await axios.get(`${BASE_URL}/live-classes/instructors`, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    console.log('✅ API Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data.status === 'success' && response.data.data.items) {
      console.log(`\n🎉 Success! Found ${response.data.data.items.length} instructors:`);
      response.data.data.items.forEach((instructor, index) => {
        console.log(`${index + 1}. ${instructor.full_name} (${instructor.email})`);
      });
    } else {
      console.log('❌ Unexpected response format');
    }

  } catch (error) {
    console.error('❌ API Test Failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testInstructorAPI();
