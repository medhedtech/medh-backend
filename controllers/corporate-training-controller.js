import CorporateForm from "../models/corporate-training.model.js";

// Create a new corporate
export const createCorporate = async (req, res) => {
  try {
    const {
      full_name,
      email,
      country,
      phone_number,
      company_website,
      company_name,
      designation,
      message,
      accept,
    } = req.body;

    if (
      !full_name ||
      !email ||
      !country ||
      !company_name ||
      !designation ||
      !accept
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Create the new corporate form
    const corporateForm = new CorporateForm({
      full_name,
      email,
      country,
      phone_number,
      company_website,
      company_name,
      designation,
      message,
      accept,
    });

    await corporateForm.save();

    res.status(201).json({
      success: true,
      message: "Form submitted successfully",
      data: corporateForm,
    });
  } catch (err) {
    console.error("Error submitting form:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Retrieve all corporates
export const getAllCorporates = async (req, res) => {
  try {
    const corporates = await CorporateForm.find();
    res.status(200).json({ success: true, data: corporates });
  } catch (err) {
    console.error("Error fetching corporates:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Retrieve a single corporate by ID
export const getCorporateById = async (req, res) => {
  try {
    const corporate = await CorporateForm.findById(req.params.id);
    if (!corporate) {
      return res
        .status(404)
        .json({ success: false, message: "Corporate not found" });
    }
    res.status(200).json({ success: true, data: corporate });
  } catch (err) {
    console.error("Error fetching corporate:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Update a corporate by ID
export const updateCorporate = async (req, res) => {
  try {
    const updatedCorporate = await CorporateForm.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedCorporate) {
      return res
        .status(404)
        .json({ success: false, message: "Corporate not found" });
    }

    res.status(200).json({ success: true, data: updatedCorporate });
  } catch (err) {
    console.error("Error updating corporate:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Delete a corporate by ID
export const deleteCorporate = async (req, res) => {
  try {
    const deletedCorporate = await CorporateForm.findByIdAndDelete(
      req.params.id
    );

    if (!deletedCorporate) {
      return res
        .status(404)
        .json({ success: false, message: "Corporate not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Corporate deleted successfully" });
  } catch (err) {
    console.error("Error deleting corporate:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
