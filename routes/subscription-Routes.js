import express from "express";
import {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  getEnrollmentStatus,
  updateSubscription,
  deleteSubscription,
  getSubscriptionsByStudentId,
  getCoorporateEnrollmentStatus,
  getCoorporateEmployeeEnrollmentStatus,
  getSubscriptionByUserId,
  getActiveSubscriptions,
  getExpiredSubscriptions,
  getUpcomingSubscriptions,
  getSubscriptionStats
} from "../controllers/subscription-controller.js";

const router = express.Router();

// Create a new subscription
router.post("/", createSubscription);
router.get("/", getAllSubscriptions);
router.get("/stats", getSubscriptionStats);
router.get("/active", getActiveSubscriptions);
router.get("/expired", getExpiredSubscriptions);
router.get("/upcoming", getUpcomingSubscriptions);
router.get("/user/:userId", getSubscriptionByUserId);
router.get("/:id", getSubscriptionById);
router.get("/get-subscription/:student_id", getSubscriptionsByStudentId);
router.get("/enrollStatus", getEnrollmentStatus);
router.get("/corporate-employee-enroll-status", getCoorporateEmployeeEnrollmentStatus);
router.get("/coorporate-enrollStatus", getCoorporateEnrollmentStatus);
router.patch("/:id", updateSubscription);
router.delete("/:id", deleteSubscription);

export default router;
