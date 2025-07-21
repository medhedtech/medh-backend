# 🔧 Create New Google OAuth Client - IMMEDIATE FIX

## Option 1: Create New OAuth Client (Recommended)

Since you're still getting the redirect_uri_mismatch error, let's create a fresh OAuth client:

### **Step 1: Go to Google Cloud Console**

- Visit: https://console.cloud.google.com/apis/credentials
- Make sure you're in the correct project

### **Step 2: Create New OAuth 2.0 Client ID**

1. Click **"+ CREATE CREDENTIALS"**
2. Select **"OAuth 2.0 Client ID"**

### **Step 3: Configure Application Type**

```
Application type: Web application
Name: MEDH Backend OAuth (New)
```

### **Step 4: Add Authorized URIs - COPY EXACTLY**

**Authorized JavaScript origins:**

```
http://localhost:8080
```

**Authorized redirect URIs:**

```
http://localhost:8080/api/v1/auth/oauth/google/callback
```

### **Step 5: Get New Credentials**

After clicking "CREATE", you'll get:

- Client ID: (something like) `123456789-abcdefghijk.apps.googleusercontent.com`
- Client Secret: (something like) `GOCSPX-abcdefghijklmnop`

### **Step 6: Update Your .env File**

Replace your current Google OAuth credentials:

```env
# OLD (remove these)
# GOOGLE_CLIENT_ID=319534674928-7dpmmo944cal0v2pkvr9omes7fkfri3r.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=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

# NEW (add these with your actual values)
GOOGLE_CLIENT_ID=your_new_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_new_client_secret
SESSION_SECRET=your_super_secure_session_secret_here
```

### **Step 7: Restart Your Server**

```bash
# Stop current server (Ctrl+C in terminal)
# Then restart:
npm start
# or
node app.js
```

### **Step 8: Test Immediately**

After restarting, test:

```bash
curl -I http://localhost:8080/api/v1/auth/oauth/google
```

Should redirect to Google without error.

---

## Option 2: Fix Existing Client (If Accessible)

If you can access your existing OAuth client at:
https://console.cloud.google.com/apis/credentials/oauthclient/319534674928-7dpmmo944cal0v2pkvr9omes7fkfri3r

### **Add These Exact URIs:**

**Authorized JavaScript origins:**

- Click "+ ADD URI"
- Enter: `http://localhost:8080`

**Authorized redirect URIs:**

- Click "+ ADD URI"
- Enter: `http://localhost:8080/api/v1/auth/oauth/google/callback`

**Save and wait 10 minutes.**

---

## 🚨 Common Issues & Solutions

### **Issue: OAuth Consent Screen Not Configured**

If you get an error about consent screen:

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Configure OAuth consent screen:
   ```
   User Type: External
   App name: MEDH Learning Platform
   User support email: abhijha903@gmail.com
   Developer contact: abhijha903@gmail.com
   ```
3. Add test users:
   - abhijha903@gmail.com
4. Add scopes:
   - openid
   - profile
   - email

### **Issue: Wrong Project**

Make sure you're in the correct Google Cloud project where your OAuth client should exist.

### **Issue: Still Getting redirect_uri_mismatch**

- Double-check the URI is exactly: `http://localhost:8080/api/v1/auth/oauth/google/callback`
- No trailing slash
- No extra spaces
- Exact port 8080
- HTTP (not HTTPS) for localhost

---

## ✅ Success Test

After configuration, this should work without errors:

```
http://localhost:8080/api/v1/auth/oauth/google
```

You should see Google's OAuth consent screen asking for permissions to access your profile and email.
