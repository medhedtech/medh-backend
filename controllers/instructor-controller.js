import bcrypt from "bcryptjs";
import User from "../models/user-modal.js";
import emailService from "../services/emailService.js";

// Create Instructor
export const createInstructor = async (req, res) => {
  const { full_name, email, phone_number, password, domain, meta } = req.body;

  if (!full_name || !email || !phone_number || !password) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  try {
    let user = await User.findOne({ $or: [{ email }, { phone_number }] });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "User with this email or phone number already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new instructor instance
    const instructor = new User({
      full_name,
      email,
      phone_number,
      password: hashedPassword,
      role: ["instructor"],
      domain,
      meta,
    });
    await instructor.save();

    // Prepare email content
    const mailOptions = {
      to: email,
      subject: "Welcome to Medh Learning Platform",
      html: `
        <h2>Welcome, ${full_name}!</h2>
        <p>Thank you for joining as an instructor on Medh Learning Platform. Below are your login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Password:</strong> ${password}</li>
        </ul>
        <p>Make sure to change your password after logging in for the first time. If you did not register, please contact support immediately.</p>
      `,
    };

    try {
      // Send email using the existing email service
      const emailResult = await emailService.sendEmail(mailOptions, { priority: "high" });
      
      res.status(201).json({
        success: true,
        message: "Instructor created successfully, and email sent to the instructor.",
        instructor,
        emailResult,
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError.message);
      // Still return success for instructor creation, but note email failure
      res.status(201).json({
        success: true,
        message: "Instructor created successfully, but email notification failed to send.",
        instructor,
        emailError: emailError.message,
      });
    }
  } catch (error) {
    console.error("Error creating instructor:", error.message);
    res.status(500).json({
      success: false,
      message: "Error creating instructor",
      error: error.message,
    });
  }
};

export const getAllInstructors = async (req, res) => {
  try {
    const instructors = await User.find({ role: "instructor" });
    res.status(200).json({ success: true, data: instructors });
  } catch (error) {
    res.status(500).json({ message: "Error fetching instructors", error });
  }
};

export const getInstructorById = async (req, res) => {
  try {
    const { id } = req.params;
    const instructor = await User.findOne({ _id: id, role: "instructor" });

    if (!instructor) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    res.status(200).json({ success: true, data: instructor });
  } catch (error) {
    res.status(500).json({ message: "Error fetching instructor", error });
  }
};

export const updateInstructor = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedInstructor = await User.findOneAndUpdate(
      { _id: id, role: "instructor" },
      updates,
      { new: true, runValidators: true },
    );

    if (!updatedInstructor) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    res.status(200).json({ success: true, data: updatedInstructor });
  } catch (error) {
    res.status(500).json({ message: "Error updating instructor", error });
  }
};

export const deleteInstructor = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedInstructor = await User.findOneAndDelete({
      _id: id,
      role: "instructor",
    });

    if (!deletedInstructor) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    res.status(200).json({ message: "Instructor deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting instructor", error });
  }
};

export const toggleInstructorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const instructor = await User.findOne({ _id: id, role: "instructor" });

    if (!instructor) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    instructor.status = instructor.status === "Active" ? "Inactive" : "Active";
    await instructor.save();

    res.status(200).json({
      message: `Instructor status updated to ${instructor.status}`,
      data: instructor,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error toggling instructor status", error });
  }
};
