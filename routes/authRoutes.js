import express from "express";

import authController from "../controllers/authController.js";
import * as corporateStudentController from "../controllers/coorporate-student-controller.js";
import * as corporateController from "../controllers/corporateController.js";
import * as instructorController from "../controllers/instructor-controller.js";
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
 * @desc    Get all users with the STUDENT role
 * @access  Private (Admin only - or adjust as needed)
 */
router.get(
  "/get-all-students",
  authenticateToken,
  authController.getAllStudents.bind(authController),
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
