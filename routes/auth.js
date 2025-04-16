import express from "express";
import AuthController from "../controllers/authController.js";
import { validateRegistration, validateLogin } from "../middleware/validators/authValidator.js";

const router = express.Router();
const authController = new AuthController();

// Register a new user
router.post("/register", validateRegistration, authController.registerUser);

// Verify email with OTP
router.post("/verify-email", authController.verifyEmailOTP);

// Resend verification OTP
router.post("/resend-verification", authController.resendVerificationOTP);

// Login user
router.post("/login", validateLogin, authController.loginUser);

// ... existing code ...

export default router; 