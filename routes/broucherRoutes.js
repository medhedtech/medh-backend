import express from "express";

import * as broucherController from "../controllers/brouchers-controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { upload } from "../controllers/upload/uploadController.js";

const router = express.Router();

// Create new brochure
router.post("/create", authenticateToken, broucherController.createBrouchers);

// Get all brochures
router.get("/", broucherController.getAllBrouchers);

// Get specific brochure
router.get("/:id", broucherController.getBroucherById);

// Update brochure
router.put("/update/:id", authenticateToken, broucherController.updateBroucher);

// Delete brochure
router.delete(
  "/delete/:id",
  authenticateToken,
  broucherController.deleteBroucher,
);

// Upload brochure with real filename
router.post(
  "/upload",
  authenticateToken,
  upload.single("brochure"),
  broucherController.uploadBrochure,
);

// Upload brochure via base64 with real filename
router.post(
  "/upload/base64",
  authenticateToken,
  broucherController.uploadBrochureBase64,
);

// Download brochure for a specific course - support both POST and GET for flexibility
router.post("/download/:courseId", broucherController.downloadBrochure);
router.get("/download/:courseId", broucherController.downloadBrochure);

export default router;
