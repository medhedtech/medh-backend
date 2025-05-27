import Student from "../models/student-model.js";

// Create a new student
export const createStudent = async (req, res) => {
  try {
    const {
      full_name,
      age,
      email,
      course_name,
      createdBy,
      status,
      upload_image,
    } = req.body;

    const newStudent = new Student({
      full_name,
      age,
      email,
      course_name,
      meta: {
        createdBy,
      },
      status,
      upload_image,
    });

    await newStudent.save();
    res
      .status(201)
      .json({ message: "Student created successfully", newStudent });
  } catch (error) {
    res.status(500).json({ message: "Error creating student", error });
  }
};

// Get all students
export const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .populate({
        path: 'assigned_instructor',
        select: 'full_name email role domain phone_numbers',
        match: { role: { $in: ['instructor'] } }
      });
    const activeStudents = await Student.countDocuments({
      status: "Active",
    });

    // Send the response
    res.status(200).json({
      message: "Students fetched successfully",
      students,
      totalStudents: activeStudents,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching students", error });
  }
};

// Get student by ID
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id)
      .populate({
        path: 'assigned_instructor',
        select: 'full_name email role domain phone_numbers',
        match: { role: { $in: ['instructor'] } }
      });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ message: "Error fetching student", error });
  }
};

// Update student by ID
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      age,
      email,
      course_name,
      updatedBy,
      status,
      upload_image,
    } = req.body;

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      {
        full_name,
        age,
        email,
        course_name,
        meta: {
          updatedBy,
        },
        status,
        upload_image,
      },
      { new: true, runValidators: true },
    );

    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json(updatedStudent);
  } catch (error) {
    res.status(500).json({ message: "Error updating student", error });
  }
};

// Delete student by ID
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStudent = await Student.findByIdAndDelete(id);
    if (!deletedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting student", error });
  }
};

//Toggle student status by ID
export const toggleStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Toggle the student's status between Active and Inactive
    const newStatus = student.status === "Active" ? "Inactive" : "Active";
    student.status = newStatus;
    await student.save();

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
