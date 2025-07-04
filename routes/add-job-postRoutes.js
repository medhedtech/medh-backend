import express from "express";

import {
  createJob,
  getAllJobPosts,
  getJobPostById,
  updateJobPost,
  deleteJobPost,
} from "../controllers/job-post-controller.js";
import { getActiveJobs } from "../controllers/jobController.js";
import { validateJobQuery } from "../validations/jobValidation.js";

const router = express.Router();

// Route to create a new job post
router.post("/create", createJob);
router.get("/getAll", getAllJobPosts);
router.get("/get/:id", getJobPostById);
router.post("/update/:id", updateJobPost);
router.delete("/delete/:id", deleteJobPost);

// Route to get active jobs with pagination support
router.get("/active", validateJobQuery, getActiveJobs);

export default router;
