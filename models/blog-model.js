import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      trim: true,
      default: null
    },
    content: {
      type: String
    },
    blog_link: { 
      type: String,
      default: null,
      validate: {
        validator: function(v) {
          // Allow null/undefined values
          if (!v) return true;
          // If value exists, validate as URL
          return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v);
        },
        message: props => `${props.value} is not a valid URL!`
      }
    },
    upload_image: { 
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function(v) {
          // Handle null/undefined
          if (!v) return false;

          // If it's a string, validate as URL
          if (typeof v === 'string') {
            const cleanUrl = v.replace(/^"|"$/g, '');
            return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(cleanUrl);
          }

          // If it's an object, validate it has a url property
          if (typeof v === 'object' && v !== null) {
            if (v.url) {
              const cleanUrl = v.url.replace(/^"|"$/g, '');
              return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(cleanUrl);
            }
          }

          return false;
        },
        message: props => `${JSON.stringify(props.value)} is not a valid image URL or upload response!`
      },
      set: function(v) {
        // If it's a string, clean it
        if (typeof v === 'string') {
          return v.replace(/^"|"$/g, '');
        }
        
        // If it's an object with a url property, extract and clean the URL
        if (typeof v === 'object' && v !== null && v.url) {
          return v.url.replace(/^"|"$/g, '');
        }
        
        return v;
      }
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    tags: [{
      type: String,
      trim: true
    }],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published'
    },
    featured: {
      type: Boolean,
      default: false
    },
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    comments: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true,
        trim: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    meta_title: {
      type: String,
      trim: true,
      maxlength: 60
    },
    meta_description: {
      type: String,
      trim: true,
      maxlength: 160
    },
    reading_time: {
      type: Number
    },
    slug: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Create text index for search functionality
blogSchema.index({ title: 'text', description: 'text', content: 'text' });

// Index for better query performance
blogSchema.index({ author: 1 });
blogSchema.index({ status: 1 });
blogSchema.index({ categories: 1 });

// Virtual for comment count
blogSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Pre-save middleware to generate reading time and slug
blogSchema.pre('save', async function(next) {
  try {
    // Generate reading time
    if (this.content || this.description) {
      const wordsPerMinute = 200;
      const content = this.content || this.description;
      const words = content.trim().split(/\s+/).length;
      this.reading_time = Math.ceil(words / wordsPerMinute);
    }

    // Generate slug from title if not provided
    if (this.title && !this.slug) {
      let baseSlug = this.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      // Check if the slug already exists
      let slug = baseSlug;
      let counter = 1;
      let slugExists = true;
      
      while (slugExists) {
        // Don't check against the current document when updating
        const query = { 
          slug: slug,
          _id: { $ne: this._id } // Exclude current document
        };
        
        const existingBlog = await mongoose.models.blogs.findOne(query);
        
        if (!existingBlog) {
          slugExists = false;
        } else {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
      }
      
      this.slug = slug;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Pre-find middleware to populate categories
blogSchema.pre('find', function() {
  this.populate('categories', 'category_name category_image');
});

blogSchema.pre('findOne', function() {
  this.populate('categories', 'category_name category_image');
});

// Method to increment views
blogSchema.methods.incrementViews = async function() {
  this.views += 1;
  return this.save();
};

// Method to increment likes
blogSchema.methods.incrementLikes = async function() {
  this.likes += 1;
  return this.save();
};

// Static method to get featured blogs
blogSchema.statics.getFeatured = function(limit = 5) {
  return this.find({ 
    featured: true,
    status: 'published'
  })
  .populate('author', 'name email')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to get blogs by category
blogSchema.statics.getByCategory = function(categoryId, limit = 10) {
  return this.find({
    categories: categoryId,
    status: 'published'
  })
  .populate('author', 'name email')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to get blogs by tag
blogSchema.statics.getByTag = function(tag, limit = 10) {
  return this.find({
    tags: tag,
    status: 'published'
  })
  .populate('author', 'name email')
  .sort({ createdAt: -1 })
  .limit(limit);
};

const BlogsModel = mongoose.model("blogs", blogSchema);
export default BlogsModel;
