import axios from 'axios';
import mongoose from 'mongoose';

// Configuration
const BASE_URL = 'http://localhost:8080';
const API_KEY = 'your-admin-api-key'; // Replace with actual admin key
const TEST_COURSE_ID = '67c053498a56e7688ddc04bd'; // Replace with actual course ID from your system

/**
 * Test Individual vs Batch Enrollment System
 */
class EnhancedEnrollmentTester {
  constructor() {
    this.axios = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Helper method to make authenticated requests
  async makeRequest(method, endpoint, data = null, token = null) {
    try {
      const config = {
        method,
        url: endpoint,
        ...(data && { data }),
        ...(token && { headers: { Authorization: `Bearer ${token}` } })
      };
      
      const response = await this.axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status
      };
    }
  }

  // Test 1: Get Course Pricing Information
  async testCoursePricing() {
    console.log('\n🧪 Testing Course Pricing...');
    
    // Test individual pricing
    const individualPricing = await this.makeRequest(
      'GET',
      `/api/enhanced-payments/course-pricing/${TEST_COURSE_ID}?enrollment_type=individual&currency=INR`
    );
    
    if (individualPricing.success) {
      console.log('✅ Individual pricing retrieved:', {
        finalPrice: individualPricing.data.data.pricing.finalPrice,
        pricingType: individualPricing.data.data.pricing.pricingType,
        currency: individualPricing.data.data.pricing.currency
      });
    } else {
      console.log('❌ Individual pricing failed:', individualPricing.error);
    }

    // Test batch pricing
    const batchPricing = await this.makeRequest(
      'GET',
      `/api/enhanced-payments/course-pricing/${TEST_COURSE_ID}?enrollment_type=batch&batch_size=5&currency=INR`
    );
    
    if (batchPricing.success) {
      console.log('✅ Batch pricing retrieved:', {
        finalPrice: batchPricing.data.data.pricing.finalPrice,
        pricingType: batchPricing.data.data.pricing.pricingType,
        currency: batchPricing.data.data.pricing.currency
      });
    } else {
      console.log('❌ Batch pricing failed:', batchPricing.error);
    }

    return { individualPricing, batchPricing };
  }

  // Test 2: Get Available Batches
  async testAvailableBatches() {
    console.log('\n🧪 Testing Available Batches...');
    
    const batches = await this.makeRequest(
      'GET',
      `/api/enhanced-payments/course-batches/${TEST_COURSE_ID}`
    );
    
    if (batches.success) {
      console.log('✅ Available batches retrieved:', {
        count: batches.data.count,
        batches: batches.data.data.map(batch => ({
          name: batch.batch_name,
          availableSpots: batch.available_spots,
          startDate: batch.start_date
        }))
      });
    } else {
      console.log('❌ Available batches failed:', batches.error);
    }

    return batches;
  }

  // Test 3: Create Individual Enrollment Order (requires authentication)
  async testIndividualEnrollmentOrder(studentToken) {
    console.log('\n🧪 Testing Individual Enrollment Order...');
    
    const orderData = {
      course_id: TEST_COURSE_ID,
      enrollment_type: 'individual',
      currency: 'INR',
      payment_plan: 'full'
    };

    const order = await this.makeRequest(
      'POST',
      '/api/enhanced-payments/create-enrollment-order',
      orderData,
      studentToken
    );
    
    if (order.success) {
      console.log('✅ Individual enrollment order created:', {
        orderId: order.data.data.order_id,
        amount: order.data.data.amount,
        currency: order.data.data.currency,
        enrollmentType: order.data.data.enrollment_data.enrollmentType
      });
    } else {
      console.log('❌ Individual enrollment order failed:', order.error);
    }

    return order;
  }

  // Test 4: Create Batch Enrollment Order (requires authentication and batch ID)
  async testBatchEnrollmentOrder(studentToken, batchId) {
    console.log('\n🧪 Testing Batch Enrollment Order...');
    
    const orderData = {
      course_id: TEST_COURSE_ID,
      enrollment_type: 'batch',
      batch_id: batchId,
      batch_size: 3,
      currency: 'INR',
      payment_plan: 'full',
      batch_members: [] // Empty for testing, would contain student IDs in real scenario
    };

    const order = await this.makeRequest(
      'POST',
      '/api/enhanced-payments/create-enrollment-order',
      orderData,
      studentToken
    );
    
    if (order.success) {
      console.log('✅ Batch enrollment order created:', {
        orderId: order.data.data.order_id,
        amount: order.data.data.amount,
        currency: order.data.data.currency,
        enrollmentType: order.data.data.enrollment_data.enrollmentType,
        batchSize: order.data.data.enrollment_data.batchSize
      });
    } else {
      console.log('❌ Batch enrollment order failed:', order.error);
    }

    return order;
  }

  // Test 5: Get Enrollment Dashboard (requires authentication)
  async testEnrollmentDashboard(studentToken) {
    console.log('\n🧪 Testing Enrollment Dashboard...');
    
    const dashboard = await this.makeRequest(
      'GET',
      '/api/enhanced-payments/enrollment-dashboard',
      null,
      studentToken
    );
    
    if (dashboard.success) {
      console.log('✅ Enrollment dashboard retrieved:', {
        totalEnrollments: dashboard.data.data.stats.total_enrollments,
        activeEnrollments: dashboard.data.data.stats.active_enrollments,
        individualEnrollments: dashboard.data.data.stats.individual_enrollments,
        batchEnrollments: dashboard.data.data.stats.batch_enrollments,
        totalAmountPaid: dashboard.data.data.stats.total_amount_paid
      });
    } else {
      console.log('❌ Enrollment dashboard failed:', dashboard.error);
    }

    return dashboard;
  }

  // Test 6: Admin Enrollment Statistics (requires admin authentication)
  async testAdminEnrollmentStats(adminToken) {
    console.log('\n🧪 Testing Admin Enrollment Statistics...');
    
    const stats = await this.makeRequest(
      'GET',
      '/api/enhanced-payments/admin/enrollment-stats',
      null,
      adminToken
    );
    
    if (stats.success) {
      console.log('✅ Admin enrollment stats retrieved:', {
        totalActive: stats.data.data.totalActive,
        totalCompleted: stats.data.data.totalCompleted,
        individualEnrollments: stats.data.data.individualEnrollments,
        batchEnrollments: stats.data.data.batchEnrollments
      });
    } else {
      console.log('❌ Admin enrollment stats failed:', stats.error);
    }

    return stats;
  }

  // Helper: Create test student (for demo purposes)
  async createTestStudent() {
    console.log('\n🧪 Creating Test Student...');
    
    const testStudent = {
      full_name: 'Test Student',
      email: `test.student.${Date.now()}@example.com`,
      phone_numbers: [{ country: '+1', number: '1234567890' }],
      password: 'TestPassword123!',
      agree_terms: true,
      role: ['student']
    };

    const student = await this.makeRequest('POST', '/api/v1/auth/create', testStudent);
    
    if (student.success) {
      console.log('✅ Test student created:', {
        id: student.data.user._id,
        email: student.data.user.email
      });
      
      // Login to get token
      const login = await this.makeRequest('POST', '/api/v1/auth/signin', {
        email: testStudent.email,
        password: testStudent.password
      });
      
      if (login.success) {
        console.log('✅ Student logged in successfully');
        return {
          student: student.data.user,
          token: login.data.token
        };
      } else {
        console.log('❌ Student login failed:', login.error);
        return null;
      }
    } else {
      console.log('❌ Student creation failed:', student.error);
      return null;
    }
  }

  // Run comprehensive test suite
  async runTests() {
    console.log('🚀 Starting Enhanced Enrollment System Tests\n');
    console.log('=' * 60);

    try {
      // Test public endpoints (no authentication required)
      await this.testCoursePricing();
      
      const batchesResult = await this.testAvailableBatches();
      const firstBatchId = batchesResult.success && batchesResult.data.data.length > 0 
        ? batchesResult.data.data[0]._id 
        : null;

      // Create test student for authenticated endpoints
      const studentData = await this.createTestStudent();
      
      if (studentData) {
        // Test authenticated student endpoints
        await this.testIndividualEnrollmentOrder(studentData.token);
        
        if (firstBatchId) {
          await this.testBatchEnrollmentOrder(studentData.token, firstBatchId);
        } else {
          console.log('⚠️ Skipping batch enrollment test - no available batches');
        }
        
        await this.testEnrollmentDashboard(studentData.token);
      } else {
        console.log('⚠️ Skipping authenticated tests - student creation failed');
      }

      // Note: Admin tests would require actual admin credentials
      console.log('\n⚠️ Admin tests require valid admin credentials and are skipped in demo');

      console.log('\n' + '=' * 60);
      console.log('✅ Enhanced Enrollment System Tests Completed');

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    }
  }
}

// Usage example
async function main() {
  const tester = new EnhancedEnrollmentTester();
  await tester.runTests();
}

// Manual test functions for specific scenarios
export async function testPricingComparison() {
  const tester = new EnhancedEnrollmentTester();
  console.log('🔍 Comparing Individual vs Batch Pricing...');
  
  const result = await tester.testCoursePricing();
  
  if (result.individualPricing.success && result.batchPricing.success) {
    const individualPrice = result.individualPricing.data.data.pricing.finalPrice;
    const batchPrice = result.batchPricing.data.data.pricing.finalPrice;
    const savings = individualPrice - batchPrice;
    
    console.log(`\n💰 Pricing Comparison:
    Individual: ₹${individualPrice}
    Batch (5 people): ₹${batchPrice}
    Potential Savings: ₹${savings} (${((savings/individualPrice)*100).toFixed(1)}%)`);
  }
}

export async function testBatchCapacity() {
  const tester = new EnhancedEnrollmentTester();
  console.log('🔍 Testing Batch Capacity Management...');
  
  const batches = await tester.testAvailableBatches();
  
  if (batches.success) {
    batches.data.data.forEach(batch => {
      const utilizationPercentage = ((batch.enrolled_students / batch.capacity) * 100).toFixed(1);
      console.log(`\n📊 Batch: ${batch.batch_name}
      Capacity: ${batch.enrolled_students}/${batch.capacity} (${utilizationPercentage}% utilized)
      Available Spots: ${batch.available_spots}
      Status: ${batch.status}`);
    });
  }
}

// Export for use in other files or run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default EnhancedEnrollmentTester; 