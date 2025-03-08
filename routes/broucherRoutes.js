const express = require("express");
const router = express.Router();
const broucherController = require("../controllers/brouchers-controller");

// Create new brochure
router.post("/create", broucherController.createBrouchers);

// Get all brochures
router.get("/", broucherController.getAllBrouchers);

// Get specific brochure
router.get("/:id", broucherController.getBroucherById);

// Update brochure
router.put("/update/:id", broucherController.updateBroucher);

// Delete brochure
router.delete("/delete/:id", broucherController.deleteBroucher);

// Download brochure for a specific course - support both POST and GET for flexibility
router.post("/download/:courseId", broucherController.downloadBrochure);
router.get("/download/:courseId", broucherController.downloadBrochure);

module.exports = router;
