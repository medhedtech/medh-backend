import express from "express";
import { body } from "express-validator";

import authController from "../controllers/authController.js";
import * as corporateStudentController from "../controllers/coorporate-student-controller.js";
import * as corporateController from "../controllers/corporateController.js";
import * as instructorController from "../controllers/instructor-controller.js";
import * as assignInstructorController from "../controllers/assignInstructorController.js";
import { authenticateToken } from "../middleware/auth.js";
import { loginLimiter, registerLimiter, passwordResetLimiter } from "../middleware/rateLimit.js";
import { validateChangePassword } from "../validations/passwordValidation.js";
import oauthRoutes from "./oauthRoutes.js";

const router = express.Router();

// ============================================================================
// OAUTH ROUTES
// ============================================================================

// Mount OAuth routes
router.use("/oauth", oauthRoutes);

/**
 * @route   GET /api/v1/auth/check-availability
 * @desc    Check if email or username is available
 * @access  Public
 */
router.get("/check-availability", authController.checkAvailability.bind(authController));

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", authController.registerUser.bind(authController));

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
 * @route   POST /api/v1/auth/check-user-status
 * @desc    Check user existence and verification status
 * @access  Public
 */
router.post("/check-user-status", authController.checkUserStatus.bind(authController));

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login a user and get token
 * @access  Public
 */
router.post("/login", authController.loginUser.bind(authController));

/**
 * @route   POST /api/v1/auth/complete-mfa-login
 * @desc    Complete login after MFA verification
 * @access  Public
 */
router.post("/complete-mfa-login", authController.completeMFALogin.bind(authController));

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
 * @route   POST /api/v1/auth/logout-all-devices
 * @desc    Logout a user from all devices by invalidating all sessions and tokens
 * @access  Private
 */
router.post("/logout-all-devices", authenticateToken, authController.logoutAllDevices.bind(authController));

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
 * @route   POST /api/v1/auth/verify-temp-password
 * @desc    Verify temporary password sent via email during password reset
 * @access  Public
 */
router.post(
  "/verify-temp-password",
  passwordResetLimiter, // Apply rate limiting to prevent brute force
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("tempPassword")
      .notEmpty()
      .withMessage("Temporary password is required")
      .isLength({ min: 1, max: 50 })
      .withMessage("Temporary password must be between 1 and 50 characters")
  ],
  authController.verifyTempPassword.bind(authController),
);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change password for authenticated users with enhanced security
 * @access  Private (Authenticated users only)
 */
router.put(
  "/change-password",
  authenticateToken,
  validateChangePassword,
  passwordResetLimiter, // Apply rate limiting to prevent brute force
  authController.changePassword.bind(authController)
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

// Account Lockout Management Routes

/**
 * @route   GET /api/v1/auth/locked-accounts
 * @desc    Get all currently locked accounts
 * @access  Private (Admin only)
 */
router.get(
  "/locked-accounts",
  authenticateToken,
  authController.getLockedAccounts.bind(authController),
);

/**
 * @route   POST /api/v1/auth/unlock-account/:userId
 * @desc    Unlock a specific user account
 * @access  Private (Admin only)
 */
router.post(
  "/unlock-account/:userId",
  authenticateToken,
  authController.unlockAccount.bind(authController),
);

/**
 * @route   POST /api/v1/auth/unlock-all-accounts
 * @desc    Unlock all locked accounts
 * @access  Private (Super Admin only)
 */
router.post(
  "/unlock-all-accounts",
  authenticateToken,
  authController.unlockAllAccounts.bind(authController),
);

/**
 * @route   GET /api/v1/auth/lockout-stats
 * @desc    Get account lockout statistics
 * @access  Private (Admin only)
 */
router.get(
  "/lockout-stats",
  authenticateToken,
  authController.getLockoutStats.bind(authController),
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

/**
 * @route   GET /api/v1/auth/login-analytics/:id
 * @desc    Get comprehensive login analytics for a specific user
 * @access  Private (Admin only)
 */
router.get(
  "/login-analytics/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Import User model
      const User = (await import("../models/user-modal.js")).default;

      // Find user by ID
      const user = await User.findById(id).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Get comprehensive login analytics
      const loginStats = user.getLoginStats();
      const recentHistory = user.getRecentLoginHistory(20);
      const loginPattern = user.getLoginPattern();
      const devicePreference = user.getDevicePreference();
      const browserPreference = user.getBrowserPreference();
      const securityScore = user.getSecurityScore();

      res.status(200).json({
        success: true,
        message: "Login analytics retrieved successfully",
        data: {
          user_info: {
            id: user._id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            status: user.status,
          },
          login_statistics: loginStats,
          recent_login_history: recentHistory,
          user_patterns: {
            login_pattern: loginPattern,
            device_preference: devicePreference,
            browser_preference: browserPreference,
            is_frequent_user: user.isFrequentUser(),
            has_multiple_devices: user.hasMultipleDevices(),
            has_multiple_locations: user.hasMultipleLocations(),
          },
          security_analysis: {
            security_score: securityScore,
            risk_level: securityScore >= 80 ? 'Low' : securityScore >= 60 ? 'Medium' : 'High',
            recommendations: securityScore < 80 ? [
              'Monitor for unusual login patterns',
              'Consider enabling two-factor authentication',
              'Review recent login locations'
            ] : ['Account appears secure']
          }
        },
      });
    } catch (error) {
      console.error("Error fetching login analytics:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/auth/system-login-analytics
 * @desc    Get system-wide login analytics and statistics
 * @access  Private (Admin only)
 */
router.get(
  "/system-login-analytics",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        timeframe = '30d', // 7d, 30d, 90d, 1y
        role_filter,
        status_filter = 'Active'
      } = req.query;

      // Import User model
      const User = (await import("../models/user-modal.js")).default;

      // Calculate date range based on timeframe
      const now = new Date();
      let startDate;
      switch (timeframe) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default: // 30d
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Build query
      const query = { status: status_filter };
      if (role_filter) {
        query.role = { $in: Array.isArray(role_filter) ? role_filter : [role_filter] };
      }

      // Get system-wide analytics
      const systemStats = await User.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total_users: { $sum: 1 },
            total_logins: { $sum: "$login_count" },
            average_logins_per_user: { $avg: "$login_count" },
            users_with_recent_activity: {
              $sum: {
                $cond: [
                  { $gte: ["$last_login", startDate] },
                  1,
                  0
                ]
              }
            },
            total_sessions: { $sum: "$login_analytics.total_sessions" },
            mobile_logins: { $sum: "$login_analytics.device_stats.mobile" },
            tablet_logins: { $sum: "$login_analytics.device_stats.tablet" },
            desktop_logins: { $sum: "$login_analytics.device_stats.desktop" },
          }
        }
      ]);

      // Get most active users
      const mostActiveUsers = await User.find(query)
        .select('full_name email role login_count last_login')
        .sort({ login_count: -1 })
        .limit(10);

      // Get recent registrations with login activity
      const recentActiveUsers = await User.find({
        ...query,
        last_login: { $gte: startDate }
      })
        .select('full_name email role login_count last_login createdAt')
        .sort({ last_login: -1 })
        .limit(20);

      // Get device and browser statistics
      const deviceStats = await User.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total_mobile: { $sum: "$login_analytics.device_stats.mobile" },
            total_tablet: { $sum: "$login_analytics.device_stats.tablet" },
            total_desktop: { $sum: "$login_analytics.device_stats.desktop" },
          }
        }
      ]);

      // Calculate activity metrics
      const stats = systemStats[0] || {};
      const deviceData = deviceStats[0] || {};
      const totalDeviceLogins = (deviceData.total_mobile || 0) + 
                               (deviceData.total_tablet || 0) + 
                               (deviceData.total_desktop || 0);

      res.status(200).json({
        success: true,
        message: "System login analytics retrieved successfully",
        timeframe,
        data: {
          overview: {
            total_users: stats.total_users || 0,
            total_logins: stats.total_logins || 0,
            average_logins_per_user: Math.round((stats.average_logins_per_user || 0) * 100) / 100,
            active_users_in_period: stats.users_with_recent_activity || 0,
            activity_rate: stats.total_users > 0 ? 
              Math.round((stats.users_with_recent_activity / stats.total_users) * 100) : 0,
            total_sessions: stats.total_sessions || 0,
          },
          device_distribution: {
            mobile: {
              count: deviceData.total_mobile || 0,
              percentage: totalDeviceLogins > 0 ? 
                Math.round((deviceData.total_mobile / totalDeviceLogins) * 100) : 0
            },
            tablet: {
              count: deviceData.total_tablet || 0,
              percentage: totalDeviceLogins > 0 ? 
                Math.round((deviceData.total_tablet / totalDeviceLogins) * 100) : 0
            },
            desktop: {
              count: deviceData.total_desktop || 0,
              percentage: totalDeviceLogins > 0 ? 
                Math.round((deviceData.total_desktop / totalDeviceLogins) * 100) : 0
            }
          },
          most_active_users: mostActiveUsers,
          recent_activity: recentActiveUsers,
        },
      });
    } catch (error) {
      console.error("Error fetching system login analytics:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/auth/user-activity-summary
 * @desc    Get user activity summary with login patterns and engagement metrics
 * @access  Private (Admin only)
 */
router.get(
  "/user-activity-summary",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        sort_by = 'last_login',
        sort_order = 'desc',
        role_filter,
        activity_level // 'high', 'medium', 'low', 'inactive'
      } = req.query;

      // Import User model
      const User = (await import("../models/user-modal.js")).default;

      // Build query
      const query = { is_active: true };
      if (role_filter) {
        query.role = { $in: Array.isArray(role_filter) ? role_filter : [role_filter] };
      }

      // Add activity level filter
      if (activity_level) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        switch (activity_level) {
          case 'high':
            query.last_login = { $gte: sevenDaysAgo };
            query.login_count = { $gte: 10 };
            break;
          case 'medium':
            query.last_login = { $gte: thirtyDaysAgo };
            query.login_count = { $gte: 3, $lt: 10 };
            break;
          case 'low':
            query.login_count = { $gte: 1, $lt: 3 };
            break;
          case 'inactive':
            query.$or = [
              { last_login: { $lt: thirtyDaysAgo } },
              { last_login: { $exists: false } },
              { login_count: { $lt: 1 } }
            ];
            break;
        }
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build sort object
      const sort = {};
      sort[sort_by] = sort_order === 'asc' ? 1 : -1;

      // Get users with activity summary
      const users = await User.find(query)
        .select('full_name email role login_count last_login createdAt login_analytics')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count
      const total = await User.countDocuments(query);

      // Process users to add activity insights
      const usersWithInsights = users.map(user => {
        const loginPattern = user.getLoginPattern();
        const devicePreference = user.getDevicePreference();
        const isFrequent = user.isFrequentUser();
        const securityScore = user.getSecurityScore();

        return {
          id: user._id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          login_count: user.login_count || 0,
          last_login: user.last_login,
          member_since: user.createdAt,
          activity_insights: {
            login_pattern: loginPattern,
            device_preference: devicePreference,
            is_frequent_user: isFrequent,
            security_score: securityScore,
            total_sessions: user.login_analytics?.total_sessions || 0,
            unique_devices: user.login_analytics?.unique_devices?.length || 0,
            unique_locations: user.login_analytics?.unique_ips?.length || 0,
          }
        };
      });

      res.status(200).json({
        success: true,
        message: "User activity summary retrieved successfully",
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_users: total,
          users_per_page: parseInt(limit),
        },
        filters: {
          role_filter,
          activity_level,
          sort_by,
          sort_order,
        },
        data: usersWithInsights,
      });
    } catch (error) {
      console.error("Error fetching user activity summary:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Edit user's own profile
 * @access  Private (Authenticated users)
 */
router.put(
  "/profile",
  [
    authenticateToken,
    // Validation middleware
    body("full_name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Full name must be between 2 and 100 characters"),
    body("phone_numbers")
      .optional()
      .isArray()
      .withMessage("Phone numbers must be an array"),
    body("phone_numbers.*.country")
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Country code is required"),
    body("phone_numbers.*.number")
      .optional()
      .matches(/^\+?\d{10,15}$/)
      .withMessage("Phone number must be 10-15 digits"),
    body("age")
      .optional()
      .trim()
      .isLength({ max: 10 })
      .withMessage("Age must be valid"),
    body("age_group")
      .optional()
      .isIn(["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"])
      .withMessage("Invalid age group"),
    body("facebook_link")
      .optional()
      .custom((value) => {
        if (value && !/^https?:\/\/(?:www\.)?facebook\.com\/.+/i.test(value)) {
          throw new Error("Invalid Facebook URL");
        }
        return true;
      }),
    body("instagram_link")
      .optional()
      .custom((value) => {
        if (value && !/^https?:\/\/(?:www\.)?instagram\.com\/.+/i.test(value)) {
          throw new Error("Invalid Instagram URL");
        }
        return true;
      }),
    body("linkedin_link")
      .optional()
      .custom((value) => {
        if (value && !/^https?:\/\/(?:www\.)?linkedin\.com\/.+/i.test(value)) {
          throw new Error("Invalid LinkedIn URL");
        }
        return true;
      }),
    body("twitter_link")
      .optional()
      .custom((value) => {
        if (value && !/^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/.+/i.test(value)) {
          throw new Error("Invalid Twitter/X URL");
        }
        return true;
      }),
    body("youtube_link")
      .optional()
      .custom((value) => {
        if (value && !/^https?:\/\/(?:www\.)?youtube\.com\/.+/i.test(value)) {
          throw new Error("Invalid YouTube URL");
        }
        return true;
      }),
    body("github_link")
      .optional()
      .custom((value) => {
        if (value && !/^https?:\/\/(?:www\.)?github\.com\/.+/i.test(value)) {
          throw new Error("Invalid GitHub URL");
        }
        return true;
      }),
    body("portfolio_link")
      .optional()
      .isURL()
      .withMessage("Portfolio link must be a valid URL"),
    body("user_image")
      .optional()
      .isURL()
      .withMessage("User image must be a valid URL"),
    body("meta.course_name")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Course name must be less than 200 characters"),
    body("meta.date_of_birth")
      .optional()
      .isISO8601()
      .withMessage("Date of birth must be a valid date"),
    body("meta.education_level")
      .optional()
      .isIn([
        "High School",
        "Diploma",
        "Associate Degree",
        "Bachelor's Degree",
        "Master's Degree",
        "Doctorate/PhD",
        "Professional Certificate",
        "Other"
      ])
      .withMessage("Invalid education level"),
    body("meta.institution_name")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Institution name must be less than 200 characters"),
    body("meta.field_of_study")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("Field of study must be less than 150 characters"),
    body("meta.graduation_year")
      .optional()
      .isInt({ min: 1950, max: new Date().getFullYear() + 10 })
      .withMessage("Graduation year must be between 1950 and 10 years from now"),
    body("meta.skills")
      .optional()
      .isArray()
      .withMessage("Skills must be an array"),
    body("meta.skills.*")
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Each skill must be between 1 and 50 characters"),
    body("meta.certifications")
      .optional()
      .isArray()
      .withMessage("Certifications must be an array"),
    body("meta.certifications.*.name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Certification name must be between 1 and 200 characters"),
    body("meta.certifications.*.issuer")
      .optional()
      .trim()
      .isLength({ min: 1, max: 150 })
      .withMessage("Certification issuer must be between 1 and 150 characters"),
    body("meta.certifications.*.year")
      .optional()
      .isInt({ min: 1950, max: new Date().getFullYear() + 1 })
      .withMessage("Certification year must be between 1950 and current year"),
    body("meta.language")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Language must be less than 50 characters"),
    body("meta.age_group")
      .optional()
      .isIn(["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"])
      .withMessage("Invalid age group"),
    body("meta.category")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Category must be less than 100 characters"),
    body("meta.gender")
      .optional()
      .isIn(["male", "female", "non-binary", "prefer-not-to-say", "other"])
      .withMessage("Invalid gender"),
    body("meta.upload_resume")
      .optional()
      .isArray()
      .withMessage("Resume uploads must be an array"),
    body("meta.upload_resume.*")
      .optional()
      .isURL()
      .withMessage("Resume URLs must be valid"),
    body("timezone")
      .optional()
      .custom((value) => {
        if (value && !/^[A-Za-z]+\/[A-Za-z_]+$|^UTC$|^GMT[+-]\d{1,2}$/.test(value)) {
          throw new Error("Invalid timezone format");
        }
        return true;
      }),
    body("country")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Country must be between 2 and 50 characters"),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must be less than 500 characters"),
    body("organization")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Organization name must be less than 200 characters"),
    body("bio")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Bio must be less than 1000 characters"),
  ],
  async (req, res) => {
    try {
      // Import required modules
      const { validationResult } = await import("express-validator");
      const User = (await import("../models/user-modal.js")).default;

      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const allowedFields = [
        'full_name',
        'phone_numbers',
        'age',
        'age_group',
        'facebook_link',
        'instagram_link',
        'linkedin_link',
        'twitter_link',
        'youtube_link',
        'github_link',
        'portfolio_link',
        'user_image',
        'meta',
        'timezone',
        'country',
        'address',
        'organization',
        'bio'
      ];

      // Filter only allowed fields from request body
      const updateData = {};
      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          updateData[key] = req.body[key];
        }
      });

      // Handle meta object update properly
      if (req.body.meta) {
        // Get current user to preserve existing meta fields
        const currentUser = await User.findById(userId);
        if (currentUser && currentUser.meta) {
          updateData.meta = { ...currentUser.meta.toObject(), ...req.body.meta };
        }
      }

      // Validate phone numbers if provided
      if (updateData.phone_numbers) {
        for (const phone of updateData.phone_numbers) {
          if (!phone.country || !phone.number) {
            return res.status(400).json({
              success: false,
              message: "Each phone number must have country and number fields",
            });
          }
        }
      }

      // Update user profile
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { 
          new: true, 
          runValidators: true,
          select: '-password -resetPasswordToken -resetPasswordExpires -emailVerificationOTP -emailVerificationOTPExpires'
        }
      );

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          user: updatedUser,
          updated_fields: Object.keys(updateData),
        },
      });

    } catch (error) {
      console.error("Error updating user profile:", error);
      
      // Handle specific MongoDB validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: "Profile validation failed",
          errors: validationErrors,
        });
      }

      // Handle duplicate key errors (like email)
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `${field} already exists`,
          error_code: "DUPLICATE_FIELD",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating profile",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get user's own profile
 * @access  Private (Authenticated users)
 */
router.get(
  "/profile",
  authenticateToken,
  async (req, res) => {
    try {
      const User = (await import("../models/user-modal.js")).default;
      
      const user = await User.findById(req.user.id)
        .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationOTP -emailVerificationOTPExpires')
        .populate('assigned_instructor', 'full_name email role');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Add computed fields for better frontend experience
      const userProfile = {
        ...user.toObject(),
        profile_completion: calculateProfileCompletion(user),
        account_insights: {
          member_since: user.createdAt,
          login_stats: user.getLoginStats(),
          is_frequent_user: user.isFrequentUser(),
          device_preference: user.getDevicePreference(),
          login_pattern: user.getLoginPattern(),
        }
      };

      res.status(200).json({
        success: true,
        message: "Profile retrieved successfully",
        data: userProfile,
      });

    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching profile",
        error: error.message,
      });
    }
  }
);

// Helper function to calculate profile completion percentage
function calculateProfileCompletion(user) {
  const requiredFields = [
    'full_name',
    'email',
    'phone_numbers',
    'user_image',
    'address',
    'organization',
    'bio',
    'meta.date_of_birth',
    'meta.education_level',
    'meta.institution_name',
    'meta.field_of_study',
    'meta.gender',
    'meta.skills',
    'country',
    'timezone'
  ];
  
  // Social profile fields (bonus points)
  const socialFields = [
    'facebook_link',
    'instagram_link', 
    'linkedin_link',
    'twitter_link',
    'youtube_link',
    'github_link',
    'portfolio_link'
  ];
  
  const totalFields = requiredFields.length + socialFields.length;

  let completedFields = 0;
  
  // Check required fields
  requiredFields.forEach(field => {
    const fieldParts = field.split('.');
    let value = user;
    
    for (const part of fieldParts) {
      value = value?.[part];
    }
    
    if (value !== null && value !== undefined && value !== '' && 
        (!Array.isArray(value) || value.length > 0)) {
      completedFields++;
    }
  });
  
  // Check social profile fields (bonus points)
  socialFields.forEach(field => {
    if (user[field] && user[field].trim() !== '') {
      completedFields++;
    }
  });

  return Math.round((completedFields / totalFields) * 100);
}

/**
 * @route   PUT /api/v1/auth/profile/personal
 * @desc    Update user's personal information (basic profile data)
 * @access  Private (Authenticated users)
 */
router.put(
  "/profile/personal",
  [
    authenticateToken,
    body("full_name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Full name must be between 2 and 100 characters"),
    body("phone_numbers")
      .optional()
      .isArray()
      .withMessage("Phone numbers must be an array"),
    body("phone_numbers.*.country")
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Country code is required"),
    body("phone_numbers.*.number")
      .optional()
      .matches(/^\+?\d{10,15}$/)
      .withMessage("Phone number must be 10-15 digits"),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must be less than 500 characters"),
    body("organization")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Organization name must be less than 200 characters"),
    body("bio")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Bio must be less than 1000 characters"),
    body("user_image")
      .optional()
      .isURL()
      .withMessage("Profile picture must be a valid URL"),
    body("country")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Country must be between 2 and 50 characters"),
    body("timezone")
      .optional()
      .custom((value) => {
        if (value && !/^[A-Za-z]+\/[A-Za-z_]+$|^UTC$|^GMT[+-]\d{1,2}$/.test(value)) {
          throw new Error("Invalid timezone format");
        }
        return true;
      }),
  ],
  async (req, res) => {
    try {
      const { validationResult } = await import("express-validator");
      const User = (await import("../models/user-modal.js")).default;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const personalFields = [
        'full_name',
        'phone_numbers',
        'address',
        'organization',
        'bio',
        'user_image',
        'country',
        'timezone'
      ];

      const updateData = {};
      personalFields.forEach(field => {
        if (req.body.hasOwnProperty(field)) {
          updateData[field] = req.body[field];
        }
      });

      // Validate phone numbers if provided
      if (updateData.phone_numbers) {
        for (const phone of updateData.phone_numbers) {
          if (!phone.country || !phone.number) {
            return res.status(400).json({
              success: false,
              message: "Each phone number must have country and number fields",
            });
          }
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { 
          new: true, 
          runValidators: true,
          select: 'full_name email phone_numbers address organization bio user_image country timezone'
        }
      );

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Personal information updated successfully",
        data: {
          personal_info: {
            full_name: updatedUser.full_name,
            email: updatedUser.email,
            phone_numbers: updatedUser.phone_numbers,
            address: updatedUser.address,
            organization: updatedUser.organization,
            bio: updatedUser.bio,
            user_image: updatedUser.user_image,
            country: updatedUser.country,
            timezone: updatedUser.timezone,
          },
          updated_fields: Object.keys(updateData),
        },
      });

    } catch (error) {
      console.error("Error updating personal information:", error);
      res.status(500).json({
        success: false,
        message: "Error updating personal information",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/auth/profile/personal
 * @desc    Get user's personal information
 * @access  Private (Authenticated users)
 */
router.get("/profile/personal", authenticateToken, async (req, res) => {
  try {
    const User = (await import("../models/user-modal.js")).default;
    
    const user = await User.findById(req.user.id).select(
      'full_name email phone_numbers address organization bio user_image country timezone createdAt'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Calculate completion for personal info
    const personalFields = ['full_name', 'phone_numbers', 'address', 'organization', 'bio', 'user_image'];
    const completedFields = personalFields.filter(field => {
      const value = user[field];
      return value !== null && value !== undefined && value !== '' && 
             (!Array.isArray(value) || value.length > 0);
    }).length;

    res.status(200).json({
      success: true,
      message: "Personal information retrieved successfully",
      data: {
        personal_info: {
          full_name: user.full_name,
          email: user.email,
          phone_numbers: user.phone_numbers || [],
          address: user.address,
          organization: user.organization,
          bio: user.bio,
          user_image: user.user_image,
          country: user.country,
          timezone: user.timezone,
          member_since: user.createdAt,
        },
        completion_stats: {
          completed_fields: completedFields,
          total_fields: personalFields.length,
          completion_percentage: Math.round((completedFields / personalFields.length) * 100),
        },
      },
    });

  } catch (error) {
    console.error("Error fetching personal information:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching personal information",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/v1/auth/profile/social
 * @desc    Update user's social profiles
 * @access  Private (Authenticated users)
 */
router.put(
  "/profile/social",
  [
    authenticateToken,
    body("facebook_link").optional().custom((value) => {
      if (value && !/^https?:\/\/(?:www\.)?facebook\.com\/.+/i.test(value)) {
        throw new Error("Invalid Facebook URL");
      }
      return true;
    }),
    body("instagram_link").optional().custom((value) => {
      if (value && !/^https?:\/\/(?:www\.)?instagram\.com\/.+/i.test(value)) {
        throw new Error("Invalid Instagram URL");
      }
      return true;
    }),
    body("linkedin_link").optional().custom((value) => {
      if (value && !/^https?:\/\/(?:www\.)?linkedin\.com\/.+/i.test(value)) {
        throw new Error("Invalid LinkedIn URL");
      }
      return true;
    }),
    body("twitter_link").optional().custom((value) => {
      if (value && !/^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/.+/i.test(value)) {
        throw new Error("Invalid Twitter/X URL");
      }
      return true;
    }),
    body("youtube_link").optional().custom((value) => {
      if (value && !/^https?:\/\/(?:www\.)?youtube\.com\/.+/i.test(value)) {
        throw new Error("Invalid YouTube URL");
      }
      return true;
    }),
    body("github_link").optional().custom((value) => {
      if (value && !/^https?:\/\/(?:www\.)?github\.com\/.+/i.test(value)) {
        throw new Error("Invalid GitHub URL");
      }
      return true;
    }),
    body("portfolio_link").optional().isURL().withMessage("Portfolio link must be a valid URL"),
  ],
  async (req, res) => {
    try {
      const { validationResult } = await import("express-validator");
      const User = (await import("../models/user-modal.js")).default;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const socialFields = [
        'facebook_link',
        'instagram_link',
        'linkedin_link', 
        'twitter_link',
        'youtube_link',
        'github_link',
        'portfolio_link'
      ];

      const updateData = {};
      socialFields.forEach(field => {
        if (req.body.hasOwnProperty(field)) {
          updateData[field] = req.body[field] || null;
        }
      });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('facebook_link instagram_link linkedin_link twitter_link youtube_link github_link portfolio_link');

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Social profiles updated successfully",
        data: {
          social_profiles: {
            facebook: updatedUser.facebook_link,
            instagram: updatedUser.instagram_link,
            linkedin: updatedUser.linkedin_link,
            twitter: updatedUser.twitter_link,
            youtube: updatedUser.youtube_link,
            github: updatedUser.github_link,
            portfolio: updatedUser.portfolio_link,
          },
          updated_fields: Object.keys(updateData),
        },
      });

    } catch (error) {
      console.error("Error updating social profiles:", error);
      res.status(500).json({
        success: false,
        message: "Error updating social profiles",
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/v1/auth/profile/education
 * @desc    Update user's education information
 * @access  Private (Authenticated users)
 */
router.put(
  "/profile/education",
  [
    authenticateToken,
    body("education_level").optional().isIn([
      "High School",
      "Diploma",
      "Associate Degree", 
      "Bachelor's Degree",
      "Master's Degree",
      "Doctorate/PhD",
      "Professional Certificate",
      "Other"
    ]).withMessage("Invalid education level"),
    body("institution_name").optional().trim().isLength({ max: 200 }).withMessage("Institution name must be less than 200 characters"),
    body("field_of_study").optional().trim().isLength({ max: 150 }).withMessage("Field of study must be less than 150 characters"),
    body("graduation_year").optional().isInt({ min: 1950, max: new Date().getFullYear() + 10 }).withMessage("Invalid graduation year"),
    body("skills").optional().isArray().withMessage("Skills must be an array"),
    body("skills.*").optional().trim().isLength({ min: 1, max: 50 }).withMessage("Each skill must be between 1 and 50 characters"),
    body("certifications").optional().isArray().withMessage("Certifications must be an array"),
    body("certifications.*.name").optional().trim().isLength({ min: 1, max: 200 }).withMessage("Certification name required"),
    body("certifications.*.issuer").optional().trim().isLength({ min: 1, max: 150 }).withMessage("Certification issuer required"),
    body("certifications.*.year").optional().isInt({ min: 1950, max: new Date().getFullYear() + 1 }).withMessage("Invalid certification year"),
    body("certifications.*.url").optional().isURL().withMessage("Certification URL must be valid"),
  ],
  async (req, res) => {
    try {
      const { validationResult } = await import("express-validator");
      const User = (await import("../models/user-modal.js")).default;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const educationFields = [
        'education_level',
        'institution_name',
        'field_of_study', 
        'graduation_year',
        'skills',
        'certifications'
      ];

      // Get current user to preserve other meta fields
      const currentUser = await User.findById(userId);
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const updateData = { 
        meta: currentUser.meta ? currentUser.meta.toObject() : {} 
      };

      educationFields.forEach(field => {
        if (req.body.hasOwnProperty(field)) {
          updateData.meta[field] = req.body[field];
        }
      });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('meta');

      res.status(200).json({
        success: true,
        message: "Education information updated successfully",
        data: {
          education: {
            education_level: updatedUser.meta?.education_level,
            institution_name: updatedUser.meta?.institution_name,
            field_of_study: updatedUser.meta?.field_of_study,
            graduation_year: updatedUser.meta?.graduation_year,
            skills: updatedUser.meta?.skills || [],
            certifications: updatedUser.meta?.certifications || [],
          },
          updated_fields: Object.keys(req.body),
        },
      });

    } catch (error) {
      console.error("Error updating education information:", error);
      res.status(500).json({
        success: false,
        message: "Error updating education information",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/auth/profile/social
 * @desc    Get user's social profiles
 * @access  Private (Authenticated users)
 */
router.get("/profile/social", authenticateToken, async (req, res) => {
  try {
    const User = (await import("../models/user-modal.js")).default;
    
    const user = await User.findById(req.user.id).select(
      'facebook_link instagram_link linkedin_link twitter_link youtube_link github_link portfolio_link'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const socialProfiles = {
      facebook: user.facebook_link,
      instagram: user.instagram_link,
      linkedin: user.linkedin_link,
      twitter: user.twitter_link,
      youtube: user.youtube_link,
      github: user.github_link,
      portfolio: user.portfolio_link,
    };

    const completedProfiles = Object.values(socialProfiles).filter(profile => profile && profile.trim()).length;

    res.status(200).json({
      success: true,
      message: "Social profiles retrieved successfully",
      data: {
        social_profiles: socialProfiles,
        completed_profiles: completedProfiles,
        total_available: 7,
        completion_percentage: Math.round((completedProfiles / 7) * 100),
      },
    });

  } catch (error) {
    console.error("Error fetching social profiles:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching social profiles",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/auth/profile/education
 * @desc    Get user's education information
 * @access  Private (Authenticated users)
 */
router.get("/profile/education", authenticateToken, async (req, res) => {
  try {
    const User = (await import("../models/user-modal.js")).default;
    
    const user = await User.findById(req.user.id).select('meta');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const education = {
      education_level: user.meta?.education_level,
      institution_name: user.meta?.institution_name,
      field_of_study: user.meta?.field_of_study,
      graduation_year: user.meta?.graduation_year,
      skills: user.meta?.skills || [],
      certifications: user.meta?.certifications || [],
    };

    // Calculate education completion
    const requiredFields = ['education_level', 'institution_name', 'field_of_study'];
    const completedFields = requiredFields.filter(field => education[field] && education[field].toString().trim()).length;
    const hasSkills = education.skills.length > 0;
    const hasCertifications = education.certifications.length > 0;

    res.status(200).json({
      success: true,
      message: "Education information retrieved successfully",
      data: {
        education,
        completion_stats: {
          basic_info_completed: completedFields,
          basic_info_total: requiredFields.length,
          has_skills: hasSkills,
          skills_count: education.skills.length,
          has_certifications: hasCertifications,
          certifications_count: education.certifications.length,
          completion_percentage: Math.round(((completedFields + (hasSkills ? 1 : 0) + (hasCertifications ? 1 : 0)) / 5) * 100),
        },
      },
    });

  } catch (error) {
    console.error("Error fetching education information:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching education information", 
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/auth/analytics
 * @desc    Get user analytics dashboard
 * @access  Private (Authenticated users)
 */
router.get("/analytics", authenticateToken, authController.getUserAnalytics);

/**
 * @route   GET /api/v1/auth/active-users
 * @desc    Get real-time active users
 * @access  Private (Authenticated users)
 */
router.get("/active-users", authenticateToken, authController.getActiveUsers);

/**
 * @route   GET /api/v1/auth/system-analytics
 * @desc    Get system-wide analytics (Admin only)
 * @access  Private (Admin only)
 */
router.get("/system-analytics", authenticateToken, authController.getSystemAnalytics);

/**
 * @route   POST /api/v1/auth/request-password-reset
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  "/request-password-reset",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
  ],
  authController.requestPasswordReset
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  "/reset-password",
  [
    body("token")
      .notEmpty()
      .withMessage("Reset token is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { token, password } = req.body;

      // Find user with valid reset token
      const user = await User.findOne({
        password_reset_token: token,
        password_reset_expires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
        });
      }

      // Update password
      user.password = password;
      user.password_reset_token = undefined;
      user.password_reset_expires = undefined;
      user.failed_login_attempts = 0;
      user.account_locked_until = undefined;
      await user.save();

      // Log password reset activity
      await user.logActivity("password_reset", null, {
        reset_time: new Date(),
        reset_method: "email_token",
      });

      // End all active sessions for security
      await user.endAllSessions();

      res.status(200).json({
        success: true,
        message: "Password reset successfully. Please login with your new password.",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during password reset",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 */
router.post(
  "/verify-email",
  [
    body("token")
      .notEmpty()
      .withMessage("Verification token is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { token } = req.body;

      // Find user with valid verification token
      const user = await User.findOne({
        email_verification_token: token,
        email_verification_expires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired verification token",
        });
      }

      // Verify email
      user.email_verified = true;
      user.email_verification_token = undefined;
      user.email_verification_expires = undefined;
      await user.save();

      // Log email verification activity
      await user.logActivity("email_verified", null, {
        verification_time: new Date(),
        verification_method: "email_token",
      });

      res.status(200).json({
        success: true,
        message: "Email verified successfully",
        data: {
          user: {
            id: user._id,
            email: user.email,
            email_verified: user.email_verified,
            profile_completion: user.profile_completion,
          },
        },
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during email verification",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend email verification
 * @access  Private (Authenticated users)
 */
router.post(
  "/resend-verification",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;

      if (user.email_verified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      user.email_verification_token = verificationToken;
      user.email_verification_expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      await user.save();

      // Send verification email
      await authController.sendVerificationEmail(user.email, verificationToken);

      // Log resend verification activity
      await user.logActivity("verification_resent", null, {
        resend_time: new Date(),
        token_expires: user.email_verification_expires,
      });

      res.status(200).json({
        success: true,
        message: "Verification email sent successfully",
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error resending verification",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/v1/auth/profile/sessions
 * @desc    Get user's active sessions
 * @access  Private (Authenticated users)
 */
router.get(
  "/profile/sessions",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      
      const sessions = user.sessions.filter(session => session.is_active).map(session => ({
        session_id: session.session_id,
        device_id: session.device_id,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        geolocation: session.geolocation,
        created_at: session.created_at,
        last_activity: session.last_activity,
        is_current: session.session_id === req.headers['x-session-id'],
      }));

      res.status(200).json({
        success: true,
        message: "Active sessions retrieved successfully",
        data: {
          total_sessions: sessions.length,
          sessions,
          current_session: req.headers['x-session-id'],
        },
      });
    } catch (error) {
      console.error("Get sessions error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error retrieving sessions",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   DELETE /api/v1/auth/profile/sessions/:sessionId
 * @desc    End a specific session
 * @access  Private (Authenticated users)
 */
router.delete(
  "/profile/sessions/:sessionId",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { sessionId } = req.params;
      
      const session = user.sessions.find(s => s.session_id === sessionId && s.is_active);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found or already inactive",
        });
      }

      await user.endSession(sessionId);

      // Log session termination
      await user.logActivity("session_terminated", null, {
        terminated_session_id: sessionId,
        termination_time: new Date(),
        terminated_by_user: true,
      });

      res.status(200).json({
        success: true,
        message: "Session ended successfully",
      });
    } catch (error) {
      console.error("End session error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error ending session",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   DELETE /api/v1/auth/profile/sessions
 * @desc    End all sessions except current
 * @access  Private (Authenticated users)
 */
router.delete(
  "/profile/sessions",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const currentSessionId = req.headers['x-session-id'];
      
      const activeSessions = user.sessions.filter(s => s.is_active);
      let terminatedCount = 0;

      for (const session of activeSessions) {
        if (session.session_id !== currentSessionId) {
          await user.endSession(session.session_id);
          terminatedCount++;
        }
      }

      // Log bulk session termination
      await user.logActivity("bulk_session_termination", null, {
        terminated_sessions_count: terminatedCount,
        termination_time: new Date(),
        kept_current_session: currentSessionId,
      });

      res.status(200).json({
        success: true,
        message: `${terminatedCount} sessions ended successfully`,
        data: {
          terminated_sessions: terminatedCount,
          current_session_kept: currentSessionId,
        },
      });
    } catch (error) {
      console.error("End all sessions error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error ending sessions",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/v1/auth/profile/activity
 * @desc    Get user's activity log
 * @access  Private (Authenticated users)
 */
router.get(
  "/profile/activity",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { page = 1, limit = 20, type, date_from, date_to } = req.query;
      
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      let activityFilter = {};
      
      // Filter by activity type
      if (type) {
        activityFilter.action = type;
      }

      // Filter by date range
      if (date_from || date_to) {
        activityFilter.timestamp = {};
        if (date_from) {
          activityFilter.timestamp.$gte = new Date(date_from);
        }
        if (date_to) {
          activityFilter.timestamp.$lte = new Date(date_to);
        }
      }

      // Get filtered activity log
      let filteredActivity = user.activity_log;
      if (Object.keys(activityFilter).length > 0) {
        filteredActivity = user.activity_log.filter(activity => {
          if (activityFilter.action && activity.action !== activityFilter.action) {
            return false;
          }
          if (activityFilter.timestamp) {
            const activityDate = new Date(activity.timestamp);
            if (activityFilter.timestamp.$gte && activityDate < activityFilter.timestamp.$gte) {
              return false;
            }
            if (activityFilter.timestamp.$lte && activityDate > activityFilter.timestamp.$lte) {
              return false;
            }
          }
          return true;
        });
      }

      // Apply pagination
      const totalActivities = filteredActivity.length;
      const paginatedActivity = filteredActivity
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(skip, skip + limitNum);

      res.status(200).json({
        success: true,
        message: "Activity log retrieved successfully",
        data: {
          activities: paginatedActivity,
          pagination: {
            current_page: pageNum,
            total_pages: Math.ceil(totalActivities / limitNum),
            total_activities: totalActivities,
            activities_per_page: limitNum,
          },
          filters: {
            type,
            date_from,
            date_to,
          },
        },
      });
    } catch (error) {
      console.error("Get activity error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error retrieving activity",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PUT /api/v1/auth/profile/preferences
 * @desc    Update user preferences
 * @access  Private (Authenticated users)
 */
router.put(
  "/profile/preferences",
  [
    authenticateToken,
    body("theme")
      .optional()
      .isIn(["light", "dark", "auto"])
      .withMessage("Theme must be light, dark, or auto"),
    body("language")
      .optional()
      .isLength({ min: 2, max: 5 })
      .withMessage("Language code must be between 2 and 5 characters"),
    body("timezone")
      .optional()
      .custom((value) => {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: value });
          return true;
        } catch (error) {
          throw new Error("Invalid timezone");
        }
      }),
    body("notifications")
      .optional()
      .isObject()
      .withMessage("Notifications must be an object"),
    body("privacy")
      .optional()
      .isObject()
      .withMessage("Privacy settings must be an object"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const user = req.user;
      const preferenceUpdates = req.body;

      // Update preferences
      user.preferences = { ...user.preferences, ...preferenceUpdates };
      await user.save();

      // Log preference update
      await user.logActivity("preferences_updated", null, {
        updated_preferences: Object.keys(preferenceUpdates),
        new_preferences: user.preferences,
      });

      res.status(200).json({
        success: true,
        message: "Preferences updated successfully",
        data: {
          preferences: user.preferences,
          updated_fields: Object.keys(preferenceUpdates),
        },
      });
    } catch (error) {
      console.error("Update preferences error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error updating preferences",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

export default router;
