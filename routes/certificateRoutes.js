import express from "express";

import * as certificateController from "../controllers/certificate-controller.js";

const router = express.Router();

// Route to create a certificate
router.post("/create", certificateController.createCertificate);
router.get("/get", certificateController.getAllCertificates);
router.get(
  "/get/:student_id",
  certificateController.getCertificatesByStudentId,
);

export default router;
