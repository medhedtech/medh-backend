const axios = require('axios');
const assert = require('assert');
require('dotenv').config();

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.medh.co/api/v1/zoom'
  : 'http://localhost:8080/api/v1/zoom';

describe('Zoom API Tests', () => {
  // Test data
  const testMeeting = {
    topic: 'Test Meeting',
    agenda: 'Testing Zoom API Integration',
    startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    duration: 30,
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      mute_upon_entry: true,
      auto_recording: 'none',
      waiting_room: true
    }
  };

  let createdMeetingId;

  // Test creating a meeting
  it('should create a new Zoom meeting', async () => {
    try {
      const response = await axios.post(`${BASE_URL}/meetings`, testMeeting);
      
      assert.strictEqual(response.status, 201);
      assert.ok(response.data.id);
      assert.ok(response.data.join_url);
      assert.ok(response.data.start_url);
      
      createdMeetingId = response.data.id;
      console.log('Meeting created successfully:', response.data);
    } catch (error) {
      console.error('Error creating meeting:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test generating signature
  it('should generate a valid meeting signature', async () => {
    try {
      const response = await axios.post(`${BASE_URL}/signature`, {
        meetingNumber: createdMeetingId,
        role: 0 // 0 for attendee, 1 for host
      });

      assert.strictEqual(response.status, 200);
      assert.ok(response.data.signature);
      console.log('Signature generated successfully:', response.data);
    } catch (error) {
      console.error('Error generating signature:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test webhook validation
  it('should validate webhook challenge', async () => {
    try {
      const challenge = 'test_challenge_123';
      const response = await axios.get(`${BASE_URL}/webhook?challenge=${challenge}`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.challenge, challenge);
      console.log('Webhook validation successful:', response.data);
    } catch (error) {
      console.error('Error validating webhook:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test webhook handling
  it('should handle webhook events', async () => {
    try {
      const webhookEvent = {
        event: 'meeting.started',
        payload: {
          object: {
            id: createdMeetingId,
            host_id: 'test_host_id',
            topic: testMeeting.topic,
            start_time: testMeeting.startTime,
            duration: testMeeting.duration
          }
        }
      };

      const response = await axios.post(`${BASE_URL}/webhook`, webhookEvent, {
        headers: {
          'x-zm-signature': 'test_signature',
          'x-zm-request-timestamp': Date.now().toString()
        }
      });

      assert.strictEqual(response.status, 200);
      assert.ok(response.data.success);
      console.log('Webhook handling successful:', response.data);
    } catch (error) {
      console.error('Error handling webhook:', error.response?.data || error.message);
      throw error;
    }
  });
}); 