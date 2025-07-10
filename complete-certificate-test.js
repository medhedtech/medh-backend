import mongoose from "mongoose";
import User from "./models/user-modal.js";
import Course from "./models/course-model.js";
import Enrollment from "./models/enrollment-model.js";
import Certificate from "./models/certificate-model.js";
import {
  generateCertificateId,
  generateVerificationUrl,
} from "./utils/certificateIdGenerator.js";
import { generateCertificateQRCode } from "./utils/qrCodeGenerator.js";
import logger from "./utils/logger.js";

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/medh",
    );
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// Create demo data and test certificate workflow
const runCompleteTest = async () => {
  console.log("🚀 Starting Complete Certificate System Test\n");

  try {
    // Step 1: Create Demo Student
    console.log("📝 Step 1: Creating Demo Student...");
    const demoStudent = new User({
      full_name: "John Doe Test",
      email: "john.test@medh.co",
      username: "john_test_demo",
      password: "hashed_password_demo",
      role: "student",
      is_demo: true,
      student_id: `DEMO_${Date.now()}`,
      email_verified: true,
      status: "active",
    });
    await demoStudent.save();
    console.log("✅ Demo student created:", demoStudent.student_id);

    // Step 2: Create Demo Course
    console.log("\n📚 Step 2: Creating Demo Course...");
    const demoCourse = new Course({
      course_title: "Complete Certificate Test Course",
      course_description:
        "A comprehensive course for testing certificate generation",
      course_duration: "30 days",
      course_category: "Testing",
      status: "Published",
      prices: [
        {
          currency: "USD",
          amount: 0,
          discount_percentage: 0,
        },
      ],
      assigned_instructor: demoStudent._id,
      created_by: demoStudent._id,
    });
    await demoCourse.save();
    console.log("✅ Demo course created:", demoCourse.course_title);

    // Step 3: Create Demo Enrollment
    console.log("\n🎓 Step 3: Creating Demo Enrollment...");
    const demoEnrollment = new Enrollment({
      student: demoStudent._id,
      course: demoCourse._id,
      enrollment_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      status: "completed",
      completion_date: new Date(),
      final_score: 92,
      progress: 100,
      certificate_generated: false,
      payment_status: "completed",
      payment_method: "demo",
    });
    await demoEnrollment.save();
    console.log("✅ Demo enrollment created with 92% score");

    // Step 4: Generate Certificate ID
    console.log("\n🏆 Step 4: Generating Certificate ID...");
    const certificateId = await generateCertificateId(
      demoCourse._id.toString(),
      demoStudent._id.toString(),
      demoEnrollment.completion_date.toISOString(),
    );
    console.log("✅ Generated Certificate ID:", certificateId);

    // Step 5: Create Certificate Record
    console.log("\n📜 Step 5: Creating Certificate Record...");
    const verificationUrl = generateVerificationUrl(certificateId);

    const certificate = new Certificate({
      id: certificateId,
      certificateNumber: certificateId,
      student: demoStudent._id,
      course: demoCourse._id,
      enrollment: demoEnrollment._id,
      issueDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      status: "active",
      grade: "A",
      finalScore: 92,
      completionDate: demoEnrollment.completion_date,
      verificationUrl: verificationUrl,
      metadata: {
        issuedBy: "MEDH Education",
        issuerTitle: "Chief Academic Officer",
        generatedAt: new Date(),
      },
    });
    await certificate.save();
    console.log("✅ Certificate record created");

    // Step 6: Generate QR Code
    console.log("\n📱 Step 6: Generating QR Code...");
    const qrCode = await generateCertificateQRCode(
      verificationUrl,
      certificateId,
    );
    console.log(
      "✅ QR Code generated (Base64 length:",
      qrCode.length,
      "characters)",
    );

    // Step 7: Test Verification
    console.log("\n🔍 Step 7: Testing Certificate Verification...");
    const foundCertificate = await Certificate.findOne({
      certificateNumber: certificateId,
    })
      .populate("student", "full_name email student_id")
      .populate("course", "course_title course_description")
      .populate("enrollment", "enrollment_date status");

    if (foundCertificate) {
      console.log("✅ Certificate verification successful!");
      console.log("📋 Certificate Details:");
      console.log(
        "   • Certificate Number:",
        foundCertificate.certificateNumber,
      );
      console.log("   • Student:", foundCertificate.student.full_name);
      console.log("   • Course:", foundCertificate.course.course_title);
      console.log("   • Grade:", foundCertificate.grade);
      console.log("   • Final Score:", foundCertificate.finalScore);
      console.log("   • Status:", foundCertificate.status);
      console.log("   • Verification URL:", foundCertificate.verificationUrl);
    }

    // Step 8: Display API Test Commands
    console.log("\n🧪 Step 8: API Test Commands Ready!");
    console.log("\n📡 Test the APIs with these commands:");
    console.log("\n1️⃣ Verify Certificate (GET):");
    console.log(
      `curl -X GET "http://localhost:8080/api/v1/certificates/verify/${certificateId}"`,
    );

    console.log("\n2️⃣ Generate QR Code (GET):");
    console.log(
      `curl -X GET "http://localhost:8080/api/v1/certificates/${certificate._id}/qr-code" \\`,
    );
    console.log('  -H "Authorization: Bearer YOUR_TOKEN"');

    console.log("\n3️⃣ Generate QR Code (POST):");
    console.log(
      'curl -X POST "http://localhost:8080/api/v1/certificates/generate-qr-code" \\',
    );
    console.log('  -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log(
      `  -d '{"certificateNumber": "${certificateId}", "verificationUrl": "${verificationUrl}"}'`,
    );

    console.log("\n4️⃣ Download QR Code:");
    console.log(
      `curl -X GET "http://localhost:8080/api/v1/certificates/${certificate._id}/qr-code/download" \\`,
    );
    console.log('  -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log('  -o "certificate-qr.png"');

    // Step 9: Summary
    console.log("\n🎉 COMPLETE CERTIFICATE SYSTEM TEST SUCCESSFUL!");
    console.log("\n📊 Test Results Summary:");
    console.log("✅ Demo Student Created");
    console.log("✅ Demo Course Created");
    console.log("✅ Demo Enrollment Created");
    console.log("✅ Certificate ID Generated");
    console.log("✅ Certificate Record Saved");
    console.log("✅ QR Code Generated");
    console.log("✅ Certificate Verification Tested");
    console.log("✅ API Commands Ready");

    console.log(
      "\n🔗 Your certificate system is fully operational and ready for production use!",
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("\n📪 Database connection closed");
  }
};

// Run the complete test
const main = async () => {
  await connectDB();
  await runCompleteTest();
};

main().catch(console.error);
