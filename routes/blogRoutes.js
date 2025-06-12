import express from "express";

import * as blogController from "../controllers/blogController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Public routes (no authentication required)
// GET /api/blogs?page=1&limit=10&status=published&sort_by=createdAt&sort_order=desc&featured=true&search=keyword
router.get("/", blogController.getAllBlogs);

// GET /api/blogs/search?query=keyword&page=1&limit=10&status=published&sort_by=score
router.get("/search", blogController.searchBlogs);

// GET /api/blogs/featured?page=1&limit=5&status=published
router.get("/featured", blogController.getFeaturedBlogs);

// GET /api/blogs/category/:category?page=1&limit=10&status=published
router.get("/category/:category", blogController.getBlogsByCategory);

// GET /api/blogs/tag/:tag?page=1&limit=10&status=published
router.get("/tag/:tag", blogController.getBlogsByTag);

router.get("/id/:id", blogController.getBlogById);
router.get("/:slug", blogController.getBlogBySlug);

// Protected routes (require authentication)
router.use(authenticateToken);
router.post("/", blogController.createBlog);
router.put("/:id", blogController.updateBlog);
router.delete("/:id", blogController.deleteBlog);
router.post("/:id/like", blogController.likeBlog);
router.post("/:id/comment", blogController.addComment);
router.put("/:id/status", blogController.updateBlogStatus);

export default router;
