#!/usr/bin/env node

/**
 * Test script for instructor assignment functionality
 * This script tests the new instructor assignment routes
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1/auth';

// Test data
const testData = {
  instructor: {
    full_name: "Test Instructor",
    email: "test.instructor@example.com",
    phone_number: "1234567890",
    password: "password123",
    domain: "Computer Science"
  },
  student: {
    full_name: "Test Student",
    email: "test.student@example.com",
    phone_number: "0987654321",
    password: "password123"
  },
  course: {
    course_title: "Test Course",
    user_id: null // Will be set after instructor creation
  }
};

let authToken = '';
let instructorId = '';
let studentId = '';

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

async function testInstructorAssignment() {
  console.log('🚀 Starting Instructor Assignment Tests...\n');

  try {
    // 1. Create an instructor
    console.log('1. Creating test instructor...');
    const instructorResponse = await makeRequest('POST', '/create', testData.instructor);
    instructorId = instructorResponse.instructor._id;
    console.log(`✅ Instructor created with ID: ${instructorId}\n`);

    // 2. Create a student (register)
    console.log('2. Creating test student...');
    const studentResponse = await makeRequest('POST', '/register', testData.student);
    studentId = studentResponse.user._id;
    console.log(`✅ Student created with ID: ${studentId}\n`);

    // 3. Login as admin (you might need to create an admin user first)
    console.log('3. Logging in as admin...');
    try {
      const loginResponse = await makeRequest('POST', '/login', {
        email: 'admin@example.com', // Replace with actual admin credentials
        password: 'admin123'
      });
      authToken = loginResponse.token;
      console.log('✅ Admin login successful\n');
    } catch (error) {
      console.log('⚠️  Admin login failed, continuing without auth token...\n');
    }

    // 4. Test instructor-to-course assignment
    console.log('4. Testing instructor-to-course assignment...');
    testData.course.user_id = instructorId;
    try {
      const courseAssignmentResponse = await makeRequest(
        'POST', 
        '/assign-instructor-to-course',
        testData.course,
        authToken ? { Authorization: `Bearer ${authToken}` } : {}
      );
      console.log('✅ Instructor assigned to course successfully');
      console.log(`   Message: ${courseAssignmentResponse.message}\n`);
    } catch (error) {
      console.log('❌ Course assignment failed (this might be expected if course doesn\'t exist)\n');
    }

    // 5. Test instructor-to-student assignment
    console.log('5. Testing instructor-to-student assignment...');
    const studentAssignmentData = {
      instructor_id: instructorId,
      student_id: studentId,
      assignment_type: 'mentor',
      notes: 'Test assignment for mentoring'
    };
    
    try {
      const studentAssignmentResponse = await makeRequest(
        'POST',
        '/assign-instructor-to-student',
        studentAssignmentData,
        authToken ? { Authorization: `Bearer ${authToken}` } : {}
      );
      console.log('✅ Instructor assigned to student successfully');
      console.log(`   Student: ${studentAssignmentResponse.data.student_name}`);
      console.log(`   Instructor: ${studentAssignmentResponse.data.instructor_name}`);
      console.log(`   Type: ${studentAssignmentResponse.data.assignment_type}\n`);
    } catch (error) {
      console.log('❌ Student assignment failed\n');
    }

    // 6. Test getting students assigned to instructor
    console.log('6. Testing get students assigned to instructor...');
    try {
      const assignedStudentsResponse = await makeRequest(
        'GET',
        `/instructor-students/${instructorId}`,
        null,
        authToken ? { Authorization: `Bearer ${authToken}` } : {}
      );
      console.log('✅ Retrieved assigned students successfully');
      console.log(`   Total students: ${assignedStudentsResponse.data.total_students}`);
      console.log(`   Students: ${assignedStudentsResponse.data.assigned_students.map(s => s.full_name).join(', ')}\n`);
    } catch (error) {
      console.log('❌ Failed to get assigned students\n');
    }

    // 7. Test getting instructor assignments
    console.log('7. Testing get all instructor assignments...');
    try {
      const allAssignmentsResponse = await makeRequest(
        'GET',
        '/instructor-assignments',
        null,
        authToken ? { Authorization: `Bearer ${authToken}` } : {}
      );
      console.log('✅ Retrieved all instructor assignments successfully');
      console.log(`   Total assignments: ${allAssignmentsResponse.length}\n`);
    } catch (error) {
      console.log('❌ Failed to get instructor assignments\n');
    }

    // 8. Test enhanced student endpoint
    console.log('8. Testing enhanced students with instructors endpoint...');
    try {
      const enhancedStudentsResponse = await makeRequest(
        'GET',
        '/get-all-students-with-instructors?page=1&limit=5&has_instructor=true',
        null,
        authToken ? { Authorization: `Bearer ${authToken}` } : {}
      );
      console.log('✅ Enhanced students endpoint working');
      console.log(`   Total students: ${enhancedStudentsResponse.total}`);
      console.log(`   Students with instructors: ${enhancedStudentsResponse.statistics?.studentsWithInstructor || 'N/A'}`);
      console.log(`   Students without instructors: ${enhancedStudentsResponse.statistics?.studentsWithoutInstructor || 'N/A'}\n`);
    } catch (error) {
      console.log('❌ Failed to test enhanced students endpoint\n');
    }

    // 9. Test enhanced courses endpoint
    console.log('9. Testing enhanced courses with instructors endpoint...');
    try {
      const enhancedCoursesResponse = await makeRequest(
        'GET',
        '/get-all-courses-with-instructors?page=1&limit=5',
        null,
        authToken ? { Authorization: `Bearer ${authToken}` } : {}
      );
      console.log('✅ Enhanced courses endpoint working');
      console.log(`   Total courses: ${enhancedCoursesResponse.total}`);
      console.log(`   Courses with instructors: ${enhancedCoursesResponse.statistics?.coursesWithInstructor || 'N/A'}`);
      console.log(`   Courses without instructors: ${enhancedCoursesResponse.statistics?.coursesWithoutInstructor || 'N/A'}\n`);
    } catch (error) {
      console.log('❌ Failed to test enhanced courses endpoint\n');
    }

    // 10. Test unassigning instructor from student
    console.log('10. Testing unassign instructor from student...');
    try {
      const unassignResponse = await makeRequest(
        'DELETE',
        `/unassign-instructor-from-student/${studentId}`,
        null,
        authToken ? { Authorization: `Bearer ${authToken}` } : {}
      );
      console.log('✅ Instructor unassigned from student successfully');
      console.log(`   Message: ${unassignResponse.message}\n`);
    } catch (error) {
      console.log('❌ Failed to unassign instructor from student\n');
    }

    console.log('🎉 All tests completed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
testInstructorAssignment().catch(console.error); 