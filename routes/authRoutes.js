import express from "express";

import authController from "../controllers/authController.js";
import * as corporateStudentController from "../controllers/coorporate-student-controller.js";
import * as corporateController from "../controllers/corporateController.js";
import * as instructorController from "../controllers/instructor-controller.js";
import { authenticate as authMiddleware } from "../middleware/auth.js";

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", authController.registerUser.bind(authController));

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email with OTP
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
router.post("/login", authController.loginUser.bind(authController));

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send temporary password to user's email
 * @access  Public
 */
router.post(
  "/forgot-password",
  authController.forgotPassword.bind(authController),
);

/**
 * @route   GET /api/v1/auth/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
router.get(
  "/users",
  authMiddleware,
  authController.getAllUsers.bind(authController),
);

/**
 * @route   GET /api/v1/auth/get-all-students
 * @desc    Get all users with the STUDENT role
 * @access  Private (Admin only - or adjust as needed)
 */
router.get(
  "/get-all-students",
  authMiddleware,
  authController.getAllStudents.bind(authController),
);

/**
 * @route   GET /api/v1/auth/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get(
  "/users/:id",
  authMiddleware,
  authController.getUserById.bind(authController),
);

/**
 * @route   PUT /api/v1/auth/users/:id
 * @desc    Update user by ID
 * @access  Private
 */
router.put(
  "/users/:id",
  authMiddleware,
  authController.updateUser.bind(authController),
);

/**
 * @route   PUT /api/v1/auth/users/email/:email
 * @desc    Update user by email
 * @access  Private
 */
router.put(
  "/users/email/:email",
  authMiddleware,
  authController.updateUserByEmail.bind(authController),
);

/**
 * @route   DELETE /api/v1/auth/users/:id
 * @desc    Delete user by ID
 * @access  Private (Admin only)
 */
router.delete(
  "/users/:id",
  authMiddleware,
  authController.deleteUser.bind(authController),
);

/**
 * @route   PUT /api/v1/auth/toggle-status/:id
 * @desc    Toggle user active/inactive status
 * @access  Private (Admin only)
 */
router.put(
  "/toggle-status/:id",
  authMiddleware,
  authController.toggleUserStatus.bind(authController),
);

router.post(
  "/reset-password",
  authController.resetPassword.bind(authController),
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
    const { email = "care@medh.co" } = req.body;
    
    // Debug current email configuration
    console.log("Email configuration:", {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE,
      user: process.env.EMAIL_USER ? "Set" : "Not set",
      pass: process.env.EMAIL_PASS ? "Set" : "Not set"
    });
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Medh Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Test Email",
      html: "<p>This is a test email to verify the email configuration.</p><p>If you received this email, your email service is working correctly!</p>",
    };

    // Use the simplified email sending approach
    const result = await authController.emailService.sendEmail(mailOptions);
    res.status(200).json({
      success: true,
      message: "Test email sent successfully",
      result
    });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   POST /api/v1/auth/test-verification-email
 * @desc    Test OTP verification email
 * @access  Public (Should be restricted in production)
 */
router.post("/test-verification-email", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Generate test OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Try direct email sending
    await authController.emailService.sendEmailDirectly({
      to: email,
      subject: "Test OTP Verification",
      html: `<p>Hello ${name || 'User'},</p><p>Your test verification code is: <strong>${otp}</strong></p>`,
    });
    
    res.status(200).json({
      success: true,
      message: "Test verification email sent successfully",
      otp: otp // Only include in test route
    });
  } catch (error) {
    console.error("Test verification email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test verification email",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   POST /api/v1/auth/test-otp
 * @desc    Test OTP generation and email formatting (logs to console)
 * @access  Public (should be restricted in production)
 */
router.post("/test-otp", async (req, res) => {
  try {
    const { email = "test@example.com" } = req.body;
    
    // Generate a test OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create HTML content for testing
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body>
        <h2>Test OTP Email</h2>
        <p>Your OTP is: ${otp}</p>
    </body>
    </html>
    `;
    
    // Log what would be sent
    console.log("TEST OTP EMAIL:", {
      to: email,
      from: '"Medh No-Reply" <noreply@medh.co>',
      subject: "Test OTP",
      html: htmlContent
    });
    
    // Use the email service to send directly
    const result = await authController.emailService.sendEmail({
      to: email,
      subject: "Test OTP Email",
      html: htmlContent
    });
    
    res.status(200).json({
      success: true,
      message: "Test OTP generated and email sending attempted",
      otp: otp,
      result: result
    });
  } catch (error) {
    console.error("Test OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Test OTP failed",
      error: error.message
    });
  }
});

export default router;
