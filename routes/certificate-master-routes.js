import express from "express";
const router = express.Router();

import {
  createCertificateMaster,
  getCertificateMasters,
  getCertificateMasterById,
  updateCertificateMaster,
  deleteCertificateMaster,
  getCertificateMasterDetails,
  getCertificatesByLevel,
  getCertificatesByType,
  getIndustryRecognizedCertificates,
  createDefaultCertificates,
} from "../controllers/certificate-master-controller.js";

import { authenticateToken } from "../middleware/auth.js";
import {
  validateCreateCertificateMaster,
  validateUpdateCertificateMaster,
  validateGetCertificateMasters,
  validateGetCertificateMasterById,
  validateDeleteCertificateMaster,
  validateGetCertificateMasterDetails,
  validateGetCertificatesByLevel,
  validateGetCertificatesByType,
} from "../validations/certificateMasterValidation.js";

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Certificate Master CRUD routes
router.post(
  "/create",
  validateCreateCertificateMaster,
  createCertificateMaster,
);
router.get("/", validateGetCertificateMasters, getCertificateMasters);
router.get("/:id", validateGetCertificateMasterById, getCertificateMasterById);
router.get(
  "/:id/details",
  validateGetCertificateMasterDetails,
  getCertificateMasterDetails,
);
router.put("/:id", validateUpdateCertificateMaster, updateCertificateMaster);
router.delete("/:id", validateDeleteCertificateMaster, deleteCertificateMaster);

// Specialized routes
router.get(
  "/level/:level",
  validateGetCertificatesByLevel,
  getCertificatesByLevel,
);
router.get("/type/:type", validateGetCertificatesByType, getCertificatesByType);
router.get("/industry-recognized", getIndustryRecognizedCertificates);

// Utility routes
router.post("/create-defaults", createDefaultCertificates);

export default router;
