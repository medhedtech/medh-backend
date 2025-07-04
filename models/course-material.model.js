import mongoose from "mongoose";

const courseMaterialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Material title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["document", "video", "assignment", "other"],
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
      index: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: [true, "Lesson reference is required"],
      index: true,
    },
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
    },
    fileType: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number, // in bytes
    },
    duration: {
      type: Number, // in seconds, for videos
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    meta: {
      views: {
        type: Number,
        default: 0,
      },
      downloads: {
        type: Number,
        default: 0,
      },
      lastAccessed: {
        type: Date,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for text search
courseMaterialSchema.index({
  title: "text",
  description: "text",
  tags: "text",
});

// Method to increment view count
courseMaterialSchema.methods.incrementViews = async function() {
  this.meta.views += 1;
  this.meta.lastAccessed = new Date();
  return this.save();
};

// Method to increment download count
courseMaterialSchema.methods.incrementDownloads = async function() {
  this.meta.downloads += 1;
  return this.save();
};

// Static method to get materials by course
courseMaterialSchema.statics.getMaterialsByCourse = async function(courseId) {
  return this.find({ course: courseId, isPublished: true })
    .sort({ order: 1, createdAt: -1 });
};

// Static method to search materials
courseMaterialSchema.statics.searchMaterials = async function(query, filters = {}) {
  const searchQuery = {
    isPublished: true,
    ...filters,
    $text: { $search: query }
  };
  
  return this.find(searchQuery)
    .sort({ score: { $meta: "textScore" } });
};

const CourseMaterial = mongoose.models.CourseMaterial || mongoose.model("CourseMaterial", courseMaterialSchema);
export default CourseMaterial; 