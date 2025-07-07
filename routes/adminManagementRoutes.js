import express from "express";
import { 
  bulkUserOperations,
  createUser,
  updateUser,
  createCourse,
  updateCourse,
  deleteCourse,
  bulkCourseOperations,
  createBatch,
  updateBatch,
  deleteBatch,
  bulkBatchOperations,
  updateEnrollmentStatus,
  bulkEnrollmentOperations,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  bulkAnnouncementOperations,
  createBlog,
  updateBlog,
  deleteBlog,
  bulkBlogOperations,
  getAdminOverview
} from "../controllers/adminManagementController.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

// Admin Overview
router.get(
  "/overview",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  getAdminOverview,
);

// User Management Operations
router.post(
  "/users",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  createUser,
);

router.put(
  "/users/:id",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  updateUser,
);

router.post(
  "/users/bulk",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  bulkUserOperations,
);

// Course Management Operations
router.post(
  "/courses",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  createCourse,
);

router.put(
  "/courses/:id",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  updateCourse,
);

router.delete(
  "/courses/:id",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  deleteCourse,
);

router.post(
  "/courses/bulk",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  bulkCourseOperations,
);

// Batch Management Operations
router.post(
  "/batches",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  createBatch,
);

router.put(
  "/batches/:id",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  updateBatch,
);

// Enrollment Management Operations
router.put(
  "/enrollments/:id/status",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  updateEnrollmentStatus,
);

// Content Management Operations
router.post(
  "/announcements",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  createAnnouncement,
);

router.put(
  "/announcements/:id",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  updateAnnouncement,
);

// Delete batch operation
router.delete(
  "/batches/:id",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  deleteBatch,
);

// Bulk batch operations
router.post(
  "/batches/bulk",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  bulkBatchOperations,
);

// Bulk enrollment operations
router.post(
  "/enrollments/bulk",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  bulkEnrollmentOperations,
);

// Delete announcement operation
router.delete(
  "/announcements/:id",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  deleteAnnouncement,
);

// Bulk announcement operations
router.post(
  "/announcements/bulk",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  bulkAnnouncementOperations,
);

// Blog Management Operations
router.post(
  "/blogs",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  createBlog,
);

router.put(
  "/blogs/:id",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  updateBlog,
);

router.delete(
  "/blogs/:id",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  deleteBlog,
);

router.post(
  "/blogs/bulk",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  bulkBlogOperations,
);

export default router;