# Frontend OAuth Implementation Guide

## Overview

This guide shows how to implement OAuth login initiated from the frontend, giving you full control over the user experience while leveraging the backend for secure token verification and user management.

## Architecture

```
Frontend (React/Vue/Angular) → OAuth Provider → Frontend → Backend API → Database
```

### Flow:

1. **Frontend** initiates OAuth with provider (Google, Facebook, etc.)
2. **OAuth Provider** returns authorization code/token to frontend
3. **Frontend** sends OAuth data to backend API
4. **Backend** verifies token with provider and creates/updates user
5. **Backend** returns JWT tokens and user data
6. **Frontend** stores tokens and redirects to dashboard

## Backend Implementation ✅

### New API Endpoint

**Route**: `POST /api/v1/auth/oauth/frontend`

**Request Body**:

```javascript
{
  "provider": "google", // Required: google, facebook, github, etc.
  "token": "oauth_access_token", // Optional: OAuth access token
  "code": "oauth_auth_code", // Optional: OAuth authorization code
  "userInfo": { // Optional: Pre-processed user data
    "id": "provider_user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://...",
    "email_verified": true
  }
}
```

**Response**:

```javascript
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
      "oauth_providers": ["google"]
    },
    "tokens": {
      "access_token": "jwt_access_token",
      "refresh_token": "jwt_refresh_token",
      "token_type": "Bearer",
      "expires_in": "24h"
    }
  }
}
```

### Features

- ✅ **Token Verification**: Verifies OAuth tokens with providers
- ✅ **Code Exchange**: Exchanges authorization codes for tokens
- ✅ **User Management**: Creates new users or updates existing ones
- ✅ **Profile Sync**: Syncs profile data from OAuth providers
- ✅ **JWT Generation**: Returns secure access and refresh tokens
- ✅ **Multi-Provider Support**: Google, Facebook, GitHub, LinkedIn
- ✅ **Error Handling**: Comprehensive error responses

## Frontend Implementation Examples

### 1. Google OAuth (React)

#### Installation

```bash
npm install @google-cloud/oauth2
# or
npm install google-auth-library
```

#### React Component

```jsx
import React, { useState } from "react";
import { GoogleAuth } from "google-auth-library";

const GoogleLoginButton = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Initialize Google OAuth
      const auth = new GoogleAuth({
        clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        scopes: ["email", "profile"],
      });

      // Get authorization URL
      const authUrl = auth.generateAuthUrl({
        access_type: "offline",
        scope: ["email", "profile"],
      });

      // Open popup for OAuth
      const popup = window.open(
        authUrl,
        "google-oauth",
        "width=500,height=600",
      );

      // Listen for popup message
      const messageListener = async (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "GOOGLE_OAUTH_SUCCESS") {
          popup.close();
          window.removeEventListener("message", messageListener);

          // Send to backend
          const response = await fetch("/api/v1/auth/oauth/frontend", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              provider: "google",
              code: event.data.code, // or token: event.data.token
            }),
          });

          const result = await response.json();

          if (result.success) {
            // Store tokens
            localStorage.setItem(
              "access_token",
              result.data.tokens.access_token,
            );
            localStorage.setItem(
              "refresh_token",
              result.data.tokens.refresh_token,
            );
            onSuccess(result.data);
          } else {
            onError(result.message);
          }
        }
      };

      window.addEventListener("message", messageListener);
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleGoogleLogin} disabled={loading}>
      {loading ? "Signing in..." : "Sign in with Google"}
    </button>
  );
};

export default GoogleLoginButton;
```

### 2. Google OAuth (Using Google Identity Services)

```jsx
import React, { useEffect } from "react";

const GoogleLoginButton = ({ onSuccess, onError }) => {
  useEffect(() => {
    // Load Google Identity Services
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = initializeGoogleSignIn;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const initializeGoogleSignIn = () => {
    window.google.accounts.id.initialize({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    });

    window.google.accounts.id.renderButton(
      document.getElementById("google-signin-button"),
      {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
      },
    );
  };

  const handleGoogleResponse = async (response) => {
    try {
      // Send credential token to backend
      const backendResponse = await fetch("/api/v1/auth/oauth/frontend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "google",
          token: response.credential, // This is a JWT ID token
        }),
      });

      const result = await backendResponse.json();

      if (result.success) {
        localStorage.setItem("access_token", result.data.tokens.access_token);
        localStorage.setItem("refresh_token", result.data.tokens.refresh_token);
        onSuccess(result.data);
      } else {
        onError(result.message);
      }
    } catch (error) {
      onError(error.message);
    }
  };

  return <div id="google-signin-button"></div>;
};

export default GoogleLoginButton;
```

### 3. Facebook OAuth (React)

```jsx
import React, { useEffect } from "react";

const FacebookLoginButton = ({ onSuccess, onError }) => {
  useEffect(() => {
    // Load Facebook SDK
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: process.env.REACT_APP_FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: "v18.0",
      });
    };

    // Load SDK script
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleFacebookLogin = () => {
    window.FB.login(
      async (response) => {
        if (response.authResponse) {
          try {
            // Send access token to backend
            const backendResponse = await fetch("/api/v1/auth/oauth/frontend", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                provider: "facebook",
                token: response.authResponse.accessToken,
              }),
            });

            const result = await backendResponse.json();

            if (result.success) {
              localStorage.setItem(
                "access_token",
                result.data.tokens.access_token,
              );
              localStorage.setItem(
                "refresh_token",
                result.data.tokens.refresh_token,
              );
              onSuccess(result.data);
            } else {
              onError(result.message);
            }
          } catch (error) {
            onError(error.message);
          }
        } else {
          onError("Facebook login cancelled");
        }
      },
      { scope: "email,public_profile" },
    );
  };

  return <button onClick={handleFacebookLogin}>Sign in with Facebook</button>;
};

export default FacebookLoginButton;
```

### 4. GitHub OAuth (React)

```jsx
import React from "react";

const GitHubLoginButton = ({ onSuccess, onError }) => {
  const handleGitHubLogin = () => {
    const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const scope = "user:email";

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

    // Open popup for GitHub OAuth
    const popup = window.open(
      githubAuthUrl,
      "github-oauth",
      "width=500,height=600",
    );

    // Listen for popup message
    const messageListener = async (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "GITHUB_OAUTH_SUCCESS") {
        popup.close();
        window.removeEventListener("message", messageListener);

        try {
          // Send authorization code to backend
          const response = await fetch("/api/v1/auth/oauth/frontend", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              provider: "github",
              code: event.data.code,
            }),
          });

          const result = await response.json();

          if (result.success) {
            localStorage.setItem(
              "access_token",
              result.data.tokens.access_token,
            );
            localStorage.setItem(
              "refresh_token",
              result.data.tokens.refresh_token,
            );
            onSuccess(result.data);
          } else {
            onError(result.message);
          }
        } catch (error) {
          onError(error.message);
        }
      }
    };

    window.addEventListener("message", messageListener);
  };

  return <button onClick={handleGitHubLogin}>Sign in with GitHub</button>;
};

export default GitHubLoginButton;
```

### 5. OAuth Callback Handler (React Router)

Create a callback page to handle OAuth redirects:

```jsx
// pages/AuthCallback.jsx
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

const AuthCallback = () => {
  const location = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");
    const provider = location.pathname.includes("github") ? "github" : "google";

    if (error) {
      // Send error to parent window
      window.opener?.postMessage(
        {
          type: `${provider.toUpperCase()}_OAUTH_ERROR`,
          error,
        },
        window.location.origin,
      );
    } else if (code) {
      // Send success to parent window
      window.opener?.postMessage(
        {
          type: `${provider.toUpperCase()}_OAUTH_SUCCESS`,
          code,
        },
        window.location.origin,
      );
    }

    // Close popup
    window.close();
  }, [location]);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <p>Processing authentication...</p>
    </div>
  );
};

export default AuthCallback;
```

### 6. Complete Login Component

```jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import GoogleLoginButton from "./GoogleLoginButton";
import FacebookLoginButton from "./FacebookLoginButton";
import GitHubLoginButton from "./GitHubLoginButton";

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleOAuthSuccess = (data) => {
    setLoading(false);
    setError("");

    // Store user data
    localStorage.setItem("user", JSON.stringify(data.user));

    // Redirect to dashboard
    navigate("/dashboard");
  };

  const handleOAuthError = (errorMessage) => {
    setLoading(false);
    setError(errorMessage);
  };

  return (
    <div className="login-container">
      <h2>Sign In</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="oauth-buttons">
        <GoogleLoginButton
          onSuccess={handleOAuthSuccess}
          onError={handleOAuthError}
        />

        <FacebookLoginButton
          onSuccess={handleOAuthSuccess}
          onError={handleOAuthError}
        />

        <GitHubLoginButton
          onSuccess={handleOAuthSuccess}
          onError={handleOAuthError}
        />
      </div>

      {loading && <div className="loading">Signing in...</div>}
    </div>
  );
};

export default LoginPage;
```

## Environment Variables

### Frontend (.env)

```env
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_FACEBOOK_APP_ID=your_facebook_app_id
REACT_APP_GITHUB_CLIENT_ID=your_github_client_id
REACT_APP_API_BASE_URL=http://localhost:8080/api/v1
```

### Backend (.env)

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
```

## Benefits of Frontend-Initiated OAuth

1. **Better UX**: Full control over loading states, error handling, and UI
2. **Flexibility**: Can customize OAuth flow based on your needs
3. **Security**: Backend still handles token verification and user management
4. **Scalability**: Works with any frontend framework
5. **Error Handling**: Better error messages and recovery options
6. **Analytics**: Can track OAuth conversion rates and user behavior

## Testing

Test the implementation with:

```bash
# Test the backend endpoint
curl -X POST http://localhost:8080/api/v1/auth/oauth/frontend \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "userInfo": {
      "id": "test_user_id",
      "email": "test@example.com",
      "name": "Test User",
      "picture": "https://example.com/avatar.jpg",
      "email_verified": true
    }
  }'
```

## Security Considerations

1. **HTTPS Only**: Use HTTPS in production
2. **Token Validation**: Backend validates all OAuth tokens
3. **CORS**: Configure CORS properly for your domain
4. **Rate Limiting**: Implement rate limiting on OAuth endpoints
5. **Token Storage**: Store JWT tokens securely (httpOnly cookies recommended)

This implementation gives you the best of both worlds: frontend flexibility and backend security! 🚀
