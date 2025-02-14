const express = require("express");
const router = express.Router();
const {
  createJob,
  getAllJobPosts,
  getJobPostById,
  updateJobPost,
  deleteJobPost,
} = require("../controllers/job-post-controller");

// Route to create a new job post
router.post("/create", createJob);
router.get("/getAll", getAllJobPosts);
router.get("/get/:id", getJobPostById);
router.post("/update/:id", updateJobPost);
router.delete("/delete/:id", deleteJobPost);

module.exports = router;
