# OAuth Validation Errors Fix

## Issue Description

**Error**: Multiple validation failures during OAuth user creation

```json
{
  "success": false,
  "message": "OAuth authentication failed",
  "error": "User validation failed: preferences.notifications.email: Cast to Object failed for value \"true\" (type boolean) at path \"notifications.email\", preferences.notifications.push: Cast to Object failed for value \"true\" (type boolean) at path \"notifications.push\", password: Path `password` is required., account_type: `student` is not a valid enum value for path `account_type`., meta.referral_source: `google` is not a valid enum value for path `referral_source`."
}
```

## Root Cause Analysis

### 1. Notifications Schema Mismatch

**Issue**: Setting boolean values for notification fields that expect objects

```javascript
// ❌ Incorrect structure
notifications: {
  email: true,  // Should be an object
  push: true,   // Should be an object
}
```

**Expected Schema**:

```javascript
notifications: {
  email: {
    marketing: Boolean,
    course_updates: Boolean,
    system_alerts: Boolean,
    weekly_summary: Boolean,
    achievement_unlocked: Boolean,
  },
  push: {
    enabled: Boolean,
    marketing: Boolean,
    course_reminders: Boolean,
    live_sessions: Boolean,
    community_activity: Boolean,
  },
  sms: {
    enabled: Boolean,
    course_reminders: Boolean,
    emergency_alerts: Boolean,
  }
}
```

### 2. Invalid account_type Enum Value

**Issue**: Using "student" which is not in the valid enum values

```javascript
account_type: "student"; // ❌ Invalid
```

**Valid Values**: `["free", "premium", "enterprise", "instructor", "admin"]`

### 3. Invalid referral_source Enum Value

**Issue**: Using provider name (e.g., "google") which is not in valid enum values

```javascript
referral_source: "google"; // ❌ Invalid
```

**Valid Values**: `["search", "social", "email", "referral", "direct", "advertisement", "other"]`

### 4. Password Required for OAuth Users

**Issue**: Password field is required but OAuth users don't have passwords

```javascript
password: {
  required: function () {
    return !this.is_demo; // ❌ OAuth users aren't demo but still shouldn't need password
  }
}
```

## Solutions Applied

### 1. Fixed Notifications Structure

**File**: `config/passport-config.js`

```javascript
// ✅ Correct object structure
notifications: {
  email: {
    marketing: false,
    course_updates: true,
    system_alerts: true,
    weekly_summary: true,
    achievement_unlocked: true,
  },
  push: {
    enabled: false,
    marketing: false,
    course_reminders: true,
    live_sessions: true,
    community_activity: false,
  },
  sms: {
    enabled: false,
    course_reminders: false,
    emergency_alerts: true,
  },
},
```

### 2. Fixed account_type Enum

**File**: `config/passport-config.js`

```javascript
// ✅ Use valid enum value
account_type: "free", // Default account type for OAuth users
```

### 3. Fixed referral_source Enum

**File**: `config/passport-config.js`

```javascript
// ✅ Use valid enum value
referral_source: "social", // OAuth logins are social referrals
```

### 4. Fixed Password Requirement

**File**: `models/user-modal.js`

```javascript
// ✅ Exclude OAuth users from password requirement
password: {
  type: String,
  required: function () {
    // Password is not required for demo users or OAuth users initially
    return !this.is_demo && !this.oauth;
  },
  minlength: [8, "Password must be at least 8 characters"],
},

password_set: {
  type: Boolean,
  default: function () {
    return !this.is_demo && !this.oauth; // OAuth users don't have passwords initially
  },
},
```

**File**: `config/passport-config.js`

```javascript
// ✅ Set password_set to false for OAuth users
password_set: false, // OAuth users don't have passwords initially
```

## Technical Details

### Before Fix

```javascript
// ❌ Multiple validation failures
{
  account_type: "student",           // Invalid enum
  referral_source: "google",         // Invalid enum
  notifications: {
    email: true,                     // Wrong type
    push: true                       // Wrong type
  },
  // password: undefined             // Required but missing
}
```

### After Fix

```javascript
// ✅ All validations pass
{
  account_type: "free",              // Valid enum
  referral_source: "social",         // Valid enum
  notifications: {
    email: {                         // Correct object structure
      marketing: false,
      course_updates: true,
      // ... other fields
    },
    push: {                          // Correct object structure
      enabled: false,
      marketing: false,
      // ... other fields
    }
  },
  password_set: false,               // OAuth users don't need passwords
  oauth: { /* OAuth data */ }        // Presence of oauth field exempts from password requirement
}
```

## Files Modified

1. **`config/passport-config.js`**

   - Fixed notifications structure
   - Changed account_type from "student" to "free"
   - Changed referral_source from provider name to "social"
   - Added password_set: false

2. **`models/user-modal.js`**
   - Updated password required validation to exclude OAuth users
   - Updated password_set default to exclude OAuth users

## Benefits

1. **Successful OAuth Registration**: OAuth users can now be created without validation errors
2. **Proper Data Structure**: Notifications follow the correct schema structure
3. **Valid Enum Values**: All enum fields use valid values from their respective schemas
4. **Flexible Authentication**: OAuth users don't require passwords while maintaining security

## Testing

After applying these fixes, OAuth authentication should complete successfully:

```javascript
// ✅ Expected successful response
{
  "success": true,
  "message": "OAuth authentication successful",
  "user": {
    "account_type": "free",
    "referral_source": "social",
    "notifications": { /* proper object structure */ },
    "password_set": false,
    "oauth": { /* OAuth provider data */ }
  }
}
```

## Related Issues Fixed

- OAuth user creation now completes successfully
- No more schema validation errors during OAuth flow
- Proper notification preferences structure
- Correct enum value usage throughout OAuth process
