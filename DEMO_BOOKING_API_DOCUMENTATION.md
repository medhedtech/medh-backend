# Demo Booking API Documentation

The Demo Booking API provides endpoints for managing demo sessions between prospective students and instructors. This system supports booking creation, management, availability checking, and administrative statistics.

## Base URL
```
/api/v1/demo-booking
```

## Authentication
- Most endpoints require authentication using JWT tokens
- Include the token in the Authorization header: `Bearer <your_jwt_token>`
- Some endpoints (like creating bookings and checking availability) are designed to work with or without authentication

## Models

### DemoBooking Model
```typescript
interface DemoBooking {
  id: string;
  userId?: string;                    // MongoDB ObjectId (optional for guest bookings)
  email: string;                      // Required, normalized to lowercase
  fullName: string;                   // Required, 2-100 characters
  phoneNumber?: string;               // Optional, validated format
  timeSlot: string;                   // Required, ISO 8601 date string
  scheduledDateTime: Date;            // Auto-generated from timeSlot
  timezone: string;                   // Default: "UTC"
  status: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled' | 'completed' | 'no-show';
  demoType: 'course_demo' | 'consultation' | 'product_walkthrough' | 'general_inquiry';
  courseInterest?: string;            // Course of interest
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  companyName?: string;               // Company name
  jobTitle?: string;                  // Job title
  requirements?: string;              // Special requirements (max 1000 chars)
  notes?: string;                     // Additional notes (max 500 chars)
  meetingLink?: string;               // Meeting URL (auto-generated)
  meetingId?: string;                 // Meeting ID
  instructorId?: string;              // Assigned instructor
  instructorNotes?: string;           // Instructor's notes
  durationMinutes: number;            // Default: 60, min: 15, max: 180
  canReschedule: boolean;             // Virtual field - can booking be rescheduled
  canCancel: boolean;                 // Virtual field - can booking be cancelled
  isUpcoming: boolean;                // Virtual field - is booking upcoming
  rescheduleHistory: RescheduleEvent[]; // History of reschedules
  cancellationReason?: string;        // Reason for cancellation
  rating?: number;                    // 1-5 rating after completion
  feedback?: string;                  // Feedback after completion
  source: 'website' | 'social_media' | 'referral' | 'advertisement' | 'other';
  followUpRequired: boolean;          // Default: true
  followUpCompleted: boolean;         // Default: false
  createdAt: Date;
  updatedAt: Date;
}

interface RescheduleEvent {
  fromDateTime: Date;
  toDateTime: Date;
  reason?: string;
  rescheduledAt: Date;
  rescheduledBy: 'user' | 'instructor' | 'admin';
}
```

## Endpoints

### 1. Create Demo Booking

**POST** `/api/v1/demo-booking`

Creates a new demo booking. Works with or without authentication.

#### Request Body
```typescript
interface DemoBookingRequest {
  userId?: string;                    // Optional if authenticated
  email: string;                      // Required
  fullName: string;                   // Required
  phoneNumber?: string;               // Optional
  timeSlot: string;                   // Required, ISO 8601 format
  timezone?: string;                  // Optional, defaults to UTC
  demoType?: string;                  // Optional, defaults to 'course_demo'
  courseInterest?: string;            // Optional
  experienceLevel?: string;           // Optional
  companyName?: string;               // Optional
  jobTitle?: string;                  // Optional
  requirements?: string;              // Optional, max 1000 chars
  notes?: string;                     // Optional, max 500 chars
  source?: string;                    // Optional, defaults to 'website'
  utmParameters?: {                   // Optional UTM tracking
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}
```

#### Example Request
```bash
curl -X POST http://localhost:3000/api/v1/demo-booking \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "phoneNumber": "+1234567890",
    "timeSlot": "2024-01-15T14:30:00.000Z",
    "timezone": "America/New_York",
    "demoType": "course_demo",
    "courseInterest": "Full Stack Development",
    "experienceLevel": "beginner",
    "companyName": "Tech Corp",
    "jobTitle": "Software Developer",
    "requirements": "Looking to switch careers to web development",
    "notes": "Prefer hands-on demonstration"
  }'
```

#### Response
```json
{
  "success": true,
  "message": "Demo booking created successfully",
  "data": {
    "booking": {
      "id": "60f7b2c4e1b2c8a4f8d9e1a2",
      "userId": "60f7b2c4e1b2c8a4f8d9e1a1",
      "email": "john.doe@example.com",
      "fullName": "John Doe",
      "scheduledDateTime": "2024-01-15T14:30:00.000Z",
      "status": "pending",
      "demoType": "course_demo",
      "canReschedule": true,
      "canCancel": true,
      "isUpcoming": true,
      "createdAt": "2024-01-10T10:30:00.000Z",
      "updatedAt": "2024-01-10T10:30:00.000Z"
    }
  }
}
```

#### Validation Rules
- Email must be valid format and ≤255 characters
- Full name must be 2-100 characters, letters/spaces/hyphens/apostrophes only
- Phone number must match international format pattern
- Time slot must be ISO 8601 format, at least 2 hours in future, max 90 days ahead
- Time slot must be during business hours (9 AM - 6 PM UTC, weekdays only)
- No duplicate bookings within 1 hour window for same email
- Max 3 concurrent bookings per time slot

### 2. Get User Bookings

**GET** `/api/v1/demo-booking`

Retrieves bookings for a user with optional filtering and pagination.

#### Query Parameters
- `userId` (optional): User ID to fetch bookings for (defaults to authenticated user)
- `status` (optional): Filter by status (`pending`, `confirmed`, `cancelled`, etc.)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `startDate` (optional): Filter bookings from this date (ISO 8601)
- `endDate` (optional): Filter bookings until this date (ISO 8601)

#### Example Request
```bash
curl -X GET "http://localhost:3000/api/v1/demo-booking?status=confirmed&page=1&limit=5" \
  -H "Authorization: Bearer <token>"
```

#### Response
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "id": "60f7b2c4e1b2c8a4f8d9e1a2",
        "email": "john.doe@example.com",
        "fullName": "John Doe",
        "scheduledDateTime": "2024-01-15T14:30:00.000Z",
        "status": "confirmed",
        "demoType": "course_demo",
        "canReschedule": true,
        "canCancel": true,
        "isUpcoming": true
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_items": 15,
      "items_per_page": 5,
      "has_next_page": true,
      "has_prev_page": false
    }
  }
}
```

### 3. Update Demo Booking

**PUT** `/api/v1/demo-booking`

Update a demo booking (cancel, reschedule, confirm, complete).

#### Request Body
```typescript
interface DemoBookingUpdateRequest {
  bookingId: string;                  // Required
  action: 'cancel' | 'reschedule' | 'confirm' | 'complete';
  newTimeSlot?: string;               // Required for reschedule action
  reason?: string;                    // Optional reason (max 500 chars)
  rating?: number;                    // Required for complete action (1-5)
  feedback?: string;                  // Optional for complete action (max 1000 chars)
  completionNotes?: string;           // Optional for complete action (max 1000 chars)
}
```

#### Example Requests

**Cancel a Booking:**
```bash
curl -X PUT http://localhost:3000/api/v1/demo-booking \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "bookingId": "60f7b2c4e1b2c8a4f8d9e1a2",
    "action": "cancel",
    "reason": "Schedule conflict"
  }'
```

**Reschedule a Booking:**
```bash
curl -X PUT http://localhost:3000/api/v1/demo-booking \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "bookingId": "60f7b2c4e1b2c8a4f8d9e1a2",
    "action": "reschedule",
    "newTimeSlot": "2024-01-16T15:00:00.000Z",
    "reason": "Personal emergency"
  }'
```

**Mark as Complete:**
```bash
curl -X PUT http://localhost:3000/api/v1/demo-booking \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "bookingId": "60f7b2c4e1b2c8a4f8d9e1a2",
    "action": "complete",
    "rating": 5,
    "feedback": "Excellent demo session, very informative!",
    "completionNotes": "Student showed strong interest in the Full Stack course"
  }'
```

#### Business Rules
- **Cancel**: Can only cancel bookings more than 2 hours before scheduled time
- **Reschedule**: Can only reschedule bookings more than 24 hours before scheduled time, max 3 reschedules allowed
- **Confirm**: Only pending bookings can be confirmed
- **Complete**: Only confirmed or rescheduled bookings can be completed

### 4. Get Booking by ID

**GET** `/api/v1/demo-booking/:bookingId`

Retrieve a specific booking by its ID.

#### Example Request
```bash
curl -X GET http://localhost:3000/api/v1/demo-booking/60f7b2c4e1b2c8a4f8d9e1a2 \
  -H "Authorization: Bearer <token>"
```

#### Response
```json
{
  "success": true,
  "message": "Booking retrieved successfully",
  "data": {
    "booking": {
      "id": "60f7b2c4e1b2c8a4f8d9e1a2",
      "userId": "60f7b2c4e1b2c8a4f8d9e1a1",
      "email": "john.doe@example.com",
      "fullName": "John Doe",
      "phoneNumber": "+1234567890",
      "scheduledDateTime": "2024-01-15T14:30:00.000Z",
      "timezone": "America/New_York",
      "status": "confirmed",
      "demoType": "course_demo",
      "courseInterest": "Full Stack Development",
      "experienceLevel": "beginner",
      "companyName": "Tech Corp",
      "jobTitle": "Software Developer",
      "requirements": "Looking to switch careers to web development",
      "notes": "Prefer hands-on demonstration",
      "meetingLink": "https://meet.medh.org/demo/abc123",
      "meetingId": "demo-abc123",
      "durationMinutes": 60,
      "canReschedule": false,
      "canCancel": false,
      "isUpcoming": true,
      "rescheduleHistory": [],
      "instructor": {
        "id": "60f7b2c4e1b2c8a4f8d9e1a3",
        "full_name": "Jane Smith",
        "email": "jane.smith@medh.org"
      },
      "createdAt": "2024-01-10T10:30:00.000Z",
      "updatedAt": "2024-01-10T11:15:00.000Z"
    }
  }
}
```

### 5. Get Available Time Slots

**GET** `/api/v1/demo-booking/available-slots`

Get available time slots for a specific date. This endpoint is public and doesn't require authentication.

#### Query Parameters
- `date` (required): Date in YYYY-MM-DD format
- `timezone` (optional): Timezone for the slots (default: UTC)

#### Example Request
```bash
curl -X GET "http://localhost:3000/api/v1/demo-booking/available-slots?date=2024-01-15&timezone=America/New_York"
```

#### Response
```json
{
  "success": true,
  "message": "Available time slots retrieved successfully",
  "data": {
    "date": "2024-01-15",
    "timezone": "America/New_York",
    "slots": [
      {
        "datetime": "2024-01-15T14:00:00.000Z",
        "time": "09:00",
        "display_time": "9:00 AM",
        "available": true,
        "bookings_count": 0
      },
      {
        "datetime": "2024-01-15T15:00:00.000Z",
        "time": "10:00",
        "display_time": "10:00 AM",
        "available": true,
        "bookings_count": 1
      },
      {
        "datetime": "2024-01-15T16:00:00.000Z",
        "time": "11:00",
        "display_time": "11:00 AM",
        "available": false,
        "bookings_count": 3
      }
    ]
  }
}
```

### 6. Get Booking Statistics (Admin Only)

**GET** `/api/v1/demo-booking/stats`

Get comprehensive booking statistics for admin dashboard. Requires admin or instructor role.

#### Query Parameters
- `startDate` (optional): Start date for statistics (ISO 8601)
- `endDate` (optional): End date for statistics (ISO 8601)
- `period` (optional): Predefined period (`7d` or `30d`, default: `7d`)

#### Example Request
```bash
curl -X GET "http://localhost:3000/api/v1/demo-booking/stats?period=30d" \
  -H "Authorization: Bearer <admin_token>"
```

#### Response
```json
{
  "success": true,
  "message": "Booking statistics retrieved successfully",
  "data": {
    "summary": {
      "total_bookings": 156,
      "status_breakdown": {
        "pending": 23,
        "confirmed": 67,
        "completed": 45,
        "cancelled": 15,
        "rescheduled": 6
      },
      "demo_type_breakdown": {
        "course_demo": 120,
        "consultation": 25,
        "product_walkthrough": 8,
        "general_inquiry": 3
      }
    },
    "recent_bookings": [
      {
        "id": "60f7b2c4e1b2c8a4f8d9e1a2",
        "fullName": "John Doe",
        "email": "john.doe@example.com",
        "scheduledDateTime": "2024-01-15T14:30:00.000Z",
        "status": "confirmed",
        "demoType": "course_demo",
        "createdAt": "2024-01-10T10:30:00.000Z"
      }
    ],
    "upcoming_bookings": [
      {
        "id": "60f7b2c4e1b2c8a4f8d9e1a3",
        "fullName": "Jane Smith",
        "email": "jane.smith@example.com",
        "scheduledDateTime": "2024-01-16T15:00:00.000Z",
        "status": "confirmed",
        "demoType": "consultation"
      }
    ],
    "period": "30d"
  }
}
```

## Error Responses

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error_code": "ERROR_CODE",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "value": "invalid-email"
    }
  ]
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `DUPLICATE_BOOKING`: User already has a booking within the time window
- `TIME_SLOT_UNAVAILABLE`: Time slot is fully booked
- `BOOKING_NOT_FOUND`: Booking with given ID not found
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `CANNOT_CANCEL_BOOKING`: Booking cannot be cancelled (too close to start time)
- `CANNOT_RESCHEDULE_BOOKING`: Booking cannot be rescheduled (business rules violated)
- `MISSING_USER_ID`: User ID required but not provided
- `MISSING_NEW_TIME_SLOT`: New time slot required for reschedule action

## Rate Limiting

- Public endpoints (availability checking): 100 requests per hour per IP
- Authenticated endpoints: 1000 requests per hour per user
- Booking creation: 10 bookings per hour per email address

## Integration with Frontend

The API is designed to work seamlessly with the provided TypeScript client. Key integration points:

1. **Flexible Authentication**: Works with or without auth for booking creation
2. **Automatic User Data**: When authenticated, user data is automatically populated
3. **Business Rule Validation**: Server-side validation of all business rules
4. **Real-time Availability**: Live checking of time slot availability
5. **Comprehensive Error Handling**: Detailed error responses for better UX

## Testing the API

### Using the Provided Client

```typescript
import { demoBookingApi, demoBookingHelpers } from './path/to/client';

// Create a booking for the current user
const booking = await demoBookingHelpers.createBookingForCurrentUser(
  '2024-01-15T14:30:00.000Z',
  {
    courseInterest: 'Full Stack Development',
    experienceLevel: 'beginner'
  }
);

// Get current user's bookings
const bookings = await demoBookingHelpers.getCurrentUserBookings();

// Check for active bookings
const hasActive = await demoBookingHelpers.hasActiveBookings();

// Cancel a booking
await demoBookingApi.cancelBooking('booking_id');
```

### Direct API Testing

Use tools like Postman, curl, or any HTTP client to test the endpoints directly using the examples provided above.

## Monitoring and Logging

- All booking operations are logged for audit purposes
- Performance metrics are tracked for optimization
- Error rates and response times are monitored
- Email notifications can be sent for important events (booking confirmations, reminders, etc.)

## Security Considerations

- Input sanitization and validation on all endpoints
- Rate limiting to prevent abuse
- SQL injection protection through parameterized queries
- XSS protection through input encoding
- CORS properly configured for allowed origins
- Sensitive data (meeting passwords) are encrypted
- Audit logging for all booking modifications 