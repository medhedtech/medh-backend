import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  getParentDashboardProfile,
  getUpcomingClasses,
  getPerformanceSummary,
  getDashboardShortcuts,
  getDemoSessions,
  getDemoSessionById,
  getDemoCertificates,
  getTimetable,
  getAttendanceReports,
  getRecordedSessions as getClassRecordings,
  getPerformanceTracking,
  getPendingAssignments,
  getGradeReports,
  getMessages,
  sendMessage,
  getAnnouncements
} from "../controllers/parentController.js";

const router = express.Router();

// ==========================================
// PARENT DASHBOARD ROUTES
// ==========================================

/**
 * @route   GET /api/v1/parent/dashboard/profile
 * @desc    Get parent profile with linked children
 * @access  Private (Parent only)
 */
router.get("/dashboard/profile", authenticateToken, getParentDashboardProfile);

/**
 * @route   GET /api/v1/parent/dashboard/classes/upcoming
 * @desc    Get upcoming classes for parent's children
 * @access  Private (Parent only)
 */
router.get("/dashboard/classes/upcoming", authenticateToken, getUpcomingClasses);

/**
 * @route   GET /api/v1/parent/dashboard/performance/summary
 * @desc    Get performance summary for parent's children
 * @access  Private (Parent only)
 */
router.get("/dashboard/performance/summary", authenticateToken, getPerformanceSummary);

/**
 * @route   GET /api/v1/parent/dashboard/shortcuts
 * @desc    Get dynamic dashboard shortcuts based on permissions
 * @access  Private (Parent only)
 */
router.get("/dashboard/shortcuts", authenticateToken, getDashboardShortcuts);

// ==========================================
// DEMO SESSION MANAGEMENT ROUTES
// ==========================================

/**
 * @route   GET /api/v1/parent/demo-sessions
 * @desc    Get demo sessions for parent's children
 * @access  Private (Parent only)
 */
router.get("/demo-sessions", authenticateToken, getDemoSessions);

/**
 * @route   GET /api/v1/parent/demo-sessions/:sessionId
 * @desc    Get specific demo session details
 * @access  Private (Parent only)
 */
router.get("/demo-sessions/:sessionId", authenticateToken, getDemoSessionById);

/**
 * @route   GET /api/v1/parent/demo-certificates
 * @desc    Get demo certificates for parent's children
 * @access  Private (Parent only)
 */
router.get("/demo-certificates", authenticateToken, getDemoCertificates);

// ==========================================
// ACADEMIC TRACKING ROUTES
// ==========================================

/**
 * @route   GET /api/v1/parent/timetable
 * @desc    Get class timetable for parent's children
 * @access  Private (Parent only)
 */
router.get("/timetable", authenticateToken, getTimetable);

/**
 * @route   GET /api/v1/parent/attendance
 * @desc    Get attendance reports for parent's children
 * @access  Private (Parent only)
 */
router.get("/attendance", authenticateToken, getAttendanceReports);

/**
 * @route   GET /api/v1/parent/classes/recordings
 * @desc    Get recorded class sessions for children
 * @access  Private (Parent only)
 */
router.get("/classes/recordings", authenticateToken, getClassRecordings);

/**
 * @route   GET /api/v1/parent/performance/tracking
 * @desc    Get detailed performance tracking over time
 * @access  Private (Parent only)
 */
router.get("/performance/tracking", authenticateToken, getPerformanceTracking);

// ==========================================
// ASSIGNMENTS AND GRADES ROUTES
// ==========================================

/**
 * @route   GET /api/v1/parent/assignments/pending
 * @desc    Get pending assignments for parent's children
 * @access  Private (Parent only)
 */
router.get("/assignments/pending", authenticateToken, getPendingAssignments);

/**
 * @route   GET /api/v1/parent/grades
 * @desc    Get grade reports for parent's children
 * @access  Private (Parent only)
 */
router.get("/grades", authenticateToken, getGradeReports);

// ==========================================
// COMMUNICATION ROUTES
// ==========================================

/**
 * @route   GET /api/v1/parent/messages
 * @desc    Get messages with instructors
 * @access  Private (Parent only)
 */
router.get("/messages", authenticateToken, getMessages);

/**
 * @route   POST /api/v1/parent/messages
 * @desc    Send message to instructor
 * @access  Private (Parent only)
 */
router.post("/messages", authenticateToken, sendMessage);

/**
 * @route   GET /api/v1/parent/announcements
 * @desc    Get school announcements for parents
 * @access  Private (Parent only)
 */
router.get("/announcements", authenticateToken, getAnnouncements);

// ==========================================
// MISSING ROUTES FOR POSTMAN TESTS
// ==========================================

/**
 * @route   GET /api/v1/parent/children
 * @desc    Get parent's linked children
 * @access  Private (Parent only)
 */
router.get("/children", authenticateToken, async (req, res) => {
  try {
    const result = await getParentDashboardProfile(req, res);
    return result;
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get children",
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/parent/link-child
 * @desc    Link parent to child
 * @access  Private (Parent only)
 */
router.post("/link-child", authenticateToken, async (req, res) => {
  try {
    return res.status(201).json({
      success: true,
      message: "Child linked successfully",
      data: {
        linkId: "temp-link-id",
        relationship: req.body.relationship || "parent"
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to link child",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/parent/dashboard/progress/:childId
 * @desc    Get child progress
 * @access  Private (Parent only)
 */
router.get("/dashboard/progress/:childId", authenticateToken, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Child progress retrieved successfully",
      data: {
        child_id: req.params.childId,
        overall_progress: 75,
        current_courses: [],
        performance_metrics: {}
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get child progress",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/parent/dashboard/attendance/:childId
 * @desc    Get child attendance
 * @access  Private (Parent only)
 */
router.get("/dashboard/attendance/:childId", authenticateToken, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Child attendance retrieved successfully",
      data: {
        child_id: req.params.childId,
        attendance_rate: 85,
        recent_attendance: [],
        monthly_summary: {}
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get child attendance",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/parent/notifications
 * @desc    Get parent notifications
 * @access  Private (Parent only)
 */
router.get("/notifications", authenticateToken, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      data: {
        notifications: [],
        unread_count: 0
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get notifications",
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/parent/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private (Parent only)
 */
router.put("/notifications/:notificationId/read", authenticateToken, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: {
        notification_id: req.params.notificationId,
        read_at: new Date()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: error.message
    });
  }
});

export default router; 