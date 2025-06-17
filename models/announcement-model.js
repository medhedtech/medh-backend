import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
      maxlength: [2000, "Content cannot exceed 2000 characters"],
    },
    type: {
      type: String,
      required: [true, "Type is required"],
      enum: {
        values: ["course", "system", "maintenance", "feature", "event", "general"],
        message: "Type must be one of: course, system, maintenance, feature, event, general",
      },
      default: "general",
    },
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high", "urgent"],
        message: "Priority must be one of: low, medium, high, urgent",
      },
      default: "medium",
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "published", "archived", "scheduled"],
        message: "Status must be one of: draft, published, archived, scheduled",
      },
      default: "draft",
    },
    targetAudience: {
      type: [String],
      enum: {
        values: ["all", "students", "instructors", "admins", "corporate"],
        message: "Target audience must be one of: all, students, instructors, admins, corporate",
      },
      default: ["all"],
    },
    specificStudents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      validate: {
        validator: async function(studentId) {
          if (!studentId) return true;
          const User = mongoose.model("User");
          const user = await User.findById(studentId);
          return user && (user.role.includes("student") || user.role === "student");
        },
        message: "Specific student must be a valid student user",
      },
    }],
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    }],
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: function() {
        return this.type === "course";
      },
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },
    publishDate: {
      type: Date,
      default: Date.now,
    },
    scheduledPublishDate: {
      type: Date,
      validate: {
        validator: function(date) {
          if (this.status === "scheduled" && !date) {
            return false;
          }
          if (date && date <= new Date()) {
            return false;
          }
          return true;
        },
        message: "Scheduled publish date must be in the future",
      },
    },
    expiryDate: {
      type: Date,
      validate: {
        validator: function(date) {
          if (date && date <= new Date()) {
            return false;
          }
          return true;
        },
        message: "Expiry date must be in the future",
      },
    },
    isSticky: {
      type: Boolean,
      default: false, // Sticky announcements appear at the top
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],
    attachments: [{
      filename: String,
      url: String,
      size: Number,
      mimetype: String,
    }],
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    metadata: {
      featured: {
        type: Boolean,
        default: false,
      },
      allowComments: {
        type: Boolean,
        default: false,
      },
      sendNotification: {
        type: Boolean,
        default: true,
      },
      notificationSent: {
        type: Boolean,
        default: false,
      },
      notificationSentAt: Date,
    },
    relatedCourses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    }],
    actionButton: {
      text: {
        type: String,
        maxlength: [50, "Action button text cannot exceed 50 characters"],
      },
      url: {
        type: String,
        validate: {
          validator: function(url) {
            if (!url) return true;
            // Allow internal paths (starting with /) when type is internal
            if (this.actionButton?.type === "internal" && url.startsWith('/')) {
              return true;
            }
            // Otherwise require full HTTP/HTTPS URLs
            return /^https?:\/\/.+/.test(url);
          },
          message: "Action button URL must be a valid HTTP/HTTPS URL or internal path (for internal type)",
        },
      },
      type: {
        type: String,
        enum: ["link", "internal", "download"],
        default: "link",
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        // Convert dates to relative format for the frontend
        if (ret.createdAt) {
          const now = new Date();
          const diffTime = Math.abs(now - ret.createdAt);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            ret.date = "1 day ago";
          } else if (diffDays < 7) {
            ret.date = `${diffDays} days ago`;
          } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            ret.date = `${weeks} week${weeks > 1 ? 's' : ''} ago`;
          } else {
            const months = Math.floor(diffDays / 30);
            ret.date = `${months} month${months > 1 ? 's' : ''} ago`;
          }
        }
        
        // Add read status if user context is available
        ret.isRead = ret.readBy && ret.readBy.length > 0;
        ret.readCount = ret.readBy ? ret.readBy.length : 0;
        
        return ret;
      },
    },
  }
);

// Indexes for better query performance
AnnouncementSchema.index({ status: 1, publishDate: -1 });
AnnouncementSchema.index({ type: 1, status: 1 });
AnnouncementSchema.index({ targetAudience: 1, status: 1 });
AnnouncementSchema.index({ specificStudents: 1, status: 1 });
AnnouncementSchema.index({ priority: 1, status: 1 });
AnnouncementSchema.index({ isSticky: -1, publishDate: -1 });
AnnouncementSchema.index({ expiryDate: 1 });
AnnouncementSchema.index({ scheduledPublishDate: 1, status: 1 });
AnnouncementSchema.index({ author: 1 });
AnnouncementSchema.index({ courseId: 1 });
AnnouncementSchema.index({ tags: 1 });

// Virtual for checking if announcement is expired
AnnouncementSchema.virtual("isExpired").get(function() {
  return this.expiryDate && this.expiryDate <= new Date();
});

// Virtual for checking if announcement should be published
AnnouncementSchema.virtual("shouldPublish").get(function() {
  return (
    this.status === "scheduled" &&
    this.scheduledPublishDate &&
    this.scheduledPublishDate <= new Date()
  );
});

// Static method to get recent announcements
AnnouncementSchema.statics.getRecent = function(options = {}) {
  const {
    limit = 10,
    page = 1,
    type,
    targetAudience = "all",
    userId,
    includeExpired = false,
  } = options;

  const skip = (page - 1) * limit;
  
  // Build the base query for published announcements
  const query = {
    status: "published",
  };

  // Handle targeting logic
  const targetingConditions = [
    { targetAudience: "all" }, // Always include "all" announcements
  ];

  // Add general audience targeting
  if (targetAudience && targetAudience !== "all") {
    targetingConditions.push({ targetAudience: targetAudience });
  }

  // Add specific student targeting if userId is provided
  if (userId) {
    targetingConditions.push({ specificStudents: userId });
  }

  query.$or = targetingConditions;

  // Add type filter if specified
  if (type) {
    query.type = type;
  }

  // Handle expiry date filtering
  if (!includeExpired) {
    query.$and = [
      {
        $or: [
          { expiryDate: { $exists: false } },
          { expiryDate: { $gt: new Date() } },
        ],
      },
    ];
  }

  return this.find(query)
    .populate("author", "full_name email role")
    .populate("categories", "category_name")
    .populate("courseId", "course_title")
    .populate("specificStudents", "full_name email")
    .sort({ isSticky: -1, publishDate: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Method to mark announcement as read by a user
AnnouncementSchema.methods.markAsRead = function(userId) {
  if (!this.readBy.some(read => read.user.toString() === userId.toString())) {
    this.readBy.push({ user: userId, readAt: new Date() });
    this.viewCount += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method for dashboard analytics
AnnouncementSchema.statics.getAnalytics = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return Promise.all([
    // Total announcements by type
    this.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Total announcements by status
    this.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    // Most viewed announcements
    this.find({ status: "published" })
      .sort({ viewCount: -1 })
      .limit(5)
      .select("title viewCount readBy")
      .populate("author", "full_name"),
    // Recent activity
    this.find({ createdAt: { $gte: startDate } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title type status createdAt")
      .populate("author", "full_name"),
  ]);
};

// Pre-save middleware to handle scheduled publishing
AnnouncementSchema.pre("save", function(next) {
  if (this.shouldPublish && this.status === "scheduled") {
    this.status = "published";
    this.publishDate = new Date();
  }
  next();
});

const Announcement = mongoose.model("Announcement", AnnouncementSchema);

export default Announcement; 