import Course from "../models/course-model.js";
import EnrolledCourse from "../models/enrolled-courses-model.js";
import Instructor from "../models/instructor-model.js";
import RecordedSession from "../models/recorded-sessions-model.js";
import Student from "../models/student-model.js";

// Get Recorded Sessions for a student based on enrolled courses
export const getRecordedSessionsByStudent = async (req, res) => {
  try {
    const { student_id } = req.params;

    // Check if the student exists
    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get the list of courses the student is enrolled in
    const enrolledCourses = await EnrolledCourse.find({ student_id }).populate(
      "course_id",
    );

    if (!enrolledCourses || enrolledCourses.length === 0) {
      return res
        .status(404)
        .json({ message: "Student is not enrolled in any courses" });
    }

    // Extract course IDs from enrolled courses
    const courseIds = enrolledCourses.map((course) => course.course_id);

    // Fetch the recorded sessions for those courses
    const recordedSessions = await RecordedSession.find({
      course_id: { $in: courseIds },
    })
      .populate("instructor_id")
      .populate("course_id");

    if (!recordedSessions || recordedSessions.length === 0) {
      return res
        .status(404)
        .json({ message: "No recorded sessions found for enrolled courses" });
    }

    res.status(200).json(recordedSessions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching recorded sessions", error });
  }
};

// Create a new recorded session (for Instructor/Admin)
export const createRecordedSession = async (req, res) => {
  try {
    const recordedSession = await RecordedSession.create(req.body);
    res.status(201).json({
      message: "Recorded session created successfully",
      recordedSession,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating recorded session",
      error: error.message,
    });
  }
};

// Get recorded session by ID (accessible to students if they are enrolled in the course)
export const getRecordedSessionById = async (req, res) => {
  try {
    const recordedSession = await RecordedSession.findById(req.params.id)
      .populate("course")
      .populate("instructor");

    if (!recordedSession) {
      return res.status(404).json({
        message: "Recorded session not found",
      });
    }

    res.status(200).json({
      message: "Recorded session fetched successfully",
      recordedSession,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching recorded session",
      error: error.message,
    });
  }
};

// Update recorded session by ID (for instructor/admin)
export const updateRecordedSession = async (req, res) => {
  try {
    const recordedSession = await RecordedSession.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      },
    )
      .populate("course")
      .populate("instructor");

    if (!recordedSession) {
      return res.status(404).json({
        message: "Recorded session not found",
      });
    }

    res.status(200).json({
      message: "Recorded session updated successfully",
      recordedSession,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating recorded session",
      error: error.message,
    });
  }
};

// Delete recorded session by ID (for instructor/admin)
export const deleteRecordedSession = async (req, res) => {
  try {
    const recordedSession = await RecordedSession.findByIdAndDelete(
      req.params.id,
    );

    if (!recordedSession) {
      return res.status(404).json({
        message: "Recorded session not found",
      });
    }

    res.status(200).json({
      message: "Recorded session deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting recorded session",
      error: error.message,
    });
  }
};

export const getRecordedSessionsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const recordedSessions = await RecordedSession.find({ course: courseId })
      .populate("instructor")
      .sort("-createdAt");

    res.status(200).json({
      message: "Recorded sessions fetched successfully",
      recordedSessions,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching recorded sessions",
      error: error.message,
    });
  }
};

export const getRecordedSessionsByInstructor = async (req, res) => {
  try {
    const { instructorId } = req.params;
    const recordedSessions = await RecordedSession.find({
      instructor: instructorId,
    })
      .populate("course")
      .sort("-createdAt");

    res.status(200).json({
      message: "Recorded sessions fetched successfully",
      recordedSessions,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching recorded sessions",
      error: error.message,
    });
  }
};
