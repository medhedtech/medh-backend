import mongoose from "mongoose";
import dotenv from "dotenv";
import CertificateMaster from "../models/certificate-master-model.js";

// Load environment variables
dotenv.config();

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

// Default certificates data
const defaultCertificates = [
  {
    name: "Foundational Certificate",
    description:
      "Entry-level certificate for beginners starting their learning journey",
    icon: "foundational-icon",
    color: "#10B981",
    sortOrder: 1,
    metadata: {
      level: "beginner",
      duration: "3-6 months",
      prerequisites: ["Basic computer skills"],
      learningOutcomes: [
        "Understand fundamental concepts",
        "Develop basic skills",
        "Build confidence",
      ],
      targetAudience: ["Beginners", "Career changers", "Students"],
      industryRecognition: false,
      accreditation: "MEDH Accredited",
    },
    certificateInfo: {
      certificateType: "certificate",
      validityPeriod: "Lifetime",
      renewalRequired: false,
      issuingAuthority: "MEDH",
      digitalBadge: true,
      physicalCertificate: false,
      certificateTemplate: "foundational-template",
    },
    requirements: {
      minimumCourses: 1,
      minimumHours: 20,
      minimumScore: 70,
      mandatoryCourses: [],
      electiveCourses: [],
      assessmentRequired: true,
      projectRequired: false,
    },
    pricing: {
      basePrice: 99,
      currency: "USD",
      discountAvailable: true,
      discountPercentage: 10,
      installmentAvailable: false,
      installmentCount: 1,
    },
  },
  {
    name: "Advanced Certificate",
    description:
      "Intermediate-level certificate for learners with some experience",
    icon: "advanced-icon",
    color: "#3B82F6",
    sortOrder: 2,
    metadata: {
      level: "advanced",
      duration: "6-12 months",
      prerequisites: ["Foundational knowledge", "Basic experience in field"],
      learningOutcomes: [
        "Master advanced concepts",
        "Develop specialized skills",
        "Apply knowledge practically",
      ],
      targetAudience: [
        "Intermediate learners",
        "Professionals",
        "Career advancers",
      ],
      industryRecognition: true,
      accreditation: "Industry Recognized",
    },
    certificateInfo: {
      certificateType: "certificate",
      validityPeriod: "Lifetime",
      renewalRequired: false,
      issuingAuthority: "MEDH",
      digitalBadge: true,
      physicalCertificate: true,
      certificateTemplate: "advanced-template",
    },
    requirements: {
      minimumCourses: 3,
      minimumHours: 60,
      minimumScore: 75,
      mandatoryCourses: [],
      electiveCourses: [],
      assessmentRequired: true,
      projectRequired: true,
    },
    pricing: {
      basePrice: 299,
      currency: "USD",
      discountAvailable: true,
      discountPercentage: 15,
      installmentAvailable: true,
      installmentCount: 3,
    },
  },
  {
    name: "Professional Certificate",
    description: "Professional-level certificate for career advancement",
    icon: "professional-icon",
    color: "#8B5CF6",
    sortOrder: 3,
    metadata: {
      level: "professional",
      duration: "12-18 months",
      prerequisites: ["Advanced knowledge", "Professional experience"],
      learningOutcomes: [
        "Expert-level skills",
        "Industry best practices",
        "Leadership capabilities",
      ],
      targetAudience: ["Professionals", "Managers", "Career leaders"],
      industryRecognition: true,
      accreditation: "Industry Accredited",
    },
    certificateInfo: {
      certificateType: "professional",
      validityPeriod: "5 years",
      renewalRequired: true,
      renewalPeriod: "Every 5 years",
      issuingAuthority: "MEDH",
      digitalBadge: true,
      physicalCertificate: true,
      certificateTemplate: "professional-template",
    },
    requirements: {
      minimumCourses: 5,
      minimumHours: 120,
      minimumScore: 80,
      mandatoryCourses: [],
      electiveCourses: [],
      assessmentRequired: true,
      projectRequired: true,
    },
    pricing: {
      basePrice: 599,
      currency: "USD",
      discountAvailable: true,
      discountPercentage: 20,
      installmentAvailable: true,
      installmentCount: 6,
    },
  },
  {
    name: "Specialist Certificate",
    description: "Specialized certificate for niche expertise areas",
    icon: "specialist-icon",
    color: "#EC4899",
    sortOrder: 4,
    metadata: {
      level: "expert",
      duration: "18-24 months",
      prerequisites: ["Professional experience", "Advanced knowledge"],
      learningOutcomes: [
        "Specialized expertise",
        "Niche skills",
        "Industry leadership",
      ],
      targetAudience: ["Experts", "Specialists", "Industry leaders"],
      industryRecognition: true,
      accreditation: "Industry Accredited",
    },
    certificateInfo: {
      certificateType: "specialist",
      validityPeriod: "3 years",
      renewalRequired: true,
      renewalPeriod: "Every 3 years",
      issuingAuthority: "MEDH",
      digitalBadge: true,
      physicalCertificate: true,
      certificateTemplate: "specialist-template",
    },
    requirements: {
      minimumCourses: 8,
      minimumHours: 200,
      minimumScore: 85,
      mandatoryCourses: [],
      electiveCourses: [],
      assessmentRequired: true,
      projectRequired: true,
    },
    pricing: {
      basePrice: 999,
      currency: "USD",
      discountAvailable: true,
      discountPercentage: 25,
      installmentAvailable: true,
      installmentCount: 12,
    },
  },
  {
    name: "Master Certificate",
    description: "Master-level certificate for industry leadership",
    icon: "master-icon",
    color: "#EF4444",
    sortOrder: 5,
    metadata: {
      level: "expert",
      duration: "24-36 months",
      prerequisites: ["Extensive experience", "Leadership background"],
      learningOutcomes: [
        "Master-level expertise",
        "Industry leadership",
        "Strategic thinking",
      ],
      targetAudience: [
        "Senior professionals",
        "Executives",
        "Industry leaders",
      ],
      industryRecognition: true,
      accreditation: "Industry Accredited",
    },
    certificateInfo: {
      certificateType: "master",
      validityPeriod: "Lifetime",
      renewalRequired: false,
      issuingAuthority: "MEDH",
      digitalBadge: true,
      physicalCertificate: true,
      certificateTemplate: "master-template",
    },
    requirements: {
      minimumCourses: 12,
      minimumHours: 300,
      minimumScore: 90,
      mandatoryCourses: [],
      electiveCourses: [],
      assessmentRequired: true,
      projectRequired: true,
    },
    pricing: {
      basePrice: 1999,
      currency: "USD",
      discountAvailable: true,
      discountPercentage: 30,
      installmentAvailable: true,
      installmentCount: 12,
    },
  },
  {
    name: "Executive Diploma",
    description: "Executive-level diploma for senior leadership",
    icon: "executive-icon",
    color: "#DC2626",
    sortOrder: 6,
    metadata: {
      level: "professional",
      duration: "18-24 months",
      prerequisites: [
        "Senior management experience",
        "Professional background",
      ],
      learningOutcomes: [
        "Executive leadership",
        "Strategic management",
        "Business acumen",
      ],
      targetAudience: ["Executives", "Senior managers", "Business leaders"],
      industryRecognition: true,
      accreditation: "Industry Accredited",
    },
    certificateInfo: {
      certificateType: "diploma",
      validityPeriod: "Lifetime",
      renewalRequired: false,
      issuingAuthority: "MEDH",
      digitalBadge: true,
      physicalCertificate: true,
      certificateTemplate: "executive-template",
    },
    requirements: {
      minimumCourses: 10,
      minimumHours: 250,
      minimumScore: 85,
      mandatoryCourses: [],
      electiveCourses: [],
      assessmentRequired: true,
      projectRequired: true,
    },
    pricing: {
      basePrice: 2999,
      currency: "USD",
      discountAvailable: true,
      discountPercentage: 25,
      installmentAvailable: true,
      installmentCount: 12,
    },
  },
  {
    name: "Professional Grad Diploma",
    description: "Graduate-level professional diploma",
    icon: "grad-diploma-icon",
    color: "#1F2937",
    sortOrder: 7,
    metadata: {
      level: "professional",
      duration: "24-36 months",
      prerequisites: ["Graduate education", "Professional experience"],
      learningOutcomes: [
        "Graduate-level expertise",
        "Professional mastery",
        "Research skills",
      ],
      targetAudience: ["Graduates", "Professionals", "Researchers"],
      industryRecognition: true,
      accreditation: "Industry Accredited",
    },
    certificateInfo: {
      certificateType: "diploma",
      validityPeriod: "Lifetime",
      renewalRequired: false,
      issuingAuthority: "MEDH",
      digitalBadge: true,
      physicalCertificate: true,
      certificateTemplate: "grad-diploma-template",
    },
    requirements: {
      minimumCourses: 15,
      minimumHours: 400,
      minimumScore: 85,
      mandatoryCourses: [],
      electiveCourses: [],
      assessmentRequired: true,
      projectRequired: true,
    },
    pricing: {
      basePrice: 3999,
      currency: "USD",
      discountAvailable: true,
      discountPercentage: 20,
      installmentAvailable: true,
      installmentCount: 12,
    },
  },
  {
    name: "Industry Certificate",
    description: "Industry-specific certificate for specialized sectors",
    icon: "industry-icon",
    color: "#059669",
    sortOrder: 8,
    metadata: {
      level: "professional",
      duration: "12-18 months",
      prerequisites: ["Industry experience", "Professional background"],
      learningOutcomes: [
        "Industry expertise",
        "Sector-specific skills",
        "Industry standards",
      ],
      targetAudience: [
        "Industry professionals",
        "Sector specialists",
        "Industry leaders",
      ],
      industryRecognition: true,
      accreditation: "Industry Accredited",
    },
    certificateInfo: {
      certificateType: "industry",
      validityPeriod: "3 years",
      renewalRequired: true,
      renewalPeriod: "Every 3 years",
      issuingAuthority: "MEDH",
      digitalBadge: true,
      physicalCertificate: true,
      certificateTemplate: "industry-template",
    },
    requirements: {
      minimumCourses: 6,
      minimumHours: 150,
      minimumScore: 80,
      mandatoryCourses: [],
      electiveCourses: [],
      assessmentRequired: true,
      projectRequired: true,
    },
    pricing: {
      basePrice: 799,
      currency: "USD",
      discountAvailable: true,
      discountPercentage: 15,
      installmentAvailable: true,
      installmentCount: 6,
    },
  },
];

// Initialize certificates
const initializeCertificates = async () => {
  try {
    console.log("🚀 Starting certificate masters initialization...");

    const results = {
      created: [],
      skipped: [],
      errors: [],
    };

    for (const certificateData of defaultCertificates) {
      try {
        // Check if certificate already exists
        const existingCertificate = await CertificateMaster.findOne({
          name: certificateData.name,
        });

        if (existingCertificate) {
          console.log(
            `⏭️  Skipping "${certificateData.name}" - already exists`,
          );
          results.skipped.push(certificateData.name);
          continue;
        }

        // Create new certificate
        const certificate = new CertificateMaster(certificateData);
        await certificate.save();

        console.log(
          `✅ Created "${certificateData.name}" with ID: ${certificate._id}`,
        );
        results.created.push({
          name: certificateData.name,
          id: certificate._id,
        });
      } catch (error) {
        console.error(
          `❌ Error creating "${certificateData.name}":`,
          error.message,
        );
        results.errors.push({
          name: certificateData.name,
          error: error.message,
        });
      }
    }

    // Display summary
    console.log("\n📊 Initialization Summary:");
    console.log(`✅ Created: ${results.created.length}`);
    console.log(`⏭️  Skipped: ${results.skipped.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);

    if (results.created.length > 0) {
      console.log("\n✅ Successfully created certificates:");
      results.created.forEach((certificate) => {
        console.log(`   - ${certificate.name} (ID: ${certificate.id})`);
      });
    }

    if (results.skipped.length > 0) {
      console.log("\n⏭️  Skipped existing certificates:");
      results.skipped.forEach((name) => {
        console.log(`   - ${name}`);
      });
    }

    if (results.errors.length > 0) {
      console.log("\n❌ Errors encountered:");
      results.errors.forEach((error) => {
        console.log(`   - ${error.name}: ${error.error}`);
      });
    }

    // Verify all certificates exist
    const totalCertificates = await CertificateMaster.countDocuments();
    console.log(`\n📈 Total certificates in database: ${totalCertificates}`);

    if (totalCertificates === defaultCertificates.length) {
      console.log("🎉 All default certificates are now available!");
    } else {
      console.log(
        "⚠️  Some certificates may be missing. Check the errors above.",
      );
    }
  } catch (error) {
    console.error("❌ Initialization failed:", error.message);
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await initializeCertificates();

    console.log("\n✨ Certificate masters initialization completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Script execution failed:", error.message);
    process.exit(1);
  }
};

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default initializeCertificates;
