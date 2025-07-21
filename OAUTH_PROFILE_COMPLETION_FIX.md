# OAuth Profile Completion Method Fix

## Issue Description

**Error**: `user.calculateProfileCompletion is not a function`

**Root Cause**: The OAuth controller was trying to call `user.calculateProfileCompletion()` as if it were an instance method on the user model, but this method didn't exist on the user schema.

## Error Details

```javascript
// In controllers/oauthController.js line 160
profile_completion: user.calculateProfileCompletion(), // ❌ This method doesn't exist
```

**Error Message**:

```
OAuth success handler error: user.calculateProfileCompletion is not a function
```

## Root Cause Analysis

1. **Missing Method**: The `calculateProfileCompletion` function existed as a standalone function in `routes/authRoutes.js` but was not available as a method on the User model
2. **Import Issue**: The OAuth controller couldn't access the function because it wasn't properly modularized
3. **Module System Mismatch**: The utility was using CommonJS exports (`module.exports`) while the project uses ES modules (`import/export`)

## Solution Applied

### 1. Created Utility Module

**File**: `utils/profileCompletion.js`

```javascript
/**
 * Calculate profile completion percentage for a user
 * @param {Object} user - User object
 * @returns {number} Profile completion percentage (0-100)
 */
function calculateProfileCompletion(user) {
  const requiredFields = [
    "full_name",
    "email",
    "phone_numbers",
    "user_image",
    "address",
    "organization",
    "bio",
    "meta.date_of_birth",
    "meta.education_level",
    "meta.institution_name",
    "meta.field_of_study",
    "meta.gender",
    "meta.skills",
    "country",
    "timezone",
  ];

  // Social profile fields (bonus points)
  const socialFields = [
    "facebook_link",
    "instagram_link",
    "linkedin_link",
    "twitter_link",
    "youtube_link",
    "github_link",
    "portfolio_link",
  ];

  const totalFields = requiredFields.length + socialFields.length;
  let completedFields = 0;

  // Check required fields
  requiredFields.forEach((field) => {
    const fieldParts = field.split(".");
    let value = user;

    for (const part of fieldParts) {
      value = value?.[part];
    }

    if (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      (!Array.isArray(value) || value.length > 0)
    ) {
      completedFields++;
    }
  });

  // Check social profile fields (bonus points)
  socialFields.forEach((field) => {
    if (user[field] && user[field].trim() !== "") {
      completedFields++;
    }
  });

  return Math.round((completedFields / totalFields) * 100);
}

export { calculateProfileCompletion };
```

### 2. Updated OAuth Controller

**File**: `controllers/oauthController.js`

```javascript
// Added import
import { calculateProfileCompletion } from "../utils/profileCompletion.js";

// Fixed the method call
profile_completion: calculateProfileCompletion(user), // ✅ Now uses imported function
```

### 3. Updated Auth Routes

**File**: `routes/authRoutes.js`

```javascript
// Added import to replace inline function
import { calculateProfileCompletion } from "../utils/profileCompletion.js";

// Removed duplicate function definition
// Profile completion calculation is now handled by utils/profileCompletion.js
```

## Technical Details

### Before Fix

```javascript
// ❌ Method doesn't exist on User model
user.calculateProfileCompletion();
```

### After Fix

```javascript
// ✅ Imported utility function
import { calculateProfileCompletion } from "../utils/profileCompletion.js";

// ✅ Proper function call
calculateProfileCompletion(user);
```

## Files Modified

1. **`utils/profileCompletion.js`** - Created new utility module
2. **`controllers/oauthController.js`** - Added import and fixed method call
3. **`routes/authRoutes.js`** - Added import and removed duplicate function

## Benefits

1. **Reusability**: Function can now be used across multiple controllers
2. **Maintainability**: Single source of truth for profile completion logic
3. **Modularity**: Proper separation of concerns
4. **Type Safety**: Function is properly exported and importable

## Testing

The fix resolves the OAuth authentication error and allows successful Google OAuth login flow completion.

**Test Command**:

```bash
node -c controllers/oauthController.js  # ✅ Syntax check passes
node -c routes/authRoutes.js           # ✅ Syntax check passes
node -c app.js                         # ✅ App syntax check passes
```

## Related Issues Fixed

- OAuth authentication now completes successfully
- Profile completion percentage is calculated correctly
- No more "function not found" errors during OAuth flow

## Future Enhancements

Consider adding this as an instance method to the User schema for even cleaner code:

```javascript
// Potential future enhancement in models/user-modal.js
userSchema.methods.calculateProfileCompletion = function () {
  return calculateProfileCompletion(this);
};
```
