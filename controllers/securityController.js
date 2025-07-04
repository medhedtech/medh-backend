import crypto from "crypto";
import geoip from "geoip-lite";
import { UAParser } from "ua-parser-js";
import User from "../models/user-modal.js";
import logger from "../utils/logger.js";
import { authenticateToken } from "../middleware/auth.js";

class SecurityController {
  constructor() {
    this.riskFactors = {
      HIGH: ['unknown_location', 'suspicious_device', 'rapid_logins', 'multiple_failed_attempts'],
      MEDIUM: ['new_location', 'new_device', 'unusual_hours'],
      LOW: ['trusted_device', 'known_location', 'normal_pattern']
    };
  }

  /**
   * Get comprehensive security overview for the user
   * @route GET /api/v1/security/overview
   */
  async getSecurityOverview(req, res) {
    try {
      const user = req.user;
      const fullUser = await User.findById(user.id).select('-password');
      
      if (!fullUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Get active sessions with enhanced device info
      const activeSessions = this.getEnhancedActiveSessions(fullUser);
      
      // Calculate security metrics
      const securityStats = await this.calculateSecurityStats(fullUser);
      
      // Get recent security events
      const recentActivity = this.getRecentSecurityActivity(fullUser);
      
      // Calculate risk assessment
      const riskAssessment = this.calculateRiskAssessment(fullUser, activeSessions);

      const overview = {
        // Security Statistics
        stats: securityStats,
        
        // Active Sessions
        active_sessions: {
          total: activeSessions.length,
          sessions: activeSessions,
          current_session: this.getCurrentSession(activeSessions, req)
        },
        
        // Security Score & Risk Assessment
        security_assessment: {
          score: riskAssessment.score,
          level: riskAssessment.level,
          factors: riskAssessment.factors,
          recommendations: riskAssessment.recommendations
        },
        
        // Recent Security Activity
        recent_activity: recentActivity,
        
        // Account Security Features
        security_features: {
          two_factor_enabled: fullUser.two_factor_enabled || false,
          email_verified: fullUser.email_verified || false,
          phone_verified: fullUser.phone_verified || false,
          identity_verified: fullUser.identity_verified || false,
          password_last_changed: this.getPasswordLastChanged(fullUser),
          account_age_days: Math.floor((Date.now() - fullUser.created_at) / (1000 * 60 * 60 * 24))
        },
        
        // Login Analytics
        login_analytics: this.getLoginAnalytics(fullUser)
      };

      res.status(200).json({
        success: true,
        message: "Security overview retrieved successfully",
        data: overview
      });

    } catch (error) {
      logger.error("Security overview error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: "Internal server error retrieving security overview",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  /**
   * Get detailed active sessions
   * @route GET /api/v1/security/sessions
   */
  async getActiveSessions(req, res) {
    try {
      const user = req.user;
      const fullUser = await User.findById(user.id).select('-password');
      
      if (!fullUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const sessions = this.getEnhancedActiveSessions(fullUser);
      const currentSession = this.getCurrentSession(sessions, req);

      res.status(200).json({
        success: true,
        message: "Active sessions retrieved successfully",
        data: {
          total_sessions: sessions.length,
          sessions,
          current_session: currentSession?.id || null,
          session_analytics: {
            unique_devices: new Set(sessions.map(s => s.device_id)).size,
            unique_locations: new Set(sessions.map(s => s.location)).size,
            oldest_session: sessions.length > 0 ? Math.min(...sessions.map(s => new Date(s.created_at))) : null,
            most_recent_login: sessions.length > 0 ? Math.max(...sessions.map(s => new Date(s.last_activity))) : null
          }
        }
      });

    } catch (error) {
      logger.error("Get active sessions error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: "Internal server error retrieving sessions",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  /**
   * Terminate a specific session
   * @route DELETE /api/v1/security/sessions/:sessionId
   */
  async terminateSession(req, res) {
    try {
      const user = req.user;
      const { sessionId } = req.params;
      const fullUser = await User.findById(user.id);
      
      if (!fullUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const session = fullUser.sessions.find(s => s.session_id === sessionId && s.is_active);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found or already inactive"
        });
      }

      // Prevent terminating current session
      const currentSessionId = req.headers['x-session-id'] || req.headers['session-id'];
      if (session.session_id === currentSessionId) {
        return res.status(400).json({
          success: false,
          message: "Cannot terminate current session. Use logout instead."
        });
      }

      await fullUser.endSession(sessionId);

      // Log session termination
      await fullUser.logActivity("session_terminated", null, {
        terminated_session_id: sessionId,
        termination_time: new Date(),
        terminated_by_user: true,
        termination_method: "security_panel"
      }, {
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        security_event: true
      });

      res.status(200).json({
        success: true,
        message: "Session terminated successfully",
        data: {
          terminated_session: sessionId,
          remaining_sessions: fullUser.sessions.filter(s => s.is_active).length
        }
      });

    } catch (error) {
      logger.error("Terminate session error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        sessionId: req.params.sessionId
      });
      
      res.status(500).json({
        success: false,
        message: "Internal server error terminating session",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  /**
   * Logout from all devices except current
   * @route POST /api/v1/security/logout-all-devices
   */
  async logoutAllDevices(req, res) {
    try {
      const user = req.user;
      const fullUser = await User.findById(user.id);
      
      if (!fullUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const currentSessionId = req.headers['x-session-id'] || req.headers['session-id'];
      const activeSessions = fullUser.sessions.filter(s => s.is_active);
      let terminatedCount = 0;

      // Terminate all sessions except current
      for (const session of activeSessions) {
        if (session.session_id !== currentSessionId) {
          await fullUser.endSession(session.session_id);
          terminatedCount++;
        }
      }

      // Log bulk session termination
      await fullUser.logActivity("bulk_session_termination", null, {
        terminated_sessions_count: terminatedCount,
        termination_time: new Date(),
        kept_current_session: currentSessionId,
        termination_method: "security_panel"
      }, {
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        security_event: true
      });

      // Send security notification email
      try {
        const deviceInfo = this.extractDeviceInfo(req);
        const locationInfo = this.extractLocationInfo(req);
        await this.sendLogoutAllDevicesNotification(fullUser, deviceInfo, locationInfo, terminatedCount);
      } catch (emailError) {
        logger.warn("Failed to send logout notification email", {
          error: emailError.message,
          userId: fullUser._id
        });
      }

      res.status(200).json({
        success: true,
        message: `Successfully logged out from ${terminatedCount} devices`,
        data: {
          terminated_sessions: terminatedCount,
          current_session_kept: currentSessionId,
          logout_time: new Date(),
          security_recommendations: [
            "Change your password if you suspect unauthorized access",
            "Review your recent login activity regularly",
            "Enable two-factor authentication for added security",
            "Use strong, unique passwords for all accounts"
          ]
        }
      });

    } catch (error) {
      logger.error("Logout all devices error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: "Internal server error during logout from all devices",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  /**
   * Get security activity history
   * @route GET /api/v1/security/activity
   */
  async getSecurityActivity(req, res) {
    try {
      const user = req.user;
      const { page = 1, limit = 20, type, days = 30 } = req.query;
      const fullUser = await User.findById(user.id).select('-password');
      
      if (!fullUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 100); // Max 100 items per page
      const skip = (pageNum - 1) * limitNum;
      const daysAgo = new Date(Date.now() - (parseInt(days) * 24 * 60 * 60 * 1000));

      // Security-related activities
      const securityActions = [
        'login', 'logout', 'logout_all_devices', 'password_change', 
        'password_reset', 'password_reset_request', 'temp_password_verified',
        'session_terminated', 'bulk_session_termination', 'admin_action'
      ];

      let activities = fullUser.activity_log.filter(activity => {
        const isSecurityAction = type ? activity.action === type : securityActions.includes(activity.action);
        const isWithinTimeframe = new Date(activity.timestamp) >= daysAgo;
        return isSecurityAction && isWithinTimeframe;
      });

      // Sort by timestamp (newest first)
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply pagination
      const totalActivities = activities.length;
      const paginatedActivities = activities.slice(skip, skip + limitNum);

      // Enhance activities with additional context
      const enhancedActivities = paginatedActivities.map(activity => ({
        ...activity.toObject(),
        risk_level: this.assessActivityRisk(activity),
        formatted_time: this.formatTimeAgo(activity.timestamp),
        location_info: activity.metadata?.geolocation ? {
          city: activity.metadata.geolocation.city,
          country: activity.metadata.geolocation.country,
          region: activity.metadata.geolocation.region
        } : null,
        device_info: activity.metadata ? {
          type: activity.metadata.device_type,
          browser: activity.metadata.browser,
          os: activity.metadata.operating_system
        } : null
      }));

      res.status(200).json({
        success: true,
        message: "Security activity retrieved successfully",
        data: {
          activities: enhancedActivities,
          pagination: {
            current_page: pageNum,
            total_pages: Math.ceil(totalActivities / limitNum),
            total_items: totalActivities,
            items_per_page: limitNum,
            has_next: pageNum * limitNum < totalActivities,
            has_prev: pageNum > 1
          },
          summary: {
            total_security_events: totalActivities,
            timeframe_days: parseInt(days),
            activity_breakdown: this.getActivityBreakdown(activities)
          }
        }
      });

    } catch (error) {
      logger.error("Get security activity error:", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: "Internal server error retrieving security activity",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  // Helper Methods

  /**
   * Get enhanced active sessions with device and location info
   */
  getEnhancedActiveSessions(user) {
    if (!user.sessions) return [];

    return user.sessions
      .filter(session => session.is_active)
      .map(session => {
        const deviceInfo = this.parseUserAgent(session.user_agent);
        const location = this.formatLocation(session.geolocation);
        const lastActive = this.formatTimeAgo(session.last_activity || session.start_time);

        return {
          id: session.session_id,
          device_id: session.device_id,
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          operating_system: deviceInfo.os,
          location: location,
          ip_address: session.ip_address,
          created_at: session.start_time,
          last_activity: session.last_activity || session.start_time,
          last_active: lastActive,
          is_current: false, // Will be set by getCurrentSession
          session_duration: this.calculateSessionDuration(session),
          risk_level: this.assessSessionRisk(session, user)
        };
      })
      .sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity));
  }

  /**
   * Identify current session
   */
  getCurrentSession(sessions, req) {
    const sessionId = req.headers['x-session-id'] || req.headers['session-id'];
    if (!sessionId) return null;

    const currentSession = sessions.find(s => s.id === sessionId);
    if (currentSession) {
      currentSession.is_current = true;
    }
    return currentSession;
  }

  /**
   * Calculate comprehensive security statistics
   */
  async calculateSecurityStats(user) {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const lastMonth = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Active sessions count
    const activeSessions = user.sessions ? user.sessions.filter(s => s.is_active).length : 0;

    // Last login info
    const lastLogin = user.last_login ? {
      time: user.last_login,
      formatted: this.formatTimeAgo(user.last_login)
    } : null;

    // Security score calculation
    const securityScore = this.calculateSecurityScore(user);

    // Two-factor auth status
    const twoFactorStatus = user.two_factor_enabled ? 'Enabled' : 'Disabled';

    // Recent login activity
    const recentLogins = user.activity_log
      ? user.activity_log.filter(a => 
          a.action === 'login' && 
          new Date(a.timestamp) >= lastWeek
        ).length
      : 0;

    return [
      {
        title: 'Active Sessions',
        value: activeSessions.toString(),
        description: 'Devices currently logged in',
        icon: '📱',
        color: 'text-blue-600',
        trend: this.calculateSessionTrend(user)
      },
      {
        title: 'Last Login',
        value: lastLogin ? lastLogin.formatted : 'Never',
        description: 'Most recent login activity',
        icon: '🕒',
        color: 'text-green-600',
        raw_value: lastLogin ? lastLogin.time : null
      },
      {
        title: 'Security Score',
        value: securityScore.level,
        description: `${securityScore.score}/100 - ${securityScore.description}`,
        icon: '🛡️',
        color: securityScore.color,
        numeric_value: securityScore.score
      },
      {
        title: 'Two-Factor Auth',
        value: twoFactorStatus,
        description: 'Additional security layer',
        icon: '🔐',
        color: user.two_factor_enabled ? 'text-green-600' : 'text-amber-600',
        enabled: user.two_factor_enabled || false
      }
    ];
  }

  /**
   * Calculate security score based on various factors
   */
  calculateSecurityScore(user) {
    let score = 100;
    let factors = [];

    // Two-factor authentication
    if (!user.two_factor_enabled) {
      score -= 25;
      factors.push('Two-factor authentication disabled');
    }

    // Email verification
    if (!user.email_verified) {
      score -= 15;
      factors.push('Email not verified');
    }

    // Password age (if we can determine it)
    const passwordAge = this.getPasswordAge(user);
    if (passwordAge > 180) { // 6 months
      score -= 10;
      factors.push('Password older than 6 months');
    }

    // Multiple active sessions from different locations
    const uniqueLocations = this.getUniqueSessionLocations(user);
    if (uniqueLocations > 3) {
      score -= 10;
      factors.push(`Active sessions from ${uniqueLocations} different locations`);
    }

    // Recent failed login attempts
    const recentFailedAttempts = user.failed_login_attempts || 0;
    if (recentFailedAttempts > 0) {
      score -= Math.min(recentFailedAttempts * 5, 20);
      factors.push(`${recentFailedAttempts} recent failed login attempts`);
    }

    // Account age (newer accounts are slightly less trusted)
    const accountAgeDays = Math.floor((Date.now() - user.created_at) / (1000 * 60 * 60 * 24));
    if (accountAgeDays < 7) {
      score -= 5;
      factors.push('New account (less than 7 days old)');
    }

    score = Math.max(0, Math.min(100, score));

    let level, description, color;
    if (score >= 90) {
      level = 'Excellent';
      description = 'Your account security is excellent';
      color = 'text-green-600';
    } else if (score >= 75) {
      level = 'Good';
      description = 'Your account security is good';
      color = 'text-green-500';
    } else if (score >= 60) {
      level = 'Fair';
      description = 'Your account security needs improvement';
      color = 'text-yellow-600';
    } else if (score >= 40) {
      level = 'Poor';
      description = 'Your account security is poor';
      color = 'text-orange-600';
    } else {
      level = 'Critical';
      description = 'Your account security needs immediate attention';
      color = 'text-red-600';
    }

    return {
      score,
      level,
      description,
      color,
      factors,
      recommendations: this.getSecurityRecommendations(score, factors)
    };
  }

  /**
   * Calculate risk assessment for user account
   */
  calculateRiskAssessment(user, sessions) {
    const riskFactors = [];
    let riskScore = 0;

    // Check for suspicious patterns
    const uniqueIPs = new Set(sessions.map(s => s.ip_address)).size;
    const uniqueLocations = new Set(sessions.map(s => s.location)).size;

    if (uniqueIPs > 5) {
      riskFactors.push({
        type: 'multiple_ips',
        severity: 'medium',
        description: `Active sessions from ${uniqueIPs} different IP addresses`
      });
      riskScore += 20;
    }

    if (uniqueLocations > 3) {
      riskFactors.push({
        type: 'multiple_locations',
        severity: 'medium',
        description: `Active sessions from ${uniqueLocations} different locations`
      });
      riskScore += 15;
    }

    // Check for recent security events
    const recentSecurityEvents = this.getRecentSecurityEvents(user, 7);
    if (recentSecurityEvents.length > 10) {
      riskFactors.push({
        type: 'high_activity',
        severity: 'low',
        description: `${recentSecurityEvents.length} security events in the last 7 days`
      });
      riskScore += 10;
    }

    // Check for failed login attempts
    if (user.failed_login_attempts > 0) {
      riskFactors.push({
        type: 'failed_attempts',
        severity: 'high',
        description: `${user.failed_login_attempts} recent failed login attempts`
      });
      riskScore += 30;
    }

    // Determine overall risk level
    let level, recommendations;
    if (riskScore >= 50) {
      level = 'high';
      recommendations = [
        'Change your password immediately',
        'Enable two-factor authentication',
        'Review and terminate suspicious sessions',
        'Contact support if you notice unauthorized activity'
      ];
    } else if (riskScore >= 25) {
      level = 'medium';
      recommendations = [
        'Review your active sessions',
        'Consider enabling two-factor authentication',
        'Monitor your account activity regularly'
      ];
    } else {
      level = 'low';
      recommendations = [
        'Continue following good security practices',
        'Enable two-factor authentication if not already done',
        'Regularly review your account activity'
      ];
    }

    return {
      score: Math.max(0, 100 - riskScore),
      level,
      factors: riskFactors,
      recommendations
    };
  }

  /**
   * Get recent security activity
   */
  getRecentSecurityActivity(user, limit = 10) {
    if (!user.activity_log) return [];

    const securityActions = [
      'login', 'logout', 'logout_all_devices', 'password_change', 
      'session_terminated', 'bulk_session_termination'
    ];

    return user.activity_log
      .filter(activity => securityActions.includes(activity.action))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
      .map(activity => ({
        action: activity.action,
        timestamp: activity.timestamp,
        formatted_time: this.formatTimeAgo(activity.timestamp),
        details: activity.details,
        location: activity.metadata?.geolocation ? 
          `${activity.metadata.geolocation.city}, ${activity.metadata.geolocation.country}` : 
          'Unknown',
        device: activity.metadata?.device_type || 'Unknown',
        ip_address: activity.metadata?.ip_address,
        risk_level: this.assessActivityRisk(activity)
      }));
  }

  /**
   * Get login analytics
   */
  getLoginAnalytics(user) {
    const now = new Date();
    const last7Days = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const last30Days = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    const loginActivities = user.activity_log ? 
      user.activity_log.filter(a => a.action === 'login') : [];

    const recentLogins = loginActivities.filter(a => new Date(a.timestamp) >= last7Days);
    const monthlyLogins = loginActivities.filter(a => new Date(a.timestamp) >= last30Days);

    // Get unique devices and locations
    const uniqueDevices = new Set(
      loginActivities.map(a => a.metadata?.device_type).filter(Boolean)
    ).size;

    const uniqueLocations = new Set(
      loginActivities
        .map(a => a.metadata?.geolocation ? `${a.metadata.geolocation.city}, ${a.metadata.geolocation.country}` : null)
        .filter(Boolean)
    ).size;

    return {
      total_logins: user.statistics?.engagement?.total_logins || loginActivities.length,
      logins_last_7_days: recentLogins.length,
      logins_last_30_days: monthlyLogins.length,
      unique_devices: uniqueDevices,
      unique_locations: uniqueLocations,
      average_session_duration: user.statistics?.engagement?.avg_session_duration || 0,
      last_login: user.last_login,
      first_login: user.created_at,
      login_streak: user.statistics?.learning?.current_streak || 0,
      most_used_device: this.getMostUsedDevice(loginActivities),
      most_common_location: this.getMostCommonLocation(loginActivities)
    };
  }

  // Utility Methods

  parseUserAgent(userAgent) {
    if (!userAgent) return { device: 'Unknown Device', browser: 'Unknown Browser', os: 'Unknown OS' };

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const device = result.device.model || result.device.vendor || 
                  (result.device.type === 'mobile' ? 'Mobile Device' : 
                   result.device.type === 'tablet' ? 'Tablet' : 'Desktop');
    
    const browser = result.browser.name ? 
      `${result.browser.name} ${result.browser.version || ''}`.trim() : 
      'Unknown Browser';
    
    const os = result.os.name ? 
      `${result.os.name} ${result.os.version || ''}`.trim() : 
      'Unknown OS';

    return { device, browser, os };
  }

  formatLocation(geolocation) {
    if (!geolocation) return 'Unknown Location';
    
    const parts = [];
    if (geolocation.city) parts.push(geolocation.city);
    if (geolocation.region && geolocation.region !== geolocation.city) parts.push(geolocation.region);
    if (geolocation.country) parts.push(geolocation.country);
    
    return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
  }

  formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return time.toLocaleDateString();
  }

  calculateSessionDuration(session) {
    const start = new Date(session.start_time);
    const end = session.last_activity ? new Date(session.last_activity) : new Date();
    const durationMs = end - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  assessSessionRisk(session, user) {
    // Simple risk assessment based on location and device patterns
    const knownDevices = user.devices || [];
    const isKnownDevice = knownDevices.some(d => d.device_id === session.device_id);
    
    if (!isKnownDevice) return 'medium';
    if (!session.geolocation) return 'medium';
    return 'low';
  }

  assessActivityRisk(activity) {
    const riskActions = {
      'password_change': 'medium',
      'logout_all_devices': 'medium', 
      'bulk_session_termination': 'medium',
      'password_reset': 'high',
      'admin_action': 'high'
    };

    return riskActions[activity.action] || 'low';
  }

  getActivityBreakdown(activities) {
    const breakdown = {};
    activities.forEach(activity => {
      breakdown[activity.action] = (breakdown[activity.action] || 0) + 1;
    });
    return breakdown;
  }

  getPasswordAge(user) {
    // This would need to be tracked when password is changed
    // For now, return account age as approximation
    return Math.floor((Date.now() - user.created_at) / (1000 * 60 * 60 * 24));
  }

  getPasswordLastChanged(user) {
    // Look for password change activities
    if (!user.activity_log) return null;
    
    const passwordChanges = user.activity_log.filter(a => a.action === 'password_change');
    if (passwordChanges.length === 0) return null;
    
    const lastChange = passwordChanges.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    return {
      date: lastChange.timestamp,
      formatted: this.formatTimeAgo(lastChange.timestamp)
    };
  }

  getUniqueSessionLocations(user) {
    if (!user.sessions) return 0;
    
    const locations = new Set();
    user.sessions
      .filter(s => s.is_active && s.geolocation)
      .forEach(s => {
        const location = `${s.geolocation.city}, ${s.geolocation.country}`;
        locations.add(location);
      });
    
    return locations.size;
  }

  calculateSessionTrend(user) {
    // Simple trend calculation - compare current week vs previous week
    const now = new Date();
    const lastWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));

    const thisWeekLogins = user.activity_log ? 
      user.activity_log.filter(a => 
        a.action === 'login' && 
        new Date(a.timestamp) >= lastWeek
      ).length : 0;

    const lastWeekLogins = user.activity_log ? 
      user.activity_log.filter(a => 
        a.action === 'login' && 
        new Date(a.timestamp) >= twoWeeksAgo && 
        new Date(a.timestamp) < lastWeek
      ).length : 0;

    if (thisWeekLogins > lastWeekLogins) return 'up';
    if (thisWeekLogins < lastWeekLogins) return 'down';
    return 'stable';
  }

  getSecurityRecommendations(score, factors) {
    const recommendations = [];

    if (score < 90 && factors.includes('Two-factor authentication disabled')) {
      recommendations.push({
        priority: 'high',
        action: 'Enable two-factor authentication',
        description: 'Add an extra layer of security to your account'
      });
    }

    if (factors.some(f => f.includes('Password older'))) {
      recommendations.push({
        priority: 'medium',
        action: 'Change your password',
        description: 'Update to a strong, unique password'
      });
    }

    if (factors.some(f => f.includes('Email not verified'))) {
      recommendations.push({
        priority: 'high',
        action: 'Verify your email address',
        description: 'Confirm your email for account recovery'
      });
    }

    if (factors.some(f => f.includes('failed login attempts'))) {
      recommendations.push({
        priority: 'high',
        action: 'Review recent activity',
        description: 'Check for unauthorized access attempts'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        action: 'Continue good security practices',
        description: 'Your account security is in good shape'
      });
    }

    return recommendations;
  }

  getRecentSecurityEvents(user, days) {
    if (!user.activity_log) return [];
    
    const cutoff = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const securityActions = [
      'login', 'logout', 'logout_all_devices', 'password_change', 
      'password_reset', 'session_terminated', 'bulk_session_termination'
    ];

    return user.activity_log.filter(activity => 
      securityActions.includes(activity.action) && 
      new Date(activity.timestamp) >= cutoff
    );
  }

  getMostUsedDevice(loginActivities) {
    const deviceCounts = {};
    loginActivities.forEach(activity => {
      const device = activity.metadata?.device_type || 'Unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });

    let mostUsed = 'Unknown';
    let maxCount = 0;
    for (const [device, count] of Object.entries(deviceCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostUsed = device;
      }
    }

    return mostUsed;
  }

  getMostCommonLocation(loginActivities) {
    const locationCounts = {};
    loginActivities.forEach(activity => {
      if (activity.metadata?.geolocation) {
        const location = `${activity.metadata.geolocation.city}, ${activity.metadata.geolocation.country}`;
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }
    });

    let mostCommon = 'Unknown';
    let maxCount = 0;
    for (const [location, count] of Object.entries(locationCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = location;
      }
    }

    return mostCommon;
  }

  extractDeviceInfo(req) {
    const userAgent = req.headers["user-agent"] || "";
    const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"]?.split(',')[0] || "unknown";
    
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    
    const deviceName = result.device.model || result.device.vendor || 
                      (result.device.type === 'mobile' ? 'Mobile Device' : 
                       result.device.type === 'tablet' ? 'Tablet' : 'Desktop Computer');
    
    const deviceType = result.device.type || 
                      (userAgent.includes('Mobile') ? 'mobile' : 
                       userAgent.includes('Tablet') ? 'tablet' : 'desktop');
    
    const browserInfo = result.browser.name ? 
      `${result.browser.name} ${result.browser.version || ''}`.trim() : 
      'Unknown Browser';
    
    const osInfo = result.os.name ? 
      `${result.os.name} ${result.os.version || ''}`.trim() : 
      'Unknown OS';
    
    return {
      device_id: crypto.createHash("md5").update(userAgent + ip).digest("hex"),
      device_name: deviceName,
      device_type: deviceType,
      operating_system: osInfo,
      browser: browserInfo,
      ip_address: ip,
      user_agent: userAgent,
      screen_resolution: req.headers["screen-resolution"],
      last_seen: new Date(),
    };
  }

  extractLocationInfo(req) {
    const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"]?.split(',')[0];
    
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return {
        country: 'Unknown',
        region: 'Unknown', 
        city: 'Unknown',
        timezone: 'UTC',
        coordinates: null
      };
    }

    try {
      const geo = geoip.lookup(ip);
      if (geo) {
        return {
          country: geo.country || 'Unknown',
          region: geo.region || 'Unknown',
          city: geo.city || 'Unknown', 
          timezone: geo.timezone || 'UTC',
          coordinates: geo.ll ? {
            latitude: geo.ll[0],
            longitude: geo.ll[1]
          } : null
        };
      }
    } catch (error) {
      logger.error('GeoIP lookup error:', error);
    }

    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown', 
      timezone: 'UTC',
      coordinates: null
    };
  }

  async sendLogoutAllDevicesNotification(user, deviceInfo, locationInfo, sessionCount) {
    try {
      const emailService = (await import('../services/emailService.js')).default;
      
      const logoutDetails = {
        'Initiated From Device': deviceInfo.device_name || 'Unknown Device',
        'Browser': deviceInfo.browser || 'Unknown Browser', 
        'Operating System': deviceInfo.operating_system || 'Unknown OS',
        'Location': `${locationInfo.city || 'Unknown'}, ${locationInfo.country || 'Unknown'}`,
        'IP Address': deviceInfo.ip_address || 'Unknown',
        'Logout Time': new Date().toLocaleString('en-US', { 
          timeZone: user.preferences?.timezone || 'UTC',
          dateStyle: 'full',
          timeStyle: 'medium'
        }),
        'Sessions Terminated': sessionCount.toString()
      };

      await emailService.sendTemplatedEmail(
        user.email,
        'logout-all-devices',
        '🚪 Logged Out From All Devices - Medh Learning Platform',
        {
          user_name: user.full_name,
          email: user.email,
          details: logoutDetails,
          actionUrl: `${process.env.FRONTEND_URL || 'https://app.medh.co'}/login`,
          supportUrl: `${process.env.FRONTEND_URL || 'https://app.medh.co'}/support`,
          urgent: sessionCount > 3,
          security_recommendations: [
            "Change your password if you suspect unauthorized access",
            "Review your recent login activity regularly", 
            "Enable two-factor authentication for added security",
            "Use strong, unique passwords for all accounts"
          ]
        }
      );
      
      logger.info('Logout all devices notification sent successfully', {
        userId: user._id,
        email: user.email,
        sessionCount
      });
    } catch (error) {
      logger.error('Failed to send logout all devices notification', {
        error: error.message,
        userId: user._id,
        email: user.email
      });
      throw error;
    }
  }
}

export default new SecurityController(); 