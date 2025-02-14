const express = require("express");
const certificateController = require("../controllers/certificate-controller");

const router = express.Router();

// Route to create a certificate
router.post("/create", certificateController.createCertificate);
router.get("/get", certificateController.getAllCertificates);
router.get(
  "/get/:student_id",
  certificateController.getCertificatesByStudentId
);

module.exports = router;
