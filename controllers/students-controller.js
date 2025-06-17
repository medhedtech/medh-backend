import User, { USER_ROLES } from "../models/user-modal.js";

// Create a new student (stored in User collection)
export const createStudent = async (req, res) => {
  try {
    const { full_name, email, password, phone_numbers = [], status } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required" });
    }
    // Create user with student role
    const newUser = new User({
      full_name,
      email,
      password,
      phone_numbers,
      status: status || "Active",
      role: [USER_ROLES.STUDENT]
    });
    await newUser.save();
    res.status(201).json({ message: "Student user created successfully", user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Error creating student user", error });
  }
};

// Get all student users
export const getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: USER_ROLES.STUDENT });
    const totalStudents = await User.countDocuments({ role: USER_ROLES.STUDENT, is_active: true });
    res.status(200).json({ message: "Students fetched successfully", students, totalStudents });
  } catch (error) {
    res.status(500).json({ message: "Error fetching students", error });
  }
};

// Get a student user by ID
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await User.findOne({ _id: id, role: USER_ROLES.STUDENT });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ message: "Error fetching student", error });
  }
};

// Update a student user by ID
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    // Prevent role change
    delete updateData.role;
    const updatedStudent = await User.findOneAndUpdate(
      { _id: id, role: USER_ROLES.STUDENT },
      updateData,
      { new: true, runValidators: true }
    );
    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.status(200).json(updatedStudent);
  } catch (error) {
    res.status(500).json({ message: "Error updating student", error });
  }
};

// Delete a student user by ID
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStudent = await User.findOneAndDelete({ _id: id, role: USER_ROLES.STUDENT });
    if (!deletedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting student", error });
  }
};

// Toggle student status by ID
export const toggleStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await User.findOne({ _id: id, role: USER_ROLES.STUDENT });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    const newStatus = student.status === "Active" ? "Inactive" : "Active";
    student.status = newStatus;
    await student.save();
    res.status(200).json({ message: `Student status updated to ${newStatus}`, student: { id: student._id, status: student.status, full_name: student.full_name } });
  } catch (error) {
    console.error("Error toggling student status:", error);
    res.status(500).json({ message: "Error toggling student status. Please try again later.", error: error.message });
  }
};
