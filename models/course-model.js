const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// Define PDF resource schema (previously missing)
const pdfResourceSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'PDF title is required'], 
    trim: true 
  },
  url: { 
    type: String,
    required: [true, 'PDF URL is required'],
    validate: {
      validator: function(v) {
        return /\.pdf($|\?|#)/.test(v) || 
               /\/pdf\//.test(v) || 
               /documents.*\.amazonaws\.com/.test(v) ||
               /drive\.google\.com/.test(v) ||
               /dropbox\.com/.test(v);
      },
      message: props => `${props.value} is not a valid PDF URL. URL must end with .pdf or be from a supported cloud storage provider.`
    }
  },
  description: { 
    type: String, 
    default: '',
    trim: true 
  },
  size_mb: { 
    type: Number, 
    min: [0, 'PDF size cannot be negative'],
    max: [50, 'PDF size cannot exceed 50MB'],
    default: null 
  },
  pages: { 
    type: Number, 
    min: [1, 'PDF must have at least 1 page'],
    default: null 
  },
  upload_date: { 
    type: Date, 
    default: Date.now 
  }
});

// Define FAQ schema
const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'FAQ question is required'],
    trim: true
  },
  answer: {
    type: String,
    required: [true, 'FAQ answer is required'],
    trim: true
  }
});

// Define curriculum week schema
const curriculumWeekSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Week ID is required'],
    unique: true
  },
  weekTitle: {
    type: String,
    required: [true, 'Week title is required'],
    trim: true
  },
  weekDescription: {
    type: String,
    trim: true
  },
  topics: [{
    type: String,
    trim: true
  }],
  sections: [{
    id: {
      type: String,
      required: [true, 'Section ID is required'],
      unique: true
    },
    title: {
      type: String,
      required: [true, 'Section title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    order: {
      type: Number,
      required: [true, 'Section order is required'],
      min: [0, 'Order cannot be negative']
    },
    lessons: [{
      type: String, // Reference to Lesson model's id
      required: [true, 'Lesson ID is required']
    }],
    resources: [{
      title: {
        type: String,
        required: [true, 'Resource title is required'],
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      fileUrl: {
        type: String,
        required: [true, 'Resource file URL is required']
      },
      type: {
        type: String,
        enum: ['pdf', 'document', 'video', 'audio', 'link'],
        required: [true, 'Resource type is required']
      }
    }]
  }]
}, { timestamps: true });

// Define tools and technologies schema
const toolTechnologySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tool/technology name is required'],
    trim: true
  },
  category: {
    type: String,
    enum: {
      values: ['programming_language', 'framework', 'library', 'tool', 'platform', 'other'],
      message: '{VALUE} is not a valid tool category'
    },
    default: 'other'
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  logo_url: {
    type: String,
    default: '',
    trim: true
  }
});

// Define bonus module schema
const bonusModuleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Bonus module title is required'],
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  resources: {
    type: [{
      title: { 
        type: String, 
        required: [true, 'Resource title is required'], 
        trim: true 
      },
      type: { 
        type: String, 
        enum: {
          values: ['video', 'pdf', 'link', 'other'],
          message: '{VALUE} is not a valid resource type'
        },
        required: [true, 'Resource type is required']
      },
      url: { 
        type: String,
        required: [true, 'Resource URL is required'],
        validate: {
          validator: function(v) {
            // Only validate if type is pdf
            if (this.type === 'pdf') {
              return /\.pdf($|\?|#)/.test(v) || 
                     /\/pdf\//.test(v) || 
                     /documents.*\.amazonaws\.com/.test(v) ||
                     /drive\.google\.com/.test(v) ||
                     /dropbox\.com/.test(v);
            }
            return true;
          },
          message: props => `${props.value} is not a valid PDF URL. URL must end with .pdf or be from a supported cloud storage provider.`
        }
      },
      description: { type: String, default: '', trim: true },
      // Additional fields for PDF resources
      size_mb: { 
        type: Number, 
        min: [0, 'PDF size cannot be negative'],
        max: [50, 'PDF size cannot exceed 50MB'],
        default: null 
      },
      pages: { 
        type: Number, 
        min: [1, 'PDF must have at least 1 page'],
        default: null 
      },
      upload_date: { 
        type: Date, 
        default: Date.now 
      }
    }],
    default: []
  }
});

// Define price schema for individual and batch pricing
const priceSchema = new mongoose.Schema({
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    trim: true,
    enum: {
      values: ['USD', 'EUR', 'INR', 'GBP', 'AUD', 'CAD'],
      message: '{VALUE} is not a supported currency'
    },
    uppercase: true
  },
  individual: {
    type: Number,
    min: [0, 'Individual price cannot be negative'],
    default: 0
  },
  batch: {
    type: Number,
    min: [0, 'Batch price cannot be negative'],
    default: 0
  },
  min_batch_size: {
    type: Number,
    min: [2, 'Minimum batch size must be at least 2'],
    default: 2
  },
  max_batch_size: {
    type: Number,
    min: [2, 'Maximum batch size must be at least 2'],
    default: 10,
    validate: {
      validator: function(v) {
        return v >= this.min_batch_size;
      },
      message: 'Maximum batch size must be greater than or equal to minimum batch size'
    }
  },
  early_bird_discount: {
    type: Number,
    min: [0, 'Early bird discount cannot be negative'],
    max: [100, 'Early bird discount cannot exceed 100%'],
    default: 0
  },
  group_discount: {
    type: Number,
    min: [0, 'Group discount cannot be negative'],
    max: [100, 'Group discount cannot exceed 100%'],
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  }
});

const courseSchema = new mongoose.Schema(
  {
    course_category: {
      type: String,
      required: [true, 'Course category is required'],
      trim: true,
      index: true
    },
    course_title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      index: true
    },
    course_tag: {
      type: String,
      enum: {
        values: ["Live", "Hybrid", "Pre-Recorded", "Free"],
        message: '{VALUE} is not a valid course tag'
      },
      required: [true, 'Course tag is required'],
      index: true
    },
    no_of_Sessions: {
      type: Number,
      min: [1, 'Number of sessions must be at least 1'],
      required: [true, 'Number of sessions is required']
    },
    course_duration: {
      type: String,
      required: [true, 'Course duration is required'],
      trim: true
    },
    session_duration: {
      type: String,
      required: [true, 'Session duration is required'],
      trim: true
    },
    course_description: {
      type: {
        program_overview: {
          type: String,
          required: [true, 'Program overview is required'],
          trim: true
        },
        benefits: {
          type: String,
          required: [true, 'Benefits description is required'],
          trim: true
        }
      },
      required: [true, 'Course description is required']
    },
    category: {
      type: String,
      trim: true
    },
    course_fee: {
      type: Number,
      min: [0, 'Course fee cannot be negative'],
      default: 0,
      index: true
    },
    // Add prices array for multiple currencies with individual and batch pricing
    prices: {
      type: [priceSchema],
      default: [],
      validate: {
        validator: function(prices) {
          if (prices.length === 0) return true;
          
          // Check for duplicate currencies
          const currencies = prices.map(p => p.currency);
          return new Set(currencies).size === currencies.length;
        },
        message: 'Duplicate currencies are not allowed in prices array'
      }
    },
    course_videos: {
      type: [String],
      default: [],
      validate: {
        validator: function(urls) {
          return urls.every(url => url && url.trim().length > 0);
        },
        message: 'Course video URLs cannot be empty strings'
      }
    },
    brochures: {
      type: [String],
      default: [],
      validate: {
        validator: function(urls) {
          return urls.every(url => 
            url && url.trim().length > 0 && (
              /\.pdf($|\?|#)/.test(url) || 
              /\/pdf\//.test(url) || 
              /documents.*\.amazonaws\.com/.test(url) ||
              /drive\.google\.com/.test(url) ||
              /dropbox\.com/.test(url)
            )
          );
        },
        message: 'Brochures must be valid PDF files'
      }
    },
    status: {
      type: String,
      enum: {
        values: ["Published", "Upcoming"],
        message: '{VALUE} is not a valid status'
      },
      default: "Upcoming",
      index: true
    },
    isFree: {
      type: Boolean,
      default: false,
      index: true
    },
    assigned_instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssignedInstructor",
      default: null
    },
    specifications: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null
    },
    unique_key: {
      type: String,
      unique: true,
      immutable: true
    },
    course_image: {
      type: String,
      required: [true, 'Course image URL is required'],
      trim: true
    },
    course_grade: {
      type: String,
      trim: true
    },
    resource_videos: {
      type: [String],
      default: [],
      validate: {
        validator: function(urls) {
          return urls.every(url => url && url.trim().length > 0);
        },
        message: 'Resource video URLs cannot be empty strings'
      }
    },
    resource_pdfs: {
      type: [pdfResourceSchema],
      default: []
    },
    curriculum: {
      type: [curriculumWeekSchema],
      default: []
    },
    // FAQs field
    faqs: {
      type: [faqSchema],
      default: []
    },
    // Tools and technologies field
    tools_technologies: {
      type: [toolTechnologySchema],
      default: []
    },
    // Bonus modules field
    bonus_modules: {
      type: [bonusModuleSchema],
      default: []
    },
    recorded_videos: {
      type: [String],
      default: [],
      validate: {
        validator: function(urls) {
          return urls.every(url => url && url.trim().length > 0);
        },
        message: 'Recorded video URLs cannot be empty strings'
      }
    },
    efforts_per_Week: {
      type: String,
      trim: true
    },
    class_type: {
      type: String,
      trim: true,
      enum: {
        values: ["Live Courses", "Blended Courses", "Self-Paced", "Virtual Learning", "Online Classes", "Hybrid", "Pre-Recorded"],
        message: '{VALUE} is not a valid class type'
      },
      required: [true, 'Class type is required'],
      index: true
    },
    is_Certification: {
      type: String,
      enum: {
        values: ["Yes", "No"],
        message: '{VALUE} is not a valid certification option'
      },
      required: [true, 'Certification status is required']
    },
    is_Assignments: {
      type: String,
      enum: {
        values: ["Yes", "No"],
        message: '{VALUE} is not a valid assignments option'
      },
      required: [true, 'Assignments status is required']
    },
    is_Projects: {
      type: String,
      enum: {
        values: ["Yes", "No"],
        message: '{VALUE} is not a valid projects option'
      },
      required: [true, 'Projects status is required']
    },
    is_Quizes: {
      type: String,
      enum: {
        values: ["Yes", "No"],
        message: '{VALUE} is not a valid quizzes option'
      },
      required: [true, 'Quizzes status is required']
    },
    related_courses: {
      type: [String],
      default: []
    },
    min_hours_per_week: {
      type: Number,
      min: [0, 'Minimum hours per week cannot be negative']
    },
    max_hours_per_week: {
      type: Number,
      min: [0, 'Maximum hours per week cannot be negative'],
      validate: {
        validator: function(v) {
          return this.min_hours_per_week === undefined || v >= this.min_hours_per_week;
        },
        message: 'Maximum hours per week must be greater than or equal to minimum hours per week'
      }
    },
    category_type: {
      type: String,
      enum: {
        values: ["Free", "Paid", "Live", "Hybrid", "Pre-Recorded"],
        message: '{VALUE} is not a valid category type'
      },
      default: "Paid",
      required: [true, 'Category type is required'],
      index: true
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
      index: true
    },
    meta: {
      views: {
        type: Number,
        default: 0,
        min: 0
      },
      ratings: {
        average: {
          type: Number,
          default: 0,
          min: 0,
          max: 5
        },
        count: {
          type: Number,
          default: 0,
          min: 0
        }
      },
      enrollments: {
        type: Number,
        default: 0,
        min: 0
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add text index for better search performance
courseSchema.index({
  course_title: 'text',
  course_category: 'text',
  'course_description.program_overview': 'text',
  'course_description.benefits': 'text',
  course_tag: 'text'
}, {
  weights: {
    course_title: 10,
    course_category: 5,
    'course_description.program_overview': 3,
    'course_description.benefits': 2,
    course_tag: 1
  },
  name: "CourseSearchIndex"
});

// Add compound indexes for common filter combinations
courseSchema.index({ category_type: 1, status: 1, course_fee: 1 });
courseSchema.index({ course_category: 1, isFree: 1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ slug: 1 }, { unique: true, sparse: true });

// Virtual for formatted duration
courseSchema.virtual('durationFormatted').get(function() {
  return this.course_duration;
});

// Virtual for price display
courseSchema.virtual('priceDisplay').get(function() {
  if (this.isFree) return 'Free';
  
  if (this.prices && this.prices.length > 0) {
    const defaultPrice = this.prices[0];
    return `${defaultPrice.currency} ${defaultPrice.individual}`;
  }
  
  return `INR ${this.course_fee}`;
});

// Add virtual fields for quizzes, assignments, and certificates
courseSchema.virtual('quizzes', {
  ref: 'Quiz',
  localField: '_id',
  foreignField: 'course'
});

courseSchema.virtual('assignments', {
  ref: 'Assignment',
  localField: '_id',
  foreignField: 'course'
});

courseSchema.virtual('certificates', {
  ref: 'Certificate',
  localField: '_id',
  foreignField: 'course'
});

// Add virtual fields for lessons
courseSchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'course'
});

// Add method to get course statistics
courseSchema.methods.getStatistics = async function() {
  const [totalStudents, averageRating, totalViews] = await Promise.all([
    this.model('Enrollment').countDocuments({ course: this._id }),
    this.model('Review').aggregate([
      { $match: { course: this._id, status: 'approved' } },
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]),
    this.model('Lesson').aggregate([
      { $match: { course: this._id } },
      { $group: { _id: null, total: { $sum: '$meta.views' } } }
    ])
  ]);

  return {
    totalStudents,
    averageRating: averageRating[0]?.avg || 0,
    totalViews: totalViews[0]?.total || 0,
    totalLessons: this.curriculum.reduce((sum, week) => 
      sum + week.sections.reduce((weekSum, section) => 
        weekSum + section.lessons.length, 0), 0),
    totalQuizzes: await this.model('Quiz').countDocuments({ course: this._id }),
    totalAssignments: await this.model('Assignment').countDocuments({ course: this._id }),
    totalCertificates: await this.model('Certificate').countDocuments({ course: this._id })
  };
};

// Add method to get student progress
courseSchema.methods.getStudentProgress = async function(studentId) {
  const [enrollment, progress] = await Promise.all([
    this.model('Enrollment').findOne({ course: this._id, student: studentId }),
    this.model('Progress').findOne({ course: this._id, student: studentId })
  ]);

  if (!enrollment || !progress) return null;

  const lessons = await this.model('Lesson').find({ course: this._id });
  const completedLessons = progress.lessonProgress.filter(p => p.status === 'completed');
  const completedQuizzes = progress.quizProgress.filter(p => p.status === 'completed');
  const completedAssignments = progress.assignmentProgress.filter(p => p.status === 'graded');

  return {
    enrollment,
    progress: {
      overall: progress.overallProgress,
      lessons: {
        total: lessons.length,
        completed: completedLessons.length,
        inProgress: progress.lessonProgress.length - completedLessons.length
      },
      quizzes: {
        total: await this.model('Quiz').countDocuments({ course: this._id }),
        completed: completedQuizzes.length
      },
      assignments: {
        total: await this.model('Assignment').countDocuments({ course: this._id }),
        completed: completedAssignments.length
      },
      certificate: await this.model('Certificate').findOne({
        course: this._id,
        student: studentId
      })
    }
  };
};

// Helper function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

// Automatically generate a unique key and slug before saving the document
courseSchema.pre("save", function (next) {
  // Generate unique_key if not already set
  if (!this.unique_key) {
    this.unique_key = uuidv4();
  }
  
  // Generate slug if not already set
  if (!this.slug && this.course_title) {
    this.slug = generateSlug(this.course_title);
  }
  
  // Auto-calculate isFree based on category_type
  this.isFree = (this.category_type === "Free");
  
  // Format efforts_per_Week if not provided but min/max hours are
  if (!this.efforts_per_Week && this.min_hours_per_week && this.max_hours_per_week) {
    this.efforts_per_Week = `${this.min_hours_per_week} - ${this.max_hours_per_week} hours / week`;
  }
  
  // Set course_fee based on the first batch price if available
  if (this.prices && this.prices.length > 0 && this.prices[0].batch) {
    this.course_fee = this.prices[0].batch;
  }
  
  // Update lastUpdated metadata
  if (this.isModified()) {
    this.meta.lastUpdated = Date.now();
  }
  
  // Assign IDs to weeks
  if (this.curriculum && this.curriculum.length > 0) {
    this.curriculum.forEach((week, weekIndex) => {
      // Assign week ID
      week.id = `week_${weekIndex + 1}`;
      
      // Assign section IDs
      if (week.sections && week.sections.length > 0) {
        week.sections.forEach((section, sectionIndex) => {
          section.id = `section_${weekIndex + 1}_${sectionIndex + 1}`;
          
          // Assign lesson IDs
          if (section.lessons && section.lessons.length > 0) {
            section.lessons.forEach((lesson, lessonIndex) => {
              lesson.id = `lesson_${weekIndex + 1}_${sectionIndex + 1}_${lessonIndex + 1}`;
              
              // Assign resource IDs
              if (lesson.resources && lesson.resources.length > 0) {
                lesson.resources.forEach((resource, resourceIndex) => {
                  resource.id = `resource_${weekIndex + 1}_${sectionIndex + 1}_${lessonIndex + 1}_${resourceIndex + 1}`;
                });
              }
              
              // Assign assignment IDs
              if (lesson.assignments && lesson.assignments.length > 0) {
                lesson.assignments.forEach((assignment, assignmentIndex) => {
                  assignment.id = `assignment_${weekIndex + 1}_${sectionIndex + 1}_${lessonIndex + 1}_${assignmentIndex + 1}`;
                });
              }
              
              // Assign quiz IDs
              if (lesson.quizzes && lesson.quizzes.length > 0) {
                lesson.quizzes.forEach((quiz, quizIndex) => {
                  quiz.id = `quiz_${weekIndex + 1}_${sectionIndex + 1}_${lessonIndex + 1}_${quizIndex + 1}`;
                  
                  // Assign question IDs
                  if (quiz.questions && quiz.questions.length > 0) {
                    quiz.questions.forEach((question, questionIndex) => {
                      question.id = `question_${weekIndex + 1}_${sectionIndex + 1}_${lessonIndex + 1}_${quizIndex + 1}_${questionIndex + 1}`;
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  }
  
  next();
});

// Method to safely update course metadata
courseSchema.methods.updateMetadata = async function(updates) {
  const allowedFields = ['views', 'ratings', 'enrollments'];
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      if (key === 'ratings' && typeof value === 'object') {
        if (value.average !== undefined) this.meta.ratings.average = value.average;
        if (value.count !== undefined) this.meta.ratings.count = value.count;
      } else {
        this.meta[key] = value;
      }
    }
  }
  
  await this.save();
  return this;
};

// Helper function to validate PDF URLs
courseSchema.statics.isValidPdfUrl = function(url) {
  return /\.pdf($|\?|#)/.test(url) || 
         /\/pdf\//.test(url) || 
         /documents.*\.amazonaws\.com/.test(url) ||
         /drive\.google\.com/.test(url) ||
         /dropbox\.com/.test(url);
};

// Static method to find by slug or ID
courseSchema.statics.findBySlugOrId = async function(identifier) {
  let course;
  
  // Try to find by ID first if it's a valid ObjectId
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    course = await this.findById(identifier);
  }
  
  // If not found or not a valid ObjectId, try to find by slug
  if (!course) {
    course = await this.findOne({ slug: identifier });
  }
  
  return course;
};

// Static method to search courses
courseSchema.statics.searchCourses = async function(options = {}) {
  const {
    query = {},
    sort = { createdAt: -1 },
    page = 1,
    limit = 10,
    projection = null
  } = options;
  
  const skip = (page - 1) * limit;
  
  const [courses, totalCount] = await Promise.all([
    this.find(query, projection).sort(sort).skip(skip).limit(limit).lean(),
    this.countDocuments(query)
  ]);
  
  return {
    courses,
    pagination: {
      total: totalCount,
      page,
      limit,
      pages: Math.ceil(totalCount / limit)
    }
  };
};

const Course = mongoose.model("Course", courseSchema);
module.exports = Course;
