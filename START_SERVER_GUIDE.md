# 🚀 Backend Server Startup Guide

## 🚨 **Current Issue**
Profile completion endpoint returning 404 error - backend server needs to be restarted to register new routes.

## ✅ **Quick Fix Steps**

### **Method 1: Manual Terminal Startup**
```bash
# 1. Open new terminal/command prompt
# 2. Navigate to backend directory
cd C:\Users\akata\Desktop\medh\medh-backend

# 3. Stop any existing processes (Ctrl+C if running)

# 4. Start the server
npm start
# OR
node index.js
```

### **Method 2: Using Development Mode**
```bash
cd C:\Users\akata\Desktop\medh\medh-backend
npm run dev
```

### **Method 3: Check for Issues**
```bash
# Check if MongoDB is running
# Check if port 5000 is available
netstat -ano | findstr :5000

# Check for errors in startup
node index.js
```

## 🔍 **Verify Server is Running**

### **Test Health Endpoint**
```bash
curl http://localhost:5000/api/v1/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "Server is running",
  "timestamp": "2025-01-27T..."
}
```

### **Test Profile Completion Endpoint**
```bash
# This should return 401 (authentication required) - which means endpoint exists
curl http://localhost:5000/api/v1/profile/me/completion
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

## 🛠 **Troubleshooting**

### **Common Issues:**

1. **Port 5000 Already in Use**
   ```bash
   # Kill processes on port 5000
   netstat -ano | findstr :5000
   taskkill /PID <PID_NUMBER> /F
   ```

2. **MongoDB Not Running**
   - Make sure MongoDB is installed and running
   - Check connection string in environment variables

3. **Missing Dependencies**
   ```bash
   npm install
   ```

4. **Environment Variables**
   - Check if `.env` file exists
   - Verify MongoDB connection string
   - Check required environment variables

## 📋 **Startup Checklist**

- [ ] Navigate to `medh-backend` directory
- [ ] Run `npm start` or `node index.js`
- [ ] Wait for "Server running on port 5000" message
- [ ] Test health endpoint: `curl http://localhost:5000/api/v1/health`
- [ ] Test profile completion: `curl http://localhost:5000/api/v1/profile/me/completion`
- [ ] Refresh frontend page to test progress bar

## 🎯 **Expected Server Output**

When server starts successfully, you should see:
```
Connected to MongoDB
Server running on port 5000
Environment: development
```

## 🔄 **After Server Starts**

1. **Refresh Frontend Page**
   - Go to profile page: `http://localhost:3000/dashboards/student/profile/`
   - Progress bar should load without 404 error

2. **Test Progress Updates**
   - Edit profile fields
   - Save changes
   - Watch progress bar update in real-time

## 📞 **Still Having Issues?**

If server won't start:
1. Check console for error messages
2. Verify MongoDB is running
3. Check if port 5000 is available
4. Try `npm run dev` instead of `npm start`
5. Check `.env` file configuration

---

**Status**: 🔧 Manual server restart required  
**Expected Fix Time**: 2-3 minutes  
**Next Step**: Start server manually in terminal
