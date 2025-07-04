import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import fetch from "node-fetch";
import crypto from "crypto";
import Certificate from "../models/certificate-model.js";
import { uploadFile } from "../utils/uploadFile.js";
import { storeHash, verifyHash } from "../services/blockchainService.js";
import mongoose from "mongoose";

// -----------------------------------------------------------------------------
// Helper – build the demo certificate PDF using the template and dynamic values
// -----------------------------------------------------------------------------
async function buildCertificatePDF({
  fullName,
  courseName,
  dateString,
  instructorName,
  enrollmentId,
  certificateId,
}) {
  // Load template PDF
  const templatePath = path.resolve(
    path.dirname(""),
    "templates/Demo Certificate .pdf",
  );
  const templateBytes = fs.readFileSync(templatePath);

  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSizeLarge = 24;
  const fontSizeMedium = 18;
  const fontSizeSmall = 12;

  /* ---------------------------------------------------------------------
     COVER TEMPLATE PLACEHOLDER TEXT
     The provided template already contains placeholder labels like
     "THIS IS TO CERTIFY THAT", "{COURSE NAME}", etc.  The easiest way
     to hide them without editing the original PDF is to draw white
     rectangles over the regions where those placeholders are printed,
     then render our dynamic values on top.  Coordinates are tuned
     empirically and may be adjusted further after visual inspection.
  --------------------------------------------------------------------- */

  const cover = (
    x,
    y,
    w,
    h,
  ) => {
    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      color: rgb(1, 1, 1), // white fill to match background
      borderWidth: 0,
    });
  };

  // Top-center placeholders block (approx.)
  cover(40, height - 360, width - 80, 140);

  // Bottom-meta placeholders block (approx.)
  cover(40, 40, width - 80, 140);

  const center = (text, size, y) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  };

  // Write dynamic values – coordinates aligned to replace template placeholders
  // Top section – personalise participant name and course/context
  center(fullName.toUpperCase(), fontSizeLarge, height - 250); // replaces {full name}
  center(courseName.toUpperCase(), fontSizeMedium, height - 300); // replaces {COURSE NAME}
  center(dateString, fontSizeMedium, height - 350); // replaces {DATE}

  // Middle section – instructor and session meta
  center(instructorName, fontSizeSmall, height - 395); // {Instructor name}

  // Bottom section – ids for verification
  center(enrollmentId, fontSizeSmall, height - 450); // {enrollment_id}
  center(certificateId, fontSizeSmall, height - 480); // {certificate_id}

  // Generate QR – link to verification endpoint
  const verifyUrl = `https://medh.co/certificate-verify/${certificateId}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0 });
  const qrImageBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
  const qrEmbed = await pdfDoc.embedPng(qrImageBytes);

  // Draw QR at bottom-right (adjust as needed)
  const qrSize = 80;
  page.drawImage(qrEmbed, {
    x: width - qrSize - 50,
    y: 50,
    width: qrSize,
    height: qrSize,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// -----------------------------------------------------------------------------
// Controller: createDemoCertificate
// -----------------------------------------------------------------------------
export const createDemoCertificate = async (req, res) => {
  try {
    const {
      student_id: studentId,
      course_id: courseId,
      enrollment_id: enrollmentId,
      course_name: courseName,
      full_name: fullName,
      instructor_name: instructorName,
      date, // ISO date string
    } = req.body;

    if (!studentId || !courseId || !enrollmentId || !fullName || !courseName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const certificateId = crypto.randomUUID();
    const dateString = date ? new Date(date).toLocaleDateString() : new Date().toLocaleDateString();

    // 1. Build PDF
    const pdfBuffer = await buildCertificatePDF({
      fullName,
      courseName,
      dateString,
      instructorName: instructorName || "Instructor",
      enrollmentId,
      certificateId,
    });

    // 2. Anchor hash on-chain (best effort – non-fatal on failure)
    try {
      await storeHash(pdfBuffer, certificateId);
    } catch (chainErr) {
      console.error("[DemoCertificate] Blockchain anchoring skipped:", chainErr.message);
    }

    // 3. Upload PDF to S3
    const s3Key = `demo-certificates/${studentId}/${certificateId}.pdf`;
    const uploadParams = {
      bucketName: "medhdocuments",
      key: s3Key,
      file: pdfBuffer,
      contentType: "application/pdf",
    };

    // Updated uploadFile returns a promise with { success, data: { url } }
    const {
      data: { url: s3Url },
    } = await uploadFile(uploadParams);

    // 4. Persist certificate record (uses existing Certificate model)
    const verificationUrl = `https://medh.co/certificate-verify/${certificateId}`;

    const certificateRecord = await Certificate.create({
      id: certificateId,
      course: courseId,
      student: studentId,
      // Only set enrollment if it's a valid ObjectId; otherwise store in metadata
      ...(mongoose.isValidObjectId(enrollmentId) && { enrollment: enrollmentId }),
      certificateNumber: certificateId,
      issueDate: new Date(),
      completionDate: new Date(date || Date.now()),
      grade: "A",
      finalScore: 0,
      certificateUrl: s3Url,
      verificationUrl,
      metadata: {
        issuedBy: instructorName || "Instructor",
        issuerTitle: "Program Coordinator",
        issuerSignature: "https://medh.co/signature.png",
        institutionLogo: "https://medh.co/logo.png",
        certificateTemplate: "Demo",
        ...( !mongoose.isValidObjectId(enrollmentId) && { rawEnrollmentId: enrollmentId } ),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Demo certificate generated successfully",
      data: {
        certificate: certificateRecord,
      },
    });
  } catch (error) {
    console.error("Error generating demo certificate:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate demo certificate",
      error: error.message,
    });
  }
};

// -----------------------------------------------------------------------------
// Controller: verifyDemoCertificate
// -----------------------------------------------------------------------------
export const verifyDemoCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    const certificate = await Certificate.findOne({ id });
    if (!certificate) {
      return res.status(404).json({ valid: false, reason: "not-found" });
    }

    // Fetch PDF
    const pdfArrayBuffer = await fetch(certificate.certificateUrl).then((r) => r.arrayBuffer());
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    const valid = await verifyHash(pdfBuffer);

    return res.status(200).json({ valid });
  } catch (error) {
    console.error("Error verifying certificate:", error);
    return res.status(500).json({ valid: false, reason: "error", error: error.message });
  }
}; 