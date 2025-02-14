const express = require("express");
const {
  getAllComplaints,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  getComplaintsByStatus,
  updateComplaintStatus,
  createInstructorComplaints,
  createEmployeeComplaints,
  getAllEmployeeComplaints,
  getAllInstructorComplaints,
} = require("../controllers/complaint-controller");

const router = express.Router();

router.get("/", getAllComplaints);
router.get("/getAll", getAllInstructorComplaints);
router.get("/getAllEmployee", getAllEmployeeComplaints);
router.post("/", createComplaint);
router.post("/create", createInstructorComplaints);
router.post("/addEmployee", createEmployeeComplaints);
router.post("/:id", updateComplaint);
router.delete("/delete/:id", deleteComplaint);
router.get("/status/:status", getComplaintsByStatus);
router.post("/change-status/:id", updateComplaintStatus);

module.exports = router;
