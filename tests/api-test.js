const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:8080/api/v1';
let authToken = '';

// Test configuration
const config = {
  auth: {
    email: 'test@example.com',
    password: 'testpassword'
  }
};

const testEndpoints = async () => {
  console.log('\n🚀 Starting API Tests...\n'.cyan);

  try {
    // Auth Tests
    console.log('📝 Testing Auth Endpoints...'.yellow);
    await testAuth();

    // Categories
    console.log('\n📚 Testing Category Endpoints...'.yellow);
    await testCategories();

    // Courses
    console.log('\n📖 Testing Course Endpoints...'.yellow);
    await testCourses();

    // Students
    console.log('\n👨‍🎓 Testing Student Endpoints...'.yellow);
    await testStudents();

    // Instructors
    console.log('\n👨‍🏫 Testing Instructor Endpoints...'.yellow);
    await testInstructors();

    // Quizzes
    console.log('\n❓ Testing Quiz Endpoints...'.yellow);
    await testQuizzes();

    // Assignments
    console.log('\n📝 Testing Assignment Endpoints...'.yellow);
    await testAssignments();

    // Subscriptions
    console.log('\n💳 Testing Subscription Endpoints...'.yellow);
    await testSubscriptions();

    console.log('\n✅ All tests completed successfully!\n'.green);
  } catch (error) {
    console.error('\n❌ Test failed:'.red, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status code:', error.response.status);
    }
  }
};

const testAuth = async () => {
  try {
    // Register
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email: config.auth.email,
      password: config.auth.password,
      full_name: 'Test User'
    });
    logSuccess('Register', registerResponse);

    // Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: config.auth.email,
      password: config.auth.password
    });
    logSuccess('Login', loginResponse);
    authToken = loginResponse.data.token;

  } catch (error) {
    if (error.response?.status === 409) {
      // User already exists, try login
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: config.auth.email,
        password: config.auth.password
      });
      logSuccess('Login', loginResponse);
      authToken = loginResponse.data.token;
    } else {
      throw error;
    }
  }
};

const testCategories = async () => {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Get all categories
  const categoriesResponse = await axios.get(`${BASE_URL}/categories`, { headers });
  logSuccess('Get Categories', categoriesResponse);
};

const testCourses = async () => {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Get all courses
  const coursesResponse = await axios.get(`${BASE_URL}/courses`, { headers });
  logSuccess('Get Courses', coursesResponse);
};

const testStudents = async () => {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Get all students
  const studentsResponse = await axios.get(`${BASE_URL}/students`, { headers });
  logSuccess('Get Students', studentsResponse);
};

const testInstructors = async () => {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Get all instructors
  const instructorsResponse = await axios.get(`${BASE_URL}/instructors`, { headers });
  logSuccess('Get Instructors', instructorsResponse);
};

const testQuizzes = async () => {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Get all quizzes
  const quizzesResponse = await axios.get(`${BASE_URL}/quizes`, { headers });
  logSuccess('Get Quizzes', quizzesResponse);
};

const testAssignments = async () => {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Get all assignments
  const assignmentsResponse = await axios.get(`${BASE_URL}/assignments`, { headers });
  logSuccess('Get Assignments', assignmentsResponse);
};

const testSubscriptions = async () => {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Get all subscriptions
  const subscriptionsResponse = await axios.get(`${BASE_URL}/subscription`, { headers });
  logSuccess('Get Subscriptions', subscriptionsResponse);
};

const logSuccess = (endpoint, response) => {
  console.log(`  ✓ ${endpoint}`.green);
  if (process.env.DEBUG) {
    console.log('    Response:', JSON.stringify(response.data, null, 2));
  }
};

// Run tests
testEndpoints(); 