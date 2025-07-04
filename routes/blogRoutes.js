import express from "express";

import * as blogController from "../controllers/blogController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Public routes (no authentication required)
// GET /api/blogs?page=1&limit=10&status=published&sort_by=createdAt&sort_order=desc&featured=true&search=keyword&with_content=false&full_content=false
router.get("/", blogController.getAllBlogs);

// GET /api/blogs/search?query=keyword&page=1&limit=10&status=published&sort_by=score&with_content=false&full_content=false
router.get("/search", blogController.searchBlogs);

// GET /api/blogs/featured?page=1&limit=5&status=published&with_content=false&full_content=false
router.get("/featured", blogController.getFeaturedBlogs);

// GET /api/blogs/category/:category?page=1&limit=10&status=published&with_content=false&full_content=false
router.get("/category/:category", blogController.getBlogsByCategory);

// GET /api/blogs/tag/:tag?page=1&limit=10&status=published&with_content=false&full_content=false
router.get("/tag/:tag", blogController.getBlogsByTag);

// GET /api/blogs/id/:id?with_content=true&full_content=true
router.get("/id/:id", blogController.getBlogById);

// GET /api/blogs/:slug?with_content=true&full_content=true
router.get("/:slug", blogController.getBlogBySlug);

// Protected routes (require authentication)
router.use(authenticateToken);

// POST /api/blogs - Create new blog
router.post("/", blogController.createBlog);

// PUT /api/blogs/:id - Update blog
router.put("/:id", blogController.updateBlog);

// DELETE /api/blogs/:id - Delete blog
router.delete("/:id", blogController.deleteBlog);

// POST /api/blogs/:id/like - Like blog
router.post("/:id/like", blogController.likeBlog);

// POST /api/blogs/:id/comment - Add comment
router.post("/:id/comment", blogController.addComment);

// DELETE /api/blogs/:id/comment/:commentId - Delete comment
router.delete("/:id/comment/:commentId", blogController.deleteComment);

// PUT /api/blogs/:id/status - Update blog status
router.put("/:id/status", blogController.updateBlogStatus);

// PUT /api/blogs/:id/featured - Toggle featured status
router.put("/:id/featured", blogController.toggleFeatured);

export default router; 