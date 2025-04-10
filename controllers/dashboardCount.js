import User from "../models/user-modal.js";
import Course from "../models/course-model.js";
import Instructor from "../models/instructor-model.js";
import EnrolledCourse from "../models/enrolled-courses-model.js";

// Get all counts
export const getDashboardCounts = async (req, res) => {
  try {
    const enrolledCourses = await EnrolledCourse.countDocuments();
    const activeStudents = await User.countDocuments({
      status: "Active",
      role: ["student"],
    });
    const totalInstructors = await User.countDocuments({
      role: "instructor",
      status: "Active",
    });
    const totalCourses = await Course.countDocuments();
    const corporateEmployees = await User.countDocuments({
      role: {
        $in: ["coorporate-student"],
      },
      status: "Active",
    });
    const schools = await User.countDocuments({
      company_type: { $in: ["Institute", "University"] },
      status: "Active",
    });

    console.log("Counts", {
      enrolledCourses,
      activeStudents,
      totalInstructors,
      totalCourses,
      corporateEmployees,
      schools,
    });

    res.status(200).json({
      message: "Counts fetched successfully",
      counts: {
        enrolledCourses,
        activeStudents,
        totalInstructors,
        totalCourses,
        corporateEmployees,
        schools,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching counts", error });
  }
};
