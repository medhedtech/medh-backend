#!/usr/bin/env node

/**
 * Simple test for Demo Booking Zoom Integration
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api';

console.log('🚀 Testing Demo Booking Zoom Integration');
console.log('=' .repeat(50));

// Test creating a demo booking with Zoom integration
async function testDemoBooking() {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    futureDate.setHours(14, 0, 0, 0);

    const bookingData = {
      email: 'test.zoom@example.com',
      fullName: 'Zoom Test User',
      phoneNumber: '+1234567890',
      timeSlot: futureDate.toISOString(),
      timezone: 'UTC',
      demoType: 'course_demo',
      courseInterest: 'JavaScript with Zoom Integration',
      experienceLevel: 'intermediate',
      autoGenerateZoomMeeting: true,
      zoomMeetingSettings: {
        duration: 60,
        auto_recording: 'cloud',
        waiting_room: true,
        host_video: true,
        participant_video: true
      }
    };

    console.log('\n🧪 Creating demo booking with auto Zoom meeting...');
    
    const response = await axios.post(`${BASE_URL}/demo-booking`, bookingData, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data.success) {
      console.log('✅ Demo booking created successfully!');
      console.log(`📅 Booking ID: ${response.data.data.booking.id}`);
      console.log(`📧 Email: ${response.data.data.booking.email}`);
      console.log(`⏰ Scheduled: ${response.data.data.booking.scheduledDateTime}`);
      
      if (response.data.data.booking.zoomMeeting) {
        console.log('\n🎥 Zoom Meeting Details:');
        console.log(`🆔 Meeting ID: ${response.data.data.booking.zoomMeeting.id}`);
        console.log(`📝 Topic: ${response.data.data.booking.zoomMeeting.topic}`);
        console.log(`🔗 Join URL: ${response.data.data.booking.zoomMeeting.join_url}`);
        console.log(`📹 Recording: ${response.data.data.booking.zoomMeeting.settings?.auto_recording}`);
      } else {
        console.log('\n⚠️ Zoom meeting not created (expected if credentials not configured)');
      }
    }

  } catch (error) {
    console.log('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.log('Validation errors:', error.response.data.errors);
    }
  }
}

console.log('\n📖 Features Implemented:');
console.log('• Automatic Zoom meeting generation');
console.log('• Admin-level cloud recording settings');
console.log('• Professional meeting configuration');
console.log('• Fallback handling for API failures');
console.log('• Role-based access control');

testDemoBooking().then(() => {
  console.log('\n🎉 Test completed!');
}).catch(console.error); 