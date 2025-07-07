import CertificateMaster from "../models/certificate-master-model.js";
import Course from "../models/course-model.js";

// Create a new certificate master
export const createCertificateMaster = async (req, res) => {
  try {
    const {
      name,
      description,
      icon,
      color,
      isActive,
      sortOrder,
      metadata,
      certificateInfo,
      requirements,
      pricing,
    } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Certificate name is required",
      });
    }

    // Check for duplicate certificate name
    const existingCertificate = await CertificateMaster.findOne({ name });
    if (existingCertificate) {
      return res.status(400).json({
        success: false,
        message: "Certificate with this name already exists",
      });
    }

    const certificate = new CertificateMaster({
      name,
      description,
      icon,
      color,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
      metadata,
      certificateInfo,
      requirements,
      pricing,
    });

    await certificate.save();

    res.status(201).json({
      success: true,
      message: "Certificate created successfully",
      data: certificate,
    });
  } catch (error) {
    console.error("Error creating certificate:", error);
    res.status(500).json({
      success: false,
      message: "Error creating certificate",
      error: error.message,
    });
  }
};

// Get all certificate masters
export const getCertificateMasters = async (req, res) => {
  try {
    const {
      isActive,
      level,
      certificateType,
      industryRecognition,
      sortBy = "sortOrder",
      order = "asc",
      limit,
      page = 1,
    } = req.query;

    // Build query
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }
    if (level) {
      query["metadata.level"] = level;
    }
    if (certificateType) {
      query["certificateInfo.certificateType"] = certificateType;
    }
    if (industryRecognition !== undefined) {
      query["metadata.industryRecognition"] = industryRecognition === "true";
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = order === "desc" ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * (parseInt(limit) || 0);
    const limitNum = parseInt(limit) || 0;

    let certificatesQuery = CertificateMaster.find(query).sort(sort);

    if (limitNum > 0) {
      certificatesQuery = certificatesQuery.skip(skip).limit(limitNum);
    }

    const certificates = await certificatesQuery;

    // Get total count for pagination
    const total = await CertificateMaster.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Certificates fetched successfully",
      data: certificates,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error) {
    console.error("Error fetching certificates:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching certificates",
      error: error.message,
    });
  }
};

// Get a single certificate master by ID
export const getCertificateMasterById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Certificate ID is required",
      });
    }

    const certificate = await CertificateMaster.findById(id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Certificate fetched successfully",
      data: certificate,
    });
  } catch (error) {
    console.error("Error fetching certificate:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching certificate",
      error: error.message,
    });
  }
};

// Update a certificate master by ID
export const updateCertificateMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      icon,
      color,
      isActive,
      sortOrder,
      metadata,
      certificateInfo,
      requirements,
      pricing,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Certificate ID is required",
      });
    }

    // Check if certificate exists
    const existingCertificate = await CertificateMaster.findById(id);
    if (!existingCertificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    // Check for duplicate name if name is being updated
    if (name && name !== existingCertificate.name) {
      const duplicateCertificate = await CertificateMaster.findOne({ name });
      if (duplicateCertificate) {
        return res.status(400).json({
          success: false,
          message: "Certificate with this name already exists",
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (certificateInfo !== undefined)
      updateData.certificateInfo = certificateInfo;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (pricing !== undefined) updateData.pricing = pricing;

    const updatedCertificate = await CertificateMaster.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Certificate updated successfully",
      data: updatedCertificate,
    });
  } catch (error) {
    console.error("Error updating certificate:", error);
    res.status(500).json({
      success: false,
      message: "Error updating certificate",
      error: error.message,
    });
  }
};

// Delete a certificate master by ID
export const deleteCertificateMaster = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Certificate ID is required",
      });
    }

    // Check if certificate exists
    const certificate = await CertificateMaster.findById(id);
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    // Check if there are any courses associated with this certificate
    const associatedCourses = await Course.find({ certificate_type: id });
    if (associatedCourses.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete certificate with associated courses",
        associatedCoursesCount: associatedCourses.length,
      });
    }

    await CertificateMaster.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Certificate deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting certificate:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting certificate",
      error: error.message,
    });
  }
};

// Get certificate with associated courses
export const getCertificateMasterDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Certificate ID is required",
      });
    }

    const certificate = await CertificateMaster.findById(id);
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    // Get associated courses
    const associatedCourses = await Course.find({ certificate_type: id })
      .select("course_title course_category course_duration prices status")
      .limit(10);

    res.status(200).json({
      success: true,
      message: "Certificate details fetched successfully",
      data: {
        certificate,
        associatedCourses,
        stats: {
          coursesCount: associatedCourses.length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching certificate details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching certificate details",
      error: error.message,
    });
  }
};

// Get certificates by level
export const getCertificatesByLevel = async (req, res) => {
  try {
    const { level } = req.params;

    if (!level) {
      return res.status(400).json({
        success: false,
        message: "Certificate level is required",
      });
    }

    const validLevels = [
      "beginner",
      "intermediate",
      "advanced",
      "expert",
      "professional",
    ];
    if (!validLevels.includes(level)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid certificate level. Must be one of: beginner, intermediate, advanced, expert, professional",
      });
    }

    const certificates = await CertificateMaster.getByLevel(level);

    res.status(200).json({
      success: true,
      message: `Certificates with ${level} level fetched successfully`,
      data: certificates,
    });
  } catch (error) {
    console.error("Error fetching certificates by level:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching certificates by level",
      error: error.message,
    });
  }
};

// Get certificates by type
export const getCertificatesByType = async (req, res) => {
  try {
    const { type } = req.params;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Certificate type is required",
      });
    }

    const validTypes = [
      "diploma",
      "certificate",
      "professional",
      "specialist",
      "master",
      "industry",
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid certificate type. Must be one of: diploma, certificate, professional, specialist, master, industry",
      });
    }

    const certificates = await CertificateMaster.getByType(type);

    res.status(200).json({
      success: true,
      message: `${type} certificates fetched successfully`,
      data: certificates,
    });
  } catch (error) {
    console.error("Error fetching certificates by type:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching certificates by type",
      error: error.message,
    });
  }
};

// Get industry-recognized certificates
export const getIndustryRecognizedCertificates = async (req, res) => {
  try {
    const certificates = await CertificateMaster.getIndustryRecognized();

    res.status(200).json({
      success: true,
      message: "Industry-recognized certificates fetched successfully",
      data: certificates,
    });
  } catch (error) {
    console.error("Error fetching industry-recognized certificates:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching industry-recognized certificates",
      error: error.message,
    });
  }
};

// Bulk create default certificates
export const createDefaultCertificates = async (req, res) => {
  try {
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
          prerequisites: [
            "Foundational knowledge",
            "Basic experience in field",
          ],
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

    const createdCertificates = [];
    const errors = [];

    for (const certificateData of defaultCertificates) {
      try {
        const existingCertificate = await CertificateMaster.findOne({
          name: certificateData.name,
        });
        if (existingCertificate) {
          errors.push(`Certificate "${certificateData.name}" already exists`);
          continue;
        }

        const certificate = new CertificateMaster(certificateData);
        await certificate.save();
        createdCertificates.push(certificate);
      } catch (error) {
        errors.push(
          `Error creating "${certificateData.name}": ${error.message}`,
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Default certificates creation completed",
      data: {
        created: createdCertificates,
        errors: errors.length > 0 ? errors : null,
      },
    });
  } catch (error) {
    console.error("Error creating default certificates:", error);
    res.status(500).json({
      success: false,
      message: "Error creating default certificates",
      error: error.message,
    });
  }
};
