import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

// Import models and utilities
import Certificate from "./models/certificate-model.js";
import {
  generateQRCode,
  generateQRCodeBuffer,
  generateCertificateQRCode,
} from "./utils/qrCodeGenerator.js";
import logger from "./utils/logger.js";

const generateAllQRCodes = async () => {
  try {
    console.log("🚀 Starting QR Code Generation for All Demo Certificates\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB");

    // Read the certificate summary to get all certificate details
    let certificateData;
    try {
      const summaryContent = await fs.readFile(
        "demo-certificates-summary.json",
        "utf8",
      );
      certificateData = JSON.parse(summaryContent);
    } catch (error) {
      console.log(
        "📄 Certificate summary file not found, fetching from database...",
      );
      // Fallback: get certificates from database
      const certificates = await Certificate.find({
        student: "680092818c413e0442bf10dd", // SuperAdmin's MongoDB ID
      }).sort({ issueDate: -1 });

      certificateData = {
        certificates: certificates.map((cert) => ({
          certificateId: cert.id,
          certificateNumber: cert.certificateNumber,
          verificationUrl: cert.verificationUrl,
          courseName: cert.metadata?.courseName || "Demo Course",
          grade: cert.grade,
          finalScore: cert.finalScore,
        })),
      };
    }

    const certificates = certificateData.certificates;
    console.log(
      `📜 Found ${certificates.length} certificates to generate QR codes for\n`,
    );

    const qrResults = [];

    // Create QR codes directory if it doesn't exist
    const qrDir = "qr-codes";
    try {
      await fs.mkdir(qrDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    // Generate QR codes for each certificate
    for (let i = 0; i < certificates.length; i++) {
      const cert = certificates[i];
      console.log(
        `🔲 Generating QR Code ${i + 1}/${certificates.length}: ${cert.courseName}`,
      );

      try {
        // Generate QR code with verification URL
        const qrCodeBase64 = await generateCertificateQRCode(
          cert.verificationUrl,
          cert.certificateId,
          {
            width: 300,
            errorCorrectionLevel: "H",
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          },
        );

        // Generate QR code buffer for file saving
        const qrCodeBuffer = await generateQRCodeBuffer(cert.verificationUrl, {
          width: 300,
          errorCorrectionLevel: "H",
          margin: 2,
        });

        // Save QR code as PNG file
        const fileName = `${cert.certificateNumber}_QR.png`;
        const filePath = path.join(qrDir, fileName);
        await fs.writeFile(filePath, qrCodeBuffer);

        console.log(`  ✅ QR Code saved: ${fileName}`);
        console.log(`  📋 Certificate ID: ${cert.certificateId}`);
        console.log(`  🔢 Certificate Number: ${cert.certificateNumber}`);
        console.log(`  🔗 Verification URL: ${cert.verificationUrl}`);
        console.log(`  📁 File Path: ${filePath}`);

        qrResults.push({
          certificateId: cert.certificateId,
          certificateNumber: cert.certificateNumber,
          courseName: cert.courseName,
          grade: cert.grade,
          finalScore: cert.finalScore,
          verificationUrl: cert.verificationUrl,
          qrCodeBase64: qrCodeBase64,
          qrCodeFile: fileName,
          qrCodePath: filePath,
          generatedAt: new Date().toISOString(),
        });

        console.log(`  🎉 QR Code ${i + 1} completed successfully!\n`);
      } catch (error) {
        console.error(
          `  ❌ Error generating QR code for ${cert.certificateNumber}:`,
          error.message,
        );
        qrResults.push({
          certificateId: cert.certificateId,
          certificateNumber: cert.certificateNumber,
          courseName: cert.courseName,
          error: error.message,
          generatedAt: new Date().toISOString(),
        });
      }
    }

    // Display summary
    console.log("=".repeat(80));
    console.log("📱 QR CODE GENERATION SUMMARY");
    console.log("=".repeat(80));
    console.log(`🏆 Total Certificates: ${certificates.length}`);
    console.log(
      `✅ Successful QR Codes: ${qrResults.filter((r) => !r.error).length}`,
    );
    console.log(
      `❌ Failed QR Codes: ${qrResults.filter((r) => r.error).length}`,
    );
    console.log(`📁 QR Codes Directory: ${path.resolve(qrDir)}`);
    console.log(`📅 Generated: ${new Date().toLocaleString()}`);

    console.log("\n📱 QR CODE DETAILS:");
    console.log("-".repeat(80));

    qrResults.forEach((result, index) => {
      if (result.error) {
        console.log(
          `${index + 1}. ❌ ${result.courseName} - ERROR: ${result.error}`,
        );
      } else {
        console.log(`${index + 1}. ✅ ${result.courseName}`);
        console.log(`   📋 Certificate: ${result.certificateNumber}`);
        console.log(`   📊 Grade: ${result.grade} (${result.finalScore}%)`);
        console.log(`   📁 QR File: ${result.qrCodeFile}`);
        console.log(`   🔗 Verification: ${result.verificationUrl}`);
      }
      console.log("");
    });

    // Save QR codes summary
    const qrSummary = {
      type: "qr_codes_generation",
      generatedAt: new Date().toISOString(),
      totalCertificates: certificates.length,
      successfulQRCodes: qrResults.filter((r) => !r.error).length,
      failedQRCodes: qrResults.filter((r) => r.error).length,
      qrCodesDirectory: path.resolve(qrDir),
      qrCodes: qrResults,
      instructions: {
        usage: "QR codes can be scanned to verify certificates",
        apiEndpoint: "GET /api/v1/certificates/verify/:certificateNumber",
        qrCodeFormat: "PNG files with 300x300 pixels",
        errorCorrection: "High (H) level for better scanning reliability",
      },
    };

    await fs.writeFile(
      "qr-codes-summary.json",
      JSON.stringify(qrSummary, null, 2),
      "utf8",
    );

    console.log("=".repeat(80));
    console.log("✅ All QR codes generated successfully!");
    console.log("💾 Summary saved to: qr-codes-summary.json");
    console.log(`📁 QR code files saved in: ${path.resolve(qrDir)}/`);
    console.log("📱 QR codes can be scanned to verify certificates directly");
    console.log("=".repeat(80));

    // Generate an HTML preview file
    const htmlPreview = generateHTMLPreview(qrResults.filter((r) => !r.error));
    await fs.writeFile("qr-codes-preview.html", htmlPreview, "utf8");
    console.log("🌐 HTML preview generated: qr-codes-preview.html");
  } catch (error) {
    console.error("❌ Error generating QR codes:", error);
    logger.error("QR code generation failed", {
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
};

// Generate HTML preview of all QR codes
const generateHTMLPreview = (qrResults) => {
  const qrCards = qrResults
    .map(
      (result) => `
    <div class="qr-card">
      <h3>${result.courseName}</h3>
      <div class="qr-info">
        <p><strong>Certificate:</strong> ${result.certificateNumber}</p>
        <p><strong>Grade:</strong> ${result.grade} (${result.finalScore}%)</p>
        <p><strong>Generated:</strong> ${new Date(result.generatedAt).toLocaleString()}</p>
      </div>
      <div class="qr-code">
        <img src="data:image/png;base64,${result.qrCodeBase64}" alt="QR Code for ${result.certificateNumber}" />
      </div>
      <div class="verification-url">
        <p><strong>Verification URL:</strong></p>
        <a href="${result.verificationUrl}" target="_blank">${result.verificationUrl}</a>
      </div>
    </div>
  `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MEDH Certificate QR Codes</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .qr-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
        }
        .qr-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .qr-card h3 {
            color: #333;
            margin-top: 0;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
        }
        .qr-info {
            margin: 15px 0;
            text-align: left;
        }
        .qr-info p {
            margin: 5px 0;
            color: #666;
        }
        .qr-code img {
            max-width: 200px;
            height: auto;
            border: 2px solid #ddd;
            border-radius: 5px;
        }
        .verification-url {
            margin-top: 15px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .verification-url a {
            color: #007bff;
            text-decoration: none;
            word-break: break-all;
            font-size: 12px;
        }
        .verification-url a:hover {
            text-decoration: underline;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
        }
        .stat {
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 MEDH Certificate QR Codes</h1>
            <p>Scan any QR code to verify the corresponding certificate</p>
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">${qrResults.length}</div>
                    <div class="stat-label">QR Codes Generated</div>
                </div>
                <div class="stat">
                    <div class="stat-number">300x300</div>
                    <div class="stat-label">Pixels Resolution</div>
                </div>
                <div class="stat">
                    <div class="stat-number">High</div>
                    <div class="stat-label">Error Correction</div>
                </div>
            </div>
        </div>
        
        <div class="qr-grid">
            ${qrCards}
        </div>
        
        <div class="header" style="margin-top: 30px;">
            <h3>📱 How to Use</h3>
            <p>1. Scan any QR code with your smartphone camera or QR code scanner app</p>
            <p>2. The QR code will redirect to the certificate verification page</p>
            <p>3. View complete certificate details including student info, course details, and validation status</p>
        </div>
    </div>
</body>
</html>
  `;
};

// Run the QR code generation
generateAllQRCodes().catch(console.error);
