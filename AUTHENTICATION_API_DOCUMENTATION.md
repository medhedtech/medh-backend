# Authentication & Login API Documentation

This document describes how to use the authentication and login endpoints in the Medh Backend.

Base URL: `/api/v1/auth`

---

## 1. Local Authentication (JWT)

### 1.1 Register a New User

- **Endpoint:** `POST /register`
- **Description:** Create a new user account; sends OTP to email for verification.
- **Request Headers:**
  - `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone_numbers": [{ "country": "+1", "number": "1234567890" }],
    "password": "password123",
    "agree_terms": true
  }
  ```
- **Responses:**
  - `201 Created`:
    ```json
    {
      "success": true,
      "message": "User registered successfully. Please verify your email with the OTP sent.",
      "data": {
        "id": "<userId>",
        "email": "john@example.com",
        "full_name": "John Doe",
        "role": ["student"]
      }
    }
    ```
  - `400 Bad Request`: validation errors or user exists.

### 1.2 Verify Email OTP

- **Endpoint:** `POST /verify-email`
- **Description:** Confirm email with OTP code.
- **Request Body:**
  ```json
  { "email": "john@example.com", "otp": "123456" }
  ```
- **Responses:**
  - `200 OK`: email verified.
  - `400/404`: missing or invalid OTP.

### 1.3 Resend Verification OTP

- **Endpoint:** `POST /resend-verification`
- **Description:** Resend the OTP email.
- **Request Body:**
  ```json
  { "email": "john@example.com" }
  ```
- **Response:** `200 OK` on success.

### 1.4 Login

- **Endpoint:** `POST /login`
- **Description:** Authenticate with email and password; returns JWT and refresh token.
- **Request Body:**
  ```json
  { "email": "john@example.com", "password": "password123" }
  ```
- **Response:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "token": "<jwt-token>",
      "refresh_token": "<refresh-token>",
      "expires_in": 604800 // seconds
    }
    ```

### 1.5 Refresh Access Token

- **Endpoint:** `POST /refresh-token`
- **Description:** Obtain a new access token using a valid refresh token.
- **Request Body:**
  ```json
  { "refresh_token": "<refresh-token>" }
  ```
- **Response:** `200 OK` with new `token`.

### 1.6 Logout

- **Endpoint:** `POST /logout`
- **Description:** Invalidate the refresh token.
- **Request Headers:**
  - `Authorization: Bearer <jwt-token>`
- **Response:** `200 OK` on success.

### 1.7 Forgot Password

- **Endpoint:** `POST /forgot-password`
- **Description:** Send reset link or OTP to user email.
- **Request Body:** `{ "email": "john@example.com" }`
- **Response:** `200 OK`.

### 1.8 Reset Password

- **Endpoint:** `POST /reset-password`
- **Description:** Reset user password with token.
- **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "token": "<reset-token>",
    "new_password": "newPass123"
  }
  ```
- **Response:** `200 OK`.

---

## 2. OAuth Social Login (Enhanced)

Base URL: `/api/v1/auth/oauth`

### 2.1 List Available Providers

- **Endpoint:** `GET /providers`
- **Description:** Returns which social logins are configured in `.env`.
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "providers": [
        { "provider": "google", "auth_url": "/api/v1/auth/oauth/google" },
        { "provider": "facebook", "auth_url": "/api/v1/auth/oauth/facebook" }
        // ...
      ]
    }
  }
  ```

### 2.2 Frontend-Initiated OAuth Login (Enhanced)

- **Endpoint:** `POST /oauth/frontend`
- **Description:** Handle OAuth authentication initiated from frontend with enhanced features.
- **Request Body:**
  ```json
  {
    "provider": "google",
    "token": "oauth_access_token", // Optional: OAuth access token
    "code": "oauth_auth_code", // Optional: OAuth authorization code
    "userInfo": {
      // Optional: Pre-processed user data
      "id": "provider_user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "picture": "https://...",
      "email_verified": true
    },
    "generate_quick_login_key": true // Optional: Generate quick login key
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "OAuth authentication successful",
    "data": {
      "user": {
        "id": "user_id",
        "email": "user@example.com",
        "full_name": "John Doe",
        "username": "john_doe",
        "user_image": {...},
        "account_type": "free",
        "email_verified": true,
        "profile_completion": 75,
        "oauth_providers": ["google"],
        "is_new_user": false
      },
      "tokens": {
        "access_token": "jwt_access_token",
        "refresh_token": "jwt_refresh_token",
        "token_type": "Bearer",
        "expires_in": "24h"
      },
      "quick_login_key": "generated_key_if_requested",
      "session_id": "session_identifier"
    }
  }
  ```

### 2.3 Enhanced Features

#### 🔔 **Automatic Email Notifications**

- **New Users**: Receive welcome email with OAuth registration details
- **Existing Users**: Get login notification if accessing from new device
- **Email Templates**: Branded templates with security information

#### ⚡ **Quick Login Key Generation**

- Set `generate_quick_login_key: true` in request
- Returns secure quick login key for future logins
- Keys are hashed and stored securely

#### 📊 **Enhanced User Tracking**

- Device fingerprinting and session management
- Login streak calculation
- Comprehensive activity logging
- Real-time user statistics

#### 🔐 **Security Features**

- Device detection for new login alerts
- IP-based geolocation tracking
- Session management with unique identifiers
- Automatic account activation for OAuth users

### 2.4 Initiate OAuth Login (Traditional)

- **Endpoint:** `GET /:provider`
- **Supported Providers:** `google`, `facebook`, `github`, `linkedin`, `microsoft`, `apple`
- **Description:** Redirects to the provider's login. E.g. `GET /google`.

### 2.5 OAuth Callback (Traditional)

- **Endpoint:**
  - Google/Facebook/GitHub/LinkedIn/Microsoft: `GET /:provider/callback`
  - Apple: `POST /apple/callback`
- **Description:** Handled by Passport; on success redirects internally.

### 2.6 OAuth Success Redirect

- **Endpoint:** `GET /success`
- **Description:** Endpoint that issues a JWT after successful OAuth login.
- **Response:** Same format as local login (`token`, user info).

### 2.7 OAuth Failure Redirect

- **Endpoint:** `GET /failure`
- **Description:** Returns authentication error.

### 2.8 Get Connected Providers

- **Endpoint:** `GET /connected`
- **Access:** Authorized (JWT)
- **Description:** List which social accounts are linked to the user.

### 2.9 Disconnect a Provider

- **Endpoint:** `DELETE /disconnect/:provider`
- **Access:** Authorized (JWT)
- **Description:** Unlink the social account.

### 2.10 Link Additional Provider

- **Endpoint:** `POST /link/:provider`
- **Access:** Authorized (JWT)
- **Description:** Begin OAuth flow to attach another social account.

### 2.11 OAuth Statistics (Admin)

- **Endpoint:** `GET /stats`
- **Access:** Authorized (JWT, admin)
- **Description:** Aggregate adoption metrics by provider.

---

## 3. Environment Variables

Populate these in your `.env`:

```ini
# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Session
SESSION_SECRET=your_session_secret

# SMTP (Nodemailer)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY_PATH=
```

---

## 4. Usage Notes

- Ensure callback URLs in each OAuth console match `/api/v1/auth/oauth/:provider/callback`.
- Use HTTPS in production for secure cookies.
- Protect endpoints with proper CORS and rate limiting.

---

## 5. Implementation Status

✅ **OAuth System**: Fully implemented and functional

- All 6 providers supported (Google, Facebook, GitHub, LinkedIn, Microsoft, Apple)
- Session management configured
- Database integration complete
- Security features implemented

✅ **Testing Verified**:

```bash
# Test providers endpoint
curl -s http://localhost:8080/api/v1/auth/oauth/providers | jq .

# Test OAuth initiation (should redirect to provider)
curl -I http://localhost:8080/api/v1/auth/oauth/google
```

📋 **Current Active Providers**: Google, GitHub (configured in .env)
🔧 **Ready to Activate**: Facebook, LinkedIn, Microsoft, Apple (need .env configuration)

---

_Last updated: 2025-06-16_
_OAuth Implementation: COMPLETE & FUNCTIONAL_
