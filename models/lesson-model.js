const mongoose = require("mongoose");

const videoContentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true
  },
  url: {
    type: String,
    required: [true, 'Video URL is required']
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Video duration is required']
  },
  thumbnail: {
    type: String,
    required: [true, 'Video thumbnail URL is required']
  },
  quality: [{
    type: String,
    enum: ['360p', '480p', '720p', '1080p', '4K'],
    default: ['720p']
  }],
  captions: [{
    language: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    }
  }],
  chapters: [{
    title: String,
    startTime: Number, // in seconds
    endTime: Number, // in seconds
    description: String
  }],
  downloadUrl: {
    type: String
  },
  isPreview: {
    type: Boolean,
    default: false
  }
});

const textContentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Content title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  format: {
    type: String,
    enum: ['markdown', 'html', 'plain'],
    default: 'markdown'
  },
  sections: [{
    title: String,
    content: String,
    order: Number
  }],
  estimatedReadingTime: {
    type: Number, // in minutes
    required: true
  }
});

const resourceSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Resource ID is required'],
    unique: true
  },
  title: {
    type: String,
    required: [true, 'Resource title is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['pdf', 'document', 'image', 'audio', 'link', 'code', 'other'],
    required: [true, 'Resource type is required']
  },
  description: {
    type: String,
    trim: true
  },
  fileUrl: {
    type: String,
    required: [true, 'Resource file URL is required']
  },
  filename: {
    type: String,
    required: [true, 'Resource filename is required']
  },
  mimeType: {
    type: String,
    required: [true, 'Resource MIME type is required']
  },
  size: {
    type: Number, // in bytes
    required: [true, 'Resource size is required']
  },
  duration: {
    type: Number, // in minutes (for audio/video resources)
    default: null
  },
  pages: {
    type: Number, // for PDFs
    default: null
  },
  isDownloadable: {
    type: Boolean,
    default: true
  },
  isPreview: {
    type: Boolean,
    default: false
  },
  metadata: {
    author: String,
    publisher: String,
    publishedDate: Date,
    version: String,
    language: String
  }
});

const lessonSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Lesson ID is required'],
    unique: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  section: {
    type: String, // Reference to section ID
    required: [true, 'Section ID is required']
  },
  title: {
    type: String,
    required: [true, 'Lesson title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  order: {
    type: Number,
    required: [true, 'Lesson order is required'],
    min: [0, 'Order cannot be negative']
  },
  type: {
    type: String,
    enum: ['video', 'text', 'mixed'],
    required: [true, 'Lesson type is required']
  },
  videoContent: {
    type: videoContentSchema
  },
  textContent: {
    type: textContentSchema
  },
  resources: [resourceSchema],
  prerequisites: [{
    type: String, // Reference to prerequisite lesson IDs
    required: true
  }],
  objectives: [{
    type: String,
    required: [true, 'Learning objective is required']
  }],
  duration: {
    type: Number, // in minutes
    required: [true, 'Lesson duration is required'],
    min: [0, 'Duration cannot be negative']
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  isPreview: {
    type: Boolean,
    default: false
  },
  meta: {
    views: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, { timestamps: true });

// Indexes for better query performance
lessonSchema.index({ course: 1, section: 1 });
lessonSchema.index({ 'meta.views': -1 });
lessonSchema.index({ 'meta.averageRating': -1 });
lessonSchema.index({ tags: 1 });

// Pre-save middleware to validate content based on lesson type
lessonSchema.pre('save', function(next) {
  if (this.type === 'video' && !this.videoContent) {
    next(new Error('Video content is required for video lessons'));
  } else if (this.type === 'text' && !this.textContent) {
    next(new Error('Text content is required for text lessons'));
  } else if (this.type === 'mixed' && (!this.videoContent || !this.textContent)) {
    next(new Error('Both video and text content are required for mixed lessons'));
  }
  next();
});

// Method to update lesson metadata
lessonSchema.methods.updateMetadata = async function(updates) {
  const allowedFields = ['views', 'averageRating', 'totalRatings'];
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      this.meta[key] = value;
    }
  }
  
  this.meta.lastUpdated = new Date();
  await this.save();
};

// Method to get lesson progress for a student
lessonSchema.methods.getStudentProgress = async function(studentId) {
  const progress = await mongoose.model('Progress').findOne({
    course: this.course,
    student: studentId
  });
  
  if (!progress) return null;
  
  return progress.lessonProgress.find(p => p.lessonId === this.id);
};

// Static method to get lessons by course
lessonSchema.statics.getLessonsByCourse = async function(courseId) {
  return this.find({ course: courseId }).sort({ order: 1 });
};

// Static method to get lessons by section
lessonSchema.statics.getLessonsBySection = async function(sectionId) {
  return this.find({ section: sectionId }).sort({ order: 1 });
};

// Static method to search lessons
lessonSchema.statics.searchLessons = async function(query) {
  return this.find({
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $regex: query, $options: 'i' } }
    ]
  }).sort({ 'meta.views': -1 });
};

const Lesson = mongoose.model("Lesson", lessonSchema);
module.exports = Lesson; 