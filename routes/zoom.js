const express = require('express');
const router = express.Router();
const zoomService = require('../services/zoomService');

// Create a new Zoom meeting
router.post('/meetings', async (req, res) => {
  try {
    const meetingDetails = await zoomService.createMeeting(req.body);
    res.status(201).json({
      message: 'Meeting created successfully',
      ...meetingDetails
    });
  } catch (error) {
    console.error('Error creating Zoom meeting:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to create meeting', 
        error: error.message 
      });
    }
  }
});

// Generate signature for Zoom meeting
router.post('/signature', async (req, res) => {
  try {
    const { meetingNumber, role } = req.body;

    if (!meetingNumber) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: 'Meeting number is required'
      });
    }

    const signature = zoomService.generateSignature(meetingNumber, role);
    res.json({ signature });
  } catch (error) {
    console.error('Error generating Zoom signature:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to generate signature'
    });
  }
});

// Handle Zoom webhooks
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-zm-signature'];
    const timestamp = req.headers['x-zm-request-timestamp'];
    const rawBody = JSON.stringify(req.body);

    if (!zoomService.verifyWebhook(signature, timestamp, rawBody)) {
      console.error('Invalid Zoom webhook signature');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const { event, payload } = req.body;

    switch (event) {
      case 'recording.completed':
        await handleRecordingCompleted(payload);
        break;
      case 'meeting.ended':
        console.log('Meeting ended:', payload.object.id);
        break;
      default:
        console.log(`Unhandled event type: ${event}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling Zoom webhook:', error);
    res.status(500).json({
      message: 'Error processing webhook',
      error: error.message
    });
  }
});

// Webhook validation endpoint
router.get('/webhook', (req, res) => {
  const { challenge } = req.query;
  
  if (challenge) {
    return res.json({ challenge });
  }
  
  res.json({ message: 'Zoom Webhook Endpoint' });
});

async function handleRecordingCompleted(payload) {
  try {
    console.log('Recording completed:', payload.object.id);
    
    const recordings = payload.object.recording_files || [];
    
    for (const recording of recordings) {
      const recordingData = {
        download_url: recording.download_url,
        meeting_id: payload.object.id,
        recording_id: recording.id,
        recording_type: recording.recording_type,
        recording_start: payload.object.start_time,
        recording_end: payload.object.end_time,
        file_type: recording.file_type,
        file_size: recording.file_size,
        host_id: payload.object.host_id,
        host_email: payload.object.host_email
      };
      
      const processedRecording = await zoomService.processRecording(recordingData);
      console.log('Recording processed:', processedRecording);
    }
  } catch (error) {
    console.error('Error handling recording.completed webhook:', error);
    throw error;
  }
}

// User Management Routes
router.get('/users', async (req, res) => {
  try {
    const users = await zoomService.listUsers(req.query);
    res.json(users);
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to list users',
      error: error.message
    });
  }
});

router.get('/users/:userId', async (req, res) => {
  try {
    const user = await zoomService.getUserProfile(req.params.userId);
    res.json(user);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to get user profile',
      error: error.message
    });
  }
});

router.post('/users', async (req, res) => {
  try {
    const user = await zoomService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to create user',
      error: error.message
    });
  }
});

router.patch('/users/:userId', async (req, res) => {
  try {
    const user = await zoomService.updateUserProfile(req.params.userId, req.body);
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to update user',
      error: error.message
    });
  }
});

router.delete('/users/:userId', async (req, res) => {
  try {
    await zoomService.deleteUser(req.params.userId, req.query.action);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to delete user',
      error: error.message
    });
  }
});

// Get all scheduled meetings for a specific user
router.get('/users/:userId/meetings', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'scheduled', page_size = 30, page_number = 1 } = req.query;
    
    const meetings = await zoomService.listMeetings(userId, {
      type,
      page_size: parseInt(page_size),
      page_number: parseInt(page_number)
    });
    
    res.json({
      message: 'Meetings retrieved successfully',
      ...meetings
    });
  } catch (error) {
    console.error('Error retrieving user meetings:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to retrieve meetings', 
        error: error.message 
      });
    }
  }
});

// Get all meetings for the current user
router.get('/me/meetings', async (req, res) => {
  try {
    const { type = 'scheduled', page_size = 30, page_number = 1 } = req.query;
    
    const meetings = await zoomService.listMeetings('me', {
      type,
      page_size: parseInt(page_size),
      page_number: parseInt(page_number)
    });
    
    res.json({
      message: 'Meetings retrieved successfully',
      ...meetings
    });
  } catch (error) {
    console.error('Error retrieving current user meetings:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to retrieve meetings', 
        error: error.message 
      });
    }
  }
});

// Get a specific meeting by ID
router.get('/meetings/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = await zoomService.getMeeting(meetingId);
    
    res.json({
      message: 'Meeting retrieved successfully',
      ...meeting
    });
  } catch (error) {
    console.error('Error retrieving meeting:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.status === 404) {
      res.status(404).json({ message: 'Meeting not found' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to retrieve meeting', 
        error: error.message 
      });
    }
  }
});

// Update a specific meeting
router.patch('/meetings/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const updateData = req.body;
    
    const updatedMeeting = await zoomService.updateMeeting(meetingId, updateData);
    
    res.json({
      message: 'Meeting updated successfully',
      ...updatedMeeting
    });
  } catch (error) {
    console.error('Error updating meeting:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.status === 404) {
      res.status(404).json({ message: 'Meeting not found' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to update meeting', 
        error: error.message 
      });
    }
  }
});

// Delete a specific meeting
router.delete('/meetings/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { schedule_for_reminder = false } = req.query;
    
    await zoomService.deleteMeeting(meetingId);
    
    res.json({
      message: 'Meeting deleted successfully',
      schedule_for_reminder: schedule_for_reminder === 'true'
    });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.status === 404) {
      res.status(404).json({ message: 'Meeting not found' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to delete meeting', 
        error: error.message 
      });
    }
  }
});

// ============ RECORDING MANAGEMENT ============

// Get all recordings for a user
router.get('/users/:userId/recordings', async (req, res) => {
  try {
    const { userId } = req.params;
    const recordings = await zoomService.listRecordings(userId, req.query);
    res.json({
      message: 'Recordings retrieved successfully',
      ...recordings
    });
  } catch (error) {
    console.error('Error retrieving user recordings:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to retrieve recordings', 
        error: error.message 
      });
    }
  }
});

// Get all recordings for current user
router.get('/me/recordings', async (req, res) => {
  try {
    const recordings = await zoomService.listRecordings('me', req.query);
    res.json({
      message: 'Recordings retrieved successfully',
      ...recordings
    });
  } catch (error) {
    console.error('Error retrieving current user recordings:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to retrieve recordings', 
        error: error.message 
      });
    }
  }
});

// Get recordings for a specific meeting
router.get('/meetings/:meetingId/recordings', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const recordings = await zoomService.getMeetingRecordings(meetingId);
    res.json({
      message: 'Meeting recordings retrieved successfully',
      ...recordings
    });
  } catch (error) {
    console.error('Error retrieving meeting recordings:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.status === 404) {
      res.status(404).json({ message: 'Meeting or recordings not found' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to retrieve meeting recordings', 
        error: error.message 
      });
    }
  }
});

// Delete a specific recording
router.delete('/meetings/:meetingId/recordings/:recordingId', async (req, res) => {
  try {
    const { meetingId, recordingId } = req.params;
    await zoomService.deleteRecording(meetingId, recordingId);
    res.json({
      message: 'Recording deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting recording:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.status === 404) {
      res.status(404).json({ message: 'Recording not found' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to delete recording', 
        error: error.message 
      });
    }
  }
});

// Get recording settings for a meeting
router.get('/meetings/:meetingId/recordings/settings', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const settings = await zoomService.getRecordingSettings(meetingId);
    res.json({
      message: 'Recording settings retrieved successfully',
      ...settings
    });
  } catch (error) {
    console.error('Error retrieving recording settings:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.status === 404) {
      res.status(404).json({ message: 'Meeting not found' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to retrieve recording settings', 
        error: error.message 
      });
    }
  }
});

// Update recording settings for a meeting
router.patch('/meetings/:meetingId/recordings/settings', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const settings = await zoomService.updateRecordingSettings(meetingId, req.body);
    res.json({
      message: 'Recording settings updated successfully',
      ...settings
    });
  } catch (error) {
    console.error('Error updating recording settings:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.status === 404) {
      res.status(404).json({ message: 'Meeting not found' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to update recording settings', 
        error: error.message 
      });
    }
  }
});

// ============ TRANSCRIPTION ============

// Get transcript for a meeting recording
router.get('/meetings/:meetingId/recordings/transcript', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const transcript = await zoomService.getMeetingAudioTranscript(meetingId);
    res.json({
      message: 'Transcript retrieved successfully',
      ...transcript
    });
  } catch (error) {
    console.error('Error retrieving transcript:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.status === 404) {
      res.status(404).json({ message: 'Transcript not found' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to retrieve transcript', 
        error: error.message 
      });
    }
  }
});

// ============ CLASSROOM MANAGEMENT ============

// Create a classroom meeting
router.post('/classroom/meetings', async (req, res) => {
  try {
    const { userId = 'me' } = req.query;
    const meetingDetails = await zoomService.createClassroomMeeting(userId, req.body);
    res.status(201).json({
      message: 'Classroom meeting created successfully',
      ...meetingDetails
    });
  } catch (error) {
    console.error('Error creating classroom meeting:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to create classroom meeting', 
        error: error.message 
      });
    }
  }
});

// Get meeting registrants
router.get('/meetings/:meetingId/registrants', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const registrants = await zoomService.getRegistrants(meetingId, req.query);
    res.json({
      message: 'Registrants retrieved successfully',
      ...registrants
    });
  } catch (error) {
    console.error('Error retrieving registrants:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.status === 404) {
      res.status(404).json({ message: 'Meeting not found' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to retrieve registrants', 
        error: error.message 
      });
    }
  }
});

// Add a registrant to a meeting
router.post('/meetings/:meetingId/registrants', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const registrant = await zoomService.addMeetingRegistrant(meetingId, req.body);
    res.status(201).json({
      message: 'Registrant added successfully',
      ...registrant
    });
  } catch (error) {
    console.error('Error adding registrant:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.status === 404) {
      res.status(404).json({ message: 'Meeting not found' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to add registrant', 
        error: error.message 
      });
    }
  }
});

// Update registrant status
router.put('/meetings/:meetingId/registrants/status', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const result = await zoomService.updateRegistrantStatus(meetingId, req.body);
    res.json({
      message: 'Registrant status updated successfully',
      ...result
    });
  } catch (error) {
    console.error('Error updating registrant status:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.status === 404) {
      res.status(404).json({ message: 'Meeting or registrant not found' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to update registrant status', 
        error: error.message 
      });
    }
  }
});

// Generate join link for a registrant
router.get('/meetings/:meetingId/join/:registrantId', async (req, res) => {
  try {
    const { meetingId, registrantId } = req.params;
    const joinLink = await zoomService.generateJoinLink(meetingId, registrantId);
    res.json({
      message: 'Join link generated successfully',
      ...joinLink
    });
  } catch (error) {
    console.error('Error generating join link:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.status === 404) {
      res.status(404).json({ message: 'Meeting or registrant not found' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to generate join link', 
        error: error.message 
      });
    }
  }
});

// Get meeting invitation
router.get('/meetings/:meetingId/invitation', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const invitation = await zoomService.getInvitation(meetingId);
    res.json({
      message: 'Invitation retrieved successfully',
      ...invitation
    });
  } catch (error) {
    console.error('Error retrieving invitation:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.status === 404) {
      res.status(404).json({ message: 'Meeting not found' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to retrieve invitation', 
        error: error.message 
      });
    }
  }
});

// ============ USER ROLES ============

// Create an instructor user
router.post('/users/instructor', async (req, res) => {
  try {
    const instructor = await zoomService.createInstructorUser(req.body);
    res.status(201).json({
      message: 'Instructor created successfully',
      ...instructor
    });
  } catch (error) {
    console.error('Error creating instructor:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to create instructor', 
        error: error.message 
      });
    }
  }
});

// Create a student user
router.post('/users/student', async (req, res) => {
  try {
    const student = await zoomService.createStudentUser(req.body);
    res.status(201).json({
      message: 'Student created successfully',
      ...student
    });
  } catch (error) {
    console.error('Error creating student:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized. Check Zoom API credentials.' });
    } else if (error.response?.data?.message) {
      res.status(error.response.status || 500).json({ 
        message: `Zoom API error: ${error.response.data.message}` 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to create student', 
        error: error.message 
      });
    }
  }
});

module.exports = router; 