import mongoose from 'mongoose';

const summaryItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: false, // Made optional
    trim: true
  },
  description: {
    type: String,
    required: false, // Made optional
    trim: true
  }
}, { _id: true });

const videoSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: false // Made optional since we're not using Cloudinary
  }
});

const summarySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  items: [summaryItemSchema]
});

const liveSessionSchema = new mongoose.Schema({
  sessionTitle: {
    type: String,
    required: [true, 'Session title is required'],
    trim: true,
    maxlength: 200
  },
  sessionNo: {
    type: String,
    required: [true, 'Session number is required'],
    unique: false, // Temporarily disabled, handled in controller
    trim: true,
    match: /^[A-Za-z0-9-_]+$/
  },
  originalSessionNo: {
    type: String,
    required: false,
    trim: true
  },
  courseCategory: {
    type: String,
    required: false, // Made optional since frontend doesn't send it
    enum: ['ai-data-science', 'web-development', 'business-analytics', 'AI and Data Science']
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student', // Updated to use Student collection
    required: [true, 'At least one student is required']
  }],
  grades: [{
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String
    required: [true, 'At least one grade is required']
  }],
  dashboard: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String
    required: [true, 'Dashboard assignment is required']
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor', // Updated to use Instructor collection
    required: [true, 'Instructor assignment is required']
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch', // Reference to Batch collection
    required: false // Made optional for backward compatibility
  },
  video: {
    type: videoSchema,
    required: false // Made optional since we removed video upload
  },
  date: {
    type: Date,
    required: [true, 'Session date is required']
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: 500
  },
  summary: {
    type: summarySchema,
    required: false // Made optional to simplify validation
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Made optional since we might not have user context
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
liveSessionSchema.index({ sessionNo: 1 });
liveSessionSchema.index({ courseCategory: 1, status: 1 });
liveSessionSchema.index({ date: 1 });
liveSessionSchema.index({ instructorId: 1 });
liveSessionSchema.index({ students: 1 });

// Virtual for formatted date
liveSessionSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for session duration (if needed)
liveSessionSchema.virtual('duration').get(function() {
  // This could be calculated based on video duration or session logs
  return null;
});

// Pre-save middleware to validate instructor-grade compatibility (disabled for now)
// liveSessionSchema.pre('save', async function(next) {
//   if (this.isModified('instructorId') || this.isModified('grades')) {
//     try {
//       const instructor = await mongoose.model('Instructor').findById(this.instructorId);
//       if (!instructor) {
//         return next(new Error('Instructor not found'));
//       }

//       // Check if instructor is qualified for the selected grades
//       // This is a simplified check - you might want to add more complex logic
//       const gradeIds = this.grades.map(grade => grade.toString());
//       const instructorGrades = instructor.qualifiedGrades || [];
      
//       const hasQualification = gradeIds.some(gradeId => 
//         instructorGrades.includes(gradeId)
//       );

//       if (!hasQualification) {
//         return next(new Error('Instructor is not qualified for the selected grades'));
//       }
//     } catch (error) {
//       return next(error);
//     }
//   }
//   next();
// });

// Static method to get upcoming sessions
liveSessionSchema.statics.getUpcomingSessions = function(courseCategory) {
  return this.find({
    courseCategory,
    status: 'scheduled',
    date: { $gte: new Date() }
  })
  .populate('students', 'full_name email')
  .populate('instructorId', 'full_name email')
  .populate('grades', 'name')
  .sort({ date: 1 });
};

// Static method to get sessions by instructor
liveSessionSchema.statics.getSessionsByInstructor = function(instructorId) {
  return this.find({ instructorId })
  .populate('students', 'full_name email')
  .populate('grades', 'name')
  .sort({ date: -1 });
};

// Instance method to start session
liveSessionSchema.methods.startSession = function() {
  this.status = 'live';
  return this.save();
};

// Instance method to complete session
liveSessionSchema.methods.completeSession = function() {
  this.status = 'completed';
  return this.save();
};

// Instance method to cancel session
liveSessionSchema.methods.cancelSession = function() {
  this.status = 'cancelled';
  return this.save();
};

const LiveSession = mongoose.model('LiveSession', liveSessionSchema);

export default LiveSession;
