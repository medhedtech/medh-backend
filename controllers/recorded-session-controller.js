const EnrolledCourse = require("../models/enrolled-courses-model");
const RecordedSession = require("../models/recorded-sessions-model");
const Student = require("../models/student-model");
const Course = require("../models/course-model");
const Instructor = require("../models/instructor-model");

// Get Recorded Sessions for a student based on enrolled courses
exports.getRecordedSessionsByStudent = async (req, res) => {
  try {
    const { student_id } = req.params;

    // Check if the student exists
    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get the list of courses the student is enrolled in
    const enrolledCourses = await EnrolledCourse.find({ student_id }).populate(
      "course_id"
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
exports.createRecordedSession = async (req, res) => {
  try {
    const {
      instructor_id,
      course_id,
      session_title,
      session_date,
      session_link,
    } = req.body;

    // Validate that the instructor exists
    const instructor = await Instructor.findById(instructor_id);
    if (!instructor) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    // Validate that the course exists
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Create a new recorded session
    const newRecordedSession = new RecordedSession({
      instructor_id,
      course_id,
      session_title,
      session_date,
      session_link,
    });

    await newRecordedSession.save();
    res.status(201).json({
      message: "Recorded session created successfully",
      newRecordedSession,
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating recorded session", error });
  }
};

// Get recorded session by ID (accessible to students if they are enrolled in the course)
exports.getRecordedSessionById = async (req, res) => {
  try {
    const { student_id, session_id } = req.params;

    // Check if the student exists
    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check if the student is enrolled in the course related to the session
    const session = await RecordedSession.findById(session_id).populate(
      "course_id"
    );
    if (!session) {
      return res.status(404).json({ message: "Recorded session not found" });
    }

    const enrolledCourse = await EnrolledCourse.findOne({
      student_id,
      course_id: session.course_id._id,
    });

    if (!enrolledCourse) {
      return res.status(403).json({
        message: "Student is not enrolled in the course for this session",
      });
    }

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ message: "Error fetching recorded session", error });
  }
};

// Update recorded session by ID (for instructor/admin)
exports.updateRecordedSession = async (req, res) => {
  try {
    const { session_id } = req.params;
    const {
      instructor_id,
      course_id,
      session_title,
      session_date,
      session_link,
    } = req.body;

    const updatedRecordedSession = await RecordedSession.findByIdAndUpdate(
      session_id,
      { instructor_id, course_id, session_title, session_date, session_link },
      { new: true, runValidators: true }
    );

    if (!updatedRecordedSession) {
      return res.status(404).json({ message: "Recorded session not found" });
    }

    res.status(200).json(updatedRecordedSession);
  } catch (error) {
    res.status(500).json({ message: "Error updating recorded session", error });
  }
};

// Delete recorded session by ID (for instructor/admin)
exports.deleteRecordedSession = async (req, res) => {
  try {
    const { session_id } = req.params;

    const deletedRecordedSession = await RecordedSession.findByIdAndDelete(
      session_id
    );

    if (!deletedRecordedSession) {
      return res.status(404).json({ message: "Recorded session not found" });
    }

    res.status(200).json({ message: "Recorded session deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting recorded session", error });
  }
};
