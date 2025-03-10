const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");

router.post("/create", blogController.createBlog);
router.get("/get", blogController.getAllBlogs);
router.get("/get/:id", blogController.getBlogById);
router.post("/update/:id", blogController.updateBlog);
router.delete("/delete/:id", blogController.deleteBlog);

module.exports = router;

// ex