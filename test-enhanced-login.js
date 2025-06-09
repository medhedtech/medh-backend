/**
 * Test script for Enhanced Login Analytics System
 * 
 * This script tests the new login analytics functionality including:
 * - Login count tracking
 * - Device detection
 * - Login history recording
 * - Analytics calculation
 */

import axios from 'axios';
import { ENV_VARS } from './config/envVars.js';

const BASE_URL = ENV_VARS.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1/auth`;

// Test configuration
const TEST_CONFIG = {
  testUser: {
    email: 'test.analytics@medh.co',
    password: 'TestPassword123',
    full_name: 'Analytics Test User',
    phone_numbers: [
      {
        country: 'US',
        number: '+1234567890',
        type: 'MOBILE'
      }
    ],
    agree_terms: true,
    role: ['student']
  },
  userAgents: [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
  ]
};

class LoginAnalyticsTest {
  constructor() {
    this.testUserId = null;
    this.accessToken = null;
    this.refreshToken = null;
  }

  /**
   * Run all tests
   */
  async runTests() {
    console.log('🚀 Starting Enhanced Login Analytics Tests\n');

    try {
      await this.testUserRegistration();
      await this.testMultipleLogins();
      await this.testLoginAnalytics();
      await this.testSystemAnalytics();
      await this.testUserActivitySummary();
      await this.cleanup();

      console.log('✅ All tests completed successfully!');
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      console.error('Stack:', error.stack);
      await this.cleanup();
      process.exit(1);
    }
  }

  /**
   * Test user registration
   */
  async testUserRegistration() {
    console.log('📝 Testing user registration...');

    try {
      const response = await axios.post(`${API_BASE}/register`, TEST_CONFIG.testUser);
      
      if (response.data.success) {
        console.log('✅ User registered successfully');
        this.testUserId = response.data.data.id;
        
        // Simulate email verification
        console.log('📧 Simulating email verification...');
        // Note: In a real test, you'd need to verify the email with OTP
        // For this test, we'll manually activate the user
      } else {
        throw new Error('Registration failed: ' + response.data.message);
      }
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log('⚠️  User already exists, proceeding with login tests...');
        // Try to login to get user ID
        await this.performLogin(TEST_CONFIG.testUser.email, TEST_CONFIG.testUser.password);
      } else {
        throw error;
      }
    }
  }

  /**
   * Test multiple logins with different devices
   */
  async testMultipleLogins() {
    console.log('\n🔄 Testing multiple logins with different devices...');

    for (let i = 0; i < TEST_CONFIG.userAgents.length; i++) {
      const userAgent = TEST_CONFIG.userAgents[i];
      console.log(`  Login ${i + 1}/4 with ${this.getDeviceType(userAgent)}...`);

      try {
        const response = await axios.post(
          `${API_BASE}/login`,
          {
            email: TEST_CONFIG.testUser.email,
            password: TEST_CONFIG.testUser.password
          },
          {
            headers: {
              'User-Agent': userAgent,
              'X-Forwarded-For': `192.168.1.${100 + i}` // Simulate different IPs
            }
          }
        );

        if (response.data.success) {
          console.log(`    ✅ Login successful - Count: ${response.data.data.login_stats?.login_count || 'N/A'}`);
          
          if (i === 0) {
            this.accessToken = response.data.data.access_token;
            this.refreshToken = response.data.data.refresh_token;
            this.testUserId = response.data.data.id;
          }

          // Add delay between logins to simulate realistic usage
          await this.sleep(1000);
        } else {
          throw new Error(`Login ${i + 1} failed: ${response.data.message}`);
        }
      } catch (error) {
        console.error(`    ❌ Login ${i + 1} failed:`, error.response?.data?.message || error.message);
      }
    }
  }

  /**
   * Test individual user login analytics
   */
  async testLoginAnalytics() {
    console.log('\n📊 Testing individual user login analytics...');

    if (!this.testUserId || !this.accessToken) {
      throw new Error('No test user ID or access token available');
    }

    try {
      const response = await axios.get(
        `${API_BASE}/login-analytics/${this.testUserId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (response.data.success) {
        const analytics = response.data.data;
        console.log('✅ Login analytics retrieved successfully');
        console.log(`  📈 Total logins: ${analytics.login_statistics.total_logins}`);
        console.log(`  📱 Unique devices: ${analytics.login_statistics.unique_devices}`);
        console.log(`  🌐 Unique IPs: ${analytics.login_statistics.unique_ips}`);
        console.log(`  📊 Device preference: ${analytics.user_patterns.device_preference}`);
        console.log(`  🔒 Security score: ${analytics.security_analysis.security_score}`);
        console.log(`  ⚡ Login pattern: ${analytics.user_patterns.login_pattern.description}`);
        
        // Validate analytics data
        this.validateAnalyticsData(analytics);
      } else {
        throw new Error('Failed to retrieve login analytics: ' + response.data.message);
      }
    } catch (error) {
      throw new Error('Login analytics test failed: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Test system-wide analytics
   */
  async testSystemAnalytics() {
    console.log('\n🌍 Testing system-wide login analytics...');

    try {
      const response = await axios.get(
        `${API_BASE}/system-login-analytics?timeframe=30d`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (response.data.success) {
        const systemData = response.data.data;
        console.log('✅ System analytics retrieved successfully');
        console.log(`  👥 Total users: ${systemData.overview.total_users}`);
        console.log(`  🔢 Total logins: ${systemData.overview.total_logins}`);
        console.log(`  📊 Activity rate: ${systemData.overview.activity_rate}%`);
        console.log(`  📱 Mobile usage: ${systemData.device_distribution.mobile.percentage}%`);
        console.log(`  💻 Desktop usage: ${systemData.device_distribution.desktop.percentage}%`);
      } else {
        throw new Error('Failed to retrieve system analytics: ' + response.data.message);
      }
    } catch (error) {
      throw new Error('System analytics test failed: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Test user activity summary
   */
  async testUserActivitySummary() {
    console.log('\n📋 Testing user activity summary...');

    try {
      const response = await axios.get(
        `${API_BASE}/user-activity-summary?page=1&limit=5&activity_level=high`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (response.data.success) {
        const summary = response.data;
        console.log('✅ User activity summary retrieved successfully');
        console.log(`  📄 Total pages: ${summary.pagination.total_pages}`);
        console.log(`  👤 Total users: ${summary.pagination.total_users}`);
        console.log(`  📊 Users returned: ${summary.data.length}`);
        
        if (summary.data.length > 0) {
          const firstUser = summary.data[0];
          console.log(`  🏆 Most active user: ${firstUser.full_name} (${firstUser.login_count} logins)`);
        }
      } else {
        throw new Error('Failed to retrieve user activity summary: ' + response.data.message);
      }
    } catch (error) {
      throw new Error('User activity summary test failed: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Validate analytics data structure and values
   */
  validateAnalyticsData(analytics) {
    console.log('  🔍 Validating analytics data structure...');

    // Check required fields
    const requiredFields = [
      'user_info',
      'login_statistics',
      'recent_login_history',
      'user_patterns',
      'security_analysis'
    ];

    for (const field of requiredFields) {
      if (!analytics[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate login statistics
    const stats = analytics.login_statistics;
    if (stats.total_logins < 1) {
      throw new Error('Total logins should be at least 1');
    }

    if (stats.unique_devices < 1) {
      throw new Error('Should have at least 1 unique device');
    }

    // Validate security score
    const securityScore = analytics.security_analysis.security_score;
    if (securityScore < 0 || securityScore > 100) {
      throw new Error('Security score should be between 0 and 100');
    }

    console.log('  ✅ Analytics data validation passed');
  }

  /**
   * Cleanup test data
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');

    if (this.testUserId && this.accessToken) {
      try {
        // Note: In a real scenario, you might want to delete the test user
        // For now, we'll just log out
        await axios.post(
          `${API_BASE}/logout`,
          { refresh_token: this.refreshToken },
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`
            }
          }
        );
        console.log('✅ Test user logged out successfully');
      } catch (error) {
        console.log('⚠️  Logout failed (this is okay for testing):', error.response?.data?.message || error.message);
      }
    }
  }

  /**
   * Helper method to perform login
   */
  async performLogin(email, password, userAgent = null) {
    const headers = {};
    if (userAgent) {
      headers['User-Agent'] = userAgent;
    }

    const response = await axios.post(
      `${API_BASE}/login`,
      { email, password },
      { headers }
    );

    if (response.data.success) {
      this.accessToken = response.data.data.access_token;
      this.refreshToken = response.data.data.refresh_token;
      this.testUserId = response.data.data.id;
    }

    return response;
  }

  /**
   * Get device type from user agent
   */
  getDeviceType(userAgent) {
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Macintosh')) return 'Mac';
    return 'Unknown Device';
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new LoginAnalyticsTest();
  test.runTests().catch(console.error);
}

export default LoginAnalyticsTest; 