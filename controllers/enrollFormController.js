const EnrollForm = require("../models/enroll-form-model");

// Create a new enrollment
const createEnrollment = async (req, res) => {
  try {
    const {
      full_name,
      email,
      country,
      phone_number,
      course_category,
      course_type,
      company_website,
      company_name,
      designation,
      message,
      accept,
    } = req.body;

    const enrollForm = new EnrollForm({
      full_name,
      email,
      country,
      phone_number,
      course_category,
      course_type,
      company_website,
      company_name,
      designation,
      message,
      accept,
    });

    await enrollForm.save();

    res.status(201).json({
      success: true,
      message: "Enrollment created successfully",
      data: enrollForm,
    });
  } catch (err) {
    console.error("Error creating enrollment:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Retrieve all enrollments
const getAllEnrollments = async (req, res) => {
  try {
    const enrollments = await EnrollForm.find();
    res.status(200).json({ success: true, data: enrollments });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Retrieve a single enrollment by ID
const getEnrollmentById = async (req, res) => {
  try {
    const enrollment = await EnrollForm.findById(req.params.id);
    if (!enrollment)
      return res
        .status(404)
        .json({ success: false, message: "Enrollment not found" });

    res.status(200).json({ success: true, data: enrollment });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Update an enrollment by ID
const updateEnrollment = async (req, res) => {
  try {
    const updatedEnrollment = await EnrollForm.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedEnrollment)
      return res
        .status(404)
        .json({ success: false, message: "Enrollment not found" });

    res.status(200).json({ success: true, data: updatedEnrollment });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Delete an enrollment by ID
const deleteEnrollment = async (req, res) => {
  try {
    const deletedEnrollment = await EnrollForm.findByIdAndDelete(req.params.id);

    if (!deletedEnrollment)
      return res
        .status(404)
        .json({ success: false, message: "Enrollment not found" });

    res
      .status(200)
      .json({ success: true, message: "Enrollment deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

module.exports = {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
};
