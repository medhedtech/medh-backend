import CoorporateAssignCourse from "../models/assigned-courses-coorporates-modal.js";
import CoorporateEnrolledModule from "../models/coorporate-enrolled-modules.model.js";
import Course from "../models/course-model.js";
import OnlineMeeting from "../models/online-meeting.js";
import User from "../models/user-modal.js";

export const createCoorporateAssignCourse = async (req, res) => {
  try {
    const { coorporate_id, course_id, expiry_date } = req.body;

    // Check if the corporate user exists
    const corporateUser = await User.findById(coorporate_id);
    if (!corporateUser) {
      return res.status(404).json({ message: "Corporate user not found" });
    }

    // Check if the course exists
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const olineMeetings = await OnlineMeeting.find({
      course_id,
    });
    const employees = await User.find({ corporate_id: coorporate_id });
    console.log("employees", employees);
    const employeeIds = employees.map((employee) => employee._id);

    for (const meeting of olineMeetings) {
      const existingCorporateStudent = meeting.corporate_students;
      const newCorporateStudents = new Set([
        ...existingCorporateStudent,
        ...employeeIds,
      ]);
      meeting.corporate_students = Array.from(newCorporateStudents);
      await meeting.save();
    }

    // Check if an assignment already exists for the corporate and course
    let existingAssignment = await CoorporateAssignCourse.findOne({
      coorporate_id,
      course_id,
    });

    if (!existingAssignment) {
      // Create a new assignment if it doesn't exist
      existingAssignment = new CoorporateAssignCourse({
        coorporate_id,
        course_id,
        ...(expiry_date && { expiry_date }),
      });

      await existingAssignment.save();
    }

    // Fetch all corporate students based on their role "coorporate-student"
    const corporateStudents = await User.find({ role: "coorporate-student" });

    // Check if the course has videos
    if (course.course_videos && course.course_videos.length > 0) {
      let enrolledModules = [];

      for (const corporateStudent of corporateStudents) {
        // Check if the corporate student is already enrolled in this course
        const existingEnrollment = await CoorporateEnrolledModule.findOne({
          coorporate_id: corporateStudent._id,
          course_id: course._id,
        });

        // Skip the student if they are already enrolled
        if (existingEnrollment) {
          console.log(
            `Student ${corporateStudent.full_name} is already enrolled in the course.`,
          );
          continue;
        }

        // If not enrolled, create new enrolled modules for this student
        enrolledModules.push(
          ...course.course_videos.map((video_url) => ({
            coorporate_id: corporateStudent._id,
            course_id: course._id,
            enrollment_id: existingAssignment._id,
            video_url,
            ...(expiry_date && { expiry_date }),
          })),
        );
      }

      // Enroll all corporate students who were not already enrolled
      if (enrolledModules.length > 0) {
        await CoorporateEnrolledModule.insertMany(enrolledModules);
        console.log(
          `Enrolled ${enrolledModules.length} students to the course ${course_id}`,
        );
      } else {
        console.log("No new enrollments, all students are already enrolled.");
      }

      return res.status(201).json({
        message: "Corporate students enrolled successfully",
        enrolledModules,
      });
    } else {
      return res.status(400).json({
        message:
          "This course has no videos to enroll the corporate students in",
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error enrolling corporate students", error });
  }
};

// Get all corporate course assignments
export const getAllCoorporateAssignCourses = async (req, res) => {
  try {
    const assignments = await CoorporateAssignCourse.find()
      .populate("coorporate_id")
      .populate("course_id");

    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching assignments", error });
  }
};

// Get assignment by ID
export const getCoorporateAssignCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await CoorporateAssignCourse.findById(id)
      .populate("coorporate_id")
      .populate("course_id");

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.status(200).json(assignment);
  } catch (error) {
    res.status(500).json({ message: "Error fetching assignment", error });
  }
};

// Delete assignment by ID
export const deleteCoorporateAssignCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedAssignment =
      await CoorporateAssignCourse.findByIdAndDelete(id);
    if (!deletedAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.status(200).json({ message: "Assignment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting assignment", error });
  }
};

// Get assignments by corporate ID
export const getCoorporateAssignCourseByCoorporateId = async (req, res) => {
  try {
    const { coorporate_id } = req.params;

    const assignments = await CoorporateAssignCourse.find({ coorporate_id })
      .populate("coorporate_id")
      .populate("course_id");

    if (!assignments.length) {
      return res
        .status(404)
        .json({ message: "No assignments found for this corporate user" });
    }

    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching assignments", error });
  }
};

// Get assignments by course ID
export const getEnrolledCoorporatesByCourseId = async (req, res) => {
  try {
    const { course_id } = req.params;

    const assignments = await CoorporateAssignCourse.find({
      course_id,
    }).populate("coorporate_id");

    if (!assignments.length) {
      return res
        .status(404)
        .json({ message: "No corporates enrolled in this course" });
    }

    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching enrollments", error });
  }
};

// Mark a video as watched
export const watchCoorporateVideo = async (req, res) => {
  try {
    const { id } = req.query;

    const enrolledModule = await CoorporateEnrolledModule.findById(id);
    if (!enrolledModule) {
      return res.status(404).json({ message: "Module not found" });
    }

    enrolledModule.is_watched = true;
    await enrolledModule.save();

    const course = await Course.findById(enrolledModule.course_id);
    const watchedModules = await CoorporateEnrolledModule.find({
      course_id: course._id,
      coorporate_id: enrolledModule.coorporate_id,
      is_watched: true,
    });

    // Check if all course videos are watched
    if (course.course_videos.length === watchedModules.length) {
      await CoorporateAssignCourse.findOneAndUpdate(
        {
          course_id: course._id,
          coorporate_id: enrolledModule.coorporate_id,
        },
        {
          is_completed: true,
          completed_on: new Date(),
        },
      );
    }

    res.status(200).json({
      success: true,
      message: "Video marked as watched",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error marking video as watched",
      error,
    });
  }
};

// Get Courses by Corporate Student ID and Fetch Instructor Details from User Model
export const getCoursesByCorporateStudentId = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Corporate ID is required" });
    }

    // Find all course IDs enrolled by the corporate student
    const enrolledModules = await CoorporateEnrolledModule.find({
      coorporate_id: id,
    }).distinct("course_id");

    if (enrolledModules.length === 0) {
      return res
        .status(404)
        .json({ message: "No courses found for this corporate-student" });
    }

    // Fetch courses
    const courses = await Course.find({ _id: { $in: enrolledModules } });

    // Map through courses to fetch instructor details from the User model
    const coursesWithInstructorDetails = await Promise.all(
      courses.map(async (course) => {
        if (course.assigned_instructor) {
          const instructor = await User.findOne(
            { _id: course.assigned_instructor, role: "instructor" },
            "full_name email",
          );
          return { ...course._doc, assigned_instructor: instructor || null };
        }
        return course;
      }),
    );

    res.status(200).json({
      success: true,
      message: "Courses fetched successfully",
      courses: coursesWithInstructorDetails,
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching courses for corporate-student",
      error,
    });
  }
};

// Get the count of enrolled corporate-students in a specific course
export const getCorporateStudentCountByCourseId = async (req, res) => {
  try {
    const { course_id } = req.params;

    if (!course_id) {
      return res.status(400).json({ message: "Course ID is required" });
    }

    // Find all corporate-student enrollments in the given course
    const enrolledCorporateStudentsCount =
      await CoorporateEnrolledModule.countDocuments({
        course_id,
        coorporate_id: {
          $in: await User.find({ role: "coorporate-student" }).distinct("_id"),
        },
      });

    res.status(200).json({
      success: true,
      message: "Corporate student count fetched successfully",
      count: enrolledCorporateStudentsCount,
    });
  } catch (error) {
    console.error("Error fetching corporate student count:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching corporate student count",
      error,
    });
  }
};

export const getEnrollmentCountsByCoorporateStudentId = async (req, res) => {
  try {
    const { coorporate_id } = req.params;

    if (!coorporate_id) {
      return res.status(400).json({ message: "Corporate ID is required" });
    }

    // Get all enrollments for the given corporate student
    const enrollments = await CoorporateEnrolledModule.find({
      coorporate_id,
    }).populate("course_id");

    if (!enrollments.length) {
      return res.status(404).json({
        message: "No enrollments found for this corporate student",
      });
    }

    // Calculate total enrollments
    const totalEnrollments = enrollments.length;

    // Count live courses
    const liveCoursesCount = enrollments.filter(
      (enrollment) => enrollment.course_id.course_category === "Live Courses",
    ).length;

    // Count self-paced courses dynamically
    const selfPacedCoursesCount = enrollments.filter(
      (enrollment) => enrollment.course_id.course_category === "Self-Paced",
    ).length;

    // Send response with all counts
    res.status(200).json({
      success: true,
      totalEnrollments,
      liveCoursesCount,
      selfPacedCoursesCount,
    });
  } catch (error) {
    console.error("Error fetching enrollments count:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching enrollments count",
      error,
    });
  }
};
