# Student Status Toggle Guide - WORKING SOLUTION ✅

## ✅ Issue Resolved Successfully!

The route `/api/v1/auth/toggle-status/:id` is working correctly. The issue was using the wrong HTTP method and missing authentication.

## 🎯 Working Solution

### For Shivansh Rajak (ID: 6822e9bf2703b671efcf9ba6)

**✅ CORRECT METHOD:**
```bash
curl -X PUT http://localhost:8080/api/v1/auth/toggle-status/6822e9bf2703b671efcf9ba6 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**❌ INCORRECT (what you were probably doing):**
```bash
# Wrong - using GET instead of PUT
curl -X GET http://localhost:8080/api/v1/auth/toggle-status/6822e9bf2703b671efcf9ba6

# Wrong - missing Authorization header
curl -X PUT http://localhost:8080/api/v1/auth/toggle-status/6822e9bf2703b671efcf9ba6
```

## 📋 Step-by-Step Instructions

### Step 1: Get Authentication Token
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your_admin_email@example.com",
    "password": "your_password"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Step 2: Toggle Student Status
```bash
curl -X PUT http://localhost:8080/api/v1/auth/toggle-status/6822e9bf2703b671efcf9ba6 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_FROM_STEP_1"
```

**Success Response:**
```json
{
  "success": true,
  "message": "User status changed to Active",
  "data": {
    "_id": "6822e9bf2703b671efcf9ba6",
    "full_name": "Shivansh Rajak",
    "email": "shivanshrajak2803@gmail.com",
    "status": "Active",
    "role": ["student"],
    "updatedAt": "2025-05-26T10:38:30.112Z"
  }
}
```

## 🧪 Test Results

**✅ Tested and Confirmed Working:**
- ✅ Status changed from "Inactive" → "Active"
- ✅ Status changed from "Active" → "Inactive" 
- ✅ Both directions work perfectly
- ✅ User data is properly updated
- ✅ Response includes updated timestamp

## 🔧 Frontend Implementation

### JavaScript/React Example
```javascript
const toggleStudentStatus = async (studentId) => {
  try {
    // Get token from localStorage or your auth state
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`/api/v1/auth/toggle-status/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`Status changed to: ${data.data.status}`);
      // Update your UI here
      return data.data;
    } else {
      console.error('Error:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};

// Usage
toggleStudentStatus('6822e9bf2703b671efcf9ba6');
```

### React Hook Example
```javascript
import { useState } from 'react';

const useToggleStatus = () => {
  const [loading, setLoading] = useState(false);
  
  const toggleStatus = async (userId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/v1/auth/toggle-status/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Toggle status error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  return { toggleStatus, loading };
};
```

## 📊 Available Endpoints

| Endpoint | Method | Auth Required | Use Case |
|----------|--------|---------------|----------|
| `/api/v1/auth/toggle-status/:id` | PUT | ✅ Yes | Toggle any user status (recommended) |
| `/api/v1/students/toggle-status/:id` | POST | ❌ No | Toggle student-specific records |

## 🚨 Common Errors and Solutions

### Error: "Invalid route"
- **Cause**: Using GET instead of PUT
- **Solution**: Use `PUT` method

### Error: "Authentication required"
- **Cause**: Missing Authorization header
- **Solution**: Include `Authorization: Bearer TOKEN`

### Error: "User not found"
- **Cause**: Invalid user ID
- **Solution**: Verify the user ID exists

### Error: "Invalid token"
- **Cause**: Expired or malformed token
- **Solution**: Login again to get a fresh token

## 🎉 Summary

The student status toggle functionality is **working perfectly**! The issue was simply:

1. **Wrong HTTP Method**: You need to use `PUT` instead of `GET`
2. **Missing Authentication**: You need to include the `Authorization: Bearer TOKEN` header

The route exists, the logic works, and the database updates correctly. Just make sure to use the correct method and include authentication! 

**Status for Shivansh Rajak can now be toggled successfully between Active and Inactive.** ✅ 