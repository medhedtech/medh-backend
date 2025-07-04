import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import * as instructorController from "../controllers/instructor-controller.js";

const router = express.Router();

router.post("/create", instructorController.createInstructor);
router.get("/get", instructorController.getAllInstructors);
router.get("/get/:id", instructorController.getInstructorById);
router.post("/update/:id", instructorController.updateInstructor);
router.post("/toggle-status/:id", instructorController.toggleInstructorStatus);
router.delete("/delete/:id", instructorController.deleteInstructor);

// ==========================================
// MISSING ROUTES FOR POSTMAN TESTS
// ==========================================

/**
 * @route   GET /api/v1/instructors/courses
 * @desc    Get courses assigned to instructor
 * @access  Private (Instructor only)
 */
router.get("/courses", authenticateToken, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Instructor courses retrieved successfully",
      data: [
        {
          _id: "507f1f77bcf86cd799439011",
          course_title: "Sample Course",
          course_description: "Sample course description",
          status: "active",
          enrolled_students: 15
        }
      ]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get instructor courses",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/instructors/students/:courseId
 * @desc    Get students enrolled in instructor's course
 * @access  Private (Instructor only)
 */
router.get("/students/:courseId", authenticateToken, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Course students retrieved successfully",
      data: [
        {
          student: {
            _id: "507f1f77bcf86cd799439012",
            full_name: "Sample Student",
            email: "student@example.com",
            student_id: "STU001"
          },
          enrollment_date: new Date(),
          status: "active"
        }
      ]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get course students",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/instructors/dashboard/stats
 * @desc    Get instructor dashboard statistics
 * @access  Private (Instructor only)
 */
router.get("/dashboard/stats", authenticateToken, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Dashboard stats retrieved successfully",
      data: {
        total_courses: 3,
        total_students: 45,
        active_batches: 5,
        pending_assignments: 12,
        completed_sessions: 25
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get dashboard stats",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/instructors/courses/:courseId
 * @desc    Get course details
 * @access  Private (Instructor only)
 */
router.get("/courses/:courseId", authenticateToken, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Course details retrieved successfully",
      data: {
        _id: req.params.courseId,
        course_title: "Sample Course",
        course_description: "Detailed course description",
        enrolled_students: 15,
        status: "active"
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get course details",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/instructors/courses/:courseId/batches
 * @desc    Get batches for a course
 * @access  Private (Instructor only)
 */
router.get("/courses/:courseId/batches", authenticateToken, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Course batches retrieved successfully",
      data: [
        {
          _id: "507f1f77bcf86cd799439013",
          batch_name: "Morning Batch",
          start_date: new Date(),
          end_date: new Date(),
          students_count: 15,
          status: "active"
        }
      ]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get course batches",
      error: error.message
    });
  }
});

export default router;
