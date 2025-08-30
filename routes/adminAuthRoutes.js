import express from "express";
import { body } from "express-validator";
import adminAuthController from "../controllers/adminAuthController.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { rateLimitMiddleware } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

// Rate limiting for admin auth routes (stricter limits)
const adminAuthRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per 15 minutes for admin auth
  message: {
    success: false,
    message: "Too many admin authentication attempts, please try again later",
  },
});

// Admin Registration Route (Super Secure)
router.post(
  "/register",
  adminAuthRateLimit,
  (req, res) => adminAuthController.register(req, res)
);

// Admin Login Route
router.post(
  "/login",
  adminAuthRateLimit,
  (req, res) => adminAuthController.login(req, res)
);

// Admin Logout Route (Protected)
router.post(
  "/logout",
  adminAuthMiddleware,
  (req, res) => adminAuthController.logout(req, res)
);

// Get Admin Profile (Protected)
router.get(
  "/profile",
  adminAuthMiddleware,
  (req, res) => adminAuthController.getProfile(req, res)
);

// Update Admin Profile (Protected)
router.put(
  "/profile",
  adminAuthMiddleware,
  (req, res) => adminAuthController.updateProfile(req, res)
);

// Admin Forgot Password Route
router.post(
  "/forgot-password",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
  ],
  adminAuthRateLimit,
  (req, res) => adminAuthController.forgotPassword(req, res)
);

// Admin Verify Temporary Password Route
router.post(
  "/verify-temp-password",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("tempPassword")
      .notEmpty()
      .withMessage("Temporary password is required"),
  ],
  adminAuthRateLimit,
  (req, res) => adminAuthController.verifyTempPassword(req, res)
);

// Admin Reset Password Route
router.post(
  "/reset-password",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("tempPassword")
      .notEmpty()
      .withMessage("Temporary password is required"),
    body("newPassword")
      .isLength({ min: 8, max: 128 })
      .withMessage("Password must be between 8 and 128 characters")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
      )
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      ),
    body("confirmPassword")
      .notEmpty()
      .withMessage("Confirm password is required")
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error("Password confirmation does not match new password");
        }
        return true;
      }),
  ],
  adminAuthRateLimit,
  (req, res) => adminAuthController.resetPassword(req, res)
);

// Health check for admin auth system
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin authentication system is running",
    timestamp: new Date().toISOString(),
  });
});

export default router;



