import mongoose from "mongoose";
const { Schema } = mongoose;

const generatedCertificateSchema = new Schema(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "CertificateTemplate",
      required: true,
    },
    studentData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    generatedFileUrl: {
      type: String,
      required: true,
    },
    certificateNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ["generated", "issued", "revoked"],
      default: "generated",
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Generate certificateId automatically
generatedCertificateSchema.pre("save", async function (next) {
  if (!this.certificateId) {
    const count = await this.constructor.countDocuments();
    this.certificateId = `CERT${String(count + 1).padStart(6, "0")}`;
  }
  
  // Generate certificate number if not provided
  if (!this.certificateNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const count = await this.constructor.countDocuments({
      issuedAt: {
        $gte: new Date(year, date.getMonth(), 1),
        $lt: new Date(year, date.getMonth() + 1, 1),
      },
    });
    this.certificateNumber = `MEDH-${year}${month}-${String(count + 1).padStart(4, "0")}`;
  }
  
  next();
});

const GeneratedCertificate = mongoose.model("GeneratedCertificate", generatedCertificateSchema);
export default GeneratedCertificate;
