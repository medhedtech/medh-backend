import JobForm from "../models/job-model.js";

// Create a new job form entry
export const createJobForm = async (req, res) => {
  try {
    const {
      full_name,
      email,
      country,
      phone_number,
      resume_image,
      message,
      accept,
      title,
      description,
      designation,
    } = req.body;

    const jobForm = new JobForm({
      full_name,
      email,
      country,
      phone_number,
      resume_image,
      message,
      accept,
      title,
      description,
      designation,
    });

    await jobForm.save();

    res.status(201).json({
      success: true,
      message: "Job post submitted successfully",
      data: jobForm,
    });
  } catch (err) {
    console.error("Error creating job post entry:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Retrieve all job form entries
export const getAllJobForms = async (req, res) => {
  try {
    const jobForms = await JobForm.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: jobForms });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Retrieve a single job form entry by ID
export const getJobFormById = async (req, res) => {
  try {
    const jobForm = await JobForm.findById(req.params.id);
    if (!jobForm) {
      return res
        .status(404)
        .json({ success: false, message: "Job post entry not found" });
    }

    res.status(200).json({ success: true, data: jobForm });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Update a job form entry by ID
export const updateJobForm = async (req, res) => {
  try {
    const updatedJobForm = await JobForm.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedJobForm) {
      return res
        .status(404)
        .json({ success: false, message: "Job post entry not found" });
    }

    res.status(200).json({ success: true, data: updatedJobForm });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Delete a job form entry by ID
export const deleteJobForm = async (req, res) => {
  try {
    const deletedJobForm = await JobForm.findByIdAndDelete(req.params.id);

    if (!deletedJobForm) {
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

// Create a comprehensive job posting
export const createJobPosting = async (req, res) => {
  try {
    const job = new JobForm(req.body);
    await job.save();
    res.status(201).json({ success: true, data: job });
  } catch (err) {
    console.error("Error creating job posting:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all active jobs for public view
export const getActiveJobs = async (req, res) => {
  try {
    const jobs = await JobForm.getActiveJobs();
    res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    console.error("Error fetching active jobs:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Search and filter jobs with pagination
export const searchJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      work_mode,
      employment_type,
      market,
      department,
      search,
      sort = "posted_date",
      order = "desc"
    } = req.query;

    const filter = {};
    if (status) filter.job_status = status;
    if (work_mode) filter.work_mode = work_mode;
    if (employment_type) filter.employment_type = employment_type;
    if (market) filter.markets = market;
    if (department) filter.department = department;
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const [jobs, total] = await Promise.all([
      JobForm.find(filter)
        .skip(skip)
        .limit(Number(limit))
        .sort({ [sort]: sortOrder }),
      JobForm.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: jobs,
      meta: { page: Number(page), limit: Number(limit), total }
    });
  } catch (err) {
    console.error("Error searching jobs:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get job statistics (e.g., count per status)
export const getJobStats = async (req, res) => {
  try {
    const stats = await JobForm.aggregate([
      { $group: { _id: '$job_status', count: { $sum: 1 } } }
    ]);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    console.error("Error fetching job stats:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Bulk update multiple jobs
export const bulkUpdateJobs = async (req, res) => {
  try {
    const { job_ids, updates } = req.body;
    const result = await JobForm.updateMany(
      { _id: { $in: job_ids } },
      { $set: updates }
    );
    res.status(200).json({ success: true, modifiedCount: result.nModified || result.modifiedCount });
  } catch (err) {
    console.error("Error bulk updating jobs:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update application status for a job
export const updateApplicationStatus = async (req, res) => {
  try {
    const updated = await JobForm.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error("Error updating application status:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all applications for a specific job posting (stubbed - linking not implemented)
export const getJobApplications = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented: getJobApplications' });
};

// Export job data (e.g., CSV) - stubbed
export const exportJobData = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented: exportJobData' });
};

// Duplicate a job posting
export const duplicateJob = async (req, res) => {
  try {
    const original = await JobForm.findById(req.params.id);
    if (!original) {
      return res.status(404).json({ success: false, message: 'Original job not found' });
    }
    const data = original.toObject();
    delete data._id;
    data.posted_date = new Date();
    data.last_updated = new Date();
    data.job_status = 'Draft';
    const clone = new JobForm(data);
    await clone.save();
    res.status(201).json({ success: true, data: clone });
  } catch (err) {
    console.error("Error duplicating job:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get current user's job postings or applications
export const getJobsByUser = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const jobs = await JobForm.find({ posted_by: userId }).sort({ posted_date: -1 });
    res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    console.error("Error fetching jobs by user:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
