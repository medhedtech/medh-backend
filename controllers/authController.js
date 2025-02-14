const bcrypt = require("bcryptjs");
const User = require("../models/user-controller");
const userValidation = require("../validations/userValidation");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { ENV_VARS } = require("../config/envVars");

// Set up the email transporter
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Register User
const registerUser = async (req, res) => {
  const { error, value } = userValidation.validate(req.body);

  if (error) {
    return res
      .status(400)
      .json({ success: false, message: error.details[0].message });
  }

  const {
    full_name,
    email,
    phone_number,
    password = "",
    agree_terms,
    role,
    role_description,
    assign_department,
    permissions,
    age,
    facebook_link,
    instagram_link,
    linkedin_link,
    user_image,
    admin_role,
  } = value;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    let role = {};
    if (admin_role === "admin") {
      role = {
        role: ["admin"],
      };
    }

    // Create a new user instance
    user = new User({
      full_name,
      email,
      phone_number,
      password,
      agree_terms,
      role_description,
      assign_department,
      permissions,
      age,
      facebook_link,
      instagram_link,
      linkedin_link,
      user_image,
      admin_role,
      ...role,
    });

    // Hash the password before saving
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    // Send email with credentials
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Medh Learning Platform",
      html: `
        <h2>Welcome, ${full_name}!</h2>
        <p>Thank you for registering with us. Here are your login credentials:</p>
        <ul>
          <li><strong>Username:</strong> ${email}</li>
          <li><strong>Password:</strong> ${password}</li>
        </ul>
        <p>Please keep this information secure. If you did not request this, please contact us immediately.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "User registered successfully, and email sent to the user.",
    });
  } catch (err) {
    console.error("Registration Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  console.log("asdnlkasjdlkjasldjlkasjdlkjasl");
  try {
    let user = await User.findOne({ email });
    console.log("123",user);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(isMatch);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, ENV_VARS.JWT_SECRET_KEY, {
      expiresIn: "24h",
    });

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      token,
      id: user.id,
      role: user.admin_role,
      permissions:
        user.admin_role === "super-admin"
          ? [
              "course_management",
              "student_management",
              "instructor_management",
              "corporate_management",
              "generate_certificate",
              "get_in_touch",
              "enquiry_form",
              "post_job",
              "feedback_and_complaints",
              "placement_requests",
              "blogs",
            ]
          : user.permissions || [],
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    let query = {};
    if (req.query.admin_role) {
      query.admin_role = req.query.admin_role;
    }
    if (req.query.admin_role === "admin") {
      query.role = {
        $nin: ["coorporate", "student", "instructor", "coorporate-student"],
      };
    }
    console.log("Query:", query);
    const users = await User.find(query);
    console.log("Users:", users);
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    console.error("Error in getAllUsers:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get User by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update User
const updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateUserByEmail = async (req, res) => {
  const { email, ...updates } = req.body;

  if (!email) {
    console.error("Missing email in request body.");
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });
  }

  if (!Object.keys(updates).length) {
    console.error("No updates provided in request body.");
    return res
      .status(400)
      .json({ success: false, message: "No update data provided" });
  }

  console.log("Incoming Request Body:", req.body);

  // Validate payload
  const { error } = userValidation.validate(updates);
  if (error) {
    console.error("Validation Error:", error.details[0].message);
    return res
      .status(400)
      .json({ success: false, message: error.details[0].message });
  }

  try {
    console.log("Attempting to update user in the database...");
    const updatedUser = await User.findOneAndUpdate({ email }, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      console.error("No user found with email:", email);
      return res
        .status(404)
        .json({ success: false, message: "User not found with this email" });
    }

    console.log("User updated successfully:", updatedUser);

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (err) {
    console.error("Error occurred while updating user:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//Toggle student status by ID
const toggleStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await User.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Toggle the student's status between Active and Inactive
    const newStatus = student.status === "Active" ? "Inactive" : "Active";
    student.status = newStatus;

    // Save updated student status
    await student.save();

    // Send success response with updated student information
    res.status(200).json({
      message: `Student status updated to ${newStatus}`,
      student: {
        id: student._id,
        status: student.status,
        full_name: student.full_name,
      },
    });
  } catch (error) {
    console.error("Error toggling student status:", error);
    res.status(500).json({
      message: "Error toggling student status. Please try again later.",
      error: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Generate a random temporary password
    const tempPassword = crypto.randomBytes(8).toString("hex");

    // Hash the temporary password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Update user's password in the database
    user.password = hashedPassword;
    await user.save();

    // Send email with temporary password
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Password Reset Request",
      html: `
        <h2>Dear ${user.full_name || "User"},</h2>
        <p>You requested to reset your password. Here is your temporary password:</p>
        <ul>
          <li><strong>Temporary Password:</strong> ${tempPassword}</li>
        </ul>
        <p>Please log in with this temporary password and change your password immediately after login.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "Temporary password has been sent to your email.",
    });
  } catch (err) {
    console.error("Error in forgotPassword:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

const verifyTemporaryPassword = async (req, res) => {
  const { email, tempPassword } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Verify the temporary password
    const isMatch = await bcrypt.compare(tempPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid temporary password" });
    }

    res.status(200).json({
      success: true,
      message: "Temporary password verified successfully",
    });
  } catch (err) {
    console.error("Error in verifyTemporaryPassword:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

const resetPassword = async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Passwords do not match" });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user's password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (err) {
    console.error("Error in resetPassword:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  updateUser,
  deleteUser,
  getAllUsers,
  updateUserByEmail,
  toggleStudentStatus,
  forgotPassword,
  resetPassword,
  verifyTemporaryPassword,
};
