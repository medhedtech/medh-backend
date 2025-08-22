import slugify from "slugify";

import BlogsModel from "../models/blog-model.js";

import {
  validateBlog,
  validateBlogUpdate,
  validateComment,
  validateBlogStatus,
} from "../utils/validators.js";

import { handleBase64Upload } from "./upload/uploadController.js";

// Create a new blog post
export const createBlog = async (req, res) => {
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
      meta_description,
    } = req.body;

    // Handle image upload if it's a base64 string
    let imageUrl = upload_image;
    if (upload_image && typeof upload_image === "string") {
      // Only attempt base64 processing if it looks like a base64 string
      if (upload_image.startsWith("data:image")) {
        try {
          console.log(
            "Processing base64 image upload, length:",
            upload_image.length,
          );

          // Create a mock request and response object for the upload controller
          const mockReq = {
            body: {
              base64String: upload_image,
              fileType: "image",
            },
            user: req.user, // Pass the authenticated user
          };

          const mockRes = {
            status: function (code) {
              this.statusCode = code;
              return this;
            },
            json: function (data) {
              if (data.success) {
                // Extract the URL and remove any extra quotes
                imageUrl = data.data.url.replace(/^"|"$/g, "");
                console.log("Image upload successful, URL:", imageUrl);
              } else {
                console.error("Image upload failed:", data.message);
                throw new Error(data.message);
              }
            },
          };

          await handleBase64Upload(mockReq, mockRes);
        } catch (error) {
          console.error("Error uploading image:", error);
          return res.status(400).json({
            success: false,
            message: "Failed to upload image",
            error: error.message,
          });
        }
      } else {
        // Not a base64 string, assume it's a direct URL
        console.log("Using direct image URL:", upload_image);
      }
    } else if (!upload_image) {
      return res.status(400).json({
        success: false,
        message: "upload_image is required",
      });
    }

    // Detailed logging of the request and user object
    console.log("Request headers:", req.headers);
    console.log("Request user:", JSON.stringify(req.user, null, 2));
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    // Extract author ID from the authenticated user
    let authorId;
    if (req.user && req.user.user && req.user.user.id) {
      authorId = req.user.user.id;
      console.log("Using author ID from user.user.id:", authorId);
    } else if (req.user && req.user._id) {
      authorId = req.user._id;
      console.log("Using author ID from user._id:", authorId);
    } else if (req.user && req.user.id) {
      authorId = req.user.id;
      console.log("Using author ID from user.id:", authorId);
    } else {
      console.log("No valid user ID found in request");
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        error: "User ID not found in request",
        debug: {
          user: req.user,
          headers: req.headers,
        },
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
      status: "published",
    });

    console.log("Creating blog with data:", JSON.stringify(newBlog, null, 2));

    await newBlog.save();

    // Populate the categories and author
    await newBlog.populate(["categories", "author"]);

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
        user: req.user,
      },
    });
  }
};

// Get all blog posts with pagination and filters
export const getAllBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = "published", // Default to published for public routes
      sort_by = "createdAt",
      sort_order = "desc",
      with_content = "false", // Default to false for public routes
      full_content = "false", // New parameter for full content
      count_only = "false",
      featured,
      category,
      tag,
      author,
      search,
    } = req.query;

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sort_by] = sort_order === "desc" ? -1 : 1;

    // Build query dynamically
    const query = {};
    
    // Always filter by status (default to published)
    if (status) {
      query.status = status;
    }
    
    // Additional filters
    if (featured !== undefined) {
      query.featured = featured === "true";
    }
    
    if (category) {
      query.categories = category;
    }
    
    if (tag) {
      query.tags = tag;
    }
    
    if (author) {
      query.author = author;
    }
    
    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Build projection based on with_content and full_content parameters
    let projection = {};
    if (with_content === "false" && full_content === "false") {
      // Exclude content for listing views
      projection = { content: 0 };
    }
    // If with_content=true or full_content=true, include all content

    // If count_only is true, just return the count
    if (count_only === "true") {
      const total = await BlogsModel.countDocuments(query);
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      });
    }

    // Execute the query with proper error handling
    const [blogs, total] = await Promise.all([
      BlogsModel.find(query)
        .select(projection)
        .populate("author", "name email")
        .populate("categories", "category_name category_image")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(), // Use lean() for better performance
      BlogsModel.countDocuments(query)
    ]);

    // Add commentCount virtual to each blog and ensure content availability
    const blogsWithCommentCount = blogs.map(blog => ({
      ...blog,
      commentCount: blog.comments ? blog.comments.length : 0,
      id: blog._id ? blog._id.toString() : null, // Safely ensure id field is present
      // Ensure content fields are available when requested
      content: (with_content === "true" || full_content === "true") ? blog.content : undefined,
      description: blog.description || blog.meta_description || blog.excerpt || '',
    }));

    res.status(200).json({
      success: true,
      data: blogsWithCommentCount,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
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
export const searchBlogs = async (req, res) => {
  try {
    const { 
      query: searchQuery,
      page = 1,
      limit = 10,
      status = "published",
      sort_by = "score", // Default to relevance score
      sort_order = "desc",
      with_content = "false",
      full_content = "false"
    } = req.query;
    
    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const skip = (page - 1) * limit;
    const mongoQuery = {
      $text: { $search: searchQuery },
      status, // Filter by status
    };

    // Determine sort order
    let sortOption;
    if (sort_by === "score") {
      sortOption = { score: { $meta: "textScore" } };
    } else {
      const sort = {};
      sort[sort_by] = sort_order === "desc" ? -1 : 1;
      sortOption = sort;
    }

    // Build projection based on content parameters
    let projection = { score: { $meta: "textScore" } };
    if (with_content === "false" && full_content === "false") {
      projection.content = 0;
    }

    const [blogs, total] = await Promise.all([
      BlogsModel.find(mongoQuery, projection)
        .sort(sortOption)
        .populate("author", "name email")
        .populate("categories", "category_name category_image")
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      BlogsModel.countDocuments(mongoQuery)
    ]);

    // Add commentCount virtual to each blog
    const blogsWithCommentCount = blogs.map(blog => ({
      ...blog,
      commentCount: blog.comments ? blog.comments.length : 0,
      id: blog._id ? blog._id.toString() : null,
      description: blog.description || blog.meta_description || blog.excerpt || '',
    }));

    res.status(200).json({
      success: true,
      data: blogsWithCommentCount,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
      searchQuery,
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
export const getFeaturedBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 5,
      status = "published",
      sort_by = "createdAt",
      sort_order = "desc",
      with_content = "false",
      full_content = "false"
    } = req.query;

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sort_by] = sort_order === "desc" ? -1 : 1;

    const query = {
      featured: true,
      status,
    };

    // Build projection based on content parameters
    let projection = {};
    if (with_content === "false" && full_content === "false") {
      projection = { content: 0 };
    }

    const [blogs, total] = await Promise.all([
      BlogsModel.find(query)
        .select(projection)
        .populate("author", "name email")
        .populate("categories", "category_name category_image")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      BlogsModel.countDocuments(query)
    ]);

    // Add commentCount virtual to each blog
    const blogsWithCommentCount = blogs.map(blog => ({
      ...blog,
      commentCount: blog.comments ? blog.comments.length : 0,
      id: blog._id ? blog._id.toString() : null,
      description: blog.description || blog.meta_description || blog.excerpt || '',
    }));

    res.status(200).json({
      success: true,
      data: blogsWithCommentCount,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
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

// Get blog by slug - Enhanced with full content support
export const getBlogBySlug = async (req, res) => {
  try {
    const { with_content = "true", full_content = "true" } = req.query;
    
    // Build projection - for individual blog posts, we usually want full content
    let projection = {};
    if (with_content === "false" && full_content === "false") {
      projection = { content: 0 };
    }

    // First find the blog without updating it
    const blog = await BlogsModel.findOne({ slug: req.params.slug })
      .select(projection)
      .populate("author", "name email")
      .populate("categories", "category_name category_image")
      .populate("comments.user", "name email");

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    // Ensure we have content fields available
    const blogWithContent = {
      ...blog.toObject(),
      description: blog.description || blog.meta_description || blog.excerpt || '',
      commentCount: blog.comments ? blog.comments.length : 0,
      id: blog._id ? blog._id.toString() : null,
    };

    // Return the blog without incrementing views to avoid validation issues
    res.status(200).json({
      success: true,
      data: blogWithContent,
    });

    // Increment views in a separate operation that doesn't affect the response
    try {
      await BlogsModel.findByIdAndUpdate(
        blog._id,
        { $inc: { views: 1 } },
        {
          new: false,
          runValidators: false, // Skip validation when updating views
        },
      );
    } catch (viewErr) {
      console.error(
        "Error incrementing views (non-critical):",
        viewErr.message,
      );
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

// Get blog by ID - Enhanced with full content support
export const getBlogById = async (req, res) => {
  try {
    const { with_content = "true", full_content = "true" } = req.query;
    
    // Build projection - for individual blog posts, we usually want full content
    let projection = {};
    if (with_content === "false" && full_content === "false") {
      projection = { content: 0 };
    }

    // First find the blog without updating it
    const blog = await BlogsModel.findById(req.params.id)
      .select(projection)
      .populate("author", "name email")
      .populate("categories", "category_name category_image")
      .populate("comments.user", "name email");

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    // Ensure we have content fields available
    const blogWithContent = {
      ...blog.toObject(),
      description: blog.description || blog.meta_description || blog.excerpt || '',
      commentCount: blog.comments ? blog.comments.length : 0,
      id: blog._id ? blog._id.toString() : null,
    };

    // Return the blog without incrementing views to avoid validation issues
    res.status(200).json({
      success: true,
      data: blogWithContent,
    });

    // Increment views in a separate operation that doesn't affect the response
    try {
      await BlogsModel.findByIdAndUpdate(
        req.params.id,
        { $inc: { views: 1 } },
        {
          new: false,
          runValidators: false, // Skip validation when updating views
        },
      );
    } catch (viewErr) {
      console.error(
        "Error incrementing views (non-critical):",
        viewErr.message,
      );
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
export const getBlogsByCategory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = "published",
      sort_by = "createdAt",
      sort_order = "desc",
      with_content = "false",
      full_content = "false"
    } = req.query;

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sort_by] = sort_order === "desc" ? -1 : 1;

    const query = {
      categories: req.params.category,
      status,
    };

    // Build projection based on content parameters
    let projection = {};
    if (with_content === "false" && full_content === "false") {
      projection = { content: 0 };
    }

    const [blogs, total] = await Promise.all([
      BlogsModel.find(query)
        .select(projection)
        .populate("author", "name email")
        .populate("categories", "category_name category_image")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      BlogsModel.countDocuments(query)
    ]);

    // Add commentCount virtual to each blog
    const blogsWithCommentCount = blogs.map(blog => ({
      ...blog,
      commentCount: blog.comments ? blog.comments.length : 0,
      id: blog._id ? blog._id.toString() : null,
      description: blog.description || blog.meta_description || blog.excerpt || '',
    }));

    res.status(200).json({
      success: true,
      data: blogsWithCommentCount,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
      category: req.params.category,
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
export const getBlogsByTag = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = "published",
      sort_by = "createdAt",
      sort_order = "desc",
      with_content = "false",
      full_content = "false"
    } = req.query;

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sort_by] = sort_order === "desc" ? -1 : 1;

    const query = {
      tags: req.params.tag,
      status,
    };

    // Build projection based on content parameters
    let projection = {};
    if (with_content === "false" && full_content === "false") {
      projection = { content: 0 };
    }

    const [blogs, total] = await Promise.all([
      BlogsModel.find(query)
        .select(projection)
        .populate("author", "name email")
        .populate("categories", "category_name category_image")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      BlogsModel.countDocuments(query)
    ]);

    // Add commentCount virtual to each blog
    const blogsWithCommentCount = blogs.map(blog => ({
      ...blog,
      commentCount: blog.comments ? blog.comments.length : 0,
      id: blog._id ? blog._id.toString() : null,
      description: blog.description || blog.meta_description || blog.excerpt || '',
    }));

    res.status(200).json({
      success: true,
      data: blogsWithCommentCount,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
      tag: req.params.tag,
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
export const updateBlogStatus = async (req, res) => {
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
        message: "Blog post not found",
      });
    }

    // Check if user is the author with safe null checks
    const blogAuthorId = blog.author ? blog.author.toString() : null;
    const userId = req.user && req.user._id ? req.user._id.toString() : null;
    
    if (!blogAuthorId || !userId || blogAuthorId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this blog",
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
export const toggleFeatured = async (req, res) => {
  try {
    const blog = await BlogsModel.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
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
export const likeBlog = async (req, res) => {
  try {
    const blog = await BlogsModel.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
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
export const addComment = async (req, res) => {
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
        message: "Blog post not found",
      });
    }

    blog.comments.push({
      user: req.user._id,
      content,
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
export const deleteComment = async (req, res) => {
  try {
    const blog = await BlogsModel.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    const comment = blog.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user is the comment author or blog author with safe null checks
    const commentUserId = comment.user ? comment.user.toString() : null;
    const blogAuthorId = blog.author ? blog.author.toString() : null;
    const userId = req.user && req.user._id ? req.user._id.toString() : null;
    
    if (
      (!commentUserId || !userId || commentUserId !== userId) &&
      (!blogAuthorId || !userId || blogAuthorId !== userId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
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
export const updateBlog = async (req, res) => {
  try {
    console.log("=== UPDATE BLOG DEBUG START ===");
    console.log("Request params:", req.params);
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Request user:", JSON.stringify(req.user, null, 2));
    
    const { error } = validateBlogUpdate(req.body);
    if (error) {
      console.log("Validation error:", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    console.log("Looking for blog with ID:", req.params.id);
    const blog = await BlogsModel.findById(req.params.id);
    console.log("Found blog:", blog ? "YES" : "NO");
    
    if (!blog) {
      console.log("Blog not found");
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    console.log("Blog object:", JSON.stringify({
      _id: blog._id,
      title: blog.title,
      author: blog.author,
      authorType: typeof blog.author
    }, null, 2));

    // Safely check if user is the author with proper null/undefined checks
    let blogAuthorId = null;
    let userId = null;
    
    try {
      blogAuthorId = blog.author ? blog.author.toString() : null;
      console.log("Blog author ID extracted:", blogAuthorId);
    } catch (authorError) {
      console.error("Error extracting blog author ID:", authorError);
      blogAuthorId = null;
    }
    
    try {
      // Try multiple possible user ID locations
      if (req.user && req.user._id) {
        userId = req.user._id.toString();
      } else if (req.user && req.user.id) {
        userId = req.user.id.toString();
      } else {
        userId = null;
      }
      console.log("User ID extracted:", userId);
    } catch (userError) {
      console.error("Error extracting user ID:", userError);
      userId = null;
    }
    
    // Check if user is the author OR an admin
    const isAuthor = blogAuthorId && userId && blogAuthorId === userId;
    const isAdmin = req.user && req.user.role && req.user.role.includes('admin');
    
    if (!isAuthor && !isAdmin) {
      console.log("Authorization failed:", { blogAuthorId, userId, isAuthor, isAdmin, userRole: req.user?.role });
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this blog",
        debug: {
          blogAuthorId,
          userId,
          isAuthor,
          isAdmin,
          userRole: req.user?.role,
          blogAuthor: blog.author,
          reqUser: req.user
        }
      });
    }

    console.log("Authorization successful, updating fields...");

    // Update fields with safe handling
    Object.keys(req.body).forEach((key) => {
      console.log(`Processing field: ${key} = ${req.body[key]}`);
      
      if (key === "title" && req.body[key]) {
        // Only update slug if title is provided and not empty
        const titleValue = req.body[key];
        if (titleValue && typeof titleValue === 'string' && titleValue.trim()) {
          try {
            blog.slug = slugify(titleValue.trim(), { lower: true, strict: true });
            console.log("Updated slug:", blog.slug);
          } catch (slugError) {
            console.error("Error creating slug:", slugError);
          }
        }
      }
      
      // Only update if the value is not undefined
      if (req.body[key] !== undefined) {
        blog[key] = req.body[key];
        console.log(`Updated ${key}:`, req.body[key]);
      }
    });

    console.log("Saving blog...");
    await blog.save();
    console.log("Blog saved successfully");

    res.status(200).json({
      success: true,
      message: "Blog post updated successfully",
      data: blog,
    });
    
    console.log("=== UPDATE BLOG DEBUG END ===");
  } catch (err) {
    console.error("=== UPDATE BLOG ERROR ===");
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    console.error("Request params:", req.params);
    console.error("Request body:", req.body);
    console.error("Request user:", req.user);
    console.error("=== UPDATE BLOG ERROR END ===");
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Delete blog post
export const deleteBlog = async (req, res) => {
  try {
    const blog = await BlogsModel.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    // Check if user is the author with safe null checks
    const blogAuthorId = blog.author ? blog.author.toString() : null;
    const userId = req.user && req.user._id ? req.user._id.toString() : null;
    
    if (!blogAuthorId || !userId || blogAuthorId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this blog",
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