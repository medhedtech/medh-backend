# Enhanced Progress Tracking System - Integration Guide

## Overview

The Enhanced Progress Tracking System provides comprehensive learning analytics, progress monitoring, and performance insights for educational platforms. This system tracks student progress across various content types and provides detailed analytics for both students and instructors.

## Table of Contents

1. [Quick Setup](#quick-setup)
2. [API Endpoints](#api-endpoints)
3. [Authentication & Authorization](#authentication--authorization)
4. [Request/Response Examples](#requestresponse-examples)
5. [Integration Steps](#integration-steps)
6. [Frontend Integration](#frontend-integration)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Best Practices](#best-practices)

## Quick Setup

### 1. Add Routes to Main App

```javascript
// app.js or index.js
import enhancedProgressRoutes from './routes/enhanced-progress.routes.js';

app.use('/api/enhanced-progress', enhancedProgressRoutes);
```

### 2. Ensure Required Middleware

Make sure you have these middleware files:
- `middleware/auth.js` - Authentication and authorization
- `middleware/validation.js` - Request validation
- `middleware/rateLimit.js` - Rate limiting

### 3. Database Connection

Ensure MongoDB connection is established and the enhanced progress model is imported.

## API Endpoints

### Student Progress Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/enhanced-progress` | Create new progress entry | Private |
| `GET` | `/api/enhanced-progress/user/:userId` | Get user's progress | Private |
| `GET` | `/api/enhanced-progress/my-progress` | Get current user's progress | Private |
| `GET` | `/api/enhanced-progress/:progressId` | Get specific progress entry | Private |
| `PUT` | `/api/enhanced-progress/:progressId` | Update progress entry | Private |
| `DELETE` | `/api/enhanced-progress/:progressId` | Delete progress entry | Private |

### Analytics & Reporting

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/api/enhanced-progress/analytics/user/:userId` | Get user analytics | Private |
| `GET` | `/api/enhanced-progress/summary/:userId` | Get progress summary | Private |
| `GET` | `/api/enhanced-progress/history/:userId` | Get progress history | Private |
| `GET` | `/api/enhanced-progress/insights/:userId` | Get AI insights | Private |
| `GET` | `/api/enhanced-progress/leaderboard` | Get leaderboard | Private |
| `GET` | `/api/enhanced-progress/recommendations/:userId` | Get recommendations | Private |

### Utility Operations

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/enhanced-progress/reset/:userId` | Reset user progress | Private |
| `POST` | `/api/enhanced-progress/sync` | Sync progress data | Private |
| `POST` | `/api/enhanced-progress/export/:userId` | Export progress data | Private |

### Admin Operations

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/api/enhanced-progress/admin/stats` | Get system statistics | Admin |
| `POST` | `/api/enhanced-progress/admin/validate` | Validate data integrity | Admin |
| `POST` | `/api/enhanced-progress/bulk/*` | Bulk operations | Admin/Instructor |

## Authentication & Authorization

### Required Headers

```javascript
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

### User Roles

- **Student**: Can access own progress data
- **Instructor**: Can access student data for their courses
- **Admin**: Full access to all data and operations

## Request/Response Examples

### 1. Create Progress Entry

**Request:**
```javascript
POST /api/enhanced-progress
{
  "userId": "64f8a123b456789012345678",
  "courseId": "64f8a123b456789012345679",
  "contentType": "lesson",
  "contentId": "64f8a123b456789012345680",
  "progressPercentage": 75,
  "status": "in_progress",
  "timeSpent": 3600,
  "score": 85,
  "notes": "Completed all exercises",
  "metadata": {
    "attempts": 2,
    "difficulty": "intermediate"
  }
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Progress created successfully",
  "data": {
    "progress": {
      "id": "64f8a123b456789012345681",
      "userId": "64f8a123b456789012345678",
      "courseId": "64f8a123b456789012345679",
      "contentType": "lesson",
      "contentId": "64f8a123b456789012345680",
      "progressPercentage": 75,
      "status": "in_progress",
      "timeSpent": 3600,
      "score": 85,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 2. Get User Progress with Filters

**Request:**
```javascript
GET /api/enhanced-progress/user/64f8a123b456789012345678?courseId=64f8a123b456789012345679&status=completed&page=1&limit=10
```

**Response:**
```javascript
{
  "success": true,
  "message": "Progress retrieved successfully",
  "data": {
    "progress": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25,
      "itemsPerPage": 10
    },
    "summary": {
      "totalProgress": 25,
      "completedItems": 18,
      "averageScore": 82.5,
      "totalTimeSpent": 45600
    }
  }
}
```

### 3. Get Progress Analytics

**Request:**
```javascript
GET /api/enhanced-progress/analytics/user/64f8a123b456789012345678?timeframe=month&includeComparison=true
```

**Response:**
```javascript
{
  "success": true,
  "message": "Analytics retrieved successfully",
  "data": {
    "analytics": {
      "overview": {
        "totalProgress": 45,
        "completionRate": 78.5,
        "averageScore": 85.2,
        "totalTimeSpent": 125400,
        "streakDays": 12
      },
      "trends": {
        "progressTrend": "increasing",
        "scoreTrend": "stable",
        "timeSpentTrend": "increasing"
      },
      "breakdown": {
        "byContentType": {...},
        "byDifficulty": {...},
        "byWeek": [...]
      },
      "comparison": {
        "previousPeriod": {...},
        "cohortAverage": {...}
      }
    }
  }
}
```

### 4. Export Progress Data

**Request:**
```javascript
POST /api/enhanced-progress/export/64f8a123b456789012345678
{
  "format": "xlsx",
  "courseId": "64f8a123b456789012345679",
  "includeMetadata": true,
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Export completed successfully",
  "data": {
    "exportId": "export_64f8a123b456789012345682",
    "downloadUrl": "https://your-cdn.com/exports/progress_export_123.xlsx",
    "expiresAt": "2024-01-16T10:30:00Z",
    "fileSize": "2.5MB",
    "recordsCount": 150
  }
}
```

## Integration Steps

### Step 1: Database Setup

Ensure the enhanced progress model is properly imported and MongoDB indexes are created:

```javascript
// In your database setup file
import EnhancedProgress from './models/enhanced-progress.model.js';

// Create indexes for better performance
await EnhancedProgress.createIndexes();
```

### Step 2: Middleware Setup

Ensure authentication middleware is properly configured:

```javascript
// middleware/auth.js example
export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
```

### Step 3: Route Integration

Add the routes to your main application:

```javascript
// app.js
import express from 'express';
import enhancedProgressRoutes from './routes/enhanced-progress.routes.js';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/enhanced-progress', enhancedProgressRoutes);
```

### Step 4: Frontend Integration Examples

#### React Integration

```jsx
// hooks/useProgress.js
import { useState, useEffect } from 'react';
import api from '../services/api';

export const useUserProgress = (userId, filters = {}) => {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await api.get(`/enhanced-progress/user/${userId}?${queryParams}`);
        setProgress(response.data.data.progress);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [userId, filters]);

  return { progress, loading, error };
};
```

```jsx
// components/ProgressDashboard.jsx
import React from 'react';
import { useUserProgress } from '../hooks/useProgress';

const ProgressDashboard = ({ userId }) => {
  const { progress, loading, error } = useUserProgress(userId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="progress-dashboard">
      <h2>Learning Progress</h2>
      {progress.map(item => (
        <div key={item.id} className="progress-item">
          <h3>{item.contentTitle}</h3>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${item.progressPercentage}%` }}
            />
          </div>
          <p>Score: {item.score}% | Time: {item.timeSpent}s</p>
        </div>
      ))}
    </div>
  );
};
```

#### Progress Tracking Service

```javascript
// services/progressService.js
class ProgressService {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  async createProgress(progressData) {
    const response = await fetch(`${this.baseURL}/enhanced-progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(progressData)
    });
    return response.json();
  }

  async updateProgress(progressId, updateData) {
    const response = await fetch(`${this.baseURL}/enhanced-progress/${progressId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(updateData)
    });
    return response.json();
  }

  async getAnalytics(userId, options = {}) {
    const queryParams = new URLSearchParams(options).toString();
    const response = await fetch(
      `${this.baseURL}/enhanced-progress/analytics/user/${userId}?${queryParams}`,
      {
        headers: { 'Authorization': `Bearer ${this.token}` }
      }
    );
    return response.json();
  }
}

export default new ProgressService(process.env.REACT_APP_API_URL);
```

## Error Handling

### Common Error Responses

```javascript
// Validation Error
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "progressPercentage",
      "message": "Progress percentage must be between 0 and 100"
    }
  ]
}

// Authorization Error
{
  "success": false,
  "message": "Insufficient permissions",
  "error_code": "INSUFFICIENT_PERMISSIONS"
}

// Not Found Error
{
  "success": false,
  "message": "Progress entry not found",
  "error_code": "PROGRESS_NOT_FOUND"
}
```

### Frontend Error Handling

```javascript
const handleApiCall = async (apiFunction) => {
  try {
    const response = await apiFunction();
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // Handle authentication error
      redirectToLogin();
    } else if (error.response?.status === 403) {
      // Handle authorization error
      showErrorMessage('You do not have permission to perform this action');
    } else if (error.response?.status === 429) {
      // Handle rate limiting
      showErrorMessage('Too many requests. Please try again later.');
    } else {
      // Handle other errors
      showErrorMessage(error.response?.data?.message || 'An error occurred');
    }
    throw error;
  }
};
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Progress endpoints**: 100 requests per 15 minutes
- **Analytics endpoints**: 50 requests per 15 minutes
- **Export endpoints**: 10 requests per hour

Handle rate limit responses:

```javascript
if (response.status === 429) {
  const retryAfter = response.headers['retry-after'];
  console.log(`Rate limited. Retry after ${retryAfter} seconds`);
}
```

## Best Practices

### 1. Efficient Progress Tracking

```javascript
// Batch progress updates for better performance
const batchUpdateProgress = async (updates) => {
  return await api.post('/enhanced-progress/bulk/update', { updates });
};

// Use debouncing for real-time progress tracking
const debouncedProgressUpdate = debounce(updateProgress, 2000);
```

### 2. Caching Strategies

```javascript
// Cache analytics data for better performance
const cacheKey = `analytics_${userId}_${timeframe}`;
const cachedData = sessionStorage.getItem(cacheKey);

if (cachedData && Date.now() - JSON.parse(cachedData).timestamp < 300000) {
  return JSON.parse(cachedData).data;
}
```

### 3. Real-time Updates

```javascript
// WebSocket integration for real-time progress updates
const socket = io();

socket.on('progress_updated', (data) => {
  if (data.userId === currentUserId) {
    updateProgressInUI(data.progress);
  }
});
```

### 4. Offline Support

```javascript
// Store progress updates offline and sync when online
const queueProgressUpdate = (progressData) => {
  const queue = JSON.parse(localStorage.getItem('progressQueue') || '[]');
  queue.push({ ...progressData, timestamp: Date.now() });
  localStorage.setItem('progressQueue', JSON.stringify(queue));
};

const syncOfflineProgress = async () => {
  const queue = JSON.parse(localStorage.getItem('progressQueue') || '[]');
  if (queue.length > 0) {
    await api.post('/enhanced-progress/sync', { progressData: queue });
    localStorage.removeItem('progressQueue');
  }
};
```

## Security Considerations

1. **Input Validation**: All inputs are validated on both client and server
2. **Rate Limiting**: Prevents API abuse
3. **Authentication**: JWT-based authentication required
4. **Authorization**: Role-based access control
5. **Data Sanitization**: All user inputs are sanitized
6. **Audit Logging**: All operations are logged for security monitoring

## Performance Optimization

1. **Database Indexing**: Proper indexes on frequently queried fields
2. **Pagination**: Large datasets are paginated
3. **Caching**: Analytics data is cached for better performance
4. **Bulk Operations**: Support for bulk updates to reduce API calls
5. **Background Processing**: Heavy analytics calculations run in background

This enhanced progress tracking system provides a robust foundation for educational platforms with comprehensive analytics, security, and performance optimization built-in. 