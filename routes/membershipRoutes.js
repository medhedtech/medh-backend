const express = require("express");
const {
  createMembership,
  getAllMemberships,
  getMembershipById,
  renewMembership,
  updateMembership,
  deleteMembership,
  getMembershipCountsByStudentId,
  getMembershipsByStudentId,
  getRenewAmount,
} = require("../controllers/membershipController");

const router = express.Router();

// Create a new membership
router.post("/create", createMembership);
router.get("/getAll", getAllMemberships);
router.get("/get/:id", getMembershipById);
router.get("/getmembership/:student_id", getMembershipsByStudentId);
router.get("/membership-count/:student_id", getMembershipCountsByStudentId);
router.post("/renew/:id", renewMembership);
router.post("/update/:id", updateMembership);
router.delete("/delete/:id", deleteMembership);
router.get("/get-renew-amount", getRenewAmount);

module.exports = router;
