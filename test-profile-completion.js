/**
 * Test script for Profile Completion API
 * Run with: node test-profile-completion.js
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

async function testProfileCompletion() {
  try {
    console.log('🧪 Testing Profile Completion API...\n');

    // Step 1: Login to get auth token
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.data?.token || loginData.token;

    if (!token) {
      throw new Error('No token received from login');
    }

    console.log('✅ Login successful');

    // Step 2: Test profile completion endpoint
    console.log('\n2. Testing profile completion endpoint...');
    const completionResponse = await fetch(`${BASE_URL}/api/v1/profile/me/completion`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!completionResponse.ok) {
      throw new Error(`Profile completion request failed: ${completionResponse.status} ${completionResponse.statusText}`);
    }

    const completionData = await completionResponse.json();
    
    if (!completionData.success) {
      throw new Error(`API returned error: ${completionData.message}`);
    }

    console.log('✅ Profile completion endpoint working');

    // Step 3: Display results
    console.log('\n📊 Profile Completion Results:');
    console.log('================================');
    
    const { overall_completion, category_completion, next_steps } = completionData.data;
    
    console.log(`Overall Completion: ${overall_completion.percentage}%`);
    console.log(`Level: ${overall_completion.level.toUpperCase()}`);
    console.log(`Message: ${overall_completion.message}`);
    
    console.log('\n📋 Category Breakdown:');
    Object.entries(category_completion).forEach(([category, data]) => {
      console.log(`  ${category.replace('_', ' ').toUpperCase()}: ${data.completion_percentage}%`);
      if (data.required_fields) {
        console.log(`    Required: ${data.required_fields.completed}/${data.required_fields.total}`);
      }
      if (data.optional_fields) {
        console.log(`    Optional: ${data.optional_fields.completed}/${data.optional_fields.total}`);
      }
    });

    console.log('\n🎯 Next Steps:');
    if (next_steps.length > 0) {
      next_steps.slice(0, 3).forEach((step, index) => {
        console.log(`  ${index + 1}. ${step.display_name} (${step.priority} priority)`);
      });
    } else {
      console.log('  🎉 Profile is complete!');
    }

    // Step 4: Test error handling
    console.log('\n3. Testing error handling...');
    const invalidResponse = await fetch(`${BASE_URL}/api/v1/profile/me/completion`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json',
      },
    });

    if (invalidResponse.status === 401) {
      console.log('✅ Proper authentication error handling');
    } else {
      console.log('⚠️  Unexpected response for invalid token');
    }

    console.log('\n🎉 All tests passed successfully!');
    
    return {
      success: true,
      completion_percentage: overall_completion.percentage,
      level: overall_completion.level,
      next_steps_count: next_steps.length,
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the test
testProfileCompletion()
  .then((result) => {
    if (result.success) {
      console.log('\n✨ Test Summary:');
      console.log(`   Completion: ${result.completion_percentage}%`);
      console.log(`   Level: ${result.level}`);
      console.log(`   Recommendations: ${result.next_steps_count}`);
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
