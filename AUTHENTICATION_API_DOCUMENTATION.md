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
    "phone_numbers": [ { "country": "+1", "number": "1234567890" } ],
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
      "expires_in": 604800  // seconds
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
  { "email": "john@example.com", "token": "<reset-token>", "new_password": "newPass123" }
  ```
- **Response:** `200 OK`.

---

## 2. OAuth Social Login (Passport)

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
        { "provider": "facebook", "auth_url": "/api/v1/auth/oauth/facebook" },
        // ...
      ]
    }
  }
  ```

### 2.2 Initiate OAuth Login
- **Endpoint:** `GET /:provider`
- **Supported Providers:** `google`, `facebook`, `github`, `linkedin`, `microsoft`, `apple`
- **Description:** Redirects to the provider's login. E.g. `GET /google`.

### 2.3 OAuth Callback
- **Endpoint:**
  - Google/Facebook/GitHub/LinkedIn/Microsoft: `GET /:provider/callback`
  - Apple: `POST /apple/callback`
- **Description:** Handled by Passport; on success redirects internally.

### 2.4 OAuth Success Redirect
- **Endpoint:** `GET /success`
- **Description:** Endpoint that issues a JWT after successful OAuth login.
- **Response:** Same format as local login (`token`, user info).

### 2.5 OAuth Failure Redirect
- **Endpoint:** `GET /failure`
- **Description:** Returns authentication error.

### 2.6 Get Connected Providers
- **Endpoint:** `GET /connected`
- **Access:** Authorized (JWT)
- **Description:** List which social accounts are linked to the user.

### 2.7 Disconnect a Provider
- **Endpoint:** `DELETE /disconnect/:provider`
- **Access:** Authorized (JWT)
- **Description:** Unlink the social account.

### 2.8 Link Additional Provider
- **Endpoint:** `POST /link/:provider`
- **Access:** Authorized (JWT)
- **Description:** Begin OAuth flow to attach another social account.

### 2.9 OAuth Statistics (Admin)
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

*Last updated: 2025-06-16*
*OAuth Implementation: COMPLETE & FUNCTIONAL* 