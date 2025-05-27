import bcrypt from "bcryptjs";
import emailService from "../services/emailService.js";

import User from "../models/user-modal.js";

// Set up the email transporter
// Email service is imported and ready to use

// Create Corporate User
export const createCorporate = async (req, res) => {
  const {
    full_name,
    email,
    phone_number,
    password,
    company_type,
    country,
    company_website,
    meta: { upload_resume } = {},
  } = req.body;

  // Validate required fields
  if (
    !full_name ||
    !email ||
    !phone_number ||
    !password ||
    !company_type ||
    !country ||
    !company_website
  ) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  try {
    // Check for duplicate email or phone number
    let user = await User.findOne({ $or: [{ email }, { phone_number }] });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "User with this email or phone number already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create corporate user
    const corporateUser = new User({
      full_name,
      email,
      phone_number,
      password: hashedPassword,
      role: ["coorporate"],
      company_type,
      country,
      company_website,
      meta: {
        upload_resume: upload_resume || [],
      },
    });

    // Save user
    await corporateUser.save();

    // Send welcome email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Medh Learning Platform",
      html: `
        <h2>Welcome, ${full_name}!</h2>
        <p>Thank you for joining as a corporate user on Medh Learning Platform. To complete your registration, please log in and set up your account.</p>
        <p>If you did not register, please contact support immediately.</p>
      `,
    };

    await emailService.sendEmail(mailOptions, { priority: "high" });

    res.status(201).json({
      success: true,
      message:
        "Corporate user created successfully, and email sent to the corporate user.",
      corporateUser,
    });
  } catch (error) {
    console.error("Error creating corporate user:", error.message);
    res.status(500).json({
      success: false,
      message: "Error creating corporate user",
      error: error.message,
    });
  }
};

// Get All Corporate Users
export const getAllCorporateUsers = async (req, res) => {
  try {
    const corporateUsers = await User.find({ role: "coorporate" });
    res.status(200).json({ success: true, data: corporateUsers });
  } catch (error) {
    res.status(500).json({ message: "Error fetching corporate users", error });
  }
};

// Get Corporate User by ID
export const getCorporateById = async (req, res) => {
  try {
    const { id } = req.params;
    const corporateUser = await User.findOne({ _id: id, role: "coorporate" });

    if (!corporateUser) {
      return res.status(404).json({ message: "Corporate user not found" });
    }

    res.status(200).json({ success: true, data: corporateUser });
  } catch (error) {
    res.status(500).json({ message: "Error fetching corporate user", error });
  }
};

// Update Corporate User
export const updateCorporate = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedCorporateUser = await User.findOneAndUpdate(
      { _id: id, role: "coorporate" },
      updates,
      { new: true, runValidators: true },
    );

    if (!updatedCorporateUser) {
      return res.status(404).json({ message: "Corporate user not found" });
    }

    res.status(200).json({ success: true, data: updatedCorporateUser });
  } catch (error) {
    res.status(500).json({ message: "Error updating corporate user", error });
  }
};

// Delete Corporate User
export const deleteCorporate = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCorporateUser = await User.findOneAndDelete({
      _id: id,
      role: "coorporate",
    });

    if (!deletedCorporateUser) {
      return res.status(404).json({ message: "Corporate user not found" });
    }

    res.status(200).json({ message: "Corporate user deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting corporate user", error });
  }
};

// Toggle Corporate User Status
export const toggleCorporateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const corporateUser = await User.findOne({ _id: id, role: "coorporate" });

    if (!corporateUser) {
      return res.status(404).json({ message: "Corporate user not found" });
    }

    corporateUser.status =
      corporateUser.status === "Active" ? "Inactive" : "Active";
    await corporateUser.save();

    res.status(200).json({
      message: `Corporate user status updated to ${corporateUser.status}`,
      data: corporateUser,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error toggling corporate user status", error });
  }
};
