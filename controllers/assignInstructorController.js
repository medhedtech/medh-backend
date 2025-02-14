const User = require("../models/user-controller");
const InstructorAssignment = require("../models/assign-instructor-model");
const Course = require("../models/course-model");

const createOrUpdateInstructorAssignment = async (req, res) => {
  try {
    const { full_name, email, course_title, user_id } = req.body;

    console.log("Request Data:", {
      full_name,
      email,
      course_title,
      // course_type,
      user_id,
    });

    // Ensure the course exists
    const course = await Course.findOne({ course_title });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Verify the user is an instructor
    const user = await User.findOne({ _id: user_id, role: "instructor" });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found or is not an instructor" });
    }

    // Check if an instructor is already assigned to this course
    let assignment = await InstructorAssignment.findOne({
      course_title,
    });

    if (assignment) {
      // Update existing assignment
      assignment.full_name = user.full_name;
      assignment.email = user.email;
      // assignment.course_type = course_type;
      assignment.user_id = user._id;
      await assignment.save();

      // Update the assigned instructor in the Course
      course.assigned_instructor = assignment.user_id;
      await course.save();

      return res.status(200).json({
        message: "Instructor updated successfully for the course",
        assignment,
      });
    } else {
      // Create new assignment
      const newAssignment = new InstructorAssignment({
        full_name: user.full_name,
        email: user.email,
        course_title,
        // course_type,
        user_id: user._id,
      });

      await newAssignment.save();
      course.assigned_instructor = newAssignment._id;
      await course.save();

      return res.status(201).json({
        message: "Instructor assigned successfully to the course",
        assignment: newAssignment,
      });
    }
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ message: "Error assigning/updating instructor", error });
  }
};

const getAllInstructorAssignments = async (req, res) => {
  try {
    const assignments = await InstructorAssignment.find()
      .populate("user_id", "full_name email")
      .sort({ createdAt: -1 });

    const assignmentsWithCount = assignments.map((assignment, index) => ({
      ...assignment.toObject(),
      count: index + 1,
    }));

    res.status(200).json(assignmentsWithCount);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching instructor assignments", error });
  }
};

const getInstructorAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment =
      (await InstructorAssignment.findById(id)) ||
      (await InstructorAssignment.findOne({ user_id: id }));

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Return the assignment with populated instructor details
    res.status(200).json({
      message: "Instructor assignment fetched successfully",
      assignment,
    });
  } catch (error) {
    console.error("Error fetching instructor assignment:", error);
    res.status(500).json({ message: "Error fetching assignment", error });
  }
};

const updateInstructorAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, course_title } = req.body;

    // Find the instructor assignment by ID
    const assignment = await InstructorAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Verify the user is an instructor
    const user = await User.findOne({ role: "instructor" });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found or is not an instructor" });
    }

    // Update the assignment
    assignment.full_name = full_name;
    assignment.email = email;
    assignment.course_title = course_title;
    // assignment.course_type = course_type;

    await assignment.save();

    return res.status(200).json({
      message: "Instructor updated successfully for the course",
      assignment,
    });
  } catch (error) {
    console.error("Error updating instructor assignment:", error);
    res
      .status(500)
      .json({ message: "Error updating instructor assignment", error });
  }
};

// Delete instructor assignment by ID
const deleteInstructorAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAssignment = await InstructorAssignment.findByIdAndDelete(id);

    if (!deletedAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    res.status(200).json({ message: "Assignment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting assignment", error });
  }
};

const getAssignedCoursesByInstructorId = async (req, res) => {
  try {
    const { id } = req.params;

    // Find all courses assigned to the given instructor
    const courses = await Course.find({ assigned_instructor: id }).populate(
      "assigned_instructor",
      "full_name email"
    );

    if (!courses || courses.length === 0) {
      return res
        .status(404)
        .json({ message: "No courses assigned to this instructor" });
    }

    res.status(200).json({ message: "Courses fetched successfully", courses });
  } catch (error) {
    console.error("Error fetching assigned courses:", error);
    res.status(500).json({ message: "Error fetching assigned courses", error });
  }
};

module.exports = {
  createOrUpdateInstructorAssignment,
  getAssignedCoursesByInstructorId,
  getAllInstructorAssignments,
  getInstructorAssignmentById,
  updateInstructorAssignment,
  deleteInstructorAssignment,
};
