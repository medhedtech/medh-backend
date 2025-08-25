import mongoose from "mongoose";
const { Schema } = mongoose;

const certificateTemplateSchema = new Schema(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    templateName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    fields: [{
      type: String,
      required: true,
    }],
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ["pdf", "html", "png", "jpg", "jpeg"],
      default: "png",
    },
    templateType: {
      type: String,
      enum: ["demo", "blended", "live-interaction", "custom"],
      default: "custom",
    },
    fileSize: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsed: {
      type: Date,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Generate templateId automatically
certificateTemplateSchema.pre("save", async function (next) {
  if (!this.templateId) {
    const count = await this.constructor.countDocuments();
    this.templateId = `TEMP${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

const CertificateTemplate = mongoose.model("CertificateTemplate", certificateTemplateSchema);
export default CertificateTemplate;
