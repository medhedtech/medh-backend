const EnrolledCourse = require("../models/enrolled-courses-model");
const OnlineMeeting = require("../models/online-meeting");
const Student = require("../models/student-model");
const Course = require("../models/course-model");
const User = require("../models/user-controller");
const EnrolledModule = require("../models/enrolled-modules.modal");

// Create a new enrollment
exports.createEnrolledCourse = async (req, res) => {
  try {
    const { student_id, course_id, expiry_date, is_self_paced } = req.body;

    // Check if the student exists
    const student = await User.findById(student_id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check if the course exists
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Create a new enrollment (EnrolledCourse) record
    const newEnrolledCourse = new EnrolledCourse({
      student_id,
      course_id,
      is_self_paced,
      ...(expiry_date && { expiry_date }),
    });

    // Save the enrollment record
    await newEnrolledCourse.save();

    if (course.course_videos && course.course_videos.length > 0) {
      const enrolledModules = course.course_videos.map((video_url) => ({
        student_id,
        course_id,
        enrollment_id: newEnrolledCourse._id,
        video_url,
      }));
      await EnrolledModule.insertMany(enrolledModules);
    }

    res
      .status(201)
      .json({ message: "Student enrolled successfully", newEnrolledCourse });
  } catch (error) {
    res.status(500).json({ message: "Error creating enrollment", error });
  }
};

// Get all enrollments
exports.getAllEnrolledCourses = async (req, res) => {
  try {
    const enrollments = await EnrolledCourse.find()
      .populate("student_id")
      .populate("course_id");

    res.status(200).json(enrollments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching enrollments", error });
  }
};

// Get enrollment by ID
exports.getEnrolledCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const enrollment = await EnrolledCourse.findById(id)
      .populate("student_id")
      .populate("course_id");

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    res.status(200).json(enrollment);
  } catch (error) {
    res.status(500).json({ message: "Error fetching enrollment", error });
  }
};

exports.updateEnrolledCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { student_id, course_id, is_completed } = req.body;

    // Optional: Check if the student exists
    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Optional: Check if the course exists
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Find the enrollment record
    const enrollment = await EnrolledCourse.findById(id);
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    // Update the fields
    if (student_id) enrollment.student_id = student_id;
    if (course_id) enrollment.course_id = course_id;

    // Update completion status and set `completed_on` if completed
    if (typeof is_completed !== "undefined") {
      enrollment.is_completed = is_completed;
      enrollment.completed_on = is_completed ? new Date() : null;
    }

    // Save the updated record
    const updatedEnrolledCourse = await enrollment.save();

    res.status(200).json({
      message: "Enrollment updated successfully",
      enrollment: updatedEnrolledCourse,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating enrollment", error });
  }
};

// Delete enrollment by ID
exports.deleteEnrolledCourse = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete the enrollment record
    const deletedEnrolledCourse = await EnrolledCourse.findByIdAndDelete(id);

    if (!deletedEnrolledCourse) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    res.status(200).json({ message: "Enrollment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting enrollment", error });
  }
};

exports.getEnrolledCourseByStudentId = async (req, res) => {
  try {
    const { student_id } = req.params;

    // Fetch enrollments for the given student ID
    const enrollments = await EnrolledCourse.find({ student_id })
      .populate("student_id")
      .populate({
        path: "course_id",
        populate: {
          path: "assigned_instructor",
          model: "AssignedInstructor",
        },
      });
    // populate enrolled modules

    if (!enrollments.length) {
      return res
        .status(404)
        .json({ message: "No enrollments found for this student" });
    }

    res.status(200).json(enrollments);
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    res
      .status(500)
      .json({ message: "Error fetching enrollments by student ID", error });
  }
};

exports.getEnrolledStudentsByCourseId = async (req, res) => {
  try {
    const { course_id } = req.params;

    // Find enrolled courses and populate with student details
    const studentsEnrolled = await EnrolledCourse.find({ course_id }).populate(
      "student_id"
    );

    if (!studentsEnrolled.length) {
      return res
        .status(400)
        .json({ message: "No students enrolled for this course" });
    }

    // Fetch only those students with the role of "student"
    const filteredStudents = studentsEnrolled.filter(
      (enrollment) =>
        enrollment.student_id && enrollment.student_id.role.includes("student")
    );

    if (!filteredStudents.length) {
      return res.status(400).json({
        message: "No students with role 'student' enrolled for this course",
      });
    }

    res.status(200).json(filteredStudents);
  } catch (error) {
    console.error("Error fetching enrollments: ", error);
    res.status(500).json({
      message: "Error fetching students enrolled by course ID",
      error,
    });
  }
};

exports.markCourseAsCompleted = async (req, res) => {
  try {
    const { student_id, course_id } = req.body;

    // Find the enrollment record
    const enrollment = await EnrolledCourse.findOne({ student_id, course_id });
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    // Update `is_completed` and `completed_on`
    enrollment.is_completed = true;
    enrollment.completed_on = new Date();

    await enrollment.save();

    res.status(200).json({
      message: "Course marked as completed successfully",
      enrollment,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error marking course as completed", error });
  }
};

// In your EnrolledCourse controller

exports.getEnrollmentCountsByStudentId = async (req, res) => {
  try {
    const { student_id } = req.params;
    const totalEnrollments = await EnrolledCourse.countDocuments({
      student_id,
    });
    const enrollments = await EnrolledCourse.find({ student_id }).populate(
      "course_id"
    );
    const liveCoursesCount = enrollments.filter(
      (enrollment) => enrollment.course_id.course_category === "Live Courses"
    ).length;
    const selfPackedCourses = 10;

    // Send response with both counts
    res
      .status(200)
      .json({ totalEnrollments, liveCoursesCount, selfPackedCourses });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching enrollments count", error });
  }
};

// Get upcoming online meetings for a student's enrolled courses
exports.getUpcomingMeetingsForStudent = async (req, res) => {
  try {
    const { student_id } = req.params;

    // Find all courses the student is enrolled in
    const enrollments = await EnrolledCourse.find({ student_id }).populate(
      "course_id"
    );
    if (!enrollments.length) {
      return res
        .status(404)
        .json({ message: "No enrollments found for this student" });
    }

    // Extract course names from the enrollments
    const enrolledCourseNames = enrollments.map(
      (enrollment) => enrollment.course_id.course_title
    );

    // Fetch upcoming meetings for these courses
    const upcomingMeetings = await OnlineMeeting.find({
      course_name: { $in: enrolledCourseNames },
      date: { $gte: new Date() },
    }).sort({ date: 1, time: 1 });

    if (!upcomingMeetings.length) {
      return res.status(404).json({
        message: "No upcoming meetings found for the student's courses",
      });
    }

    // Respond with the list of upcoming meetings
    res.status(200).json({
      message: "Upcoming meetings fetched successfully",
      upcomingMeetings,
    });
  } catch (error) {
    console.error("Error fetching upcoming meetings:", error);
    res
      .status(500)
      .json({ message: "Error fetching upcoming meetings", error });
  }
};

exports.watchVideo = async (req, res) => {
  try {
    const { id } = req.query;
    const enrolledModule = await EnrolledModule.findById(id);
    enrolledModule.is_watched = true;
    await enrolledModule.save();
    const course = await Course.findById(enrolledModule.course_id);
    const enrolledModules = await EnrolledModule.find({
      course_id: course._id,
      student_id: enrolledModule.student_id,
      is_watched: true,
    });
    if (course.course_videos.length === enrolledModules.length) {
      await EnrolledCourse.findOneAndUpdate(
        {
          is_completed: false,
          course_id: course._id,
          student_id: enrolledModule.student_id,
        },
        {
          is_completed: true,
          completed_on: new Date(),
        }
      );
    }
    res.status(200).json({
      success: true,
      message: "marked as watched",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

exports.getAllStudentsWithEnrolledCourses = async (req, res) => {
  try {
    // Fetch enrollments and populate user (student) and course details
    const enrollments = await EnrolledCourse.find({
      course_id: { $exists: true },
    })
      .populate({
        path: "student_id",
        match: { role: "student" },
        model: "User",
      })
      .populate({
        path: "course_id",
        model: "Course",
      });

    // Filter out enrollments where student details or course details are missing
    const filteredEnrollments = enrollments.filter(
      (enrollment) => enrollment.student_id && enrollment.course_id
    );

    // Check if there are any valid enrollments
    if (!filteredEnrollments.length) {
      return res.status(404).json({
        message: "No students enrolled in courses found",
      });
    }

    // Respond with the list of students and their enrolled courses
    res.status(200).json({
      message: "Students with enrolled courses fetched successfully",
      enrollments: filteredEnrollments,
    });
  } catch (error) {
    console.error("Error fetching students and enrolled courses: ", error);
    res.status(500).json({
      message: "Error fetching students and enrolled courses",
      error,
    });
  }
};
