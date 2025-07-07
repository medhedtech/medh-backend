import express from "express";
import { getDashboardStats } from "../controllers/adminDashboardStatsController.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

// GET /api/v1/admin/dashboard-stats
router.get(
  "/dashboard-stats",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  getDashboardStats,
);

export default router;
