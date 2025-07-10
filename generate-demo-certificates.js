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
import Certificate from "./models/certificate-model.js";
import Course from "./models/course-model.js";
import {
  generateCertificateId,
  generateCertificateNumber,
  generateVerificationUrl,
  calculateGrade,
} from "./utils/certificateIdGenerator.js";
import logger from "./utils/logger.js";

// Demo certificate data
const demoCertificateData = [
  {
    courseName: "Advanced JavaScript Programming",
    courseDescription:
      "Master advanced JavaScript concepts and modern frameworks",
    finalScore: 92,
    completionDate: new Date("2024-12-15"),
    instructor: "Dr. Sarah Johnson",
  },
  {
    courseName: "React.js Development Masterclass",
    courseDescription:
      "Build professional React applications with hooks and context",
    finalScore: 88,
    completionDate: new Date("2024-12-20"),
    instructor: "Prof. Michael Chen",
  },
  {
    courseName: "Node.js Backend Development",
    courseDescription:
      "Create scalable backend applications with Node.js and Express",
    finalScore: 94,
    completionDate: new Date("2024-12-25"),
    instructor: "Dr. Emily Rodriguez",
  },
  {
    courseName: "Database Design and Management",
    courseDescription: "Learn MongoDB, PostgreSQL, and database optimization",
    finalScore: 87,
    completionDate: new Date("2024-12-30"),
    instructor: "Prof. David Kim",
  },
  {
    courseName: "DevOps and Cloud Computing",
    courseDescription: "Master AWS, Docker, and CI/CD pipelines",
    finalScore: 91,
    completionDate: new Date("2025-01-05"),
    instructor: "Dr. Lisa Thompson",
  },
  {
    courseName: "Full Stack Web Development",
    courseDescription: "Complete web development from frontend to backend",
    finalScore: 96,
    completionDate: new Date("2025-01-10"),
    instructor: "Prof. James Wilson",
  },
];

const generateDemoCertificates = async () => {
  try {
    console.log("🚀 Starting Demo Certificate Generation for SuperAdmin\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB");

    // Find superAdmin user
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

    // Create one minimal demo course to satisfy the required course reference
    let demoCourse = await Course.findOne({ 
      course_title: "Demo Certificate Course",
      created_by: superAdmin._id 
    });
    
    if (!demoCourse) {
      console.log("📚 Creating minimal demo course...");
      demoCourse = new Course({
        course_title: "Demo Certificate Course",
        course_description: "A minimal demo course for certificate generation",
        course_duration: "Flexible",
        course_category: "Demo",
        status: "Published",
        price: 0,
        currency: "USD",
        assigned_instructor: [superAdmin._id],
        created_by: superAdmin._id,
        course_image: "https://medh.co/images/demo-course.jpg",
        // Required fields with minimal values
        no_of_Sessions: 1,
        class_type: "Self-Paced",
        is_Certification: "Yes",
        is_Assignments: "No",
        is_Projects: "No",
        is_Quizes: "No",
        category_type: "Free",
        course_slug: "demo-certificate-course",
        course_overview: "Demo course for certificate generation",
        course_objectives: ["Generate demo certificates"],
        prerequisites: ["None"],
        target_audience: ["Demo users"],
        tools_technologies: [
          {
            name: "Demo Tool",
            description: "Demo technology",
          },
        ],
        curriculum: [
          {
            weekTitle: "Demo Week",
            weekDescription: "Demo week description",
            sections: [
              {
                title: "Demo Section",
                order: 1,
                resources: [
                  {
                    title: "Demo Resource",
                    fileUrl: "https://medh.co/demo.pdf",
                    type: "pdf",
                  },
                ],
              },
            ],
          },
        ],
        faqs: [
          {
            question: "What is this course?",
            answer: "This is a demo course for certificate generation.",
          },
        ],
        resources: [
          {
            title: "Demo Materials",
            url: "https://medh.co/demo-materials.pdf",
            type: "pdf",
          },
        ],
        prices: [
          {
            currency: "USD",
            amount: 0,
            discount_percentage: 0,
          },
        ],
      });
      
      await demoCourse.save();
      console.log("✅ Demo course created");
    } else {
      console.log("✅ Demo course found");
    }

    const generatedCertificates = [];

    // Generate 6 demo certificates
    for (let i = 0; i < demoCertificateData.length; i++) {
      const data = demoCertificateData[i];
      console.log(`\n📜 Generating Certificate ${i + 1}/6: ${data.courseName}`);

      // Generate certificate ID and number
      const certificateId = await generateCertificateId(
        `DEMO_COURSE_${i + 1}`,
        superAdmin._id.toString(),
        data.completionDate,
      );
      const certificateNumber = await generateCertificateNumber(
        data.completionDate,
      );
      const verificationUrl = generateVerificationUrl(certificateNumber);
      const grade = calculateGrade(data.finalScore);

      console.log(`  📋 Certificate ID: ${certificateId}`);
      console.log(`  🔢 Certificate Number: ${certificateNumber}`);
      console.log(`  📊 Grade: ${grade} (${data.finalScore}%)`);

      // Create certificate record with demo course reference
      const certificate = new Certificate({
        id: certificateId,
        // Using the demo course we created
        course: demoCourse._id,
        student: superAdmin._id,
        enrollment: null, // No actual enrollment created
        certificateNumber,
        issueDate: new Date(),
        status: "active",
        grade,
        finalScore: data.finalScore,
        completionDate: data.completionDate,
        certificateUrl: `${process.env.FRONTEND_URL || "https://medh.edu.in"}/certificates/${certificateId}`,
        verificationUrl,
        metadata: {
          // Demo course information stored in metadata
          courseName: data.courseName,
          courseDescription: data.courseDescription,
          instructorName: data.instructor,
          issuedBy: "MEDH Education Platform",
          issuerTitle: "Chief Academic Officer",
          issuerSignature: "https://medh.co/signature.png",
          institutionLogo: "https://medh.co/logo.png",
          certificateTemplate: "Professional",
          specialNotes: `Outstanding performance with ${data.finalScore}% score`,
          isDemoData: true,
          demoGenerated: true,
          generatedAt: new Date().toISOString(),
          studentName: superAdmin.full_name,
          studentEmail: superAdmin.email,
          courseDuration: "30 days",
          courseLevel: "Advanced",
          courseCategory: "Professional Development",
          completionRequirements: [
            "Complete all course modules",
            "Pass all assessments",
            "Achieve minimum 70% score",
            "Submit final project",
          ],
        },
      });

      await certificate.save();
      console.log(`  ✅ Certificate record created and saved`);

      // Store certificate info for summary
      generatedCertificates.push({
        certificateId,
        certificateNumber,
        courseName: data.courseName,
        finalScore: data.finalScore,
        grade,
        completionDate: data.completionDate,
        verificationUrl,
        instructor: data.instructor,
      });

      console.log(`  🎉 Demo Certificate ${i + 1} completed successfully!`);
    }

    // Display summary
    console.log("\n" + "=".repeat(80));
    console.log("🎓 DEMO CERTIFICATE GENERATION SUMMARY");
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
      console.log(`   👨‍🏫 Instructor: ${cert.instructor}`);
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
    console.log("✅ All demo certificates generated successfully!");
    console.log(
      "🔍 You can verify any certificate using the verification URLs above",
    );
    console.log(
      "📱 QR codes can be generated using: POST /api/v1/certificates/generate-qr-code",
    );
    console.log(
      "🌐 Certificate verification: GET /api/v1/certificates/verify/:certificateNumber",
    );
    console.log("=".repeat(80));

    // Save summary to file
    const summaryData = {
      type: "demo_certificates",
      generatedAt: new Date().toISOString(),
      student: {
        name: superAdmin.full_name,
        email: superAdmin.email,
        studentId: superAdmin.student_id,
        mongoId: superAdmin._id.toString(),
      },
      certificates: generatedCertificates,
      totalCertificates: generatedCertificates.length,
      apiEndpoints: {
        verify: "GET /api/v1/certificates/verify/:certificateNumber",
        generateQR: "POST /api/v1/certificates/generate-qr-code",
        downloadQR: "GET /api/v1/certificates/:certificateId/qr-code/download",
      },
      notes: [
        "These are demo certificates without actual course or enrollment data",
        "Course information is stored in certificate metadata",
        "Certificates can be verified using the verification URLs",
        "QR codes can be generated for any certificate using the API",
      ],
    };

    // Write summary to JSON file
    const fs = await import("fs");
    await fs.promises.writeFile(
      "demo-certificates-summary.json",
      JSON.stringify(summaryData, null, 2),
      "utf8",
    );
    console.log("💾 Summary saved to: demo-certificates-summary.json");

    // Display quick verification test
    console.log("\n🧪 QUICK VERIFICATION TEST:");
    console.log("-".repeat(40));
    const testCert = generatedCertificates[0];
    console.log(`Test Certificate: ${testCert.certificateNumber}`);
    console.log(`Verification URL: ${testCert.verificationUrl}`);
    console.log(
      `API Test: curl -X GET "${process.env.BACKEND_URL || "http://localhost:3000"}/api/v1/certificates/verify/${testCert.certificateNumber}"`,
    );
  } catch (error) {
    console.error("❌ Error generating demo certificates:", error);
    logger.error("Demo certificate generation failed", {
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

// Run the demo certificate generation
generateDemoCertificates().catch(console.error);
