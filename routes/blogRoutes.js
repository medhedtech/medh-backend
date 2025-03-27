const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");
const { authenticate } = require("../middleware/auth");

// Public routes (no authentication required)
router.get("/", blogController.getAllBlogs);
router.get("/search", blogController.searchBlogs);
router.get("/featured", blogController.getFeaturedBlogs);
router.get("/category/:category", blogController.getBlogsByCategory);
router.get("/tag/:tag", blogController.getBlogsByTag);
router.get("/id/:id", blogController.getBlogById);
router.get("/:slug", blogController.getBlogBySlug);

// Protected routes (require authentication)
router.use(authenticate);
router.post("/", blogController.createBlog);
router.put("/:id", blogController.updateBlog);
router.delete("/:id", blogController.deleteBlog);
router.post("/:id/like", blogController.likeBlog);
router.post("/:id/comment", blogController.addComment);
router.put("/:id/status", blogController.updateBlogStatus);

module.exports = router;
