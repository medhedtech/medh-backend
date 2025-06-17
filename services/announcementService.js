import Announcement from "../models/announcement-model.js";
import User from "../models/user-modal.js";
import { Course } from "../models/course-model.js";
import Category from "../models/category-model.js";

/**
 * Service class for managing announcements
 */
class AnnouncementService {
  /**
   * Create sample announcements for demo purposes
   * @param {string} adminUserId - Admin user ID to be used as author
   * @returns {Promise<Array>} Array of created announcements
   */
  static async createSampleAnnouncements(adminUserId) {
    try {
      // Get first course and category for sample data
      const firstCourse = await Course.findOne().select("_id");
      const firstCategory = await Category.findOne().select("_id");

      const sampleAnnouncements = [
        {
          title: "New AI Course Starting Soon",
          content: "We're excited to announce our new AI fundamentals course starting next week. This comprehensive course will cover machine learning basics, neural networks, and practical applications. Early bird registration is now open with a 20% discount.",
          type: "course",
          priority: "high",
          status: "published",
          targetAudience: ["all", "students"],
          courseId: firstCourse?._id,
          author: adminUserId,
          isSticky: true,
          tags: ["course", "ai", "machine-learning", "new"],
          metadata: {
            featured: true,
            sendNotification: true,
            allowComments: false,
          },
          actionButton: {
            text: "Enroll Now",
            url: "/courses/ai-fundamentals",
            type: "internal",
          },
        },
        {
          title: "System Maintenance Scheduled",
          content: "We will be performing system maintenance on Sunday, December 24th from 2:00 AM to 6:00 AM EST. During this time, the platform may be temporarily unavailable. We apologize for any inconvenience.",
          type: "system",
          priority: "medium",
          status: "published",
          targetAudience: ["all"],
          author: adminUserId,
          scheduledPublishDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          tags: ["maintenance", "system", "downtime"],
          metadata: {
            sendNotification: true,
            allowComments: false,
          },
        },
        {
          title: "New Interactive Learning Features",
          content: "We've just launched new interactive learning features including live coding environments, instant feedback systems, and collaborative project spaces. These tools are designed to enhance your learning experience.",
          type: "feature",
          priority: "medium",
          status: "published",
          targetAudience: ["students", "instructors"],
          author: adminUserId,
          categories: firstCategory ? [firstCategory._id] : [],
          tags: ["features", "learning", "interactive", "update"],
          metadata: {
            featured: true,
            sendNotification: true,
            allowComments: true,
          },
          actionButton: {
            text: "Explore Features",
            url: "/features/interactive-learning",
            type: "internal",
          },
        },
        {
          title: "Upcoming Webinar: Career in Tech",
          content: "Join us for an exclusive webinar on 'Building a Successful Career in Technology' featuring industry experts from top tech companies. Learn about current trends, required skills, and networking strategies.",
          type: "event",
          priority: "high",
          status: "published",
          targetAudience: ["students"],
          author: adminUserId,
          tags: ["webinar", "career", "tech", "networking"],
          metadata: {
            featured: true,
            sendNotification: true,
            allowComments: true,
          },
          actionButton: {
            text: "Register Now",
            url: "https://example.com/webinar-registration",
            type: "link",
          },
        },
        {
          title: "Course Completion Certificates Now Available",
          content: "Great news! We've enhanced our certification system. All students who complete courses can now download professional certificates directly from their dashboard. Certificates include verification codes and LinkedIn integration.",
          type: "general",
          priority: "low",
          status: "published",
          targetAudience: ["students"],
          author: adminUserId,
          tags: ["certificates", "completion", "verification"],
          metadata: {
            sendNotification: true,
            allowComments: false,
          },
          actionButton: {
            text: "View My Certificates",
            url: "/dashboard/certificates",
            type: "internal",
          },
        },
      ];

      const createdAnnouncements = [];
      for (const announcementData of sampleAnnouncements) {
        const announcement = new Announcement(announcementData);
        const savedAnnouncement = await announcement.save();
        createdAnnouncements.push(savedAnnouncement);
      }

      return createdAnnouncements;
    } catch (error) {
      console.error("Error creating sample announcements:", error);
      throw error;
    }
  }

  /**
   * Get user-specific announcements based on their role and preferences
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of announcements
   */
  static async getUserAnnouncements(userId, options = {}) {
    try {
      const user = await User.findById(userId).select("role");
      if (!user) {
        throw new Error("User not found");
      }

      const {
        limit = 10,
        page = 1,
        type,
        priority,
        includeRead = true,
      } = options;

      const userRole = user.role;
      const targetAudience = ["all", userRole];

      const query = {
        status: "published",
        targetAudience: { $in: targetAudience },
        $or: [
          { expiryDate: { $exists: false } },
          { expiryDate: { $gt: new Date() } },
        ],
      };

      if (type) query.type = type;
      if (priority) query.priority = priority;

      if (!includeRead) {
        query["readBy.user"] = { $ne: userId };
      }

      const skip = (page - 1) * limit;
      const announcements = await Announcement.find(query)
        .populate("author", "full_name email role")
        .populate("categories", "category_name")
        .populate("courseId", "course_title")
        .sort({ isSticky: -1, publishDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Add read status for each announcement
      const announcementsWithReadStatus = announcements.map(announcement => ({
        ...announcement,
        isRead: announcement.readBy?.some(read => read.user.toString() === userId.toString()) || false,
      }));

      return announcementsWithReadStatus;
    } catch (error) {
      console.error("Error getting user announcements:", error);
      throw error;
    }
  }

  /**
   * Mark multiple announcements as read for a user
   * @param {string} userId - User ID
   * @param {Array<string>} announcementIds - Array of announcement IDs
   * @returns {Promise<Object>} Result object
   */
  static async markMultipleAsRead(userId, announcementIds) {
    try {
      const results = await Promise.allSettled(
        announcementIds.map(async (announcementId) => {
          const announcement = await Announcement.findById(announcementId);
          if (announcement) {
            return announcement.markAsRead(userId);
          }
          return null;
        })
      );

      const successful = results.filter(result => result.status === "fulfilled" && result.value).length;
      const failed = results.filter(result => result.status === "rejected").length;

      return {
        successful,
        failed,
        total: announcementIds.length,
      };
    } catch (error) {
      console.error("Error marking multiple announcements as read:", error);
      throw error;
    }
  }

  /**
   * Get announcement statistics for admin dashboard
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Object>} Statistics object
   */
  static async getAdminStatistics(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        totalAnnouncements,
        publishedAnnouncements,
        draftAnnouncements,
        scheduledAnnouncements,
        archivedAnnouncements,
        recentAnnouncements,
        topViewedAnnouncements,
        announcementsByType,
        announcementsByPriority,
      ] = await Promise.all([
        Announcement.countDocuments(),
        Announcement.countDocuments({ status: "published" }),
        Announcement.countDocuments({ status: "draft" }),
        Announcement.countDocuments({ status: "scheduled" }),
        Announcement.countDocuments({ status: "archived" }),
        Announcement.countDocuments({ createdAt: { $gte: startDate } }),
        Announcement.find({ status: "published" })
          .sort({ viewCount: -1 })
          .limit(5)
          .select("title viewCount readBy createdAt")
          .populate("author", "full_name"),
        Announcement.aggregate([
          { $group: { _id: "$type", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Announcement.aggregate([
          { $group: { _id: "$priority", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);

      return {
        overview: {
          total: totalAnnouncements,
          published: publishedAnnouncements,
          draft: draftAnnouncements,
          scheduled: scheduledAnnouncements,
          archived: archivedAnnouncements,
          recent: recentAnnouncements,
        },
        topViewed: topViewedAnnouncements,
        byType: announcementsByType,
        byPriority: announcementsByPriority,
        period: `${days} days`,
      };
    } catch (error) {
      console.error("Error getting admin statistics:", error);
      throw error;
    }
  }

  /**
   * Process expired announcements (for cron jobs)
   * @returns {Promise<Object>} Processing result
   */
  static async processExpiredAnnouncements() {
    try {
      const expiredAnnouncements = await Announcement.find({
        status: "published",
        expiryDate: { $lte: new Date() },
      });

      const archivedCount = await Promise.all(
        expiredAnnouncements.map(async (announcement) => {
          announcement.status = "archived";
          return announcement.save();
        })
      );

      return {
        processed: archivedCount.length,
        message: `${archivedCount.length} expired announcements have been archived`,
      };
    } catch (error) {
      console.error("Error processing expired announcements:", error);
      throw error;
    }
  }

  /**
   * Search announcements with advanced filters
   * @param {Object} searchOptions - Search criteria
   * @returns {Promise<Object>} Search results with pagination
   */
  static async searchAnnouncements(searchOptions) {
    try {
      const {
        query: searchQuery,
        type,
        priority,
        status,
        targetAudience,
        tags,
        dateFrom,
        dateTo,
        author,
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = searchOptions;

      const mongoQuery = {};

      // Text search
      if (searchQuery) {
        mongoQuery.$or = [
          { title: { $regex: searchQuery, $options: "i" } },
          { content: { $regex: searchQuery, $options: "i" } },
        ];
      }

      // Filters
      if (type) mongoQuery.type = type;
      if (priority) mongoQuery.priority = priority;
      if (status) mongoQuery.status = status;
      if (targetAudience) mongoQuery.targetAudience = targetAudience;
      if (author) mongoQuery.author = author;

      // Tags filter
      if (tags && tags.length > 0) {
        mongoQuery.tags = { $in: tags };
      }

      // Date range filter
      if (dateFrom || dateTo) {
        mongoQuery.createdAt = {};
        if (dateFrom) mongoQuery.createdAt.$gte = new Date(dateFrom);
        if (dateTo) mongoQuery.createdAt.$lte = new Date(dateTo);
      }

      const skip = (page - 1) * limit;
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      const [announcements, total] = await Promise.all([
        Announcement.find(mongoQuery)
          .populate("author", "full_name email role")
          .populate("categories", "category_name")
          .populate("courseId", "course_title")
          .sort(sortOptions)
          .skip(skip)
          .limit(limit),
        Announcement.countDocuments(mongoQuery),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        announcements,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        searchCriteria: searchOptions,
      };
    } catch (error) {
      console.error("Error searching announcements:", error);
      throw error;
    }
  }
}

export default AnnouncementService; 