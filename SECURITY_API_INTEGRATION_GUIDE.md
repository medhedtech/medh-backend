# Security API Integration Guide

## Overview

This guide provides comprehensive documentation for integrating the Security API with your React Security Settings component. The API provides real-time security data, session management, risk assessment, and activity tracking.

## Base URL
```
/api/v1/security
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Available Endpoints

### 1. Security Overview (Main Dashboard Data)
**GET** `/api/v1/security/overview`

**Description:** Get comprehensive security overview for the authenticated user including all statistics, sessions, risk assessment, and recommendations.

**Response Example:**
```json
{
  "success": true,
  "message": "Security overview retrieved successfully",
  "data": {
    "stats": {
      "active_sessions": 3,
      "last_login": "2024-01-15T10:30:00.000Z",
      "security_score": 85,
      "two_factor_enabled": false,
      "failed_login_attempts": 0,
      "password_strength": "strong",
      "account_age_days": 120,
      "unique_login_locations": 2,
      "devices_used": 4,
      "total_logins": 45
    },
    "active_sessions": {
      "total": 3,
      "sessions": [
        {
          "id": "session_123",
          "device": "MacBook Pro",
          "device_type": "desktop",
          "browser": "Chrome 120.0",
          "location": "New York, US",
          "ip_address": "192.168.1.100",
          "last_activity": "2024-01-15T10:30:00.000Z",
          "created_at": "2024-01-15T08:00:00.000Z",
          "duration": "2h 30m",
          "is_current": true,
          "risk_level": "low",
          "trusted_device": true
        }
      ],
      "current_session": "session_123"
    },
    "security_assessment": {
      "score": 85,
      "level": "good",
      "factors": {
        "positive": ["email_verified", "strong_password", "recent_login"],
        "negative": ["no_2fa", "multiple_locations"],
        "neutral": ["normal_activity_pattern"]
      },
      "recommendations": [
        {
          "priority": "high",
          "action": "Enable Two-Factor Authentication",
          "description": "Add an extra layer of security to your account"
        }
      ]
    },
    "recent_activity": [
      {
        "action": "login",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "device": "MacBook Pro",
        "location": "New York, US",
        "ip_address": "192.168.1.100",
        "risk_level": "low",
        "formatted_time": "2 hours ago"
      }
    ],
    "security_features": {
      "two_factor_enabled": false,
      "email_verified": true,
      "phone_verified": false,
      "identity_verified": false,
      "password_last_changed": "2024-01-10T14:20:00.000Z",
      "account_age_days": 120
    },
    "login_analytics": {
      "total_logins": 45,
      "unique_devices": 4,
      "unique_locations": 2,
      "most_used_device": "desktop",
      "most_common_location": "New York, US",
      "login_frequency": "daily",
      "unusual_activity": false,
      "peak_login_hours": [9, 10, 14, 18],
      "login_trend": "stable"
    }
  }
}
```

### 2. Active Sessions
**GET** `/api/v1/security/sessions`

**Description:** Get detailed information about all active sessions with enhanced device and location data.

**Response Example:**
```json
{
  "success": true,
  "message": "Active sessions retrieved successfully",
  "data": {
    "total_sessions": 3,
    "sessions": [
      {
        "id": "session_123",
        "device": "MacBook Pro",
        "device_type": "desktop",
        "browser": "Chrome 120.0.6099.71",
        "operating_system": "macOS 14.2",
        "location": "New York, United States",
        "ip_address": "192.168.1.100",
        "last_activity": "2024-01-15T10:30:00.000Z",
        "created_at": "2024-01-15T08:00:00.000Z",
        "duration": "2h 30m",
        "is_current": true,
        "risk_level": "low",
        "trusted_device": true,
        "session_score": 95
      }
    ],
    "current_session": "session_123",
    "session_analytics": {
      "unique_devices": 2,
      "unique_locations": 2,
      "oldest_session": "2024-01-14T08:00:00.000Z",
      "most_recent_login": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 3. Terminate Specific Session
**DELETE** `/api/v1/security/sessions/:sessionId`

**Description:** Terminate a specific session by ID (cannot terminate current session).

**Parameters:**
- `sessionId` (string): The ID of the session to terminate

**Response Example:**
```json
{
  "success": true,
  "message": "Session terminated successfully",
  "data": {
    "terminated_session": "session_456",
    "termination_time": "2024-01-15T10:35:00.000Z"
  }
}
```

### 4. Logout from All Devices
**POST** `/api/v1/security/logout-all-devices`

**Description:** Logout from all devices except the current one. Sends security notification email.

**Response Example:**
```json
{
  "success": true,
  "message": "Successfully logged out from all devices",
  "data": {
    "sessions_terminated": 2,
    "current_session_kept": "session_123",
    "notification_sent": true,
    "security_recommendations": [
      "Change your password if you suspect unauthorized access",
      "Review your recent login activity regularly",
      "Enable two-factor authentication for added security"
    ]
  }
}
```

### 5. Security Activity History
**GET** `/api/v1/security/activity`

**Description:** Get paginated security activity history with filtering options.

**Query Parameters:**
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `days` (number, optional): Number of days to look back (default: 30)
- `type` (string, optional): Filter by activity type

**Available Activity Types:**
- `login`
- `logout`
- `logout_all_devices`
- `password_change`
- `password_reset`
- `password_reset_request`
- `temp_password_verified`
- `session_terminated`
- `bulk_session_termination`
- `admin_action`

**Response Example:**
```json
{
  "success": true,
  "message": "Security activity retrieved successfully",
  "data": {
    "activities": [
      {
        "id": "activity_123",
        "action": "login",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "device": "MacBook Pro",
        "browser": "Chrome 120.0",
        "location": "New York, US",
        "ip_address": "192.168.1.100",
        "risk_level": "low",
        "details": {
          "login_method": "email_password",
          "session_id": "session_123",
          "remember_me": false
        },
        "formatted_time": "2 hours ago"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_items": 45,
      "items_per_page": 20,
      "has_next": true,
      "has_previous": false
    },
    "summary": {
      "total_activities": 45,
      "security_events": 8,
      "login_events": 25,
      "high_risk_events": 0
    }
  }
}
```

### 6. Security Statistics Only
**GET** `/api/v1/security/stats`

**Description:** Get security statistics and metrics only (lighter endpoint for dashboard widgets).

**Response Example:**
```json
{
  "success": true,
  "message": "Security statistics retrieved successfully",
  "data": {
    "stats": {
      "active_sessions": 3,
      "last_login": "2024-01-15T10:30:00.000Z",
      "security_score": 85,
      "two_factor_enabled": false
    },
    "security_assessment": {
      "score": 85,
      "level": "good",
      "factors": {
        "positive": ["email_verified", "strong_password"],
        "negative": ["no_2fa"]
      }
    },
    "login_analytics": {
      "total_logins": 45,
      "unique_devices": 4,
      "login_frequency": "daily"
    }
  }
}
```

### 7. Risk Assessment
**GET** `/api/v1/security/risk-assessment`

**Description:** Get detailed risk assessment for the user account.

**Response Example:**
```json
{
  "success": true,
  "message": "Risk assessment retrieved successfully",
  "data": {
    "risk_assessment": {
      "score": 85,
      "level": "good",
      "factors": {
        "positive": ["email_verified", "strong_password", "trusted_devices"],
        "negative": ["no_2fa", "multiple_locations"],
        "neutral": ["normal_activity_pattern"]
      },
      "recommendations": [
        {
          "priority": "high",
          "action": "Enable Two-Factor Authentication",
          "description": "Add an extra layer of security to your account"
        }
      ]
    },
    "security_score": {
      "total": 85,
      "breakdown": {
        "authentication": 70,
        "device_security": 90,
        "activity_patterns": 85,
        "account_settings": 80
      }
    },
    "session_analysis": {
      "total_sessions": 3,
      "unique_locations": 2,
      "unique_devices": 2,
      "high_risk_sessions": 0
    },
    "recommendations": [
      {
        "priority": "high",
        "action": "Enable Two-Factor Authentication",
        "description": "Add an extra layer of security to your account"
      }
    ]
  }
}
```

### 8. Device Management
**GET** `/api/v1/security/devices`

**Description:** Get information about devices that have accessed the account.

**Response Example:**
```json
{
  "success": true,
  "message": "Device information retrieved successfully",
  "data": {
    "devices": [
      {
        "device_id": "device_123",
        "device_name": "MacBook Pro",
        "device_type": "desktop",
        "operating_system": "macOS 14.2",
        "browser": "Chrome 120.0",
        "is_current": true,
        "is_trusted": true,
        "last_seen": "2024-01-15T10:30:00.000Z",
        "last_seen_formatted": "2 hours ago",
        "first_seen": "2024-01-10T08:00:00.000Z",
        "session_count": 1,
        "recent_locations": ["New York, US"],
        "recent_activity": [
          {
            "action": "login",
            "timestamp": "2024-01-15T10:30:00.000Z",
            "formatted_time": "2 hours ago"
          }
        ],
        "risk_level": "low"
      }
    ],
    "summary": {
      "total_devices": 4,
      "active_devices": 1,
      "trusted_devices": 3,
      "high_risk_devices": 0
    }
  }
}
```

### 9. Trust/Untrust Device
**POST** `/api/v1/security/devices/:deviceId/trust`

**Description:** Mark a device as trusted or untrusted.

**Parameters:**
- `deviceId` (string): The ID of the device to update

**Request Body:**
```json
{
  "trusted": true
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "Device trusted successfully",
  "data": {
    "device_id": "device_123",
    "trusted": true
  }
}
```

## React Component Integration

### 1. Create API Service

```typescript
// services/securityApi.ts
import axios from 'axios';

const API_BASE_URL = '/api/v1/security';

export interface SecurityOverview {
  stats: {
    active_sessions: number;
    last_login: string;
    security_score: number;
    two_factor_enabled: boolean;
  };
  active_sessions: {
    total: number;
    sessions: Session[];
    current_session: string;
  };
  security_assessment: {
    score: number;
    level: string;
    recommendations: Recommendation[];
  };
  recent_activity: Activity[];
}

export interface Session {
  id: string;
  device: string;
  device_type: string;
  browser: string;
  location: string;
  last_activity: string;
  is_current: boolean;
  risk_level: string;
}

export interface Activity {
  action: string;
  timestamp: string;
  device: string;
  location: string;
  risk_level: string;
  formatted_time: string;
}

class SecurityAPI {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getSecurityOverview(): Promise<SecurityOverview> {
    const response = await axios.get(`${API_BASE_URL}/overview`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async getActiveSessions() {
    const response = await axios.get(`${API_BASE_URL}/sessions`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async terminateSession(sessionId: string) {
    const response = await axios.delete(`${API_BASE_URL}/sessions/${sessionId}`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async logoutAllDevices() {
    const response = await axios.post(`${API_BASE_URL}/logout-all-devices`, {}, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async getSecurityActivity(params?: {
    page?: number;
    limit?: number;
    days?: number;
    type?: string;
  }) {
    const response = await axios.get(`${API_BASE_URL}/activity`, {
      headers: this.getAuthHeaders(),
      params,
    });
    return response.data.data;
  }

  async getRiskAssessment() {
    const response = await axios.get(`${API_BASE_URL}/risk-assessment`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async getDevices() {
    const response = await axios.get(`${API_BASE_URL}/devices`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async trustDevice(deviceId: string, trusted: boolean) {
    const response = await axios.post(
      `${API_BASE_URL}/devices/${deviceId}/trust`,
      { trusted },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }
}

export const securityAPI = new SecurityAPI();
```

### 2. Update Your React Component

```typescript
// components/SecuritySettings.tsx
import React, { useState, useEffect } from 'react';
import { securityAPI, SecurityOverview } from '../services/securityApi';

const SecuritySettings: React.FC = () => {
  const [securityData, setSecurityData] = useState<SecurityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      const data = await securityAPI.getSecurityOverview();
      setSecurityData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load security data');
      console.error('Security data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      await securityAPI.terminateSession(sessionId);
      // Reload data to reflect changes
      await loadSecurityData();
    } catch (err) {
      console.error('Failed to terminate session:', err);
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      await securityAPI.logoutAllDevices();
      // Reload data to reflect changes
      await loadSecurityData();
    } catch (err) {
      console.error('Failed to logout all devices:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading security data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!securityData) {
    return <div>No security data available</div>;
  }

  return (
    <div className="security-settings">
      {/* Security Statistics */}
      <div className="security-stats">
        <div className="stat-card">
          <h3>Active Sessions</h3>
          <p>{securityData.stats.active_sessions}</p>
        </div>
        <div className="stat-card">
          <h3>Security Score</h3>
          <p>{securityData.stats.security_score}/100</p>
        </div>
        <div className="stat-card">
          <h3>Two-Factor Auth</h3>
          <p>{securityData.stats.two_factor_enabled ? 'Enabled' : 'Disabled'}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button 
          onClick={handleLogoutAllDevices}
          className="btn-danger"
        >
          Logout from All Devices
        </button>
        <button className="btn-primary">
          Enable Two-Factor Auth
        </button>
      </div>

      {/* Active Sessions */}
      <div className="active-sessions">
        <h3>Active Sessions</h3>
        {securityData.active_sessions.sessions.map((session) => (
          <div key={session.id} className="session-card">
            <div className="session-info">
              <h4>{session.device}</h4>
              <p>{session.browser} • {session.location}</p>
              <p>Last activity: {session.formatted_time}</p>
              {session.is_current && <span className="current-badge">Current</span>}
            </div>
            {!session.is_current && (
              <button 
                onClick={() => handleTerminateSession(session.id)}
                className="btn-secondary"
              >
                Terminate
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Security Recommendations */}
      <div className="recommendations">
        <h3>Security Recommendations</h3>
        {securityData.security_assessment.recommendations.map((rec, index) => (
          <div key={index} className={`recommendation ${rec.priority}`}>
            <h4>{rec.action}</h4>
            <p>{rec.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SecuritySettings;
```

### 3. Advanced Features

For more advanced features, you can use additional endpoints:

```typescript
// Advanced security features
const SecurityAdvanced: React.FC = () => {
  const [activityHistory, setActivityHistory] = useState([]);
  const [devices, setDevices] = useState([]);
  const [riskAssessment, setRiskAssessment] = useState(null);

  useEffect(() => {
    loadAdvancedData();
  }, []);

  const loadAdvancedData = async () => {
    try {
      const [activity, deviceData, risk] = await Promise.all([
        securityAPI.getSecurityActivity({ limit: 50 }),
        securityAPI.getDevices(),
        securityAPI.getRiskAssessment(),
      ]);

      setActivityHistory(activity.activities);
      setDevices(deviceData.devices);
      setRiskAssessment(risk);
    } catch (error) {
      console.error('Failed to load advanced security data:', error);
    }
  };

  // Rest of component implementation...
};
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found (user/session/device not found)
- `500`: Internal server error

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Rate Limiting**: Implement client-side rate limiting for frequent requests
3. **Data Validation**: Validate all user inputs before sending to API
4. **Error Handling**: Don't expose sensitive information in error messages
5. **Session Management**: Handle session expiration gracefully
6. **HTTPS**: Always use HTTPS in production

## Testing

You can test the endpoints using curl or Postman:

```bash
# Get security overview
curl -X GET "http://localhost:5000/api/v1/security/overview" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Terminate a session
curl -X DELETE "http://localhost:5000/api/v1/security/sessions/session_123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Logout from all devices
curl -X POST "http://localhost:5000/api/v1/security/logout-all-devices" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

This comprehensive API provides all the data your React Security Settings component needs, with real session tracking, risk assessment, device management, and security analytics. 