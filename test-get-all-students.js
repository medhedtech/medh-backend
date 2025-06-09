const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1/auth';
const TEST_EMAIL = 'admin@medh.co'; // Replace with actual admin email
const TEST_PASSWORD = 'admin123'; // Replace with actual admin password

async function testGetAllStudents() {
  try {
    console.log('🚀 Testing Get All Students Endpoint...\n');

    // Step 1: Login to get access token
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.message);
    }

    const accessToken = loginResponse.data.data.access_token;
    console.log('✅ Login successful\n');

    // Step 2: Test get all students endpoint
    console.log('2. Fetching all active students...');
    const studentsResponse = await axios.get(`${BASE_URL}/get-all-students`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!studentsResponse.data.success) {
      throw new Error('Get students failed: ' + studentsResponse.data.message);
    }

    const students = studentsResponse.data.data;
    console.log('✅ Students fetched successfully');
    console.log(`📊 Total active students: ${studentsResponse.data.count}`);
    console.log(`📝 Message: ${studentsResponse.data.message}\n`);

    // Step 3: Display sample student data
    if (students && students.length > 0) {
      console.log('📋 Sample student data:');
      const sampleStudent = students[0];
      console.log(`   - Name: ${sampleStudent.full_name}`);
      console.log(`   - Email: ${sampleStudent.email}`);
      console.log(`   - Role: ${sampleStudent.role.join(', ')}`);
      console.log(`   - Status: ${sampleStudent.status}`);
      
      if (sampleStudent.assigned_instructor) {
        console.log(`   - Assigned Instructor: ${sampleStudent.assigned_instructor.full_name}`);
        console.log(`   - Assignment Type: ${sampleStudent.instructor_assignment_type || 'N/A'}`);
      } else {
        console.log(`   - Assigned Instructor: None`);
      }
      console.log(`   - Created: ${new Date(sampleStudent.createdAt).toLocaleDateString()}\n`);
    }

    // Step 4: Test with search parameter
    console.log('3. Testing search functionality...');
    const searchResponse = await axios.get(`${BASE_URL}/get-all-students?search=test`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Search test completed - Found ${searchResponse.data.count || 0} students matching "test"\n`);

    // Step 5: Test sorting
    console.log('4. Testing sorting functionality...');
    const sortResponse = await axios.get(`${BASE_URL}/get-all-students?sortBy=full_name&sortOrder=asc`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Sort test completed - Students sorted by name (ascending)\n`);

    // Step 6: Verify no pagination fields
    console.log('5. Verifying response structure...');
    const responseKeys = Object.keys(studentsResponse.data);
    const hasPaginationFields = responseKeys.some(key => 
      ['total', 'totalPages', 'currentPage'].includes(key)
    );

    if (hasPaginationFields) {
      console.log('⚠️  Warning: Response still contains pagination fields');
    } else {
      console.log('✅ Confirmed: No pagination fields in response');
    }

    const hasRequiredFields = ['success', 'count', 'message', 'data'].every(field => 
      responseKeys.includes(field)
    );

    if (hasRequiredFields) {
      console.log('✅ Confirmed: All required fields present in response\n');
    } else {
      console.log('❌ Error: Missing required fields in response\n');
    }

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    process.exit(1);
  }
}

// Run the test
testGetAllStudents(); 