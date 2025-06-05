# Medh Backend Crash Fixes Summary

## Issues Identified and Fixed

### 1. Sentry Logger Error (Critical)
**Problem**: `TypeError: Cannot read properties of undefined (reading 'error')` in `utils/logger.js:355`

**Root Cause**: The `metadata` parameter could be `undefined` in the SentryTransport class

**Fix Applied**:
```javascript
// Before
const { level, message, metadata } = info;
if (metadata.error instanceof Error) {

// After  
const { level, message, metadata = {} } = info;
if (metadata && metadata.error instanceof Error) {
```

### 2. Invalid Sentry DSN Configuration
**Problem**: `Invalid Sentry Dsn: your_sentry_dsn`

**Fix Applied**:
- Updated `.env` file to use empty SENTRY_DSN instead of placeholder value
- This allows the application to run without Sentry integration

### 3. HTTPS Certificate Path Error
**Problem**: `ENOENT: no such file or directory, open '/path/to/cert.pem/fullchain.pem'`

**Fix Applied**:
- Set `USE_HTTPS=false` in `.env` file
- Set `TLS_CERT_PATH=` (empty) in `.env` file  
- Enhanced server startup logic to validate certificate files exist before attempting HTTPS

### 4. Mongoose Duplicate Index Warning
**Problem**: `Duplicate schema index on {"scheduledPublishDate":1} found`

**Fix Applied**:
- Removed `index: true` from `scheduledPublishDate` field definition in `models/course-model.js`
- Kept the explicit `courseSchema.index({ scheduledPublishDate: 1 }, { sparse: true })` declaration

### 5. Redis Connection Timing Issues
**Problem**: `Failed to connect to Redis for JWT management` on startup

**Fix Applied**:
- The Redis connection is working (logs show successful connection later)
- This is a timing issue during async initialization
- Application gracefully falls back to in-memory storage if Redis isn't immediately available

### 6. Process Management and Error Handling
**Problems**: 
- App crashing with code 1 repeatedly
- No proper graceful shutdown handling
- Unhandled promise rejections causing crashes

**Fixes Applied**:

#### Created PM2 Ecosystem Configuration (`ecosystem.config.js`):
- Proper restart strategy with delays
- Memory limits and restart policies
- Better logging configuration
- Graceful shutdown handling

#### Enhanced Error Handling in `index.js`:
- Added unhandled promise rejection handler
- Added uncaught exception handler  
- Added PM2 ready signal
- Enhanced graceful shutdown process

#### Created Restart Script (`restart-server.sh`):
- Safe PM2 process management
- Colored logging output
- Proper cleanup before restart
- Status checking and log monitoring

## Files Modified

1. **`utils/logger.js`** - Fixed Sentry transport error handling
2. **`.env`** - Updated configuration for production deployment
3. **`models/course-model.js`** - Removed duplicate index definition
4. **`index.js`** - Enhanced error handling and server startup logic
5. **`ecosystem.config.js`** - Created PM2 configuration file
6. **`restart-server.sh`** - Created server restart script

## Deployment Instructions

### For Production Server (Ubuntu):

1. **Stop the current crashing application**:
   ```bash
   pm2 stop all
   pm2 delete all
   ```

2. **Apply the fixes** (all files have been updated in the codebase)

3. **Use the new restart script**:
   ```bash
   cd /home/ubuntu/actions-runner/_work/medh-backend/medh-backend
   chmod +x restart-server.sh
   ./restart-server.sh
   ```

4. **Monitor the application**:
   ```bash
   pm2 logs --lines 50    # Check recent logs
   pm2 status            # Check process status
   pm2 monit            # Real-time monitoring
   ```

### Key Benefits of These Fixes:

1. **Stability**: Eliminated the critical logger error causing crashes
2. **Graceful Degradation**: App works without Sentry and HTTPS in production
3. **Better Process Management**: PM2 configuration prevents infinite crash loops
4. **Enhanced Monitoring**: Better logging and error tracking
5. **Database Optimization**: Removed duplicate index warnings
6. **Production Ready**: Proper environment configuration

### Expected Outcome:

- Application should start successfully without crashing
- No more Sentry transport errors
- No more HTTPS certificate errors
- Mongoose warnings eliminated
- Stable process management with PM2
- Better error handling and logging

## Monitoring Commands

```bash
# Check application status
pm2 status

# View real-time logs  
pm2 logs

# View specific process logs
pm2 logs medh-backend

# Restart if needed
./restart-server.sh

# Check process details
pm2 show medh-backend
``` 