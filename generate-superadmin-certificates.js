import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

// Import models
import User from "./models/user-modal.js";
import Course from "./models/course-model.js";
import Enrollment from "./models/enrollment-model.js";
import Certificate from "./models/certificate-model.js";
import {
  generateCertificateId,
  generateCertificateNumber,
  generateVerificationUrl,
  calculateGrade,
  generateCertificateMetadata,
} from "./utils/certificateIdGenerator.js";
import logger from "./utils/logger.js";

// Certificate data for 6 different certificates
const certificateData = [
  {
    courseName: "Advanced JavaScript Programming",
    courseDescription:
      "Master advanced JavaScript concepts and modern frameworks",
    finalScore: 92,
    completionDate: new Date("2024-12-15"),
  },
  {
    courseName: "React.js Development Masterclass",
    courseDescription:
      "Build professional React applications with hooks and context",
    finalScore: 88,
    completionDate: new Date("2024-12-20"),
  },
  {
    courseName: "Node.js Backend Development",
    courseDescription:
      "Create scalable backend applications with Node.js and Express",
    finalScore: 94,
    completionDate: new Date("2024-12-25"),
  },
  {
    courseName: "Database Design and Management",
    courseDescription: "Learn MongoDB, PostgreSQL, and database optimization",
    finalScore: 87,
    completionDate: new Date("2024-12-30"),
  },
  {
    courseName: "DevOps and Cloud Computing",
    courseDescription: "Master AWS, Docker, and CI/CD pipelines",
    finalScore: 91,
    completionDate: new Date("2025-01-05"),
  },
  {
    courseName: "Full Stack Web Development",
    courseDescription: "Complete web development from frontend to backend",
    finalScore: 96,
    completionDate: new Date("2025-01-10"),
  },
];

const generateSuperAdminCertificates = async () => {
  try {
    console.log("🚀 Starting Certificate Generation for SuperAdmin\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB");

    // Find or create superAdmin user
    let superAdmin = await User.findOne({ email: "superAdmin@medh.co" });

    if (!superAdmin) {
      console.log("❌ SuperAdmin user not found. Creating new superAdmin...");
      superAdmin = new User({
        full_name: "Super Administrator",
        email: "superAdmin@medh.co",
        username: "superadmin",
        password: "Admin@123", // This will be hashed by the pre-save hook
        role: ["super-admin"],
        admin_role: "super-admin",
        status: "active",
        email_verified: true,
        student_id: `SUPERADMIN_${Date.now()}`,
        is_demo: false,
        phone_number: "+1234567890",
        age_group: "35-44",
        gender: "prefer-not-to-say",
      });
      await superAdmin.save();
      console.log("✅ SuperAdmin user created");
    } else {
      console.log("✅ SuperAdmin user found:", superAdmin.email);
    }

    const generatedCertificates = [];

    // Generate 6 certificates
    for (let i = 0; i < certificateData.length; i++) {
      const data = certificateData[i];
      console.log(`\n📚 Processing Certificate ${i + 1}/6: ${data.courseName}`);

      // Create demo course
      const demoCourse = new Course({
        course_title: data.courseName,
        course_description: data.courseDescription,
        course_duration: "30 days",
        course_category: "Professional Development",
        status: "Published",
        price: 299,
        currency: "USD",
        assigned_instructor: superAdmin._id,
        created_by: superAdmin._id,
        course_image: `https://medh.co/images/course-${i + 1}.jpg`,
        course_level: "Advanced",
        course_type: "self-paced",
        // Required fields
        no_of_Sessions: 15,
        class_type: "Online",
        is_Certification: true,
        is_Assignments: true,
        is_Projects: true,
        is_Quizes: true,
        // Additional fields
        prices: [
          {
            currency: "USD",
            amount: 299,
            discount_percentage: 0,
          },
        ],
        category_type: "Professional",
        course_slug: data.courseName
          .toLowerCase()
          .replace(/[^\w ]+/g, "")
          .replace(/ +/g, "-"),
        course_overview: data.courseDescription,
        course_objectives: [
          "Master advanced concepts",
          "Build practical projects",
          "Gain industry-relevant skills",
        ],
        prerequisites: ["Basic programming knowledge"],
        target_audience: ["Professionals", "Students", "Developers"],
        tools_technologies: [
          {
            name: "JavaScript",
            description: "Modern JavaScript ES6+",
          },
        ],
        curriculum: [
          {
            week_title: "Week 1 - Fundamentals",
            week_number: 1,
            sections: [
              {
                section_title: "Introduction",
                section_order: 1,
                resources: [
                  {
                    title: "Course Introduction",
                    file_url: "https://medh.co/intro.pdf",
                    type: "pdf",
                  },
                ],
              },
            ],
          },
        ],
        faqs: [
          {
            question: "What will I learn?",
            answer: "You will learn advanced concepts and practical skills.",
          },
        ],
        resources: [
          {
            title: "Course Materials",
            url: "https://medh.co/materials.pdf",
            type: "pdf",
          },
        ],
      });

      await demoCourse.save();
      console.log(`  ✅ Course created: ${demoCourse.course_title}`);

      // Create enrollment
      const enrollment = new Enrollment({
        student: superAdmin._id,
        course: demoCourse._id,
        enrollment_date: new Date(
          data.completionDate.getTime() - 30 * 24 * 60 * 60 * 1000,
        ), // 30 days before completion
        status: "completed",
        completion_date: data.completionDate,
        final_score: data.finalScore,
        access_expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year access
        enrollment_type: "individual",
        enrollment_source: "direct",
        progress: {
          overall_percentage: 100,
          lessons_completed: 15,
          last_activity_date: data.completionDate,
        },
        total_amount_paid: 299,
        payment_plan: "full",
        payments: [
          {
            amount: 299,
            currency: "USD",
            payment_date: new Date(
              data.completionDate.getTime() - 30 * 24 * 60 * 60 * 1000,
            ),
            payment_method: "credit_card",
            transaction_id: `TXN_${Date.now()}_${i + 1}`,
            payment_status: "completed",
            payment_type: "course",
          },
        ],
        certificate_issued: false,
      });

      await enrollment.save();
      console.log(`  ✅ Enrollment created with ${data.finalScore}% score`);

      // Generate certificate ID and number
      const certificateId = await generateCertificateId(
        demoCourse._id.toString(),
        superAdmin._id.toString(),
        data.completionDate,
      );
      const certificateNumber = await generateCertificateNumber(
        data.completionDate,
      );
      const verificationUrl = generateVerificationUrl(certificateNumber);
      const grade = calculateGrade(data.finalScore);

      console.log(`  📜 Generated Certificate ID: ${certificateId}`);
      console.log(`  🔢 Certificate Number: ${certificateNumber}`);
      console.log(`  📊 Grade: ${grade}`);

      // Generate certificate metadata
      const metadata = generateCertificateMetadata(demoCourse, superAdmin);

      // Create certificate record
      const certificate = new Certificate({
        id: certificateId,
        course: demoCourse._id,
        student: superAdmin._id,
        enrollment: enrollment._id,
        certificateNumber,
        issueDate: new Date(),
        status: "active",
        grade,
        finalScore: data.finalScore,
        completionDate: data.completionDate,
        certificateUrl: `${process.env.FRONTEND_URL || "https://medh.edu.in"}/certificates/${certificateId}`,
        verificationUrl,
        metadata: {
          ...metadata,
          issuedBy: "MEDH Education Platform",
          issuerTitle: "Chief Academic Officer",
          issuerSignature: "https://medh.co/signature.png",
          institutionLogo: "https://medh.co/logo.png",
          certificateTemplate: "Professional",
          specialNotes: `Outstanding performance with ${data.finalScore}% score`,
        },
      });

      await certificate.save();
      console.log(`  ✅ Certificate record created`);

      // Update enrollment to mark certificate as issued
      enrollment.certificate_issued = true;
      enrollment.certificate_id = certificate._id;
      await enrollment.save();
      console.log(`  ✅ Enrollment updated with certificate info`);

      // Store certificate info for summary
      generatedCertificates.push({
        certificateId,
        certificateNumber,
        courseName: data.courseName,
        finalScore: data.finalScore,
        grade,
        completionDate: data.completionDate,
        verificationUrl,
      });

      console.log(`  🎉 Certificate ${i + 1} completed successfully!`);
    }

    // Display summary
    console.log("\n" + "=".repeat(80));
    console.log("🎓 CERTIFICATE GENERATION SUMMARY");
    console.log("=".repeat(80));
    console.log(`👤 Student: ${superAdmin.full_name} (${superAdmin.email})`);
    console.log(`📧 Student ID: ${superAdmin.student_id}`);
    console.log(`🆔 MongoDB ID: ${superAdmin._id}`);
    console.log(`📅 Generated: ${new Date().toLocaleString()}`);
    console.log(`🏆 Total Certificates: ${generatedCertificates.length}`);
    console.log("\n📜 CERTIFICATE DETAILS:");
    console.log("-".repeat(80));

    generatedCertificates.forEach((cert, index) => {
      console.log(`${index + 1}. ${cert.courseName}`);
      console.log(`   📋 Certificate ID: ${cert.certificateId}`);
      console.log(`   🔢 Certificate Number: ${cert.certificateNumber}`);
      console.log(`   📊 Grade: ${cert.grade} (${cert.finalScore}%)`);
      console.log(
        `   📅 Completion Date: ${cert.completionDate.toDateString()}`,
      );
      console.log(`   🔗 Verification URL: ${cert.verificationUrl}`);
      console.log("");
    });

    console.log("=".repeat(80));
    console.log("✅ All certificates generated successfully!");
    console.log(
      "🔍 You can verify any certificate using the verification URLs above",
    );
    console.log(
      "📱 QR codes can be generated using the QR code generation API",
    );
    console.log("=".repeat(80));

    // Save summary to file
    const summaryData = {
      generatedAt: new Date().toISOString(),
      student: {
        name: superAdmin.full_name,
        email: superAdmin.email,
        studentId: superAdmin.student_id,
        mongoId: superAdmin._id.toString(),
      },
      certificates: generatedCertificates,
      totalCertificates: generatedCertificates.length,
    };

    // Write summary to JSON file
    const fs = await import("fs");
    await fs.promises.writeFile(
      "superadmin-certificates-summary.json",
      JSON.stringify(summaryData, null, 2),
      "utf8",
    );
    console.log("💾 Summary saved to: superadmin-certificates-summary.json");
  } catch (error) {
    console.error("❌ Error generating certificates:", error);
    logger.error("Certificate generation failed", {
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

// Run the certificate generation
generateSuperAdminCertificates().catch(console.error);
