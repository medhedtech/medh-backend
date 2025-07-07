import mongoose from "mongoose";

const certificateMasterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      required: [true, "Certificate name is required"],
      trim: true,
      enum: {
        values: [
          "Executive Diploma",
          "Professional Grad Diploma",
          "Foundational Certificate",
          "Advanced Certificate",
          "Professional Certificate",
          "Specialist Certificate",
          "Master Certificate",
          "Industry Certificate",
        ],
        message: "Certificate must be one of the predefined certificate types",
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    icon: {
      type: String,
      trim: true,
      default: "certificate-icon",
    },
    color: {
      type: String,
      trim: true,
      default: "#6B7280",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    metadata: {
      level: {
        type: String,
        enum: [
          "beginner",
          "intermediate",
          "advanced",
          "expert",
          "professional",
        ],
        default: "intermediate",
      },
      duration: {
        type: String,
        trim: true,
        default: "Self-paced",
      },
      prerequisites: [{ type: String, trim: true }],
      learningOutcomes: [{ type: String, trim: true }],
      targetAudience: [{ type: String, trim: true }],
      industryRecognition: {
        type: Boolean,
        default: false,
      },
      accreditation: {
        type: String,
        trim: true,
      },
    },
    stats: {
      totalCourses: { type: Number, default: 0 },
      totalEnrollments: { type: Number, default: 0 },
      totalCompletions: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      averageCompletionRate: { type: Number, default: 0, min: 0, max: 100 },
    },
    certificateInfo: {
      certificateType: {
        type: String,
        enum: [
          "diploma",
          "certificate",
          "professional",
          "specialist",
          "master",
          "industry",
        ],
        required: true,
      },
      validityPeriod: {
        type: String,
        trim: true,
        default: "Lifetime",
      },
      renewalRequired: {
        type: Boolean,
        default: false,
      },
      renewalPeriod: {
        type: String,
        trim: true,
      },
      issuingAuthority: {
        type: String,
        trim: true,
        default: "MEDH",
      },
      digitalBadge: {
        type: Boolean,
        default: true,
      },
      physicalCertificate: {
        type: Boolean,
        default: false,
      },
      certificateTemplate: {
        type: String,
        trim: true,
      },
    },
    requirements: {
      minimumCourses: { type: Number, default: 1 },
      minimumHours: { type: Number, default: 0 },
      minimumScore: { type: Number, default: 70, min: 0, max: 100 },
      mandatoryCourses: [{ type: String, trim: true }],
      electiveCourses: [{ type: String, trim: true }],
      assessmentRequired: {
        type: Boolean,
        default: true,
      },
      projectRequired: {
        type: Boolean,
        default: false,
      },
    },
    pricing: {
      basePrice: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
      discountAvailable: {
        type: Boolean,
        default: false,
      },
      discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
      installmentAvailable: {
        type: Boolean,
        default: false,
      },
      installmentCount: { type: Number, default: 1, min: 1, max: 12 },
    },
  },
  {
    timestamps: true,
    collection: "certificate_masters",
  },
);

// Indexes for better performance
certificateMasterSchema.index({ name: 1 });
certificateMasterSchema.index({ isActive: 1 });
certificateMasterSchema.index({ sortOrder: 1 });
certificateMasterSchema.index({ "metadata.level": 1 });
certificateMasterSchema.index({ "certificateInfo.certificateType": 1 });

// Pre-save middleware to update certificate info
certificateMasterSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.name = this.name.trim();
  }

  // Auto-set certificate type based on name
  if (this.isModified("name") && !this.certificateInfo.certificateType) {
    if (this.name.includes("Diploma")) {
      this.certificateInfo.certificateType = "diploma";
      this.metadata.level = "professional";
    } else if (this.name.includes("Certificate")) {
      this.certificateInfo.certificateType = "certificate";
      if (this.name.includes("Advanced")) {
        this.metadata.level = "advanced";
      } else if (this.name.includes("Foundational")) {
        this.metadata.level = "beginner";
      } else if (this.name.includes("Professional")) {
        this.metadata.level = "professional";
        this.certificateInfo.certificateType = "professional";
      } else if (this.name.includes("Specialist")) {
        this.metadata.level = "expert";
        this.certificateInfo.certificateType = "specialist";
      } else if (this.name.includes("Master")) {
        this.metadata.level = "expert";
        this.certificateInfo.certificateType = "master";
      } else if (this.name.includes("Industry")) {
        this.metadata.level = "professional";
        this.certificateInfo.certificateType = "industry";
      }
    }
  }

  next();
});

// Virtual for formatted name
certificateMasterSchema.virtual("displayName").get(function () {
  return this.name;
});

// Virtual for certificate level
certificateMasterSchema.virtual("certificateLevel").get(function () {
  return this.metadata.level;
});

// Method to update stats
certificateMasterSchema.methods.updateStats = async function () {
  // This method can be used to update stats from related collections
  // Implementation can be added later when needed
};

// Static method to get certificates by level
certificateMasterSchema.statics.getByLevel = function (level) {
  return this.find({ "metadata.level": level, isActive: true }).sort({
    sortOrder: 1,
  });
};

// Static method to get certificates by type
certificateMasterSchema.statics.getByType = function (type) {
  return this.find({
    "certificateInfo.certificateType": type,
    isActive: true,
  }).sort({ sortOrder: 1 });
};

// Static method to get industry-recognized certificates
certificateMasterSchema.statics.getIndustryRecognized = function () {
  return this.find({
    "metadata.industryRecognition": true,
    isActive: true,
  }).sort({ sortOrder: 1 });
};

const CertificateMaster = mongoose.model(
  "CertificateMaster",
  certificateMasterSchema,
);
export default CertificateMaster;
