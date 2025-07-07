/**
 * Test Configuration for Admin API Testing
 */

export const testConfig = {
  // Server configuration
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:8080',
  apiVersion: 'v1',
  
  // Authentication
  adminCredentials: {
    email: process.env.ADMIN_EMAIL || 'admin@medh.co',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  },
  
  // Test data templates
  testUser: {
    email: null, // Will be set dynamically
    personalInfo: {
      firstName: 'Test',
      lastName: 'User',
      phone: '1234567890'
    },
    role: 'student',
    status: 'active'
  },
  
  testCourse: {
    title: null, // Will be set dynamically
    description: 'This is a test course created by automated testing',
    price: 299,
    courseType: 'live',
    status: 'draft'
  },
  
  testBatch: {
    name: null, // Will be set dynamically
    capacity: 30,
    status: 'active'
  },
  
  testAnnouncement: {
    title: null, // Will be set dynamically
    description: 'This is a test announcement created by automated testing',
    priority: 'medium',
    status: 'draft'
  },
  
  testBlog: {
    title: null, // Will be set dynamically
    content: 'This is a test blog post created by automated testing',
    status: 'draft'
  },
  
  // Test options
  timeouts: {
    default: 10000,
    slow: 30000
  },
  
  // Pagination defaults
  pagination: {
    page: 1,
    limit: 10
  }
};