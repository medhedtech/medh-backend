#!/usr/bin/env node

/**
 * Test script to verify batch enrolled students count
 */

import axios from 'axios';
import colors from 'colors';

const BASE_URL = 'http://localhost:8080/api/v1';

class BatchEnrolledCountTester {
  constructor() {
    this.baseURL = BASE_URL;
    this.adminToken = null;
  }

  async makeRequest(method, endpoint, data = null, token = null) {
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        console.log(`   🔍 Debug - Request: ${method} ${endpoint}`.magenta);
        console.log(`   🔍 Debug - Status: ${error.response.status}`.magenta);
        console.log(`   🔍 Debug - Response: ${JSON.stringify(error.response.data, null, 2)}`.magenta);
        throw new Error(`${error.response.status}: ${error.response.data.message || error.response.statusText}`);
      }
      throw error;
    }
  }

  async setupAdminAccess() {
    try {
      const adminCredentials = {
        email: "superadmin@medh.co",
        password: "Admin@123"
      };

      const loginResponse = await this.makeRequest('POST', '/auth/login', adminCredentials);
      this.adminToken = loginResponse.data.access_token;
      console.log(`✓ Admin login successful`.green);
      return this.adminToken;
    } catch (error) {
      throw new Error(`Failed to login admin: ${error.message}`);
    }
  }

  async testBatchEnrolledCount() {
    console.log('\n🧪 Testing Batch Enrolled Students Count'.yellow);
    
    // Get all batches
    const batchesResponse = await this.makeRequest('GET', '/batches?page=1&limit=10&status=Active&sort_by=start_date&sort_order=desc', null, this.adminToken);
    
    console.log(`✓ Retrieved ${batchesResponse.count} batches`.cyan);
    
    if (batchesResponse.data && batchesResponse.data.length > 0) {
      console.log('\n📊 Batch Enrolled Students Count:'.yellow);
      
      for (const batch of batchesResponse.data) {
        console.log(`   Batch: ${batch.batch_name}`.cyan);
        console.log(`   Code: ${batch.batch_code}`.cyan);
        console.log(`   Capacity: ${batch.capacity}`.cyan);
        console.log(`   Enrolled Students: ${batch.enrolled_students}`.green);
        console.log(`   Available Spots: ${batch.capacity - batch.enrolled_students}`.blue);
        
        // Get students in this batch to verify count
        const studentsResponse = await this.makeRequest('GET', `/batches/${batch._id}/students`, null, this.adminToken);
        const actualStudentCount = studentsResponse.totalStudents || 0;
        
        console.log(`   Actual Students (from enrollments): ${actualStudentCount}`.magenta);
        
        if (batch.enrolled_students === actualStudentCount) {
          console.log(`   ✅ Count matches!`.green);
        } else {
          console.log(`   ❌ Count mismatch! Batch shows ${batch.enrolled_students}, but actual is ${actualStudentCount}`.red);
        }
        console.log('   ---');
      }
    } else {
      console.log('   No active batches found'.yellow);
    }
  }

  async run() {
    try {
      console.log('🚀 BATCH ENROLLED STUDENTS COUNT TEST'.blue);
      console.log('====================================='.blue);
      
      await this.setupAdminAccess();
      await this.testBatchEnrolledCount();
      
      console.log('\n✅ Test completed successfully!'.green);
    } catch (error) {
      console.log(`\n❌ Test failed: ${error.message}`.red);
      process.exit(1);
    }
  }
}

// Run the test
const tester = new BatchEnrolledCountTester();
tester.run(); 