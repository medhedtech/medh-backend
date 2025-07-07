#!/usr/bin/env node

/**
 * Simple Admin API Test Runner
 * Tests all admin endpoints and reports issues
 */

import axios from 'axios';
import fs from 'fs';

// Configuration
const BASE_URL = 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1/admin`;

// Test credentials (you may need to update these)
const ADMIN_CREDENTIALS = {
  email: 'superadmin@medh.co',
  password: 'Admin@123'
};

// Global variables
let authToken = '';
let testResults = [];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Helper functions
const log = (message, color = 'reset') => {
  console.log(colors[color] + message + colors.reset);
};

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${authToken}`,
  'Content-Type': 'application/json'
});

// Test result recording
const recordTest = (endpoint, method, status, error = null) => {
  testResults.push({
    endpoint,
    method,
    status,
    error: error?.message || null,
    timestamp: new Date().toISOString()
  });
};

// Authentication setup
async function setupAuthentication() {
  log('\n🔐 Setting up admin authentication...', 'blue');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, ADMIN_CREDENTIALS);
    authToken = response.data.data?.accessToken || response.data.accessToken;
    
    if (!authToken) {
      throw new Error('No access token received');
    }
    
    log('✅ Admin authentication successful', 'green');
    return true;
  } catch (error) {
    log(`❌ Admin authentication failed: ${error.response?.data?.message || error.message}`, 'red');
    log('💡 Please ensure:', 'yellow');
    log('   - Server is running on port 8080', 'yellow');
    log('   - Admin user exists with correct credentials', 'yellow');
    log('   - Database is connected', 'yellow');
    return false;
  }
}

// Test individual endpoint
async function testEndpoint(method, endpoint, data = null, description = '') {
  try {
    const config = {
      method: method.toLowerCase(),
      url: `${API_BASE}${endpoint}`,
      headers: getAuthHeaders()
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    if (response.status >= 200 && response.status < 300) {
      log(`✅ ${method} ${endpoint} - ${description}`, 'green');
      recordTest(endpoint, method, 'PASS');
      return { success: true, data: response.data };
    } else {
      log(`⚠️  ${method} ${endpoint} - Unexpected status: ${response.status}`, 'yellow');
      recordTest(endpoint, method, 'WARN', new Error(`Status: ${response.status}`));
      return { success: false, error: `Status: ${response.status}` };
    }
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    
    if (status === 404) {
      log(`❌ ${method} ${endpoint} - Not Found (404) - ${description}`, 'red');
      recordTest(endpoint, method, 'FAIL', new Error('Endpoint not found'));
    } else if (status === 500) {
      log(`❌ ${method} ${endpoint} - Server Error (500) - ${message}`, 'red');
      recordTest(endpoint, method, 'FAIL', new Error(`Server error: ${message}`));
    } else {
      log(`❌ ${method} ${endpoint} - ${status || 'Network Error'} - ${message}`, 'red');
      recordTest(endpoint, method, 'FAIL', error);
    }
    
    return { success: false, error: message, status };
  }
}

// Main test suite
async function runAllTests() {
  log('\n🚀 Starting Admin API Test Suite', 'blue');
  log('=====================================', 'blue');
  
  // Test authentication first
  const authSuccess = await setupAuthentication();
  if (!authSuccess) {
    log('\n❌ Cannot proceed without authentication. Exiting.', 'red');
    return;
  }
  
  // Test data for creation operations
  const timestamp = Date.now();
  const testUser = {
    email: `test.user.${timestamp}@test.com`,
    personalInfo: {
      firstName: 'Test',
      lastName: 'User',
      phone: '1234567890'
    },
    role: 'student',
    status: 'active'
  };
  
  const testCourse = {
    title: `Test Course ${timestamp}`,
    description: 'Test course for API testing',
    price: 299,
    courseType: 'live',
    status: 'draft'
  };
  
  const testAnnouncement = {
    title: `Test Announcement ${timestamp}`,
    description: 'Test announcement for API testing',
    priority: 'medium',
    status: 'draft'
  };
  
  const testBlog = {
    title: `Test Blog ${timestamp}`,
    content: 'Test blog content for API testing',
    status: 'draft'
  };
  
  // Variables to store created IDs
  let createdUserId = null;
  let createdCourseId = null;
  let createdBatchId = null;
  let createdAnnouncementId = null;
  let createdBlogId = null;
  
  log('\n📊 Testing Dashboard & Analytics APIs...', 'blue');
  
  // Dashboard & Analytics Tests
  await testEndpoint('GET', '/dashboard-stats', null, 'Dashboard statistics');
  await testEndpoint('GET', '/overview', null, 'Admin overview');
  await testEndpoint('GET', '/system', null, 'System statistics');
  await testEndpoint('GET', '/payments?page=1&limit=5', null, 'Payment analytics');
  await testEndpoint('GET', '/support?page=1&limit=5', null, 'Support analytics');
  await testEndpoint('GET', '/assessments?page=1&limit=5', null, 'Assessment analytics');
  await testEndpoint('GET', '/corporate-training?page=1&limit=5', null, 'Corporate training analytics');
  
  log('\n👥 Testing User Management APIs...', 'blue');
  
  // User Management Tests
  await testEndpoint('GET', '/users?page=1&limit=5', null, 'List users');
  
  // Create test user
  const userCreateResult = await testEndpoint('POST', '/users', testUser, 'Create user');
  if (userCreateResult.success) {
    createdUserId = userCreateResult.data?.data?._id;
    
    if (createdUserId) {
      await testEndpoint('GET', `/users/${createdUserId}`, null, 'Get user by ID');
      await testEndpoint('PUT', `/users/${createdUserId}`, { status: 'inactive' }, 'Update user');
      await testEndpoint('PUT', `/users/${createdUserId}/status`, { status: 'active' }, 'Update user status');
      
      // Test bulk operations
      await testEndpoint('POST', '/users/bulk', {
        operation: 'updateStatus',
        userIds: [createdUserId],
        data: { status: 'active' }
      }, 'Bulk user operations');
    }
  }
  
  log('\n📚 Testing Course Management APIs...', 'blue');
  
  // Course Management Tests
  await testEndpoint('GET', '/courses?page=1&limit=5', null, 'List courses');
  
  // Create test course
  const courseCreateResult = await testEndpoint('POST', '/courses', testCourse, 'Create course');
  if (courseCreateResult.success) {
    createdCourseId = courseCreateResult.data?.data?._id;
    
    if (createdCourseId) {
      await testEndpoint('PUT', `/courses/${createdCourseId}`, { price: 399 }, 'Update course');
      
      // Test bulk operations
      await testEndpoint('POST', '/courses/bulk', {
        operation: 'updateStatus',
        courseIds: [createdCourseId],
        data: { status: 'published' }
      }, 'Bulk course operations');
    }
  }
  
  log('\n👨‍🏫 Testing Batch Management APIs...', 'blue');
  
  // Batch Management Tests
  await testEndpoint('GET', '/batches?page=1&limit=5', null, 'List batches');
  
  // Create test batch (if we have a course)
  if (createdCourseId) {
    const testBatch = {
      name: `Test Batch ${timestamp}`,
      course: createdCourseId,
      capacity: 30,
      status: 'active'
    };
    
    const batchCreateResult = await testEndpoint('POST', '/batches', testBatch, 'Create batch');
    if (batchCreateResult.success) {
      createdBatchId = batchCreateResult.data?.data?._id;
      
      if (createdBatchId) {
        await testEndpoint('PUT', `/batches/${createdBatchId}`, { capacity: 40 }, 'Update batch');
        
        // Test bulk operations
        await testEndpoint('POST', '/batches/bulk', {
          operation: 'updateStatus',
          batchIds: [createdBatchId],
          data: { status: 'active' }
        }, 'Bulk batch operations');
      }
    }
  }
  
  log('\n📝 Testing Enrollment Management APIs...', 'blue');
  
  // Enrollment Management Tests
  await testEndpoint('GET', '/enrollments?page=1&limit=5', null, 'List enrollments');
  
  // Test bulk enrollment operations (with empty array if no enrollments)
  await testEndpoint('POST', '/enrollments/bulk', {
    operation: 'updateStatus',
    enrollmentIds: [],
    data: { status: 'active' }
  }, 'Bulk enrollment operations');
  
  log('\n📢 Testing Announcement Management APIs...', 'blue');
  
  // Announcement Management Tests
  await testEndpoint('GET', '/announcements?page=1&limit=5', null, 'List announcements');
  
  // Create test announcement
  const announcementCreateResult = await testEndpoint('POST', '/announcements', testAnnouncement, 'Create announcement');
  if (announcementCreateResult.success) {
    createdAnnouncementId = announcementCreateResult.data?.data?._id;
    
    if (createdAnnouncementId) {
      await testEndpoint('PUT', `/announcements/${createdAnnouncementId}`, { priority: 'high' }, 'Update announcement');
      
      // Test bulk operations
      await testEndpoint('POST', '/announcements/bulk', {
        operation: 'updateStatus',
        announcementIds: [createdAnnouncementId],
        data: { status: 'published' }
      }, 'Bulk announcement operations');
    }
  }
  
  log('\n📝 Testing Blog Management APIs...', 'blue');
  
  // Blog Management Tests
  await testEndpoint('GET', '/blogs?page=1&limit=5', null, 'List blogs');
  
  // Create test blog
  const blogCreateResult = await testEndpoint('POST', '/blogs', testBlog, 'Create blog');
  if (blogCreateResult.success) {
    createdBlogId = blogCreateResult.data?.data?._id;
    
    if (createdBlogId) {
      await testEndpoint('PUT', `/blogs/${createdBlogId}`, { status: 'published' }, 'Update blog');
      
      // Test bulk operations
      await testEndpoint('POST', '/blogs/bulk', {
        operation: 'updateStatus',
        blogIds: [createdBlogId],
        data: { status: 'published' }
      }, 'Bulk blog operations');
    }
  }
  
  // Cleanup created test data
  log('\n🧹 Cleaning up test data...', 'blue');
  
  if (createdUserId) {
    await testEndpoint('DELETE', `/users/${createdUserId}`, null, 'Delete test user');
  }
  
  if (createdBlogId) {
    await testEndpoint('DELETE', `/blogs/${createdBlogId}`, null, 'Delete test blog');
  }
  
  if (createdAnnouncementId) {
    await testEndpoint('DELETE', `/announcements/${createdAnnouncementId}`, null, 'Delete test announcement');
  }
  
  if (createdBatchId) {
    await testEndpoint('DELETE', `/batches/${createdBatchId}`, null, 'Delete test batch');
  }
  
  if (createdCourseId) {
    await testEndpoint('DELETE', `/courses/${createdCourseId}`, null, 'Delete test course');
  }
  
  // Generate test report
  generateTestReport();
}

// Generate test report
function generateTestReport() {
  log('\n📋 Test Results Summary', 'blue');
  log('=======================', 'blue');
  
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.status === 'PASS').length;
  const failedTests = testResults.filter(r => r.status === 'FAIL').length;
  const warnTests = testResults.filter(r => r.status === 'WARN').length;
  
  log(`\nTotal Tests: ${totalTests}`, 'blue');
  log(`✅ Passed: ${passedTests}`, 'green');
  log(`❌ Failed: ${failedTests}`, 'red');
  log(`⚠️  Warnings: ${warnTests}`, 'yellow');
  log(`📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`, 'blue');
  
  // Show failed tests
  if (failedTests > 0) {
    log('\n❌ Failed Tests:', 'red');
    testResults
      .filter(r => r.status === 'FAIL')
      .forEach(test => {
        log(`   ${test.method} ${test.endpoint} - ${test.error}`, 'red');
      });
  }
  
  // Save detailed report to file
  const reportData = {
    summary: {
      totalTests,
      passedTests,
      failedTests,
      warnTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(2) + '%'
    },
    tests: testResults,
    timestamp: new Date().toISOString()
  };
  
  try {
    fs.writeFileSync('admin-api-test-report.json', JSON.stringify(reportData, null, 2));
    log('\n📄 Detailed report saved to: admin-api-test-report.json', 'blue');
  } catch (error) {
    log('\n⚠️ Could not save detailed report to file', 'yellow');
  }
  
  log('\n🎯 Test Summary:', 'blue');
  if (failedTests === 0) {
    log('🎉 All tests passed! Admin APIs are working correctly.', 'green');
  } else {
    log(`⚠️ ${failedTests} test(s) failed. Please check the issues above.`, 'yellow');
  }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    log(`\n💥 Test runner crashed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}