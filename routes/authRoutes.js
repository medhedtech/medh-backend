import express from "express";

import authController from "../controllers/authController.js";
import * as corporateStudentController from "../controllers/coorporate-student-controller.js";
import * as corporateController from "../controllers/corporateController.js";
import * as instructorController from "../controllers/instructor-controller.js";
import * as assignInstructorController from "../controllers/assignInstructorController.js";
import { authenticateToken } from "../middleware/auth.js";
import { loginLimiter, registerLimiter, passwordResetLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", registerLimiter, authController.registerUser.bind(authController));

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify user email with OTP
 * @access  Public
 */
router.post("/verify-email", authController.verifyEmailOTP.bind(authController));

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend verification OTP
 * @access  Public
 */
router.post("/resend-verification", authController.resendVerificationOTP.bind(authController));

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login a user and get token
 * @access  Public
 */
router.post("/login", loginLimiter, authController.loginUser.bind(authController));

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Get a new access token using a refresh token
 * @access  Public
 */
router.post("/refresh-token", (req, res, next) => {
  // Validate the input before processing
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    return res.status(400).json({
      success: false,
      message: "Refresh token is required",
      error_code: "MISSING_REFRESH_TOKEN"
    });
  }
  
  // Continue to the controller
  return authController.refreshToken.bind(authController)(req, res, next);
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout a user by invalidating their refresh token
 * @access  Private
 */
router.post("/logout", authenticateToken, authController.logout.bind(authController));

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send temporary password to user's email
 * @access  Public
 */
router.post(
  "/forgot-password",
  passwordResetLimiter,
  authController.forgotPassword.bind(authController),
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset user password with token
 * @access  Public
 */
router.post(
  "/reset-password",
  passwordResetLimiter,
  authController.resetPassword.bind(authController),
);

/**
 * @route   GET /api/v1/auth/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
router.get(
  "/users",
  authenticateToken,
  authController.getAllUsers.bind(authController),
);

/**
 * @route   GET /api/v1/auth/get-all-students
 * @desc    Get all active users with STUDENT or CORPORATE-STUDENT roles (no pagination)
 * @access  Private (Admin only - or adjust as needed)
 */
router.get(
  "/get-all-students",
  authenticateToken,
  authController.getAllStudents.bind(authController),
);

/**
 * @route   GET /api/v1/auth/get-all-students-with-instructors
 * @desc    Get all students with their assigned instructor details
 * @access  Private (Admin only)
 */
router.get(
  "/get-all-students-with-instructors",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
        assignment_type,
        has_instructor
      } = req.query;

      // Import User model
      const User = (await import("../models/user-modal.js")).default;

      // Build query
      const query = { role: { $in: ["student", "coorporate-student"] } };

      if (status) query.status = status;
      if (assignment_type) query.instructor_assignment_type = assignment_type;
      if (has_instructor === 'true') {
        query.assigned_instructor = { $exists: true, $ne: null };
      } else if (has_instructor === 'false') {
        query.$or = [
          { assigned_instructor: { $exists: false } },
          { assigned_instructor: null }
        ];
      }

      // Search by name or email if search parameter is provided
      if (search) {
        query.$or = [
          { full_name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;

      // Execute query with pagination and sorting
      const students = await User.find(query)
        .select("-password")
        .populate({
          path: 'assigned_instructor',
          select: 'full_name email role domain phone_numbers',
          match: { role: { $in: ['instructor'] } }
        })
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const total = await User.countDocuments(query);

      // Get statistics
      const stats = await User.aggregate([
        { $match: { role: { $in: ["student", "coorporate-student"] } } },
        {
          $group: {
            _id: null,
            totalStudents: { $sum: 1 },
            studentsWithInstructor: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ["$assigned_instructor", null] }, { $ne: ["$assigned_instructor", undefined] }] },
                  1,
                  0
                ]
              }
            },
            studentsWithoutInstructor: {
              $sum: {
                $cond: [
                  { $or: [{ $eq: ["$assigned_instructor", null] }, { $eq: ["$assigned_instructor", undefined] }] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      if (!students || students.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No students found",
        });
      }

      res.status(200).json({
        success: true,
        count: students.length,
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        statistics: stats[0] || {
          totalStudents: 0,
          studentsWithInstructor: 0,
          studentsWithoutInstructor: 0
        },
        data: students,
      });
    } catch (error) {
      console.error("Error fetching students with instructors:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  },
);

/**
 * @route   GET /api/v1/auth/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get(
  "/users/:id",
  authenticateToken,
  authController.getUserById.bind(authController),
);

/**
 * @route   GET /api/v1/auth/get/:id
 * @desc    Get user by ID (alternative route for backward compatibility)
 * @access  Private
 */
router.get(
  "/get/:id",
  authenticateToken,
  authController.getUserById.bind(authController),
);

/**
 * @route   PUT /api/v1/auth/users/:id
 * @desc    Update user by ID
 * @access  Private
 */
router.put(
  "/users/:id",
  authenticateToken,
  authController.updateUser.bind(authController),
);

/**
 * @route   PUT /api/v1/auth/users/email/:email
 * @desc    Update user by email
 * @access  Private
 */
router.put(
  "/users/email/:email",
  authenticateToken,
  authController.updateUserByEmail.bind(authController),
);

/**
 * @route   DELETE /api/v1/auth/users/:id
 * @desc    Delete user by ID
 * @access  Private (Admin only)
 */
router.delete(
  "/users/:id",
  authenticateToken,
  authController.deleteUser.bind(authController),
);

/**
 * @route   PUT /api/v1/auth/toggle-status/:id
 * @desc    Toggle user active/inactive status
 * @access  Private (Admin only)
 */
router.put(
  "/toggle-status/:id",
  authenticateToken,
  authController.toggleUserStatus.bind(authController),
);

/**
 * @route   GET /api/v1/auth/get-all-courses-with-instructors
 * @desc    Get all courses with their assigned instructor details
 * @access  Private (Admin only)
 */
router.get(
  "/get-all-courses-with-instructors",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
        category,
        has_instructor
      } = req.query;

      // Import Course model
      const Course = (await import("../models/course-model.js")).default;

      // Build query
      const query = {};

      if (status) query.status = status;
      if (category) query.course_category = category;
      if (has_instructor === 'true') {
        query.assigned_instructor = { $exists: true, $ne: null };
      } else if (has_instructor === 'false') {
        query.$or = [
          { assigned_instructor: { $exists: false } },
          { assigned_instructor: null }
        ];
      }

      // Search by course title if search parameter is provided
      if (search) {
        query.course_title = { $regex: search, $options: "i" };
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;

      // Execute query with pagination and sorting
      const courses = await Course.find(query)
        .populate({
          path: 'assigned_instructor',
          select: 'full_name email role domain phone_numbers',
          match: { role: { $in: ['instructor'] } }
        })
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('course_title course_category course_image status createdAt assigned_instructor course_duration prices');

      // Get total count for pagination
      const total = await Course.countDocuments(query);

      // Get statistics
      const stats = await Course.aggregate([
        {
          $group: {
            _id: null,
            totalCourses: { $sum: 1 },
            coursesWithInstructor: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ["$assigned_instructor", null] }, { $ne: ["$assigned_instructor", undefined] }] },
                  1,
                  0
                ]
              }
            },
            coursesWithoutInstructor: {
              $sum: {
                $cond: [
                  { $or: [{ $eq: ["$assigned_instructor", null] }, { $eq: ["$assigned_instructor", undefined] }] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      if (!courses || courses.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No courses found",
        });
      }

      res.status(200).json({
        success: true,
        count: courses.length,
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        statistics: stats[0] || {
          totalCourses: 0,
          coursesWithInstructor: 0,
          coursesWithoutInstructor: 0
        },
        data: courses,
      });
    } catch (error) {
      console.error("Error fetching courses with instructors:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  },
);

router.post("/create", instructorController.createInstructor);
router.get("/get-all-instructors", instructorController.getAllInstructors);
router.get("/get-all-instrucors", instructorController.getAllInstructors);
router.get("/get-instructor/:id", instructorController.getInstructorById);
router.post("/updateInstrucor/:id", instructorController.updateInstructor);
router.post(
  "/toggle-status-instrucor/:id",
  instructorController.toggleInstructorStatus,
);
router.delete("/delete-instrucor/:id", instructorController.deleteInstructor);

// Instructor Assignment Routes
/**
 * @route   POST /api/v1/auth/assign-instructor-to-course
 * @desc    Assign an instructor to a course
 * @access  Private (Admin only)
 */
router.post(
  "/assign-instructor-to-course",
  authenticateToken,
  assignInstructorController.createOrUpdateInstructorAssignment,
);

/**
 * @route   GET /api/v1/auth/instructor-assignments
 * @desc    Get all instructor assignments
 * @access  Private (Admin only)
 */
router.get(
  "/instructor-assignments",
  authenticateToken,
  assignInstructorController.getAllInstructorAssignments,
);

/**
 * @route   GET /api/v1/auth/instructor-assignment/:id
 * @desc    Get instructor assignment by ID
 * @access  Private
 */
router.get(
  "/instructor-assignment/:id",
  authenticateToken,
  assignInstructorController.getInstructorAssignmentById,
);

/**
 * @route   PUT /api/v1/auth/instructor-assignment/:id
 * @desc    Update instructor assignment
 * @access  Private (Admin only)
 */
router.put(
  "/instructor-assignment/:id",
  authenticateToken,
  assignInstructorController.updateInstructorAssignment,
);

/**
 * @route   DELETE /api/v1/auth/instructor-assignment/:id
 * @desc    Delete instructor assignment
 * @access  Private (Admin only)
 */
router.delete(
  "/instructor-assignment/:id",
  authenticateToken,
  assignInstructorController.deleteInstructorAssignment,
);

/**
 * @route   GET /api/v1/auth/instructor-courses/:id
 * @desc    Get courses assigned to an instructor
 * @access  Private
 */
router.get(
  "/instructor-courses/:id",
  authenticateToken,
  assignInstructorController.getAssignedCoursesByInstructorId,
);

/**
 * @route   POST /api/v1/auth/assign-instructor-to-student
 * @desc    Assign an instructor to a student for mentoring/guidance
 * @access  Private (Admin only)
 */
router.post(
  "/assign-instructor-to-student",
  authenticateToken,
  async (req, res) => {
    try {
      const { instructor_id, student_id, assignment_type = "mentor", notes } = req.body;

      // Validate required fields
      if (!instructor_id || !student_id) {
        return res.status(400).json({
          success: false,
          message: "Instructor ID and Student ID are required",
        });
      }

      // Import User model
      const User = (await import("../models/user-modal.js")).default;

      // Verify instructor exists and has instructor role
      const instructor = await User.findOne({ 
        _id: instructor_id, 
        role: { $in: ["instructor"] }
      });
      if (!instructor) {
        return res.status(404).json({
          success: false,
          message: "Instructor not found or invalid role",
        });
      }

      // Verify student exists and has student role
      const student = await User.findOne({ 
        _id: student_id, 
        role: { $in: ["student", "coorporate-student"] }
      });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found or invalid role",
        });
      }

      // Check if assignment already exists
      if (student.assigned_instructor === instructor_id) {
        return res.status(400).json({
          success: false,
          message: "This instructor is already assigned to this student",
        });
      }

      // Assign instructor to student
      student.assigned_instructor = instructor_id;
      student.instructor_assignment_date = new Date();
      student.instructor_assignment_type = assignment_type;
      if (notes) {
        student.instructor_assignment_notes = notes;
      }

      await student.save();

      // Populate instructor details for response
      await student.populate('assigned_instructor', 'full_name email');

      res.status(200).json({
        success: true,
        message: "Instructor assigned to student successfully",
        data: {
          student_id: student._id,
          student_name: student.full_name,
          instructor_id: instructor._id,
          instructor_name: instructor.full_name,
          assignment_type,
          assignment_date: student.instructor_assignment_date,
          notes: student.instructor_assignment_notes,
        },
      });
    } catch (error) {
      console.error("Error assigning instructor to student:", error);
      res.status(500).json({
        success: false,
        message: "Error assigning instructor to student",
        error: error.message,
      });
    }
  },
);

/**
 * @route   GET /api/v1/auth/instructor-students/:instructor_id
 * @desc    Get all students assigned to an instructor
 * @access  Private
 */
router.get(
  "/instructor-students/:instructor_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { instructor_id } = req.params;

      // Import User model
      const User = (await import("../models/user-modal.js")).default;

      // Verify instructor exists
      const instructor = await User.findOne({ 
        _id: instructor_id, 
        role: { $in: ["instructor"] }
      });
      if (!instructor) {
        return res.status(404).json({
          success: false,
          message: "Instructor not found",
        });
      }

      // Find all students assigned to this instructor
      const assignedStudents = await User.find({ 
        assigned_instructor: instructor_id,
        role: { $in: ["student", "coorporate-student"] }
      }).select('full_name email role instructor_assignment_date instructor_assignment_type instructor_assignment_notes');

      res.status(200).json({
        success: true,
        message: "Students assigned to instructor fetched successfully",
        data: {
          instructor: {
            id: instructor._id,
            name: instructor.full_name,
            email: instructor.email,
          },
          assigned_students: assignedStudents,
          total_students: assignedStudents.length,
        },
      });
    } catch (error) {
      console.error("Error fetching instructor's students:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching instructor's students",
        error: error.message,
      });
    }
  },
);

/**
 * @route   DELETE /api/v1/auth/unassign-instructor-from-student/:student_id
 * @desc    Remove instructor assignment from a student
 * @access  Private (Admin only)
 */
router.delete(
  "/unassign-instructor-from-student/:student_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { student_id } = req.params;

      // Import User model
      const User = (await import("../models/user-modal.js")).default;

      // Find and update student
      const student = await User.findOne({ 
        _id: student_id, 
        role: { $in: ["student", "coorporate-student"] }
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      if (!student.assigned_instructor) {
        return res.status(400).json({
          success: false,
          message: "No instructor is currently assigned to this student",
        });
      }

      // Store instructor info for response
      const previousInstructor = await User.findById(student.assigned_instructor).select('full_name email');

      // Remove instructor assignment
      student.assigned_instructor = undefined;
      student.instructor_assignment_date = undefined;
      student.instructor_assignment_type = undefined;
      student.instructor_assignment_notes = undefined;

      await student.save();

      res.status(200).json({
        success: true,
        message: "Instructor unassigned from student successfully",
        data: {
          student_id: student._id,
          student_name: student.full_name,
          previous_instructor: previousInstructor ? {
            id: previousInstructor._id,
            name: previousInstructor.full_name,
            email: previousInstructor.email,
          } : null,
        },
      });
    } catch (error) {
      console.error("Error unassigning instructor from student:", error);
      res.status(500).json({
        success: false,
        message: "Error unassigning instructor from student",
        error: error.message,
      });
    }
  },
);

router.post("/add", corporateController.createCorporate);
router.get("/get-all-coorporates", corporateController.getAllCorporateUsers);
router.get("/get-coorporate/:id", corporateController.getCorporateById);
router.post("/update-coorporate/:id", corporateController.updateCorporate);
router.post(
  "/toggle-coorporate-status/:id",
  corporateController.toggleCorporateStatus,
);
router.delete("/delete-coorporate/:id", corporateController.deleteCorporate);

router.post(
  "/add-coorporate-student",
  corporateStudentController.createCorporateStudent,
);
router.get(
  "/get-all-coorporate-students",
  corporateStudentController.getAllCorporateStudents,
);
router.get(
  "/get-coorporate-student/:id",
  corporateStudentController.getCorporateStudentById,
);
router.post(
  "/update-coorporate-student/:id",
  corporateStudentController.updateCorporateStudent,
);
router.post(
  "/toggle-coorporate-student-status/:id",
  corporateStudentController.toggleCorporateStudentStatus,
);
router.delete(
  "/delete-coorporate-student/:id",
  corporateStudentController.deleteCorporateStudent,
);

router.post("/test-email", async (req, res) => {
  try {
    const mailOptions = {
      from: '"Medh Care" <care@medh.co>',
      to: "care@medh.co",
      subject: "Test Email",
      html: "<p>This is a test email to verify the email configuration.</p>",
    };

    await authController.sendEmail(mailOptions);
    res.status(200).json({
      success: true,
      message: "Test email sent successfully",
    });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: error.message,
    });
  }
});

export default router;
