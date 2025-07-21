# 🚨 OAuth Credentials Mismatch - IMMEDIATE FIX

## ❌ **PROBLEM IDENTIFIED**

Your server is using **OLD/CACHED** OAuth credentials instead of reading from your `.env` file:

- **Your .env file has:** `336196538465-vrr3skl6af67eohr0u5drhpr21kqagol.apps.googleusercontent.com`
- **Your server is using:** `319534674928-7dpmmo944cal0v2pkvr9omes7fkfri3r.apps.googleusercontent.com`

## 🔧 **SOLUTION 1: Restart Server (Try This First)**

```bash
# Stop your current server (Ctrl+C in terminal where server is running)
# Then restart:
npm start
# OR
node app.js
# OR
pm2 restart all  # if using PM2
```

**Test after restart:**

```bash
curl -s -I http://localhost:8080/api/v1/auth/oauth/google | grep Location
```

Should now show your NEW client ID: `336196538465-vrr3skl6af67eohr0u5drhpr21kqagol`

---

## 🔧 **SOLUTION 2: Configure Google Cloud Console for NEW Client ID**

Since your server will now use the NEW client ID, configure it in Google Cloud Console:

### **Step 1: Access Your NEW OAuth Client**

**Direct Link:** https://console.cloud.google.com/apis/credentials/oauthclient/336196538465-vrr3skl6af67eohr0u5drhpr21kqagol

### **Step 2: Add Required URIs**

**Authorized JavaScript origins:**

```
http://localhost:8080
```

**Authorized redirect URIs:**

```
http://localhost:8080/api/v1/auth/oauth/google/callback
```

### **Step 3: Save and Test**

- Click **SAVE**
- Wait 5 minutes for changes to propagate
- Test: `http://localhost:8080/api/v1/auth/oauth/google`

---

## 🔧 **SOLUTION 3: Use OLD Client ID (Alternative)**

If you prefer to use the OLD working client ID, update your `.env` file:

```env
# Change this line in .env:
GOOGLE_CLIENT_ID=319534674928-7dpmmo944cal0v2pkvr9omes7fkfri3r.apps.googleusercontent.com

# Keep existing secret or get new one for old client:
GOOGLE_CLIENT_SECRET=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
```

Then configure the OLD client with redirect URIs (we already tried this earlier).

---

## ✅ **VERIFICATION STEPS**

After fixing, verify the client ID matches:

```bash
# Check what .env file contains:
grep GOOGLE_CLIENT_ID .env

# Check what server is actually using:
curl -s -I http://localhost:8080/api/v1/auth/oauth/google | grep client_id
```

Both should show the **SAME** client ID.

---

## 🎯 **RECOMMENDED APPROACH**

1. **Restart your server** (most likely fix)
2. **Configure the NEW client ID** in Google Cloud Console
3. **Test OAuth flow**

This way you use your current `.env` credentials and just need to configure Google Cloud Console once.

---

## 🚨 **ROOT CAUSE**

Node.js servers cache environment variables on startup. When you updated your `.env` file, the server continued using the old values until restarted.

**Always restart your server after changing .env files!**
