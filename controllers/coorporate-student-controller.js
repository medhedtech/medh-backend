import bcrypt from "bcryptjs";
import emailService from "../services/emailService.js";

import CoorporateAssignCourse from "../models/assigned-courses-coorporates-modal.js";
import CoorporateEnrolledModule from "../models/coorporate-enrolled-modules.model.js";
import Course from "../models/course-model.js";
import User from "../models/user-modal.js";

// Set up the email transporter
// Email service is imported and ready to use

export const createCorporateStudent = async (req, res) => {
  const { full_name, email, phone_number, password, meta } = req.body;

  // Validate required fields
  if (
    !full_name ||
    !email ||
    !phone_number ||
    !password ||
    !meta?.corporate_id
  ) {
    return res.status(400).json({
      success: false,
      message: "All fields are required, including corporate_id in meta.",
    });
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
      role: ["coorporate-student"],
      meta,
      corporate_id: meta.corporate_id,
    });

    // Save user
    await corporateUser.save();

    // Fetch all courses assigned to the corporate organization
    const assignedCourses = await CoorporateAssignCourse.find({
      coorporate_id: meta.corporate_id,
    });

    if (assignedCourses.length > 0) {
      for (const course of assignedCourses) {
        const courseDetails = await Course.findById(course.course_id);
        if (!courseDetails) {
          console.warn(`Course not found for ID: ${course.course_id}`);
          continue;
        }

        if (
          !courseDetails.course_videos ||
          courseDetails.course_videos.length === 0
        ) {
          console.warn(`No videos found for course ID: ${course.course_id}`);
          continue;
        }

        // Prepare enrolled modules
        const enrolledModules = courseDetails.course_videos.map(
          (video_url) => ({
            coorporate_id: corporateUser._id,
            course_id: course.course_id,
            enrollment_id: course._id,
            video_url,
            expiry_date: course.expiry_date || null,
          }),
        );

        // Insert enrolled modules in bulk
        try {
          await CoorporateEnrolledModule.insertMany(enrolledModules);
          console.log(
            `Enrolled ${corporateUser._id} to course ${course.course_id}`,
          );
        } catch (err) {
          console.error(
            `Error enrolling user to course ${course.course_id}:`,
            err.message,
          );
        }
      }
    }

    // Send welcome email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Medh Learning Platform",
      html: `
      <h2>Welcome, ${full_name}!</h2>
      <p>Thank you for joining as a corporate student on Medh Learning Platform. Here are your login credentials:</p>
      <ul>
        <li><strong>Username:</strong> ${email}</li>
        <li><strong>Password:</strong> ${password}</li>
      </ul>
      <p>Please keep this information secure. If you did not request this, please contact us immediately.</p>
    `,
    };

    await emailService.sendEmail(mailOptions, { priority: "high" });

    res.status(201).json({
      success: true,
      message:
        "Corporate student created successfully, and courses enrolled based on the corporate's assignments.",
      corporateUser,
    });
  } catch (error) {
    console.error("Error creating corporate student:", error.message);
    res.status(500).json({
      success: false,
      message: "Error creating corporate student",
      error: error.message,
    });
  }
};

// Get All Corporate Users
export const getAllCorporateStudents = async (req, res) => {
  try {
    const { corporate_id } = req.query;
    const corporateUsers = await User.find({
      role: "coorporate-student",
      corporate_id: corporate_id,
    });
    res.status(200).json({ success: true, data: corporateUsers });
  } catch (error) {
    res.status(500).json({ message: "Error fetching corporate users", error });
  }
};

// Get Corporate User by ID
export const getCorporateStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const corporateUser = await User.findOne({
      _id: id,
      role: "coorporate-student",
    });

    if (!corporateUser) {
      return res.status(404).json({ message: "Corporate user not found" });
    }

    res.status(200).json({ success: true, data: corporateUser });
  } catch (error) {
    res.status(500).json({ message: "Error fetching corporate user", error });
  }
};

// Update Corporate User
export const updateCorporateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedCorporateUser = await User.findOneAndUpdate(
      { _id: id, role: "coorporate-student" },
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
export const deleteCorporateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCorporateUser = await User.findOneAndDelete({
      _id: id,
      role: "coorporate-student",
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
export const toggleCorporateStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const corporateUser = await User.findOne({
      _id: id,
      role: "coorporate-student",
    });

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
