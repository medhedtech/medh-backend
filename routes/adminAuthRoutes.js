import express from "express";
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
  adminAuthController.register
);

// Admin Login Route
router.post(
  "/login",
  adminAuthRateLimit,
  adminAuthController.login
);

// Admin Logout Route (Protected)
router.post(
  "/logout",
  adminAuthMiddleware,
  adminAuthController.logout
);

// Get Admin Profile (Protected)
router.get(
  "/profile",
  adminAuthMiddleware,
  adminAuthController.getProfile
);

// Update Admin Profile (Protected)
router.put(
  "/profile",
  adminAuthMiddleware,
  adminAuthController.updateProfile
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


