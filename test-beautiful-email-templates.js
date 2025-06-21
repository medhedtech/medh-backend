/**
 * Test script for beautiful email templates
 * Run this to test the new login notification and logout all devices email templates
 */

import dotenv from 'dotenv';
dotenv.config();

import EmailService from './services/emailService.js';

async function testBeautifulEmailTemplates() {
  try {
    console.log('🎨 Testing Beautiful Email Templates...\n');
    
    const emailService = new EmailService();
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    
    // Test 1: Beautiful Login Notification Email
    console.log('--- Test 1: Beautiful Login Notification Email ---');
    
    const loginDetails = {
      'Login Time': new Date().toLocaleString('en-US', { 
        dateStyle: 'full',
        timeStyle: 'medium'
      }),
      'Location': 'San Francisco, United States',
      'Device': 'Apple iPhone 13 Pro',
      'Browser': 'Safari 15.0',
      'Operating System': 'iOS 15.2',
      'IP Address': '192.168.1.100'
    };
    
    const recentActivity = {
      total_logins: 12,
      unique_locations: 3,
      unique_devices: 4,
      last_login: 'Dec 15, 2024 at 2:30 PM'
    };
    
    const loginResult = await emailService.sendLoginNotificationEmail(
      testEmail,
      'John Doe',
      loginDetails,
      {
        isNewDevice: true,
        recentActivity: recentActivity,
        actionUrl: 'https://app.medh.co/security',
        logoutAllUrl: 'https://app.medh.co/logout-all-devices'
      }
    );
    
    console.log('✅ Login notification email sent:', loginResult.success ? 'SUCCESS' : 'FAILED');
    console.log('   Risk Level: Medium (new device detected)');
    console.log('   Subject: ⚠️ New Login Detected - Please Review');
    
    // Wait a bit between emails
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Beautiful Logout All Devices Email
    console.log('\n--- Test 2: Beautiful Logout All Devices Email ---');
    
    const logoutDetails = {
      'Logout Time': new Date().toLocaleString('en-US', { 
        dateStyle: 'full',
        timeStyle: 'medium'
      }),
      'Location': 'San Francisco, United States',
      'Initiated From Device': 'Apple MacBook Pro',
      'Browser': 'Chrome 120.0',
      'Operating System': 'macOS Sonoma 14.2',
      'IP Address': '192.168.1.101',
      'Sessions Terminated': '5'
    };
    
    const logoutResult = await emailService.sendLogoutAllDevicesEmail(
      testEmail,
      'John Doe',
      logoutDetails,
      {
        urgent: false,
        actionUrl: 'https://app.medh.co/login',
        supportUrl: 'https://app.medh.co/contact',
        securityRecommendations: [
          "Change your password if you suspect unauthorized access",
          "Review your recent login history",
          "Enable two-factor authentication for added security",
          "Use strong, unique passwords for all accounts",
          "Avoid using public computers for sensitive accounts",
          "Regularly monitor your account activity"
        ]
      }
    );
    
    console.log('✅ Logout all devices email sent:', logoutResult.success ? 'SUCCESS' : 'FAILED');
    console.log('   Sessions terminated: 5');
    console.log('   Subject: 🚪 Logged Out From All Devices - Medh Learning Platform');
    
    // Test 3: High-Risk Login Email
    console.log('\n--- Test 3: High-Risk Login Email ---');
    
    const suspiciousLoginDetails = {
      'Login Time': new Date().toLocaleString('en-US', { 
        dateStyle: 'full',
        timeStyle: 'medium'
      }),
      'Location': 'Unknown, Unknown',
      'Device': 'Unknown Device',
      'Browser': 'Unknown Browser',
      'Operating System': 'Unknown OS',
      'IP Address': '203.0.113.1' // Public IP example
    };
    
    const highRiskResult = await emailService.sendLoginNotificationEmail(
      testEmail,
      'John Doe',
      suspiciousLoginDetails,
      {
        isNewDevice: true,
        recentFailedAttempts: 5,
        unusualTime: true,
        actionUrl: 'https://app.medh.co/security',
        logoutAllUrl: 'https://app.medh.co/logout-all-devices'
      }
    );
    
    console.log('✅ High-risk login email sent:', highRiskResult.success ? 'SUCCESS' : 'FAILED');
    console.log('   Risk Level: High (suspicious activity detected)');
    console.log('   Subject: 🚨 Suspicious Login Detected - Immediate Action Required');
    
    // Test 4: Urgent Logout All Devices Email
    console.log('\n--- Test 4: Urgent Logout All Devices Email ---');
    
    const urgentLogoutResult = await emailService.sendLogoutAllDevicesEmail(
      testEmail,
      'John Doe',
      logoutDetails,
      {
        urgent: true,
        actionUrl: 'https://app.medh.co/login',
        supportUrl: 'https://app.medh.co/contact'
      }
    );
    
    console.log('✅ Urgent logout email sent:', urgentLogoutResult.success ? 'SUCCESS' : 'FAILED');
    console.log('   Urgency: High');
    console.log('   Subject: 🚨 Security Alert: All Sessions Terminated - Medh Learning Platform');
    
    console.log('\n🎉 All beautiful email template tests completed!');
    console.log(`📧 Check your inbox at ${testEmail} to see the beautiful emails.`);
    
    console.log('\n📊 Email Features Demonstrated:');
    console.log('   ✨ Modern gradient backgrounds and beautiful styling');
    console.log('   🎯 Risk-based email subjects and content');
    console.log('   📱 Mobile-responsive design');
    console.log('   🔒 Security recommendations and tips');
    console.log('   📈 Recent activity summaries');
    console.log('   🎨 Visual icons and emojis');
    console.log('   💎 Professional branding');
    console.log('   ⚡ Call-to-action buttons');
    console.log('   🛡️ Security-focused messaging');
    
  } catch (error) {
    console.error('❌ Error testing email templates:', error.message);
    console.error('Stack:', error.stack);
    
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('   1. Make sure TEST_EMAIL is set in your .env file');
    console.log('   2. Verify your email service configuration');
    console.log('   3. Check if Redis is running for email queue');
    console.log('   4. Ensure all email template files exist in templates/ directory');
  }
}

// Auto-run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testBeautifulEmailTemplates();
}

export default testBeautifulEmailTemplates; 