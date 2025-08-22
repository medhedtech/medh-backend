import express from "express";

import * as certificateController from "../controllers/certificate-controller.js";
import { createDemoCertificate, downloadDemoCertificate } from "../controllers/demoCertificateController.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

// Existing routes
// Route to create a certificate
router.post("/create", certificateController.createCertificate);
router.get("/get", certificateController.getAllCertificates);
router.get(
  "/get/:student_id",
  certificateController.getCertificatesByStudentId,
);

// New routes for certificate ID generation and demo enrollment
// Generate certificate ID for completed enrollment
router.post(
  "/generate-id",
  authenticateToken,
  authorize(["admin", "instructor", "super-admin"]),
  certificateController.generateCertificateIdAPI
);

// Generate professional certificate PDF
router.post(
  "/generate-pdf",
  authenticateToken,
  authorize(["admin", "instructor", "super-admin"]),
  certificateController.generateCertificatePDF
);

// Create demo student enrollment
router.post(
  "/demo-enrollment",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  certificateController.createDemoEnrollmentAPI
);

// Create demo certificate
router.post(
  "/demo",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  createDemoCertificate
);

// Download demo certificate PDF
router.get(
  "/demo/download/:certificateId",
  authenticateToken,
  authorize(["admin", "super-admin"]),
  downloadDemoCertificate
);

// Certificate Verification Routes
// Verify single certificate by certificate number
router.get(
  "/verify/:certificateNumber",
  certificateController.verifyCertificate
);

// Bulk certificate verification
router.post(
  "/verify-bulk",
  authenticateToken,
  authorize(["admin", "instructor", "super-admin"]),
  certificateController.verifyBulkCertificates
);

// QR Code Generation Routes
// Generate QR code for certificate (GET method)
router.get(
  "/:certificateId/qr-code",
  authenticateToken,
  authorize(["admin", "instructor", "super-admin", "student"]),
  certificateController.generateCertificateQRCodeAPI
);

// Generate QR code for certificate (POST method with more options)
router.post(
  "/generate-qr-code",
  authenticateToken,
  authorize(["admin", "instructor", "super-admin"]),
  certificateController.generateCertificateQRCodeAPI
);

// Download QR code as image file
router.get(
  "/:certificateId/qr-code/download",
  authenticateToken,
  authorize(["admin", "instructor", "super-admin", "student"]),
  certificateController.downloadCertificateQRCode
);

export default router;
