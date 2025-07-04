# MFA (Multi-Factor Authentication) Integration Guide

## Overview
The MFA system has been successfully integrated and is now working correctly. The initial 500 error was resolved by fixing the TOTP secret generation method.

## Issue Resolution

### Problem
- **Error**: `500 Internal Server Error` with message `"Unknown encoding: base32"`
- **Cause**: The original code was trying to use `crypto.randomBytes().toString('base32')` but Node.js crypto module doesn't support base32 encoding natively

### Solution
- **Fixed**: Replaced custom implementation with proper `speakeasy` library usage
- **Added**: QR code URL generation for better user experience
- **Enhanced**: Proper TOTP verification using speakeasy

## API Endpoints

### 1. Setup TOTP MFA
```http
POST /api/v1/auth/mfa/setup/totp
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "message": "TOTP setup initiated. Please use your authenticator app.",
  "data": {
    "secret": "FFSFW4DHFRRWOOJ2LJFCKJKNHB2VIJRM",
    "manual_entry_key": "FFSFW4DHFRRWOOJ2LJFCKJKNHB2VIJRM",
    "qr_code_url": "otpauth://totp/Medh%20Learning%20Platform%20(user@example.com)?secret=FFSFW4DHFRRWOOJ2LJFCKJKNHB2VIJRM",
    "backup_codes": null,
    "instructions": [
      "1. Install an authenticator app (Google Authenticator, Authy, etc.)",
      "2. Scan the QR code or manually enter the secret key",
      "3. Enter the 6-digit code from your app to complete setup"
    ]
  }
}
```

### 2. Verify TOTP Setup
```http
POST /api/v1/auth/mfa/setup/totp/verify
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "code": "123456"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Two-factor authentication enabled successfully!",
  "data": {
    "backup_codes": ["A1B2C3D4", "E5F6G7H8", "..."],
    "setup_date": "2025-06-21T14:27:37.000Z",
    "warning": "Please save these backup codes in a secure location. They will not be shown again."
  }
}
```

### 3. Check MFA Status
```http
GET /api/v1/auth/mfa/status
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "message": "MFA status retrieved successfully",
  "data": {
    "enabled": false,
    "method": null,
    "setup_date": null,
    "phone_number": null,
    "backup_codes_count": 0,
    "last_regenerated": null
  }
}
```

### 4. Other Available Endpoints
- `POST /api/v1/auth/mfa/setup/sms` - Setup SMS-based MFA
- `POST /api/v1/auth/mfa/setup/sms/verify` - Verify SMS setup
- `POST /api/v1/auth/mfa/verify` - Verify MFA during login
- `POST /api/v1/auth/mfa/send-sms` - Send SMS code for verification
- `POST /api/v1/auth/mfa/disable` - Disable MFA
- `POST /api/v1/auth/mfa/backup-codes/regenerate` - Regenerate backup codes

## Technical Implementation

### Dependencies
- `speakeasy`: For TOTP generation and verification
- `express-validator`: For input validation
- MongoDB for user data storage

### Key Features
1. **TOTP Support**: Time-based One-Time Passwords using authenticator apps
2. **SMS Support**: SMS-based verification codes
3. **Backup Codes**: Recovery codes for account access
4. **QR Code Generation**: Easy setup with authenticator apps
5. **Proper Security**: Secure secret generation and verification

### Database Schema
The user model includes the following MFA-related fields:
```javascript
{
  two_factor_enabled: Boolean,
  two_factor_method: String, // 'totp' or 'sms'
  two_factor_secret: String,
  two_factor_temp_secret: String,
  two_factor_phone: String,
  backup_codes: [String],
  two_factor_setup_date: Date,
  // ... other fields
}
```

## Usage Example

### Frontend Integration
```javascript
// 1. Initiate TOTP setup
const setupResponse = await fetch('/api/v1/auth/mfa/setup/totp', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const setupData = await setupResponse.json();

// 2. Display QR code to user
// Use setupData.data.qr_code_url to generate QR code
// Or show setupData.data.manual_entry_key for manual entry

// 3. Verify setup with code from authenticator
const verifyResponse = await fetch('/api/v1/auth/mfa/setup/totp/verify', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: userEnteredCode
  })
});

const verifyData = await verifyResponse.json();
// Save backup codes securely
```

### QR Code Generation
You can use the `qr_code_url` from the setup response to generate QR codes using libraries like:
- `qrcode` (Node.js)
- `qrcode.js` (Browser)
- `react-qr-code` (React)

## Security Considerations

1. **Secret Storage**: Secrets are stored hashed in the database
2. **Backup Codes**: Generated as secure random strings and hashed
3. **Time Window**: TOTP codes have a 30-second validity window with ±2 window tolerance
4. **Rate Limiting**: Authentication endpoints have rate limiting
5. **Activity Logging**: All MFA activities are logged for security auditing

## Error Handling

The system includes comprehensive error handling:
- Invalid tokens return 401 Unauthorized
- Missing required fields return 400 Bad Request
- Server errors return 500 Internal Server Error with appropriate logging

## Testing

The MFA system has been tested and verified:
✅ TOTP setup endpoint works correctly
✅ Secret generation using speakeasy
✅ QR code URL generation
✅ Proper error responses
✅ Authentication and authorization
✅ Status endpoint functionality

## Next Steps

1. **Frontend Implementation**: Build UI components for MFA setup and verification
2. **QR Code Display**: Implement QR code generation in the frontend
3. **SMS Integration**: Configure SMS provider for SMS-based MFA
4. **Recovery Flow**: Implement account recovery using backup codes
5. **Admin Management**: Add admin endpoints for MFA management

## Configuration

The MFA system is configured in the controller with these settings:
```javascript
this.mfaConfig = {
  serviceName: "Medh Learning Platform",
  window: 2, // Allow 2 time windows before/after current time
  backupCodeLength: 8,
  backupCodeCount: 10,
  smsCodeLength: 6,
  smsCodeExpiry: 5 * 60 * 1000, // 5 minutes
  totpStep: 30, // 30 seconds
};
```

These can be made configurable via environment variables if needed.