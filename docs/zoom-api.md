# Zoom API Integration

This document provides information about the Zoom API integration for the MEDH platform, which enables virtual classroom functionality.

## Features

The Zoom API integration provides the following features:

### User Management

- Create instructor users with enhanced privileges
- Create student users with basic privileges
- List all users
- Get user profile information
- Update user profiles

### Meeting Management

- Create regular meetings
- Create classroom meetings with optimized settings
- Update meeting details
- Delete meetings
- List all meetings for a user
- Get details for a specific meeting
- Generate meeting invitations

### Registration Management

- Add registrants to meetings
- Update registrant status (approve/deny)
- List meeting registrants
- Generate personalized join links for registrants

### Recording Management

- List all recordings for a user
- Get recordings for a specific meeting
- Update recording settings
- Delete recordings
- Get meeting transcripts

## API Endpoints

### User Endpoints

- `GET /api/zoom/users` - List all users
- `GET /api/zoom/users/:userId` - Get user profile
- `POST /api/zoom/users/instructor` - Create instructor user
- `POST /api/zoom/users/student` - Create student user
- `PATCH /api/zoom/users/:userId` - Update user profile
- `DELETE /api/zoom/users/:userId` - Delete user

### Meeting Endpoints

- `GET /api/zoom/users/:userId/meetings` - List meetings for a user
- `GET /api/zoom/me/meetings` - List meetings for the current user
- `GET /api/zoom/meetings/:meetingId` - Get meeting details
- `POST /api/zoom/meetings` - Create a regular meeting
- `POST /api/zoom/classroom/meetings` - Create a classroom meeting
- `PATCH /api/zoom/meetings/:meetingId` - Update meeting details
- `DELETE /api/zoom/meetings/:meetingId` - Delete a meeting
- `GET /api/zoom/meetings/:meetingId/invitation` - Get meeting invitation

### Registrant Endpoints

- `GET /api/zoom/meetings/:meetingId/registrants` - List registrants for a meeting
- `POST /api/zoom/meetings/:meetingId/registrants` - Add a registrant to a meeting
- `PUT /api/zoom/meetings/:meetingId/registrants/status` - Update registrant status
- `GET /api/zoom/meetings/:meetingId/join/:registrantId` - Generate join link for a registrant

### Recording Endpoints

- `GET /api/zoom/users/:userId/recordings` - List recordings for a user
- `GET /api/zoom/me/recordings` - List recordings for the current user
- `GET /api/zoom/meetings/:meetingId/recordings` - Get recordings for a meeting
- `DELETE /api/zoom/meetings/:meetingId/recordings/:recordingId` - Delete a recording
- `GET /api/zoom/meetings/:meetingId/recordings/settings` - Get recording settings
- `PATCH /api/zoom/meetings/:meetingId/recordings/settings` - Update recording settings
- `GET /api/zoom/meetings/:meetingId/recordings/transcript` - Get transcript for a meeting

### Utility Endpoints

- `POST /api/zoom/signature` - Generate signature for Zoom meeting
- `POST /api/zoom/webhook` - Handle Zoom webhooks
- `GET /api/zoom/webhook` - Validate Zoom webhooks

## Testing

### Automated Testing

Use the automated test script to verify all API endpoints:

```bash
node scripts/test-zoom-api.js
```

### Interactive Testing

Use the interactive API client to manually test all endpoints:

```bash
node scripts/zoom-api-client.js
```

## Classroom Implementation

### Instructor Flow

1. Create a classroom meeting with `POST /api/zoom/classroom/meetings`
2. Add students as registrants with `POST /api/zoom/meetings/:meetingId/registrants`
3. Approve registrants with `PUT /api/zoom/meetings/:meetingId/registrants/status`
4. Send meeting invitation with `GET /api/zoom/meetings/:meetingId/invitation`
5. Start the meeting at the scheduled time
6. After the meeting, access recordings with `GET /api/zoom/meetings/:meetingId/recordings`

### Student Flow

1. Register for a meeting (through the application)
2. Receive approval from instructor
3. Join the meeting using the personalized join link
4. After the meeting, access recordings and transcripts as needed

## Environment Variables

The following environment variables are required for the Zoom API integration:

```
ZOOM_ACCOUNT_ID=your_zoom_account_id
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_SECRET_TOKEN=your_zoom_secret_token
ZOOM_VERIFICATION_TOKEN=your_zoom_verification_token
```

## Resources

- [Zoom API Documentation](https://marketplace.zoom.us/docs/api-reference/introduction)
- [Zoom OAuth Documentation](https://marketplace.zoom.us/docs/guides/auth/oauth)
- [Zoom Server-to-Server OAuth](https://marketplace.zoom.us/docs/guides/auth/server-to-server-oauth)
- [Zoom Webhooks](https://marketplace.zoom.us/docs/api-reference/webhook-reference)
