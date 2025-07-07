import express from "express";
import { 
  getDashboardStats,
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getCourses,
  getBatches,
  getEnrollments,
  getPayments,
  getAnnouncements,
  getBlogs,
  getSupportTickets,
  getAssessments,
  getSystemStats,
  getCorporateTraining
} from "../controllers/adminDashboardStatsController.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

// Dashboard Stats
router.get(
  "/dashboard-stats",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  getDashboardStats,
);

// User Management Routes
router.get(
  "/users",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  getUsers,
);

router.get(
  "/users/:id",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  getUserById,
);

router.put(
  "/users/:id/status",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  updateUserStatus,
);

router.delete(
  "/users/:id",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  deleteUser,
);

// Course Management Routes
router.get(
  "/courses",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  getCourses,
);

// Batch Management Routes
router.get(
  "/batches",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  getBatches,
);

// Enrollment Management Routes
router.get(
  "/enrollments",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  getEnrollments,
);

// Payment Management Routes
router.get(
  "/payments",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  getPayments,
);

// Content Management Routes
router.get(
  "/announcements",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  getAnnouncements,
);

router.get(
  "/blogs",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  getBlogs,
);

// Support Management Routes
router.get(
  "/support",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  getSupportTickets,
);

// Assessment Management Routes
router.get(
  "/assessments",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  getAssessments,
);

// System Administration Routes
router.get(
  "/system",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  getSystemStats,
);

// Corporate Training Management Routes
router.get(
  "/corporate-training",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  getCorporateTraining,
);

export default router;
