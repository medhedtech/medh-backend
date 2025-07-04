# 🔐 Enhanced Password Change API Documentation

## Overview
The enhanced password change system provides secure, user-friendly password management with comprehensive validation, security monitoring, and notification features.

## API Endpoint

### Change Password
**PUT** `/api/v1/auth/change-password`

**Description:** Allows authenticated users to securely change their password with enhanced security features.

**Authentication:** Required (Bearer Token)

**Rate Limiting:** 5 requests per 15 minutes per IP

---

## Request Format

### Headers
```http
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

### Request Body
```json
{
  "currentPassword": "CurrentP@ssw0rd123",
  "newPassword": "NewSecureP@ssw0rd2024!",
  "confirmPassword": "NewSecureP@ssw0rd2024!",
  "invalidateAllSessions": false
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `currentPassword` | string | ✅ | User's current password for verification |
| `newPassword` | string | ✅ | New password meeting security requirements |
| `confirmPassword` | string | ✅ | Confirmation of new password (must match) |
| `invalidateAllSessions` | boolean | ❌ | Whether to log out all devices (default: false) |

---

## Password Security Requirements

### Minimum Requirements
- **Length:** 8-128 characters
- **Uppercase:** At least one uppercase letter (A-Z)
- **Lowercase:** At least one lowercase letter (a-z)
- **Numbers:** At least one digit (0-9)
- **Special Characters:** At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)

### Security Validations
- ❌ Cannot be same as current password
- ❌ Cannot contain common patterns (123456, password, qwerty, etc.)
- ❌ Cannot be a common dictionary password
- ❌ Cannot have more than 3 consecutive repeated characters
- ❌ Cannot be only numbers or only letters

### Password Strength Scoring
- **0-19:** Very Weak ❌
- **20-39:** Weak ⚠️
- **40-59:** Medium 🔶
- **60-79:** Strong ✅
- **80-100:** Very Strong 💪

---

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Password has been changed successfully.",
  "data": {
    "password_changed_at": "2024-01-15T10:30:00.000Z",
    "sessions_invalidated": false,
    "new_token": "eyJhbGciOiJIUzI1NiIs...",
    "security_recommendations": [
      "Use a unique password for each account",
      "Enable two-factor authentication for added security",
      "Regularly review your account activity",
      "Keep your recovery information up to date"
    ]
  }
}
```

### Error Responses

#### Validation Error (400 Bad Request)
```json
{
  "success": false,
  "message": "Password does not meet security requirements.",
  "errors": {
    "newPassword": [
      "Password must be at least 8 characters long",
      "Password must contain at least one uppercase letter"
    ]
  },
  "requirements": {
    "minLength": 8,
    "maxLength": 128,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSpecialChars": true,
    "noCommonPatterns": true
  }
}
```

#### Current Password Incorrect (400 Bad Request)
```json
{
  "success": false,
  "message": "Current password is incorrect",
  "attempts_remaining": 2
}
```

#### Account Locked (423 Locked)
```json
{
  "success": false,
  "message": "Account is temporarily locked. Please try again later.",
  "locked_until": "2024-01-15T10:45:00.000Z"
}
```

#### Authentication Error (401 Unauthorized)
```json
{
  "success": false,
  "message": "Access denied. Please provide a valid authentication token."
}
```

#### Rate Limit Error (429 Too Many Requests)
```json
{
  "success": false,
  "message": "Too many password change attempts. Please try again later.",
  "retry_after": 900
}
```

---

## Security Features

### 🔒 Enhanced Security Measures
- **Brute Force Protection:** Account locked after 3 failed attempts for 15 minutes
- **Rate Limiting:** 5 password change attempts per 15 minutes per IP
- **Password History:** Prevents reusing current password
- **Strong Encryption:** 12-round bcrypt hashing with salt
- **Session Management:** Option to invalidate all active sessions

### 📧 Security Notifications
- **Email Alerts:** Automatic notification when password is changed
- **Device Tracking:** Logs device and location information
- **Security Context:** Includes IP, browser, and OS details in notifications

### 📊 Activity Logging
- **Audit Trail:** Complete log of password change events
- **Security Events:** Flagged for security monitoring
- **Metadata Tracking:** Timestamp, device, location, and attempt count

---

## Example Usage

### JavaScript/Fetch Example
```javascript
const changePassword = async (currentPassword, newPassword, confirmPassword) => {
  try {
    const response = await fetch('/api/v1/auth/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
        invalidateAllSessions: false
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('Password changed successfully!');
      // Update token if new one provided
      if (data.data.new_token) {
        localStorage.setItem('token', data.data.new_token);
      }
    } else {
      console.error('Password change failed:', data.message);
    }

    return data;
  } catch (error) {
    console.error('Network error:', error);
    throw error;
  }
};
```

### cURL Example
```bash
curl -X PUT "https://api.medh.co/api/v1/auth/change-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "currentPassword": "CurrentP@ssw0rd123",
    "newPassword": "NewSecureP@ssw0rd2024!",
    "confirmPassword": "NewSecureP@ssw0rd2024!",
    "invalidateAllSessions": false
  }'
```

### Python/Requests Example
```python
import requests

def change_password(token, current_password, new_password, confirm_password):
    url = "https://api.medh.co/api/v1/auth/change-password"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    data = {
        "currentPassword": current_password,
        "newPassword": new_password,
        "confirmPassword": confirm_password,
        "invalidateAllSessions": False
    }
    
    response = requests.put(url, json=data, headers=headers)
    return response.json()
```

---

## Frontend Integration Guidelines

### Password Strength Indicator
Implement a real-time password strength indicator using the validation rules:

```javascript
function checkPasswordStrength(password) {
  let score = 0;
  const requirements = [];
  
  // Length check
  if (password.length >= 8) score += 20;
  else requirements.push("At least 8 characters");
  
  // Character checks
  if (/[a-z]/.test(password)) score += 15;
  else requirements.push("One lowercase letter");
  
  if (/[A-Z]/.test(password)) score += 15;
  else requirements.push("One uppercase letter");
  
  if (/\d/.test(password)) score += 15;
  else requirements.push("One number");
  
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
  else requirements.push("One special character");
  
  // Bonus points
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  
  return {
    score: Math.min(100, score),
    strength: score >= 80 ? 'Very Strong' : 
              score >= 60 ? 'Strong' : 
              score >= 40 ? 'Medium' : 
              score >= 20 ? 'Weak' : 'Very Weak',
    requirements
  };
}
```

### Form Validation
```javascript
const validatePasswordForm = (formData) => {
  const errors = {};
  
  if (!formData.currentPassword) {
    errors.currentPassword = "Current password is required";
  }
  
  if (!formData.newPassword) {
    errors.newPassword = "New password is required";
  } else if (formData.newPassword === formData.currentPassword) {
    errors.newPassword = "New password must be different from current password";
  }
  
  if (formData.newPassword !== formData.confirmPassword) {
    errors.confirmPassword = "Password confirmation does not match";
  }
  
  return errors;
};
```

---

## Security Best Practices

### For Developers
1. **Always validate on both client and server side**
2. **Use HTTPS for all password-related requests**
3. **Implement proper error handling**
4. **Never log passwords in plain text**
5. **Use secure token storage (httpOnly cookies preferred)**

### For Users
1. **Use unique passwords for each account**
2. **Enable two-factor authentication**
3. **Regularly update passwords**
4. **Use a password manager**
5. **Monitor account activity**

---

## Error Handling Best Practices

```javascript
const handlePasswordChangeError = (error) => {
  if (error.status === 400) {
    // Validation errors - show specific field errors
    displayFieldErrors(error.data.errors);
  } else if (error.status === 401) {
    // Unauthorized - redirect to login
    redirectToLogin();
  } else if (error.status === 423) {
    // Account locked - show lockout message
    showAccountLockedMessage(error.data.locked_until);
  } else if (error.status === 429) {
    // Rate limited - show retry message
    showRateLimitMessage(error.data.retry_after);
  } else {
    // Generic error
    showGenericErrorMessage();
  }
};
```

---

## Testing Examples

### Unit Test Example
```javascript
describe('Password Change API', () => {
  it('should change password successfully', async () => {
    const response = await request(app)
      .put('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        currentPassword: 'ValidCurrent123!',
        newPassword: 'NewSecurePass456@',
        confirmPassword: 'NewSecurePass456@',
        invalidateAllSessions: false
      });
      
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('password_changed_at');
  });
  
  it('should reject weak passwords', async () => {
    const response = await request(app)
      .put('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        currentPassword: 'ValidCurrent123!',
        newPassword: '123456',
        confirmPassword: '123456'
      });
      
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
```

---

## Changelog

### Version 2.0 (Current)
- ✅ Enhanced password strength validation
- ✅ Security notifications via email
- ✅ Session invalidation option
- ✅ Comprehensive activity logging
- ✅ Rate limiting and brute force protection
- ✅ Improved error handling and responses

### Version 1.0 (Legacy)
- Basic password change functionality
- Simple validation rules
- Minimal security features

---

## Support & Contact

For API support or security concerns:
- **Email:** api-care@medh.co
- **Security Issues:** security@medh.co
- **Documentation:** https://docs.medh.co/auth/password-change

---

*Last Updated: January 2024*
*API Version: 2.0* 