# Session Reminder System Documentation

## Overview

The Session Reminder System is an automated email notification service that sends reminders to students about their upcoming batch sessions. The system sends reminders at four different intervals:

- **1 week** before the session
- **1 day** before the session  
- **2 hours** before the session
- **30 minutes** before the session

## Architecture

### Components

1. **Cron Job Service** (`cronjob/session-reminder-cron.js`)
2. **Email Template** (`templates/session-reminder.hbs`)
3. **Management Controller** (`controllers/sessionReminderController.js`)
4. **Management Routes** (`routes/sessionReminderRoutes.js`)
5. **Enhanced Email Service** (`services/emailService.js`)

## Features

### Automated Scheduling
- Runs every 10 minutes to check for upcoming sessions
- Sends reminders based on precise timing intervals
- Prevents duplicate reminders using tracking mechanism
- Supports timezone-aware scheduling

### Smart Reminder Logic
- **1 week reminder**: General course preparation notification
- **1 day reminder**: Session preparation and materials review
- **2 hours reminder**: Final preparation and technical setup
- **30 minutes reminder**: Urgent join notification with meeting links

### Professional Email Templates
- Beautiful, responsive HTML design
- Different urgency styling (urgent vs. standard)
- Comprehensive session information
- Meeting details (URL, ID, password)
- Instructor information
- Company branding

### Management API
Complete management interface for monitoring and controlling the reminder system:

#### Available Endpoints

```
GET /api/v1/session-reminders/health
GET /api/v1/session-reminders/stats  
GET /api/v1/session-reminders/upcoming
POST /api/v1/session-reminders/send-test
POST /api/v1/session-reminders/stop
POST /api/v1/session-reminders/start
POST /api/v1/session-reminders/send-manual
```

## Technical Implementation

### Cron Jobs Configuration

The system runs four separate cron jobs:

```javascript
// Every 10 minutes - check for 1 week reminders
'*/10 * * * *' - checkWeekReminders()

// Every 10 minutes - check for 1 day reminders  
'*/10 * * * *' - checkDayReminders()

// Every 5 minutes - check for 2 hour reminders
'*/5 * * * *' - checkHourReminders()

// Every minute - check for 30 minute reminders
'* * * * *' - checkUrgentReminders()
```

### Database Integration

The system integrates with existing models:
- **Batch** model for session information
- **Enrollment** model for student-batch relationships
- **User** model for student contact details

### Reminder Tracking

Uses Redis-based tracking to prevent duplicate notifications:
```javascript
// Key format: reminder:{studentId}:{batchId}:{sessionId}:{interval}
// TTL: 25 hours (ensures no duplicates)
```

### Email Content Personalization

Each reminder includes:
- Student name and course information
- Session date, time, and duration
- Meeting details (Zoom/Teams links)
- Instructor information
- Urgency-appropriate messaging
- Professional branding

## Usage Examples

### Check System Status
```bash
curl -X GET http://localhost:8080/api/v1/session-reminders/health
```

### Get Reminder Statistics
```bash
curl -X GET http://localhost:8080/api/v1/session-reminders/stats \
  -H "Authorization: Bearer <admin_token>"
```

### Send Test Reminder
```bash
curl -X POST http://localhost:8080/api/v1/session-reminders/send-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "email": "test@example.com",
    "studentName": "Test Student",
    "batchName": "Full Stack Development",
    "sessionDate": "2024-01-15",
    "sessionTime": "14:30",
    "reminderInterval": "1 day"
  }'
```

### Manual Reminder Sending
```bash
curl -X POST http://localhost:8080/api/v1/session-reminders/send-manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "batchId": "60f7b2c4e1b2c8a4f8d9e1a2",
    "sessionId": "session_123",
    "reminderType": "2_hours"
  }'
```

## Configuration

### Environment Variables
```bash
# Email service configuration (required)
EMAIL_FROM=noreply@medh.co
EMAIL_USER=your-smtp-user
EMAIL_PASS=your-smtp-password

# Redis configuration (for reminder tracking)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true

# Timezone settings
DEFAULT_TIMEZONE=UTC
```

### Customization Options

#### Reminder Intervals
Modify intervals in `cronjob/session-reminder-cron.js`:
```javascript
this.reminderIntervals = [
  { name: '1_week', minutes: 10080, label: '1 week' },
  { name: '1_day', minutes: 1440, label: '1 day' },
  { name: '2_hours', minutes: 120, label: '2 hours' },
  { name: '30_minutes', minutes: 30, label: '30 minutes' }
];
```

#### Email Template
Customize the template at `templates/session-reminder.hbs`:
- Modify styling and branding
- Add/remove information sections
- Change urgency indicators

#### Cron Schedule
Adjust check frequencies in the cron job initialization:
```javascript
// More frequent checking for urgent reminders
cron.schedule('*/30 * * * * *', () => this.checkUrgentReminders());
```

## Error Handling & Monitoring

### Logging
- Comprehensive logging for all operations
- Error tracking with context information
- Performance monitoring for email sending
- Reminder statistics tracking

### Fallback Mechanisms
- Circuit breaker for email service failures
- Retry logic for temporary failures
- Queue-based email sending for reliability
- Failed email storage for manual review

### Monitoring Endpoints
- Health checks for system status
- Statistics endpoint for performance metrics
- Real-time tracking of sent reminders
- Error rate monitoring

## Security Features

### Access Control
- Admin and instructor access only for management endpoints
- JWT-based authentication
- Role-based authorization
- Rate limiting protection

### Data Protection
- Secure handling of student information
- No sensitive data in logs
- Encrypted communication channels
- Privacy-compliant email content

## Performance Optimizations

### Efficient Querying
- Optimized database queries for session lookups
- Indexed fields for quick reminder checks
- Batch processing for multiple reminders
- Memory-efficient data processing

### Scalability
- Queue-based email processing
- Redis-based tracking for horizontal scaling
- Configurable check intervals
- Asynchronous processing

## Integration Points

### Existing Systems
- Seamlessly integrates with current batch management
- Uses existing user authentication system
- Leverages current email infrastructure
- Maintains existing database schemas

### External Services
- Zoom meeting integration ready
- Teams meeting support available
- SMS reminder capability (extensible)
- Push notification support (future)

## Troubleshooting

### Common Issues

1. **Reminders not sending**
   - Check email service configuration
   - Verify Redis connection
   - Review cron job logs

2. **Duplicate reminders**
   - Check Redis tracking keys
   - Verify TTL settings
   - Review reminder interval logic

3. **Performance issues**
   - Monitor database query performance
   - Check email queue statistics
   - Review cron job execution times

### Debug Commands
```bash
# Check email queue status
curl -X GET http://localhost:8080/api/v1/session-reminders/stats

# View upcoming sessions
curl -X GET http://localhost:8080/api/v1/session-reminders/upcoming

# Test email functionality
curl -X POST http://localhost:8080/api/v1/session-reminders/send-test
```

## Future Enhancements

### Planned Features
- SMS reminder integration
- Push notification support
- Custom reminder scheduling
- Student preference management
- Multi-language support
- Analytics dashboard

### Extensibility
- Plugin architecture for new reminder types
- Custom email template support
- Third-party calendar integration
- Advanced scheduling algorithms
- Machine learning for optimal timing

## Conclusion

The Session Reminder System provides a robust, scalable solution for automated student notifications. It integrates seamlessly with existing infrastructure while providing powerful management capabilities and professional-quality communications.

For support or feature requests, contact the development team or create an issue in the project repository. 