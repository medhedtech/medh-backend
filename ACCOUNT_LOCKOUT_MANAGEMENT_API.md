# 🔒 Account Lockout Management System API Documentation

## Overview
The account lockout management system provides comprehensive security features for handling failed authentication attempts with progressive lockout timing and administrative controls.

## Progressive Lockout System

### Lockout Levels
The system implements progressive lockout durations based on failed attempts:

| Attempt Level | Failed Attempts | Lockout Duration | Trigger Events |
|---------------|----------------|------------------|----------------|
| **Level 1** | 3 attempts | 1 minute | Login failures, Password change failures |
| **Level 2** | 4 attempts | 5 minutes | Continued failed attempts |
| **Level 3** | 5 attempts | 10 minutes | Persistent failed attempts |
| **Level 4** | 6+ attempts | 30 minutes | Maximum lockout duration |

### Lockout Triggers
- **Failed Login Attempts**: Incorrect email/password combinations
- **Failed Password Changes**: Incorrect current password during password change

---

## API Endpoints

### 1. Get All Locked Accounts
**GET** `/api/v1/auth/locked-accounts`

**Description:** Retrieve all currently locked user accounts with detailed information.

**Authentication:** Required (Admin/Super Admin)

**Response:**
```json
{
  "success": true,
  "message": "Found 3 locked accounts",
  "data": {
    "total_locked": 3,
    "accounts": [
      {
        "id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "full_name": "John Doe",
        "email": "john.doe@example.com",
        "failed_login_attempts": 4,
        "password_change_attempts": 0,
        "lockout_reason": "failed_login_attempts",
        "locked_until": "2025-06-19T18:05:30.000Z",
        "remaining_minutes": 3,
        "remaining_time_formatted": "3m 15s",
        "created_at": "2025-01-15T10:30:00.000Z",
        "last_login": "2025-06-19T17:45:00.000Z"
      }
    ]
  }
}
```

---

### 2. Unlock Specific Account
**POST** `/api/v1/auth/unlock-account/:userId`

**Description:** Unlock a specific user account and optionally reset failed attempt counters.

**Authentication:** Required (Admin/Super Admin)

**URL Parameters:**
- `userId` (string): The user ID to unlock

**Request Body:**
```json
{
  "resetAttempts": true  // Optional, defaults to true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account unlocked successfully",
  "data": {
    "user": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "email": "john.doe@example.com",
      "full_name": "John Doe",
      "unlocked_at": "2025-06-19T17:30:00.000Z",
      "attempts_reset": true
    },
    "previous_state": {
      "locked_until": "2025-06-19T18:05:30.000Z",
      "failed_login_attempts": 4,
      "password_change_attempts": 0,
      "lockout_reason": "failed_login_attempts"
    }
  }
}
```

---

### 3. Unlock All Accounts
**POST** `/api/v1/auth/unlock-all-accounts`

**Description:** Unlock all currently locked accounts. Requires Super Admin privileges.

**Authentication:** Required (Super Admin only)

**Request Body:**
```json
{
  "resetAttempts": true  // Optional, defaults to true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully unlocked 5 accounts",
  "data": {
    "unlocked_count": 5,
    "attempts_reset": true,
    "accounts": [
      {
        "id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "email": "user1@example.com",
        "full_name": "User One",
        "was_locked_until": "2025-06-19T18:05:30.000Z",
        "lockout_reason": "failed_login_attempts",
        "failed_login_attempts": 4,
        "password_change_attempts": 0
      }
    ]
  }
}
```

---

### 4. Get Lockout Statistics
**GET** `/api/v1/auth/lockout-stats`

**Description:** Get comprehensive statistics about account lockouts and failed attempts.

**Authentication:** Required (Admin/Super Admin)

**Response:**
```json
{
  "success": true,
  "message": "Lockout statistics retrieved successfully",
  "data": {
    "current_status": {
      "currently_locked": 3,
      "locked_last_24h": 7,
      "locked_last_week": 15
    },
    "lockout_reasons": {
      "failed_login_attempts": 8,
      "password_change_attempts": 2
    },
    "attempt_statistics": {
      "avg_failed_login_attempts": 1.2,
      "max_failed_login_attempts": 6,
      "users_with_failed_logins": 25,
      "avg_password_change_attempts": 0.3,
      "max_password_change_attempts": 3,
      "users_with_failed_password_changes": 8
    },
    "lockout_levels": {
      "level_1": "3 attempts = 1 minute",
      "level_2": "4 attempts = 5 minutes",
      "level_3": "5 attempts = 10 minutes",
      "level_4": "6+ attempts = 30 minutes"
    }
  }
}
```

---

## Enhanced Password Change API

### Password Change with Progressive Lockout
**PUT** `/api/v1/auth/change-password`

The password change endpoint now includes progressive lockout protection:

**Enhanced Response (on failure):**
```json
{
  "success": false,
  "message": "Current password is incorrect",
  "attempts_remaining": 2,
  "lockout_info": {
    "current_attempts": 1,
    "next_lockout_duration": "1 minute",
    "lockout_levels": {
      "3_attempts": "1 minute",
      "4_attempts": "5 minutes",
      "5_attempts": "10 minutes",
      "6_attempts": "30 minutes"
    }
  }
}
```

---

## Usage Examples

### Admin Dashboard Integration

#### Check Locked Accounts
```bash
curl -X GET "https://api.medh.co/api/v1/auth/locked-accounts" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Unlock Specific User
```bash
curl -X POST "https://api.medh.co/api/v1/auth/unlock-account/60f7b3b3b3b3b3b3b3b3b3b3" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resetAttempts": true
  }'
```

#### Emergency: Unlock All Accounts
```bash
curl -X POST "https://api.medh.co/api/v1/auth/unlock-all-accounts" \
  -H "Authorization: Bearer SUPER_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resetAttempts": true
  }'
```

#### Get Lockout Analytics
```bash
curl -X GET "https://api.medh.co/api/v1/auth/lockout-stats" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Security Features

### 🔐 **Progressive Lockout Protection**
- **Automatic Escalation**: Lockout duration increases with repeated failures
- **Smart Reset**: Successful authentication resets attempt counters
- **Multiple Triggers**: Protects both login and password change endpoints

### 👥 **Role-Based Access Control**
- **Admin Access**: Can view and unlock individual accounts
- **Super Admin Access**: Can perform bulk operations (unlock all)
- **Audit Logging**: All unlock activities are logged with admin details

### 📊 **Comprehensive Monitoring**
- **Real-time Statistics**: Current lockout status and trends
- **Historical Data**: 24-hour and weekly lockout analytics
- **Reason Tracking**: Categorizes lockouts by trigger type

### 🚨 **Security Notifications**
- **Activity Logging**: All lockout/unlock events are tracked
- **Admin Attribution**: Unlock activities include admin user details
- **Bulk Operation Tracking**: Special logging for mass unlock operations

---

## Database Schema Updates

The User model now includes additional fields for enhanced lockout management:

```javascript
// New fields added to User schema
{
  lockout_reason: {
    type: String,
    enum: ['failed_login_attempts', 'password_change_attempts', 'admin_lock'],
    default: null
  },
  password_change_attempts: {
    type: Number,
    default: 0,
    min: 0
  }
}
```

---

## Best Practices

### For Administrators

1. **Regular Monitoring**: Check lockout statistics weekly
2. **Pattern Analysis**: Look for unusual lockout spikes
3. **Selective Unlocking**: Unlock individual accounts when users report issues
4. **Emergency Procedures**: Use bulk unlock only in system-wide issues

### For Developers

1. **Error Handling**: Implement proper error handling for lockout responses
2. **User Communication**: Inform users about remaining lockout time
3. **Rate Limiting**: Don't retry failed attempts programmatically
4. **Logging Integration**: Monitor lockout events in your application logs

### For Security

1. **Alert Thresholds**: Set up alerts for high lockout volumes
2. **Investigation Procedures**: Have processes for investigating lockout patterns
3. **User Education**: Educate users about password security
4. **Regular Reviews**: Review lockout policies and adjust as needed

---

## Error Codes & Responses

| HTTP Code | Error Type | Description |
|-----------|------------|-------------|
| **423** | Account Locked | Account is temporarily locked |
| **403** | Unauthorized | Insufficient admin privileges |
| **404** | Not Found | User account not found |
| **400** | Bad Request | Account not locked or invalid request |
| **500** | Server Error | Internal server error |

---

## Integration Notes

### Frontend Integration
- Display remaining lockout time to users
- Show progressive lockout warnings
- Implement proper error handling for 423 responses

### Backend Integration  
- Monitor lockout events in application logs
- Set up alerts for unusual lockout patterns
- Implement rate limiting on authentication endpoints

### Security Monitoring
- Track lockout trends and patterns
- Set up automated alerts for high lockout volumes
- Regular security reviews and policy adjustments 