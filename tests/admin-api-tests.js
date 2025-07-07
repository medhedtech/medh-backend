/**
 * Comprehensive Admin API Testing Suite
 * Tests all admin endpoints following SDLC best practices
 */

import axios from 'axios';
import { expect } from 'chai';

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1/admin`;

// Test data
let authToken = '';
let testUserId = '';
let testCourseId = '';
let testBatchId = '';
let testAnnouncementId = '';
let testBlogId = '';

// Helper function to get auth headers
const getAuthHeaders = () => ({
  'Authorization': `Bearer ${authToken}`,
  'Content-Type': 'application/json'
});

// Test authentication setup
describe('Admin API Test Suite', () => {
  
  before(async () => {
    // Setup: Get admin authentication token
    console.log('🔐 Setting up admin authentication...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
        email: process.env.ADMIN_EMAIL || 'admin@medh.co',
        password: process.env.ADMIN_PASSWORD || 'admin123'
      });
      
      authToken = loginResponse.data.data.accessToken;
      console.log('✅ Admin authentication successful');
    } catch (error) {
      console.error('❌ Admin authentication failed:', error.response?.data || error.message);
      throw new Error('Cannot proceed without admin authentication');
    }
  });

  // 1. DASHBOARD & ANALYTICS TESTS
  describe('📊 Dashboard & Analytics APIs', () => {
    
    it('should get dashboard statistics', async () => {
      const response = await axios.get(`${API_BASE}/dashboard-stats`, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('totalStudents');
      expect(response.data.data).to.have.property('totalInstructors');
      expect(response.data.data).to.have.property('activeEnrollments');
      console.log('✅ Dashboard statistics API working');
    });

    it('should get admin overview', async () => {
      const response = await axios.get(`${API_BASE}/overview`, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('stats');
      expect(response.data.data).to.have.property('recentActivity');
      console.log('✅ Admin overview API working');
    });

    it('should get system statistics', async () => {
      const response = await axios.get(`${API_BASE}/system`, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('totals');
      expect(response.data.data).to.have.property('systemHealth');
      console.log('✅ System statistics API working');
    });

    it('should get payment analytics', async () => {
      const response = await axios.get(`${API_BASE}/payments`, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      console.log('✅ Payment analytics API working');
    });

  });

  // 2. USER MANAGEMENT TESTS
  describe('👥 User Management APIs', () => {
    
    it('should list users with pagination', async () => {
      const response = await axios.get(`${API_BASE}/users?page=1&limit=10`, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('users');
      expect(response.data.data).to.have.property('pagination');
      console.log('✅ User listing API working');
    });

    it('should create a new user', async () => {
      const testUser = {
        email: `test.user.${Date.now()}@test.com`,
        personalInfo: {
          firstName: 'Test',
          lastName: 'User',
          phone: '1234567890'
        },
        role: 'student',
        status: 'active'
      };

      const response = await axios.post(`${API_BASE}/users`, testUser, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(201);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('_id');
      
      testUserId = response.data.data._id;
      console.log('✅ User creation API working');
    });

    it('should get user by ID', async () => {
      if (!testUserId) {
        throw new Error('Test user ID not available');
      }

      const response = await axios.get(`${API_BASE}/users/${testUserId}`, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('user');
      console.log('✅ User details API working');
    });

    it('should update user status', async () => {
      if (!testUserId) {
        throw new Error('Test user ID not available');
      }

      const response = await axios.put(`${API_BASE}/users/${testUserId}/status`, {
        status: 'inactive'
      }, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      console.log('✅ User status update API working');
    });

    it('should perform bulk user operations', async () => {
      if (!testUserId) {
        throw new Error('Test user ID not available');
      }

      const response = await axios.post(`${API_BASE}/users/bulk`, {
        operation: 'activate',
        userIds: [testUserId],
        data: {}
      }, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      console.log('✅ Bulk user operations API working');
    });

  });

  // 3. COURSE MANAGEMENT TESTS
  describe('📚 Course Management APIs', () => {
    
    it('should list courses with filtering', async () => {
      const response = await axios.get(`${API_BASE}/courses?page=1&limit=10`, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('courses');
      console.log('✅ Course listing API working');
    });

    it('should create a new course', async () => {
      const testCourse = {
        title: `Test Course ${Date.now()}`,
        description: 'This is a test course created by automated testing',
        price: 299,
        courseType: 'live',
        status: 'draft'
      };

      const response = await axios.post(`${API_BASE}/courses`, testCourse, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(201);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('_id');
      
      testCourseId = response.data.data._id;
      console.log('✅ Course creation API working');
    });

    it('should update course', async () => {
      if (!testCourseId) {
        throw new Error('Test course ID not available');
      }

      const response = await axios.put(`${API_BASE}/courses/${testCourseId}`, {
        title: 'Updated Test Course',
        price: 399
      }, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      console.log('✅ Course update API working');
    });

    it('should perform bulk course operations', async () => {
      if (!testCourseId) {
        throw new Error('Test course ID not available');
      }

      const response = await axios.post(`${API_BASE}/courses/bulk`, {
        operation: 'updateStatus',
        courseIds: [testCourseId],
        data: { status: 'published' }
      }, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      console.log('✅ Bulk course operations API working');
    });

  });

  // 4. BATCH MANAGEMENT TESTS
  describe('👨‍🏫 Batch Management APIs', () => {
    
    it('should list batches', async () => {
      const response = await axios.get(`${API_BASE}/batches?page=1&limit=10`, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('batches');
      console.log('✅ Batch listing API working');
    });

    it('should create a new batch', async () => {
      if (!testCourseId) {
        throw new Error('Test course ID not available for batch creation');
      }

      const testBatch = {
        name: `Test Batch ${Date.now()}`,
        course: testCourseId,
        capacity: 30,
        startDate: new Date().toISOString(),
        status: 'active'
      };

      const response = await axios.post(`${API_BASE}/batches`, testBatch, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(201);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('_id');
      
      testBatchId = response.data.data._id;
      console.log('✅ Batch creation API working');
    });

    it('should update batch', async () => {
      if (!testBatchId) {
        throw new Error('Test batch ID not available');
      }

      const response = await axios.put(`${API_BASE}/batches/${testBatchId}`, {
        name: 'Updated Test Batch',
        capacity: 40
      }, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      console.log('✅ Batch update API working');
    });

  });

  // 5. ANNOUNCEMENT MANAGEMENT TESTS
  describe('📢 Announcement Management APIs', () => {
    
    it('should list announcements', async () => {
      const response = await axios.get(`${API_BASE}/announcements?page=1&limit=10`, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      console.log('✅ Announcement listing API working');
    });

    it('should create a new announcement', async () => {
      const testAnnouncement = {
        title: `Test Announcement ${Date.now()}`,
        description: 'This is a test announcement created by automated testing',
        priority: 'medium',
        status: 'draft'
      };

      const response = await axios.post(`${API_BASE}/announcements`, testAnnouncement, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(201);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('_id');
      
      testAnnouncementId = response.data.data._id;
      console.log('✅ Announcement creation API working');
    });

  });

  // 6. BLOG MANAGEMENT TESTS
  describe('📝 Blog Management APIs', () => {
    
    it('should list blogs', async () => {
      const response = await axios.get(`${API_BASE}/blogs?page=1&limit=10`, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      console.log('✅ Blog listing API working');
    });

    it('should create a new blog post', async () => {
      const testBlog = {
        title: `Test Blog Post ${Date.now()}`,
        content: 'This is a test blog post created by automated testing',
        status: 'draft'
      };

      const response = await axios.post(`${API_BASE}/blogs`, testBlog, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(201);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('_id');
      
      testBlogId = response.data.data._id;
      console.log('✅ Blog creation API working');
    });

  });

  // 7. ADDITIONAL ANALYTICS TESTS
  describe('📊 Additional Analytics APIs', () => {
    
    it('should get support analytics', async () => {
      const response = await axios.get(`${API_BASE}/support?page=1&limit=10`, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      console.log('✅ Support analytics API working');
    });

    it('should get assessment analytics', async () => {
      const response = await axios.get(`${API_BASE}/assessments?page=1&limit=10`, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      console.log('✅ Assessment analytics API working');
    });

    it('should get corporate training data', async () => {
      const response = await axios.get(`${API_BASE}/corporate-training?page=1&limit=10`, {
        headers: getAuthHeaders()
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      console.log('✅ Corporate training API working');
    });

  });

  // CLEANUP TESTS
  after(async () => {
    console.log('🧹 Cleaning up test data...');
    
    try {
      // Delete test user
      if (testUserId) {
        await axios.delete(`${API_BASE}/users/${testUserId}`, {
          headers: getAuthHeaders()
        });
        console.log('✅ Test user cleaned up');
      }

      // Delete test course
      if (testCourseId) {
        await axios.delete(`${API_BASE}/courses/${testCourseId}`, {
          headers: getAuthHeaders()
        });
        console.log('✅ Test course cleaned up');
      }

      // Delete test batch
      if (testBatchId) {
        await axios.delete(`${API_BASE}/batches/${testBatchId}`, {
          headers: getAuthHeaders()
        });
        console.log('✅ Test batch cleaned up');
      }

      // Delete test announcement
      if (testAnnouncementId) {
        await axios.delete(`${API_BASE}/announcements/${testAnnouncementId}`, {
          headers: getAuthHeaders()
        });
        console.log('✅ Test announcement cleaned up');
      }

      // Delete test blog
      if (testBlogId) {
        await axios.delete(`${API_BASE}/blogs/${testBlogId}`, {
          headers: getAuthHeaders()
        });
        console.log('✅ Test blog cleaned up');
      }

    } catch (error) {
      console.warn('⚠️ Some cleanup operations failed:', error.message);
    }
  });

});

// Error handling and reporting
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});