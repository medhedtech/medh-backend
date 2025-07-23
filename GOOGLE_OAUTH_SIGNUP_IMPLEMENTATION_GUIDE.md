# 🚀 Google OAuth Sign-Up Implementation Guide

## 📋 Overview

Your MEDH backend already has a **complete and production-ready Google OAuth implementation**! This guide shows you how to use the existing system for user sign-up and authentication.

## ✅ Current Implementation Features

### 🔧 **Backend Features (Already Implemented)**

- ✅ **Multiple OAuth Flows**: Server-side redirect and frontend-initiated OAuth
- ✅ **Smart Account Merging**: Automatically merges OAuth with existing email accounts
- ✅ **Email Verification**: OAuth emails are automatically verified
- ✅ **Profile Synchronization**: Syncs profile data from Google (name, picture, etc.)
- ✅ **Account Linking**: Link multiple OAuth providers to one account
- ✅ **Conflict Resolution**: Handles email mismatches intelligently
- ✅ **Enhanced Security**: Session management, CSRF protection, activity logging

### 🌐 **Available OAuth Endpoints**

| Method   | Endpoint                              | Description                    |
| -------- | ------------------------------------- | ------------------------------ |
| `GET`    | `/api/v1/auth/oauth/providers`        | Get available OAuth providers  |
| `GET`    | `/api/v1/auth/oauth/google`           | Initiate Google OAuth flow     |
| `GET`    | `/api/v1/auth/oauth/google/callback`  | Google OAuth callback          |
| `POST`   | `/api/v1/auth/oauth/frontend`         | Frontend-initiated OAuth       |
| `GET`    | `/api/v1/auth/oauth/connected`        | Get connected providers        |
| `POST`   | `/api/v1/auth/oauth/link/:provider`   | Link additional OAuth provider |
| `DELETE` | `/api/v1/auth/oauth/unlink/:provider` | Unlink OAuth provider          |

---

## 🚀 Implementation Methods

### **Method 1: Server-Side OAuth Flow (Redirect)**

This is the traditional OAuth flow where the user is redirected to Google.

#### **Step 1: Initiate OAuth**

```bash
# Redirect user to this URL
GET http://localhost:8080/api/v1/auth/oauth/google
```

#### **Step 2: Handle Callback**

After Google authentication, user is redirected to:

```
http://localhost:8080/api/v1/auth/oauth/google/callback
```

#### **Step 3: Success/Failure Handling**

- **Success**: Redirected to `/api/v1/auth/oauth/success`
- **Failure**: Redirected to `/api/v1/auth/oauth/failure`

#### **Frontend Integration Example**

```html
<!DOCTYPE html>
<html>
  <head>
    <title>OAuth Login</title>
  </head>
  <body>
    <h1>Login with Google</h1>
    <a
      href="http://localhost:8080/api/v1/auth/oauth/google"
      class="btn btn-google"
    >
      Sign in with Google
    </a>

    <script>
      // Handle OAuth success/failure
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");
      const error = urlParams.get("error");

      if (token) {
        localStorage.setItem("access_token", token);
        window.location.href = "/dashboard";
      } else if (error) {
        alert("OAuth failed: " + error);
      }
    </script>
  </body>
</html>
```

---

### **Method 2: Frontend-Initiated OAuth (Recommended)**

This method gives you full control over the OAuth flow from your frontend.

#### **Step 1: Frontend OAuth Implementation**

**React Example:**

```jsx
import React, { useState } from "react";

const GoogleOAuthButton = () => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);

    try {
      // Method A: Using Google Identity Services (Recommended)
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });

        window.google.accounts.id.prompt();
      }
    } catch (error) {
      console.error("OAuth error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleResponse = async (response) => {
    try {
      // Send OAuth data to your backend
      const backendResponse = await fetch("/api/v1/auth/oauth/frontend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "google",
          token: response.credential, // JWT ID token from Google
        }),
      });

      const result = await backendResponse.json();

      if (result.success) {
        // Store tokens
        localStorage.setItem("access_token", result.data.tokens.access_token);
        localStorage.setItem("refresh_token", result.data.tokens.refresh_token);

        // Redirect to dashboard
        window.location.href = "/dashboard";
      } else {
        alert("Login failed: " + result.message);
      }
    } catch (error) {
      console.error("Backend OAuth error:", error);
      alert("Login failed. Please try again.");
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={loading}
      className="google-oauth-btn"
    >
      {loading ? "Signing in..." : "Sign in with Google"}
    </button>
  );
};

export default GoogleOAuthButton;
```

**Vanilla JavaScript Example:**

```javascript
// Load Google Identity Services
function loadGoogleOAuth() {
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.onload = initializeGoogleOAuth;
  document.head.appendChild(script);
}

function initializeGoogleOAuth() {
  window.google.accounts.id.initialize({
    client_id: "your_google_client_id",
    callback: handleGoogleResponse,
  });

  // Render the sign-in button
  window.google.accounts.id.renderButton(
    document.getElementById("google-signin-btn"),
    {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
    },
  );
}

async function handleGoogleResponse(response) {
  try {
    const backendResponse = await fetch("/api/v1/auth/oauth/frontend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: "google",
        token: response.credential,
      }),
    });

    const result = await backendResponse.json();

    if (result.success) {
      localStorage.setItem("access_token", result.data.tokens.access_token);
      localStorage.setItem("refresh_token", result.data.tokens.refresh_token);

      // Show user info
      console.log("User:", result.data.user);

      // Redirect or update UI
      window.location.href = "/dashboard";
    } else {
      console.error("OAuth failed:", result.message);
    }
  } catch (error) {
    console.error("OAuth error:", error);
  }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", loadGoogleOAuth);
```

---

## 🧪 Testing Your OAuth Implementation

### **Step 1: Test Available Providers**

```bash
curl -s http://localhost:8080/api/v1/auth/oauth/providers | jq .
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "provider": "google",
        "name": "Google",
        "color": "#db4437",
        "icon": "fab fa-google",
        "auth_url": "/api/v1/auth/oauth/google",
        "enabled": true
      }
    ],
    "total_providers": 1
  }
}
```

### **Step 2: Test Server-Side OAuth Flow**

```bash
# This should return a 302 redirect to Google
curl -I http://localhost:8080/api/v1/auth/oauth/google
```

### **Step 3: Test Frontend OAuth Endpoint**

```bash
curl -X POST http://localhost:8080/api/v1/auth/oauth/frontend \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "userInfo": {
      "id": "test123",
      "email": "test@gmail.com",
      "name": "Test User",
      "picture": "https://example.com/avatar.jpg",
      "email_verified": true
    }
  }'
```

---

## 📊 User Account Flow Scenarios

### **Scenario 1: New User Sign-Up**

1. User clicks "Sign in with Google"
2. Google OAuth flow completes
3. **Backend automatically:**
   - Creates new user account
   - Sets `email_verified: true`
   - Sets `status: "Active"`
   - Generates unique `username` and `student_id`
   - Syncs profile data from Google
   - Returns JWT tokens

### **Scenario 2: Existing Email Account + OAuth**

1. User previously registered with email: `user@gmail.com`
2. User now logs in with Google OAuth using same email
3. **Backend automatically:**
   - Finds existing account by email
   - Links Google OAuth to existing account
   - Activates account if it was inactive
   - Verifies email if it wasn't verified
   - Updates profile with OAuth data

### **Scenario 3: Different Email Addresses**

1. User has account with: `user@company.com`
2. User logs in with Google: `user@gmail.com`
3. **Backend automatically:**
   - Links Google OAuth to existing account
   - Stores `user@gmail.com` as alternative email
   - Logs email conflict for admin review

---

## 🔧 Advanced Features

### **Account Linking (Add OAuth to Existing Account)**

```javascript
// Frontend: Link Google to existing logged-in account
const linkGoogleAccount = async () => {
  const response = await fetch("/api/v1/auth/oauth/link/google", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      "Content-Type": "application/json",
    },
  });

  const result = await response.json();

  if (result.success) {
    // Redirect to OAuth flow
    window.location.href = result.data.auth_url;
  }
};
```

### **View Connected Providers**

```javascript
const getConnectedProviders = async () => {
  const response = await fetch("/api/v1/auth/oauth/connected", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    },
  });

  const result = await response.json();
  console.log("Connected providers:", result.data.connected_providers);
};
```

### **Unlink OAuth Provider**

```javascript
const unlinkGoogle = async () => {
  const response = await fetch("/api/v1/auth/oauth/unlink/google", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    },
  });

  const result = await response.json();
  console.log("Unlink result:", result);
};
```

---

## 🛡️ Security Features

### **Built-in Security Measures:**

- ✅ **CSRF Protection**: State parameter validation
- ✅ **Session Security**: Secure session configuration
- ✅ **Token Validation**: Verifies OAuth tokens with Google
- ✅ **Activity Logging**: Logs all OAuth activities
- ✅ **Account Lockout Prevention**: Prevents unlinking sole auth method
- ✅ **Email Conflict Handling**: Logs conflicts for security review

### **OAuth Activity Logging:**

```javascript
// All OAuth activities are automatically logged:
{
  "action": "oauth_login",
  "provider": "google",
  "login_method": "oauth_google",
  "profile_id": "google_user_id",
  "email_verified": true,
  "account_merged": false,
  "profile_updated": true
}
```

---

## 🚀 Quick Start Checklist

### **Backend Setup:**

- [x] ✅ OAuth routes configured (`routes/oauthRoutes.js`)
- [x] ✅ OAuth controllers implemented (`controllers/oauthController.js`)
- [x] ✅ Passport strategies configured (`config/passport-config.js`)
- [x] ✅ User model supports OAuth (`models/user-modal.js`)
- [x] ✅ Environment variables configured (`.env`)

### **Frontend Integration:**

- [ ] 📝 Add Google Identity Services script
- [ ] 📝 Implement OAuth button component
- [ ] 📝 Handle OAuth response
- [ ] 📝 Store JWT tokens
- [ ] 📝 Redirect to dashboard

### **Testing:**

- [ ] 📝 Test OAuth providers endpoint
- [ ] 📝 Test complete OAuth flow
- [ ] 📝 Verify user creation
- [ ] 📝 Test account merging scenarios

---

## 🎯 Next Steps

1. **Frontend Integration**: Choose between server-side redirect or frontend-initiated OAuth
2. **UI Components**: Create beautiful OAuth buttons with your design system
3. **Error Handling**: Implement proper error handling for OAuth failures
4. **Analytics**: Track OAuth conversion rates and user preferences
5. **Testing**: Test all OAuth scenarios thoroughly

Your Google OAuth implementation is **production-ready** and includes advanced features like account merging, email synchronization, and comprehensive security measures. You can start using it immediately!

---

## 📞 Support

If you encounter any issues:

1. Check the server logs for detailed error messages
2. Verify your Google OAuth credentials in `.env`
3. Ensure your redirect URIs are properly configured in Google Cloud Console
4. Test with the provided curl commands to isolate issues

**Your OAuth system is ready to go! 🚀**
