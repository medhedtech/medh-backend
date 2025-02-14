const BlogsModel = require("../models/blog-model");

// Create a new blog post
const createBlog = async (req, res) => {
  try {
    const { title, blog_link, upload_image } = req.body;

    const newBlog = new BlogsModel({
      title,
      blog_link,
      upload_image,
    });
    
    await newBlog.save();

    res.status(201).json({
      success: true,
      message: "Blog post created successfully",
      data: newBlog,
    });
  } catch (err) {
    console.error("Error creating blog post:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Get all blog posts
const getAllBlogs = async (req, res) => {
  try {
    const blogs = await BlogsModel.find();
    res.status(200).json({
      success: true,
      data: blogs,
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

// Get a single blog post by ID
const getBlogById = async (req, res) => {
  try {
    const blog = await BlogsModel.findById(req.params.id);
    if (!blog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog post not found" });
    }
    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (err) {
    console.error("Error fetching blog by ID:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Update a blog post by ID
const updateBlog = async (req, res) => {
  try {
    const updatedBlog = await BlogsModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedBlog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog post not found" });
    }

    res.status(200).json({
      success: true,
      message: "Blog post updated successfully",
      data: updatedBlog,
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

// Delete a blog post by ID
const deleteBlog = async (req, res) => {
  try {
    const deletedBlog = await BlogsModel.findByIdAndDelete(req.params.id);
    if (!deletedBlog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog post not found" });
    }
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
  getBlogById,
  updateBlog,
  deleteBlog,
};
