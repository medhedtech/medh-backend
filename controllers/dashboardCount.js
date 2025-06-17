import Course from "../models/course-model.js";
import EnrolledCourse from "../models/enrolled-courses-model.js";
import Instructor from "../models/instructor-model.js";
import User from "../models/user-modal.js";
import { USER_PERMISSIONS, USER_ADMIN_ROLES } from "../models/user-modal.js";

// Get all counts
export const getDashboardCounts = async (req, res) => {
  try {
    // Check if user exists in request (from auth middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // SuperAdmin automatically has access to all dashboard data
    // For other users, check if they have the admin_dashboard permission
    const isAuthorized =
      req.user.admin_role === USER_ADMIN_ROLES.SUPER_ADMIN ||
      USER_ADMIN_ROLES.ADMIN ||
      USER_ADMIN_ROLES.INSTRUCTOR ||
      USER_ADMIN_ROLES.CORPORATE ||
      USER_ADMIN_ROLES.CORPORATE_STUDENT ||
      USER_ADMIN_ROLES.STUDENT ||
      (req.user.permissions &&
        req.user.permissions.includes(USER_PERMISSIONS.ADMIN_DASHBOARD));

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access the dashboard data",
      });
    }

    const enrolledCourses = await EnrolledCourse.countDocuments();
    const activeStudents = await User.countDocuments({
      is_active: true,
      role: ["student"],
    });
    const totalInstructors = await User.countDocuments({
      role: "instructor",
      is_active: true,
    });
    const totalCourses = await Course.countDocuments();
    const corporateEmployees = await User.countDocuments({
      role: {
        $in: ["coorporate-student"],
      },
      is_active: true,
    });
    const schools = await User.countDocuments({
      company_type: { $in: ["Institute", "University"] },
      is_active: true,
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
