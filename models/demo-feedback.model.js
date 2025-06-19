import mongoose from "mongoose";

const demoFeedbackSchema = new mongoose.Schema(
  {
    // Reference to the demo booking
    demoBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DemoBooking",
      required: true,
      index: true,
    },
    
    // User who provided the feedback
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    // Overall rating (1-5 stars)
    overallRating: {
      type: Number,
      required: true,
      min: [1, "Overall rating must be at least 1"],
      max: [5, "Overall rating cannot exceed 5"],
      validate: {
        validator: Number.isInteger,
        message: "Overall rating must be an integer"
      }
    },
    
    // Content quality rating
    contentQuality: {
      type: String,
      required: true,
      enum: {
        values: ["excellent", "good", "average", "poor"],
        message: "Content quality must be one of: excellent, good, average, poor"
      }
    },
    
    // Instructor performance rating
    instructorPerformance: {
      type: String,
      required: true,
      enum: {
        values: ["excellent", "good", "average", "poor"],
        message: "Instructor performance must be one of: excellent, good, average, poor"
      }
    },
    
    // Additional comments
    additionalComments: {
      type: String,
      trim: true,
      maxlength: [2000, "Additional comments cannot exceed 2000 characters"],
    },
    
    // Recommendation status
    wouldRecommend: {
      type: Boolean,
      required: true,
    },
    
    // Specific feedback categories (optional detailed feedback)
    specificFeedback: {
      // Demo structure and flow
      demoStructure: {
        rating: {
          type: String,
          enum: ["excellent", "good", "average", "poor"],
        },
        comments: {
          type: String,
          trim: true,
          maxlength: [500, "Demo structure comments cannot exceed 500 characters"],
        }
      },
      
      // Technical aspects
      technicalAspects: {
        rating: {
          type: String,
          enum: ["excellent", "good", "average", "poor"],
        },
        comments: {
          type: String,
          trim: true,
          maxlength: [500, "Technical aspects comments cannot exceed 500 characters"],
        }
      },
      
      // Interaction and engagement
      interaction: {
        rating: {
          type: String,
          enum: ["excellent", "good", "average", "poor"],
        },
        comments: {
          type: String,
          trim: true,
          maxlength: [500, "Interaction comments cannot exceed 500 characters"],
        }
      },
      
      // Relevance to needs
      relevance: {
        rating: {
          type: String,
          enum: ["excellent", "good", "average", "poor"],
        },
        comments: {
          type: String,
          trim: true,
          maxlength: [500, "Relevance comments cannot exceed 500 characters"],
        }
      }
    },
    
    // What they liked most
    likedMost: {
      type: String,
      trim: true,
      maxlength: [1000, "Liked most cannot exceed 1000 characters"],
    },
    
    // Areas for improvement
    improvementAreas: {
      type: String,
      trim: true,
      maxlength: [1000, "Improvement areas cannot exceed 1000 characters"],
    },
    
    // Follow-up interest
    followUpInterest: {
      enrollmentInterest: {
        type: Boolean,
        default: false,
      },
      consultationRequest: {
        type: Boolean,
        default: false,
      },
      moreInfoRequest: {
        type: Boolean,
        default: false,
      },
      specificCourseInterest: {
        type: String,
        trim: true,
      }
    },
    
    // Feedback metadata
    feedbackSource: {
      type: String,
      enum: ["email_link", "website_form", "mobile_app", "phone_call", "other"],
      default: "website_form",
    },
    
    // IP and user agent for analytics
    ipAddress: {
      type: String,
    },
    
    userAgent: {
      type: String,
    },
    
    // Admin/Instructor response
    adminResponse: {
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      responseText: {
        type: String,
        trim: true,
        maxlength: [1000, "Admin response cannot exceed 1000 characters"],
      },
      responseDate: {
        type: Date,
      },
      isPublic: {
        type: Boolean,
        default: false,
      }
    },
    
    // Status tracking
    status: {
      type: String,
      enum: ["pending", "reviewed", "responded", "archived"],
      default: "pending",
      index: true,
    },
    
    // Internal notes for team
    internalNotes: {
      type: String,
      trim: true,
      maxlength: [1000, "Internal notes cannot exceed 1000 characters"],
    },
    
    // Tags for categorization
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    
    // Priority level for follow-up
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    
    // Sentiment analysis (can be auto-generated)
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1,
    },
    
    // Soft delete
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
demoFeedbackSchema.index({ demoBookingId: 1, userId: 1 }, { unique: true }); // One feedback per user per demo
demoFeedbackSchema.index({ overallRating: 1 });
demoFeedbackSchema.index({ contentQuality: 1 });
demoFeedbackSchema.index({ instructorPerformance: 1 });
demoFeedbackSchema.index({ wouldRecommend: 1 });
demoFeedbackSchema.index({ status: 1 });
demoFeedbackSchema.index({ priority: 1 });
demoFeedbackSchema.index({ createdAt: -1 });

// Virtual for average rating calculation
demoFeedbackSchema.virtual('averageRating').get(function() {
  const ratings = [];
  
  if (this.overallRating) ratings.push(this.overallRating);
  
  // Convert string ratings to numbers for calculation
  const ratingMap = { excellent: 5, good: 4, average: 3, poor: 2 };
  
  if (this.contentQuality) ratings.push(ratingMap[this.contentQuality] || 3);
  if (this.instructorPerformance) ratings.push(ratingMap[this.instructorPerformance] || 3);
  
  if (this.specificFeedback) {
    Object.values(this.specificFeedback).forEach(feedback => {
      if (feedback.rating) {
        ratings.push(ratingMap[feedback.rating] || 3);
      }
    });
  }
  
  return ratings.length > 0 ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : null;
});

// Virtual for feedback summary
demoFeedbackSchema.virtual('feedbackSummary').get(function() {
  return {
    overallRating: this.overallRating,
    contentQuality: this.contentQuality,
    instructorPerformance: this.instructorPerformance,
    wouldRecommend: this.wouldRecommend,
    hasComments: !!(this.additionalComments && this.additionalComments.length > 0),
    averageRating: this.averageRating,
    submittedAt: this.createdAt
  };
});

// Pre-save middleware to generate tags based on feedback content
demoFeedbackSchema.pre('save', function(next) {
  // Auto-generate tags based on feedback content
  const autoTags = [];
  
  if (this.overallRating >= 4) autoTags.push('positive');
  if (this.overallRating <= 2) autoTags.push('negative');
  if (this.wouldRecommend) autoTags.push('recommended');
  if (!this.wouldRecommend) autoTags.push('not-recommended');
  
  if (this.contentQuality === 'excellent') autoTags.push('excellent-content');
  if (this.instructorPerformance === 'excellent') autoTags.push('excellent-instructor');
  
  if (this.followUpInterest?.enrollmentInterest) autoTags.push('enrollment-interest');
  if (this.followUpInterest?.consultationRequest) autoTags.push('consultation-request');
  
  // Merge with existing tags
  this.tags = [...new Set([...this.tags, ...autoTags])];
  
  next();
});

// Static method to get feedback statistics
demoFeedbackSchema.statics.getFeedbackStats = async function(filters = {}) {
  const pipeline = [
    {
      $match: {
        isActive: true,
        ...filters
      }
    },
    {
      $group: {
        _id: null,
        totalFeedbacks: { $sum: 1 },
        averageOverallRating: { $avg: '$overallRating' },
        recommendationRate: {
          $avg: {
            $cond: ['$wouldRecommend', 1, 0]
          }
        },
        contentQualityDistribution: {
          $push: '$contentQuality'
        },
        instructorPerformanceDistribution: {
          $push: '$instructorPerformance'
        },
        ratingDistribution: {
          $push: '$overallRating'
        }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to get instructor-specific feedback
demoFeedbackSchema.statics.getInstructorFeedback = async function(instructorId, limit = 10) {
  return this.find({ isActive: true })
    .populate({
      path: 'demoBookingId',
      match: { instructorId: instructorId },
      select: 'instructorId scheduledDateTime demoType'
    })
    .populate('userId', 'full_name email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec()
    .then(results => results.filter(feedback => feedback.demoBookingId));
};

const DemoFeedback = mongoose.model("DemoFeedback", demoFeedbackSchema);

export default DemoFeedback; 