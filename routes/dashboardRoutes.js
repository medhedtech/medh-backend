import express from "express";

import { getDashboardCounts } from "../controllers/dashboardCount.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Protected route with authentication - superAdmin role will automatically have access
// as the user model's hasPermission method grants all permissions to superAdmin
router.get("/counts", authenticateToken, getDashboardCounts);

export default router;
