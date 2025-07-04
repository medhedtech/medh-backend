import Announcement from "../models/announcement-model.js";
import User from "../models/user-modal.js";
import { Course } from "../models/course-model.js";
import Category from "../models/category-model.js";
import { validationResult } from "express-validator";

// Simple response formatter function based on existing patterns in the codebase
const formatResponse = (success, message, data = null, status = 200) => ({
  success,
  message,
  data,
  status,
});

/**
 * @desc    Get recent announcements (Public endpoint)
 * @route   GET /api/v1/announcements/recent
 * @access  Public
 */
export const getRecentAnnouncements = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      type,
      priority,
      targetAudience = "all",
      includeExpired = false,
    } = req.query;

    const options = {
      limit: parseInt(limit),
      page: parseInt(page),
      type,
      targetAudience,
      includeExpired: includeExpired === "true",
    };

    // If user is authenticated, get their user ID for read status
    if (req.user) {
      options.userId = req.user.id;
    }

    const announcements = await Announcement.getRecent(options);

    // Get total count for pagination
    const totalQuery = {
      status: "published",
    };

    // Handle targeting logic for count query
    const targetingConditions = [
      { targetAudience: "all" }, // Always include "all" announcements
    ];

    if (targetAudience && targetAudience !== "all") {
      targetingConditions.push({ targetAudience: targetAudience });
    }

    if (req.user) {
      targetingConditions.push({ specificStudents: req.user.id });
    }

    totalQuery.$or = targetingConditions;

    if (type) totalQuery.type = type;
    if (!includeExpired) {
      totalQuery.$and = [
        {
          $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: { $gt: new Date() } },
          ],
        },
      ];
    }

    const total = await Announcement.countDocuments(totalQuery);
    const totalPages = Math.ceil(total / options.limit);

    res.status(200).json(
      formatResponse(
        true,
        "Recent announcements retrieved successfully",
        {
          announcements,
          pagination: {
            currentPage: options.page,
            totalPages,
            totalCount: total,
            hasNextPage: options.page < totalPages,
            hasPrevPage: options.page > 1,
          },
        },
        200
      )
    );
  } catch (error) {
    console.error("Error fetching recent announcements:", error);
    res.status(500).json(
      formatResponse(
        false,
        "Error fetching recent announcements",
        { error: error.message },
        500
      )
    );
  }
};

/**
 * @desc    Get all announcements with admin features
 * @route   GET /api/v1/announcements
 * @access  Private (Admin/Super-Admin)
 */
export const getAllAnnouncements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      priority,
      targetAudience,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    // Build query filters
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (targetAudience) query.targetAudience = targetAudience;

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const announcements = await Announcement.find(query)
      .populate("author", "full_name email role")
      .populate("categories", "category_name")
      .populate("courseId", "course_title")
      .populate("specificStudents", "full_name email")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Announcement.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json(
      formatResponse(
        true,
        "Announcements retrieved successfully",
        {
          announcements,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount: total,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
          filters: {
            status,
            type,
            priority,
            targetAudience,
            search,
            sortBy,
            sortOrder,
          },
        },
        200
      )
    );
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json(
      formatResponse(
        false,
        "Error fetching announcements",
        { error: error.message },
        500
      )
    );
  }
};

/**
 * @desc    Get single announcement by ID
 * @route   GET /api/v1/announcements/:id
 * @access  Public
 */
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id)
      .populate("author", "full_name email role")
      .populate("categories", "category_name")
      .populate("courseId", "course_title")
      .populate("specificStudents", "full_name email")
      .populate("relatedCourses", "course_title");

    if (!announcement) {
      return res.status(404).json(
        formatResponse(false, "Announcement not found", null, 404)
      );
    }

    // Check if announcement is accessible
    if (announcement.status !== "published" && !req.user?.role?.includes("admin")) {
      return res.status(403).json(
        formatResponse(false, "Access denied", null, 403)
      );
    }

    // Mark as read if user is authenticated
    if (req.user) {
      await announcement.markAsRead(req.user.id);
    }

    res.status(200).json(
      formatResponse(
        true,
        "Announcement retrieved successfully",
        announcement,
        200
      )
    );
  } catch (error) {
    console.error("Error fetching announcement:", error);
    res.status(500).json(
      formatResponse(
        false,
        "Error fetching announcement",
        { error: error.message },
        500
      )
    );
  }
};

/**
 * @desc    Create new announcement
 * @route   POST /api/v1/announcements
 * @access  Private (Admin/Super-Admin)
 */
export const createAnnouncement = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      }));

      return res.status(400).json(
        formatResponse(
          false,
          "Validation failed",
          { errors: formattedErrors },
          400
        )
      );
    }

    const {
      title,
      content,
      type = "general",
      priority = "medium",
      status = "published",
      targetAudience = ["all"],
      specificStudents = [],
      courseId,
      categories,
      isSticky = false,
      tags = [],
      expiryDate,
      publishDate,
      actionButton,
      metadata = {},
    } = req.body;

    const announcementData = {
      title,
      content,
      type,
      priority,
      status,
      targetAudience,
      author: req.user.id,
      isSticky,
      tags,
      actionButton,
      metadata,
    };

    // Add optional fields if provided
    if (courseId) announcementData.courseId = courseId;
    if (categories && categories.length) announcementData.categories = categories;
    if (specificStudents && specificStudents.length) announcementData.specificStudents = specificStudents;
    if (expiryDate) announcementData.expiryDate = new Date(expiryDate);
    if (publishDate) announcementData.publishDate = new Date(publishDate);

    const announcement = new Announcement(announcementData);
    await announcement.save();

    // Populate the announcement for response
    await announcement.populate([
      { path: "author", select: "full_name email role" },
      { path: "categories", select: "category_name" },
      { path: "courseId", select: "course_title" },
      { path: "specificStudents", select: "full_name email" },
    ]);

    res.status(201).json(
      formatResponse(
        true,
        "Announcement created successfully",
        announcement,
        201
      )
    );
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json(
      formatResponse(
        false,
        "Error creating announcement",
        { error: error.message },
        500
      )
    );
  }
};

/**
 * @desc    Update announcement
 * @route   PUT /api/v1/announcements/:id
 * @access  Private (Admin/Super-Admin)
 */
export const updateAnnouncement = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      }));

      return res.status(400).json(
        formatResponse(
          false,
          "Validation failed",
          { errors: formattedErrors },
          400
        )
      );
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove sensitive fields that shouldn't be updated directly
    delete updateData.author;
    delete updateData.createdAt;
    delete updateData.viewCount;
    delete updateData.readBy;

    // Convert date strings to Date objects
    if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate);
    if (updateData.publishDate) updateData.publishDate = new Date(updateData.publishDate);

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: "author", select: "full_name email role" },
      { path: "categories", select: "category_name" },
      { path: "courseId", select: "course_title" },
      { path: "specificStudents", select: "full_name email" },
    ]);

    if (!announcement) {
      return res.status(404).json(
        formatResponse(false, "Announcement not found", null, 404)
      );
    }

    res.status(200).json(
      formatResponse(
        true,
        "Announcement updated successfully",
        announcement,
        200
      )
    );
  } catch (error) {
    console.error("Error updating announcement:", error);
    res.status(500).json(
      formatResponse(
        false,
        "Error updating announcement",
        { error: error.message },
        500
      )
    );
  }
};

/**
 * @desc    Delete announcement
 * @route   DELETE /api/v1/announcements/:id
 * @access  Private (Admin/Super-Admin)
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json(
        formatResponse(false, "Announcement not found", null, 404)
      );
    }

    res.status(200).json(
      formatResponse(
        true,
        "Announcement deleted successfully",
        null,
        200
      )
    );
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json(
      formatResponse(
        false,
        "Error deleting announcement",
        { error: error.message },
        500
      )
    );
  }
};

/**
 * @desc    Mark announcement as read
 * @route   POST /api/v1/announcements/:id/read
 * @access  Private (Authenticated User)
 */
export const markAnnouncementAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json(
        formatResponse(false, "Announcement not found", null, 404)
      );
    }

    await announcement.markAsRead(userId);

    res.status(200).json(
      formatResponse(
        true,
        "Announcement marked as read",
        null,
        200
      )
    );
  } catch (error) {
    console.error("Error marking announcement as read:", error);
    res.status(500).json(
      formatResponse(
        false,
        "Error marking announcement as read",
        { error: error.message },
        500
      )
    );
  }
};

/**
 * @desc    Get announcement analytics
 * @route   GET /api/v1/announcements/analytics
 * @access  Private (Admin/Super-Admin)
 */
export const getAnnouncementAnalytics = async (req, res) => {
  try {
    const analytics = await Announcement.getAnalytics();

    res.status(200).json(
      formatResponse(
        true,
        "Announcement analytics retrieved successfully",
        analytics,
        200
      )
    );
  } catch (error) {
    console.error("Error fetching announcement analytics:", error);
    res.status(500).json(
      formatResponse(
        false,
        "Error fetching announcement analytics",
        { error: error.message },
        500
      )
    );
  }
};

/**
 * @desc    Get announcement types with counts
 * @route   GET /api/v1/announcements/types
 * @access  Public
 */
export const getAnnouncementTypes = async (req, res) => {
  try {
    const types = await Announcement.aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          type: "$_id",
          count: 1,
          label: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", "course"] }, then: "Course" },
                { case: { $eq: ["$_id", "system"] }, then: "System" },
                { case: { $eq: ["$_id", "maintenance"] }, then: "Maintenance" },
                { case: { $eq: ["$_id", "feature"] }, then: "Feature" },
                { case: { $eq: ["$_id", "event"] }, then: "Event" },
              ],
              default: "General",
            },
          },
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json(
      formatResponse(
        true,
        "Announcement types retrieved successfully",
        types,
        200
      )
    );
  } catch (error) {
    console.error("Error fetching announcement types:", error);
    res.status(500).json(
      formatResponse(
        false,
        "Error fetching announcement types",
        { error: error.message },
        500
      )
    );
  }
};

/**
 * @desc    Bulk update announcement status
 * @route   PUT /api/v1/announcements/bulk-status
 * @access  Private (Admin/Super-Admin)
 */
export const bulkUpdateAnnouncementStatus = async (req, res) => {
  try {
    const { announcementIds, status } = req.body;

    if (!announcementIds || !Array.isArray(announcementIds) || announcementIds.length === 0) {
      return res.status(400).json(
        formatResponse(
          false,
          "Announcement IDs array is required",
          null,
          400
        )
      );
    }

    if (!["draft", "published", "archived", "scheduled"].includes(status)) {
      return res.status(400).json(
        formatResponse(
          false,
          "Invalid status value",
          null,
          400
        )
      );
    }

    const result = await Announcement.updateMany(
      { _id: { $in: announcementIds } },
      { status },
      { runValidators: true }
    );

    res.status(200).json(
      formatResponse(
        true,
        `${result.modifiedCount} announcements updated successfully`,
        {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          status,
        },
        200
      )
    );
  } catch (error) {
    console.error("Error bulk updating announcements:", error);
    res.status(500).json(
      formatResponse(
        false,
        "Error bulk updating announcements",
        { error: error.message },
        500
      )
    );
  }
};

/**
 * @desc    Process scheduled announcements
 * @route   POST /api/v1/announcements/process-scheduled
 * @access  Private (Admin/Super-Admin)
 */
export const processScheduledAnnouncements = async (req, res) => {
  try {
    const result = await Announcement.processScheduledAnnouncements();

    res.status(200).json(
      formatResponse(
        true,
        "Scheduled announcements processed successfully",
        result,
        200
      )
    );
  } catch (error) {
    console.error("Error processing scheduled announcements:", error);
    res.status(500).json(
      formatResponse(
        false,
        "Error processing scheduled announcements",
        { error: error.message },
        500
      )
    );
  }
};

/**
 * @desc    Get unread announcement count for user
 * @route   GET /api/v1/announcements/unread-count
 * @access  Private (Authenticated User)
 */
export const getUnreadAnnouncementCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build query for announcements visible to this user
    const query = {
      status: "published",
    };

    // Handle targeting logic
    const targetingConditions = [
      { targetAudience: "all" }, // Always include "all" announcements
      { targetAudience: { $in: [userRole] } }, // Include role-based announcements
      { specificStudents: userId }, // Include announcements specifically for this user
    ];

    query.$or = targetingConditions;

    // Only include non-expired announcements and exclude already read
    query.$and = [
      {
        $or: [
          { expiryDate: { $exists: false } },
          { expiryDate: { $gt: new Date() } },
        ],
      },
      // Exclude announcements already read by this user
      {
        "readBy.user": { $ne: userId },
      },
    ];

    const unreadCount = await Announcement.countDocuments(query);

    res.status(200).json(
      formatResponse(
        true,
        "Unread announcement count retrieved successfully",
        { unreadCount },
        200
      )
    );
  } catch (error) {
    console.error("Error fetching unread announcement count:", error);
    res.status(500).json(
      formatResponse(
        false,
        "Error fetching unread announcement count",
        { error: error.message },
        500
      )
    );
  }
};

/**
 * @desc    Get available students for targeting
 * @route   GET /api/v1/announcements/students
 * @access  Private (Admin/Super-Admin)
 */
export const getAvailableStudents = async (req, res) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    
    const query = {
      $or: [
        { role: "student" },
        { role: { $in: ["student"] } },
      ],
      isEmailVerified: true, // Only include verified students
    };

    // Add search functionality
    if (search) {
      query.$and = [
        query.$or ? { $or: query.$or } : {},
        {
          $or: [
            { full_name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        },
      ];
      delete query.$or;
    }

    const skip = (page - 1) * limit;
    
    const students = await User.find(query)
      .select("_id full_name email createdAt")
      .sort({ full_name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json(
      formatResponse(
        true,
        "Available students retrieved successfully",
        {
          students,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount: total,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
        200
      )
    );
  } catch (error) {
    console.error("Error fetching available students:", error);
    res.status(500).json(
      formatResponse(
        false,
        "Error fetching available students",
        { error: error.message },
        500
      )
    );
  }
}; 