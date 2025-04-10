import JobPost from "../models/add-post.model.js";

export const createJob = async (req, res) => {
  try {
    const { title, description } = req.body;
    const jobPost = new JobPost({
      title,
      description,
    });
    await jobPost.save();

    res.status(201).json({
      success: true,
      message: "Job post published successfully",
      data: jobPost,
    });
  } catch (err) {
    console.error("Error creating job post entry:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

export const getAllJobPosts = async (req, res) => {
  try {
    const jobPosts = await JobPost.find();
    res.status(200).json({ success: true, data: jobPosts });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Retrieve a single job form entry by ID
export const getJobPostById = async (req, res) => {
  try {
    const jobPost = await JobPost.findById(req.params.id);
    if (!jobPost) {
      return res
        .status(404)
        .json({ success: false, message: "Job post entry not found" });
    }

    res.status(200).json({ success: true, data: jobPost });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Update a job form entry by ID
export const updateJobPost = async (req, res) => {
  try {
    const updatedJobPost = await JobPost.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedJobPost) {
      return res
        .status(404)
        .json({ success: false, message: "Job post entry not found" });
    }

    res.status(200).json({ success: true, data: updatedJobPost });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Delete a job form entry by ID
export const deleteJobPost = async (req, res) => {
  try {
    const deletedJobPost = await JobPost.findByIdAndDelete(req.params.id);

    if (!deletedJobPost) {
      return res
        .status(404)
        .json({ success: false, message: "Job post entry not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Job post entry deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
