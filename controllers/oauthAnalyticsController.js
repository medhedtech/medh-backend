import User from "../models/user-modal.js";
import logger from "../utils/logger.js";

/**
 * OAuth Analytics Controller
 * Provides insights into OAuth adoption and usage patterns
 */
class OAuthAnalyticsController {
  /**
   * Get OAuth adoption statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOAuthStats(req, res) {
    try {
      const { timeframe = "30d", provider } = req.query;

      // Calculate date range
      const now = new Date();
      let startDate;

      switch (timeframe) {
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "1y":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Build aggregation pipeline
      const pipeline = [
        {
          $match: {
            oauth: { $exists: true, $ne: {} },
            created_at: { $gte: startDate },
          },
        },
      ];

      // Provider-specific filtering
      if (provider) {
        pipeline[0].$match[`oauth.${provider}`] = { $exists: true };
      }

      // Get OAuth statistics
      const [
        totalOAuthUsers,
        newOAuthUsers,
        providerStats,
        multiProviderUsers,
        oauthLoginActivity,
      ] = await Promise.all([
        // Total OAuth users
        User.countDocuments({ oauth: { $exists: true, $ne: {} } }),

        // New OAuth users in timeframe
        User.countDocuments({
          oauth: { $exists: true, $ne: {} },
          created_at: { $gte: startDate },
        }),

        // Provider breakdown
        User.aggregate([
          { $match: { oauth: { $exists: true, $ne: {} } } },
          { $project: { providers: { $objectToArray: "$oauth" } } },
          { $unwind: "$providers" },
          { $group: { _id: "$providers.k", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        // Multi-provider users
        User.aggregate([
          { $match: { oauth: { $exists: true, $ne: {} } } },
          {
            $project: {
              providerCount: { $size: { $objectToArray: "$oauth" } },
            },
          },
          { $group: { _id: "$providerCount", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),

        // Recent OAuth login activity
        User.aggregate([
          {
            $match: {
              "activity_log.action": "oauth_login",
              "activity_log.timestamp": { $gte: startDate },
            },
          },
          { $unwind: "$activity_log" },
          {
            $match: {
              "activity_log.action": "oauth_login",
              "activity_log.timestamp": { $gte: startDate },
            },
          },
          {
            $group: {
              _id: {
                provider: "$activity_log.details.provider",
                date: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$activity_log.timestamp",
                  },
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.date": -1 } },
          { $limit: 100 },
        ]),
      ]);

      // Calculate growth metrics
      const totalUsers = await User.countDocuments({});
      const oauthAdoptionRate =
        totalUsers > 0 ? ((totalOAuthUsers / totalUsers) * 100).toFixed(2) : 0;

      // Format provider stats
      const formattedProviderStats = providerStats.map((stat) => ({
        provider: stat._id,
        name: stat._id.charAt(0).toUpperCase() + stat._id.slice(1),
        users: stat.count,
        percentage:
          totalOAuthUsers > 0
            ? ((stat.count / totalOAuthUsers) * 100).toFixed(2)
            : 0,
      }));

      // Format multi-provider stats
      const formattedMultiProviderStats = multiProviderUsers.map((stat) => ({
        provider_count: stat._id,
        users: stat.count,
        percentage:
          totalOAuthUsers > 0
            ? ((stat.count / totalOAuthUsers) * 100).toFixed(2)
            : 0,
      }));

      res.status(200).json({
        success: true,
        data: {
          overview: {
            total_oauth_users: totalOAuthUsers,
            new_oauth_users_in_period: newOAuthUsers,
            oauth_adoption_rate: `${oauthAdoptionRate}%`,
            total_platform_users: totalUsers,
            timeframe,
            period_start: startDate,
            period_end: now,
          },
          provider_breakdown: formattedProviderStats,
          multi_provider_usage: formattedMultiProviderStats,
          recent_activity: oauthLoginActivity,
          insights: {
            most_popular_provider: formattedProviderStats[0]?.provider || null,
            multi_provider_adoption: formattedMultiProviderStats
              .filter((s) => s.provider_count > 1)
              .reduce((sum, s) => sum + s.users, 0),
            growth_trend: newOAuthUsers > 0 ? "positive" : "stable",
          },
        },
      });
    } catch (error) {
      logger.error("OAuth statistics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve OAuth statistics",
        error: error.message,
      });
    }
  }

  /**
   * Get OAuth conversion funnel
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOAuthConversionFunnel(req, res) {
    try {
      const { timeframe = "30d" } = req.query;

      // Calculate date range
      const now = new Date();
      let startDate;

      switch (timeframe) {
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get funnel metrics
      const [
        totalRegistrations,
        oauthRegistrations,
        oauthLogins,
        activeOAuthUsers,
        retainedOAuthUsers,
      ] = await Promise.all([
        // Total registrations in period
        User.countDocuments({ created_at: { $gte: startDate } }),

        // OAuth registrations
        User.countDocuments({
          created_at: { $gte: startDate },
          "meta.registration_method": { $regex: /^oauth_/ },
        }),

        // OAuth logins in period
        User.aggregate([
          {
            $match: {
              "activity_log.action": "oauth_login",
              "activity_log.timestamp": { $gte: startDate },
            },
          },
          { $count: "total" },
        ]),

        // Active OAuth users (logged in within period)
        User.countDocuments({
          oauth: { $exists: true, $ne: {} },
          last_login: { $gte: startDate },
        }),

        // Retained OAuth users (created before period, active within period)
        User.countDocuments({
          oauth: { $exists: true, $ne: {} },
          created_at: { $lt: startDate },
          last_login: { $gte: startDate },
        }),
      ]);

      const oauthLoginCount = oauthLogins[0]?.total || 0;

      // Calculate conversion rates
      const oauthRegistrationRate =
        totalRegistrations > 0
          ? ((oauthRegistrations / totalRegistrations) * 100).toFixed(2)
          : 0;

      const oauthActivationRate =
        oauthRegistrations > 0
          ? ((activeOAuthUsers / oauthRegistrations) * 100).toFixed(2)
          : 0;

      const oauthRetentionRate =
        activeOAuthUsers > 0
          ? ((retainedOAuthUsers / activeOAuthUsers) * 100).toFixed(2)
          : 0;

      res.status(200).json({
        success: true,
        data: {
          funnel_metrics: {
            total_registrations: totalRegistrations,
            oauth_registrations: oauthRegistrations,
            oauth_logins: oauthLoginCount,
            active_oauth_users: activeOAuthUsers,
            retained_oauth_users: retainedOAuthUsers,
          },
          conversion_rates: {
            oauth_registration_rate: `${oauthRegistrationRate}%`,
            oauth_activation_rate: `${oauthActivationRate}%`,
            oauth_retention_rate: `${oauthRetentionRate}%`,
          },
          timeframe,
          period: {
            start: startDate,
            end: now,
          },
        },
      });
    } catch (error) {
      logger.error("OAuth conversion funnel error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve OAuth conversion funnel",
        error: error.message,
      });
    }
  }

  /**
   * Get OAuth security metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOAuthSecurityMetrics(req, res) {
    try {
      const { timeframe = "30d" } = req.query;

      // Calculate date range
      const now = new Date();
      let startDate;

      switch (timeframe) {
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get security metrics
      const [
        suspiciousLogins,
        newDeviceLogins,
        tokenRefreshes,
        accountLinkings,
        accountUnlinkings,
      ] = await Promise.all([
        // Suspicious OAuth logins (multiple locations, etc.)
        User.aggregate([
          { $unwind: "$activity_log" },
          {
            $match: {
              "activity_log.action": "oauth_login",
              "activity_log.timestamp": { $gte: startDate },
              "activity_log.context.risk_level": { $in: ["medium", "high"] },
            },
          },
          { $count: "total" },
        ]),

        // New device OAuth logins
        User.aggregate([
          { $unwind: "$activity_log" },
          {
            $match: {
              "activity_log.action": "oauth_login",
              "activity_log.timestamp": { $gte: startDate },
              "activity_log.details.is_new_device": true,
            },
          },
          { $count: "total" },
        ]),

        // Token refresh attempts
        User.aggregate([
          { $unwind: "$activity_log" },
          {
            $match: {
              "activity_log.action": "oauth_token_refresh",
              "activity_log.timestamp": { $gte: startDate },
            },
          },
          { $count: "total" },
        ]),

        // Account linkings
        User.aggregate([
          { $unwind: "$activity_log" },
          {
            $match: {
              "activity_log.action": "oauth_provider_linked",
              "activity_log.timestamp": { $gte: startDate },
            },
          },
          { $count: "total" },
        ]),

        // Account unlinkings
        User.aggregate([
          { $unwind: "$activity_log" },
          {
            $match: {
              "activity_log.action": "oauth_provider_unlinked",
              "activity_log.timestamp": { $gte: startDate },
            },
          },
          { $count: "total" },
        ]),
      ]);

      const suspiciousLoginCount = suspiciousLogins[0]?.total || 0;
      const newDeviceLoginCount = newDeviceLogins[0]?.total || 0;
      const tokenRefreshCount = tokenRefreshes[0]?.total || 0;
      const accountLinkingCount = accountLinkings[0]?.total || 0;
      const accountUnlinkingCount = accountUnlinkings[0]?.total || 0;

      res.status(200).json({
        success: true,
        data: {
          security_metrics: {
            suspicious_logins: suspiciousLoginCount,
            new_device_logins: newDeviceLoginCount,
            token_refreshes: tokenRefreshCount,
            account_linkings: accountLinkingCount,
            account_unlinkings: accountUnlinkingCount,
          },
          security_health: {
            overall_score: this.calculateSecurityScore({
              suspicious_logins: suspiciousLoginCount,
              new_device_logins: newDeviceLoginCount,
              token_refreshes: tokenRefreshCount,
            }),
            recommendations: this.getSecurityRecommendations({
              suspicious_logins: suspiciousLoginCount,
              new_device_logins: newDeviceLoginCount,
            }),
          },
          timeframe,
          period: {
            start: startDate,
            end: now,
          },
        },
      });
    } catch (error) {
      logger.error("OAuth security metrics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve OAuth security metrics",
        error: error.message,
      });
    }
  }

  /**
   * Calculate security score based on metrics
   * @private
   */
  calculateSecurityScore(metrics) {
    let score = 100;

    // Deduct points for suspicious activity
    if (metrics.suspicious_logins > 10) score -= 20;
    else if (metrics.suspicious_logins > 5) score -= 10;

    if (metrics.new_device_logins > 100) score -= 15;
    else if (metrics.new_device_logins > 50) score -= 8;

    return Math.max(score, 0);
  }

  /**
   * Get security recommendations
   * @private
   */
  getSecurityRecommendations(metrics) {
    const recommendations = [];

    if (metrics.suspicious_logins > 10) {
      recommendations.push(
        "High number of suspicious logins detected. Consider implementing additional verification steps.",
      );
    }

    if (metrics.new_device_logins > 100) {
      recommendations.push(
        "Many new device logins detected. Consider implementing device registration.",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("OAuth security metrics are within normal ranges.");
    }

    return recommendations;
  }
}

export default new OAuthAnalyticsController();
