import express from "express";

import { getDashboardCounts } from "../controllers/dashboardCount.js";

const router = express.Router();

router.get("/counts", getDashboardCounts);

export default router;
