import express from "express";
import multer from "multer";
import certificateController from "../controllers/certificateController.js";
import { authenticateToken } from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, HTML, and image files
    if (file.mimetype === "application/pdf" || 
        file.mimetype === "text/html" || 
        file.mimetype === "image/png" || 
        file.mimetype === "image/jpeg" || 
        file.mimetype === "image/jpg") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, HTML, PNG, and JPEG files are allowed"), false);
    }
  },
});

// Template Management Routes
router.post(
  "/templates",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  upload.single("template"),
  certificateController.uploadTemplate
);

router.get(
  "/templates",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  certificateController.getAllTemplates
);

router.get(
  "/templates/:id",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  certificateController.getTemplateById
);

router.delete(
  "/templates/:id",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  certificateController.deleteTemplate
);

// Certificate Generation Routes
router.post(
  "/generate",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  certificateController.generateCertificate
);

// Demo Enrollment Route (for the frontend button)
router.post(
  "/demo-enrollment",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  certificateController.generateCertificate
);

router.get(
  "/",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  certificateController.getAllCertificates
);

router.get(
  "/:id",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  certificateController.getCertificateById
);

router.get(
  "/:id/download",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  certificateController.downloadCertificate
);

// Statistics Route
router.get(
  "/stats/overview",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  certificateController.getCertificateStats
);

// Setup Route
router.post(
  "/setup",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  certificateController.setupCertificateStructure
);

export default router;
