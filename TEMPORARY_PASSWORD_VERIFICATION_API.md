# Temporary Password Verification API

## Overview
This API endpoint allows users to verify the temporary password sent to their email during the password reset process. This adds an extra layer of security by ensuring users have access to their email before allowing password changes.

## Endpoint
```
POST /api/v1/auth/verify-temp-password
```

## Authentication
- **Access**: Public (no authentication required)
- **Rate Limiting**: Applied to prevent brute force attacks

## Request

### Headers
```
Content-Type: application/json
```

### Body Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | User's email address (case-insensitive) |
| `tempPassword` | string | Yes | Temporary password received via email |

### Example Request
```json
{
  "email": "user@example.com",
  "tempPassword": "a1b2c3d4"
}
```

## Response

### Success Response (200)
```json
{
  "success": true,
  "message": "Temporary password verified successfully. You can now set a new password.",
  "data": {
    "verification_token": "abc123def456...",
    "expires_in_minutes": 15,
    "next_step": "Use this token to set a new password via /reset-password endpoint"
  }
}
```

### Error Responses

#### 400 - Bad Request (Missing Parameters)
```json
{
  "success": false,
  "message": "Email and temporary password are required.",
  "errors": {
    "email": "Email is required",
    "tempPassword": "Temporary password is required"
  }
}
```

#### 400 - Bad Request (No Reset Request)
```json
{
  "success": false,
  "message": "No valid password reset request found. Please request a new password reset."
}
```

#### 401 - Unauthorized (Incorrect Password)
```json
{
  "success": false,
  "message": "Incorrect temporary password",
  "attempts_info": {
    "failed_attempts": 2,
    "remaining_attempts": 1,
    "warning": "Account will be locked after next failed attempt"
  }
}
```

#### 404 - Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

#### 423 - Locked (Account Temporarily Locked)
```json
{
  "success": false,
  "message": "Account is temporarily locked due to multiple failed attempts. Please try again after 5 minute(s).",
  "lockout_info": {
    "locked_until": "2025-01-27T10:30:00.000Z",
    "lockout_duration_minutes": 5,
    "remaining_attempts": 0
  }
}
```

#### 429 - Too Many Requests
```json
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

#### 500 - Internal Server Error
```json
{
  "success": false,
  "message": "Server error during temporary password verification",
  "error": "Internal server error"
}
```

## Security Features

### Progressive Account Lockout
The system implements progressive lockout timing to prevent brute force attacks:
- **3 failed attempts**: 1 minute lockout
- **4 failed attempts**: 5 minute lockout  
- **5 failed attempts**: 10 minute lockout
- **6+ failed attempts**: 30 minute lockout

### Rate Limiting
- Applied to prevent rapid successive verification attempts
- Shared with other password-related endpoints

### Activity Logging
- All verification attempts are logged with metadata
- Includes IP address, user agent, device info, and geolocation
- Failed attempts are tracked for security monitoring

## Workflow Integration

### Complete Password Reset Flow
1. **Request Reset**: `POST /api/v1/auth/forgot-password`
   - User provides email
   - System generates temporary password
   - Temporary password sent via email

2. **Verify Temporary Password**: `POST /api/v1/auth/verify-temp-password`
   - User provides email and temporary password
   - System verifies and returns verification token
   - Token valid for 15 minutes

3. **Set New Password**: `POST /api/v1/auth/reset-password`
   - User provides verification token and new password
   - System updates password and clears all reset tokens

### Alternative Flow (Backward Compatibility)
- Users can still login directly with temporary password
- Then use `PUT /api/v1/auth/change-password` to set new password

## Implementation Details

### Validation Rules
- **Email**: Must be valid email format, automatically normalized to lowercase
- **Temporary Password**: 1-50 characters, non-empty string
- **Reset Token**: Must exist and not be expired
- **Account Status**: Must not be locked or banned

### Token Management
- Verification token generated upon successful temp password verification
- Token expires in 15 minutes for security
- Token can be used with `/reset-password` endpoint
- All tokens cleared after successful password reset

### Error Handling
- Comprehensive validation with specific error messages
- Progressive security measures (attempts tracking, lockouts)
- Graceful handling of edge cases (expired tokens, missing data)
- Development vs production error detail levels

## Frontend Integration

### JavaScript Example
```javascript
async function verifyTempPassword(email, tempPassword) {
  try {
    const response = await fetch('/api/v1/auth/verify-temp-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        tempPassword: tempPassword.trim()
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // Store verification token for next step
      localStorage.setItem('resetToken', data.data.verification_token);
      
      // Redirect to new password form
      window.location.href = '/reset-password';
    } else {
      // Handle error (show message, handle lockout, etc.)
      handleVerificationError(data);
    }
  } catch (error) {
    console.error('Verification failed:', error);
  }
}

function handleVerificationError(data) {
  if (data.lockout_info) {
    // Account is locked - show lockout message
    showLockoutMessage(data.lockout_info);
  } else if (data.attempts_info) {
    // Show remaining attempts warning
    showAttemptsWarning(data.attempts_info);
  } else {
    // Show general error message
    showErrorMessage(data.message);
  }
}
```

### React Hook Example
```javascript
import { useState } from 'react';

export function useTempPasswordVerification() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationToken, setVerificationToken] = useState(null);

  const verifyTempPassword = async (email, tempPassword) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/verify-temp-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tempPassword })
      });

      const data = await response.json();

      if (data.success) {
        setVerificationToken(data.data.verification_token);
        return { success: true, token: data.data.verification_token };
      } else {
        setError(data);
        return { success: false, error: data };
      }
    } catch (err) {
      const errorData = { message: 'Network error occurred' };
      setError(errorData);
      return { success: false, error: errorData };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    verifyTempPassword,
    isLoading,
    error,
    verificationToken,
    clearError: () => setError(null)
  };
}
```

## Testing

### Manual Testing
```bash
# Test successful verification (replace with real email/password)
curl -X POST http://localhost:8080/api/v1/auth/verify-temp-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","tempPassword":"a1b2c3d4"}'

# Test missing parameters
curl -X POST http://localhost:8080/api/v1/auth/verify-temp-password \
  -H "Content-Type: application/json" \
  -d '{}'

# Test invalid email format
curl -X POST http://localhost:8080/api/v1/auth/verify-temp-password \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","tempPassword":"test123"}'
```

### Unit Test Examples
```javascript
describe('POST /api/v1/auth/verify-temp-password', () => {
  test('should verify valid temporary password', async () => {
    // Setup user with temp password
    const user = await createUserWithTempPassword();
    
    const response = await request(app)
      .post('/api/v1/auth/verify-temp-password')
      .send({
        email: user.email,
        tempPassword: user.tempPassword
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.verification_token).toBeDefined();
  });

  test('should reject invalid temporary password', async () => {
    const user = await createUserWithTempPassword();
    
    const response = await request(app)
      .post('/api/v1/auth/verify-temp-password')
      .send({
        email: user.email,
        tempPassword: 'wrong-password'
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test('should lock account after multiple failed attempts', async () => {
    const user = await createUserWithTempPassword();
    
    // Make 3 failed attempts
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/v1/auth/verify-temp-password')
        .send({
          email: user.email,
          tempPassword: 'wrong-password'
        });
    }

    const response = await request(app)
      .post('/api/v1/auth/verify-temp-password')
      .send({
        email: user.email,
        tempPassword: 'wrong-password'
      });

    expect(response.status).toBe(423);
    expect(response.body.lockout_info).toBeDefined();
  });
});
```

## Monitoring and Analytics

### Key Metrics to Track
- **Verification Success Rate**: Percentage of successful verifications
- **Failed Attempt Patterns**: Frequency and timing of failed attempts
- **Account Lockout Frequency**: How often accounts get locked
- **Geographic Distribution**: Where verification attempts originate
- **Device/Browser Patterns**: What devices/browsers are used

### Logging Events
- `temp_password_verified`: Successful verification
- `temp_password_failed`: Failed verification attempt
- `account_locked`: Account locked due to failed attempts
- `suspicious_activity`: Unusual patterns detected

## Security Considerations

### Best Practices
1. **Rate Limiting**: Implemented to prevent brute force attacks
2. **Progressive Lockouts**: Increasing lockout times deter attackers
3. **Activity Logging**: All attempts logged for security monitoring
4. **Token Expiry**: Short-lived tokens reduce exposure window
5. **Input Validation**: Comprehensive validation prevents injection attacks

### Potential Risks and Mitigations
1. **Email Interception**: 
   - Mitigation: Short token expiry, single-use tokens
2. **Brute Force Attacks**: 
   - Mitigation: Rate limiting, progressive lockouts
3. **Session Fixation**: 
   - Mitigation: New token generation, session invalidation
4. **CSRF Attacks**: 
   - Mitigation: CSRF tokens, SameSite cookies (if applicable)

## Changelog

### Version 1.0.0 (2025-01-27)
- Initial implementation of temporary password verification
- Progressive account lockout system
- Comprehensive error handling and validation
- Activity logging and security monitoring
- Frontend integration examples
- Complete API documentation 