const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_EMAIL = 'admin@medh.co'; // Replace with actual admin email
const TEST_PASSWORD = 'admin123'; // Replace with actual admin password

async function testStudentFlow() {
  try {
    console.log('🚀 Testing Complete Student Flow...\n');

    // Step 1: Login to get access token
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.message);
    }

    const accessToken = loginResponse.data.data.access_token;
    console.log('✅ Login successful\n');

    // Step 2: Get initial students count
    console.log('2. Getting initial students count...');
    const initialStudentsResponse = await axios.get(`${BASE_URL}/students/get`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!initialStudentsResponse.data.success) {
      throw new Error('Get students failed: ' + initialStudentsResponse.data.message);
    }

    const initialCount = initialStudentsResponse.data.data.total;
    console.log(`✅ Initial students count: ${initialCount}\n`);

    // Step 3: Create a new test student
    console.log('3. Creating a new test student...');
    const testStudentData = {
      full_name: `Test Student ${Date.now()}`,
      email: `teststudent${Date.now()}@example.com`,
      password: 'TestPassword123!',
      role: ['student']
    };

    const createStudentResponse = await axios.post(`${BASE_URL}/students/create`, testStudentData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!createStudentResponse.data.success) {
      throw new Error('Create student failed: ' + createStudentResponse.data.message);
    }

    console.log('✅ Test student created successfully');
    console.log(`📝 Student ID: ${createStudentResponse.data.data._id}`);
    console.log(`📧 Email: ${testStudentData.email}\n`);

    // Step 4: Verify student appears in the list
    console.log('4. Verifying student appears in the list...');
    const updatedStudentsResponse = await axios.get(`${BASE_URL}/students/get`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!updatedStudentsResponse.data.success) {
      throw new Error('Get updated students failed: ' + updatedStudentsResponse.data.message);
    }

    const updatedCount = updatedStudentsResponse.data.data.total;
    const students = updatedStudentsResponse.data.data.items;
    
    console.log(`✅ Updated students count: ${updatedCount}`);
    console.log(`📊 Count difference: ${updatedCount - initialCount}`);

    // Check if the new student is in the list
    const newStudent = students.find(s => s.email === testStudentData.email);
    if (newStudent) {
      console.log('✅ New student found in the list!');
      console.log(`📝 Student details: ${newStudent.full_name} (${newStudent.email})`);
    } else {
      console.log('❌ New student not found in the list');
    }

    // Step 5: Test search functionality
    console.log('\n5. Testing search functionality...');
    const searchResponse = await axios.get(`${BASE_URL}/students/get?search=${testStudentData.full_name}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (searchResponse.data.success) {
      const searchResults = searchResponse.data.data.items;
      console.log(`✅ Search found ${searchResults.length} matching students`);
      
      if (searchResults.length > 0) {
        console.log('📝 Search results:');
        searchResults.forEach((student, index) => {
          console.log(`   ${index + 1}. ${student.full_name} (${student.email})`);
        });
      }
    } else {
      console.log('❌ Search failed');
    }

    console.log('\n🎉 Complete student flow test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Initial students: ${initialCount}`);
    console.log(`   - Final students: ${updatedCount}`);
    console.log(`   - New student created: ${testStudentData.email}`);
    console.log(`   - Student appears in list: ${newStudent ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testStudentFlow();

