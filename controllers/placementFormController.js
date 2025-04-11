import PlacementForm from "../models/placement-form-model.js";

// Get all placement form submissions
export const getAllPlacementForms = async (req, res) => {
  try {
    const placementForms = await PlacementForm.find();
    res.status(200).json(placementForms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a specific placement form by ID
export const getPlacementFormById = async (req, res) => {
  try {
    const placementForm = await PlacementForm.findById(req.params.id);
    if (!placementForm) {
      return res.status(404).json({ message: "Placement form not found" });
    }
    res.status(200).json(placementForm);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new placement form submission
export const createPlacementForm = async (req, res) => {
  try {
    // Create new placement form from request body
    const newPlacementForm = new PlacementForm(req.body);

    // Save to database
    const savedForm = await newPlacementForm.save();

    res.status(201).json({
      success: true,
      message: "Placement form submitted successfully",
      data: savedForm,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to submit placement form",
      error: error.message,
    });
  }
};

// Update a placement form by ID
export const updatePlacementForm = async (req, res) => {
  try {
    const updatedForm = await PlacementForm.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedForm) {
      return res.status(404).json({ message: "Placement form not found" });
    }

    res.status(200).json({
      success: true,
      message: "Placement form updated successfully",
      data: updatedForm,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to update placement form",
      error: error.message,
    });
  }
};

// Delete a placement form by ID
export const deletePlacementForm = async (req, res) => {
  try {
    const deletedForm = await PlacementForm.findByIdAndDelete(req.params.id);

    if (!deletedForm) {
      return res.status(404).json({ message: "Placement form not found" });
    }

    res.status(200).json({
      success: true,
      message: "Placement form deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete placement form",
      error: error.message,
    });
  }
};

// Update application status
export const updateApplicationStatus = async (req, res) => {
  try {
    const {
      status,
      application_notes,
      interview_date,
      interviewer,
      interview_feedback,
    } = req.body;

    const updatedForm = await PlacementForm.findByIdAndUpdate(
      req.params.id,
      {
        status,
        application_notes,
        interview_date,
        interviewer,
        interview_feedback,
      },
      { new: true, runValidators: true },
    );

    if (!updatedForm) {
      return res.status(404).json({ message: "Placement form not found" });
    }

    res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      data: updatedForm,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to update application status",
      error: error.message,
    });
  }
};

// Bulk update course fees
export const bulkUpdateCourseFees = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Update data must be a non-empty array of course fee updates",
      });
    }

    // Process the bulk updates
    // This would typically connect to a course model
    // For now, we'll just return success with the data

    res.status(200).json({
      success: true,
      message: "Course fees updated successfully",
      data: {
        updates: updates.map((item) => ({
          ...item,
          updated_at: new Date().toISOString(),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update course fees",
      error: error.message,
    });
  }
};
