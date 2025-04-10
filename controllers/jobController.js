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
      { new: true, runValidators: true }
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
