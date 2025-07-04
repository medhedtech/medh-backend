# Conditional Profile Validation System

## Overview
This document explains the new conditional validation system for profile updates that implements the requirement: **"No fields are required by default, but fields that already have data cannot be emptied once set"**.

## Key Features

### 🔧 **Conditional Required Fields**
- **Empty fields can remain empty** - No validation errors for unset fields
- **Existing fields cannot be emptied** - Once a field has data, it cannot be set to empty/null
- **New data is validated** - When providing new values, they must meet format requirements

### 🛡️ **Field Categories**

#### **Core Identity Fields (Cannot be emptied once set):**
- ✅ `full_name` - User's full name
- ✅ `username` - Unique username
- ✅ `phone_numbers` - Contact phone numbers
- ✅ `age` - User's age
- ✅ `age_group` - Age category
- ✅ `address` - Physical address
- ✅ `organization` - Organization/company name
- ✅ `bio` - Personal biography
- ✅ `country` - Country of residence
- ✅ `timezone` - User's timezone
- ✅ `meta.date_of_birth` - Date of birth
- ✅ `meta.gender` - Gender identity

#### **Social/Optional Fields (Can be emptied):**
- 🔄 `facebook_link` - Facebook profile URL
- 🔄 `instagram_link` - Instagram profile URL
- 🔄 `linkedin_link` - LinkedIn profile URL
- 🔄 `twitter_link` - Twitter/X profile URL
- 🔄 `youtube_link` - YouTube channel URL
- 🔄 `github_link` - GitHub profile URL
- 🔄 `portfolio_link` - Portfolio website URL
- 🔄 `user_image.url` - Profile picture URL
- 🔄 `cover_image.url` - Cover image URL
- 🔄 `meta.nationality` - Nationality
- 🔄 `meta.occupation` - Current occupation
- 🔄 `meta.industry` - Industry sector
- 🔄 `meta.company` - Company name

#### **Special Fields:**
- 🔐 `password` - Always optional, validated only when provided

## Implementation Details

### **Route Configuration**
```javascript
// Updated route uses conditional validation
router.put(
  "/me/comprehensive",
  authenticateToken,
  authorize(["admin", "instructor", "super-admin", "student", "corporate", "corporate-student", "parent"]),
  validateComprehensiveProfileUpdateConditional, // New validation function
  updateComprehensiveProfile
);
```

### **Validation Logic**
```javascript
// Example: Full name validation
body('full_name')
  .custom((value, { req }) => {
    const existing = req.existingUserData?.full_name;
    // If field exists and user is trying to empty it, require it
    if (existing && (!value || value.trim() === '')) {
      throw new Error('Full name cannot be empty once set');
    }
    // If providing a value, validate format
    if (value && value.trim() !== '') {
      // Format validation logic here
    }
    return true;
  })
```

## API Usage Examples

### **✅ Valid Requests**

#### **Setting fields for the first time:**
```json
PUT /api/v1/profile/me/comprehensive
{
  "full_name": "John Doe",
  "age": 25,
  "country": "USA"
}
```

#### **Updating existing fields:**
```json
PUT /api/v1/profile/me/comprehensive
{
  "full_name": "John Smith", // Updating existing name
  "bio": "Updated bio text"   // Updating existing bio
}
```

#### **Adding optional fields:**
```json
PUT /api/v1/profile/me/comprehensive
{
  "facebook_link": "https://facebook.com/johndoe",
  "linkedin_link": "https://linkedin.com/in/johndoe"
}
```

#### **Removing optional fields:**
```json
PUT /api/v1/profile/me/comprehensive
{
  "facebook_link": "",     // Can be emptied
  "instagram_link": null   // Can be set to null
}
```

### **❌ Invalid Requests**

#### **Trying to empty required fields:**
```json
PUT /api/v1/profile/me/comprehensive
{
  "full_name": "",    // Error: Full name cannot be empty once set
  "age": null,        // Error: Age cannot be empty once set
  "country": ""       // Error: Country cannot be empty once set
}
```

#### **Invalid format validation:**
```json
PUT /api/v1/profile/me/comprehensive
{
  "full_name": "123",                           // Error: Invalid characters
  "age": 150,                                   // Error: Age out of range
  "facebook_link": "not-a-valid-url"          // Error: Invalid Facebook URL
}
```

## Error Response Format

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "type": "field",
      "value": "",
      "msg": "Full name cannot be empty once set",
      "path": "full_name",
      "location": "body"
    }
  ]
}
```

## Benefits

### **🚀 User Experience**
- **Flexible onboarding** - Users can complete profiles gradually
- **Data integrity** - Important information cannot be accidentally deleted
- **Clear feedback** - Specific error messages for validation failures

### **🔧 Developer Benefits**
- **Backward compatible** - Existing API calls continue to work
- **Maintainable** - Clear separation between required and optional fields
- **Extensible** - Easy to modify field categories as needed

### **🛡️ Data Protection**
- **Prevents data loss** - Core profile data cannot be accidentally emptied
- **Maintains consistency** - Profile completeness is preserved
- **Audit friendly** - Clear rules about what can and cannot be modified

## Migration Notes

### **Existing Profiles**
- All existing profiles continue to work without changes
- Fields that already have data become protected from emptying
- New fields can be added without validation errors

### **API Compatibility**
- The endpoint URL remains the same: `PUT /api/v1/profile/me/comprehensive`
- Request/response formats are unchanged
- Only validation behavior has been modified

## Testing the Implementation

### **Test Cases to Verify**

1. **New Profile Creation** - All fields should be optional
2. **Updating Existing Fields** - Should work with valid data
3. **Emptying Core Fields** - Should fail with appropriate errors
4. **Emptying Optional Fields** - Should succeed
5. **Format Validation** - Invalid formats should be rejected
6. **Mixed Updates** - Combination of valid/invalid changes

### **Sample Test Request**
```bash
# Test with curl
curl -X PUT http://localhost:8080/api/v1/profile/me/comprehensive \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "facebook_link": "",
    "age": 25
  }'
```

## Troubleshooting

### **Common Issues**

1. **"Field cannot be empty once set" Error**
   - **Cause:** Trying to empty a field that already has data
   - **Solution:** Provide a valid value or don't include the field in the request

2. **"Invalid format" Errors**
   - **Cause:** Data doesn't meet validation requirements
   - **Solution:** Check format requirements in error message

3. **"User not found" Error**
   - **Cause:** Authentication token is invalid or user doesn't exist
   - **Solution:** Verify authentication and user existence

### **Debug Mode**
Set `NODE_ENV=development` to see detailed error messages in responses.

---

## Summary

The new conditional validation system provides a perfect balance between flexibility and data integrity. Users can build their profiles gradually without being forced to fill required fields, but once important information is provided, it cannot be accidentally lost.

This implementation maintains full backward compatibility while providing enhanced user experience and data protection. 