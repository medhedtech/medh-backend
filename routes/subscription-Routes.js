const express = require("express");
const {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  getEnrollmentStatus,
  updateSubscription,
  deleteSubscription,
  getSubscriptionsByStudentId,
  getCoorporateEnrollmentStatus,
  getCoorporateEmployeeEnrollmentStatus,
} = require("../controllers/subscription-controller");

const router = express.Router();

// Create a new subscription
router.post("/create", createSubscription);
router.get("/getAll", getAllSubscriptions);
router.get("/get/:id", getSubscriptionById);
router.get("/get-subscription/:student_id", getSubscriptionsByStudentId);
router.get("/enrollStatus", getEnrollmentStatus);
router.get("/corporate-employee-enroll-status", getCoorporateEmployeeEnrollmentStatus);
router.get("/coorporate-enrollStatus", getCoorporateEnrollmentStatus);
router.put("/update/:id", updateSubscription);
router.delete("/delete/:id", deleteSubscription);

module.exports = router;
