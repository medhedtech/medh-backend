# Google OAuth Setup Guide for MEDH Backend

## 🚀 Complete Google Cloud Console Configuration

### **Step 1: Create/Configure Google Cloud Project**

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing one
   - Project Name: `medh-backend-oauth` (or your preferred name)

### **Step 2: Enable Required APIs**

Navigate to **APIs & Services → Library** and enable these APIs:

#### **Required APIs:**

```
✅ Google+ API (legacy - for basic profile)
✅ People API (for detailed profile information)
✅ Gmail API (if using email services)
✅ Google Identity Toolkit API (for authentication)
✅ Identity and Access Management (IAM) API
```

**Enable APIs via gcloud CLI:**

```bash
gcloud services enable plus.googleapis.com
gcloud services enable people.googleapis.com
gcloud services enable gmail.googleapis.com
gcloud services enable identitytoolkit.googleapis.com
gcloud services enable iam.googleapis.com
```

### **Step 3: Create OAuth 2.0 Credentials**

1. **Go to APIs & Services → Credentials**
2. **Click "Create Credentials" → "OAuth 2.0 Client ID"**
3. **Configure OAuth Consent Screen first if prompted**

#### **OAuth Consent Screen Configuration:**

```
User Type: External (for public use)
App Name: MEDH Learning Platform
User Support Email: your-email@domain.com
Developer Contact: your-email@domain.com

Scopes:
- openid
- profile
- email
- https://www.googleapis.com/auth/userinfo.profile
- https://www.googleapis.com/auth/userinfo.email
```

#### **OAuth 2.0 Client ID Configuration:**

```
Application Type: Web Application
Name: MEDH Backend OAuth Client

Authorized JavaScript Origins:
- http://localhost:8080
- https://yourdomain.com
- https://api.yourdomain.com

Authorized Redirect URIs:
- http://localhost:8080/api/v1/auth/oauth/google/callback
- https://yourdomain.com/api/v1/auth/oauth/google/callback
- https://api.yourdomain.com/api/v1/auth/oauth/google/callback
```

### **Step 4: Backend Environment Configuration**

Add these to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8080/api/v1/auth/oauth/google/callback

# Session Configuration (required for OAuth)
SESSION_SECRET=your_super_secure_session_secret_here

# OAuth Scopes (space-separated)
GOOGLE_OAUTH_SCOPES=openid profile email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email

# OAuth Settings
OAUTH_SUCCESS_REDIRECT=http://localhost:3000/dashboard
OAUTH_FAILURE_REDIRECT=http://localhost:3000/login?error=oauth_failed
```

### **Step 5: Required OAuth Scopes & Permissions**

Your backend requests these scopes from Google:

#### **Basic Scopes (Always Required):**

```javascript
const REQUIRED_SCOPES = [
  "openid", // OpenID Connect
  "profile", // Basic profile info
  "email", // Email address
];
```

#### **Extended Scopes (For Enhanced Features):**

```javascript
const EXTENDED_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.profile", // Detailed profile
  "https://www.googleapis.com/auth/userinfo.email", // Email verification
  "https://www.googleapis.com/auth/user.birthday.read", // Birthday (optional)
  "https://www.googleapis.com/auth/user.gender.read", // Gender (optional)
];
```

### **Step 6: Test OAuth Configuration**

#### **Test Endpoints:**

1. **Check OAuth Providers:**

   ```bash
   curl -s http://localhost:8080/api/v1/auth/oauth/providers | jq .
   ```

2. **Initiate Google OAuth:**

   ```bash
   curl -I http://localhost:8080/api/v1/auth/oauth/google
   ```

   Should return `302 Found` with Google OAuth URL

3. **Test OAuth Callback:** (after completing OAuth flow)
   ```bash
   curl -s http://localhost:8080/api/v1/auth/oauth/success
   ```

#### **Frontend Integration Example:**

```javascript
// Initiate Google OAuth from frontend
const initiateGoogleOAuth = () => {
  window.location.href = "http://localhost:8080/api/v1/auth/oauth/google";
};

// Handle OAuth success callback
const handleOAuthCallback = (urlParams) => {
  const token = urlParams.get("token");
  const user = JSON.parse(urlParams.get("user") || "{}");

  if (token) {
    localStorage.setItem("authToken", token);
    localStorage.setItem("user", JSON.stringify(user));
    // Redirect to dashboard
    window.location.href = "/dashboard";
  }
};
```

### **Step 7: OAuth Flow Verification**

Your OAuth flow should work like this:

1. **User clicks "Continue with Google"**
2. **Redirects to:** `http://localhost:8080/api/v1/auth/oauth/google`
3. **Google OAuth consent screen appears**
4. **User grants permissions**
5. **Google redirects to:** `http://localhost:8080/api/v1/auth/oauth/google/callback`
6. **Backend processes OAuth data and creates/updates user**
7. **Redirects to:** `http://localhost:8080/api/v1/auth/oauth/success`
8. **Returns JWT token and user data**

### **Step 8: Common Issues & Solutions**

#### **🔴 redirect_uri_mismatch Error:**

```
Error: redirect_uri_mismatch
Solution: Ensure redirect URI in Google Console exactly matches your callback URL
Check: http://localhost:8080/api/v1/auth/oauth/google/callback
```

#### **🔴 invalid_client Error:**

```
Error: invalid_client
Solution: Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
Verify: Client ID format ends with .apps.googleusercontent.com
```

#### **🔴 access_denied Error:**

```
Error: access_denied
Solution: User denied permissions or app not verified
Check: OAuth consent screen configuration
```

#### **🔴 Session Error:**

```
Error: session is not defined
Solution: Ensure SESSION_SECRET is set in environment
Check: Express session middleware is configured
```

### **Step 9: Production Deployment**

#### **Update OAuth Settings for Production:**

1. **Add Production URLs to Google Console:**

   ```
   Authorized JavaScript Origins:
   - https://api.yourdomain.com
   - https://yourdomain.com

   Authorized Redirect URIs:
   - https://api.yourdomain.com/api/v1/auth/oauth/google/callback
   ```

2. **Update Environment Variables:**

   ```env
   GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/v1/auth/oauth/google/callback
   OAUTH_SUCCESS_REDIRECT=https://yourdomain.com/dashboard
   OAUTH_FAILURE_REDIRECT=https://yourdomain.com/login?error=oauth_failed
   ```

3. **SSL Certificate Required:**
   - Google OAuth requires HTTPS in production
   - Ensure your domain has valid SSL certificate

### **Step 10: Advanced OAuth Features**

#### **Account Linking API Endpoints:**

```bash
# Link additional OAuth provider
POST /api/v1/auth/oauth/link/google
Authorization: Bearer <jwt-token>

# View connected providers
GET /api/v1/auth/oauth/connected
Authorization: Bearer <jwt-token>

# Sync email from OAuth
POST /api/v1/auth/oauth/sync-email
Authorization: Bearer <jwt-token>
Content-Type: application/json
{
  "provider": "google",
  "action": "verify_current_email"
}
```

#### **OAuth Analytics & Monitoring:**

```bash
# Get OAuth statistics (admin only)
GET /api/v1/auth/oauth/stats
Authorization: Bearer <admin-jwt-token>

# Get merge suggestions
GET /api/v1/auth/oauth/merge-suggestions
Authorization: Bearer <jwt-token>
```

## ✅ Verification Checklist

- [ ] Google Cloud Project created
- [ ] Required APIs enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 client ID created
- [ ] Redirect URIs properly configured
- [ ] Environment variables set
- [ ] Session middleware configured
- [ ] OAuth endpoints responding
- [ ] Frontend integration working
- [ ] Account merging tested
- [ ] Email synchronization working

## 🎯 Quick Test Command

```bash
# Test complete OAuth flow
curl -s http://localhost:8080/api/v1/auth/oauth/providers | jq '.data.providers[] | select(.provider=="google")'
```

Should return:

```json
{
  "provider": "google",
  "name": "Google",
  "color": "#db4437",
  "icon": "fab fa-google",
  "auth_url": "/api/v1/auth/oauth/google",
  "enabled": true
}
```

---

**🚀 Your Google OAuth integration is now ready for production use with enhanced email synchronization and account merging capabilities!**
