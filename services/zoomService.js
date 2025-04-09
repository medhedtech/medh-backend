const axios = require('axios');
const crypto = require('crypto');
const qs = require('querystring');

class ZoomService {
  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.secretToken = process.env.ZOOM_SECRET_TOKEN;
    this.verificationToken = process.env.ZOOM_VERIFICATION_TOKEN;
    this.baseUrl = 'https://api.zoom.us/v2';
    this.tokenCache = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    try {
      // Check if we have a valid cached token
      if (this.tokenCache && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.tokenCache;
      }

      // Prepare the request for server-to-server OAuth
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const response = await axios.post('https://zoom.us/oauth/token', 
        qs.stringify({
          grant_type: 'account_credentials',
          account_id: this.accountId,
          scope: 'meeting:write:meeting meeting:write:meeting:admin meeting:read:meeting meeting:read:meeting:admin user:read:user:admin user:read:user user:write user:write:admin'
        }), {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // Cache the token
      this.tokenCache = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      return this.tokenCache;
    } catch (error) {
      console.error('Error getting Zoom access token:', error.response?.data || error.message);
      if (error.response?.data?.reason === 'Invalid client_id or client_secret') {
        console.error('Please check your ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET environment variables');
      }
      throw error;
    }
  }

  async createMeeting(meetingData) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.post(`${this.baseUrl}/users/me/meetings`, {
        topic: meetingData.topic,
        type: meetingData.type || 2, // 2 for scheduled meeting
        start_time: meetingData.start_time,
        duration: meetingData.duration || 30,
        timezone: meetingData.timezone || 'UTC',
        agenda: meetingData.agenda,
        settings: {
          host_video: meetingData.settings?.host_video ?? true,
          participant_video: meetingData.settings?.participant_video ?? true,
          join_before_host: meetingData.settings?.join_before_host ?? false,
          mute_upon_entry: meetingData.settings?.mute_upon_entry ?? true,
          auto_recording: meetingData.settings?.auto_recording ?? 'none',
          waiting_room: meetingData.settings?.waiting_room ?? true,
          registration_type: meetingData.settings?.registration_type ?? 1, // 1 for required registration
          close_registration: meetingData.settings?.close_registration ?? false,
          registrants_confirmation_email: meetingData.settings?.registrants_confirmation_email ?? true,
          registrants_email_notification: meetingData.settings?.registrants_email_notification ?? true,
          ...meetingData.settings
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error creating Zoom meeting:', error.response?.data || error.message);
      throw error;
    }
  }

  async getMeeting(meetingId) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${this.baseUrl}/meetings/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting Zoom meeting:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateMeeting(meetingId, updateData) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.patch(`${this.baseUrl}/meetings/${meetingId}`, updateData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating Zoom meeting:', error.response?.data || error.message);
      throw error;
    }
  }

  async deleteMeeting(meetingId) {
    try {
      const token = await this.getAccessToken();
      await axios.delete(`${this.baseUrl}/meetings/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return true;
    } catch (error) {
      console.error('Error deleting Zoom meeting:', error.response?.data || error.message);
      throw error;
    }
  }

  async listMeetings(userId = 'me', options = {}) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${this.baseUrl}/users/${userId}/meetings`, {
        params: {
          type: options.type || 'scheduled',
          page_size: options.page_size || 30,
          page_number: options.page_number || 1,
          ...options
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error listing Zoom meetings:', error.response?.data || error.message);
      throw error;
    }
  }

  async addMeetingRegistrant(meetingId, registrantData) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.post(`${this.baseUrl}/meetings/${meetingId}/registrants`, registrantData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error adding meeting registrant:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateRegistrantStatus(meetingId, registrantData) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.put(`${this.baseUrl}/meetings/${meetingId}/registrants/status`, registrantData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating registrant status:', error.response?.data || error.message);
      throw error;
    }
  }

  generateSignature(meetingNumber, role = 0) {
    try {
      const timestamp = new Date().getTime() - 30000;
      const msg = Buffer.from(this.clientId + meetingNumber + timestamp + role).toString('base64');
      const hash = crypto.createHmac('sha256', this.clientSecret).update(msg).digest('base64');
      return Buffer.from(`${this.clientId}.${meetingNumber}.${timestamp}.${role}.${hash}`).toString('base64');
    } catch (error) {
      console.error('Error generating signature:', error);
      throw error;
    }
  }

  verifyWebhook(signature, timestamp, rawBody) {
    try {
      const message = `v0:${timestamp}:${rawBody}`;
      const hash = crypto
        .createHmac('sha256', this.secretToken)
        .update(message)
        .digest('hex');
      const expectedSignature = `v0=${hash}`;
      return signature === expectedSignature;
    } catch (error) {
      console.error('Error verifying webhook:', error);
      return false;
    }
  }

  async processRecording(recordingData) {
    try {
      const accessToken = await this.getAccessToken();
      
      // Get recording download URL
      const response = await axios.get(
        `${this.baseUrl}/meetings/${recordingData.meeting_id}/recordings`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      // Process the recording data
      return {
        ...recordingData,
        download_url: response.data.recording_files?.[0]?.download_url
      };
    } catch (error) {
      console.error('Error processing recording:', error.response?.data || error.message);
      throw error;
    }
  }

  async getUserProfile(userId = 'me') {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${this.baseUrl}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting user profile:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateUserProfile(userId = 'me', updateData) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.patch(`${this.baseUrl}/users/${userId}`, updateData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error.response?.data || error.message);
      throw error;
    }
  }

  async listUsers(options = {}) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${this.baseUrl}/users`, {
        params: {
          status: options.status || 'active',
          role_id: options.role_id,
          page_size: options.page_size || 30,
          page_number: options.page_number || 1,
          ...options
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error listing users:', error.response?.data || error.message);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.post(`${this.baseUrl}/users`, userData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error.response?.data || error.message);
      throw error;
    }
  }

  async deleteUser(userId, action = 'disassociate') {
    try {
      const token = await this.getAccessToken();
      await axios.delete(`${this.baseUrl}/users/${userId}`, {
        params: { action },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return true;
    } catch (error) {
      console.error('Error deleting user:', error.response?.data || error.message);
      throw error;
    }
  }

  // Recording Management
  async listRecordings(userId = 'me', options = {}) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${this.baseUrl}/users/${userId}/recordings`, {
        params: {
          page_size: options.page_size || 30,
          page_number: options.page_number || 1,
          from: options.from, // Format: YYYY-MM-DD
          to: options.to, // Format: YYYY-MM-DD
          ...options
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error listing recordings:', error.response?.data || error.message);
      throw error;
    }
  }

  async getMeetingRecordings(meetingId) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${this.baseUrl}/meetings/${meetingId}/recordings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting meeting recordings:', error.response?.data || error.message);
      throw error;
    }
  }

  async deleteRecording(meetingId, recordingId) {
    try {
      const token = await this.getAccessToken();
      await axios.delete(`${this.baseUrl}/meetings/${meetingId}/recordings/${recordingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return true;
    } catch (error) {
      console.error('Error deleting recording:', error.response?.data || error.message);
      throw error;
    }
  }

  async getRecordingSettings(meetingId) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${this.baseUrl}/meetings/${meetingId}/recordings/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting recording settings:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateRecordingSettings(meetingId, settings) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.patch(`${this.baseUrl}/meetings/${meetingId}/recordings/settings`, settings, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating recording settings:', error.response?.data || error.message);
      throw error;
    }
  }

  // Audio Transcription
  async getMeetingAudioTranscript(meetingId) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${this.baseUrl}/meetings/${meetingId}/recordings/transcript`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting meeting transcript:', error.response?.data || error.message);
      throw error;
    }
  }

  // Classroom Management
  async createClassroomMeeting(userId = 'me', classroomData) {
    try {
      const token = await this.getAccessToken();
      // Set specific settings for a classroom environment
      const response = await axios.post(`${this.baseUrl}/users/${userId}/meetings`, {
        topic: classroomData.topic,
        type: classroomData.type || 2, // 2 for scheduled meeting
        start_time: classroomData.start_time,
        duration: classroomData.duration || 60,
        timezone: classroomData.timezone || 'UTC',
        agenda: classroomData.agenda,
        settings: {
          host_video: classroomData.settings?.host_video ?? true,
          participant_video: classroomData.settings?.participant_video ?? true,
          join_before_host: classroomData.settings?.join_before_host ?? false,
          mute_upon_entry: classroomData.settings?.mute_upon_entry ?? true,
          auto_recording: classroomData.settings?.auto_recording ?? 'cloud', // Default to cloud recording
          waiting_room: classroomData.settings?.waiting_room ?? true,
          registration_type: classroomData.settings?.registration_type ?? 1, // 1 for required registration
          approval_type: classroomData.settings?.approval_type ?? 0, // Auto approve
          registrants_confirmation_email: true,
          registrants_email_notification: true,
          meeting_authentication: true, // Only authenticated users can join
          audio: 'both',
          // Classroom-specific settings
          breakout_room: classroomData.settings?.breakout_room ?? {
            enable: true
          },
          show_share_button: classroomData.settings?.show_share_button ?? true,
          allow_multiple_devices: classroomData.settings?.allow_multiple_devices ?? true,
          ...classroomData.settings
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating classroom meeting:', error.response?.data || error.message);
      throw error;
    }
  }

  async getRegistrants(meetingId, options = {}) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${this.baseUrl}/meetings/${meetingId}/registrants`, {
        params: {
          status: options.status || 'approved',
          page_size: options.page_size || 30,
          page_number: options.page_number || 1,
          ...options
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting meeting registrants:', error.response?.data || error.message);
      throw error;
    }
  }

  async generateJoinLink(meetingId, registrantId) {
    try {
      // First, get the meeting details
      const meetingDetails = await this.getMeeting(meetingId);
      
      // Then, build the join URL
      const joinUrl = `${meetingDetails.join_url}?registrant_id=${registrantId}`;
      
      return {
        join_url: joinUrl,
        meeting_id: meetingId,
        registrant_id: registrantId
      };
    } catch (error) {
      console.error('Error generating join link:', error);
      throw error;
    }
  }

  async getInvitation(meetingId) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${this.baseUrl}/meetings/${meetingId}/invitation`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting meeting invitation:', error.response?.data || error.message);
      throw error;
    }
  }

  // Classroom User Roles
  async createInstructorUser(userData) {
    try {
      const token = await this.getAccessToken();
      // Create a user with specific type and role
      const response = await axios.post(`${this.baseUrl}/users`, {
        action: 'create',
        user_info: {
          email: userData.email,
          type: userData.type || 2, // 2 for Licensed
          first_name: userData.first_name,
          last_name: userData.last_name,
          password: userData.password,
          feature: {
            zoom_phone: false,
            zoom_rooms: false
          },
          // Assign Pro license with admin privileges
          role_id: userData.role_id || '0'  // Default to Owner role
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating instructor user:', error.response?.data || error.message);
      throw error;
    }
  }

  async createStudentUser(userData) {
    try {
      const token = await this.getAccessToken();
      // Create a user with basic privileges
      const response = await axios.post(`${this.baseUrl}/users`, {
        action: 'create',
        user_info: {
          email: userData.email,
          type: userData.type || 1, // 1 for Basic
          first_name: userData.first_name,
          last_name: userData.last_name,
          password: userData.password,
          feature: {
            zoom_phone: false,
            zoom_rooms: false
          }
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating student user:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new ZoomService(); 