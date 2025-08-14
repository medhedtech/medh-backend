const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_EMAIL = 'admin@medh.co'; // Replace with actual admin email
const TEST_PASSWORD = 'admin123'; // Replace with actual admin password

async function testLiveSessionFlow() {
  try {
    console.log('🚀 Testing Complete Live Session Flow...\n');

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

    // Step 2: Get initial data (students, grades, dashboards, instructors)
    console.log('2. Fetching initial data...');
    
    const [studentsRes, gradesRes, dashboardsRes, instructorsRes] = await Promise.all([
      axios.get(`${BASE_URL}/live-classes/students`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      axios.get(`${BASE_URL}/live-classes/grades`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      axios.get(`${BASE_URL}/live-classes/dashboards`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      axios.get(`${BASE_URL}/live-classes/instructors`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
    ]);

    console.log('✅ Initial data fetched successfully');
    console.log(`📊 Students: ${studentsRes.data.data?.items?.length || 0}`);
    console.log(`📊 Grades: ${gradesRes.data.data?.length || 0}`);
    console.log(`📊 Dashboards: ${dashboardsRes.data.data?.length || 0}`);
    console.log(`📊 Instructors: ${instructorsRes.data.data?.items?.length || 0}\n`);

    // Step 3: Get initial sessions count
    console.log('3. Getting initial sessions count...');
    const initialSessionsResponse = await axios.get(`${BASE_URL}/live-classes/sessions`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!initialSessionsResponse.data.status === 'success') {
      throw new Error('Get sessions failed: ' + initialSessionsResponse.data.message);
    }

    const initialCount = initialSessionsResponse.data.data?.total || 0;
    console.log(`✅ Initial sessions count: ${initialCount}\n`);

    // Step 4: Create a new test live session
    console.log('4. Creating a new test live session...');
    
    // Get sample data for the session
    const students = studentsRes.data.data?.items || [];
    const grades = gradesRes.data.data || [];
    const dashboards = dashboardsRes.data.data || [];
    const instructors = instructorsRes.data.data?.items || [];

    if (students.length === 0 || grades.length === 0 || dashboards.length === 0 || instructors.length === 0) {
      console.log('⚠️  Skipping session creation - missing required data');
      console.log(`   Students: ${students.length}, Grades: ${grades.length}, Dashboards: ${dashboards.length}, Instructors: ${instructors.length}`);
      return;
    }

    const testSessionData = {
      sessionTitle: `Test Live Session ${Date.now()}`,
      sessionNo: `TEST-${Date.now()}`,
      courseCategory: 'ai-data-science',
      students: [students[0]._id],
      grades: [grades[0]._id],
      dashboard: dashboards[0]._id,
      instructorId: instructors[0]._id,
      video: {
        fileId: 'test-video-id',
        name: 'test-video.mp4',
        size: 1024000
      },
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      remarks: 'This is a test live session created for testing purposes',
      summary: {
        title: 'Test Session Summary',
        description: 'This is a test summary for the live session',
        items: [
          {
            id: Date.now().toString(),
            type: 'Topic',
            title: 'Test Summary Title',
            description: 'Test summary description'
          }
        ]
      }
    };

    const createSessionResponse = await axios.post(`${BASE_URL}/live-classes/sessions`, testSessionData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (createSessionResponse.data.status !== 'success') {
      throw new Error('Create session failed: ' + createSessionResponse.data.message);
    }

    console.log('✅ Test live session created successfully');
    console.log(`📝 Session ID: ${createSessionResponse.data.data.sessionId}`);
    console.log(`📝 Session Title: ${testSessionData.sessionTitle}\n`);

    // Step 5: Verify session appears in the list
    console.log('5. Verifying session appears in the list...');
    const updatedSessionsResponse = await axios.get(`${BASE_URL}/live-classes/sessions`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (updatedSessionsResponse.data.status !== 'success') {
      throw new Error('Get updated sessions failed: ' + updatedSessionsResponse.data.message);
    }

    const updatedCount = updatedSessionsResponse.data.data?.total || 0;
    const sessions = updatedSessionsResponse.data.data?.items || [];
    
    console.log(`✅ Updated sessions count: ${updatedCount}`);
    console.log(`📊 Count difference: ${updatedCount - initialCount}`);

    // Check if the new session is in the list
    const newSession = sessions.find(s => s.sessionTitle === testSessionData.sessionTitle);
    if (newSession) {
      console.log('✅ New session found in the list!');
      console.log(`📝 Session details: ${newSession.sessionTitle} (${newSession.sessionNo})`);
    } else {
      console.log('❌ New session not found in the list');
    }

    // Step 6: Test session retrieval by ID
    console.log('\n6. Testing session retrieval by ID...');
    if (newSession) {
      const sessionByIdResponse = await axios.get(`${BASE_URL}/live-classes/sessions/${newSession._id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (sessionByIdResponse.data.status === 'success') {
        console.log('✅ Session retrieved by ID successfully');
        console.log(`📝 Retrieved session: ${sessionByIdResponse.data.data.sessionTitle}`);
      } else {
        console.log('❌ Failed to retrieve session by ID');
      }
    }

    // Step 7: Test course categories
    console.log('\n7. Testing course categories...');
    const categoriesResponse = await axios.get(`${BASE_URL}/live-classes/course-categories`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (categoriesResponse.data.status === 'success') {
      const categories = categoriesResponse.data.data;
      console.log(`✅ Found ${categories.length} course categories`);
      categories.forEach((category, index) => {
        console.log(`   ${index + 1}. ${category.name} (${category.id})`);
      });
    } else {
      console.log('❌ Failed to fetch course categories');
    }

    console.log('\n🎉 Complete live session flow test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Initial sessions: ${initialCount}`);
    console.log(`   - Final sessions: ${updatedCount}`);
    console.log(`   - New session created: ${testSessionData.sessionTitle}`);
    console.log(`   - Session appears in list: ${newSession ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testLiveSessionFlow();

