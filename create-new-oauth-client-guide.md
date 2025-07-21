# Create New Google OAuth Client - Step by Step

## If you can't find your existing OAuth client, create a new one:

### **Step 1: Go to Google Cloud Console**

- Visit: https://console.cloud.google.com/apis/credentials
- Select your project (or create one if needed)

### **Step 2: Create OAuth 2.0 Client ID**

1. Click **"+ CREATE CREDENTIALS"**
2. Select **"OAuth 2.0 Client ID"**

### **Step 3: Configure OAuth Consent Screen (if not done)**

If prompted, configure the OAuth consent screen first:

```
OAuth consent screen:
- User Type: External
- App name: MEDH Learning Platform
- User support email: your-email@domain.com
- Developer contact information: your-email@domain.com

Scopes:
- Add these scopes:
  - openid
  - profile
  - email
  - https://www.googleapis.com/auth/userinfo.profile
  - https://www.googleapis.com/auth/userinfo.email

Test users (for development):
- Add your email: abhijha903@gmail.com
```

### **Step 4: Create OAuth 2.0 Client**

```
Application type: Web application
Name: MEDH Backend OAuth

Authorized JavaScript origins:
- http://localhost:8080

Authorized redirect URIs:
- http://localhost:8080/api/v1/auth/oauth/google/callback
```

### **Step 5: Update Your .env File**

After creating, update your `.env` with the new credentials:

```env
GOOGLE_CLIENT_ID=your_new_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_new_client_secret
SESSION_SECRET=your_session_secret
```

### **Step 6: Restart Your Server**

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm start
# or
node app.js
```
