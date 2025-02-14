const express = require("express");
const { getDashboardCounts } = require("../controllers/dashboardCount");
const router = express.Router();

router.get("/admin-dashboard-count", getDashboardCounts);

module.exports = router;
