const BlogsModel = require("../models/blog-model");
const slugify = require("slugify");
const { validateBlog, validateComment, validateBlogStatus } = require("../utils/validators");
const { handleBase64Upload } = require("./upload/uploadController");

// Create a new blog post
const createBlog = async (req, res) => {
  try {
    const { error } = validateBlog(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { 
      title, 
      content, 
      description, 
      blog_link, 
      upload_image, 
      categories, 
      tags, 
      meta_title, 
      meta_description 
    } = req.body;

    // Handle image upload if it's a base64 string
    let imageUrl = upload_image;
    if (upload_image && typeof upload_image === 'string') {
      // Only attempt base64 processing if it looks like a base64 string
      if (upload_image.startsWith('data:image')) {
        try {
          console.log('Processing base64 image upload, length:', upload_image.length);
          
          // Create a mock request and response object for the upload controller
          const mockReq = {
            body: {
              base64String: upload_image,
              fileType: 'image'
            },
            user: req.user // Pass the authenticated user
          };
          
          const mockRes = {
            status: function(code) {
              this.statusCode = code;
              return this;
            },
            json: function(data) {
              if (data.success) {
                // Extract the URL and remove any extra quotes
                imageUrl = data.data.url.replace(/^"|"$/g, '');
                console.log('Image upload successful, URL:', imageUrl);
              } else {
                console.error('Image upload failed:', data.message);
                throw new Error(data.message);
              }
            }
          };

          await handleBase64Upload(mockReq, mockRes);
        } catch (error) {
          console.error('Error uploading image:', error);
          return res.status(400).json({
            success: false,
            message: "Failed to upload image",
            error: error.message
          });
        }
      } else {
        // Not a base64 string, assume it's a direct URL
        console.log('Using direct image URL:', upload_image);
      }
    } else if (!upload_image) {
      return res.status(400).json({
        success: false,
        message: "upload_image is required",
      });
    }
    
    // Detailed logging of the request and user object
    console.log('Request headers:', req.headers);
    console.log('Request user:', JSON.stringify(req.user, null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Extract author ID from the authenticated user
    let authorId;
    if (req.user && req.user.user && req.user.user.id) {
      authorId = req.user.user.id;
      console.log('Using author ID from user.user.id:', authorId);
    } else if (req.user && req.user._id) {
      authorId = req.user._id;
      console.log('Using author ID from user._id:', authorId);
    } else if (req.user && req.user.id) {
      authorId = req.user.id;
      console.log('Using author ID from user.id:', authorId);
    } else {
      console.log('No valid user ID found in request');
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        error: "User ID not found in request",
        debug: {
          user: req.user,
          headers: req.headers
        }
      });
    }

    // Create the blog with explicit author ID
    const newBlog = new BlogsModel({
      title,
      description,
      content,
      blog_link,
      upload_image: imageUrl,
      categories,
      tags,
      meta_title,
      meta_description,
      author: authorId,
      status: 'published'
    });
    
    console.log('Creating blog with data:', JSON.stringify(newBlog, null, 2));
    
    await newBlog.save();

    // Populate the categories and author
    await newBlog.populate(['categories', 'author']);

    res.status(201).json({
      success: true,
      message: "Blog post created successfully",
      data: newBlog,
    });
  } catch (err) {
    console.error("Error creating blog post:", err.message);
    console.error("Full error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
      debug: {
        stack: err.stack,
        user: req.user
      }
    });
  }
};

// Get all blog posts with pagination and filters
const getAllBlogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, // Default to published only
      sort_by = 'createdAt',
      sort_order = 'desc',
      with_content = 'false', // Default to false for public routes
      count_only = 'false'
    } = req.query;
    
    const skip = (page - 1) * limit;
    const sort = {};
    sort[sort_by] = sort_order === 'desc' ? -1 : 1;

    // Build query
    const query = { status }; // Always filter by status for public routes
    
    // Build projection based on with_content parameter
    const projection = with_content === 'false' ? {
      content: 0
    } : {};

    // If count_only is true, just return the count
    if (count_only === 'true') {
      const total = await BlogsModel.countDocuments(query);
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      });
    }

    const blogs = await BlogsModel.find(query)
      .select(projection)
      .populate('author', 'name email')
      .populate('categories', 'category_name category_image')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await BlogsModel.countDocuments(query);

    res.status(200).json({
      success: true,
      data: blogs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("Error fetching blogs:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Search blogs
const searchBlogs = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const blogs = await BlogsModel.find(
      { 
        $text: { $search: query },
        status: 'published' // Only search published blogs
      },
      { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .populate('author', 'name email')
    .populate('categories', 'category_name category_image');

    res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (err) {
    console.error("Error searching blogs:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Get featured blogs
const getFeaturedBlogs = async (req, res) => {
  try {
    const blogs = await BlogsModel.find({ 
      featured: true,
      status: 'published'
    })
    .populate('author', 'name email')
    .populate('categories', 'category_name category_image')
    .sort({ createdAt: -1 })
    .limit(5);

    res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (err) {
    console.error("Error fetching featured blogs:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Get blog by slug
const getBlogBySlug = async (req, res) => {
  try {
    // First find the blog without updating it
    const blog = await BlogsModel.findOne({ slug: req.params.slug })
      .populate('author', 'name email')
      .populate('categories', 'category_name category_image')
      .populate('comments.user', 'name email');

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found"
      });
    }

    // Return the blog without incrementing views to avoid validation issues
    res.status(200).json({
      success: true,
      data: blog,
    });

    // Increment views in a separate operation that doesn't affect the response
    try {
      await BlogsModel.findByIdAndUpdate(blog._id, { $inc: { views: 1 } }, { 
        new: false,
        runValidators: false // Skip validation when updating views
      });
    } catch (viewErr) {
      console.error("Error incrementing views (non-critical):", viewErr.message);
    }
  } catch (err) {
    console.error("Error fetching blog:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Get blog by ID
const getBlogById = async (req, res) => {
  try {
    // First find the blog without updating it
    const blog = await BlogsModel.findById(req.params.id)
      .populate('author', 'name email')
      .populate('categories', 'category_name category_image')
      .populate('comments.user', 'name email');

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found"
      });
    }

    // Return the blog without incrementing views to avoid validation issues
    res.status(200).json({
      success: true,
      data: blog,
    });

    // Increment views in a separate operation that doesn't affect the response
    try {
      await BlogsModel.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { 
        new: false,
        runValidators: false // Skip validation when updating views
      });
    } catch (viewErr) {
      console.error("Error incrementing views (non-critical):", viewErr.message);
    }
  } catch (err) {
    console.error("Error fetching blog:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Get blogs by category
const getBlogsByCategory = async (req, res) => {
  try {
    const blogs = await BlogsModel.find({
      categories: req.params.category,
      status: 'published'
    })
    .populate('author', 'name email')
    .populate('categories', 'category_name category_image')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (err) {
    console.error("Error fetching blogs by category:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Get blogs by tag
const getBlogsByTag = async (req, res) => {
  try {
    const blogs = await BlogsModel.find({
      tags: req.params.tag,
      status: 'published'
    })
    .populate('author', 'name email')
    .populate('categories', 'category_name category_image')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (err) {
    console.error("Error fetching blogs by tag:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Update blog status
const updateBlogStatus = async (req, res) => {
  try {
    const { error } = validateBlogStatus(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { status } = req.body;
    const blog = await BlogsModel.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found"
      });
    }

    // Check if user is the author
    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this blog"
      });
    }

    blog.status = status;
    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog status updated successfully",
      data: blog,
    });
  } catch (err) {
    console.error("Error updating blog status:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Toggle featured status
const toggleFeatured = async (req, res) => {
  try {
    const blog = await BlogsModel.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found"
      });
    }

    blog.featured = !blog.featured;
    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog featured status updated successfully",
      data: blog,
    });
  } catch (err) {
    console.error("Error toggling featured status:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Like a blog
const likeBlog = async (req, res) => {
  try {
    const blog = await BlogsModel.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found"
      });
    }

    blog.likes += 1;
    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog liked successfully",
      data: blog,
    });
  } catch (err) {
    console.error("Error liking blog:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Add comment to blog
const addComment = async (req, res) => {
  try {
    const { error } = validateComment(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { content } = req.body;
    const blog = await BlogsModel.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found"
      });
    }

    blog.comments.push({
      user: req.user._id,
      content
    });

    await blog.save();

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: blog,
    });
  } catch (err) {
    console.error("Error adding comment:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Delete comment
const deleteComment = async (req, res) => {
  try {
    const blog = await BlogsModel.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found"
      });
    }

    const comment = blog.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    // Check if user is the comment author or blog author
    if (comment.user.toString() !== req.user._id.toString() && 
        blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment"
      });
    }

    comment.remove();
    await blog.save();

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      data: blog,
    });
  } catch (err) {
    console.error("Error deleting comment:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Update blog post
const updateBlog = async (req, res) => {
  try {
    const { error } = validateBlog(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const blog = await BlogsModel.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found"
      });
    }

    // Check if user is the author
    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this blog"
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key === 'title') {
        blog.slug = slugify(req.body[key], { lower: true, strict: true });
      }
      blog[key] = req.body[key];
    });

    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog post updated successfully",
      data: blog,
    });
  } catch (err) {
    console.error("Error updating blog:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Delete blog post
const deleteBlog = async (req, res) => {
  try {
    const blog = await BlogsModel.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found"
      });
    }

    // Check if user is the author
    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this blog"
      });
    }

    await blog.remove();

    res.status(200).json({
      success: true,
      message: "Blog post deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting blog:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

module.exports = {
  createBlog,
  getAllBlogs,
  searchBlogs,
  getFeaturedBlogs,
  getBlogBySlug,
  getBlogById,
  getBlogsByCategory,
  getBlogsByTag,
  updateBlogStatus,
  toggleFeatured,
  likeBlog,
  addComment,
  deleteComment,
  updateBlog,
  deleteBlog,
};
