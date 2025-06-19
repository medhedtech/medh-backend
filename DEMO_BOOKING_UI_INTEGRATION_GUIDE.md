# Demo Booking UI Integration Guide with Zoom

## Overview

This guide provides complete UI integration examples for the enhanced demo booking system with automatic Zoom meeting generation. All examples include JSON request/response formats and frontend code samples.

## Base URL and Authentication

```javascript
const API_BASE_URL = 'http://localhost:8080/api/v1';
// Note: Based on your logs, the API uses /api/v1 prefix

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${userToken}` // Include when user is authenticated
};
```

## 1. Create Demo Booking with Auto Zoom Meeting

### Request JSON Example

```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "phoneNumber": "+1234567890",
  "timeSlot": "2024-06-20T14:30:00.000Z",
  "timezone": "America/New_York",
  "demoType": "course_demo",
  "courseInterest": "Advanced JavaScript with React",
  "experienceLevel": "intermediate",
  "companyName": "Tech Corp",
  "jobTitle": "Frontend Developer",
  "requirements": "Focus on React hooks and state management",
  "notes": "Interested in advanced patterns",
  "source": "website",
  "autoGenerateZoomMeeting": true,
  "zoomMeetingSettings": {
    "duration": 90,
    "auto_recording": "cloud",
    "waiting_room": true,
    "host_video": true,
    "participant_video": true,
    "mute_upon_entry": true,
    "join_before_host": false,
    "meeting_authentication": false,
    "registrants_confirmation_email": true,
    "registrants_email_notification": true
  }
}
```

### Response JSON Example

```json
{
  "success": true,
  "message": "Demo booking created successfully",
  "data": {
    "booking": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "userId": "60f7b3b3b3b3b3b3b3b3b3b4",
      "email": "user@example.com",
      "fullName": "John Doe",
      "phoneNumber": "+1234567890",
      "scheduledDateTime": "2024-06-20T14:30:00.000Z",
      "timezone": "America/New_York",
      "status": "pending",
      "demoType": "course_demo",
      "courseInterest": "Advanced JavaScript with React",
      "experienceLevel": "intermediate",
      "companyName": "Tech Corp",
      "jobTitle": "Frontend Developer",
      "requirements": "Focus on React hooks and state management",
      "canReschedule": true,
      "canCancel": true,
      "autoGenerateZoomMeeting": true,
      "meetingLink": "https://zoom.us/j/123456789?pwd=abc123def456",
      "meetingId": "123456789",
      "meetingPassword": "abc123",
      "zoomMeeting": {
        "id": "123456789",
        "uuid": "abc123def456ghi789",
        "topic": "Demo Session - COURSE DEMO - John Doe",
        "type": 2,
        "status": "waiting",
        "start_time": "2024-06-20T14:30:00.000Z",
        "duration": 90,
        "timezone": "America/New_York",
        "agenda": "Demo session for John Doe - Advanced JavaScript with React\n\nRequirements: Focus on React hooks and state management",
        "created_at": "2024-06-19T15:30:00.000Z",
        "join_url": "https://zoom.us/j/123456789?pwd=abc123def456",
        "password": "abc123",
        "h323_password": "123456",
        "pstn_password": "123456",
        "encrypted_password": "abc123def456",
        "settings": {
          "host_video": true,
          "participant_video": true,
          "join_before_host": false,
          "mute_upon_entry": true,
          "auto_recording": "cloud",
          "waiting_room": true,
          "meeting_authentication": false,
          "registrants_confirmation_email": true,
          "registrants_email_notification": true
        },
        "isZoomMeetingCreated": true,
        "zoomMeetingCreatedAt": "2024-06-19T15:30:00.000Z",
        "zoomMeetingError": null
      },
      "createdAt": "2024-06-19T15:30:00.000Z",
      "updatedAt": "2024-06-19T15:30:00.000Z"
    }
  }
}
```

### Frontend Form Component

```jsx
import React, { useState } from 'react';

const DemoBookingForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phoneNumber: '',
    timeSlot: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    demoType: 'course_demo',
    courseInterest: '',
    experienceLevel: 'intermediate',
    requirements: '',
    autoGenerateZoomMeeting: true,
    zoomMeetingSettings: {
      duration: 60,
      auto_recording: 'cloud',
      waiting_room: true,
      host_video: true,
      participant_video: true,
      mute_upon_entry: true,
      join_before_host: false,
      meeting_authentication: false,
      registrants_confirmation_email: true,
      registrants_email_notification: true
    }
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/demo-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header optional for demo booking creation
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      setResult(result);

      if (result.success) {
        // Show success message and Zoom details
        console.log('Booking created:', result.data.booking);
      }
    } catch (error) {
      console.error('Booking failed:', error);
      setResult({
        success: false,
        message: 'Failed to create demo booking'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="demo-booking-container">
      <form onSubmit={handleSubmit} className="demo-booking-form">
        {/* Basic Information */}
        <div className="form-section">
          <h3>Contact Information</h3>
          
          <input
            type="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          
          <input
            type="text"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            required
          />
          
          <input
            type="tel"
            placeholder="Phone Number"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
          />
        </div>

        {/* Demo Preferences */}
        <div className="form-section">
          <h3>Demo Preferences</h3>
          
          <input
            type="datetime-local"
            value={formData.timeSlot}
            onChange={(e) => setFormData({...formData, timeSlot: e.target.value})}
            min={new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)}
            required
          />
          
          <select
            value={formData.demoType}
            onChange={(e) => setFormData({...formData, demoType: e.target.value})}
          >
            <option value="course_demo">Course Demo</option>
            <option value="consultation">Consultation</option>
            <option value="product_walkthrough">Product Walkthrough</option>
            <option value="general_inquiry">General Inquiry</option>
          </select>
          
          <input
            type="text"
            placeholder="Course Interest"
            value={formData.courseInterest}
            onChange={(e) => setFormData({...formData, courseInterest: e.target.value})}
          />
          
          <select
            value={formData.experienceLevel}
            onChange={(e) => setFormData({...formData, experienceLevel: e.target.value})}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
        </div>

        {/* Zoom Meeting Settings */}
        <div className="form-section">
          <h3>Meeting Preferences</h3>
          
          <label>
            <input
              type="checkbox"
              checked={formData.autoGenerateZoomMeeting}
              onChange={(e) => setFormData({
                ...formData, 
                autoGenerateZoomMeeting: e.target.checked
              })}
            />
            Auto-generate Zoom meeting
          </label>
          
          {formData.autoGenerateZoomMeeting && (
            <div className="zoom-settings">
              <label>
                Duration (minutes):
                <input
                  type="number"
                  min="15"
                  max="480"
                  value={formData.zoomMeetingSettings.duration}
                  onChange={(e) => setFormData({
                    ...formData,
                    zoomMeetingSettings: {
                      ...formData.zoomMeetingSettings,
                      duration: parseInt(e.target.value)
                    }
                  })}
                />
              </label>
              
              <label>
                Recording:
                <select
                  value={formData.zoomMeetingSettings.auto_recording}
                  onChange={(e) => setFormData({
                    ...formData,
                    zoomMeetingSettings: {
                      ...formData.zoomMeetingSettings,
                      auto_recording: e.target.value
                    }
                  })}
                >
                  <option value="cloud">Cloud Recording</option>
                  <option value="local">Local Recording</option>
                  <option value="none">No Recording</option>
                </select>
              </label>
              
              <label>
                <input
                  type="checkbox"
                  checked={formData.zoomMeetingSettings.waiting_room}
                  onChange={(e) => setFormData({
                    ...formData,
                    zoomMeetingSettings: {
                      ...formData.zoomMeetingSettings,
                      waiting_room: e.target.checked
                    }
                  })}
                />
                Enable waiting room
              </label>
            </div>
          )}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating Booking...' : 'Book Demo'}
        </button>
      </form>

      {/* Results Display */}
      {result && (
        <div className="booking-result">
          {result.success ? (
            <ZoomMeetingDetails 
              zoomMeeting={result.data.booking.zoomMeeting} 
              booking={result.data.booking} 
            />
          ) : (
            <ErrorHandler error={result} />
          )}
        </div>
      )}
    </div>
  );
};
```

## 2. Display Zoom Meeting Details Component

```jsx
const ZoomMeetingDetails = ({ zoomMeeting, booking }) => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Show copied notification
    alert('Copied to clipboard!');
  };

  if (!zoomMeeting || !zoomMeeting.isZoomMeetingCreated) {
    return (
      <div className="zoom-error">
        <h3>⚠️ Zoom Meeting Not Available</h3>
        <p>Your demo booking was created successfully, but the Zoom meeting could not be generated automatically.</p>
        <p>Our team will contact you with meeting details shortly.</p>
        {zoomMeeting?.zoomMeetingError && (
          <p className="error-details">Error: {zoomMeeting.zoomMeetingError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="zoom-meeting-details">
      <h3>🎥 Your Zoom Meeting is Ready!</h3>
      
      <div className="meeting-info">
        <div className="info-item">
          <label>Meeting Topic:</label>
          <span>{zoomMeeting.topic}</span>
        </div>
        
        <div className="info-item">
          <label>Scheduled Time:</label>
          <span>{new Date(zoomMeeting.start_time).toLocaleString()}</span>
        </div>
        
        <div className="info-item">
          <label>Duration:</label>
          <span>{zoomMeeting.duration} minutes</span>
        </div>
        
        <div className="info-item">
          <label>Meeting ID:</label>
          <span>
            {zoomMeeting.id}
            <button onClick={() => copyToClipboard(zoomMeeting.id)}>📋</button>
          </span>
        </div>
        
        <div className="info-item">
          <label>Password:</label>
          <span>
            {zoomMeeting.password}
            <button onClick={() => copyToClipboard(zoomMeeting.password)}>📋</button>
          </span>
        </div>
        
        <div className="info-item">
          <label>Join URL:</label>
          <div className="join-url">
            <a href={zoomMeeting.join_url} target="_blank" rel="noopener noreferrer">
              Join Zoom Meeting
            </a>
            <button onClick={() => copyToClipboard(zoomMeeting.join_url)}>📋</button>
          </div>
        </div>
      </div>
      
      <div className="meeting-features">
        <h4>Meeting Features:</h4>
        <ul>
          {zoomMeeting.settings.waiting_room && <li>✅ Waiting room enabled for security</li>}
          {zoomMeeting.settings.auto_recording === 'cloud' && <li>☁️ Cloud recording enabled</li>}
          {zoomMeeting.settings.host_video && <li>📹 Host video enabled</li>}
          {zoomMeeting.settings.participant_video && <li>🎥 Participant video enabled</li>}
          {zoomMeeting.settings.mute_upon_entry && <li>🔇 Participants muted on entry</li>}
        </ul>
      </div>
      
      <div className="next-steps">
        <h4>Next Steps:</h4>
        <ol>
          <li>Save the meeting details above</li>
          <li>You'll receive email confirmation with calendar invite</li>
          <li>Join the meeting 5 minutes before the scheduled time</li>
          <li>Our instructor will admit you from the waiting room</li>
        </ol>
      </div>
    </div>
  );
};
```

## 3. Get User's Demo Bookings

### API Call

```javascript
const fetchUserBookings = async (page = 1, limit = 20, filters = {}) => {
  try {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      include_instructor: 'true',
      ...filters
    });

    const response = await fetch(`${API_BASE_URL}/demo-booking?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    throw error;
  }
};
```

### Response JSON Example

```json
{
  "success": true,
  "message": "User bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "email": "user@example.com",
        "fullName": "John Doe",
        "scheduledDateTime": "2024-06-20T14:30:00.000Z",
        "status": "confirmed",
        "demoType": "course_demo",
        "courseInterest": "Advanced JavaScript",
        "meetingLink": "https://zoom.us/j/123456789?pwd=abc123",
        "meetingId": "123456789",
        "meetingPassword": "abc123",
        "zoomMeeting": {
          "id": "123456789",
          "topic": "Demo Session - COURSE DEMO - John Doe",
          "start_time": "2024-06-20T14:30:00.000Z",
          "duration": 90,
          "join_url": "https://zoom.us/j/123456789?pwd=abc123",
          "password": "abc123",
          "status": "waiting",
          "isZoomMeetingCreated": true
        },
        "instructor": {
          "id": "60f7b3b3b3b3b3b3b3b3b3b5",
          "name": "Jane Smith",
          "email": "jane@example.com",
          "expertise": ["JavaScript", "React", "Node.js"]
        },
        "canReschedule": true,
        "canCancel": true,
        "createdAt": "2024-06-19T15:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalBookings": 1,
      "limit": 20,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

## 4. Create/Regenerate Zoom Meeting (Admin)

### Request JSON Example

```json
{
  "zoomMeetingSettings": {
    "duration": 120,
    "auto_recording": "cloud",
    "waiting_room": true,
    "meeting_authentication": true,
    "host_video": true,
    "participant_video": false,
    "mute_upon_entry": true,
    "join_before_host": false,
    "registrants_confirmation_email": true,
    "registrants_email_notification": true
  }
}
```

### Response JSON Example

```json
{
  "success": true,
  "message": "Zoom meeting created successfully",
  "data": {
    "bookingId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "zoomMeeting": {
      "id": "987654321",
      "uuid": "xyz789abc123def456",
      "topic": "Demo Session - COURSE DEMO - John Doe",
      "type": 2,
      "status": "waiting",
      "start_time": "2024-06-20T14:30:00.000Z",
      "duration": 120,
      "timezone": "America/New_York",
      "agenda": "Demo session for John Doe - Advanced JavaScript",
      "created_at": "2024-06-19T16:00:00.000Z",
      "start_url": "https://zoom.us/s/987654321?zak=admin_token_here",
      "join_url": "https://zoom.us/j/987654321?pwd=xyz789",
      "password": "xyz789",
      "h323_password": "654321",
      "pstn_password": "654321",
      "encrypted_password": "xyz789abc123",
      "settings": {
        "host_video": true,
        "participant_video": false,
        "join_before_host": false,
        "mute_upon_entry": true,
        "auto_recording": "cloud",
        "waiting_room": true,
        "meeting_authentication": true,
        "registrants_confirmation_email": true,
        "registrants_email_notification": true
      }
    }
  }
}
```

## 5. Error Handling Examples

### Validation Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "value": "invalid-email"
    },
    {
      "field": "timeSlot",
      "message": "Demo must be scheduled at least 2 hours in advance",
      "value": "2024-06-19T12:00:00.000Z"
    },
    {
      "field": "zoomMeetingSettings.duration",
      "message": "Meeting duration must be between 15 and 480 minutes",
      "value": 5
    }
  ]
}
```

### Zoom API Error Response

```json
{
  "success": false,
  "message": "Zoom API error: Invalid credentials",
  "error_code": "ZOOM_API_ERROR",
  "details": {
    "zoom_error": "Invalid API credentials",
    "booking_created": true,
    "booking_id": "60f7b3b3b3b3b3b3b3b3b3b3"
  }
}
```

### Error Handling Component

```jsx
const ErrorHandler = ({ error, onRetry }) => {
  if (error.error_code === 'ZOOM_API_ERROR' && error.details?.booking_created) {
    return (
      <div className="zoom-error-with-booking">
        <h3>✅ Demo Booking Created</h3>
        <p>Your demo booking was created successfully!</p>
        <div className="zoom-error-notice">
          <h4>⚠️ Zoom Meeting Issue</h4>
          <p>We couldn't automatically create your Zoom meeting due to a technical issue.</p>
          <p>Don't worry - our team will contact you with meeting details shortly.</p>
          <p>Booking ID: {error.details.booking_id}</p>
        </div>
        {onRetry && <button onClick={onRetry}>Try Creating Zoom Meeting Again</button>}
      </div>
    );
  }

  if (error.errors) {
    return (
      <div className="validation-errors">
        <h3>❌ Please Fix the Following Issues:</h3>
        <ul>
          {error.errors.map((err, index) => (
            <li key={index}>
              <strong>{err.field}:</strong> {err.message}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="general-error">
      <h3>❌ Error</h3>
      <p>{error.message || 'An unexpected error occurred'}</p>
      {onRetry && <button onClick={onRetry}>Try Again</button>}
    </div>
  );
};
```

## 6. Complete CSS Styles

```css
/* Demo Booking Form Styles */
.demo-booking-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.demo-booking-form {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.form-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.form-section:last-child {
  border-bottom: none;
}

.form-section h3 {
  margin-bottom: 20px;
  color: #333;
  font-size: 1.2em;
  font-weight: 600;
}

.form-section input,
.form-section select,
.form-section textarea {
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.form-section input:focus,
.form-section select:focus,
.form-section textarea:focus {
  outline: none;
  border-color: #007bff;
}

.zoom-settings {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-top: 15px;
  border: 1px solid #e9ecef;
}

.zoom-settings label {
  display: block;
  margin-bottom: 15px;
  font-weight: 500;
  color: #495057;
}

.zoom-settings input[type="checkbox"] {
  width: auto;
  margin-right: 8px;
  margin-bottom: 0;
}

/* Zoom Meeting Details Styles */
.zoom-meeting-details {
  background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%);
  padding: 30px;
  border-radius: 12px;
  margin: 20px 0;
  border: 1px solid #c3e6c3;
}

.zoom-meeting-details h3 {
  color: #28a745;
  margin-bottom: 20px;
  text-align: center;
  font-size: 1.5em;
}

.meeting-info {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f3f4;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item label {
  font-weight: 600;
  color: #495057;
  min-width: 120px;
}

.info-item span {
  flex: 1;
  text-align: right;
  font-family: monospace;
}

.info-item button {
  background: #6c757d;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  margin-left: 8px;
  cursor: pointer;
  font-size: 12px;
}

.info-item button:hover {
  background: #5a6268;
}

.join-url {
  display: flex;
  align-items: center;
  gap: 10px;
}

.join-url a {
  background: #007bff;
  color: white;
  padding: 10px 20px;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
  transition: background-color 0.3s ease;
}

.join-url a:hover {
  background: #0056b3;
}

.meeting-features {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.meeting-features h4 {
  margin-bottom: 15px;
  color: #495057;
}

.meeting-features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.meeting-features li {
  padding: 8px 0;
  color: #28a745;
  font-weight: 500;
}

.next-steps {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.next-steps h4 {
  margin-bottom: 15px;
  color: #495057;
}

.next-steps ol {
  padding-left: 20px;
}

.next-steps li {
  margin-bottom: 8px;
  line-height: 1.5;
}

/* Error Styles */
.zoom-error,
.zoom-error-with-booking {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  padding: 25px;
  border-radius: 8px;
  margin: 20px 0;
}

.zoom-error h3,
.zoom-error-with-booking h3 {
  color: #856404;
  margin-bottom: 15px;
}

.zoom-error-notice {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 15px;
  border-radius: 6px;
  margin: 15px 0;
}

.zoom-error-notice h4 {
  color: #721c24;
  margin-bottom: 10px;
}

.validation-errors {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 25px;
  border-radius: 8px;
  margin: 20px 0;
}

.validation-errors h3 {
  color: #721c24;
  margin-bottom: 15px;
}

.validation-errors ul {
  margin: 15px 0 0 0;
  padding-left: 20px;
}

.validation-errors li {
  margin-bottom: 8px;
  color: #721c24;
}

.general-error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 25px;
  border-radius: 8px;
  margin: 20px 0;
  text-align: center;
}

.general-error h3 {
  color: #721c24;
  margin-bottom: 15px;
}

/* Buttons */
button[type="submit"],
.zoom-error-with-booking button,
.general-error button {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
  width: 100%;
  margin-top: 20px;
}

button[type="submit"]:hover,
.zoom-error-with-booking button:hover,
.general-error button:hover {
  background: #0056b3;
}

button[type="submit"]:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

/* Responsive Design */
@media (max-width: 768px) {
  .demo-booking-container {
    padding: 10px;
  }
  
  .demo-booking-form {
    padding: 20px;
  }
  
  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .info-item span {
    text-align: left;
  }
  
  .join-url {
    flex-direction: column;
    align-items: stretch;
  }
  
  .join-url a {
    text-align: center;
  }
}

/* Loading States */
.loading {
  opacity: 0.6;
  pointer-events: none;
}

.loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  margin: -10px 0 0 -10px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

## 7. Integration Checklist

### API Endpoints Available
- ✅ `POST /api/v1/demo-booking` - Create booking with auto Zoom
- ✅ `GET /api/v1/demo-booking` - Get user bookings
- ✅ `POST /api/v1/demo-booking/:id/zoom-meeting` - Create/regenerate Zoom meeting
- ✅ `GET /api/v1/demo-booking/:id/zoom-meeting` - Get Zoom meeting details
- ✅ `GET /api/v1/demo-booking/available-slots` - Get available time slots

### Features Implemented
- ✅ Automatic Zoom meeting generation with admin settings
- ✅ Cloud recording enabled by default
- ✅ Professional security settings (waiting room, encryption)
- ✅ Graceful fallback when Zoom API fails
- ✅ Role-based access control
- ✅ Comprehensive error handling
- ✅ Input validation and sanitization

### Frontend Integration Steps
1. Copy the provided React components
2. Update the `API_BASE_URL` to match your server
3. Implement authentication token management
4. Add the CSS styles for proper styling
5. Test with various scenarios including error cases

This guide provides everything needed to integrate the enhanced demo booking system with automatic Zoom meeting generation into your frontend application. 